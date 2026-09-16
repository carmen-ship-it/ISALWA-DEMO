import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, cx } from '@isalwa/ui';
import { IssueList } from '@/components/issue/issue-list';
import { ReportIssueTrigger } from '@/components/issue/report-issue-trigger';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { ISSUE_COPY } from '@/lib/issue/labels';
import { issueListHref } from '@/lib/issue/navigation';
import { resolveMemberLabels, type MemberLabelMap } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

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

function emptyMessage(view: IssueView): { title: string; description: string } {
  switch (view) {
    case 'open':
      return { title: ISSUE_COPY.emptyOpen, description: 'Cuando se reporten problemas, aparecerán aquí.' };
    case 'assigned':
      return { title: ISSUE_COPY.emptyAssigned, description: 'Las incidencias asignadas a usted aparecerán aquí.' };
    case 'reported':
      return { title: ISSUE_COPY.emptyReported, description: 'Las incidencias que usted reporte aparecerán aquí.' };
    case 'resolved':
      return { title: ISSUE_COPY.emptyResolved, description: 'Las incidencias resueltas aparecerán aquí.' };
  }
}

export default async function IncidenciasPage({ searchParams }: IncidenciasPageProps) {
  const params = await searchParams;
  const view = parseView(params.view);

  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const session = await getServerWebSession();
  const reportedByLabel = session?.displayLabel?.trim() ?? '';

  const client = createOsApiClient(auth);

  try {
    const result = await client.listIssues(viewQuery(view));
    const memberIds = result.items.flatMap((item) => [
      item.reporterMemberId,
      item.ownerMemberId,
    ].filter((id): id is string => Boolean(id)));
    const memberLabels = await resolveMemberLabels(client, memberIds);
    const empty = emptyMessage(view);

    return (
      <PageContainer label={ISSUE_COPY.listTitle}>
        <PageHeader
          kicker={ISSUE_COPY.listKicker}
          title={ISSUE_COPY.listTitle}
          description={ISSUE_COPY.listDescription}
          action={<ReportIssueTrigger reportedByLabel={reportedByLabel} variant="primary" />}
        />

        <IssueViewTabs active={view} />

        {result.items.length === 0 ? (
          <EmptyState
            title={empty.title}
            description={empty.description}
          />
        ) : (
          <>
            <PageSection card className="overflow-hidden p-0">
              <IssueList
                items={result.items}
                memberLabels={memberLabels}
                showHeader
              />
            </PageSection>
            {result.meta.hasMore && result.meta.nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={`${issueListHref(view)}${view === 'open' ? '?' : '&'}cursor=${result.meta.nextCursor}`}
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
    if (err instanceof OsApiError && err.kind === 'forbidden') {
      return (
        <PageContainer label={ISSUE_COPY.listTitle}>
          <PageHeader
            kicker={ISSUE_COPY.listKicker}
            title={ISSUE_COPY.listTitle}
          />
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label={ISSUE_COPY.listTitle}>
        <PageHeader
          kicker={ISSUE_COPY.listKicker}
          title={ISSUE_COPY.listTitle}
        />
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
