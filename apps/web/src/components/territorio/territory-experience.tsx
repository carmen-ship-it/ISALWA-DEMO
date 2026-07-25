'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StatGroup } from '@isalwa/ui';
import type { MapViewConfig } from '@isalwa/providers';
import { getClientMapViewConfig } from '@/lib/territorio/map-provider';
import { TERRITORY_LAYER_REGISTRY } from '@/lib/territorio/extensions';
import {
  MARKER_COLORS,
  markerHealth,
  matchesFilter,
  parseTerritoryFilter,
  TERRITORY_FILTERS,
  type TerritoryFilter,
  type TerritoryPoint,
} from '@/lib/territorio/points';
import { AccountDrawer } from './account-drawer';

const TerritoryMapGl = dynamic(
  () => import('./territory-map-gl').then((m) => m.TerritoryMapGl),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 flex items-center justify-center bg-[var(--isalwa-surface-map)]"
        aria-busy
      >
        <p
          className="text-[var(--isalwa-slate)]"
          style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
        >
          Preparando el territorio…
        </p>
      </div>
    ),
  },
);

export function TerritoryExperience({ points }: { points: TerritoryPoint[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view] = useState<MapViewConfig>(() => getClientMapViewConfig());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<TerritoryPoint | null>(null);

  const filter = parseTerritoryFilter(searchParams.get('filter'));

  const setFilter = useCallback(
    (next: TerritoryFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'all') params.delete('filter');
      else params.set('filter', next);
      // Keep Radar sync key if present
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const filtered = useMemo(
    () => points.filter((p) => matchesFilter(p, filter)),
    [points, filter],
  );

  const selected = useMemo(
    () => points.find((p) => p.accountId === selectedId) ?? null,
    [points, selectedId],
  );

  const stats = useMemo(() => {
    const atRisk = points.filter((p) => p.creditStatus !== 'ok').length;
    const vip = points.filter((p) => p.code.startsWith('H-') || p.segment === 'A').length;
    const zones = new Set(points.map((p) => p.territoryCode)).size;
    return { total: points.length, atRisk, vip, zones };
  }, [points]);

  const filterCounts = useMemo(() => {
    const counts = {} as Record<TerritoryFilter, number>;
    for (const f of TERRITORY_FILTERS) {
      counts[f.id] = points.filter((p) => matchesFilter(p, f.id)).length;
    }
    return counts;
  }, [points]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const preview = selected ?? hover;
  const previewHealth = preview ? markerHealth(preview) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="shrink-0 px-5 pt-7 pb-3.5 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="isalwa-kicker">Territorio</p>
            <h1 className="isalwa-page-title mt-2">Santa Cruz · el dinero tiene geografía</h1>
            <p className="mt-2 max-w-xl text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              Mapa vectorial de la cartera. Misma verdad que Radar — filtre y actúe sin salir del
              territorio.
            </p>
          </div>
          <StatGroup
            items={[
              { label: 'Cuentas', value: stats.total },
              { label: 'VIP / A', value: stats.vip, tone: 'var(--isalwa-glaze)' },
              {
                label: 'En riesgo',
                value: stats.atRisk,
                tone: stats.atRisk > 0 ? 'var(--isalwa-danger)' : 'var(--isalwa-success)',
              },
              { label: 'Zonas', value: stats.zones },
            ]}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-6 md:px-6">
        <div
          data-tour="territory-map"
          className="territorio-map-root relative h-[min(72vh,720px)] min-h-[420px] flex-1 overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-map,#f3f1ed)] shadow-[var(--isalwa-shadow-lift)]"
        >
          <TerritoryMapGl
            points={filtered}
            view={view}
            selectedId={selectedId}
            onHover={(id, point) => setHover(point ?? null)}
            onSelect={setSelectedId}
          />

          {/* Filters — Radar-aligned vocabulary, URL synced */}
          <div
            className="absolute top-3 left-3 z-10 flex max-w-[min(100%-1.5rem,520px)] flex-wrap gap-1.5"
            role="group"
            aria-label="Filtros del mapa (sincronizados con Radar)"
          >
            {TERRITORY_FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`isalwa-interactive flex items-center gap-1.5 rounded-[var(--isalwa-radius-pill)] px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.02em] backdrop-blur-md transition-[background,color,border-color] duration-[var(--isalwa-motion-fast)] ${
                    active
                      ? 'border border-transparent bg-[var(--isalwa-kiln)] text-white'
                      : 'border border-white/60 bg-white/85 text-[var(--isalwa-kiln)]'
                  }`}
                >
                  {f.label}
                  <span className="font-[var(--isalwa-font-mono)] text-[10px] opacity-60">
                    {filterCounts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hover preview card */}
          {preview && !selected ? (
            <div
              className="isalwa-whisper pointer-events-none absolute top-3 right-3 z-10 w-[240px] overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white/95 shadow-[var(--isalwa-shadow-lift)] backdrop-blur-md"
              aria-hidden
            >
              <div
                className="h-0.5"
                style={{ background: previewHealth ? MARKER_COLORS[previewHealth] : undefined }}
              />
              <div className="px-3.5 py-3">
                <p className="truncate text-[13px] font-semibold text-[var(--isalwa-kiln)]">
                  {preview.name}
                </p>
                <p className="mt-0.5 font-[var(--isalwa-font-mono)] text-[10px] text-[var(--isalwa-slate)]">
                  {preview.code} · Seg. {preview.segment}
                </p>
                <p className="mt-2 text-[11px] text-[var(--isalwa-slate)]">Clic para abrir ficha</p>
              </div>
            </div>
          ) : null}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white/90 px-2.5 py-2 text-[10px] text-[var(--isalwa-slate)] shadow-[var(--isalwa-shadow-soft)] backdrop-blur-md">
            {(
              [
                ['healthy', 'Sano'],
                ['attention', 'Atención'],
                ['risk', 'Riesgo'],
                ['critical', 'Crítico'],
              ] as const
            ).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                  style={{ background: MARKER_COLORS[key] }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Engine badge — transparency, not chrome */}
          <div className="absolute right-3 bottom-14 z-10 hidden rounded bg-white/70 px-2 py-1 font-[var(--isalwa-font-mono)] text-[9px] text-[var(--isalwa-slate)] backdrop-blur-sm md:block">
            {view.engine === 'mapbox' ? 'Mapbox' : 'MapLibre'} · {filtered.length} visibles
          </div>

          {/* Reserved future layers (hidden UI — contract only) */}
          <div className="sr-only" aria-hidden>
            {Object.entries(TERRITORY_LAYER_REGISTRY).map(([id, meta]) => (
              <span key={id}>
                {meta.label}:{meta.status}
              </span>
            ))}
          </div>
        </div>
      </div>

      <AccountDrawer point={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
