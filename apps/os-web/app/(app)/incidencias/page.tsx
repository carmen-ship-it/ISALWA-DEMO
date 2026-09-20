import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, StatGroup, StatusPill, cx } from '@isalwa/ui';
import { IncidenciasDeskPanel } from '@/components/issue/incidencias-desk-panel';
import { ReportIssueTrigger } from '@/components/issue/report-issue-trigger';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { ISSUE_COPY } from '@/lib/issue/labels';
import { issueListHref } from '@/lib/issue/navigation';
import { cursorPageLinks } from '@/lib/lists/url-state';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { filterByDemoDataMode } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import type { IssueListItem } from '@/lib/issue/types';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  evaluationAllowsDesk,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import { filterIssuesForEvaluation } from '@/lib/inicio/filter-for-evaluation';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

const PAGE_LIMIT = 25;

type IssueView = 'open' | 'assigned' | 'reported' | 'resolved';

type IncidenciasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const tabClass =
  'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function parseView(raw: string | string[] | undefined): IssueView {
  if (raw === 'assigned' || raw === 'reported' || raw === 'resolved') return raw;
  return 'open';
}

function viewQuery(view: IssueView): Record<string, string | number | boolean> {
  switch (view) {
    case 'open':
      return { status: 'open', limit: PAGE_LIMIT };
    case 'assigned':
      return { assignedToMe: true, limit: PAGE_LIMIT };
    case 'reported':
      return { reportedByMe: true, limit: PAGE_LIMIT };
    case 'resolved':
      return { status: 'resolved', limit: PAGE_LIMIT };
  }
}

function isDemoIssue(item: IssueListItem): boolean {
  return /\bDEMO\b|\[is_demo\]/i.test(`${item.title ?? ''} ${item.description ?? ''}`);
}

type IncidenciasEmpty = {
  title: string;
  description: string;
  example?: string;
  showReportAction?: boolean;
};

function emptyMessage(view: IssueView): IncidenciasEmpty {
  switch (view) {
    case 'open':
      return {
        title: ISSUE_COPY.emptyOpen,
        description:
          'Nadie ha reportado un problema que siga abierto. Esta lista es el punto de partida para investigar.',
        example:
          'Un retraso de entrega o un error en un pedido reportado desde Trabajo o un cliente aparece aquí con su estado.',
        showReportAction: true,
      };
    case 'assigned':
      return {
        title: ISSUE_COPY.emptyAssigned,
        description:
          'Aún no tiene incidencias asignadas a su nombre. Cuando alguien le pida resolver un caso, lo verá aquí.',
        example:
          'Un caso en progreso muestra responsable, contexto y diario — sin inventar un SLA ni una resolución automática.',
      };
    case 'reported':
      return {
        title: ISSUE_COPY.emptyReported,
        description:
          'Todavía no ha reportado problemas. Use el botón de arriba cuando algo impida cumplir o entregar.',
        example: ISSUE_COPY.descriptionPlaceholder,
        showReportAction: true,
      };
    case 'resolved':
      return {
        title: ISSUE_COPY.emptyResolved,
        description:
          'No hay incidencias cerradas en esta vista. Las resueltas conservan causa, resolución y resultado.',
        example: 'Un caso resuelto muestra cuándo se cerró y qué se hizo para corregirlo.',
      };
  }
}

export default async function IncidenciasPage({ searchParams }: IncidenciasPageProps) {
  const params = await searchParams;
  const view = parseView(params.view);
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined;
  const trail = typeof params.trail === 'string' ? params.trail : undefined;
  const dataMode = await resolveDemoDataMode(params);

  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const session = await getServerWebSession();
  const reportedByLabel = session?.displayLabel?.trim() ?? '';

  const client = createOsApiClient(auth);
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'incidencias')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel={ISSUE_COPY.listTitle} />;
  }

  try {
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

    const applyEvaluationIssues = (rows: IssueListItem[]) =>
      filterIssuesForEvaluation(evaluation, rows, allowedPartyIds);

    const [result, openPage, assignedPage, resolvedPage] = await Promise.all([
      client.listIssues({ ...viewQuery(view), ...(cursor ? { cursor } : {}) }),
      client.listIssues({ status: 'open', limit: PAGE_LIMIT }),
      client.listIssues({ assignedToMe: true, limit: PAGE_LIMIT }),
      client.listIssues({ status: 'resolved', limit: PAGE_LIMIT }),
    ]);
    const items = filterByDemoDataMode(applyEvaluationIssues(result.items), dataMode, isDemoIssue).filter(
      (item) => !isEngineeringFixtureCopy(item.title) && !isEngineeringFixtureCopy(item.description),
    );
    const openCount = filterByDemoDataMode(
      applyEvaluationIssues(openPage.items ?? []),
      dataMode,
      isDemoIssue,
    ).length;
    const assignedCount = filterByDemoDataMode(
      applyEvaluationIssues(assignedPage.items ?? []),
      dataMode,
      isDemoIssue,
    ).length;
    const resolvedCount = filterByDemoDataMode(
      applyEvaluationIssues(resolvedPage.items ?? []),
      dataMode,
      isDemoIssue,
    ).length;
    const memberIds = items.flatMap((item) =>
      [item.reporterMemberId, item.ownerMemberId].filter((id): id is string => Boolean(id)),
    );
    const memberLabels = await resolveMemberLabels(client, memberIds);
    const empty = emptyMessage(view);

    return (
      <PageContainer label={ISSUE_COPY.listTitle}>
        <PageHeader
          kicker={ISSUE_COPY.listKicker}
          title={ISSUE_COPY.listTitle}
          description={ISSUE_COPY.listDescription}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {openCount > 0 ? (
                <StatusPill tone="warning">
                  {openCount === 1 ? '1 abierta' : `${openCount} abiertas`}
                </StatusPill>
              ) : null}
              <ReportIssueTrigger reportedByLabel={reportedByLabel} variant="primary" />
            </div>
          }
        />

        <StatGroup
          className="mb-3"
          items={[
            { label: 'Abiertas', value: String(openCount) },
            { label: 'Asignadas a mí', value: String(assignedCount) },
            { label: 'Resueltas', value: String(resolvedCount) },
          ]}
        />

        <IssueViewTabs active={view} />

        {items.length === 0 ? (
          <EmptyState
            title={empty.title}
            description={empty.description}
            example={empty.example}
            action={
              empty.showReportAction ? (
                <ReportIssueTrigger reportedByLabel={reportedByLabel} variant="secondary" />
              ) : undefined
            }
          />
        ) : (
          <>
            <PageSection
              card
              className="overflow-hidden border-[color-mix(in_srgb,var(--isalwa-glaze)_12%,var(--isalwa-mist))] p-3 shadow-[var(--isalwa-shadow-resting)] md:p-4"
            >
              <IncidenciasDeskPanel items={items} memberLabels={memberLabels} />
            </PageSection>
            {(() => {
              const nav = cursorPageLinks(
                '/incidencias',
                { view: view === 'open' ? undefined : view, cursor, trail },
                result.meta.nextCursor,
                Boolean(result.meta.hasMore),
              );
              return nav.prevHref || nav.nextHref ? (
                <ListPageNav
                  from={0}
                  to={items.length}
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
    if (err instanceof OsApiError && err.kind === 'forbidden') {
      return (
        <PageContainer label={ISSUE_COPY.listTitle}>
          <PageHeader kicker={ISSUE_COPY.listKicker} title={ISSUE_COPY.listTitle} />
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label={ISSUE_COPY.listTitle}>
        <PageHeader kicker={ISSUE_COPY.listKicker} title={ISSUE_COPY.listTitle} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

function IssueViewTabs({ active }: { active: IssueView }) {
  const tabs: Array<{ id: IssueView; label: string }> = [
    { id: 'open', label: ISSUE_COPY.tabOpen },
    { id: 'assigned', label: ISSUE_COPY.tabAssigned },
    { id: 'reported', label: ISSUE_COPY.tabReported },
    { id: 'resolved', label: ISSUE_COPY.tabResolved },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Vista de incidencias">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={issueListHref(tab.id === 'open' ? undefined : tab.id)}
            role="tab"
            aria-selected={selected}
            className={cx(
              tabClass,
              selected
                ? 'border-[var(--isalwa-kiln)] bg-white text-[var(--isalwa-kiln)]'
                : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
