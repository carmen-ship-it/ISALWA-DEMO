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
import { DEFAULT_MAP_LAYER, type MapLayerId } from '@/lib/map/layers';
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
};

type MobilePane = 'map' | 'list';

function partyFilterForLayer(
  layer: MapLayerId,
  portfolio: MapCommercialPortfolio,
): ReadonlySet<string> | null {
  if (layer === 'oportunidades') return portfolio.partyIdsWithOpportunities;
  if (layer === 'cotizaciones') return portfolio.partyIdsWithQuotes;
  if (layer === 'pedidos') return portfolio.partyIdsWithOrders;
  return null;
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
}: MapExperienceProps) {
  const router = useRouter();
  const [layer, setLayer] = useState<MapLayerId>(DEFAULT_MAP_LAYER);
  const [mobilePane, setMobilePane] = useState<MobilePane>(selectedPartyId ? 'list' : 'map');
  const [query, setQuery] = useState(listQuery.q ?? '');

  const layerPartyIds = useMemo(() => partyFilterForLayer(layer, portfolio), [layer, portfolio]);

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
    if (!layerPartyIds) return markers;
    return markers.filter((marker) => layerPartyIds.has(marker.partyId));
  }, [markers, layerPartyIds]);

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
    <div className="space-y-5" data-map-desk="location">
      {selectedRow ? (
        <div className="hidden lg:contents">
          <MapPartyDrawer
            open
            row={selectedRow}
            ownerLabel={ownerLabel}
            listQuery={listQuery}
            commercial={selectedCommercial}
          />
        </div>
      ) : null}
      <MapCoverageBanner coverage={model.coverage} provider={provider} partial={model.partial} />

      <div
        className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-resting)]"
        data-map-commercial-portfolio="summary"
      >
        <p className="isalwa-kicker">Cartera comercial · lectura canónica</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="info">Oportunidades {portfolio.opportunityCount}</StatusPill>
          <StatusPill tone="info">Cotizaciones {portfolio.quoteCount}</StatusPill>
          <StatusPill tone="info">Pedidos {portfolio.orderCount}</StatusPill>
          {portfolio.opportunityValueLabel ? (
            <StatusPill tone="neutral">Valor de oportunidades {portfolio.opportunityValueLabel}</StatusPill>
          ) : null}
          {portfolio.quotedValueLabel ? (
            <StatusPill tone="neutral">Valor cotizado {portfolio.quotedValueLabel}</StatusPill>
          ) : null}
          {portfolio.orderValueLabel ? (
            <StatusPill tone="neutral">Valor de pedidos {portfolio.orderValueLabel}</StatusPill>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">
          {MAP_COMMERCIAL_VALUE_DISCLAIMER}
          {portfolio.partial ? ' Lectura parcial de la cartera comercial.' : null}
        </p>
      </div>

      <MapLayerControls activeLayer={layer} onChange={setLayer} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm" data-tour="map-search">
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
          {showLiveMap ? (
            <MapLiveCanvas
              view={viewConfig}
              markers={filteredMarkers}
              plottableCount={filteredModel.plottable.length}
              total={model.coverage.total}
              selectedPartyId={selectedPartyId}
              onSelectPartyId={handleSelectParty}
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
              />
            </div>
          ) : null}
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-resting)] md:p-5">
            <p className="isalwa-kicker mb-3">Cartera · lectura honesta</p>
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
