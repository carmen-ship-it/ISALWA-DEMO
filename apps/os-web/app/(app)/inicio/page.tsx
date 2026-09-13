import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AttentionList } from '@/components/work/attention-list';
import { ApprovalList } from '@/components/work/approval-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isProjectionStale } from '@/lib/query/projection-freshness';

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | 'unavailable'> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'unavailable') return 'unavailable';
    throw err;
  }
}

export default async function InicioPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const [attentionResult, workResult, approvalsResult] = await Promise.all([
      safeFetch(() => client.listAttention({ limit: 8, activeOnly: true })),
      safeFetch(() => client.listWorkItems({ status: 'open', limit: 5 })),
      safeFetch(() => client.listApprovals({ limit: 5 })),
    ]);

    if (
      attentionResult === 'unavailable' &&
      workResult === 'unavailable' &&
      approvalsResult === 'unavailable'
    ) {
      return (
        <PageContainer label={t('pages.inicio.title')}>
          <QuerySurfaceState error={{ kind: 'unavailable' }} />
        </PageContainer>
      );
    }

    const attentionItems =
      attentionResult === 'unavailable' ? [] : attentionResult.items;
    const workItems = workResult === 'unavailable' ? [] : workResult.items;
    const approvalItems =
      approvalsResult === 'unavailable' ? [] : approvalsResult.items;

    const memberLabels = await resolveMemberLabels(
      client,
      [
        ...workItems.flatMap((item) => [item.ownerMemberId, item.createdByMemberId]),
        ...approvalItems.flatMap((item) => [
          item.requestedByMemberId,
          item.approverMemberId,
        ]),
      ],
    );

    const hasAny =
      attentionItems.length + workItems.length + approvalItems.length > 0;
    const staleFreshness =
      (attentionResult !== 'unavailable' && isProjectionStale(attentionResult.freshness)) ||
      (workResult !== 'unavailable' && isProjectionStale(workResult.freshness)) ||
      (approvalsResult !== 'unavailable' && isProjectionStale(approvalsResult.freshness));

    return (
      <PageContainer label={t('pages.inicio.title')}>
        <PageHeader
          kicker={t('pages.inicio.kicker')}
          title={t('pages.inicio.title')}
          description={
            hasAny
              ? 'Revise lo que necesita su atención hoy.'
              : t('states.emptyInicioHint')
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

        {!hasAny ? (
          <EmptyState title={t('states.emptyInicio')} description={t('states.emptyInicioHint')} />
        ) : (
          <div className="space-y-6">
            <PageSection card className="p-4">
              <SectionHeader
                title={t('pages.inicio.attention')}
                action={
                  attentionItems.length > 0 ? (
                    <Link
                      href="/trabajo"
                      className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                    >
                      Ver todo el trabajo
                    </Link>
                  ) : undefined
                }
              />
              {attentionItems.length === 0 ? (
                <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                  Nada requiere atención inmediata.
                </p>
              ) : (
                <AttentionList items={attentionItems} compact />
              )}
            </PageSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <PageSection card className="p-4">
                <SectionHeader
                  title={t('pages.inicio.work')}
                  action={
                    workItems.length > 0 ? (
                      <Link
                        href="/trabajo"
                        className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Ver todo
                      </Link>
                    ) : undefined
                  }
                />
                {workItems.length === 0 ? (
                  <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                    {t('states.emptyTrabajo')}
                  </p>
                ) : (
                  <WorkList items={workItems} memberLabels={memberLabels} />
                )}
              </PageSection>

              <PageSection card className="p-4">
                <SectionHeader
                  title={t('pages.inicio.approvals')}
                  action={
                    approvalItems.length > 0 ? (
                      <Link
                        href="/aprobaciones"
                        className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Ver todas
                      </Link>
                    ) : undefined
                  }
                />
                {approvalItems.length === 0 ? (
                  <p className="px-2 text-sm text-[var(--isalwa-slate)]">
                    {t('states.emptyAprobaciones')}
                  </p>
                ) : (
                  <ApprovalList
                    items={approvalItems}
                    memberLabels={memberLabels}
                    readOnly
                  />
                )}
              </PageSection>
            </div>
          </div>
        )}
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
