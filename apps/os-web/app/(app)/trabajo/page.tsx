import { EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyHref } from '@/lib/party/navigation';
import { t } from '@/lib/i18n/es';
import { sortOpenWorkByDue } from '@/lib/work/due-order';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import Link from 'next/link';

type TrabajoPageProps = {
  searchParams: Promise<{ subjectType?: string; subjectId?: string }>;
};

export default async function TrabajoPage({ searchParams }: TrabajoPageProps) {
  const params = await searchParams;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const subjectType = params.subjectType?.trim();
  const subjectId = params.subjectId?.trim();
  const filteredByParty = subjectType === 'party' && subjectId;

  try {
    const result = await client.listWorkItems({
      status: 'open',
      limit: 50,
      ...(filteredByParty ? { subjectType, subjectId } : {}),
    });
    const items = sortOpenWorkByDue(result.items);
    const memberLabels = await resolveMemberLabels(
      client,
      items.flatMap((item) => [item.ownerMemberId, item.createdByMemberId]),
    );

    return (
      <PageContainer label={t('pages.trabajo.title')}>
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title={t('pages.trabajo.title')}
          description={
            filteredByParty
              ? 'Trabajo abierto vinculado a un cliente.'
              : items.length === 0
                ? 'Cuando tenga trabajo asignado, lo verá aquí con fecha, estado y contexto.'
                : undefined
          }
          action={
            filteredByParty ? (
              <Link href={partyHref(subjectId)} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                Ver cliente
              </Link>
            ) : undefined
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {items.length === 0 ? (
          <EmptyState
            title={t('states.emptyTrabajo')}
            description={
              filteredByParty
                ? 'No hay trabajo abierto vinculado a este cliente.'
                : 'No tienes trabajo pendiente en este momento.'
            }
            example="Un seguimiento de cliente o una tarea interna aparecerá aquí cuando exista."
          />
        ) : (
          <PageSection card className="p-2 md:p-3">
            <WorkList items={items} memberLabels={memberLabels} />
          </PageSection>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.trabajo.title')}>
        <PageHeader kicker={t('pages.trabajo.kicker')} title={t('pages.trabajo.title')} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
