import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
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
import { resolveAttentionSubjects } from '@/lib/work/resolve-staff-subjects';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
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

function destinationLink(href: string, label: string) {
  return (
    <Link href={href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
      {label}
    </Link>
  );
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
      opportunitiesResult === 'unavailable'
        ? []
        : opportunitiesResult.items.filter((item) => !isEngineeringFixtureCopy(item.title));
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
    const attentionSubjects =
      attentionResult === 'unavailable'
        ? new Map<string, string>()
        : await resolveAttentionSubjects(client, attentionItems);
    const visibleAttention =
      attentionResult === 'unavailable'
        ? []
        : attentionItems.filter((item) => {
            const subject = attentionSubjects.get(item.attentionKey) ?? '';
            return subject.trim().length > 0 && !isEngineeringFixtureCopy(subject);
          });
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

    const showLenses = leadership.team.kind === 'ready' || leadership.org.kind === 'ready';

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={t('pages.inicio.title')}
          description={t('pages.inicio.description')}
          action={
            <div className="flex flex-wrap items-center gap-4">
              {destinationLink('/trabajo', t('states.viewWork'))}
              {destinationLink('/clientes', t('states.goToClientes'))}
            </div>
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

        <div className="min-w-0">
          <section aria-label="Su responsabilidad" className="min-w-0 space-y-10">
            <div className="space-y-4">
              <p className="isalwa-kicker">Su responsabilidad</p>
              <InicioAttentionPanel
                items={visibleAttention}
                subjects={attentionSubjects}
                unavailable={attentionResult === 'unavailable'}
                hasMore={attentionResult !== 'unavailable' && attentionResult.meta.hasMore}
              />
            </div>

            {opportunities.length === 0 ? (
              <EmptyState
                title={t('pages.inicio.opportunities')}
                description="No hay oportunidades abiertas a su cargo. Cuando registre una, aparecerá aquí. Continúe en Clientes."
                action={
                  <Link href="/clientes" className="inline-flex">
                    <Button type="button" variant="primary">
                      {t('states.goToClientes')}
                    </Button>
                  </Link>
                }
              />
            ) : (
              <PageSection card className="min-w-0 p-5 md:p-6">
                <SectionHeader
                  title={t('pages.inicio.opportunities')}
                  action={destinationLink('/oportunidades', 'Ver todas')}
                />
                <OpportunityOrgList
                  items={opportunities}
                  memberLabels={memberLabels}
                  partyLabels={partyLabels}
                  compact
                />
              </PageSection>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
              {quotesDraft.length === 0 ? (
                <EmptyState
                  className="min-w-0"
                  title={t('pages.inicio.quotesDraft')}
                  description="No hay borradores a su cargo. Las cotizaciones se preparan desde un cliente."
                  action={
                    <Link href="/clientes" className="inline-flex">
                      <Button type="button" variant="primary">
                        {t('states.goToClientes')}
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <PageSection card className="min-w-0 p-5 md:p-6">
                  <SectionHeader
                    title={t('pages.inicio.quotesDraft')}
                    action={destinationLink('/cotizaciones?status=draft', 'Ver todas')}
                  />
                  <QuoteOrgList
                    items={quotesDraft}
                    memberLabels={memberLabels}
                    partyLabels={partyLabels}
                    compact
                  />
                </PageSection>
              )}

              {quotesSubmitted.length === 0 ? (
                <EmptyState
                  className="min-w-0"
                  title={t('pages.inicio.quotesSubmitted')}
                  description="No hay cotizaciones enviadas a su cargo. El seguimiento continúa en Clientes."
                  action={
                    <Link href="/clientes" className="inline-flex">
                      <Button type="button" variant="primary">
                        {t('states.goToClientes')}
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <PageSection card className="min-w-0 p-5 md:p-6">
                  <SectionHeader
                    title={t('pages.inicio.quotesSubmitted')}
                    action={destinationLink('/cotizaciones?status=submitted', 'Ver todas')}
                  />
                  <QuoteOrgList
                    items={quotesSubmitted}
                    memberLabels={memberLabels}
                    partyLabels={partyLabels}
                    compact
                  />
                </PageSection>
              )}
            </div>
          </section>

          {showLenses ? (
            <section
              aria-label="Lecturas de equipo y empresa"
              className="mt-12 min-w-0 space-y-10 border-t border-[var(--isalwa-mist)] pt-10"
            >
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
                Equipo y empresa son lecturas de esta misma página. Solo lectura.
              </p>
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
            </section>
          ) : null}
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
