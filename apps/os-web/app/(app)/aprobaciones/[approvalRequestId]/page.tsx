import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  approvalSubjectLabel,
  formatApprovalStatus,
  formatSubjectType,
  formatTimestamp,
  statusToneForApproval,
} from '@/lib/work/labels';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type ApprovalDetailPageProps = {
  params: Promise<{ approvalRequestId: string }>;
};

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { approvalRequestId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { approval, freshness } = await client.getApproval(approvalRequestId);
    const memberLabels = await resolveMemberLabels(client, [
      approval.requestedByMemberId,
      approval.approverMemberId,
      approval.decisionByMemberId ?? '',
    ]);
    const subject = formatSubjectType(approval.subjectType);

    return (
      <PageContainer label="Aprobación">
        <PageHeader
          kicker="Aprobaciones"
          title={approvalSubjectLabel(approval)}
          description="Vista de solo lectura — las acciones de decisión estarán disponibles en una próxima versión."
          action={
            <Link href="/aprobaciones">
              <Button type="button" variant="secondary">
                Volver
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6">
          <StatusPill tone={statusToneForApproval(approval.status)}>
            {formatApprovalStatus(approval.status)}
          </StatusPill>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Solicitado por</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, approval.requestedByMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Aprobador</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, approval.approverMemberId)}
              </dd>
            </div>
            {subject ? (
              <div>
                <dt className="isalwa-section-label">Contexto</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{subject}</dd>
              </div>
            ) : null}
            {approval.workItemId ? (
              <div>
                <dt className="isalwa-section-label">Trabajo vinculado</dt>
                <dd className="mt-1">
                  <Link
                    href={workItemHref(approval.workItemId)}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Ver trabajo
                  </Link>
                </dd>
              </div>
            ) : null}
            {approval.decidedAt ? (
              <div>
                <dt className="isalwa-section-label">Decidido</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(approval.decidedAt)}
                </dd>
              </div>
            ) : null}
            {approval.decisionReason ? (
              <div className="sm:col-span-2">
                <dt className="isalwa-section-label">Motivo</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{approval.decisionReason}</dd>
              </div>
            ) : null}
          </dl>
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Aprobación">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró esta aprobación.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Aprobación">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
