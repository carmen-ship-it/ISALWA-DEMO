import Link from 'next/link';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { EmptyState, PageContainer, StatusPill } from '@isalwa/ui';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { ApprovalDeskPanel } from '@/components/work/approval-desk-panel';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { cursorPageLinks, listHref, parseListQuery } from '@/lib/lists/url-state';
import { approvalSubjectsForItems } from '@/lib/work/approval-row-subject';
import { approvalListPageDescription } from '@/lib/work/approval-action-label';
import { resolveApprovalListCanDecide } from '@/lib/work/approval-list-can-decide';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { filterApprovalsForEvaluation } from '@/lib/inicio/filter-for-evaluation';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

const PAGE_LIMIT = 25;

type AprobacionesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AprobacionesPage({ searchParams }: AprobacionesPageProps) {
  const query = parseListQuery(await searchParams);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const evaluation = await getEvaluationProjection();
  // Asesor/ops without approval authority → excluded desk (never elevate).
  if (!evaluationAllowsDesk(evaluation, 'aprobaciones')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Aprobaciones" />;
  }

  const client = createOsApiClient(auth);
  const listState = {
    view: query.view,
    subjectType: query.subjectType,
    subjectId: query.subjectId,
  };

  try {
    const session = await client.getAuthenticatedSession();
    const result = await client.listApprovals({
      limit: PAGE_LIMIT,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });
    // Same source as Inicio Approvals card / Decisiones:
    // owner personal → pending-for-me; View As Jefe/Gerencia → org pending desk.
    const approvalsScope =
      evaluation.active &&
      (evaluation.persona === 'jefe-comercial' || evaluation.persona === 'gerencia')
        ? 'org'
        : 'personal';
    const pending = filterApprovalsForEvaluation(
      evaluation,
      result.items.filter((item) => item.status === 'pending'),
      { memberId: session.memberId, scope: approvalsScope },
    );
    const subjects = await approvalSubjectsForPage(client, pending);
    const memberLabels = await resolveMemberLabels(
      client,
      pending.flatMap((item) => [item.requestedByMemberId, item.approverMemberId]),
    );
    // Authoritative decide map — same server truth as detail (not member-id equality alone).
    const canDecideById = new Map<string, boolean>();
    if (!evaluation.active) {
      await Promise.all(
        pending.map(async (item) => {
          canDecideById.set(item.approvalRequestId, await resolveApprovalListCanDecide(client, item));
        }),
      );
    }
    const decidableCount = pending.filter((item) => canDecideById.get(item.approvalRequestId) === true).length;
    const listDescription = approvalListPageDescription({
      evaluationMode: evaluation.active,
      pendingCount: pending.length,
      decidableCount,
    });

    return (
      <PageContainer label={t('pages.aprobaciones.title')} data-tour={TOUR_TARGET.approvalConsequence}>
        <PageHeader
          kicker={t('pages.aprobaciones.kicker')}
          title={t('pages.aprobaciones.title')}
          description={listDescription}
          action={
            pending.length > 0 ? (
              <StatusPill tone="pending" icon="pending">
                {pending.length === 1 ? '1 pendiente' : `${pending.length} pendientes`}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Sin pendientes</StatusPill>
            )
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {pending.length === 0 ? (
          <EmptyState
            title={t('states.emptyAprobaciones')}
            description="Nadie le ha pedido una decisión todavía. Aparecerán aquí las solicitudes que requieran su sí o no."
            example="Aprobar autoriza el siguiente paso comercial; no crea pedido, no registra pago ni despacha mercancía."
          />
        ) : (
          <>
            <ApprovalDeskPanel
              items={pending}
              memberLabels={memberLabels}
              subjects={subjects}
              evaluationMode={evaluation.active}
              canDecideById={canDecideById}
              listState={query}
            />
            {(() => {
              const nav = cursorPageLinks(
                '/aprobaciones',
                query,
                result.meta.nextCursor,
                result.meta.hasMore,
              );
              return nav.prevHref || nav.nextHref ? (
                <ListPageNav
                  from={pending.length > 0 ? 1 : 0}
                  to={pending.length}
                  total={null}
                  page={1}
                  pageCount={null}
                  prevHref={nav.prevHref}
                  nextHref={nav.nextHref}
                />
              ) : null;
            })()}
          </>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.aprobaciones.title')} data-tour={TOUR_TARGET.approvalConsequence}>
        <PageHeader kicker={t('pages.aprobaciones.kicker')} title={t('pages.aprobaciones.title')} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

async function approvalSubjectsForPage(
  client: OsApiClient,
  items: ApprovalSummaryReadModel[],
): Promise<Map<string, string>> {
  const quotes = new Map<string, { quoteNumber: string; partyId: string }>();
  const orders = new Map<string, { orderNumber: string; partyId: string }>();

  return approvalSubjectsForItems(items, async (item) => {
    if (item.subjectType === 'quote') {
      const quote = await readQuoteSubject(client, item.subjectId, quotes);
      if (!quote) return null;
      const customer = partyLabel(await resolvePartyLabels(client, [quote.partyId]), quote.partyId);
      return { quoteNumber: quote.quoteNumber, customerName: customer };
    }
    if (item.subjectType === 'order') {
      const order = await readOrderSubject(client, item.subjectId, orders);
      if (!order) return null;
      const customer = partyLabel(await resolvePartyLabels(client, [order.partyId]), order.partyId);
      return { orderNumber: order.orderNumber, customerName: customer };
    }
    return null;
  });
}

async function readQuoteSubject(
  client: OsApiClient,
  subjectId: string,
  cache: Map<string, { quoteNumber: string; partyId: string }>,
) {
  const cached = cache.get(subjectId);
  if (cached) return cached;
  try {
    const { quote } = await client.getQuote(subjectId);
    const row = { quoteNumber: quote.quoteNumber, partyId: quote.partyId };
    cache.set(subjectId, row);
    return row;
  } catch (err) {
    if (isClosedSubjectRead(err)) return null;
    throw err;
  }
}

async function readOrderSubject(
  client: OsApiClient,
  subjectId: string,
  cache: Map<string, { orderNumber: string; partyId: string }>,
) {
  const cached = cache.get(subjectId);
  if (cached) return cached;
  try {
    const { order } = await client.getOrder(subjectId);
    const row = { orderNumber: order.orderNumber, partyId: order.partyId };
    cache.set(subjectId, row);
    return row;
  } catch (err) {
    if (isClosedSubjectRead(err)) return null;
    throw err;
  }
}

function isClosedSubjectRead(err: unknown): boolean {
  return err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'unauthorized');
}
