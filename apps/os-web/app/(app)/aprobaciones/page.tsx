import { EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { ApprovalList } from '@/components/work/approval-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

export default async function AprobacionesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listApprovals({ limit: 50 });
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
              ? 'Las solicitudes que requieran su revisión aparecerán aquí.'
              : 'Vista de solo lectura — las decisiones se habilitarán en una próxima versión.'
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {result.items.length === 0 ? (
          <EmptyState
            title={t('states.emptyAprobaciones')}
            description="No hay aprobaciones pendientes para usted."
            example="Cuando alguien solicite su aprobación sobre un trabajo, lo verá aquí."
          />
        ) : (
          <PageSection card className="p-2 md:p-3">
            <ApprovalList items={result.items} memberLabels={memberLabels} readOnly />
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
