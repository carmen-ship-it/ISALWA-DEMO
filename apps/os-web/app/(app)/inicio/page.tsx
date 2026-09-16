import Link from 'next/link';
import { Button, OperatingRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type { QuoteSummaryReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { PageHeader } from '@/components/shell/page-header';
import { InicioLeadershipSection } from '@/components/commercial/inicio-leadership-section';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { InicioManagementLens } from '@/components/management/inicio-management-lens';
import { OperatingHomes } from '@/components/management/operating-homes';
import { InicioCommandQueueSections } from '@/components/inicio/inicio-command-queue-sections';
import { InicioTodayQueue } from '@/components/inicio/inicio-today-queue';
import { InicioWhatChanged } from '@/components/inicio/inicio-what-changed';
import type { MemoryChangesResponse } from '@/lib/audit/types';
import { InicioAttentionPanel } from '@/components/work/inicio-attention-panel';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { INICIO_SECTION_LIMIT } from '@/lib/commercial/inicio-home';
import { commitmentAgingAdapter } from '@/lib/inicio/commitment-aging';
import { loadInicioCommandQueues, safeInicioSectionFetch } from '@/lib/inicio/load-command-queues';
import { resolveInicioApprovalSubjects } from '@/lib/inicio/resolve-approval-subjects';
import { buildTodayQueue } from '@/lib/inicio/today-queue';
import { partyLabel, resolvePartyLabels, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { loadInicioLeadership } from '@/lib/leadership/load-inicio-leadership';
import { loadInicioManagement } from '@/lib/management/load-inicio-management';
import { loadOperatingHomes } from '@/lib/roles/load-operating-homes';
import { t } from '@/lib/i18n/es';
import { greetingLine } from '@/lib/shell/greeting';
import { loadShellContext } from '@/lib/shell/load-shell-context';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { INICIO_ATTENTION_LIMIT } from '@/lib/work/inicio-attention';
import { formatWorkStatus, isWorkOverdue, statusToneForWork } from '@/lib/work/labels';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { workItemHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveAttentionSubjects } from '@/lib/work/resolve-staff-subjects';
import { isEngineeringFixtureCopy, staffFacingSubject } from '@/lib/work/staff-subject';
import { isProjectionStale } from '@/lib/query/projection-freshness';

/** Contract max. A page with more is not the complete upcoming set. */
const PERSONAL_OPEN_WORK_LIMIT = 100;

/** Org What Changed is admin-gated. Forbidden is omitted, not fabricated. */
async function safeMemoryChanges(
  fn: () => Promise<MemoryChangesResponse>,
): Promise<MemoryChangesResponse | 'unavailable' | 'unauthorized'> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return 'unauthorized';
    }
    if (err instanceof OsApiError && err.kind === 'unavailable') return 'unavailable';
    throw err;
  }
}

function destinationLink(href: string, label: string, variant: 'primary' | 'secondary' | 'tertiary' = 'secondary') {
  return (
    <Link href={href} className="inline-flex">
      <Button type="button" variant={variant} size="sm">
        {label}
      </Button>
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
      management,
      memoryChanges,
    ] = await Promise.all([
      loadShellContext(),
      safeInicioSectionFetch(() =>
        client.listAttention({ activeOnly: true, limit: INICIO_ATTENTION_LIMIT }),
      ),
      safeInicioSectionFetch(() => client.listOpportunities({ status: 'open', limit })),
      safeInicioSectionFetch(() => client.listQuotes({ status: 'draft', limit })),
      safeInicioSectionFetch(() => client.listQuotes({ status: 'submitted', limit })),
      safeInicioSectionFetch(() => client.listWorkItems({ status: 'open', limit: PERSONAL_OPEN_WORK_LIMIT })),
      loadInicioManagement(client),
      safeMemoryChanges(() => client.listMemoryChanges({ window: 'hoy' })),
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
    const commandQueues = await loadInicioCommandQueues(client, {
      leadershipTeamReady: leadership.team.kind === 'ready',
      leadershipOrgReady: leadership.org.kind === 'ready',
    });

    const memberLabels = await resolveMemberLabels(client, [
      ...opportunities.map((item) => item.ownerMemberId),
      ...quotesDraft.map((item) => item.ownerMemberId),
      ...quotesSubmitted.map((item) => item.ownerMemberId),
      ...commandQueues.pendingWork.map((item) => item.ownerMemberId),
      ...commandQueues.openIssues.flatMap((item) =>
        [item.ownerMemberId, item.reporterMemberId].filter((id): id is string => Boolean(id)),
      ),
      ...commandQueues.pendingApprovals.flatMap((item) => [
        item.requestedByMemberId,
        item.approverMemberId,
      ]),
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
    const commandApprovalSubjects = await resolveInicioApprovalSubjects(
      client,
      commandQueues.pendingApprovals,
    );
    const partyLabels = await resolvePartyLabels(client, [
      ...opportunities.map((item) => item.partyId),
      ...quotesDraft.map((item) => item.partyId),
      ...quotesSubmitted.map((item) => item.partyId),
      ...upcoming.flatMap((item) =>
        item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [],
      ),
      ...commandQueues.pendingWork.flatMap((item) =>
        item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [],
      ),
      ...commandQueues.commitmentsOverdue.flatMap((item) => (item.partyId ? [item.partyId] : [])),
      ...commandQueues.commitmentsOpen.flatMap((item) => (item.partyId ? [item.partyId] : [])),
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
    const session = await client.getAuthenticatedSession();
    const todayQueue = buildTodayQueue({
      memberId: session.memberId,
      asOf: new Date(),
      attention: visibleAttention,
      work: personalWorkResult === 'unavailable' ? [] : personalWorkResult.items,
      approvals: commandQueues.pendingApprovals,
      commitments: commandQueues.unavailable.commitments
        ? []
        : [...commandQueues.commitmentsOverdue, ...commandQueues.commitmentsOpen],
      issues: commandQueues.unavailable.issues ? [] : commandQueues.openIssues,
      partyLabels,
      approvalSubjects: commandApprovalSubjects,
    });
    const operatingHomes = await loadOperatingHomes(client, {
      ownQuotes: [...quotesDraft, ...quotesSubmitted],
      teamQuotes: [...(teamData?.quotesDraft ?? []), ...(teamData?.quotesSubmitted ?? [])],
      ownWork: upcomingRows,
      teamWork: teamData?.followUps ?? [],
      attention: visibleAttention,
    });

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={greeting}
          description={t('pages.inicio.description')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {destinationLink('/trabajo', t('states.viewWork'), 'primary')}
              {destinationLink('/clientes', t('states.goToClientes'), 'secondary')}
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
          <OperatingHomes model={operatingHomes} />

          <div className="min-w-0 space-y-8 rounded-[var(--isalwa-radius-panel)] border border-[color-mix(in_srgb,var(--isalwa-kiln)_12%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-sky-100)_55%,var(--isalwa-porcelain))] p-4 shadow-[var(--isalwa-shadow-soft)] md:p-5">
            <div>
              <p className="isalwa-kicker">Centro de mando</p>
              <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic leading-tight text-[var(--isalwa-kiln)] md:text-3xl">
                Atención de hoy
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
                Colas operativas con hechos gobernados. Sin totales inventados. El recordatorio es
                esta pantalla — no correo, push ni WhatsApp.
              </p>
            </div>
            <InicioTodayQueue queue={todayQueue} />
            <InicioAttentionPanel
              items={visibleAttention}
              subjects={attentionSubjects}
              unavailable={attentionResult === 'unavailable'}
              hasMore={attentionResult !== 'unavailable' && attentionResult.meta.hasMore}
              work={
                personalWorkResult === 'unavailable' ? undefined : personalWorkResult.items
              }
              approvals={commandQueues.pendingApprovals.map((item) => ({
                approvalRequestId: item.approvalRequestId,
                status: item.status,
                requestedAt: null,
                subject:
                  commandApprovalSubjects.get(item.approvalRequestId) ??
                  APPROVAL_ROW_SUBJECT_FALLBACK,
              }))}
              quotes={quotesSubmittedResult === 'unavailable' ? undefined : quotesSubmitted}
              commitments={
                commandQueues.unavailable.commitments
                  ? null
                  : commitmentAgingAdapter([
                      ...commandQueues.commitmentsOverdue,
                      ...commandQueues.commitmentsOpen,
                    ])
              }
            />

            <InicioManagementLens model={management} />

            <InicioCommandQueueSections
              model={commandQueues}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              approvalSubjects={commandApprovalSubjects}
            />

            {memoryChanges !== 'unauthorized' && memoryChanges !== 'unavailable' ? (
              <InicioWhatChanged items={memoryChanges.items} windowLabel="Hoy" />
            ) : null}
          </div>

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
