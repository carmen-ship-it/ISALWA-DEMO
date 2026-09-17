'use client';

/**
 * Live Mapbox canvas — MapViewConfig from MapboxMapProvider only.
 * Plots confirmed lat/lng markers; never invents geography.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { MapViewConfig } from '@isalwa/providers';
import { StatusPill } from '@isalwa/ui';
import { MapMarkerTooltip } from '@/components/map/map-marker-tooltip';

export type MapConfirmedMarker = {
  partyId: string;
  displayName: string;
  lat: number;
  lng: number;
};

type MapHandle = {
  getMap: () => {
    queryRenderedFeatures: (
      point: unknown,
      opts: { layers: string[] },
    ) => Array<{ properties?: { id?: string } }>;
    flyTo: (opts: Record<string, unknown>) => void;
    getZoom: () => number;
    fitBounds: (bounds: unknown, opts: Record<string, unknown>) => void;
    resize: () => void;
    getStyle: () => { layers?: Array<{ id: string; type: string }> };
    setPaintProperty: (id: string, prop: string, value: string) => void;
  };
};

type MapBundle = {
  Map: (props: Record<string, unknown>) => ReactElement | null;
  Source: (props: Record<string, unknown>) => ReactElement | null;
  Layer: (props: Record<string, unknown>) => ReactElement | null;
  NavigationControl: (props: Record<string, unknown>) => ReactElement | null;
  mapLib: unknown;
  LngLatBounds: new (
    sw: [number, number],
    ne: [number, number],
  ) => { extend: (coord: [number, number]) => unknown };
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
  const mapRef = useRef<MapHandle | null>(null);
  const didFitBounds = useRef(false);
  const [bundle, setBundle] = useState<MapBundle | null>(null);
  const [cursor, setCursor] = useState<'grab' | 'pointer'>('grab');
  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; y: number } | null>(null);

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
          Map: mod.default as unknown as MapBundle['Map'],
          Source: mod.Source as unknown as MapBundle['Source'],
          Layer: mod.Layer as unknown as MapBundle['Layer'],
          NavigationControl: mod.NavigationControl as unknown as MapBundle['NavigationControl'],
          mapLib: mapboxgl,
          LngLatBounds: mapboxgl.LngLatBounds as unknown as MapBundle['LngLatBounds'],
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onClick = useCallback(
    (e: { point: unknown }) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ['confirmed-clients'] });
      const props = feats[0]?.properties as Record<string, unknown> | null | undefined;
      const id = props?.id;
      onSelectPartyId(typeof id === 'string' ? id : null);
    },
    [onSelectPartyId],
  );

  const onMoveHover = useCallback((e: { point: { x: number; y: number } }) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const feats = map.queryRenderedFeatures(e.point, { layers: ['confirmed-clients'] });
    setCursor(feats.length ? 'pointer' : 'grab');
    const props = feats[0]?.properties as Record<string, unknown> | null | undefined;
    const name = props?.name;
    if (typeof name === 'string' && name.trim()) {
      setHoverLabel({ name: name.trim(), x: e.point.x, y: e.point.y });
    } else {
      setHoverLabel(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedPartyId || !mapRef.current) return;
    const marker = markers.find((m) => m.partyId === selectedPartyId);
    if (!marker) return;
    const map = mapRef.current.getMap();
    map.flyTo({
      center: [marker.lng, marker.lat],
      zoom: Math.max(map.getZoom(), 13.2),
      duration: 700,
      essential: true,
      padding: { top: 40, bottom: 56, left: 40, right: 40 },
    });
  }, [selectedPartyId, markers]);

  useEffect(() => {
    if (!bundle || markers.length === 0 || didFitBounds.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    try {
      const bounds = markers.reduce(
        (acc, m) => {
          (acc as { extend: (c: [number, number]) => unknown }).extend([m.lng, m.lat]);
          return acc;
        },
        new bundle.LngLatBounds(
          [markers[0]!.lng, markers[0]!.lat],
          [markers[0]!.lng, markers[0]!.lat],
        ),
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
      {/* Absolute fill: percent height alone can collapse; never paint porcelain over basemap tiles. */}
      <div className="relative min-h-[260px] flex-1 md:min-h-[380px]">
        {hoverLabel ? (
          <MapMarkerTooltip
            name={hoverLabel.name}
            x={hoverLabel.x}
            y={hoverLabel.y}
            visible
          />
        ) : null}
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
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          cursor={cursor}
          attributionControl
          onClick={onClick}
          onMouseMove={onMoveHover}
          onMouseLeave={() => {
            setCursor('grab');
            setHoverLabel(null);
          }}
          onLoad={(e: { target: MapHandle['getMap'] extends () => infer M ? M : never }) => {
            try {
              e.target.resize();
              // Do NOT recolor Mapbox background/water to porcelain — that reads as a blank beige
              // canvas even when tiles succeed (Carmen hosted screenshot 2026-09-16).
            } catch {
              /* map may not be ready */
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
