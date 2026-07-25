'use client';

/**
 * GIS canvas — depends on MapViewConfig only (vendor chosen by MapProvider).
 * Lazy-loaded from territory-experience; never blocks RSC shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapViewConfig } from '@isalwa/providers';
import {
  MARKER_COLORS,
  markerHealth,
  markerImportance,
  type TerritoryPoint,
} from '@/lib/territorio/points';
import { reducedMotion } from '@/lib/motion';

type FeatureProps = {
  id: string;
  name: string;
  health: string;
  importance: number;
  color: string;
};

type AccountFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: FeatureProps;
};

function toGeoJSON(points: TerritoryPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p): AccountFeature => {
      const health = markerHealth(p);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          id: p.accountId,
          name: p.name,
          health,
          importance: markerImportance(p),
          color: MARKER_COLORS[health],
        },
      };
    }),
  };
}

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

export function TerritoryMapGl({
  points,
  view,
  selectedId,
  onHover,
  onSelect,
  onReady,
}: {
  points: TerritoryPoint[];
  view: MapViewConfig;
  selectedId: string | null;
  onHover: (id: string | null, point?: TerritoryPoint) => void;
  onSelect: (id: string | null) => void;
  onReady?: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [bundle, setBundle] = useState<MapBundle | null>(null);
  const [cursor, setCursor] = useState<'grab' | 'pointer'>('grab');

  const byId = useMemo(() => {
    const m: Record<string, TerritoryPoint> = {};
    points.forEach((p) => {
      m[p.accountId] = p;
    });
    return m;
  }, [points]);

  const geojson = useMemo(() => toGeoJSON(points), [points]);
  const flyDuration = reducedMotion() ? 0 : 900;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (view.engine === 'mapbox') {
        const mapboxgl = (await import('mapbox-gl')).default;
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
      } else {
        const maplibregl = (await import('maplibre-gl')).default;
        await import('maplibre-gl/dist/maplibre-gl.css');
        const mod = await import('react-map-gl/maplibre');
        if (!cancelled) {
          setBundle({
            Map: mod.default,
            Source: mod.Source,
            Layer: mod.Layer,
            NavigationControl: mod.NavigationControl,
            mapLib: maplibregl,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view.engine]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClick = useCallback(
    (e: any) => {
      const map = mapRef.current;
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point'],
      });
      const f = feats[0];
      if (!f) {
        onSelect(null);
        return;
      }
      if (f.layer?.id === 'clusters') {
        const clusterId = f.properties?.cluster_id as number;
        const source = map.getSource('accounts');
        if (source && typeof source.getClusterExpansionZoom === 'function') {
          source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
            if (err) return;
            const coords = f.geometry.coordinates as [number, number];
            map.flyTo({ center: coords, zoom, duration: flyDuration, essential: true });
          });
        }
        return;
      }
      const id = f.properties?.id as string | undefined;
      if (id) onSelect(id);
    },
    [flyDuration, onSelect],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDblClick = useCallback(
    (e: any) => {
      e.preventDefault();
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: e.lngLat,
        zoom: Math.min(view.maxZoom, map.getZoom() + 1.4),
        duration: flyDuration,
        essential: true,
      });
    },
    [flyDuration, view.maxZoom],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMoveHover = useCallback(
    (e: any) => {
      const map = mapRef.current;
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point', 'clusters'],
      });
      if (!feats.length) {
        setCursor('grab');
        onHover(null);
        return;
      }
      setCursor('pointer');
      const f = feats[0];
      if (f?.layer?.id === 'unclustered-point') {
        const id = f.properties?.id as string;
        onHover(id, byId[id]);
      } else {
        onHover(null);
      }
    },
    [byId, onHover],
  );

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const p = byId[selectedId];
    if (!p) return;
    mapRef.current.flyTo({
      center: [p.lng, p.lat],
      zoom: Math.max(mapRef.current.getZoom(), 13.2),
      duration: flyDuration,
      essential: true,
      padding: { top: 40, bottom: 40, left: 40, right: 420 },
    });
  }, [selectedId, byId, flyDuration]);

  // MapLibre needs an explicit box; % height against min-height alone collapses to 0.
  useEffect(() => {
    if (!bundle) return;
    const map = mapRef.current;
    if (!map || typeof map.getMap !== 'function') return;
    const gl = map.getMap?.() ?? map;
    const el = typeof gl?.getContainer === 'function' ? gl.getContainer() : null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      try {
        gl.resize?.();
      } catch {
        /* ignore */
      }
    });
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [bundle]);

  if (!bundle) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-[var(--isalwa-surface-map)]"
        aria-busy
        aria-label="Cargando mapa"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1 text-[var(--isalwa-glaze)]">
            <span className="isalwa-loading-dot" />
            <span className="isalwa-loading-dot" />
            <span className="isalwa-loading-dot" />
          </div>
          <p
            className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]"
            style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
          >
            Preparando el territorio…
          </p>
        </div>
      </div>
    );
  }

  const { Map, Source, Layer, NavigationControl, mapLib } = bundle;

  return (
    <div className="absolute inset-0 h-full w-full">
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
        onDblClick={onDblClick}
        onMouseMove={onMoveHover}
        onMouseLeave={() => {
          setCursor('grab');
          onHover(null);
        }}
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
              if (layer.id.includes('park') && layer.type === 'fill') {
                e.target.setPaintProperty(layer.id, 'fill-color', '#e6ebe4');
              }
            });
          } catch {
            /* some styles are immutable */
          }
          onReady?.();
        }}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <Source
          id="accounts"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={14}
          clusterRadius={52}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#3d5c58',
                8,
                '#8a7358',
                20,
                '#6b4542',
              ],
              'circle-radius': ['step', ['get', 'point_count'], 16, 8, 20, 20, 26],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.92,
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 12,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'importance'],
                0,
                5.5,
                1,
                7,
                2,
                9,
                3,
                11,
              ],
              'circle-stroke-width': ['case', ['>=', ['get', 'importance'], 2], 2.5, 1.75],
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
