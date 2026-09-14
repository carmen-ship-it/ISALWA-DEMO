import { safeInternalPath } from '@/lib/shell/safe-next';
import {
  rememberRecent,
  type PaletteItem,
  type PaletteKind,
  type StoredRecent,
} from '@/lib/shell/command-palette';

const USEFUL_KINDS = new Set<PaletteKind>([
  'customer',
  'quote',
  'order',
  'opportunity',
  'work',
  'follow-up',
]);

const KIND_LABEL: Partial<Record<PaletteKind, string>> = {
  customer: 'Cliente',
  quote: 'Cotización',
  order: 'Pedido',
  opportunity: 'Oportunidad',
  work: 'Trabajo',
  'follow-up': 'Seguimiento',
};

export function recentKindLabel(kind: string | undefined): string | null {
  if (!kind || !(kind in KIND_LABEL)) return null;
  return KIND_LABEL[kind as PaletteKind] ?? null;
}

export function formatRecentDetail(kind: string | undefined, detail?: string): string | undefined {
  const label = recentKindLabel(kind);
  const trimmed = detail?.trim();
  if (!label) return trimmed || undefined;
  if (!trimmed) return label;
  if (trimmed === label || trimmed.startsWith(`${label} · `) || trimmed.startsWith(`${label}·`)) {
    return trimmed;
  }
  return `${label} · ${trimmed}`;
}

export function rememberUsefulRecent(
  existing: readonly PaletteItem[],
  item: PaletteItem,
): StoredRecent[] {
  if (!USEFUL_KINDS.has(item.kind) || !safeInternalPath(item.href)) {
    return rememberRecent(existing, item);
  }
  return rememberRecent(existing, {
    ...item,
    detail: formatRecentDetail(item.kind, item.detail),
  });
}

type StoredShape = Partial<StoredRecent> & { kind?: string };

export function parseUsefulRecents(raw: string | null): PaletteItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: PaletteItem[] = [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as StoredShape;
    if (typeof row.href !== 'string' || !safeInternalPath(row.href)) continue;
    if (typeof row.label !== 'string' || !row.label.trim()) continue;
    if (typeof row.key !== 'string' || !row.key) continue;
    if (seen.has(row.href)) continue;
    seen.add(row.href);
    const storedKind = typeof row.kind === 'string' ? row.kind : undefined;
    items.push({
      key: `recent:${row.key}`,
      kind: 'recent',
      label: row.label.trim(),
      detail: formatRecentDetail(storedKind, typeof row.detail === 'string' ? row.detail : undefined),
      href: row.href,
    });
    if (items.length >= 6) break;
  }
  return items;
}
