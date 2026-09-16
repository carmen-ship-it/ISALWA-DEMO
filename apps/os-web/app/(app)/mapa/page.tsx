import Link from 'next/link';
import { PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import type { MapConfirmedMarker } from '@/components/map/map-live-canvas';
import { MapExperience } from '@/components/map/map-experience';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { parseListQuery, parsePanel } from '@/lib/lists/url-state';
import { buildMapDeskViewModel } from '@/lib/map';
import {
  buildMapCommercialPortfolio,
  buildMapPartyCommercialSnapshot,
} from '@/lib/map/commercial-lens';
import {
  readMapProviderEnv,
  resolveMapProviderStatus,
  resolveMapViewConfig,
} from '@/lib/map/provider-status';
import { t } from '@/lib/i18n/es';
import type { LocationView } from '@/lib/party/types';
import { DATA_HEALTH_BOUNDARY, dataHealthFromSummaries } from '@/lib/party/data-health';
import { resolveMemberLabels } from '@/lib/work/member-resolver';

type MapaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function locationHasConfirmedCoordinates(location: LocationView): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude !== null &&
    location.longitude !== null
  );
}

function pickConfirmedLocation(locations: LocationView[]): LocationView | null {
  const active = locations.find((loc) => loc.status === 'active' && locationHasConfirmedCoordinates(loc));
  if (active) return active;
  return locations.find((loc) => locationHasConfirmedCoordinates(loc)) ?? null;
}

async function loadConfirmedMarkers(
  client: ReturnType<typeof createOsApiClient>,
  plottablePartyIds: readonly { partyId: string; displayName: string }[],
): Promise<MapConfirmedMarker[]> {
  if (plottablePartyIds.length === 0) return [];

  const settled = await Promise.all(
    plottablePartyIds.map(async (row) => {
      try {
        const response = await client.listPartyLocations(row.partyId);
        const location = pickConfirmedLocation(response.locations);
        if (!location?.latitude || !location?.longitude) return null;
        return {
          partyId: row.partyId,
          displayName: row.displayName,
          lat: location.latitude,
          lng: location.longitude,
        } satisfies MapConfirmedMarker;
      } catch {
        return null;
      }
    }),
  );

  return settled.filter((marker): marker is MapConfirmedMarker => marker !== null);
}

async function loadCommercialLens(client: ReturnType<typeof createOsApiClient>) {
  try {
    const [opportunities, quotes, orders] = await Promise.all([
      client.listOpportunities({ limit: 100 }).catch(() => ({ items: [], meta: { hasMore: false } })),
      client.listQuotes({ limit: 100 }).catch(() => ({ items: [], meta: { hasMore: false } })),
      client.listOrders({ limit: 100 }).catch(() => ({ items: [], meta: { hasMore: false } })),
    ]);
    return {
      opportunities: opportunities.items ?? [],
      quotes: quotes.items ?? [],
      orders: orders.items ?? [],
      partial: Boolean(
        opportunities.meta?.hasMore || quotes.meta?.hasMore || orders.meta?.hasMore,
      ),
    };
  } catch {
    return { opportunities: [], quotes: [], orders: [], partial: false };
  }
}

export default async function MapaPage({ searchParams }: MapaPageProps) {
  const params = await searchParams;
  const listQuery = parseListQuery(params);
  const panel = parsePanel(listQuery.panel);
  const selectedPartyId = panel?.kind === 'party' ? panel.id : null;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const result = await client.searchParties({ status: 'active', limit: 100 });
  const model = buildMapDeskViewModel(result.items, { partial: result.meta.hasMore });
  const mapEnv = readMapProviderEnv();
  const provider = resolveMapProviderStatus(mapEnv);
  const viewConfig = resolveMapViewConfig(mapEnv);
  const [markers, commercialInput] = await Promise.all([
    provider.kind === 'live'
      ? loadConfirmedMarkers(
          client,
          model.plottable.map((row) => ({ partyId: row.partyId, displayName: row.displayName })),
        )
      : Promise.resolve([] as MapConfirmedMarker[]),
    loadCommercialLens(client),
  ]);
  const portfolio = buildMapCommercialPortfolio(commercialInput);
  const selectedCommercial = selectedPartyId
    ? buildMapPartyCommercialSnapshot(selectedPartyId, commercialInput)
    : null;
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
        viewConfig={viewConfig}
        markers={markers}
        listQuery={listQuery}
        selectedPartyId={selectedPartyId}
        memberLabels={memberLabels}
        portfolio={portfolio}
        selectedCommercial={selectedCommercial}
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
