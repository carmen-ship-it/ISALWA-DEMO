import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';
import {
  formatApprovalStatus,
  formatTimestamp,
  statusToneForApproval,
} from '@/lib/work/labels';
import { resolveApprovalSubjects } from '@/lib/work/resolve-staff-subjects';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

const accentLinkClass =
  'isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export default async function AprobacionesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listApprovals({ limit: 50 });
    const subjects = await resolveApprovalSubjects(client, result.items);
    const memberLabels = await resolveMemberLabels(
      client,
      result.items.flatMap((item) => [
        item.requestedByMemberId,
        item.approverMemberId,
        item.decisionByMemberId ?? '',
      ]),
    );

    return (
      <PageContainer label={t('pages.aprobaciones.title')}>
        <PageHeader
          kicker={t('pages.aprobaciones.kicker')}
          title={t('pages.aprobaciones.title')}
          description={
            result.items.length === 0
              ? undefined
              : 'Solicitudes pendientes de su decisión. La decisión no crea un pedido.'
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {result.items.filter((approval) => (subjects.get(approval.approvalRequestId) ?? '').trim()).length === 0 ? (
          <EmptyState
            title={t('states.emptyAprobaciones')}
            description="Cuando alguien solicite su aprobación, la verá aquí para decidir."
          />
        ) : (
          <PageSection card className="bg-white p-2 md:p-4">
            <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Bandeja de aprobaciones">
              {result.items.filter((approval) => (subjects.get(approval.approvalRequestId) ?? '').trim()).map((approval) => {
                const decidedAt = formatTimestamp(approval.decidedAt);
                const subject =
                  subjects.get(approval.approvalRequestId) ?? 'Solicitud de aprobación';
                return (
                  <ListRow key={approval.approvalRequestId} as="li" className="px-1 py-2">
                    <div className="bg-white px-4 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--isalwa-kiln)]">{subject}</p>
                          <dl className="mt-4 grid gap-2 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                            <div>
                              <dt className="sr-only">Solicitado por</dt>
                              <dd>
                                Solicitado por {memberLabel(memberLabels, approval.requestedByMemberId)}
                              </dd>
                            </div>
                            {decidedAt ? (
                              <div>
                                <dt className="sr-only">Decisión</dt>
                                <dd>Decidida: {decidedAt}</dd>
                              </div>
                            ) : null}
                          </dl>
                          {approval.decisionReason ? (
                            <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                              {approval.decisionReason}
                            </p>
                          ) : null}
                          <Link href={approvalHref(approval.approvalRequestId)} className={`mt-5 inline-flex ${accentLinkClass}`}>
                            Revisar
                          </Link>
                        </div>
                        <StatusPill tone={statusToneForApproval(approval.status)}>
                          {formatApprovalStatus(approval.status)}
                        </StatusPill>
                      </div>
                    </div>
                  </ListRow>
                );
              })}
            </ul>
          </PageSection>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.aprobaciones.title')}>
        <PageHeader kicker={t('pages.aprobaciones.kicker')} title={t('pages.aprobaciones.title')} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
