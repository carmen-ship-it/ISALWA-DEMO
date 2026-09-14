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
import { approvalRowSubject } from '@/lib/work/approval-row-subject';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

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
      <PageContainer label={t('pages.aprobaciones.title')}>
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
      <PageContainer label={t('pages.aprobaciones.title')}>
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

  const quoteIds = [
    ...new Set(items.flatMap((item) => (item.subjectType === 'quote' && item.subjectId ? [item.subjectId] : []))),
  ];
  const orderIds = [
    ...new Set(items.flatMap((item) => (item.subjectType === 'order' && item.subjectId ? [item.subjectId] : []))),
  ];

  await Promise.all([
    ...quoteIds.map(async (subjectId) => {
      try {
        const { quote } = await client.getQuote(subjectId);
        quotes.set(subjectId, { quoteNumber: quote.quoteNumber, partyId: quote.partyId });
      } catch (err) {
        if (isClosedSubjectRead(err)) return;
        throw err;
      }
    }),
    ...orderIds.map(async (subjectId) => {
      try {
        const { order } = await client.getOrder(subjectId);
        orders.set(subjectId, { orderNumber: order.orderNumber, partyId: order.partyId });
      } catch (err) {
        if (isClosedSubjectRead(err)) return;
        throw err;
      }
    }),
  ]);

  const partyLabels = await resolvePartyLabels(client, [
    ...[...quotes.values()].map((quote) => quote.partyId),
    ...[...orders.values()].map((order) => order.partyId),
  ]);

  const labels = new Map<string, string>();
  for (const item of items) {
    const quote = item.subjectType === 'quote' ? quotes.get(item.subjectId) : undefined;
    const order = item.subjectType === 'order' ? orders.get(item.subjectId) : undefined;
    const partyId = quote?.partyId ?? order?.partyId ?? null;
    const customer = partyId ? partyLabel(partyLabels, partyId) : null;
    labels.set(
      item.approvalRequestId,
      approvalRowSubject({
        subjectType: item.subjectType,
        quoteNumber: quote?.quoteNumber,
        orderNumber: order?.orderNumber,
        customerName: customer,
      }),
    );
  }
  return labels;
}

function isClosedSubjectRead(err: unknown): boolean {
  return err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'unauthorized');
}
