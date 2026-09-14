import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { InicioLeadershipSection } from '@/components/commercial/inicio-leadership-section';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { InicioAttentionPanel } from '@/components/work/inicio-attention-panel';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { INICIO_SECTION_LIMIT } from '@/lib/commercial/inicio-home';
import { loadInicioLeadership } from '@/lib/leadership/load-inicio-leadership';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { INICIO_ATTENTION_LIMIT } from '@/lib/work/inicio-attention';
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
      attentionResult,
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
    ] = await Promise.all([
      safeFetch(() =>
        client.listAttention({ activeOnly: true, limit: INICIO_ATTENTION_LIMIT }),
      ),
      safeFetch(() => client.listOpportunities({ status: 'open', limit })),
      safeFetch(() => client.listQuotes({ status: 'draft', limit })),
      safeFetch(() => client.listQuotes({ status: 'submitted', limit })),
    ]);

    const allUnavailable = [
      attentionResult,
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
    ].every((result) => result === 'unavailable');

    if (allUnavailable) {
      return (
        <PageContainer label={t('pages.inicio.title')}>
          <QuerySurfaceState error={{ kind: 'unavailable' }} />
        </PageContainer>
      );
    }

    const attentionItems = attentionResult === 'unavailable' ? [] : attentionResult.items;
    const opportunities =
      opportunitiesResult === 'unavailable' ? [] : opportunitiesResult.items;
    const quotesDraft =
      quotesDraftResult === 'unavailable' ? [] : quotesDraftResult.items;
    const quotesSubmitted =
      quotesSubmittedResult === 'unavailable' ? [] : quotesSubmittedResult.items;

    const leadership = await loadInicioLeadership(client);
    const teamData = leadership.team.kind === 'ready' ? leadership.team.data : null;
    const orgData = leadership.org.kind === 'ready' ? leadership.org.data : null;

    const memberLabels = await resolveMemberLabels(client, [
      ...opportunities.map((item) => item.ownerMemberId),
      ...quotesDraft.map((item) => item.ownerMemberId),
      ...quotesSubmitted.map((item) => item.ownerMemberId),
      ...(teamData?.opportunities ?? []).map((item) => item.ownerMemberId),
      ...(teamData?.quotesDraft ?? []).map((item) => item.ownerMemberId),
      ...(teamData?.quotesSubmitted ?? []).map((item) => item.ownerMemberId),
      ...(teamData?.openWork ?? []).map((item) => item.ownerMemberId),
      ...(teamData?.overdueWork ?? []).map((item) => item.ownerMemberId),
      ...(teamData?.followUps ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.opportunities ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.quotesDraft ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.quotesSubmitted ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.openWork ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.overdueWork ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.followUps ?? []).map((item) => item.ownerMemberId),
    ]);
    const partyLabels = await resolvePartyLabels(client, [
      ...opportunities.map((item) => item.partyId),
      ...quotesDraft.map((item) => item.partyId),
      ...quotesSubmitted.map((item) => item.partyId),
      ...(teamData?.opportunities ?? []).map((item) => item.partyId),
      ...(teamData?.quotesDraft ?? []).map((item) => item.partyId),
      ...(teamData?.quotesSubmitted ?? []).map((item) => item.partyId),
      ...(orgData?.opportunities ?? []).map((item) => item.partyId),
      ...(orgData?.quotesDraft ?? []).map((item) => item.partyId),
      ...(orgData?.quotesSubmitted ?? []).map((item) => item.partyId),
    ]);

    const staleFreshness =
      (opportunitiesResult !== 'unavailable' &&
        isProjectionStale(opportunitiesResult.freshness)) ||
      (quotesDraftResult !== 'unavailable' &&
        isProjectionStale(quotesDraftResult.freshness)) ||
      (quotesSubmittedResult !== 'unavailable' &&
        isProjectionStale(quotesSubmittedResult.freshness)) ||
      (attentionResult !== 'unavailable' &&
        isProjectionStale(attentionResult.freshness));

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={t('pages.inicio.title')}
          description={t('pages.inicio.description')}
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

        <div className="space-y-6">
          <InicioAttentionPanel
            items={attentionItems}
            unavailable={attentionResult === 'unavailable'}
            hasMore={attentionResult !== 'unavailable' && attentionResult.meta.hasMore}
          />

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

          {leadership.team.kind === 'ready' ? (
            <InicioLeadershipSection
              variant="team"
              data={leadership.team.data}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
            />
          ) : null}
          {leadership.org.kind === 'ready' ? (
            <InicioLeadershipSection
              variant="org"
              data={leadership.org.data}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
            />
          ) : null}
        </div>
        </div>
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
