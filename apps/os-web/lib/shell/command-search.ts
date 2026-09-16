'use server';

import type { CommercialVisibilityMode } from '@isalwa/os-contracts';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
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
import type { IssueStatus } from '@/lib/issue/types';
import type { CommitmentState } from '@isalwa/os-contracts';

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

  let partial = false;
  const lenses: Lens[] = [];
  for (const visibility of ['team', 'org'] as const) {
    const probed = await probeLens(client, visibility);
    if (probed === 'session') return { ok: false, reason: 'session' };
    if (probed === 'partial') partial = true;
    if (probed === true) lenses.push(visibility);
  }

  const items: PaletteItem[] = [];

  try {
    const parties = await client.searchParties({ q, status: 'active', limit: PALETTE_GROUP_LIMIT });
    for (const party of parties.items) {
      items.push(
        customerPaletteItem({
          partyId: party.partyId,
          displayName: party.displayName,
          legalName: party.legalName,
          status: party.status,
        }),
      );
    }
    if (parties.meta.hasMore) partial = true;
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    if (!isDenied(err)) partial = true;
  }

  const opportunityCalls = [
    client.listOpportunities({ q, status: 'open', limit: PALETTE_GROUP_LIMIT }),
    ...lenses.map((visibility) =>
      client.listOpportunities({ q, visibility, status: 'open', limit: PALETTE_GROUP_LIMIT }),
    ),
  ];
  const quoteCalls = [
    client.listQuotes({ q, limit: PALETTE_GROUP_LIMIT }),
    ...lenses.map((visibility) => client.listQuotes({ q, visibility, limit: PALETTE_GROUP_LIMIT })),
  ];
  const workCalls = [
    client.listWorkItems({ q, status: 'open', limit: PALETTE_GROUP_LIMIT }),
    ...lenses.map((visibility) =>
      client.listWorkItems({ q, visibility, status: 'open', limit: PALETTE_GROUP_LIMIT }),
    ),
  ];

  // Issue and commitment search calls
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
  const approvalCalls = [client.listApprovals({ limit: PALETTE_GROUP_LIMIT })];

  const [opportunities, quotes, orders, work, issues, commitments, people, approvals] = await Promise.all([
    collect(opportunityCalls, (page) =>
      page.items
        .filter((item) => !isEngineeringFixtureCopy(item.title))
        .map((item) =>
          opportunityPaletteItem({
            opportunityId: item.opportunityId,
            partyId: item.partyId,
            title: item.title,
            status: item.status,
          }),
        ),
    ),
    collect(quoteCalls, (page) =>
      page.items
        .filter((item) => item.status !== 'cancelled')
        .map((item) =>
          quotePaletteItem({
            quoteId: item.quoteId,
            partyId: item.partyId,
            quoteNumber: item.quoteNumber,
            status: item.status,
            totalCentavos: item.totalCentavos,
            currency: item.currency,
          }),
        ),
    ),
    collect(
      [client.listOrders({ q, limit: PALETTE_GROUP_LIMIT })],
      (page) =>
        page.items.map((item) =>
          orderPaletteItem({
            orderId: item.orderId,
            partyId: item.partyId,
            orderNumber: item.orderNumber,
            status: item.status,
          }),
        ),
    ),
    collect(workCalls, (page) =>
      page.items.map((item) =>
        workPaletteItem({
          workItemId: item.workItemId,
          title: item.title,
          status: item.status,
          subjectType: item.subjectType,
        }),
      ),
    ),
    collectIssues(issueCalls, q),
    collectCommitments(commitmentCalls, q),
    collectPeople(peopleCalls),
    collectApprovals(approvalCalls, q),
  ]);

  for (const result of [opportunities, quotes, orders, work, issues, commitments, people, approvals]) {
    if (result.session) return { ok: false, reason: 'session' };
    if (result.partial) partial = true;
    items.push(...result.items);
  }

  const documents = await collectDeliveryDocuments(client, q);
  if (documents.session) return { ok: false, reason: 'session' };
  if (documents.partial) partial = true;
  items.push(...documents.items);

  const partyIds = items.filter((item) => item.kind === 'customer' && item.partyId).slice(0, 2).map((item) => item.partyId!);
  if (partyIds.length > 0) {
    const related = await Promise.all(partyIds.map((partyId) => relatedForParty(client, partyId, lenses)));
    for (const result of related) {
      if (result.session) return { ok: false, reason: 'session' };
      if (result.partial) partial = true;
      items.push(...result.items);
    }
  }

  const grouped = dedupe(items);
  return { ok: true, items: grouped, partial };
}

async function relatedForParty(client: OsApiClient, partyId: string, lenses: Lens[]) {
  const opportunityCalls = [
    client.listOpportunities({ partyId, status: 'open', limit: 4 }),
    ...lenses.map((visibility) => client.listOpportunities({ partyId, visibility, status: 'open', limit: 4 })),
  ];
  const quoteCalls = [
    client.listQuotes({ partyId, limit: 4 }),
    ...lenses.map((visibility) => client.listQuotes({ partyId, visibility, limit: 4 })),
  ];
  const [opportunities, quotes, orders, work] = await Promise.all([
    collect(opportunityCalls, (page) =>
      page.items
        .filter((item) => !isEngineeringFixtureCopy(item.title))
        .map((item) =>
          opportunityPaletteItem({
            opportunityId: item.opportunityId,
            partyId: item.partyId,
            title: item.title,
            status: item.status,
          }),
        ),
    ),
    collect(quoteCalls, (page) =>
      page.items
        .filter((item) => item.status !== 'cancelled')
        .map((item) =>
          quotePaletteItem({
            quoteId: item.quoteId,
            partyId: item.partyId,
            quoteNumber: item.quoteNumber,
            status: item.status,
            totalCentavos: item.totalCentavos,
            currency: item.currency,
          }),
        ),
    ),
    collect([client.listOrders({ partyId, limit: 4 })], (page) =>
      page.items.map((item) =>
        orderPaletteItem({
          orderId: item.orderId,
          partyId: item.partyId,
          orderNumber: item.orderNumber,
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
        page.items.map((item) =>
          workPaletteItem({
            workItemId: item.workItemId,
            title: item.title,
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
      items.push(
        peoplePaletteItem({
          memberId: member.memberId,
          displayName: member.displayName,
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
  items: Array<{
    issueId: string;
    title: string | null;
    description: string;
    status: IssueStatus;
  }>;
  meta: { hasMore: boolean };
};

async function collectIssues(
  calls: Array<Promise<IssueListResponse>>,
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
      if (!isDenied(result.err)) partial = true;
      continue;
    }
    for (const item of result.page.items) {
      const searchText = `${item.title ?? ''} ${item.description}`.toLocaleLowerCase('es');
      if (!searchText.includes(q)) continue;
      items.push(
        issuePaletteItem({
          issueId: item.issueId,
          title: item.title,
          description: item.description,
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
  items: Array<{
    id: string;
    text: string;
    state: CommitmentState;
    partyId: string | null;
  }>;
};

async function collectCommitments(
  calls: Array<Promise<CommitmentListResponse>>,
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
      if (!isDenied(result.err)) partial = true;
      continue;
    }
    for (const item of result.page.items) {
      if (!item.text.toLocaleLowerCase('es').includes(q)) continue;
      items.push(
        commitmentPaletteItem({
          commitmentId: item.id,
          text: item.text,
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

/**
 * Nota / delivery-document hits via existing order + notes reads.
 * Prefer delivery-ops when available; otherwise commercial open orders + /delivery-notes.
 */
async function collectDeliveryDocuments(
  client: OsApiClient,
  query: string,
): Promise<{ items: PaletteItem[]; session: boolean; partial: boolean }> {
  const q = query.toLocaleLowerCase('es');
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
      if (seeds.length >= DOCUMENT_ORDER_SCAN_LIMIT) break;
    }
  } catch (err) {
    if (isSessionFailure(err)) return { items: [], session: true, partial: false };
    if (!isDenied(err)) partial = true;
  }

  if (seeds.length === 0) {
    try {
      const page = await client.listOrders({ status: 'open', limit: DOCUMENT_ORDER_SCAN_LIMIT });
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
  for (const seed of seeds) {
    try {
      let notes: Array<{
        id: string;
        internalDocumentRef?: string;
        status: string;
      }> = [];
      try {
        const pack = await client.getDeliveryOperationalDocuments(seed.orderId);
        notes = (pack.notes ?? []).map((note) => ({
          id: note.id,
          internalDocumentRef: note.internalDocumentRef,
          status: note.status,
        }));
      } catch (err) {
        if (isDenied(err)) {
          const pack = await client.listDeliveryNotesForOrder(seed.orderId);
          notes = (pack.notes ?? []).map((note) => ({
            id: note.id,
            internalDocumentRef: note.internalDocumentRef,
            status: note.status,
          }));
        } else if (isSessionFailure(err)) {
          return { items: [], session: true, partial: false };
        } else {
          throw err;
        }
      }

      for (const note of notes) {
        if (note.status === 'reversed') continue;
        const ref = (note.internalDocumentRef ?? '').trim();
        if (!ref) continue;
        const hay = `${ref} ${seed.orderNumber} nota`.toLocaleLowerCase('es');
        if (!hay.includes(q)) continue;
        const item = documentPaletteItem({
          deliveryNoteId: note.id,
          documentRef: ref,
          orderId: seed.orderId,
          partyId: seed.partyId,
          orderNumber: seed.orderNumber,
        });
        items.push(item);
        if (items.length >= PALETTE_GROUP_LIMIT) break;
      }
    } catch (err) {
      if (isSessionFailure(err)) return { items: [], session: true, partial: false };
      if (!isDenied(err)) partial = true;
    }
    if (items.length >= PALETTE_GROUP_LIMIT) break;
  }

  const capped = cap(items);
  return { items: capped.items, session: false, partial: partial || capped.truncated };
}
