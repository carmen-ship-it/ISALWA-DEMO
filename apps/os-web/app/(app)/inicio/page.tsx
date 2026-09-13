import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { ApprovalList } from '@/components/work/approval-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  INICIO_SECTION_LIMIT,
  inicioEmptyCtas,
  isInicioCommerciallyEmpty,
  shouldShowInicioApprovalsSection,
} from '@/lib/commercial/inicio-home';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isProjectionStale } from '@/lib/query/projection-freshness';

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | 'unavailable'> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'unavailable') return 'unavailable';
    throw err;
  }
}

export default async function InicioPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const limit = INICIO_SECTION_LIMIT;

  try {
    const [
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
      workResult,
      approvalsResult,
    ] = await Promise.all([
      safeFetch(() => client.listOpportunities({ status: 'open', limit })),
      safeFetch(() => client.listQuotes({ status: 'draft', limit })),
      safeFetch(() => client.listQuotes({ status: 'submitted', limit })),
      safeFetch(() => client.listWorkItems({ status: 'open', limit })),
      safeFetch(() => client.listApprovals({ limit })),
    ]);

    const allUnavailable = [
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
      workResult,
      approvalsResult,
    ].every((result) => result === 'unavailable');

    if (allUnavailable) {
      return (
        <PageContainer label={t('pages.inicio.title')}>
          <QuerySurfaceState error={{ kind: 'unavailable' }} />
        </PageContainer>
      );
    }

    const opportunities =
      opportunitiesResult === 'unavailable' ? [] : opportunitiesResult.items;
    const quotesDraft =
      quotesDraftResult === 'unavailable' ? [] : quotesDraftResult.items;
    const quotesSubmitted =
      quotesSubmittedResult === 'unavailable' ? [] : quotesSubmittedResult.items;
    const workItems = workResult === 'unavailable' ? [] : workResult.items;
    const approvalItems =
      approvalsResult === 'unavailable' ? [] : approvalsResult.items;

    const counts = {
      opportunities: opportunities.length,
      quotesDraft: quotesDraft.length,
      quotesSubmitted: quotesSubmitted.length,
      work: workItems.length,
      approvals: approvalItems.length,
    };
    const isEmpty = isInicioCommerciallyEmpty(counts);
    const showApprovals = shouldShowInicioApprovalsSection(counts);

    const memberLabels = await resolveMemberLabels(client, [
      ...opportunities.map((item) => item.ownerMemberId),
      ...quotesDraft.map((item) => item.ownerMemberId),
      ...quotesSubmitted.map((item) => item.ownerMemberId),
      ...workItems.flatMap((item) => [item.ownerMemberId, item.createdByMemberId]),
      ...approvalItems.flatMap((item) => [
        item.requestedByMemberId,
        item.approverMemberId,
      ]),
    ]);
    const partyLabels = await resolvePartyLabels(client, [
      ...opportunities.map((item) => item.partyId),
      ...quotesDraft.map((item) => item.partyId),
      ...quotesSubmitted.map((item) => item.partyId),
    ]);

    const staleFreshness =
      (opportunitiesResult !== 'unavailable' &&
        isProjectionStale(opportunitiesResult.freshness)) ||
      (quotesDraftResult !== 'unavailable' &&
        isProjectionStale(quotesDraftResult.freshness)) ||
      (quotesSubmittedResult !== 'unavailable' &&
        isProjectionStale(quotesSubmittedResult.freshness)) ||
      (workResult !== 'unavailable' && isProjectionStale(workResult.freshness)) ||
      (approvalsResult !== 'unavailable' &&
        isProjectionStale(approvalsResult.freshness));

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={t('pages.inicio.title')}
          description={
            isEmpty
              ? t('states.emptyInicioHint')
              : 'Resumen comercial y operativo de lo que está activo hoy.'
          }
        />

        {staleFreshness ? (
          <StaleProjectionBanner
            freshness={{
              consumerKey: 'inicio',
              organizationId: '',
              lastSuccessAt: null,
              lastEventOccurredAt: null,
              pendingOutboxCount: 0,
              isStale: true,
              lastError: null,
              rebuiltAt: null,
            }}
          />
        ) : null}

        {isEmpty ? (
          <EmptyState
            title={t('states.emptyInicio')}
            description={t('states.emptyInicioHint')}
            action={
              <div className="flex flex-wrap gap-3">
                {inicioEmptyCtas().map((cta) => (
                  <Link key={cta.href} href={cta.href} className="inline-flex">
                    <Button
                      type="button"
                      variant={cta.href === '/clientes' ? 'primary' : 'secondary'}
                    >
                      {cta.label}
                    </Button>
                  </Link>
                ))}
              </div>
            }
          />
        ) : (
          <div className="space-y-6">
            <PageSection card className="p-4">
              <SectionHeader
                title={t('pages.inicio.opportunities')}
                action={
                  opportunities.length > 0 ? (
                    <Link
                      href="/oportunidades"
                      className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                    >
                      Ver todas
                    </Link>
                  ) : undefined
                }
              />
              {opportunities.length === 0 ? (
                <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                  {t('states.emptyOportunidades')}
                </p>
              ) : (
                <OpportunityOrgList
                  items={opportunities}
                  memberLabels={memberLabels}
                  partyLabels={partyLabels}
                  compact
                />
              )}
            </PageSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <PageSection card className="p-4">
                <SectionHeader
                  title={t('pages.inicio.quotesDraft')}
                  action={
                    quotesDraft.length > 0 ? (
                      <Link
                        href="/cotizaciones?status=draft"
                        className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Ver todas
                      </Link>
                    ) : undefined
                  }
                />
                {quotesDraft.length === 0 ? (
                  <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                    Sin cotizaciones en borrador
                  </p>
                ) : (
                  <QuoteOrgList
                    items={quotesDraft}
                    memberLabels={memberLabels}
                    partyLabels={partyLabels}
                    compact
                  />
                )}
              </PageSection>

              <PageSection card className="p-4">
                <SectionHeader
                  title={t('pages.inicio.quotesSubmitted')}
                  action={
                    quotesSubmitted.length > 0 ? (
                      <Link
                        href="/cotizaciones?status=submitted"
                        className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Ver todas
                      </Link>
                    ) : undefined
                  }
                />
                {quotesSubmitted.length === 0 ? (
                  <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                    Sin cotizaciones enviadas
                  </p>
                ) : (
                  <QuoteOrgList
                    items={quotesSubmitted}
                    memberLabels={memberLabels}
                    partyLabels={partyLabels}
                    compact
                  />
                )}
              </PageSection>
            </div>

            <PageSection card className="p-4">
              <SectionHeader
                title={t('pages.inicio.work')}
                action={
                  workItems.length > 0 ? (
                    <Link
                      href="/trabajo"
                      className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                    >
                      Ver todo
                    </Link>
                  ) : undefined
                }
              />
              {workItems.length === 0 ? (
                <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                  {t('states.emptyTrabajo')}
                </p>
              ) : (
                <WorkList items={workItems} memberLabels={memberLabels} />
              )}
            </PageSection>

            {showApprovals ? (
              <PageSection card className="p-4">
                <SectionHeader
                  title={t('pages.inicio.approvals')}
                  action={
                    <Link
                      href="/aprobaciones"
                      className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                    >
                      Ver todas
                    </Link>
                  }
                />
                <ApprovalList
                  items={approvalItems}
                  memberLabels={memberLabels}
                  readOnly
                />
              </PageSection>
            ) : null}
          </div>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.inicio.title')}>
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
