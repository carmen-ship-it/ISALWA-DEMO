import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, cx } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  cotizacionesHref,
  parseQuoteListStatus,
  quoteStatusFilterOptions,
} from '@/lib/commercial/list-filters';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type CotizacionesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function CotizacionesPage({ searchParams }: CotizacionesPageProps) {
  const params = await searchParams;
  const status = parseQuoteListStatus(params.status);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listQuotes({ status, limit: 50 });
    const memberLabels = await resolveMemberLabels(
      client,
      result.items.map((item) => item.ownerMemberId),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      result.items.map((item) => item.partyId),
    );
    const filters = quoteStatusFilterOptions(status);

    return (
      <PageContainer label={t('pages.cotizaciones.title')}>
        <PageHeader
          kicker={t('pages.cotizaciones.kicker')}
          title={t('pages.cotizaciones.title')}
          description={
            result.items.length === 0 ? undefined : t('pages.cotizaciones.description')
          }
        />

        <div
          className="mb-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtro de cotizaciones"
        >
          {filters.map((filter) => {
            const active = filter.status === status;
            return (
              <Link
                key={filter.status}
                href={cotizacionesHref(filter.status)}
                role="tab"
                aria-selected={active}
                className={cx(
                  'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                  active
                    ? 'border-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] text-[var(--isalwa-glaze-deep)]'
                    : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <StaleProjectionBanner freshness={result.freshness} />

        {result.items.length === 0 ? (
          <EmptyState
            title={t('states.emptyCotizaciones')}
            description={
              status === 'draft'
                ? 'No hay cotizaciones en borrador.'
                : 'No hay cotizaciones enviadas.'
            }
            action={
              <div className="flex flex-wrap gap-3">
                <Link href="/clientes" className="inline-flex">
                  <Button type="button" variant="primary">
                    {t('states.goToClientes')}
                  </Button>
                </Link>
                <Link href="/oportunidades" className="inline-flex">
                  <Button type="button" variant="secondary">
                    {t('states.viewOpportunities')}
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <PageSection card className="p-2 md:p-3">
            <QuoteOrgList
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
      <PageContainer label={t('pages.cotizaciones.title')}>
        <PageHeader
          kicker={t('pages.cotizaciones.kicker')}
          title={t('pages.cotizaciones.title')}
        />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
