'use client';

import { useMemo, useState } from 'react';
import { Chip, SearchField } from '@isalwa/ui';
import { MapCanvasFallback } from '@/components/map/map-canvas-fallback';
import { MapCoverageBanner } from '@/components/map/map-coverage-banner';
import { MapCustomerLists } from '@/components/map/map-customer-lists';
import { MapLayerControls } from '@/components/map/map-layer-controls';
import { MapQuickViewCompact } from '@/components/map/map-quick-view-compact';
import type { MapDeskViewModel } from '@/lib/map/build-view-model';
import { DEFAULT_MAP_LAYER, type MapLayerId } from '@/lib/map/layers';
import type { MapProviderStatus } from '@/lib/map/provider-status';
import { hrefWithoutPanel, type ListQueryState } from '@/lib/lists/url-state';

type MapExperienceProps = {
  model: MapDeskViewModel;
  provider: MapProviderStatus;
  listQuery: ListQueryState;
  selectedPartyId: string | null;
  memberLabels?: ReadonlyMap<string, string>;
};

type MobilePane = 'map' | 'list';

export function MapExperience({
  model,
  provider,
  listQuery,
  selectedPartyId,
  memberLabels,
}: MapExperienceProps) {
  const [layer, setLayer] = useState<MapLayerId>(DEFAULT_MAP_LAYER);
  const [mobilePane, setMobilePane] = useState<MobilePane>(selectedPartyId ? 'list' : 'map');
  const [query, setQuery] = useState(listQuery.q ?? '');

  const selectedRow = useMemo(
    () => model.all.find((row) => row.partyId === selectedPartyId) ?? null,
    [model.all, selectedPartyId],
  );

  const ownerLabel =
    selectedRow?.commercialOwnerMemberId && memberLabels
      ? (memberLabels.get(selectedRow.commercialOwnerMemberId) ?? null)
      : null;

  return (
    <div className="space-y-5" data-map-desk="location">
      <MapCoverageBanner coverage={model.coverage} provider={provider} partial={model.partial} />

      <MapLayerControls activeLayer={layer} onChange={setLayer} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
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
        <div className="flex gap-2 md:hidden" role="tablist" aria-label="Vista móvil del mapa">
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
          <MapCanvasFallback
            provider={provider}
            plottableCount={model.plottable.length}
            total={model.coverage.total}
          />
        </div>

        <div className={`space-y-4 ${mobilePane === 'list' ? 'block' : 'hidden md:block'}`}>
          {selectedRow ? (
            <MapQuickViewCompact
              row={selectedRow}
              ownerLabel={ownerLabel}
              onCloseHref={hrefWithoutPanel('/mapa', listQuery)}
            />
          ) : null}
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-resting)] md:p-5">
            <p className="isalwa-kicker mb-3">Cartera · lectura honesta</p>
            <MapCustomerLists
              plottable={model.plottable}
              provenanceOnly={model.provenanceOnly}
              noLocation={model.noLocation}
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
