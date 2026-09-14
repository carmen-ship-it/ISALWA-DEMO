import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { partyHref } from '@/lib/party/navigation';
import { sortOpenWorkByDue } from '@/lib/work/due-order';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

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
    const partyLabels = await resolvePartyLabels(
      client,
      items.flatMap((item) => (item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [])),
    );

    return (
      <PageContainer label={t('pages.trabajo.title')}>
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title={t('pages.trabajo.title')}
          description={
            filteredByParty
              ? 'Trabajo abierto vinculado a este cliente, en la misma cola.'
              : 'Cola de trabajo abierto, con responsable, cliente y fecha.'
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
            title="No tiene trabajo pendiente en este momento."
            description={
              filteredByParty
                ? 'Este cliente no tiene trabajo abierto en la cola. Un seguimiento registrado en su ficha aparecerá aquí.'
                : 'Esta es su cola de trabajo. Cuando registre un seguimiento en la ficha de un cliente, o se le asigne una tarea, lo verá aquí.'
            }
            example="Un seguimiento con responsable y fecha permanece aquí hasta que lo complete."
            action={
              filteredByParty ? undefined : (
                <Link href="/clientes" className="inline-flex">
                  <Button type="button" variant="primary">
                    {t('states.goToClientes')}
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <PageSection card className="p-2 md:p-3">
            <WorkList items={items} memberLabels={memberLabels} partyLabels={partyLabels} />
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
