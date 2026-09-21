import Link from 'next/link';
import { Button, PageContainer, PageSection, SectionHeader, StatusPill, Timeline, EmptyState } from '@isalwa/ui';
import type { TimelineItem } from '@isalwa/ui';
import { ISSUE_MANAGE_SCOPE, hasAssignedOperationsScope } from '@isalwa/os-contracts';
import { PageHeader } from '@/components/shell/page-header';
import { AssignIssueOwnerForm } from '@/components/issue/assign-issue-owner-form';
import { ResolveIssueForm } from '@/components/issue/resolve-issue-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  ISSUE_COPY,
  formatIssueStatus,
  formatJournalType,
  formatReferenceType,
  formatRelationType,
  statusToneForIssue,
} from '@/lib/issue/labels';
import { ListPageNav } from '@/components/lists/list-page-nav';
import {
  issueListReturnHref,
  journalPageLinks,
  journalRequestQuery,
  journalSurface,
  parseIssueListReturn,
  parseJournalCursor,
  parseJournalTrail,
} from '@/lib/issue/journal-page';
import { issueHref } from '@/lib/issue/navigation';
import { resolveMemberLabels, memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import type { IssueDetail, IssueJournalEntry, IssueReference, IssueRelation } from '@/lib/issue/types';
import { AiAssistShell } from '@/components/ai/ai-assist-shell';

type IssueDetailPageProps = {
  params: Promise<{ issueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function issueTitle(issue: IssueDetail): string {
  if (issue.title?.trim()) return issue.title.trim();
  const desc = issue.description.trim();
  return desc.length > 80 ? `${desc.slice(0, 77)}…` : desc;
}

function journalToTimeline(
  entries: IssueJournalEntry[],
  memberLabels: MemberLabelMap,
): TimelineItem[] {
  return entries.map((entry) => ({
    id: entry.entryId,
    label: formatJournalType(entry.entryType),
    meta: `${memberLabel(memberLabels, entry.createdByMemberId)} · ${formatTimestamp(entry.createdAt)}`,
    body: entry.content,
  }));
}

function ReferenceList({ references }: { references: IssueReference[] }) {
  if (references.length === 0) return null;

  return (
    <ul className="space-y-2">
      {references.map((ref, idx) => (
        <li key={`${ref.referenceType}-${ref.referenceId}-${idx}`}>
          <span className="text-[var(--isalwa-slate)]">{formatReferenceType(ref.referenceType)}</span>
          {ref.label ? (
            <span className="ml-2 text-[var(--isalwa-kiln)]">{ref.label}</span>
          ) : (
            <span className="ml-2 text-[var(--isalwa-slate)]">{ref.referenceId}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function RelatedIssuesList({ relations }: { relations: IssueRelation[] }) {
  if (relations.length === 0) return null;

  return (
    <ul className="space-y-2">
      {relations.map((rel, idx) => (
        <li key={`${rel.relationType}-${rel.relatedIssueId}-${idx}`}>
          <span className="text-[var(--isalwa-slate)]">{formatRelationType(rel.relationType)}:</span>
          <Link
            href={issueHref(rel.relatedIssueId)}
            className="ml-2 text-[var(--isalwa-glaze)] hover:underline"
          >
            Ver incidencia
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LinkedWorkList({ workItemIds }: { workItemIds: string[] }) {
  if (workItemIds.length === 0) return null;

  return (
    <ul className="space-y-2">
      {workItemIds.map((id) => (
        <li key={id}>
          <Link href={workItemHref(id)} className="text-[var(--isalwa-glaze)] hover:underline">
            Ver trabajo
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function IssueDetailPage({ params, searchParams }: IssueDetailPageProps) {
  const { issueId } = await params;
  const query = await searchParams;
  const listReturn = parseIssueListReturn(query);
  const journalCursor = parseJournalCursor(query);
  const journalTrail = parseJournalTrail(query);
  const volverHref = issueListReturnHref(listReturn);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const issuePack = await client.getIssue(issueId, journalRequestQuery(journalCursor));
    const issue = issuePack.issue;
    const journalMeta = issuePack.journalMeta;
    const memberIds = [
      issue.reporterMemberId,
      issue.ownerMemberId,
      ...issue.journal.map((e) => e.createdByMemberId),
    ].filter((id): id is string => Boolean(id));
    const memberLabels = await resolveMemberLabels(client, memberIds);

    const evaluation = await getEvaluationProjection();
    const capabilities = await loadMemberCapabilities();
    let grantedScopes = capabilities?.grantedScopes ?? [];
    if (grantedScopes.length === 0) {
      grantedScopes = await loadActorRoleKeys(client);
    }
    const canAssignOwner = hasAssignedOperationsScope(grantedScopes, ISSUE_MANAGE_SCOPE);
    const memberId = capabilities?.memberId ?? null;
    const isTerminalStatus = issue.status === 'resolved' || issue.status === 'closed';
    const canResolve =
      !evaluation.active &&
      !isTerminalStatus &&
      (canAssignOwner || Boolean(issue.ownerMemberId && memberId && issue.ownerMemberId === memberId));
    const ownerName = issue.ownerMemberId
      ? memberLabel(memberLabels, issue.ownerMemberId)
      : null;

    const possibleCauses = issue.journal.filter((e) => e.entryType === 'possible_cause');
    const otherJournal = issue.journal.filter((e) => e.entryType !== 'possible_cause');

    return (
      <PageContainer label={issueTitle(issue)}>
        <PageHeader
          kicker={ISSUE_COPY.detailKicker}
          title={issueTitle(issue)}
          description="Estado del ciclo de vida, contexto reportado e investigación — sin mezclar con aprobaciones comerciales."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={statusToneForIssue(issue.status)}>
                {formatIssueStatus(issue.status)}
              </StatusPill>
              <Link href={volverHref}>
                <Button type="button" variant="secondary">
                  Volver a incidencias
                </Button>
              </Link>
            </div>
          }
        />

        {canResolve ? (
          <PageSection card className="p-6 md:p-8" data-section-tone="attention">
            <SectionHeader kicker="Acción" title={ISSUE_COPY.resolveIssue} />
            <ResolveIssueForm issueId={issue.issueId} expectedVersion={issue.version} />
          </PageSection>
        ) : null}

        {/* Status and key dates */}
        <PageSection card className="p-6 md:p-8">
          <SectionHeader kicker="Reporte" title={ISSUE_COPY.whatHappened} />

          <p className="mt-4 whitespace-pre-wrap text-[var(--isalwa-kiln)]">{issue.description}</p>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            {/* Reporter */}
            <div>
              <dt className="isalwa-section-label">{ISSUE_COPY.reporter}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, issue.reporterMemberId)}
              </dd>
            </div>

            {/* Date reported */}
            <div>
              <dt className="isalwa-section-label">{ISSUE_COPY.dateLabel}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {formatTimestamp(issue.createdAt)}
              </dd>
            </div>

            {/* Owner */}
            <div>
              <dt className="isalwa-section-label">{ISSUE_COPY.owner}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {ownerName ?? ISSUE_COPY.noOwner}
              </dd>
              {canAssignOwner ? (
                <AssignIssueOwnerForm
                  issueId={issue.issueId}
                  expectedVersion={issue.version}
                  currentOwnerMemberId={issue.ownerMemberId}
                  currentOwnerLabel={ownerName}
                />
              ) : null}
            </div>

            {/* Context references */}
            {issue.references.length > 0 ? (
              <div>
                <dt className="isalwa-section-label">{ISSUE_COPY.contextLabel}</dt>
                <dd className="mt-2">
                  <ReferenceList references={issue.references} />
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        {/* Investigation section */}
        <PageSection card className="mt-6 p-6 md:p-8" data-section-tone="context">
          <SectionHeader kicker="Ciclo de vida" title={ISSUE_COPY.investigation} />

          {/* Possible causes */}
          {possibleCauses.length > 0 ? (
            <div className="mb-6">
              <h3 className="isalwa-section-label mb-3">{ISSUE_COPY.possibleCauses}</h3>
              <ul className="space-y-3">
                {possibleCauses.map((entry) => (
                  <li
                    key={entry.entryId}
                    className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-3"
                  >
                    <p className="text-[var(--isalwa-kiln)]">{entry.content}</p>
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {memberLabel(memberLabels, entry.createdByMemberId)} · {formatTimestamp(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Confirmed cause */}
          <div className="mb-6">
            <h3 className="isalwa-section-label mb-2">{ISSUE_COPY.cause}</h3>
            <p className="text-[var(--isalwa-kiln)]">
              {issue.confirmedCause ?? ISSUE_COPY.noCause}
            </p>
          </div>

          {/* Journal timeline */}
          <div>
            <h3 className="isalwa-section-label mb-3">Diario de investigación</h3>
            {otherJournal.length > 0 ? (
              <Timeline items={journalToTimeline(otherJournal, memberLabels)} />
            ) : journalSurface(issue.journal.length, journalCursor) === 'stale' ? (
              <p className="text-sm text-[var(--isalwa-slate)]" role="status">
                Esta continuación del diario ya no tiene entradas. Vuelva a la página anterior.
              </p>
            ) : possibleCauses.length === 0 ? (
              <EmptyState
                title="Sin entradas de investigación"
                description="Todavía nadie documentó observaciones ni intentos en el diario."
                example="Registre observaciones, intentos y referencias a evidencia mientras avanza el caso."
              />
            ) : null}
            {(() => {
              const nav = journalPageLinks({
                issueId,
                journalCursor,
                journalTrail,
                nextCursor: journalMeta?.nextCursor,
                hasMore: Boolean(journalMeta?.hasMore),
                list: listReturn,
              });
              return (
                <ListPageNav
                  from={issue.journal.length > 0 ? 1 : 0}
                  to={issue.journal.length}
                  total={null}
                  page={1}
                  pageCount={null}
                  prevHref={nav.prevHref}
                  nextHref={nav.nextHref}
                />
              );
            })()}
          </div>
        </PageSection>

        {/* Resolution section */}
        <PageSection card className="mt-6 p-6 md:p-8">
          <SectionHeader kicker="Cierre" title={ISSUE_COPY.resolution} />

          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">{ISSUE_COPY.resolution}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {issue.resolution ?? ISSUE_COPY.noResolution}
              </dd>
            </div>

            <div>
              <dt className="isalwa-section-label">{ISSUE_COPY.outcome}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {issue.outcome ?? ISSUE_COPY.noOutcome}
              </dd>
            </div>

            {issue.resolvedAt ? (
              <div>
                <dt className="isalwa-section-label">Resuelto</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">
                  {formatDate(issue.resolvedAt)}
                </dd>
              </div>
            ) : null}

            {issue.closedAt ? (
              <div>
                <dt className="isalwa-section-label">Cerrado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">
                  {formatDate(issue.closedAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        {/* Linked work */}
        {issue.linkedWorkItems.length > 0 ? (
          <PageSection card className="mt-6 p-6 md:p-8">
            <SectionHeader title={ISSUE_COPY.linkedWork} />
            <LinkedWorkList workItemIds={issue.linkedWorkItems} />
          </PageSection>
        ) : null}

        {/* Related issues */}
        {issue.relations.length > 0 ? (
          <PageSection card className="mt-6 p-6 md:p-8">
            <SectionHeader title={ISSUE_COPY.relatedIssues} />
            <RelatedIssuesList relations={issue.relations} />
          </PageSection>
        ) : null}

        <div className="mt-6">
          <AiAssistShell
            title="Ayuda con esta incidencia"
            feature="ask"
            subjectType="issue"
            subjectId={issueId}
            surface="issue"
            promptLabel="Preguntar sobre esta incidencia"
          />
        </div>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Incidencia">
          <PageHeader
            kicker={ISSUE_COPY.detailKicker}
            title="Incidencia no encontrada"
            action={
              <Link href={volverHref}>
                <Button type="button" variant="secondary">
                  Volver a incidencias
                </Button>
              </Link>
            }
          />
          <EmptyState
            title="No se encontró esta incidencia"
            description="La incidencia solicitada no existe o no está disponible."
          />
        </PageContainer>
      );
    }
    if (err instanceof OsApiError && err.kind === 'forbidden') {
      return (
        <PageContainer label="Incidencia">
          <PageHeader
            kicker={ISSUE_COPY.detailKicker}
            title="Incidencia"
          />
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Incidencia">
        <PageHeader
          kicker={ISSUE_COPY.detailKicker}
          title="Incidencia"
        />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
