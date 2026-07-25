/**
 * Territory point model + commercial health for map markers.
 * Mirrors GET /v1/territorio/points — presentation only.
 */

export type TerritoryPoint = {
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
  relationshipScore?: number;
  lastVisitAt?: string | null;
  ownerId?: string;
  ownerName?: string;
};

/** Calm commercial states — never neon Google-pin red */
export type MarkerHealth = 'healthy' | 'attention' | 'risk' | 'critical';

/** Hex paints for MapLibre/Mapbox (CSS vars unavailable in GL paint) */
export const MARKER_COLORS: Record<MarkerHealth, string> = {
  healthy: '#2f6f68', // glaze
  attention: '#b08a5b', // copper
  risk: '#8f4a45', // muted danger
  critical: '#6b322e', // deep kiln-danger
};

export function markerHealth(p: TerritoryPoint): MarkerHealth {
  if (p.creditStatus === 'hold' || p.creditStatus === 'blocked') {
    return p.segment === 'A' || p.code.startsWith('H-') ? 'critical' : 'risk';
  }
  if (p.creditStatus === 'watch') return 'attention';
  return 'healthy';
}

/** VIP / commercial importance — drives marker radius */
export function markerImportance(p: TerritoryPoint): number {
  if (p.code.startsWith('H-')) return 3;
  if (p.segment === 'A') return 2;
  if ((p.relationshipScore ?? 0) >= 80) return 2;
  if (p.segment === 'B') return 1;
  return 0;
}

export function isVip(p: TerritoryPoint): boolean {
  return p.code.startsWith('H-') || p.segment === 'A';
}

const VISIT_GAP_DAYS = 30;

export function daysSinceVisit(p: TerritoryPoint, asOf = Date.now()): number | null {
  if (!p.lastVisitAt) return null;
  const t = new Date(p.lastVisitAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((asOf - t) / 86_400_000);
}

/** Filters aligned with Radar attention vocabulary (URL-syncable) */
export type TerritoryFilter =
  | 'all'
  | 'risk'
  | 'critical'
  | 'collections'
  | 'vip'
  | 'no-visit'
  | 'seg-a'
  | 'seg-b';

export const TERRITORY_FILTERS: { id: TerritoryFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'vip', label: 'VIP' },
  { id: 'risk', label: 'Alto riesgo' },
  { id: 'collections', label: 'Cobranza' },
  { id: 'no-visit', label: 'Sin visita' },
  { id: 'seg-a', label: 'Seg. A' },
  { id: 'seg-b', label: 'Seg. B' },
];

export function matchesFilter(p: TerritoryPoint, filter: TerritoryFilter): boolean {
  switch (filter) {
    case 'vip':
      return isVip(p);
    case 'risk':
    case 'critical':
      return p.creditStatus !== 'ok';
    case 'collections':
      return p.creditStatus === 'watch' || p.creditStatus === 'hold' || p.creditStatus === 'blocked';
    case 'no-visit': {
      const d = daysSinceVisit(p);
      return d === null || d >= VISIT_GAP_DAYS;
    }
    case 'seg-a':
      return p.segment === 'A';
    case 'seg-b':
      return p.segment === 'B';
    default:
      return true;
  }
}

export function parseTerritoryFilter(raw: string | null | undefined): TerritoryFilter {
  const v = (raw ?? 'all') as TerritoryFilter;
  return TERRITORY_FILTERS.some((f) => f.id === v) ? v : 'all';
}
