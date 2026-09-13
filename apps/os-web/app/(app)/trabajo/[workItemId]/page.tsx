import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatDueDate,
  formatPriority,
  formatSubjectType,
  formatTimestamp,
  formatWorkApprovalStatus,
  formatWorkStatus,
  isWorkOverdue,
  priorityTone,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type WorkDetailPageProps = {
  params: Promise<{ workItemId: string }>;
};

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { workItemId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { work, freshness } = await client.getWorkItem(workItemId);
    const memberLabels = await resolveMemberLabels(client, [
      work.ownerMemberId,
      work.createdByMemberId,
    ]);
    const overdue = isWorkOverdue(work);
    const subject = formatSubjectType(work.subjectType);

    return (
      <PageContainer label={work.title}>
        <PageHeader
          kicker="Trabajo"
          title={work.title}
          action={
            <Link href="/trabajo">
              <Button type="button" variant="secondary">
                Volver
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusToneForWork(work.status)}>{formatWorkStatus(work.status)}</StatusPill>
            <StatusPill tone={priorityTone(work.priority)}>{formatPriority(work.priority)}</StatusPill>
            {overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
          </div>

          {work.description ? (
            <p className="mt-4 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
              {work.description}
            </p>
          ) : null}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Asignado a</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, work.ownerMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Vence</dt>
              <dd className={`mt-1 ${overdue ? 'text-[var(--isalwa-danger)]' : 'text-[var(--isalwa-kiln)]'}`}>
                {formatDueDate(work.dueAt)}
              </dd>
            </div>
            {subject ? (
              <div>
                <dt className="isalwa-section-label">Sobre</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{subject}</dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Aprobación</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatWorkApprovalStatus(work.approvalStatus)}
              </dd>
            </div>
            {work.pendingApprovalId ? (
              <div>
                <dt className="isalwa-section-label">Aprobación vinculada</dt>
                <dd className="mt-1">
                  <Link
                    href={approvalHref(work.pendingApprovalId)}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Ver solicitud
                  </Link>
                </dd>
              </div>
            ) : null}
            {work.completedAt ? (
              <div>
                <dt className="isalwa-section-label">Completado</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(work.completedAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Trabajo">
          <QuerySurfaceState error={{ kind: 'unknown', message: 'No se encontró este trabajo.' }} />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Trabajo">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
