'use client';

/**
 * Live Mapbox canvas — MapViewConfig from MapboxMapProvider only.
 * Plots confirmed lat/lng markers; never invents geography.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapViewConfig } from '@isalwa/providers';
import { StatusPill } from '@isalwa/ui';

export type MapConfirmedMarker = {
  partyId: string;
  displayName: string;
  lat: number;
  lng: number;
};

type MapBundle = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Map: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Source: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NavigationControl: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapLib: any;
};

type MapLiveCanvasProps = {
  view: MapViewConfig;
  markers: readonly MapConfirmedMarker[];
  plottableCount: number;
  total: number;
  selectedPartyId: string | null;
  onSelectPartyId: (partyId: string | null) => void;
};

function toGeoJSON(markers: readonly MapConfirmedMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: markers.map((m) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] as [number, number] },
      properties: {
        id: m.partyId,
        name: m.displayName,
      },
    })),
  };
}

export function MapLiveCanvas({
  view,
  markers,
  plottableCount,
  total,
  selectedPartyId,
  onSelectPartyId,
}: MapLiveCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const didFitBounds = useRef(false);
  const [bundle, setBundle] = useState<MapBundle | null>(null);
  const [cursor, setCursor] = useState<'grab' | 'pointer'>('grab');

  const geojson = useMemo(() => toGeoJSON(markers), [markers]);

  const geojsonWithSelection = useMemo(() => {
    return {
      ...geojson,
      features: geojson.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          selected: f.properties.id === selectedPartyId ? 1 : 0,
        },
      })),
    };
  }, [geojson, selectedPartyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      // @ts-expect-error — mapbox stylesheet has no TypeScript module declaration
      await import('mapbox-gl/dist/mapbox-gl.css');
      const mod = await import('react-map-gl/mapbox');
      if (!cancelled) {
        setBundle({
          Map: mod.default,
          Source: mod.Source,
          Layer: mod.Layer,
          NavigationControl: mod.NavigationControl,
          mapLib: mapboxgl,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClick = useCallback(
    (e: any) => {
      const map = mapRef.current;
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ['confirmed-clients'] });
      const id = feats[0]?.properties?.id as string | undefined;
      onSelectPartyId(id ?? null);
    },
    [onSelectPartyId],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMoveHover = useCallback(
    (e: any) => {
      const map = mapRef.current;
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ['confirmed-clients'] });
      setCursor(feats.length ? 'pointer' : 'grab');
    },
    [],
  );

  useEffect(() => {
    if (!selectedPartyId || !mapRef.current) return;
    const marker = markers.find((m) => m.partyId === selectedPartyId);
    if (!marker) return;
    mapRef.current.flyTo({
      center: [marker.lng, marker.lat],
      zoom: Math.max(mapRef.current.getZoom(), 13.2),
      duration: 700,
      essential: true,
      padding: { top: 40, bottom: 56, left: 40, right: 40 },
    });
  }, [selectedPartyId, markers]);

  useEffect(() => {
    if (!bundle || markers.length === 0 || didFitBounds.current) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      const bounds = markers.reduce(
        (acc, m) => acc.extend([m.lng, m.lat]),
        new bundle.mapLib.LngLatBounds([markers[0]!.lng, markers[0]!.lat], [markers[0]!.lng, markers[0]!.lat]),
      );
      map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
      didFitBounds.current = true;
    } catch {
      /* keep default framing */
    }
  }, [bundle, markers]);

  const coverageLine = `${plottableCount} de ${total} clientes con coordenadas confirmadas`;

  if (!bundle) {
    return (
      <div
        className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-kiln)_6%,var(--isalwa-porcelain))] shadow-[var(--isalwa-shadow-lift)] md:min-h-[440px]"
        aria-busy
        aria-label="Cargando mapa"
        data-map-canvas="loading"
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-slate)]">
            Preparando el territorio…
          </p>
        </div>
      </div>
    );
  }

  const { Map, Source, Layer, NavigationControl, mapLib } = bundle;

  return (
    <div
      className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-lift)] md:min-h-[440px]"
      data-map-canvas="live"
      data-map-engine="mapbox"
    >
      <div className="relative min-h-[260px] flex-1 md:min-h-[380px]">
        <Map
          ref={mapRef}
          mapLib={mapLib}
          mapboxAccessToken={view.accessToken}
          initialViewState={{
            latitude: view.defaultCenter.lat,
            longitude: view.defaultCenter.lng,
            zoom: view.defaultZoom,
          }}
          minZoom={view.minZoom}
          maxZoom={view.maxZoom}
          maxBounds={view.maxBounds}
          mapStyle={view.styleUrl}
          style={{ width: '100%', height: '100%' }}
          cursor={cursor}
          attributionControl
          onClick={onClick}
          onMouseMove={onMoveHover}
          onMouseLeave={() => setCursor('grab')}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLoad={(e: any) => {
            try {
              e.target.resize();
              const style = e.target.getStyle();
              style.layers?.forEach((layer: { id: string; type: string }) => {
                if (layer.type === 'background') {
                  e.target.setPaintProperty(layer.id, 'background-color', '#f3f1ed');
                }
                if (layer.id.includes('water') && layer.type === 'fill') {
                  e.target.setPaintProperty(layer.id, 'fill-color', '#d9e4df');
                }
              });
            } catch {
              /* style may be immutable */
            }
          }}
          reuseMaps
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          {markers.length > 0 ? (
            <Source id="confirmed-clients" type="geojson" data={geojsonWithSelection}>
              <Layer
                id="confirmed-clients"
                type="circle"
                paint={{
                  'circle-color': '#3d5c58',
                  'circle-radius': ['case', ['==', ['get', 'selected'], 1], 10, 7],
                  'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.5, 1.75],
                  'circle-stroke-color': '#ffffff',
                  'circle-opacity': 0.94,
                }}
              />
            </Source>
          ) : null}
        </Map>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-white)_88%,var(--isalwa-porcelain))] px-3 py-2.5 text-[10px] text-[var(--isalwa-slate)] backdrop-blur-sm">
        <span>{coverageLine}</span>
        <span className="flex items-center gap-2">
          {markers.length === 0 && plottableCount > 0 ? (
            <span>Sin lectura de coordenadas en esta página — no se inventan pines</span>
          ) : null}
          <StatusPill tone="info">Mapbox Light</StatusPill>
        </span>
      </div>
    </div>
  );
}
