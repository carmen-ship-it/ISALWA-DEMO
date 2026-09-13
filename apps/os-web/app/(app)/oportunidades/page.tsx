import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

export default async function OportunidadesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listOpportunities({ status: 'open', limit: 50 });
    const memberLabels = await resolveMemberLabels(
      client,
      result.items.map((item) => item.ownerMemberId),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      result.items.map((item) => item.partyId),
    );

    return (
      <PageContainer label={t('pages.oportunidades.title')}>
        <PageHeader
          kicker={t('pages.oportunidades.kicker')}
          title={t('pages.oportunidades.title')}
          description={
            result.items.length === 0
              ? undefined
              : t('pages.oportunidades.description')
          }
        />

        <StaleProjectionBanner freshness={result.freshness} />

        {result.items.length === 0 ? (
          <EmptyState
            title={t('states.emptyOportunidades')}
            description="Cuando exista una oportunidad abierta, la verá aquí con cliente, etapa y responsable."
            action={
              <Link href="/clientes" className="inline-flex">
                <Button type="button" variant="primary">
                  {t('states.goToClientes')}
                </Button>
              </Link>
            }
          />
        ) : (
          <PageSection card className="p-2 md:p-3">
            <OpportunityOrgList
              items={result.items}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
            />
          </PageSection>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.oportunidades.title')}>
        <PageHeader
          kicker={t('pages.oportunidades.kicker')}
          title={t('pages.oportunidades.title')}
        />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
