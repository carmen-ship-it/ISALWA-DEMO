import {
  clienteSectionHref,
  newOpportunityHref,
  newQuoteHref,
  opportunityHref,
  orderHref,
  quoteHref,
} from '@/lib/commercial/navigation';
import { formatOpportunityStatus, formatOrderStatus, formatQuoteStatus } from '@/lib/commercial/labels';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { filterNavByAccess, PRIMARY_NAV } from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';
import { formatWorkStatus } from '@/lib/work/labels';
import { isEngineeringFixtureCopy, usableStaffTitle } from '@/lib/work/staff-subject';
import { workItemHref } from '@/lib/work/navigation';

export const PALETTE_MIN_QUERY = 2;
export const PALETTE_GROUP_LIMIT = 6;
export const RECENTS_LIMIT = 6;
export const RECENTS_STORAGE_PREFIX = 'isalwa-os-palette-v1';

export type PaletteKind =
  | 'action'
  | 'nav'
  | 'recent'
  | 'customer'
  | 'opportunity'
  | 'quote'
  | 'order'
  | 'work'
  | 'follow-up';

export type PalettePick = 'customer-opportunity' | 'customer-follow-up' | 'opportunity-quote';

export type PaletteItem = {
  key: string;
  kind: PaletteKind;
  label: string;
  detail?: string;
  href: string;
  pick?: PalettePick;
  /** Navigation only. Never render as the primary label. */
  partyId?: string;
  opportunityId?: string;
};

export type PaletteAccess = {
  canCreateCustomer: boolean;
  canInvite: boolean;
};

const FOLLOW_UP_SUBJECTS = new Set(['party', 'commercial_account']);

export function isFollowUpSubject(subjectType: string | null | undefined): boolean {
  return Boolean(subjectType && FOLLOW_UP_SUBJECTS.has(subjectType));
}

export function recentsStorageKey(actorKey: string): string | null {
  const key = actorKey.trim();
  if (!key || key.includes('..') || key.length > 200) return null;
  return `${RECENTS_STORAGE_PREFIX}:${key}`;
}

export function paletteActions(access: PaletteAccess): PaletteItem[] {
  const items: PaletteItem[] = [];
  if (access.canCreateCustomer) {
    items.push({
      key: 'action:customer',
      kind: 'action',
      label: 'Agregar cliente',
      detail: 'Nuevo registro',
      href: '/clientes/nuevo',
    });
  }
  items.push(
    {
      key: 'action:opportunity',
      kind: 'action',
      label: 'Nueva oportunidad',
      detail: 'Elija el cliente',
      href: '/clientes',
      pick: 'customer-opportunity',
    },
    {
      key: 'action:quote',
      kind: 'action',
      label: 'Crear cotización',
      detail: 'Elija la oportunidad',
      href: '/oportunidades',
      pick: 'opportunity-quote',
    },
    {
      key: 'action:follow-up',
      kind: 'action',
      label: 'Registrar seguimiento',
      detail: 'Elija el cliente',
      href: '/clientes',
      pick: 'customer-follow-up',
    },
    {
      key: 'action:report-issue',
      kind: 'action',
      label: 'Reportar problema',
      detail: 'Nueva incidencia',
      href: '/incidencias/reportar',
    },
  );
  if (access.canInvite) {
    items.push({
      key: 'action:invite',
      kind: 'action',
      label: 'Invitar empleado',
      detail: 'Administración',
      href: '/administracion/equipo/invitar',
    });
  }
  items.push({
    key: 'action:how-we-work',
    kind: 'action',
    label: 'Cómo trabajamos',
    detail: 'Ayuda',
    href: '/ayuda',
  });
  return items;
}

type PalettePathContext =
  | { kind: 'customer'; partyId: string }
  | { kind: 'opportunity'; partyId: string; opportunityId: string };

function pathnameOnly(input: string): string {
  const cut = input.trim().split(/[?#]/, 1)[0] ?? '';
  if (!cut.startsWith('/') || cut.startsWith('//')) return '';
  return cut.length > 1 ? cut.replace(/\/+$/, '') : cut;
}

function decodePathSegment(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const id = decoded.trim();
  if (!id || id === '.' || id === '..') return null;
  if (/[/?#\\]/.test(id)) return null;
  return id;
}

/** Ids already present in the URL. Does not infer owner, price, approver, or stage. */
export function palettePathContext(pathname: string): PalettePathContext | null {
  const path = pathnameOnly(pathname);
  const opportunity = path.match(/^\/clientes\/([^/]+)\/oportunidades\/([^/]+)$/);
  if (opportunity) {
    const partyId = decodePathSegment(opportunity[1] ?? '');
    const opportunityId = decodePathSegment(opportunity[2] ?? '');
    if (!partyId || partyId === 'nuevo' || !opportunityId || opportunityId === 'nueva') return null;
    return { kind: 'opportunity', partyId, opportunityId };
  }
  const customer = path.match(/^\/clientes\/([^/]+)$/);
  if (!customer) return null;
  const partyId = decodePathSegment(customer[1] ?? '');
  if (!partyId || partyId === 'nuevo') return null;
  return { kind: 'customer', partyId };
}

function directAction(item: PaletteItem, href: string): PaletteItem {
  return {
    key: item.key,
    kind: item.kind,
    label: item.label,
    href,
  };
}

export function contextualPaletteActions(pathname: string, access: PaletteAccess): PaletteItem[] {
  const actions = paletteActions(access);
  const context = palettePathContext(pathname);
  if (!context) return actions;

  return actions.map((item) => {
    if (context.kind === 'customer' && item.key === 'action:opportunity') {
      return directAction(item, newOpportunityHref(context.partyId));
    }
    if (context.kind === 'customer' && item.key === 'action:follow-up') {
      return directAction(item, clienteSectionHref(context.partyId, 'trabajo'));
    }
    if (context.kind === 'opportunity' && item.key === 'action:quote') {
      return directAction(item, newQuoteHref(context.partyId, context.opportunityId));
    }
    return item;
  });
}

export function paletteNav(showAdmin: boolean): PaletteItem[] {
  return filterNavByAccess(PRIMARY_NAV, { showAdmin }).map((item) => ({
    key: `nav:${item.id}`,
    kind: 'nav' as const,
    label: t(item.labelKey),
    href: item.href,
  }));
}

export function customerPaletteItem(input: {
  partyId: string;
  displayName: string;
  legalName: string | null;
  status: string;
}): PaletteItem {
  const name = input.displayName.trim() || 'Cliente';
  const legal = input.legalName?.trim();
  const inactive = input.status !== 'active' ? 'Inactiva' : null;
  const detail = [legal && legal !== name ? legal : null, inactive].filter(Boolean).join(' · ');
  return {
    key: `customer:${input.partyId}`,
    kind: 'customer',
    label: name,
    detail: detail || undefined,
    href: `/clientes/${encodeURIComponent(input.partyId)}`,
    partyId: input.partyId,
  };
}

export function opportunityPaletteItem(input: {
  opportunityId: string;
  partyId: string;
  title: string;
  status: string;
}): PaletteItem {
  return {
    key: `opportunity:${input.opportunityId}`,
    kind: 'opportunity',
    label: input.title.trim() || 'Oportunidad',
    detail: formatOpportunityStatus(input.status),
    href: opportunityHref(input.partyId, input.opportunityId),
    partyId: input.partyId,
    opportunityId: input.opportunityId,
  };
}

export function quotePaletteItem(input: {
  quoteId: string;
  partyId: string;
  quoteNumber: string;
  status: string;
  totalCentavos: string;
  currency: string;
}): PaletteItem {
  const total = formatOptionalCentavos(input.totalCentavos, input.currency);
  return {
    key: `quote:${input.quoteId}`,
    kind: 'quote',
    label: input.quoteNumber.trim() || 'Cotización',
    detail: [formatQuoteStatus(input.status), total].filter(Boolean).join(' · '),
    href: quoteHref(input.partyId, input.quoteId),
  };
}

export function orderPaletteItem(input: {
  orderId: string;
  partyId: string;
  orderNumber: string;
  status: string;
}): PaletteItem {
  return {
    key: `order:${input.orderId}`,
    kind: 'order',
    label: input.orderNumber.trim() || 'Pedido',
    detail: formatOrderStatus(input.status),
    href: orderHref(input.partyId, input.orderId),
  };
}

export function workPaletteItem(input: {
  workItemId: string;
  title: string;
  status: string;
  subjectType: string | null;
}): PaletteItem {
  const followUp = isFollowUpSubject(input.subjectType);
  const label = usableStaffTitle(input.title) ?? (followUp ? 'Seguimiento' : 'Trabajo');
  return {
    key: `${followUp ? 'follow-up' : 'work'}:${input.workItemId}`,
    kind: followUp ? 'follow-up' : 'work',
    label,
    detail: formatWorkStatus(input.status),
    href: workItemHref(input.workItemId),
  };
}

export function applyPick(item: PaletteItem, pick: PalettePick): PaletteItem | null {
  if (pick === 'customer-opportunity' && item.kind === 'customer' && item.partyId) {
    return { ...item, href: newOpportunityHref(item.partyId), detail: 'Nueva oportunidad' };
  }
  if (pick === 'customer-follow-up' && item.kind === 'customer' && item.partyId) {
    return { ...item, href: clienteSectionHref(item.partyId, 'trabajo'), detail: 'Registrar seguimiento' };
  }
  if (pick === 'opportunity-quote' && item.kind === 'opportunity' && item.partyId && item.opportunityId) {
    return { ...item, href: newQuoteHref(item.partyId, item.opportunityId), detail: 'Crear cotización' };
  }
  return null;
}

const GROUP_ORDER: Array<{ id: PaletteKind | 'action' | 'nav' | 'recent'; label: string }> = [
  { id: 'action', label: 'Acciones' },
  { id: 'recent', label: 'Recientes' },
  { id: 'customer', label: 'Clientes' },
  { id: 'opportunity', label: 'Oportunidades' },
  { id: 'quote', label: 'Cotizaciones' },
  { id: 'order', label: 'Pedidos' },
  { id: 'follow-up', label: 'Seguimientos' },
  { id: 'work', label: 'Trabajo' },
  { id: 'nav', label: 'Ir a' },
];

export function groupPaletteItems(items: readonly PaletteItem[]): Array<{ id: string; label: string; items: PaletteItem[] }> {
  return GROUP_ORDER.map((group) => ({
    id: group.id,
    label: group.label,
    items: items.filter((item) => item.kind === group.id).slice(0, PALETTE_GROUP_LIMIT),
  })).filter((group) => group.items.length > 0);
}

export function matchesPaletteQuery(item: PaletteItem, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('es');
  if (!q) return true;
  return `${item.label} ${item.detail ?? ''}`.toLocaleLowerCase('es').includes(q);
}

export type StoredRecent = {
  key: string;
  label: string;
  detail?: string;
  href: string;
  kind: PaletteKind;
};

export function parseRecents(raw: string | null): PaletteItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items: PaletteItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Partial<StoredRecent>;
    if (typeof row.href !== 'string' || !row.href.startsWith('/') || row.href.startsWith('//')) continue;
    if (typeof row.label !== 'string' || !row.label.trim()) continue;
    if (isEngineeringFixtureCopy(row.label) || isEngineeringFixtureCopy(row.detail)) continue;
    if (typeof row.key !== 'string' || !row.key) continue;
    items.push({
      key: `recent:${row.key}`,
      kind: 'recent',
      label: row.label.trim(),
      detail: typeof row.detail === 'string' ? row.detail : undefined,
      href: row.href,
    });
    if (items.length >= RECENTS_LIMIT) break;
  }
  return items;
}

export function rememberRecent(existing: readonly PaletteItem[], item: PaletteItem): StoredRecent[] {
  if (item.kind === 'action' || item.kind === 'nav' || item.kind === 'recent') {
    return existing
      .filter((row) => row.kind === 'recent')
      .slice(0, RECENTS_LIMIT)
      .map(toStored);
  }
  const next: PaletteItem[] = [
    { ...item, key: item.key, kind: 'recent' },
    ...existing.filter((row) => row.kind === 'recent' && row.href !== item.href),
  ];
  return next.slice(0, RECENTS_LIMIT).map(toStored);
}

function toStored(item: PaletteItem): StoredRecent {
  return {
    key: item.key.replace(/^recent:/, ''),
    label: item.label,
    detail: item.detail,
    href: item.href,
    kind: item.kind === 'recent' ? 'customer' : item.kind,
  };
}
