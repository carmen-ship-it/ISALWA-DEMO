'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Panel, StatusPill } from '@isalwa/ui';

type Point = {
  accountId: string;
  name: string;
  segment: string;
  creditStatus: string;
  lat: number;
  lng: number;
  territoryCode: string;
  href: string;
  code: string;
};

export function TerritoryMap({ points }: { points: Point[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'risk' | 'heroes'>('all');

  const bounds = useMemo(() => {
    const minLat = Math.min(...points.map((p) => p.lat), -17.9);
    const maxLat = Math.max(...points.map((p) => p.lat), -17.3);
    const minLng = Math.min(...points.map((p) => p.lng), -63.4);
    const maxLng = Math.max(...points.map((p) => p.lng), -63.0);
    return { minLat, maxLat, minLng, maxLng };
  }, [points]);

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 100;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 100;
    return { left: `${x}%`, top: `${y}%` };
  };

  const visible = points.filter((p) => {
    if (filter === 'heroes') return p.code.startsWith('H-');
    if (filter === 'risk') return p.creditStatus !== 'ok';
    return true;
  });

  const hovered = points.find((p) => p.accountId === active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de mapa">
        {(
          [
            ['all', 'Todos'],
            ['risk', 'En riesgo'],
            ['heroes', 'Héroes'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-[var(--isalwa-radius-pill)] px-3 py-1.5 text-[var(--isalwa-text-sm)] transition-colors ${
              filter === key
                ? 'bg-[var(--isalwa-kiln)] text-white'
                : 'bg-white text-[var(--isalwa-slate)] border border-[var(--isalwa-mist)] hover:border-[var(--isalwa-glaze)]'
            }`}
            aria-pressed={filter === key}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel className="relative h-[440px] overflow-hidden p-0 md:h-[580px]">
        <div className="absolute inset-0" style={{ background: 'var(--isalwa-surface-map)' }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--isalwa-kiln) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--isalwa-kiln) 6%, transparent) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-6 rounded-[var(--isalwa-radius-panel)] border border-[color-mix(in_srgb,var(--isalwa-kiln)_8%,transparent)]">
          {visible.map((p, idx) => {
            const pos = project(p.lat, p.lng);
            const color =
              p.creditStatus === 'ok'
                ? 'var(--isalwa-glaze)'
                : p.creditStatus === 'hold'
                  ? 'var(--isalwa-danger)'
                  : 'var(--isalwa-warning)';
            const isHero = p.code.startsWith('H-');
            return (
              <Link
                key={p.accountId}
                href={p.href}
                title={p.name}
                aria-label={`${p.name}, segmento ${p.segment}`}
                className={`isalwa-map-pin absolute rounded-full border-2 border-white ${
                  isHero ? 'h-4 w-4' : 'h-2.5 w-2.5'
                }`}
                style={{
                  left: pos.left,
                  top: pos.top,
                  background: color,
                  animationDelay: `${Math.min(idx, 40) * 12}ms`,
                }}
                onMouseEnter={() => setActive(p.accountId)}
                onFocus={() => setActive(p.accountId)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
              />
            );
          })}
        </div>

        {hovered ? (
          <div className="isalwa-whisper absolute right-4 top-4 max-w-xs rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white/95 p-3 shadow-[var(--isalwa-shadow-lift)] backdrop-blur">
            <p className="font-semibold">{hovered.name}</p>
            <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              {hovered.territoryCode} · Seg. {hovered.segment}
            </p>
            <div className="mt-2">
              <StatusPill
                tone={
                  hovered.creditStatus === 'ok'
                    ? 'success'
                    : hovered.creditStatus === 'hold'
                      ? 'danger'
                      : 'warning'
                }
              >
                Crédito {hovered.creditStatus}
              </StatusPill>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            <StatusPill tone="success">Crédito OK</StatusPill>
            <StatusPill tone="warning">Watch</StatusPill>
            <StatusPill tone="danger">Hold</StatusPill>
            <StatusPill tone="neutral">{visible.length} visibles</StatusPill>
          </div>
        )}
      </Panel>
    </div>
  );
}
