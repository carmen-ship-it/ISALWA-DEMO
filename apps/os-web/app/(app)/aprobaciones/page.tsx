import Link from 'next/link';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { ApprovalList } from '@/components/work/approval-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { listHref, parseListQuery } from '@/lib/lists/url-state';
import { approvalSubjectsForItems } from '@/lib/work/approval-row-subject';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

const PAGE_LIMIT = 25;

type AprobacionesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AprobacionesPage({ searchParams }: AprobacionesPageProps) {
  const query = parseListQuery(await searchParams);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const listState = {
    view: query.view,
    subjectType: query.subjectType,
    subjectId: query.subjectId,
  };

  try {
    const result = await client.listApprovals({
      limit: PAGE_LIMIT,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });
    const pending = result.items.filter((item) => item.status === 'pending');
    const subjects = await approvalSubjectsForPage(client, pending);
    const memberLabels = await resolveMemberLabels(
      client,
      pending.flatMap((item) => [item.requestedByMemberId, item.approverMemberId]),
    );

    return (
      <PageContainer label={t('pages.aprobaciones.title')} data-tour={TOUR_TARGET.approvalConsequence}>
        <PageHeader
          kicker={t('pages.aprobaciones.kicker')}
          title={t('pages.aprobaciones.title')}
          description={
            pending.length === 0
              ? undefined
              : 'Solicitudes pendientes de su decisión. La decisión no crea un pedido.'
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {pending.length === 0 ? (
          <EmptyState
            title={t('states.emptyAprobaciones')}
            description="Cuando alguien solicite su aprobación, la verá aquí para decidir."
          />
        ) : (
          <>
            <PageSection card className="overflow-hidden bg-white p-0">
              <ApprovalList items={pending} memberLabels={memberLabels} subjects={subjects} />
            </PageSection>
            {result.meta.hasMore && result.meta.nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={listHref('/aprobaciones', { ...listState, cursor: result.meta.nextCursor })}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  Cargar más
                </Link>
              </div>
            ) : null}
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
