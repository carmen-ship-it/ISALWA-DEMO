'use server';

import type { CommercialVisibilityMode } from '@isalwa/os-contracts';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import {
  approvalPaletteItem,
  commitmentPaletteItem,
  customerPaletteItem,
  documentPaletteItem,
  issuePaletteItem,
  opportunityPaletteItem,
  orderPaletteItem,
  PALETTE_GROUP_LIMIT,
  PALETTE_MIN_QUERY,
  peoplePaletteItem,
  quotePaletteItem,
  workPaletteItem,
  type PaletteItem,
} from '@/lib/shell/command-palette';
import { approvalRowSubject } from '@/lib/work/approval-row-subject';
import { formatApprovalStatus } from '@/lib/work/labels';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import {
  evaluationAllowsDesk,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import {
  filterCommitmentsForEvaluation,
  filterIssuesForEvaluation,
  filterWorkForEvaluation,
} from '@/lib/inicio/filter-for-evaluation';
import type { IssueListItem } from '@/lib/issue/types';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { shouldScanDeliveryDocuments } from '@/lib/shell/palette-search-orchestration';

export type PaletteSearchResult =
  | { ok: true; items: PaletteItem[]; partial: boolean }
  | { ok: false; reason: 'session' | 'unavailable' };

type Lens = Extract<CommercialVisibilityMode, 'team' | 'org'>;

function isSessionFailure(err: unknown): boolean {
  return (
    err instanceof OsApiError &&
    (err.kind === 'unauthorized' || err.code === 'AUTH_REQUIRED' || err.code === 'ACCESS_REVOKED')
  );
}

function isDenied(err: unknown): boolean {
  return err instanceof OsApiError && err.kind === 'forbidden';
}

async function probeLens(client: OsApiClient, visibility: Lens): Promise<boolean | 'session' | 'partial'> {
  try {
    await client.listOpportunities({ visibility, limit: 1 });
    return true;
  } catch (err) {
    if (isSessionFailure(err)) return 'session';
    if (isDenied(err)) return false;
    return 'partial';
  }
}

function dedupe(items: PaletteItem[]): PaletteItem[] {
  const seen = new Set<string>();
  const next: PaletteItem[] = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    next.push(item);
  }
  return next;
}


/** Prefers human customer context on commercial hits. Never surfaces raw party ids. */
async function attachCustomerLabels(
  client: OsApiClient,
  items: readonly PaletteItem[],
): Promise<PaletteItem[]> {
  const kinds = new Set(['opportunity', 'quote', 'order']);
  const fromCustomers = new Map<string, string>();
  for (const item of items) {
    if (item.kind === 'customer' && item.partyId && item.label.trim()) {
      fromCustomers.set(item.partyId, item.label.trim());
    }
  }
  const partyIds = [
    ...new Set(
      items
        .filter((item) => kinds.has(item.kind) && item.partyId)
        .map((item) => item.partyId!)
        .filter((partyId) => !fromCustomers.has(partyId)),
    ),
  ].slice(0, 8);
  const fetched = partyIds.length > 0 ? await resolvePartyLabels(client, partyIds) : new Map();
  const labels = new Map<string, string>([...fromCustomers, ...fetched]);
  if (labels.size === 0) return [...items];
  return items.map((item) => {
    if (!kinds.has(item.kind) || !item.partyId) return item;
    const customer = partyLabel(labels, item.partyId);
    if (!customer || customer === 'Cliente') return item;
    if (item.detail?.includes(customer)) return item;
    return {
      ...item,
      detail: item.detail ? `${customer} · ${item.detail}` : customer,
    };
  });
}

async function resolveCommercialLenses(
  client: OsApiClient,
  evaluation: Awaited<ReturnType<typeof getEvaluationProjection>>,
  commercialOk: boolean,
): Promise<{ lenses: Lens[]; partial: boolean; session: boolean }> {
  const lenses: Lens[] = [];
  let partial = false;
  if (!commercialOk) return { lenses, partial, session: false };
  const candidates: Lens[] = [];
  for (const visibility of ['team', 'org'] as const) {
    if (evaluation.active && evaluation.commercialVisibility === 'own') continue;
    if (evaluation.active && evaluation.commercialVisibility === 'team' && visibility === 'org') {
      continue;
    }
    candidates.push(visibility);
  }
  const probed = await Promise.all(
    candidates.map(async (visibility) => [visibility, await probeLens(client, visibility)] as const),
  );
  for (const [visibility, result] of probed) {
    if (result === 'session') return { lenses: [], partial, session: true };
    if (result === 'partial') partial = true;
    if (result === true) lenses.push(visibility);
  }
  return { lenses, partial, session: false };
}

function cap(items: PaletteItem[]): { items: PaletteItem[]; truncated: boolean } {
  const unique = dedupe(items);
  return { items: unique.slice(0, PALETTE_GROUP_LIMIT), truncated: unique.length > PALETTE_GROUP_LIMIT };
}

export async function searchPalette(query: string): Promise<PaletteSearchResult> {
  const q = query.trim();
  if (q.length < PALETTE_MIN_QUERY) return { ok: true, items: [], partial: false };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, reason: 'session' };
  const client = createOsApiClient(auth);
  const evaluation = await getEvaluationProjection();
  const commercialQuery = commercialListQueryFromProjection(evaluation);
  const commercialOk = evaluationAllowsDesk(evaluation, 'commercial');
  const approvalsOk = evaluationAllowsDesk(evaluation, 'aprobaciones');

  let allowedPartyIds: Set<string> | null = null;
  if (evaluation.active && evaluation.persona === 'asesor') {
    if (!evaluation.subjectMemberId) {
      allowedPartyIds = new Set();
    } else {
      const ownedPage = await client
        .searchParties({ status: 'active', limit: 100 })
        .catch(() => ({ items: [] as Array<{ partyId: string; commercialOwnerMemberId?: string | null }> }));
      const owned = filterByCommercialOwner(
        evaluation,
        ownedPage.items ?? [],
        (item) => item.commercialOwnerMemberId,
      );
      allowedPartyIds = new Set(owned.map((p) => p.partyId));
    }
  }

  const lensResult = await resolveCommercialLenses(client, evaluation, commercialOk);
  if (lensResult.session) return { ok: false, reason: 'session' };
  let partial = lensResult.partial;
  const lenses = lensResult.lenses;

  const opportunityCalls = commercialOk
    ? [
        client.listOpportunities({ q, status: 'open', limit: PALETTE_GROUP_LIMIT, ...commercialQuery }),
        ...lenses.map((visibility) =>
          client.listOpportunities({
            q,
            visibility,
            status: 'open',
            limit: PALETTE_GROUP_LIMIT,
            ...commercialQuery,
          }),
        ),
      ]
    : [];
  const quoteCalls = commercialOk
    ? [
        client.listQuotes({ q, limit: PALETTE_GROUP_LIMIT, ...commercialQuery }),
        ...lenses.map((visibility) =>
          client.listQuotes({ q, visibility, limit: PALETTE_GROUP_LIMIT, ...commercialQuery }),
        ),
      ]
    : [];
  const workCalls = [
    client.listWorkItems({
      q,
      status: 'open',
      limit: PALETTE_GROUP_LIMIT,
      ...(evaluation.active &&
      evaluation.persona === 'asesor' &&
      evaluation.subjectMemberId
        ? { ownerMemberId: evaluation.subjectMemberId }
        : {}),
    }),
    ...lenses.map((visibility) =>
      client.listWorkItems({ q, visibility, status: 'open', limit: PALETTE_GROUP_LIMIT }),
    ),
  ];

  const issueCalls = [client.listIssues({ view: 'all', limit: PALETTE_GROUP_LIMIT })];
  const commitmentCalls = [client.listCommitments({ lifecycle: 'open' })];
  const peopleCalls = [
    client.listMembers({
      q,
      accessStatus: 'active',
      employmentStatus: 'active',
      limit: PALETTE_GROUP_LIMIT,
    }),
  ];
  const approvalCalls = approvalsOk ? [client.listApprovals({ limit: PALETTE_GROUP_LIMIT })] : [];

  const partyPromise = (async (): Promise<{
    items: PaletteItem[];
    session: boolean;
    partial: boolean;
  }> => {
    if (!commercialOk) return { items: [], session: false, partial: false };
    try {
      const parties = await client.searchParties({ q, status: 'active', limit: PALETTE_GROUP_LIMIT });
      const visibleParties = filterByCommercialOwner(
        evaluation,
        parties.items,
        (party) => party.commercialOwnerMemberId,
      );
      const partyItems: PaletteItem[] = [];
      for (const party of visibleParties) {
        if (
          isEngineeringFixtureCopy(party.displayName) ||
          isEngineeringFixtureCopy(party.legalName)
        ) {
          continue;
        }
        partyItems.push(
          customerPaletteItem({
            partyId: party.partyId,
            displayName: presentHumanCopy(party.displayName) || party.displayName,
            legalName: party.legalName ? presentHumanCopy(party.legalName) : null,
            status: party.status,
          }),
        );
      }
      return { items: partyItems, session: false, partial: Boolean(parties.meta.hasMore) };
    } catch (err) {
      if (isSessionFailure(err)) return { items: [], session: true, partial: false };
      if (!isDenied(err)) return { items: [], session: false, partial: true };
      return { items: [], session: false, partial: false };
    }
  })();

  const [parties, opportunities, quotes, orders, work, issues, commitments, people, approvals] =
    await Promise.all([
      partyPromise,
      collect(opportunityCalls, (page) =>
        filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
          .filter((item) => !isEngineeringFixtureCopy(item.title))
          .map((item) =>
            opportunityPaletteItem({
              opportunityId: item.opportunityId,
              partyId: item.partyId,
              title: presentHumanCopy(item.title) || item.title,
              status: item.status,
            }),
          ),
      ),
      collect(quoteCalls, (page) =>
        filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
          .filter(
            (item) =>
              item.status !== 'cancelled' &&
              !isEngineeringFixtureCopy(item.quoteNumber) &&
              !isEngineeringFixtureCopy(item.notes),
          )
          .map((item) =>
            quotePaletteItem({
              quoteId: item.quoteId,
              partyId: item.partyId,
              quoteNumber: presentHumanCopy(item.quoteNumber) || item.quoteNumber,
              status: item.status,
              totalCentavos: item.totalCentavos,
              currency: item.currency,
            }),
          ),
      ),
      collect(
        commercialOk
          ? [
              client.listOrders({ q, limit: PALETTE_GROUP_LIMIT, ...commercialQuery }),
              ...lenses.map((visibility) =>
                client.listOrders({ q, visibility, limit: PALETTE_GROUP_LIMIT, ...commercialQuery }),
              ),
            ]
          : [],
        (page) =>
          filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
            .filter((item) => !isEngineeringFixtureCopy(item.orderNumber))
            .map((item) =>
              orderPaletteItem({
                orderId: item.orderId,
                partyId: item.partyId,
                orderNumber: presentHumanCopy(item.orderNumber) || item.orderNumber,
                status: item.status,
              }),
            ),
      ),
      collect(workCalls, (page) =>
        filterWorkForEvaluation(
          evaluation,
          page.items as WorkSummaryReadModel[],
          allowedPartyIds,
        )
          .filter(
            (item) =>
              !isEngineeringFixtureCopy(item.title) && !isEngineeringFixtureCopy(item.description),
          )
          .map((item) =>
            workPaletteItem({
              workItemId: item.workItemId,
              title: presentHumanCopy(item.title) || item.title,
              status: item.status,
              subjectType: item.subjectType,
            }),
          ),
      ),
      collectIssues(issueCalls, q, evaluation, allowedPartyIds),
      collectCommitments(commitmentCalls, q, evaluation, allowedPartyIds),
      collectPeople(peopleCalls),
      collectApprovals(approvalCalls, q),
    ]);

  const items: PaletteItem[] = [];
  for (const result of [
    parties,
    opportunities,
    quotes,
    orders,
    work,
    issues,
    commitments,
    people,
    approvals,
  ]) {
    if (result.session) return { ok: false, reason: 'session' };
    if (result.partial) partial = true;
    items.push(...result.items);
  }

  // Primary path stops here — documents + related-party expansion run in searchPaletteFollowUp
  // so Clientes / Oportunidades / Cotizaciones can paint without waiting on slow optional scans.
  const grouped = await attachCustomerLabels(client, dedupe(items));
  return { ok: true, items: grouped, partial };
}

/**
 * Slow / optional sources that must not block first useful primary groups.
 * Documents only when the query looks document/order related.
 */
export async function searchPaletteFollowUp(
  query: string,
  seedCustomerPartyIds: readonly string[] = [],
): Promise<PaletteSearchResult> {
  const q = query.trim();
  if (q.length < PALETTE_MIN_QUERY) return { ok: true, items: [], partial: false };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, reason: 'session' };
  const client = createOsApiClient(auth);
  const evaluation = await getEvaluationProjection();
  const commercialQuery = commercialListQueryFromProjection(evaluation);
  const commercialOk = evaluationAllowsDesk(evaluation, 'commercial');

  let partial = false;
  const items: PaletteItem[] = [];

  const scanDocs =
    shouldScanDeliveryDocuments(q) &&
    (commercialOk || evaluationAllowsDesk(evaluation, 'entregas'));
  if (scanDocs) {
    const documents = await collectDeliveryDocuments(client, q);
    if (documents.session) return { ok: false, reason: 'session' };
    if (documents.partial) partial = true;
    items.push(...documents.items);
  }

  const partyIds = [...new Set(seedCustomerPartyIds.filter(Boolean))].slice(0, 2);
  if (partyIds.length > 0 && commercialOk) {
    const lensResult = await resolveCommercialLenses(client, evaluation, commercialOk);
    if (lensResult.session) return { ok: false, reason: 'session' };
    if (lensResult.partial) partial = true;
    const related = await Promise.all(
      partyIds.map((partyId) =>
        relatedForParty(client, partyId, lensResult.lenses, evaluation, commercialQuery),
      ),
    );
    for (const result of related) {
      if (result.session) return { ok: false, reason: 'session' };
      if (result.partial) partial = true;
      items.push(...result.items);
    }
  }

  if (items.length === 0) return { ok: true, items: [], partial };
  const grouped = await attachCustomerLabels(client, dedupe(items));
  return { ok: true, items: grouped, partial };
}


async function relatedForParty(
  client: OsApiClient,
  partyId: string,
  lenses: Lens[],
  evaluation: Awaited<ReturnType<typeof getEvaluationProjection>>,
  commercialQuery: ReturnType<typeof commercialListQueryFromProjection>,
) {
  const opportunityCalls = [
    client.listOpportunities({ partyId, status: 'open', limit: 4, ...commercialQuery }),
    ...lenses.map((visibility) =>
      client.listOpportunities({ partyId, visibility, status: 'open', limit: 4, ...commercialQuery }),
    ),
  ];
  const quoteCalls = [
    client.listQuotes({ partyId, limit: 4, ...commercialQuery }),
    ...lenses.map((visibility) =>
      client.listQuotes({ partyId, visibility, limit: 4, ...commercialQuery }),
    ),
  ];
  const [opportunities, quotes, orders, work] = await Promise.all([
    collect(opportunityCalls, (page) =>
      filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
        .filter((item) => !isEngineeringFixtureCopy(item.title))
        .map((item) =>
          opportunityPaletteItem({
            opportunityId: item.opportunityId,
            partyId: item.partyId,
            title: presentHumanCopy(item.title) || item.title,
            status: item.status,
          }),
        ),
    ),
    collect(quoteCalls, (page) =>
      filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
        .filter(
          (item) =>
            item.status !== 'cancelled' &&
            !isEngineeringFixtureCopy(item.quoteNumber) &&
            !isEngineeringFixtureCopy(item.notes),
        )
        .map((item) =>
          quotePaletteItem({
            quoteId: item.quoteId,
            partyId: item.partyId,
            quoteNumber: presentHumanCopy(item.quoteNumber) || item.quoteNumber,
            status: item.status,
            totalCentavos: item.totalCentavos,
            currency: item.currency,
          }),
        ),
    ),
    collect(
      [
        client.listOrders({ partyId, limit: 4, ...commercialQuery }),
        ...lenses.map((visibility) =>
          client.listOrders({ partyId, visibility, limit: 4, ...commercialQuery }),
        ),
      ],
      (page) =>
        filterByCommercialOwner(evaluation, page.items, (item) => item.ownerMemberId)
          .filter((item) => !isEngineeringFixtureCopy(item.orderNumber))
          .map((item) =>
            orderPaletteItem({
              orderId: item.orderId,
              partyId: item.partyId,
              orderNumber: presentHumanCopy(item.orderNumber) || item.orderNumber,
              status: item.status,
            }),
          ),
    ),
    collect(
      [
        client.listWorkItems({ subjectType: 'party', subjectId: partyId, status: 'open', limit: 4 }),
        ...lenses.map((visibility) =>
          client.listWorkItems({
            subjectType: 'party',
            subjectId: partyId,
            visibility,
            status: 'open',
            limit: 4,
          }),
        ),
      ],
      (page) =>
        page.items
          .filter(
            (item) =>
              !isEngineeringFixtureCopy(item.title) && !isEngineeringFixtureCopy(item.description),
          )
          .map((item) =>
            workPaletteItem({
              workItemId: item.workItemId,
              title: presentHumanCopy(item.title) || item.title,
              status: item.status,
              subjectType: item.subjectType,
            }),
          ),
    ),
  ]);
  if (opportunities.session || quotes.session || orders.session || work.session) {
    return { items: [], session: true, partial: false };
  }
  return {
    items: [...opportunities.items, ...quotes.items, ...orders.items, ...work.items],
    session: false,
    partial: opportunities.partial || quotes.partial || orders.partial || work.partial,
  };
}

async function collect<T extends { items: unknown[]; meta: { hasMore: boolean } }>(
  calls: Array<Promise<T>>,
  map: (page: T) => PaletteItem[],
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const settled = await Promise.all(calls.map(async (call) => {
    try {
      return { ok: true as const, page: await call };
    } catch (err) {
      return { ok: false as const, err };
    }
  }));
  const items: PaletteItem[] = [];
  let partial = false;
  for (const result of settled) {
    if (!result.ok) {
      if (isSessionFailure(result.err)) return { items: [], session: true, partial: false };
      if (!isDenied(result.err)) partial = true;
      continue;
    }
    items.push(...map(result.page));
    if (result.page.meta.hasMore) partial = true;
  }
  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}

type MemberListResponse = {
  items: Array<{
    memberId: string;
    displayName: string;
    accessStatus: string;
  }>;
  meta: { hasMore: boolean };
};

async function collectPeople(
  calls: Array<Promise<MemberListResponse>>,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const settled = await Promise.all(calls.map(async (call) => {
    try {
      return { ok: true as const, page: await call };
    } catch (err) {
      return { ok: false as const, err };
    }
  }));
  const items: PaletteItem[] = [];
  let partial = false;
  for (const result of settled) {
    if (!result.ok) {
      if (isSessionFailure(result.err)) return { items: [], session: true, partial: false };
      if (isDenied(result.err)) continue;
      partial = true;
      continue;
    }
    for (const member of result.page.items) {
      if (isEngineeringFixtureCopy(member.displayName)) continue;
      items.push(
        peoplePaletteItem({
          memberId: member.memberId,
          displayName: presentHumanCopy(member.displayName) || member.displayName,
          accessStatus: member.accessStatus,
        }),
      );
    }
    if (result.page.meta.hasMore) partial = true;
  }
  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}

type ApprovalListResponse = {
  items: Array<{
    approvalRequestId: string;
    subjectType: string;
    subjectId: string;
    status: string;
  }>;
  meta: { hasMore: boolean };
};

async function collectApprovals(
  calls: Array<Promise<ApprovalListResponse>>,
  query: string,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const settled = await Promise.all(calls.map(async (call) => {
    try {
      return { ok: true as const, page: await call };
    } catch (err) {
      return { ok: false as const, err };
    }
  }));
  const items: PaletteItem[] = [];
  let partial = false;
  const q = query.toLocaleLowerCase('es');
  for (const result of settled) {
    if (!result.ok) {
      if (isSessionFailure(result.err)) return { items: [], session: true, partial: false };
      if (isDenied(result.err)) continue;
      partial = true;
      continue;
    }
    for (const item of result.page.items) {
      const label = approvalRowSubject({
        subjectType: item.subjectType,
        subjectId: item.subjectId,
      });
      const detail = formatApprovalStatus(item.status);
      const searchText = `${label} ${detail}`.toLocaleLowerCase('es');
      if (!searchText.includes(q)) continue;
      items.push(
        approvalPaletteItem({
          approvalRequestId: item.approvalRequestId,
          label,
          status: item.status,
        }),
      );
      if (items.length >= PALETTE_GROUP_LIMIT) break;
    }
    if (result.page.meta.hasMore) partial = true;
  }
  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}

type IssueListResponse = {
  items: IssueListItem[];
  meta: { hasMore: boolean };
};

async function collectIssues(
  calls: Array<Promise<IssueListResponse>>,
  query: string,
  evaluation: Awaited<ReturnType<typeof getEvaluationProjection>>,
  allowedPartyIds: Set<string> | null,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const settled = await Promise.all(calls.map(async (call) => {
    try {
      return { ok: true as const, page: await call };
    } catch (err) {
      return { ok: false as const, err };
    }
  }));
  const items: PaletteItem[] = [];
  let partial = false;
  const q = query.toLocaleLowerCase('es');
  for (const result of settled) {
    if (!result.ok) {
      if (isSessionFailure(result.err)) return { items: [], session: true, partial: false };
      if (!isDenied(result.err)) partial = true;
      continue;
    }
    const visible = filterIssuesForEvaluation(evaluation, result.page.items, allowedPartyIds);
    for (const item of visible) {
      if (isEngineeringFixtureCopy(item.title) || isEngineeringFixtureCopy(item.description)) {
        continue;
      }
      const searchText = `${item.title ?? ''} ${item.description}`.toLocaleLowerCase('es');
      if (!searchText.includes(q)) continue;
      items.push(
        issuePaletteItem({
          issueId: item.issueId,
          title: presentHumanCopy(item.title) || item.title,
          description: presentHumanCopy(item.description) || item.description,
          status: item.status,
        }),
      );
      if (items.length >= PALETTE_GROUP_LIMIT) break;
    }
    if (result.page.meta.hasMore) partial = true;
  }
  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}

type CommitmentListResponse = {
  items: CommitmentSummary[];
};

async function collectCommitments(
  calls: Array<Promise<CommitmentListResponse>>,
  query: string,
  evaluation: Awaited<ReturnType<typeof getEvaluationProjection>>,
  allowedPartyIds: Set<string> | null,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const settled = await Promise.all(calls.map(async (call) => {
    try {
      return { ok: true as const, page: await call };
    } catch (err) {
      return { ok: false as const, err };
    }
  }));
  const items: PaletteItem[] = [];
  let partial = false;
  const q = query.toLocaleLowerCase('es');
  for (const result of settled) {
    if (!result.ok) {
      if (isSessionFailure(result.err)) return { items: [], session: true, partial: false };
      if (!isDenied(result.err)) partial = true;
      continue;
    }
    const visible = filterCommitmentsForEvaluation(evaluation, result.page.items, allowedPartyIds);
    for (const item of visible) {
      if (isEngineeringFixtureCopy(item.text)) continue;
      if (!item.text.toLocaleLowerCase('es').includes(q)) continue;
      items.push(
        commitmentPaletteItem({
          commitmentId: item.id,
          text: presentHumanCopy(item.text) || item.text,
          state: item.state,
          partyId: item.partyId,
        }),
      );
      if (items.length >= PALETTE_GROUP_LIMIT) break;
    }
  }
  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}

const DOCUMENT_ORDER_SCAN_LIMIT = 20;
const DOCUMENT_REF_ORDER_SCAN_LIMIT = 50;

/**
 * Nota / delivery-document hits via existing order + notes reads.
 * Prefer delivery-ops when available; otherwise commercial open orders + /delivery-notes.
 * Document-ref queries (NE-*) widen the order scan so pilot refs are not missed.
 */
async function collectDeliveryDocuments(
  client: OsApiClient,
  query: string,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const q = query.toLocaleLowerCase('es');
  const docRefQuery = /^ne[\s_-]?/i.test(query.trim()) || /\bnota\b/i.test(query.trim());
  const seedLimit = docRefQuery ? DOCUMENT_REF_ORDER_SCAN_LIMIT : DOCUMENT_ORDER_SCAN_LIMIT;
  type OrderSeed = { orderId: string; partyId: string; orderNumber: string };
  const seeds: OrderSeed[] = [];
  let partial = false;

  try {
    const ops = await client.listDeliveryOperationalOrders();
    for (const order of ops.items ?? []) {
      if (order.status === 'cancelled') continue;
      seeds.push({
        orderId: order.orderId,
        partyId: order.partyId,
        orderNumber: order.orderNumber,
      });
      if (seeds.length >= seedLimit) break;
    }
  } catch (err) {
    if (isSessionFailure(err)) return { items: [], session: true, partial: false };
    if (!isDenied(err)) partial = true;
  }

  if (seeds.length === 0) {
    try {
      const page = await client.listOrders({ status: 'open', limit: seedLimit });
      for (const order of page.items ?? []) {
        if (order.status === 'cancelled') continue;
        seeds.push({
          orderId: order.orderId,
          partyId: order.partyId,
          orderNumber: order.orderNumber,
        });
      }
      if (page.meta?.hasMore) partial = true;
    } catch (err) {
      if (isSessionFailure(err)) return { items: [], session: true, partial: false };
      if (isDenied(err)) return { items: [], session: false, partial };
      partial = true;
      return { items: [], session: false, partial };
    }
  }

  const items: PaletteItem[] = [];
  const DOC_FETCH_CONCURRENCY = 5;

  async function notesForSeed(seed: OrderSeed): Promise<{
    notes: Array<{ id: string; internalDocumentRef?: string; status: string }>;
    session: boolean;
    partial: boolean;
  }> {
    try {
      try {
        const pack = await client.getDeliveryOperationalDocuments(seed.orderId);
        return {
          notes: (pack.notes ?? []).map((note) => ({
            id: note.id,
            internalDocumentRef: note.internalDocumentRef,
            status: note.status,
          })),
          session: false,
          partial: false,
        };
      } catch (err) {
        if (isDenied(err)) {
          const pack = await client.listDeliveryNotesForOrder(seed.orderId);
          return {
            notes: (pack.notes ?? []).map((note) => ({
              id: note.id,
              internalDocumentRef: note.internalDocumentRef,
              status: note.status,
            })),
            session: false,
            partial: false,
          };
        }
        if (isSessionFailure(err)) return { notes: [], session: true, partial: false };
        throw err;
      }
    } catch (err) {
      if (isSessionFailure(err)) return { notes: [], session: true, partial: false };
      if (!isDenied(err)) return { notes: [], session: false, partial: true };
      return { notes: [], session: false, partial: false };
    }
  }

  for (let i = 0; i < seeds.length; i += DOC_FETCH_CONCURRENCY) {
    if (items.length >= PALETTE_GROUP_LIMIT) break;
    const batch = seeds.slice(i, i + DOC_FETCH_CONCURRENCY);
    const settled = await Promise.all(batch.map((seed) => notesForSeed(seed).then((r) => ({ seed, ...r }))));
    for (const row of settled) {
      if (row.session) return { items: [], session: true, partial: false };
      if (row.partial) partial = true;
      for (const note of row.notes) {
        if (note.status === 'reversed') continue;
        const ref = (note.internalDocumentRef ?? '').trim();
        if (!ref) continue;
        const hay = `${ref} ${row.seed.orderNumber} nota`.toLocaleLowerCase('es');
        if (!hay.includes(q)) continue;
        items.push(
          documentPaletteItem({
            deliveryNoteId: note.id,
            documentRef: ref,
            orderId: row.seed.orderId,
            partyId: row.seed.partyId,
            orderNumber: row.seed.orderNumber,
          }),
        );
        if (items.length >= PALETTE_GROUP_LIMIT) break;
      }
      if (items.length >= PALETTE_GROUP_LIMIT) break;
    }
  }

  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}
