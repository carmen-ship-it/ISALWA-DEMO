import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { CompleteFollowUpForm } from '@/components/work/complete-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import {
  formatDueDate,
  formatPriority,
  formatSubjectType,
  formatTimestamp,
  formatWorkApprovalStatus,
  formatWorkStatus,
  isWorkOverdue,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isFollowUpSubjectType, FOLLOW_UP_COPY, followUpStatusLabel } from '@/lib/work/follow-up';
import { partyHref } from '@/lib/party/navigation';

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
    const customerFollowUp = work.subjectType ? isFollowUpSubjectType(work.subjectType) : false;
    const partyId = work.subjectType === 'party' ? work.subjectId : null;
    const partyLabels = partyId ? await resolvePartyLabels(client, [partyId]) : null;
    const customerName = partyId && partyLabels ? partyLabel(partyLabels, partyId) : null;
    const statusLabel = customerFollowUp ? followUpStatusLabel(work.status) : formatWorkStatus(work.status);
    const undatedOpen = work.status === 'open' && !work.dueAt;
    const completedAt = formatTimestamp(work.completedAt);

    return (
      <PageContainer label={work.title}>
        <PageHeader
          kicker={customerFollowUp ? FOLLOW_UP_COPY.section : 'Trabajo'}
          title={work.title}
          action={
            <Link href="/trabajo">
              <Button type="button" variant="secondary">
                Volver a trabajo
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusToneForWork(work.status)}>{statusLabel}</StatusPill>
            {overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
            {undatedOpen ? <StatusPill tone="neutral">Sin fecha</StatusPill> : null}
          </div>

          {work.description ? (
            <p className="mt-4 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
              {work.description}
            </p>
          ) : null}

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, work.ownerMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">{customerFollowUp ? FOLLOW_UP_COPY.due : 'Fecha'}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatDueDate(work.dueAt)}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">{FOLLOW_UP_COPY.nextAction}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{work.title}</dd>
            </div>
            {customerName && partyId ? (
              <div>
                <dt className="isalwa-section-label">Cliente</dt>
                <dd className="mt-2">
                  <Link href={partyHref(partyId)} className="text-[var(--isalwa-glaze)] hover:underline">
                    {customerName}
                  </Link>
                </dd>
              </div>
            ) : subject ? (
              <div>
                <dt className="isalwa-section-label">Sobre</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{subject}</dd>
              </div>
            ) : null}
            {work.priority !== 'normal' ? (
              <div>
                <dt className="isalwa-section-label">Prioridad</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatPriority(work.priority)}</dd>
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
            {completedAt ? (
              <div>
                <dt className="isalwa-section-label">Completado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{completedAt}</dd>
              </div>
            ) : null}
          </dl>
          {work.status === 'open' ? (
            <CompleteFollowUpForm workItemId={work.workItemId} partyId={partyId} />
          ) : null}
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
