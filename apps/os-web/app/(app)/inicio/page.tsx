import Link from 'next/link';
import { OperatingRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import { PageHeader } from '@/components/shell/page-header';
import { DemoPreviewCards } from '@/components/commercial/demo-preview-cards';
import { ExecutiveLens } from '@/components/commercial/executive-lens';
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
import { partyLabel, resolvePartyLabels, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { loadInicioLeadership } from '@/lib/leadership/load-inicio-leadership';
import { t } from '@/lib/i18n/es';
import { greetingLine } from '@/lib/shell/greeting';
import { loadShellContext } from '@/lib/shell/load-shell-context';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { INICIO_ATTENTION_LIMIT } from '@/lib/work/inicio-attention';
import { formatWorkStatus, isWorkOverdue, statusToneForWork } from '@/lib/work/labels';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveAttentionSubjects } from '@/lib/work/resolve-staff-subjects';
import { isEngineeringFixtureCopy, staffFacingSubject } from '@/lib/work/staff-subject';
import { isProjectionStale } from '@/lib/query/projection-freshness';

/** Contract max. A page with more is not the complete upcoming set. */
const PERSONAL_OPEN_WORK_LIMIT = 100;
const EXECUTIVE_PAGE_LIMIT = 100;

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | 'unavailable'> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'unavailable') return 'unavailable';
    throw err;
  }
}

async function optionalPage<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof OsApiError &&
      (err.kind === 'unavailable' || err.kind === 'forbidden' || err.kind === 'unauthorized')
    ) {
      return null;
    }
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

function hideFixtureQuote(item: QuoteSummaryReadModel): boolean {
  return !isEngineeringFixtureCopy(item.quoteNumber) && !isEngineeringFixtureCopy(item.notes);
}

function hideFixtureParty(partyId: string, partyLabels: PartyLabelMap): boolean {
  return !isEngineeringFixtureCopy(partyLabel(partyLabels, partyId));
}

/**
 * Personal open work with a stored due date that the existing rule does not treat as overdue.
 * A partial page is not returned: callers must omit the stack rather than call it complete.
 */
function upcomingPersonalWork(items: WorkSummaryReadModel[], asOf: Date): WorkSummaryReadModel[] {
  return items
    .filter(
      (work) =>
        work.status === 'open' &&
        Boolean(work.dueAt) &&
        !isWorkOverdue(work, asOf) &&
        !isEngineeringFixtureCopy(work.title) &&
        !isEngineeringFixtureCopy(work.description),
    )
    .sort((left, right) => {
      const delta = new Date(left.dueAt ?? 0).getTime() - new Date(right.dueAt ?? 0).getTime();
      return delta || left.workItemId.localeCompare(right.workItemId);
    });
}

type ExecutivePages = {
  opportunities: OpportunitySummaryReadModel[];
  quotes: QuoteSummaryReadModel[];
  orders: OrderSummaryReadModel[] | null;
  opportunitiesPartial: boolean;
  quotesPartial: boolean;
  ordersPartial: boolean;
};

export default async function InicioPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const limit = INICIO_SECTION_LIMIT;

  try {
    const [
      shellContext,
      attentionResult,
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
      personalWorkResult,
    ] = await Promise.all([
      loadShellContext(),
      safeFetch(() =>
        client.listAttention({ activeOnly: true, limit: INICIO_ATTENTION_LIMIT }),
      ),
      safeFetch(() => client.listOpportunities({ status: 'open', limit })),
      safeFetch(() => client.listQuotes({ status: 'draft', limit })),
      safeFetch(() => client.listQuotes({ status: 'submitted', limit })),
      safeFetch(() => client.listWorkItems({ status: 'open', limit: PERSONAL_OPEN_WORK_LIMIT })),
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
      quotesDraftResult === 'unavailable' ? [] : quotesDraftResult.items.filter(hideFixtureQuote);
    const quotesSubmitted =
      quotesSubmittedResult === 'unavailable'
        ? []
        : quotesSubmittedResult.items.filter(hideFixtureQuote);
    const upcoming =
      personalWorkResult !== 'unavailable' && !personalWorkResult.meta.hasMore
        ? upcomingPersonalWork(personalWorkResult.items, new Date())
        : [];

    const leadership = await loadInicioLeadership(client);
    const teamData = leadership.team.kind === 'ready' ? leadership.team.data : null;
    const orgData = leadership.org.kind === 'ready' ? leadership.org.data : null;
    const executivePages = orgData ? await loadExecutivePages(client, orgData.opportunities, orgData.quotesSubmitted) : null;

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
      ...upcoming.flatMap((item) =>
        item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [],
      ),
      ...(teamData?.opportunities ?? []).map((item) => item.partyId),
      ...(teamData?.quotesDraft ?? []).map((item) => item.partyId),
      ...(teamData?.quotesSubmitted ?? []).map((item) => item.partyId),
      ...(orgData?.opportunities ?? []).map((item) => item.partyId),
      ...(orgData?.quotesDraft ?? []).map((item) => item.partyId),
      ...(orgData?.quotesSubmitted ?? []).map((item) => item.partyId),
    ]);

    const responsibilityOpportunities = opportunities.filter((item) =>
      hideFixtureParty(item.partyId, partyLabels),
    );
    const responsibilityDraft = quotesDraft.filter((item) => hideFixtureParty(item.partyId, partyLabels));
    const responsibilitySubmitted = quotesSubmitted.filter((item) =>
      hideFixtureParty(item.partyId, partyLabels),
    );
    const upcomingRows = upcoming.filter((work) => {
      if (work.subjectType !== 'party' || !work.subjectId) return true;
      return hideFixtureParty(work.subjectId, partyLabels);
    });
    const showResponsibility =
      responsibilityOpportunities.length > 0 ||
      responsibilityDraft.length > 0 ||
      responsibilitySubmitted.length > 0;

    const staleFreshness =
      (opportunitiesResult !== 'unavailable' &&
        isProjectionStale(opportunitiesResult.freshness)) ||
      (quotesDraftResult !== 'unavailable' &&
        isProjectionStale(quotesDraftResult.freshness)) ||
      (quotesSubmittedResult !== 'unavailable' &&
        isProjectionStale(quotesSubmittedResult.freshness)) ||
      (attentionResult !== 'unavailable' &&
        isProjectionStale(attentionResult.freshness)) ||
      (personalWorkResult !== 'unavailable' &&
        isProjectionStale(personalWorkResult.freshness));

    const showLenses = leadership.team.kind === 'ready' || leadership.org.kind === 'ready';
    const greeting = greetingLine(shellContext?.givenName);

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={greeting}
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

        <div className="min-w-0 space-y-10">
          <InicioAttentionPanel
            items={visibleAttention}
            subjects={attentionSubjects}
            unavailable={attentionResult === 'unavailable'}
            hasMore={attentionResult !== 'unavailable' && attentionResult.meta.hasMore}
          />

          {upcomingRows.length > 0 ? (
            <section aria-label="Próximos" className="min-w-0 space-y-3">
              <p className="isalwa-kicker">Próximos</p>
              <PageSection card className="min-w-0 p-2">
                <ul className="min-w-0" aria-label="Trabajo con fecha que aún no vence">
                  {upcomingRows.map((work) => {
                    const customer =
                      work.subjectType === 'party' && work.subjectId
                        ? partyLabel(partyLabels, work.subjectId)
                        : null;
                    const subject = staffFacingSubject({
                      title: work.title,
                      description: work.description,
                      subjectType: work.subjectType,
                      customerName: customer,
                    });
                    const due = formatWorkDueLine(work);
                    return (
                      <li key={work.workItemId}>
                        <OperatingRow
                          className="py-tight !py-1"
                          href={workItemHref(work.workItemId)}
                          subject={subject}
                          meta={due.text}
                          status={
                            <StatusPill tone={statusToneForWork(work.status)} className="shrink-0">
                              {formatWorkStatus(work.status)}
                            </StatusPill>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </PageSection>
            </section>
          ) : null}

          {showResponsibility ? (
            <section aria-label="Su responsabilidad" className="min-w-0 space-y-8">
              <p className="isalwa-kicker">Su responsabilidad</p>
              {responsibilityOpportunities.length > 0 ? (
                <PageSection card className="min-w-0 p-5 md:p-6">
                  <SectionHeader
                    title={t('pages.inicio.opportunities')}
                    action={destinationLink('/oportunidades', 'Ver todas')}
                  />
                  <OpportunityOrgList
                    items={responsibilityOpportunities}
                    memberLabels={memberLabels}
                    partyLabels={partyLabels}
                    compact
                  />
                </PageSection>
              ) : null}

              {responsibilityDraft.length > 0 || responsibilitySubmitted.length > 0 ? (
                <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
                  {responsibilityDraft.length > 0 ? (
                    <PageSection card className="min-w-0 p-5 md:p-6">
                      <SectionHeader
                        title={t('pages.inicio.quotesDraft')}
                        action={destinationLink('/cotizaciones?status=draft', 'Ver todas')}
                      />
                      <QuoteOrgList
                        items={responsibilityDraft}
                        memberLabels={memberLabels}
                        partyLabels={partyLabels}
                        compact
                      />
                    </PageSection>
                  ) : null}
                  {responsibilitySubmitted.length > 0 ? (
                    <PageSection card className="min-w-0 p-5 md:p-6">
                      <SectionHeader
                        title={t('pages.inicio.quotesSubmitted')}
                        action={destinationLink('/cotizaciones?status=submitted', 'Ver todas')}
                      />
                      <QuoteOrgList
                        items={responsibilitySubmitted}
                        memberLabels={memberLabels}
                        partyLabels={partyLabels}
                        compact
                      />
                    </PageSection>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {showLenses ? (
            <section
              aria-label="Lecturas de equipo y empresa"
              className="min-w-0 space-y-10 border-t border-[var(--isalwa-mist)] pt-10"
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
              {executivePages ? (
                <ExecutiveLens
                  opportunities={executivePages.opportunities}
                  quotes={executivePages.quotes}
                  orders={executivePages.orders}
                  opportunitiesPartial={executivePages.opportunitiesPartial}
                  quotesPartial={executivePages.quotesPartial}
                  ordersPartial={executivePages.ordersPartial}
                />
              ) : null}
            </section>
          ) : null}

          <DemoPreviewCards />
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

async function loadExecutivePages(
  client: ReturnType<typeof createOsApiClient>,
  fallbackOpportunities: OpportunitySummaryReadModel[],
  fallbackSubmitted: QuoteSummaryReadModel[],
): Promise<ExecutivePages> {
  const [opportunities, submitted, accepted, orders] = await Promise.all([
    optionalPage(() =>
      client.listOpportunities({ visibility: 'org', status: 'open', limit: EXECUTIVE_PAGE_LIMIT }),
    ),
    optionalPage(() =>
      client.listQuotes({ visibility: 'org', status: 'submitted', limit: EXECUTIVE_PAGE_LIMIT }),
    ),
    optionalPage(() =>
      client.listQuotes({ visibility: 'org', status: 'accepted', limit: EXECUTIVE_PAGE_LIMIT }),
    ),
    optionalPage(() => client.listOrders({ status: 'open', limit: EXECUTIVE_PAGE_LIMIT })),
  ]);

  const opportunityPage = pageOrFallback(opportunities, fallbackOpportunities);
  const submittedPage = pageOrFallback(submitted, fallbackSubmitted);
  const quotes = [
    ...submittedPage.items,
    ...(accepted?.items ?? []),
  ];
  const quotesPartial = submittedPage.partial || accepted === null || accepted.meta.hasMore;

  return {
    opportunities: opportunityPage.items,
    quotes,
    orders: orders ? orders.items : null,
    opportunitiesPartial: opportunityPage.partial,
    quotesPartial,
    ordersPartial: orders !== null && orders.meta.hasMore,
  };
}

function pageOrFallback<T>(
  page: { items: T[]; meta: { hasMore: boolean } } | null,
  fallback: T[],
): { items: T[]; partial: boolean } {
  if (!page) return { items: fallback, partial: true };
  return { items: page.items, partial: page.meta.hasMore };
}
