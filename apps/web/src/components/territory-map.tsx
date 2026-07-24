'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { StatusPill } from '@isalwa/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

type Point = {
  accountId: string;
  name: string;
  code: string;
  segment: string;
  creditStatus: string;
  lat: number;
  lng: number;
  territoryCode: string;
  href: string;
  personaKey?: string | null;
};

type Filter = 'all' | 'risk' | 'heroes' | 'seg-a' | 'seg-b';

type Cluster = {
  id: string;
  x: number;
  y: number;
  count: number;
  dominant: string;
};

type Projected = Point & { x: number; y: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function pinColor(status: string): string {
  if (status === 'ok') return 'var(--isalwa-success)';
  if (status === 'watch') return 'var(--isalwa-warning)';
  return 'var(--isalwa-danger)';
}

function creditTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success';
  if (status === 'watch') return 'warning';
  return 'danger';
}

function pinSize(p: Point): number {
  if (p.code.startsWith('H-')) return 20;
  if (p.segment === 'A') return 14;
  if (p.segment === 'B') return 11;
  return 9;
}

// Subtle zone palette — each territory gets a distinct tint
const ZONE_PALETTE = [
  'color-mix(in srgb, var(--isalwa-glaze) 11%, transparent)',
  'color-mix(in srgb, var(--isalwa-info) 9%, transparent)',
  'color-mix(in srgb, var(--isalwa-copper) 9%, transparent)',
  'color-mix(in srgb, var(--isalwa-success) 8%, transparent)',
  'color-mix(in srgb, var(--isalwa-warning) 8%, transparent)',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TerritoryMap({ points }: { points: Point[] }) {
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter]       = useState<Filter>('all');
  const [zoom, setZoom]           = useState(0); // 0 = full view, 0.85 = max zoom

  // ── Bounds ────────────────────────────────────────────────────────────────

  const baseBounds = useMemo(() => ({
    minLat: Math.min(...points.map(p => p.lat), -17.9),
    maxLat: Math.max(...points.map(p => p.lat), -17.3),
    minLng: Math.min(...points.map(p => p.lng), -63.4),
    maxLng: Math.max(...points.map(p => p.lng), -63.0),
  }), [points]);

  // Zoom shrinks the bounds toward the centroid
  const activeBounds = useMemo(() => {
    const clat = (baseBounds.minLat + baseBounds.maxLat) / 2;
    const clng = (baseBounds.minLng + baseBounds.maxLng) / 2;
    const f = 1 - zoom * 0.58;
    const dlat = (baseBounds.maxLat - baseBounds.minLat) * f / 2;
    const dlng = (baseBounds.maxLng - baseBounds.minLng) * f / 2;
    return { minLat: clat - dlat, maxLat: clat + dlat, minLng: clng - dlng, maxLng: clng + dlng };
  }, [baseBounds, zoom]);

  // ── Projection ────────────────────────────────────────────────────────────

  const project = useCallback((lat: number, lng: number): { x: number; y: number } => {
    const dLng = activeBounds.maxLng - activeBounds.minLng || 1;
    const dLat = activeBounds.maxLat - activeBounds.minLat || 1;
    return {
      x: ((lng - activeBounds.minLng) / dLng) * 100,
      y: (1 - (lat - activeBounds.minLat) / dLat) * 100,
    };
  }, [activeBounds]);

  // ── Filter → in-bounds ────────────────────────────────────────────────────

  const filtered = useMemo(() => points.filter(p => {
    if (filter === 'heroes') return p.code.startsWith('H-');
    if (filter === 'risk')   return p.creditStatus !== 'ok';
    if (filter === 'seg-a')  return p.segment === 'A';
    if (filter === 'seg-b')  return p.segment === 'B';
    return true;
  }), [points, filter]);

  const inBounds = useMemo(() => filtered.filter(p =>
    p.lat >= activeBounds.minLat && p.lat <= activeBounds.maxLat &&
    p.lng >= activeBounds.minLng && p.lng <= activeBounds.maxLng,
  ), [filtered, activeBounds]);

  // ── Project all visible points ────────────────────────────────────────────

  const projected = useMemo<Projected[]>(() =>
    inBounds.map(p => ({ ...p, ...project(p.lat, p.lng) })),
    [inBounds, project],
  );

  // ── Clustering — proximity threshold tightens with zoom ───────────────────

  const { singles, clusters } = useMemo(() => {
    const threshold = Math.max(1.2, 5.5 - zoom * 4.5);
    const assigned  = new Set<string>();
    const clusters: Cluster[] = [];
    const singles: Projected[] = [];

    for (const p of projected) {
      if (assigned.has(p.accountId)) continue;
      const nearby = projected.filter(q =>
        !assigned.has(q.accountId) &&
        Math.hypot(q.x - p.x, q.y - p.y) < threshold,
      );
      if (nearby.length >= 3) {
        nearby.forEach(q => assigned.add(q.accountId));
        const cx  = nearby.reduce((s, q) => s + q.x, 0) / nearby.length;
        const cy  = nearby.reduce((s, q) => s + q.y, 0) / nearby.length;
        const sts = nearby.map(q => q.creditStatus);
        clusters.push({
          id: `cl-${p.accountId}`,
          x: cx, y: cy,
          count: nearby.length,
          dominant: sts.includes('hold') ? 'hold' : sts.includes('watch') ? 'watch' : 'ok',
        });
      } else {
        assigned.add(p.accountId);
        singles.push(p);
      }
    }
    return { singles, clusters };
  }, [projected, zoom]);

  // ── Territory zones ───────────────────────────────────────────────────────

  const zones = useMemo(() => {
    const byCode = new Map<string, Point[]>();
    points.forEach(p => {
      if (!byCode.has(p.territoryCode)) byCode.set(p.territoryCode, []);
      byCode.get(p.territoryCode)!.push(p);
    });
    return Array.from(byCode.entries())
      .sort((a, b) => b[1].length - a[1].length) // largest zones first
      .map(([code, pts], i) => {
        const pos  = pts.map(p => project(p.lat, p.lng));
        const xs   = pos.map(p => p.x);
        const ys   = pos.map(p => p.y);
        const minX = Math.max(0, Math.min(...xs) - 2.5);
        const maxX = Math.min(100, Math.max(...xs) + 2.5);
        const minY = Math.max(0, Math.min(...ys) - 2.5);
        const maxY = Math.min(100, Math.max(...ys) + 2.5);
        return {
          code,
          count: pts.length,
          bg: ZONE_PALETTE[i % ZONE_PALETTE.length],
          left: `${minX}%`,
          top:  `${minY}%`,
          width:  `${Math.max(0, maxX - minX)}%`,
          height: `${Math.max(0, maxY - minY)}%`,
        };
      });
  }, [points, project]);

  // ── Counts & stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       points.length,
    atRisk:      points.filter(p => p.creditStatus !== 'ok').length,
    heroes:      points.filter(p => p.code.startsWith('H-')).length,
    territories: new Set(points.map(p => p.territoryCode)).size,
  }), [points]);

  const filterCounts: Record<Filter, number> = useMemo(() => ({
    all:     points.length,
    heroes:  stats.heroes,
    risk:    stats.atRisk,
    'seg-a': points.filter(p => p.segment === 'A').length,
    'seg-b': points.filter(p => p.segment === 'B').length,
  }), [points, stats]);

  // ── Selected / hovered resolution ─────────────────────────────────────────

  const selected = useMemo(() => points.find(p => p.accountId === selectedId) ?? null, [points, selectedId]);
  const hovered  = useMemo(() => singles.find(p => p.accountId === activeId) ?? null, [singles, activeId]);
  const card     = selected ?? hovered ?? null;
  const cardFixed = !!selected;

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header style={{ padding: '28px 32px 14px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {/* Kicker + title */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--isalwa-glaze)',
                margin: 0,
              }}
            >
              Territorio
            </p>
            <h1
              style={{
                fontFamily: 'var(--isalwa-font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.3rem, 2.2vw, 1.9rem)',
                lineHeight: 1.2,
                color: 'var(--isalwa-kiln)',
                marginTop: 8,
                letterSpacing: '-0.01em',
              }}
            >
              Santa Cruz · el dinero tiene geografía
            </h1>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flexShrink: 0 }}>
            {([
              { label: 'Cuentas',    value: stats.total,       color: 'var(--isalwa-kiln)' },
              { label: 'Seg. A',     value: filterCounts['seg-a'], color: 'var(--isalwa-info)' },
              { label: 'En riesgo',  value: stats.atRisk,      color: stats.atRisk > 0 ? 'var(--isalwa-danger)' : 'var(--isalwa-success)' },
              { label: 'Zonas',      value: stats.territories,  color: 'var(--isalwa-kiln)' },
            ] as const).map(s => (
              <div
                key={s.label}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid var(--isalwa-mist)',
                  borderRadius: 'var(--isalwa-radius-control)',
                  textAlign: 'center',
                  boxShadow: 'var(--isalwa-shadow-soft)',
                }}
              >
                <p
                  style={{
                    fontSize: 20,
                    fontFamily: 'var(--isalwa-font-mono)',
                    fontWeight: 600,
                    color: s.color,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--isalwa-slate)',
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Map canvas ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
        <div
          data-tour="territory-map"
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 540,
            borderRadius: 'var(--isalwa-radius-panel)',
            overflow: 'hidden',
            border: '1px solid var(--isalwa-mist)',
            boxShadow: 'var(--isalwa-shadow-lift)',
          }}
        >
          {/* Background gradient */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: 'var(--isalwa-surface-map)',
            }}
          />

          {/* Grid lines */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, opacity: 0.38,
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--isalwa-kiln) 8%, transparent) 1px, transparent 1px),' +
                'linear-gradient(to bottom, color-mix(in srgb, var(--isalwa-kiln) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Edge vignette */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 50%, rgba(28,36,48,0.13) 100%)',
            }}
          />

          {/* ── Pin canvas — 10% inset so pins never clip edges ─────────── */}
          <div
            style={{ position: 'absolute', inset: '10% 8%' }}
            role="region"
            aria-label="Mapa de clientes"
          >
            {/* Territory zone overlays */}
            {zones.map(z => (
              <div
                key={z.code}
                aria-hidden
                style={{
                  position: 'absolute',
                  left: z.left,
                  top: z.top,
                  width: z.width,
                  height: z.height,
                  background: z.bg,
                  borderRadius: 20,
                  pointerEvents: 'none',
                  transition: 'all var(--isalwa-motion-slow) var(--isalwa-ease-out)',
                }}
              />
            ))}

            {/* Zone code labels */}
            {zones.map(z => {
              const leftPct  = parseFloat(z.left);
              const topPct   = parseFloat(z.top);
              const widthPct = parseFloat(z.width);
              if (widthPct < 5) return null;
              return (
                <div
                  key={`lbl-${z.code}`}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: `${leftPct + widthPct / 2}%`,
                    top: `${topPct}%`,
                    transform: 'translateX(-50%) translateY(-18px)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--isalwa-slate)',
                    pointerEvents: 'none',
                    opacity: 0.55,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {z.code}
                </div>
              );
            })}

            {/* Cluster badges */}
            {clusters.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setZoom(z => Math.min(0.85, z + 0.28))}
                aria-label={`${c.count} cuentas agrupadas — acercar para ver`}
                style={{
                  position: 'absolute',
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: 'translate(-50%, -50%)',
                  minWidth: 34,
                  height: 34,
                  padding: '0 10px',
                  background: pinColor(c.dominant),
                  color: 'white',
                  border: '3px solid white',
                  borderRadius: 'var(--isalwa-radius-pill)',
                  fontSize: 12,
                  fontFamily: 'var(--isalwa-font-mono)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  cursor: 'pointer',
                  boxShadow: `0 0 0 2px color-mix(in srgb, ${pinColor(c.dominant)} 32%, transparent), var(--isalwa-shadow-soft)`,
                  transition: 'transform var(--isalwa-motion-fast) var(--isalwa-ease-out), box-shadow var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 8,
                }}
              >
                {c.count}
              </button>
            ))}

            {/* Individual pins */}
            {singles.map((p, idx) => {
              const isHero     = p.code.startsWith('H-');
              const isRisk     = p.creditStatus !== 'ok';
              const isHovered  = activeId   === p.accountId;
              const isSelected = selectedId === p.accountId;
              const size       = pinSize(p);
              const color      = pinColor(p.creditStatus);
              const scale      = isSelected ? 1.9 : isHovered ? 1.55 : 1;

              const pinClass = [
                'isalwa-map-pin',
                isHero          ? 'isalwa-hero-pin' : '',
                isRisk && !isHero ? 'isalwa-risk-pin' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={p.accountId}
                  type="button"
                  className={pinClass}
                  aria-label={p.name}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedId(isSelected ? null : p.accountId);
                    setActiveId(null);
                  }}
                  onMouseEnter={() => setActiveId(p.accountId)}
                  onMouseLeave={() => setActiveId(null)}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width:  size,
                    height: size,
                    padding: 0,
                    background: color,
                    border: `${isHero ? 3 : 2}px solid white`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    boxShadow: isSelected
                      ? `0 0 0 4px white, 0 0 0 6px ${color}, 0 4px 16px rgba(28,36,48,0.22)`
                      : isHovered
                        ? `0 0 0 3px color-mix(in srgb, ${color} 32%, transparent), 0 2px 8px rgba(28,36,48,0.18)`
                        : '0 1px 4px rgba(28,36,48,0.22)',
                    zIndex: isSelected ? 30 : isHovered ? 20 : isHero ? 12 : isRisk ? 8 : 5,
                    animationDelay: `${Math.min(idx, 40) * 16}ms`,
                    transition:
                      'transform 140ms var(--isalwa-ease-out), box-shadow 140ms var(--isalwa-ease-out)',
                  }}
                />
              );
            })}

            {/* Hero name tooltip — appears above the pin on hover */}
            {singles
              .filter(p => p.code.startsWith('H-') && activeId === p.accountId && !selectedId)
              .map(p => (
                <div
                  key={`tip-${p.accountId}`}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: 'translate(-50%, calc(-100% - 18px))',
                    background: 'rgba(28,36,48,0.92)',
                    backdropFilter: 'blur(6px)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    padding: '5px 10px',
                    borderRadius: 7,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 40,
                    animation: 'isalwa-whisper-in var(--isalwa-motion-slow) var(--isalwa-ease-out) both',
                  }}
                >
                  {p.name}
                  {/* Arrow */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -5,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 10,
                      height: 6,
                      background: 'rgba(28,36,48,0.92)',
                      clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                    }}
                  />
                </div>
              ))}
          </div>

          {/* ── Filter chips ── top-left, inside map ────────────────────── */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              gap: 5,
              flexWrap: 'wrap',
              maxWidth: '55%',
              zIndex: 15,
            }}
            role="group"
            aria-label="Filtrar vista del mapa"
          >
            {(
              [
                ['all',    'Todos'],
                ['seg-a',  'Seg. A'],
                ['seg-b',  'Seg. B'],
                ['risk',   'En riesgo'],
                ['heroes', 'Héroes'],
              ] as [Filter, string][]
            ).map(([key, label]) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={isActive}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--isalwa-radius-pill)',
                    border: isActive
                      ? '1px solid transparent'
                      : '1px solid rgba(255,255,255,0.55)',
                    background: isActive
                      ? 'var(--isalwa-kiln)'
                      : 'rgba(255,255,255,0.80)',
                    backdropFilter: 'blur(8px)',
                    color: isActive ? 'white' : 'var(--isalwa-kiln)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                    transition: 'all 140ms var(--isalwa-ease-out)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    lineHeight: 1,
                  }}
                >
                  {label}
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--isalwa-font-mono)',
                      opacity: isActive ? 0.65 : 0.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {filterCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Customer card ── top-right, appears on hover or click ───── */}
          {card && (
            <div
              key={card.accountId}
              className="isalwa-whisper"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 244,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(14px)',
                border: '1px solid var(--isalwa-mist)',
                borderRadius: 'var(--isalwa-radius-panel)',
                boxShadow: 'var(--isalwa-shadow-lift)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {/* Tone accent line */}
              <div
                aria-hidden
                style={{
                  height: 2,
                  background: pinColor(card.creditStatus),
                }}
              />

              {/* Identity */}
              <div style={{ padding: '14px 16px 10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--isalwa-kiln)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {card.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--isalwa-slate)',
                        marginTop: 3,
                        fontFamily: 'var(--isalwa-font-mono)',
                      }}
                    >
                      {card.territoryCode} · Seg. {card.segment}
                    </p>
                  </div>

                  {/* Close — only when pinned (selected) */}
                  {cardFixed && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Cerrar"
                      style={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: '1px solid var(--isalwa-mist)',
                        background: 'var(--isalwa-porcelain)',
                        color: 'var(--isalwa-slate)',
                        fontSize: 15,
                        lineHeight: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusPill tone={creditTone(card.creditStatus)}>
                    {card.creditStatus === 'ok' ? 'Crédito al día' : card.creditStatus === 'watch' ? 'En vigilancia' : 'Bloqueado'}
                  </StatusPill>
                  {card.code.startsWith('H-') && (
                    <StatusPill tone="info">Héroe</StatusPill>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--isalwa-mist)' }} />

              {/* Quick actions */}
              <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8 }}>
                <Link
                  href={card.href}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: 'var(--isalwa-glaze)',
                    color: 'white',
                    borderRadius: 'var(--isalwa-radius-control)',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    letterSpacing: '-0.01em',
                    display: 'block',
                    transition: 'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                  }}
                >
                  Ver perfil →
                </Link>
                <Link
                  href={`/cierre?account=${card.accountId}`}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: 'var(--isalwa-porcelain)',
                    color: 'var(--isalwa-kiln)',
                    borderRadius: 'var(--isalwa-radius-control)',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    letterSpacing: '-0.01em',
                    display: 'block',
                    border: '1px solid var(--isalwa-mist)',
                    transition: 'border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                  }}
                >
                  Cotizar
                </Link>
              </div>

              {/* Hover hint — only when not pinned */}
              {!cardFixed && (
                <p
                  style={{
                    padding: '0 16px 10px',
                    fontSize: 10,
                    color: 'var(--isalwa-slate)',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    opacity: 0.7,
                  }}
                >
                  Clic en el pin para fijar
                </p>
              )}
            </div>
          )}

          {/* ── Zoom control ── right side, vertically centered ──────────── */}
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 60,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              zIndex: 15,
            }}
          >
            {([
              { symbol: '+', action: () => setZoom(z => Math.min(0.85, z + 0.22)), label: 'Acercar' },
              { symbol: '−', action: () => setZoom(z => Math.max(0, z - 0.22)),    label: 'Alejar'  },
            ] as const).map(btn => (
              <button
                key={btn.symbol}
                type="button"
                onClick={btn.action}
                aria-label={btn.label}
                style={{
                  width: 32,
                  height: 32,
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--isalwa-mist)',
                  borderRadius: 'var(--isalwa-radius-control)',
                  fontSize: 17,
                  fontWeight: 500,
                  color: 'var(--isalwa-kiln)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  transition: 'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out), transform var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                }}
              >
                {btn.symbol}
              </button>
            ))}

            {/* Reset zoom */}
            {zoom > 0.05 && (
              <button
                type="button"
                onClick={() => setZoom(0)}
                aria-label="Restablecer vista"
                title="Restablecer"
                style={{
                  width: 32,
                  height: 32,
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--isalwa-mist)',
                  borderRadius: 'var(--isalwa-radius-control)',
                  fontSize: 14,
                  color: 'var(--isalwa-glaze)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out), transform var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                }}
              >
                ↺
              </button>
            )}
          </div>

          {/* ── Legend ── bottom-left ────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              zIndex: 15,
            }}
            aria-label="Leyenda del mapa"
          >
            {([
              { color: 'var(--isalwa-success)', label: 'Crédito OK',  dotSize: 9  },
              { color: 'var(--isalwa-warning)', label: 'Watch',       dotSize: 9  },
              { color: 'var(--isalwa-danger)',  label: 'Hold',        dotSize: 9  },
              { color: 'var(--isalwa-glaze)',   label: 'Héroe',       dotSize: 13 },
            ] as const).map(l => (
              <div
                key={l.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  background: 'rgba(255,255,255,0.82)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--isalwa-radius-pill)',
                  border: '1px solid rgba(255,255,255,0.55)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: l.dotSize,
                    height: l.dotSize,
                    borderRadius: '50%',
                    background: l.color,
                    border: '2px solid white',
                    display: 'block',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(28,36,48,0.18)',
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--isalwa-kiln)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {l.label}
                </span>
              </div>
            ))}

            {/* Cluster badge example */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--isalwa-radius-pill)',
                border: '1px solid rgba(255,255,255,0.55)',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--isalwa-radius-pill)',
                  background: 'var(--isalwa-slate)',
                  border: '2px solid white',
                  color: 'white',
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: 'var(--isalwa-font-mono)',
                  flexShrink: 0,
                }}
              >
                N
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--isalwa-kiln)',
                  letterSpacing: '0.02em',
                }}
              >
                Grupo
              </span>
            </div>
          </div>

          {/* ── Visible count ── bottom-right ────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              padding: '4px 11px',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--isalwa-radius-pill)',
              border: '1px solid rgba(255,255,255,0.55)',
              fontSize: 11,
              fontFamily: 'var(--isalwa-font-mono)',
              color: 'var(--isalwa-slate)',
              zIndex: 15,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {singles.length + clusters.reduce((s, c) => s + c.count, 0)} visibles
          </div>
        </div>
      </div>
    </div>
  );
}
