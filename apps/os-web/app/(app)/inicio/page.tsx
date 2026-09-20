import Link from 'next/link';
import { Button, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import { PageHeader } from '@/components/shell/page-header';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { InicioManagementLens } from '@/components/management/inicio-management-lens';
import { ManagementExamplePreviewTrigger } from '@/components/management/management-example-preview';
import { ManagementInsightsPanel } from '@/components/management/management-insights-panel';
import { ManagementOrgMetrics } from '@/components/management/management-org-metrics';
import { ManagementCommercialFunnel } from '@/components/management/management-commercial-funnel';
import { ManagementTeamTable } from '@/components/management/management-team-table';
import { InicioCommandQueueSections } from '@/components/inicio/inicio-command-queue-sections';
import { InicioLensTabs } from '@/components/inicio/inicio-lens-tabs';
import { InicioMiDia } from '@/components/inicio/inicio-mi-dia';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { InicioSummaryCards } from '@/components/inicio/inicio-summary-cards';
import { InicioVisualBand } from '@/components/inicio/inicio-visual-band';
import { InicioWhatChanged } from '@/components/inicio/inicio-what-changed';
import { InicioOwnerDemoCard } from '@/components/demo/inicio-owner-demo-card';
import type { MemoryChangesResponse } from '@/lib/audit/types';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { INICIO_SECTION_LIMIT } from '@/lib/commercial/inicio-home';
import { partyLabel, resolvePartyLabels, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import {
  buildInicioSummaryCounts,
  summaryCardsFromCounts,
} from '@/lib/inicio/build-summary-cards';
import { loadInicioCommandQueues, safeInicioSectionFetch } from '@/lib/inicio/load-command-queues';
import { flattenMiDia } from '@/lib/inicio/mi-dia';
import {
  availableInicioPageLenses,
  canShowOrgLens,
  isInicioExceptionsView,
  lensInputForEvaluation,
  parseManagementPeriodPreset,
  resolveInicioPageLens,
  type InicioPageLens,
} from '@/lib/inicio/page-lens';
import { resolveInicioApprovalSubjects } from '@/lib/inicio/resolve-approval-subjects';
import { buildTodayQueue } from '@/lib/inicio/today-queue';
import { loadInicioLeadership } from '@/lib/leadership/load-inicio-leadership';
import { loadInicioManagement } from '@/lib/management/load-inicio-management';
import {
  buildOportunidadesDeMejora,
  buildParaRevisarInsights,
} from '@/lib/management/improvement-insights';
import { composeOrgMetricCards, composeCommercialFunnelCounts, formatManagementPeriodLabel, resolveManagementPeriod } from '@/lib/management/org-metrics';
import { buildCommercialFunnelSteps } from '@/lib/management/commercial-funnel';
import {
  filterByPartyDemoMode,
  shouldShowManagementTeamTable,
} from '@/lib/management/demo-lens';
import { partyCountByOwner } from '@/lib/management/party-count-by-owner';
import { viewerHasManagementOrgRead } from '@/lib/management/scope';
import { composeTeamMetricsRows } from '@/lib/management/team-metrics';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { t } from '@/lib/i18n/es';
import { greetingLine } from '@/lib/shell/greeting';
import { loadShellContext } from '@/lib/shell/load-shell-context';
import { INICIO_ATTENTION_LIMIT } from '@/lib/work/inicio-attention';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveAttentionSubjects } from '@/lib/work/resolve-staff-subjects';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { isProjectionStale } from '@/lib/query/projection-freshness';
import { canUseRolePreview } from '@/lib/role-preview/access';
import { isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import {
  evaluationIsOpsPersona,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import {
  filterApprovalsForEvaluation,
  filterAttentionForEvaluation,
  filterCommercialOwnerRowsForEvaluation,
  filterCommitmentsForEvaluation,
  filterIssuesForEvaluation,
  filterWorkForEvaluation,
} from '@/lib/inicio/filter-for-evaluation';

const PERSONAL_OPEN_WORK_LIMIT = 100;
const HERO_SUBTITLE = 'Esto es lo que necesita atención hoy.';

type InicioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function paramOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

function allowPartyForDataMode(
  partyId: string,
  partyLabels: PartyLabelMap,
  dataMode: 'real' | 'demo',
): boolean {
  const name = partyLabel(partyLabels, partyId);
  const demo = isDemoDisplayName(name);
  if (dataMode === 'demo') return demo;
  return !demo && hideFixtureParty(partyId, partyLabels);
}

function orgMetricsSparse(cards: ReturnType<typeof composeOrgMetricCards>): boolean {
  return cards.every((card) => {
    if (card.count != null) return card.count === 0;
    return card.value === '—' || card.value.trim() === '';
  });
}

export default async function InicioPage({ searchParams }: InicioPageProps) {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const params = await searchParams;
  const client = createOsApiClient(auth);
  const evaluation = await getEvaluationProjection();
  const commercialQuery = commercialListQueryFromProjection(evaluation);
  const limit = INICIO_SECTION_LIMIT;
  const asOf = new Date();

  try {
    const [
      shellContext,
      attentionResult,
      opportunitiesResult,
      quotesDraftResult,
      quotesSubmittedResult,
      quotesAcceptedResult,
      personalWorkResult,
      management,
      memoryChanges,
      leadership,
      roleKeys,
    ] = await Promise.all([
      loadShellContext(),
      safeInicioSectionFetch(() =>
        client.listAttention({ activeOnly: true, limit: INICIO_ATTENTION_LIMIT }),
      ),
      safeInicioSectionFetch(() =>
        client.listOpportunities({ status: 'open', limit, ...commercialQuery }),
      ),
      safeInicioSectionFetch(() =>
        client.listQuotes({ status: 'draft', limit, ...commercialQuery }),
      ),
      safeInicioSectionFetch(() =>
        client.listQuotes({ status: 'submitted', limit, ...commercialQuery }),
      ),
      safeInicioSectionFetch(() =>
        client.listQuotes({ status: 'accepted', limit, ...commercialQuery }),
      ),
      safeInicioSectionFetch(() =>
        client.listWorkItems({
          status: 'open',
          limit: PERSONAL_OPEN_WORK_LIMIT,
          ...(evaluation.active &&
          evaluation.persona === 'asesor' &&
          evaluation.subjectMemberId
            ? { ownerMemberId: evaluation.subjectMemberId }
            : {}),
        }),
      ),
      loadInicioManagement(client),
      safeMemoryChanges(() => client.listMemoryChanges({ window: 'hoy' })),
      loadInicioLeadership(client),
      loadActorRoleKeys(client),
    ]);

    let allowedPartyIds: Set<string> | null = null;
    if (evaluation.active && evaluation.persona === 'asesor') {
      if (!evaluation.subjectMemberId) {
        allowedPartyIds = new Set();
      } else {
        const parties = await client
          .searchParties({ status: 'active', limit: 100 })
          .catch(() => ({ items: [] as Array<{ partyId: string; commercialOwnerMemberId?: string | null }> }));
        const owned = filterByCommercialOwner(
          evaluation,
          parties.items ?? [],
          (item) => item.commercialOwnerMemberId,
        );
        allowedPartyIds = new Set(owned.map((p) => p.partyId));
      }
    }

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
    const opportunitiesRaw =
      opportunitiesResult === 'unavailable'
        ? []
        : opportunitiesResult.items.filter((item) => !isEngineeringFixtureCopy(item.title));
    const quotesDraftRaw =
      quotesDraftResult === 'unavailable' ? [] : quotesDraftResult.items.filter(hideFixtureQuote);
    const quotesSubmittedRaw =
      quotesSubmittedResult === 'unavailable'
        ? []
        : quotesSubmittedResult.items.filter(hideFixtureQuote);
    const quotesAcceptedRaw =
      quotesAcceptedResult === 'unavailable'
        ? []
        : quotesAcceptedResult.items.filter(hideFixtureQuote);

    const opportunities = filterCommercialOwnerRowsForEvaluation(
      evaluation,
      opportunitiesRaw,
      (item) => item.ownerMemberId,
    );
    const quotesDraft = filterCommercialOwnerRowsForEvaluation(
      evaluation,
      quotesDraftRaw,
      (item) => item.ownerMemberId,
    );
    const quotesSubmitted = filterCommercialOwnerRowsForEvaluation(
      evaluation,
      quotesSubmittedRaw,
      (item) => item.ownerMemberId,
    );
    const quotesAccepted = filterCommercialOwnerRowsForEvaluation(
      evaluation,
      quotesAcceptedRaw,
      (item) => item.ownerMemberId,
    );

    // View As ops: hide commercial responsibility strip (not work-relevant).
    const showCommercialResponsibility = !evaluationIsOpsPersona(evaluation.persona);

    const lensInput = lensInputForEvaluation(
      {
        roleKeys,
        leadershipTeamReady: leadership.team.kind === 'ready',
        leadershipOrgReady: leadership.org.kind === 'ready',
      },
      evaluation,
    );
    const availableLenses = availableInicioPageLenses(lensInput);
    const activeLens: InicioPageLens = resolveInicioPageLens(paramOne(params.lente), lensInput);
    const periodPreset = parseManagementPeriodPreset(paramOne(params.periodo));
    const managementPeriod = resolveManagementPeriod(periodPreset, undefined, undefined, asOf);
    const dataMode = await resolveDemoDataMode(params);
    const showOwnerDemoCard = canUseRolePreview(roleKeys);
    const session = await client.getAuthenticatedSession();

    const commandQueuesRaw = await loadInicioCommandQueues(client, {
      leadershipTeamReady: leadership.team.kind === 'ready',
      leadershipOrgReady: leadership.org.kind === 'ready',
    });

    const commandQueues = {
      ...commandQueuesRaw,
      pendingWork: filterWorkForEvaluation(
        evaluation,
        commandQueuesRaw.pendingWork,
        allowedPartyIds,
      ),
      openIssues: filterIssuesForEvaluation(
        evaluation,
        commandQueuesRaw.openIssues,
        allowedPartyIds,
      ),
      commitmentsOverdue: filterCommitmentsForEvaluation(
        evaluation,
        commandQueuesRaw.commitmentsOverdue,
        allowedPartyIds,
      ),
      commitmentsOpen: filterCommitmentsForEvaluation(
        evaluation,
        commandQueuesRaw.commitmentsOpen,
        allowedPartyIds,
      ),
      pendingApprovals: filterApprovalsForEvaluation(evaluation, commandQueuesRaw.pendingApprovals, {
        memberId: session.memberId,
        scope: 'personal',
      }),
      pendingApprovalsOrg: filterApprovalsForEvaluation(
        evaluation,
        commandQueuesRaw.pendingApprovalsOrg,
        {
          memberId: session.memberId,
          scope: 'org',
        },
      ),
    };

    const teamData = leadership.team.kind === 'ready' ? leadership.team.data : null;
    const orgData = leadership.org.kind === 'ready' ? leadership.org.data : null;

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
      ...(teamData?.quotesSubmitted ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.opportunities ?? []).map((item) => item.ownerMemberId),
      ...(orgData?.quotesSubmitted ?? []).map((item) => item.ownerMemberId),
    ]);

    const attentionSubjects =
      attentionResult === 'unavailable'
        ? new Map<string, string>()
        : await resolveAttentionSubjects(client, attentionItems);
    const visibleAttentionRaw =
      attentionResult === 'unavailable'
        ? []
        : attentionItems.filter((item) => {
            const subject = attentionSubjects.get(item.attentionKey) ?? '';
            return subject.trim().length > 0 && !isEngineeringFixtureCopy(subject);
          });
    const visibleAttention = filterAttentionForEvaluation(
      evaluation,
      visibleAttentionRaw,
      allowedPartyIds,
    );

    const partyLabels = await resolvePartyLabels(client, [
      ...opportunities.map((item) => item.partyId),
      ...quotesDraft.map((item) => item.partyId),
      ...quotesSubmitted.map((item) => item.partyId),
      ...commandQueues.pendingWork.flatMap((item) =>
        item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [],
      ),
      ...(teamData?.opportunities ?? []).map((item) => item.partyId),
      ...(teamData?.quotesSubmitted ?? []).map((item) => item.partyId),
      ...(teamData?.quotesDraft ?? []).map((item) => item.partyId),
      ...(orgData?.opportunities ?? []).map((item) => item.partyId),
      ...(orgData?.quotesSubmitted ?? []).map((item) => item.partyId),
      ...(orgData?.quotesDraft ?? []).map((item) => item.partyId),
    ]);

    const isDemoParty = (partyId: string) =>
      isDemoDisplayName(partyLabel(partyLabels, partyId));

    const responsibilityOpportunities = opportunities.filter((item) =>
      allowPartyForDataMode(item.partyId, partyLabels, dataMode),
    );
    const responsibilityDraft = quotesDraft.filter((item) =>
      allowPartyForDataMode(item.partyId, partyLabels, dataMode),
    );
    const responsibilitySubmitted = quotesSubmitted.filter((item) =>
      allowPartyForDataMode(item.partyId, partyLabels, dataMode),
    );
    const responsibilityAccepted = quotesAccepted.filter((item) =>
      allowPartyForDataMode(item.partyId, partyLabels, dataMode),
    );
    const linkedQuotes = [...responsibilityDraft, ...responsibilitySubmitted, ...responsibilityAccepted].map(
      (item) => ({
        quoteId: item.quoteId,
        partyId: item.partyId,
        opportunityId: item.opportunityId,
        status: item.status,
      }),
    );
    const showResponsibility =
      showCommercialResponsibility &&
      (responsibilityOpportunities.length > 0 ||
        responsibilityDraft.length > 0 ||
        responsibilitySubmitted.length > 0);

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

    const personalWorkRaw =
      personalWorkResult === 'unavailable' ? [] : personalWorkResult.items;
    const personalWork = filterWorkForEvaluation(evaluation, personalWorkRaw, allowedPartyIds);
    const openIssues = commandQueues.unavailable.issues ? [] : commandQueues.openIssues;

    // Summary Approvals card: personal pending-for-me; Empresa lens or View As
    // Jefe/Gerencia → org pending (same universe as /aprobaciones under that projection).
    const approvalsScope =
      (activeLens === 'org' && canShowOrgLens(lensInput)) ||
      (evaluation.active &&
        (evaluation.persona === 'jefe-comercial' || evaluation.persona === 'gerencia'))
        ? 'org'
        : 'personal';
    const summaryApprovalsSource =
      approvalsScope === 'org'
        ? commandQueues.pendingApprovalsOrg
        : commandQueues.pendingApprovals;
    const projectionWorkOwnerId =
      evaluation.active && evaluation.persona === 'asesor' && evaluation.subjectMemberId
        ? evaluation.subjectMemberId
        : session.memberId;

    const decisionesApprovals =
      approvalsScope === 'org'
        ? commandQueues.pendingApprovalsOrg
        : commandQueues.pendingApprovals;
    const commandApprovalSubjects = await resolveInicioApprovalSubjects(
      client,
      decisionesApprovals,
    );

    const todayQueue = buildTodayQueue({
      memberId: projectionWorkOwnerId,
      asOf,
      attention: visibleAttention,
      work: personalWork,
      approvals: decisionesApprovals,
      commitments: commandQueues.unavailable.commitments
        ? []
        : [...commandQueues.commitmentsOverdue, ...commandQueues.commitmentsOpen],
      issues: openIssues,
      partyLabels,
      approvalSubjects: commandApprovalSubjects,
    });

    const summaryCounts = buildInicioSummaryCounts({
      attention: visibleAttention,
      work: personalWork,
      approvals: summaryApprovalsSource,
      issues: openIssues,
      memberId: session.memberId,
      asOf,
      approvalsScope,
      workOwnerMemberId: projectionWorkOwnerId,
    });
    const summaryCards = summaryCardsFromCounts(
      summaryCounts,
      commandQueues.unavailable.issues,
    );
    const miDiaItems = flattenMiDia(todayQueue);
    const greeting = greetingLine(shellContext?.givenName);

    const ordersResult =
      activeLens === 'personal'
        ? null
        : await safeInicioSectionFetch(() => client.listOrders({ limit: 100 }));
    const ordersRaw = ordersResult && ordersResult !== 'unavailable' ? ordersResult.items : [];
    const orderPartyLabels =
      ordersRaw.length > 0
        ? await resolvePartyLabels(client, ordersRaw.map((item) => item.partyId))
        : new Map<string, string>();
    for (const [partyId, label] of orderPartyLabels) {
      if (!partyLabels.has(partyId)) partyLabels.set(partyId, label);
    }
    const orders = filterByPartyDemoMode(ordersRaw, dataMode, isDemoParty);
    const inicioListCaps: ListCap[] = [];
    pushListCap(inicioListCaps, attentionResult === 'unavailable' ? null : attentionResult, INICIO_ATTENTION_LIMIT);
    pushListCap(
      inicioListCaps,
      personalWorkResult === 'unavailable' ? null : personalWorkResult,
      PERSONAL_OPEN_WORK_LIMIT,
    );
    pushListCap(inicioListCaps, ordersResult === 'unavailable' || !ordersResult ? null : ordersResult, 100);

    const orgOpportunities =
      orgData != null
        ? filterByPartyDemoMode(orgData.opportunities, dataMode, isDemoParty)
        : [];
    const orgQuotes =
      orgData != null
        ? filterByPartyDemoMode(orgData.quotesSubmitted, dataMode, isDemoParty)
        : [];
    const teamOpportunities =
      teamData != null
        ? filterByPartyDemoMode(teamData.opportunities, dataMode, isDemoParty)
        : [];
    const teamQuotes =
      teamData != null
        ? filterByPartyDemoMode(teamData.quotesSubmitted, dataMode, isDemoParty)
        : [];

    const insightBundle =
      activeLens === 'team' && teamData
        ? {
            submittedQuotes: teamQuotes,
            openFollowUpWork: teamData.openWork,
            overdueFollowUps: teamData.overdueWork,
            pendingQuoteApprovals: commandQueues.pendingApprovalsOrg.filter(
              (row) => row.status === 'pending' && row.subjectType === 'quote',
            ).length,
            clientsMissingLocation: null as number | null,
            exitsWithoutDelivery: null as number | null,
            pendingConfirmations: null as number | null,
          }
        : activeLens === 'org' && orgData
          ? {
              submittedQuotes: orgQuotes,
              openFollowUpWork: orgData.openWork,
              overdueFollowUps: orgData.overdueWork,
              pendingQuoteApprovals: commandQueues.pendingApprovalsOrg.filter(
                (row) => row.status === 'pending' && row.subjectType === 'quote',
              ).length,
              clientsMissingLocation: null as number | null,
              exitsWithoutDelivery: null as number | null,
              pendingConfirmations: null as number | null,
            }
          : null;

    const orgMetricCards =
      activeLens === 'org' && orgData
        ? composeOrgMetricCards({
            period: managementPeriod,
            opportunities: orgOpportunities,
            quotes: orgQuotes,
            orders,
            overdueFollowUps: orgData.overdueWork,
            openIssues,
            pendingApprovals: commandQueues.pendingApprovalsOrg,
          })
        : null;

    const commercialFunnelSteps =
      activeLens === 'org' && orgData
        ? buildCommercialFunnelSteps(
            composeCommercialFunnelCounts({
              period: managementPeriod,
              opportunities: orgOpportunities,
              quotes: orgQuotes,
              orders,
            }),
          )
        : null;

    const teamRows =
      activeLens === 'team' && teamData && shouldShowManagementTeamTable(dataMode)
        ? composeTeamMetricsRows({
            period: managementPeriod,
            opportunities: teamOpportunities,
            quotes: teamQuotes,
            orders,
            overdueWork: teamData.overdueWork,
            openIssues,
            partyCountByOwner: partyCountByOwner(teamOpportunities, teamQuotes),
          })
        : null;

    const showExampleAffordance = viewerHasManagementOrgRead(roleKeys);
    const exceptionsView = isInicioExceptionsView(paramOne(params.vista));
    const homeHref =
      paramOne(params.datos) === 'demo' ? '/inicio?datos=demo' : '/inicio';

    if (exceptionsView) {
      return (
        <PageContainer label={t('pages.inicio.managementKicker')}>
          <PageHeader
            kicker={t('pages.inicio.managementKicker')}
            title={t('pages.inicio.managementTitle')}
            description="Condiciones fuera del flujo normal que ya están registradas. No incluye el trabajo del día, oportunidades ni cotizaciones abiertas."
            action={destinationLink(homeHref, 'Volver a Inicio')}
          />
          <div id="excepciones" className="min-w-0">
            <InicioManagementLens model={management} destination />
          </div>
        </PageContainer>
      );
    }

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={greeting}
          description={HERO_SUBTITLE}
          action={destinationLink('/trabajo', 'Ver mi trabajo', 'primary')}
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
          {showOwnerDemoCard ? <InicioOwnerDemoCard /> : null}
          <InicioVisualBand tone="recent" label="Resumen">
            <InicioSummaryCards cards={summaryCards} />
          </InicioVisualBand>
          <InicioVisualBand tone="mi-dia" label="Mi día">
            <InicioMiDia items={miDiaItems} />
            <ListCapNotice caps={inicioListCaps} />
          </InicioVisualBand>

          <InicioLensTabs active={activeLens} available={availableLenses} periodo={periodPreset} />

          {activeLens === 'personal' ? (
            <InicioVisualBand tone="attention" label="Centro de mando" className="space-y-8">
              <div>
                <p className="isalwa-kicker">Centro de mando</p>
                <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic leading-tight text-[var(--isalwa-kiln)] md:text-3xl">
                  Atención de hoy
                </h2>
              </div>

              {showResponsibility ? (
                <InicioVisualBand tone="commercial" label="Comercial" className="space-y-6 border-0 bg-transparent p-0 shadow-none">
                  <p className="isalwa-kicker">Comercial</p>
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
                        linkedQuotes={linkedQuotes}
                        compact
                      />
                    </PageSection>
                  ) : null}
                  {responsibilityDraft.length > 0 || responsibilitySubmitted.length > 0 ? (
                    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
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
                </InicioVisualBand>
              ) : null}

              <div id="excepciones">
                <InicioManagementLens model={management} />
              </div>

              <InicioCommandQueueSections
                model={{
                  ...commandQueues,
                  pendingApprovals: decisionesApprovals,
                }}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                approvalSubjects={commandApprovalSubjects}
              />

              {memoryChanges !== 'unauthorized' && memoryChanges !== 'unavailable' ? (
                <InicioVisualBand tone="recent" label="Qué cambió">
                  <InicioWhatChanged items={memoryChanges.items} windowLabel="Hoy" />
                </InicioVisualBand>
              ) : null}
            </InicioVisualBand>
          ) : null}

          {activeLens === 'team' && teamRows ? (
            <InicioVisualBand tone="operations" label="Equipo" className="space-y-10">
              <ManagementTeamTable rows={teamRows} memberLabels={memberLabels} />
              {insightBundle ? (
                <>
                  <ManagementInsightsPanel
                    kicker="Revisión"
                    title="Para revisar"
                    insights={buildParaRevisarInsights(insightBundle)}
                  />
                  <ManagementInsightsPanel
                    kicker="Coaching"
                    title="Oportunidades de mejora"
                    insights={buildOportunidadesDeMejora(insightBundle)}
                  />
                </>
              ) : null}
            </InicioVisualBand>
          ) : null}

          {activeLens === 'org' && orgMetricCards ? (
            <InicioVisualBand tone="commercial" label="Empresa" className="space-y-10">
              {commercialFunnelSteps ? (
                <ManagementCommercialFunnel
                  steps={commercialFunnelSteps}
                  periodLabel={formatManagementPeriodLabel(managementPeriod)}
                />
              ) : null}
              <ManagementOrgMetrics
                cards={orgMetricCards}
                period={periodPreset}
                showExampleAffordance={showExampleAffordance}
                sparseLiveData={orgMetricsSparse(orgMetricCards)}
              />
              {insightBundle ? (
                <>
                  <ManagementInsightsPanel
                    kicker="Revisión"
                    title="Para revisar"
                    insights={buildParaRevisarInsights(insightBundle)}
                  />
                  <ManagementInsightsPanel
                    kicker="Coaching"
                    title="Oportunidades de mejora"
                    insights={buildOportunidadesDeMejora(insightBundle)}
                  />
                </>
              ) : null}
              {showExampleAffordance ? (
                <div className="flex justify-end">
                  <ManagementExamplePreviewTrigger kind="team-table" />
                </div>
              ) : null}
            </InicioVisualBand>
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
