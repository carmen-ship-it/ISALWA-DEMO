'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MapViewConfig } from '@isalwa/providers';
import { Chip, SearchField, StatusPill } from '@isalwa/ui';
import { MapCanvasFallback } from '@/components/map/map-canvas-fallback';
import { MapConfirmedMarker, MapLiveCanvas } from '@/components/map/map-live-canvas';
import { MapCoverageBanner } from '@/components/map/map-coverage-banner';
import { MapCustomerLists } from '@/components/map/map-customer-lists';
import { MapLayerControls } from '@/components/map/map-layer-controls';
import { MapPartyDrawer } from '@/components/map/map-party-drawer';
import { MapQuickViewCompact } from '@/components/map/map-quick-view-compact';
import type { MapDeskViewModel } from '@/lib/map/build-view-model';
import {
  MAP_COMMERCIAL_VALUE_DISCLAIMER,
  type MapCommercialPortfolio,
  type MapPartyCommercialSnapshot,
} from '@/lib/map/commercial-lens';
import type { MapHoverSnapshot } from '@/lib/map/hover-model';
import { DEFAULT_MAP_LAYER, type MapLayerId } from '@/lib/map/layers';
import {
  MAP_LAYER_LEGEND,
  MAP_MARKER_RADIUS_CLIENT,
  MAP_VALUE_DISCLAIMER_SHORT,
  attentionCircleColor,
  attentionIntensity,
  scaleMarkerRadius,
} from '@/lib/map/marker-scale';
import { isLiveMapProvider, type MapProviderStatus } from '@/lib/map/provider-status';
import { hrefWithoutPanel, panelHref, type ListQueryState } from '@/lib/lists/url-state';

type MapExperienceProps = {
  model: MapDeskViewModel;
  provider: MapProviderStatus;
  viewConfig: MapViewConfig | null;
  markers: readonly MapConfirmedMarker[];
  listQuery: ListQueryState;
  selectedPartyId: string | null;
  memberLabels?: ReadonlyMap<string, string>;
  portfolio: MapCommercialPortfolio;
  selectedCommercial: MapPartyCommercialSnapshot | null;
  /** Plain record — serializable across the server→client boundary. */
  hoverByPartyId: Readonly<Record<string, MapHoverSnapshot>>;
  attentionPartyIds: readonly string[];
  selectedNextAction?: string | null;
  selectedIssueCount?: number | null;
  selectedLastUpdatedIso?: string | null;
  /** Datos reales | Demo — drives boundary attribute; filtering happens server-side. */
  dataMode?: 'real' | 'demo';
};

type MobilePane = 'map' | 'list';

function partyFilterForLayer(
  layer: MapLayerId,
  portfolio: MapCommercialPortfolio,
  attentionPartyIds: readonly string[],
): ReadonlySet<string> | null {
  if (layer === 'oportunidades') return portfolio.partyIdsWithOpportunities;
  if (layer === 'cotizaciones') return portfolio.partyIdsWithQuotes;
  if (layer === 'pedidos') return portfolio.partyIdsWithOrders;
  if (layer === 'atencion') return new Set(attentionPartyIds);
  return null;
}

function enrichMarkersForLayer(
  markers: readonly MapConfirmedMarker[],
  layer: MapLayerId,
  hoverByPartyId: Readonly<Record<string, MapHoverSnapshot>>,
): MapConfirmedMarker[] {
  if (layer === 'clientes') {
    return markers.map((m) => ({
      ...m,
      radiusPx: MAP_MARKER_RADIUS_CLIENT,
      color: '#3d5c58',
    }));
  }

  const valueKey =
    layer === 'oportunidades'
      ? ('opportunityValueCentavos' as const)
      : layer === 'cotizaciones'
        ? ('quotedValueCentavos' as const)
        : layer === 'pedidos'
          ? ('orderValueCentavos' as const)
          : null;

  if (valueKey) {
    const values = markers.map((m) => hoverByPartyId[m.partyId]?.[valueKey] ?? null);
    const visible = values.filter((v): v is number => v != null && v > 0);
    return markers.map((m, i) => ({
      ...m,
      radiusPx: scaleMarkerRadius(values[i], visible),
      color: '#3d5c58',
    }));
  }

  if (layer === 'atencion') {
    const counts = markers.map((m) => hoverByPartyId[m.partyId]?.attentionCount ?? 0);
    return markers.map((m, i) => {
      const count = counts[i] ?? 0;
      const intensity = attentionIntensity(count, counts);
      return {
        ...m,
        radiusPx: scaleMarkerRadius(count > 0 ? count : null, counts.filter((c) => c > 0)),
        color: attentionCircleColor(intensity),
      };
    });
  }

  return markers.map((m) => ({ ...m, radiusPx: MAP_MARKER_RADIUS_CLIENT, color: '#3d5c58' }));
}

export function MapExperience({
  model,
  provider,
  viewConfig,
  markers,
  listQuery,
  selectedPartyId,
  memberLabels,
  portfolio,
  selectedCommercial,
  hoverByPartyId,
  attentionPartyIds,
  selectedNextAction = null,
  selectedIssueCount = null,
  selectedLastUpdatedIso = null,
  dataMode = 'real',
}: MapExperienceProps) {
  const router = useRouter();
  const [layer, setLayer] = useState<MapLayerId>(DEFAULT_MAP_LAYER);
  const [mobilePane, setMobilePane] = useState<MobilePane>(selectedPartyId ? 'list' : 'map');
  const [query, setQuery] = useState(listQuery.q ?? '');

  const layerPartyIds = useMemo(
    () => partyFilterForLayer(layer, portfolio, attentionPartyIds),
    [layer, portfolio, attentionPartyIds],
  );

  const filteredModel = useMemo(() => {
    if (!layerPartyIds) return model;
    const keep = (row: { partyId: string }) => layerPartyIds.has(row.partyId);
    return {
      ...model,
      plottable: model.plottable.filter(keep),
      provenanceOnly: model.provenanceOnly.filter(keep),
      noLocation: model.noLocation.filter(keep),
      all: model.all.filter(keep),
    };
  }, [model, layerPartyIds]);

  const filteredMarkers = useMemo(() => {
    const base = !layerPartyIds
      ? markers
      : markers.filter((marker) => layerPartyIds.has(marker.partyId));
    return enrichMarkersForLayer(base, layer, hoverByPartyId);
  }, [markers, layerPartyIds, layer, hoverByPartyId]);

  const legend = MAP_LAYER_LEGEND[layer] ?? MAP_LAYER_LEGEND.clientes;

  const selectedRow = useMemo(
    () => filteredModel.all.find((row) => row.partyId === selectedPartyId) ?? null,
    [filteredModel.all, selectedPartyId],
  );

  const ownerLabel =
    selectedRow?.commercialOwnerMemberId && memberLabels
      ? (memberLabels.get(selectedRow.commercialOwnerMemberId) ?? null)
      : null;

  const showLiveMap = isLiveMapProvider(provider) && viewConfig !== null;

  const handleSelectParty = (partyId: string | null) => {
    if (!partyId) {
      router.push(hrefWithoutPanel('/mapa', listQuery));
      return;
    }
    router.push(panelHref('/mapa', listQuery, `party:${partyId}`), { scroll: false });
    setMobilePane('list');
  };

  return (
    <div
      className="space-y-5"
      data-map-desk="location"
      data-demo-data-mode={dataMode}
      data-map-demo-boundary={dataMode === 'demo' ? 'DEMO · DATOS FICTICIOS' : undefined}
    >
      {selectedRow ? (
        <div className="hidden lg:contents">
          <MapPartyDrawer
            open
            row={selectedRow}
            ownerLabel={ownerLabel}
            listQuery={listQuery}
            commercial={selectedCommercial}
            nextActionLabel={selectedNextAction}
            issueCount={selectedIssueCount}
            lastUpdatedIso={selectedLastUpdatedIso}
          />
        </div>
      ) : null}
      <MapCoverageBanner coverage={model.coverage} provider={provider} partial={model.partial} />

      <div
        className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-resting)]"
        data-map-commercial-portfolio="summary"
      >
        <p className="isalwa-kicker">Resumen comercial</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="info">Clientes {portfolio.clientCount}</StatusPill>
          <StatusPill tone="info">Oportunidades {portfolio.opportunityCount}</StatusPill>
          {portfolio.quotedValueLabel ? (
            <StatusPill tone="neutral">Valor cotizado {portfolio.quotedValueLabel}</StatusPill>
          ) : (
            <StatusPill tone="neutral">Valor cotizado —</StatusPill>
          )}
          {portfolio.orderValueLabel ? (
            <StatusPill tone="neutral">Valor de pedidos {portfolio.orderValueLabel}</StatusPill>
          ) : (
            <StatusPill tone="neutral">Valor de pedidos —</StatusPill>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">
          {MAP_COMMERCIAL_VALUE_DISCLAIMER}
          {portfolio.partial ? ' Esta lectura no incluye todos los clientes.' : null}
        </p>
      </div>

      <MapLayerControls activeLayer={layer} onChange={setLayer} />

      {legend?.sizeLine || legend?.colorLine ? (
        <div
          className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky)_40%,white)] px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
          role="note"
          aria-label="Leyenda del mapa"
        >
          {legend.sizeLine ? <p>{legend.sizeLine}</p> : null}
          {legend.colorLine ? (
            <p className={legend.sizeLine ? 'mt-0.5' : undefined}>{legend.colorLine}</p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{MAP_VALUE_DISCLAIMER_SHORT}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full overflow-visible sm:max-w-sm" data-tour="map-search">
          <label htmlFor="mapa-search" className="text-xs font-medium text-[var(--isalwa-slate)]">
            Buscar en la lista
          </label>
          <SearchField
            id="mapa-search"
            name="q"
            placeholder="Nombre o teléfono"
            value={query}
            onChange={(event: { target: { value: string } }) => setQuery(event.target.value)}
            className="mt-1.5 w-full"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2 md:hidden" role="tablist" aria-label="Vista móvil del mapa" data-tour="map-toggle">
          <Chip active={mobilePane === 'map'} onClick={() => setMobilePane('map')} aria-pressed={mobilePane === 'map'}>
            Mapa
          </Chip>
          <Chip active={mobilePane === 'list'} onClick={() => setMobilePane('list')} aria-pressed={mobilePane === 'list'}>
            Lista
          </Chip>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(288px,0.9fr)]">
        <div className={mobilePane === 'map' ? 'block' : 'hidden md:block'}>
          {showLiveMap && viewConfig ? (
            <MapLiveCanvas
              view={viewConfig}
              markers={filteredMarkers}
              plottableCount={filteredModel.plottable.length}
              total={model.coverage.total}
              selectedPartyId={selectedPartyId}
              onSelectPartyId={handleSelectParty}
              hoverByPartyId={hoverByPartyId}
            />
          ) : (
            <MapCanvasFallback
              provider={provider}
              plottableCount={filteredModel.plottable.length}
              total={model.coverage.total}
            />
          )}
        </div>

        <div className={`space-y-4 ${mobilePane === 'list' ? 'block' : 'hidden md:block'}`}>
          {selectedRow ? (
            <div className="lg:hidden">
              <MapQuickViewCompact
                row={selectedRow}
                ownerLabel={ownerLabel}
                onCloseHref={hrefWithoutPanel('/mapa', listQuery)}
                commercial={selectedCommercial}
                nextActionLabel={selectedNextAction}
                issueCount={selectedIssueCount}
                lastUpdatedIso={selectedLastUpdatedIso}
              />
            </div>
          ) : null}
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-resting)] md:p-5">
            <p className="isalwa-kicker mb-3">Clientes</p>
            <MapCustomerLists
              plottable={filteredModel.plottable}
              provenanceOnly={filteredModel.provenanceOnly}
              noLocation={filteredModel.noLocation}
              selectedPartyId={selectedPartyId}
              listQuery={listQuery}
              memberLabels={memberLabels}
              query={query}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
