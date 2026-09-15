import { safeInternalPath } from '@/lib/shell/safe-next';
import { recentsStorageKey } from '@/lib/shell/command-palette';

export type SavedView = {
  id: string;
  label: string;
  detail: string;
  href: string;
  source: 'built-in' | 'pinned';
};

const SAVED_VIEWS_PREFIX = 'isalwa-os-saved-views-v1';
const PIN_LIMIT = 6;

const ALLOWED_PATHS = new Set(['/clientes', '/cotizaciones', '/oportunidades', '/trabajo', '/aprobaciones']);
const ALLOWED_KEYS = new Set([
  'q',
  'status',
  'view',
  'visibility',
  'roleKey',
  'subjectType',
  'subjectId',
  'sort',
  'density',
  'focus',
]);

export const BUILT_IN_SAVED_VIEWS: readonly SavedView[] = [
  {
    id: 'quotes-submitted',
    label: 'Cotizaciones enviadas',
    detail: 'Lista existente. Estado enviado.',
    href: '/cotizaciones?status=submitted',
    source: 'built-in',
  },
  {
    id: 'quotes-accepted',
    label: 'Cotizaciones aceptadas',
    detail: 'Lista existente. Estado aceptado.',
    href: '/cotizaciones?status=accepted',
    source: 'built-in',
  },
  {
    id: 'opportunities-open',
    label: 'Oportunidades abiertas',
    detail: 'Lista existente. Estado abierto.',
    href: '/oportunidades?status=open',
    source: 'built-in',
  },
  {
    id: 'work-overdue',
    label: 'Trabajo vencido',
    detail: 'Fecha ya pasada. No solo seguimientos.',
    href: '/trabajo?view=overdue',
    source: 'built-in',
  },
  {
    id: 'customers-active',
    label: 'Clientes activos',
    detail: 'No filtra por responsable.',
    href: '/clientes?status=active',
    source: 'built-in',
  },
];

export function savedViewsStorageKey(actorKey: string): string | null {
  const base = recentsStorageKey(actorKey);
  if (!base) return null;
  return base.replace(/^isalwa-os-palette-v1:/, `${SAVED_VIEWS_PREFIX}:`);
}

export function canonicalViewHref(input: string): string | null {
  const safe = safeInternalPath(input);
  if (!safe) return null;
  const hash = safe.indexOf('#');
  const withoutHash = hash === -1 ? safe : safe.slice(0, hash);
  const [path, search = ''] = withoutHash.split('?');
  if (!path || !ALLOWED_PATHS.has(path)) return null;
  const params = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    next.set(key, trimmed);
  }
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

const PATH_LABEL: Record<string, string> = {
  '/clientes': 'Clientes',
  '/cotizaciones': 'Cotizaciones',
  '/oportunidades': 'Oportunidades',
  '/trabajo': 'Trabajo',
  '/aprobaciones': 'Aprobaciones',
};

export function labelForViewHref(href: string): string | null {
  const canonical = canonicalViewHref(href);
  if (!canonical) return null;
  const builtIn = BUILT_IN_SAVED_VIEWS.find((view) => view.href === canonical);
  if (builtIn) return builtIn.label;
  const [path, search = ''] = canonical.split('?');
  const base = PATH_LABEL[path ?? ''] ?? 'Vista';
  const params = new URLSearchParams(search);
  const bits = [params.get('status'), params.get('view'), params.get('q')].filter(Boolean);
  return bits.length > 0 ? `${base}: ${bits.join(' · ')}` : base;
}

export function parsePinnedViews(raw: string | null): SavedView[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const views: SavedView[] = [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { id?: unknown; label?: unknown; href?: unknown };
    if (typeof row.href !== 'string') continue;
    const href = canonicalViewHref(row.href);
    if (!href || seen.has(href)) continue;
    const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : labelForViewHref(href);
    if (!label) continue;
    seen.add(href);
    views.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `pin:${href}`,
      label,
      detail: 'Guardada en este navegador.',
      href,
      source: 'pinned',
    });
    if (views.length >= PIN_LIMIT) break;
  }
  return views;
}

export function pinCurrentView(existing: readonly SavedView[], href: string): SavedView[] | null {
  const canonical = canonicalViewHref(href);
  if (!canonical) return null;
  const label = labelForViewHref(canonical);
  if (!label) return null;
  const pinned = existing.filter((view) => view.source === 'pinned' && view.href !== canonical);
  const next: SavedView = {
    id: `pin:${canonical}`,
    label,
    detail: 'Guardada en este navegador.',
    href: canonical,
    source: 'pinned',
  };
  return [next, ...pinned].slice(0, PIN_LIMIT);
}

export function listSavedViews(pinned: readonly SavedView[]): SavedView[] {
  const seen = new Set(BUILT_IN_SAVED_VIEWS.map((view) => view.href));
  const extra = pinned.filter((view) => view.source === 'pinned' && !seen.has(view.href));
  return [...BUILT_IN_SAVED_VIEWS, ...extra];
}
