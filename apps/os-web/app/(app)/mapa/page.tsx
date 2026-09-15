import Link from 'next/link';
import { PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { MapExperience } from '@/components/map/map-experience';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { parseListQuery, parsePanel } from '@/lib/lists/url-state';
import { buildMapDeskViewModel, resolveMapProviderStatus } from '@/lib/map';
import { t } from '@/lib/i18n/es';
import { DATA_HEALTH_BOUNDARY, dataHealthFromSummaries } from '@/lib/party/data-health';
import { resolveMemberLabels } from '@/lib/work/member-resolver';

type MapaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MapaPage({ searchParams }: MapaPageProps) {
  const params = await searchParams;
  const listQuery = parseListQuery(params);
  const panel = parsePanel(listQuery.panel);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const result = await client.searchParties({ status: 'active', limit: 100 });
  const model = buildMapDeskViewModel(result.items, { partial: result.meta.hasMore });
  const provider = resolveMapProviderStatus();
  const issues = dataHealthFromSummaries(result.items);

  const ownerIds = result.items
    .map((item) => item.commercialOwnerMemberId)
    .filter((id): id is string => Boolean(id));
  const memberLabels =
    ownerIds.length > 0 ? await resolveMemberLabels(client, ownerIds) : undefined;

  return (
    <PageContainer
      label={t('pages.mapa.title')}
      data-page="mapa"
      data-nav-active="mapa"
      data-nav-hint="mapa"
    >
      <PageHeader
        kicker={t('pages.mapa.kicker')}
        title={t('pages.mapa.title')}
        description={t('pages.mapa.description')}
        action={
          <Link href="/clientes" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            {t('pages.mapa.clientesLink')}
          </Link>
        }
      />

      <MapExperience
        model={model}
        provider={provider}
        listQuery={listQuery}
        selectedPartyId={panel?.kind === 'party' ? panel.id : null}
        memberLabels={memberLabels}
      />

      <PageSection className="mt-8" aria-label="Salud de datos">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">{t('pages.mapa.dataHealth')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {DATA_HEALTH_BOUNDARY}
          {model.partial ? ` ${t('pages.mapa.partialNote')}` : null}
        </p>
        {!model.coverage.factsPresent ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">{t('pages.mapa.noFacts')}</p>
        ) : issues.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">{t('pages.mapa.noIssues')}</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {issues.map((issue) => (
              <li key={issue.id} className="border-t border-[var(--isalwa-mist)] pt-4">
                <StatusPill
                  tone={
                    issue.id.startsWith('shared-provenance') || issue.id.startsWith('shared-phone')
                      ? 'manual'
                      : 'warning'
                  }
                >
                  {issue.title}
                </StatusPill>
                <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">{issue.what}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.why}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.action}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.boundary}</p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </PageContainer>
  );
}
