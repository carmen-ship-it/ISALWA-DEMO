export type NavItemState = 'active' | 'locked' | 'future';

/**
 * Authority classification for primary / future nav.
 * VISIBLE+ACTIVE — shown and navigable; destination may still fail-closed inside.
 * READ-ONLY — shown with an honest non-mutating destination (none in primary today).
 * HIDDEN — omitted from shell until the matching authority exists.
 * FUTURE — product surface not enabled; if shown, must carry locked/future labeling.
 */
export type NavAccessClass = 'VISIBLE+ACTIVE' | 'READ-ONLY' | 'HIDDEN' | 'FUTURE';

/** Visual grouping only — does not authorize or hide destinations. */
export type NavGroup = 'principal' | 'comercial' | 'operaciones' | 'decisiones' | 'admin';

export const NAV_GROUP_LABEL: Record<NavGroup, string | null> = {
  principal: null,
  comercial: 'Comercial',
  operaciones: 'Operaciones',
  decisiones: 'Decisiones',
  admin: null,
};

export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  'principal',
  'comercial',
  'operaciones',
  'decisiones',
  'admin',
];

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  icon:
    | 'home'
    | 'users'
    | 'target'
    | 'fileText'
    | 'briefcase'
    | 'check'
    | 'settings'
    | 'wallet'
    | 'message'
    | 'map'
    | 'alertCircle';
  /** When set, item is shown but not navigable — honest locked/future state. */
  state?: NavItemState;
  /** Requires server-side admin probe (people.admin). */
  requiresAdminProbe?: boolean;
  /**
   * Declared access class. Filtering may hide HIDDEN items; FUTURE stays out of
   * primary until product enables them with clear locked labeling.
   */
  accessClass: NavAccessClass;
  /** Display section in the shell. Never used as an authority gate. */
  group?: NavGroup;
};

/** Commercial-first production IA — employee vocabulary. */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: 'inicio',
    href: '/inicio',
    labelKey: 'nav.inicio',
    icon: 'home',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'principal',
  },
  {
    id: 'clientes',
    href: '/clientes',
    labelKey: 'nav.clientes',
    icon: 'users',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'mapa',
    href: '/mapa',
    labelKey: 'nav.mapa',
    icon: 'map',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'oportunidades',
    href: '/oportunidades',
    labelKey: 'nav.oportunidades',
    icon: 'target',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'cotizaciones',
    href: '/cotizaciones',
    labelKey: 'nav.cotizaciones',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'trabajo',
    href: '/trabajo',
    labelKey: 'nav.trabajo',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'productos',
    href: '/productos',
    labelKey: 'nav.productos',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'produccion',
    href: '/produccion',
    labelKey: 'nav.produccion',
    icon: 'briefcase',
    // Desk stays visible; write/record authority is enforced inside the page.
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'almacen',
    href: '/almacen',
    labelKey: 'nav.almacen',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'compras',
    href: '/compras',
    labelKey: 'nav.compras',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'finanzas',
    href: '/finanzas',
    labelKey: 'nav.finanzas',
    icon: 'wallet',
    // Operational desk gated by finance.operational.record inside the page.
    // Product capability finance stays LOCKED (no official ledger).
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'entregas',
    href: '/entregas',
    labelKey: 'nav.entregas',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'coordinacion',
    href: '/coordinacion',
    labelKey: 'nav.coordinacion',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'decisiones',
  },
  {
    id: 'aprobaciones',
    href: '/aprobaciones',
    labelKey: 'nav.aprobaciones',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'decisiones',
  },
  {
    id: 'incidencias',
    href: '/incidencias',
    labelKey: 'nav.incidencias',
    icon: 'alertCircle',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'decisiones',
  },
  {
    id: 'administracion',
    href: '/administracion',
    labelKey: 'nav.administracion',
    icon: 'settings',
    requiresAdminProbe: true,
    // people.admin only. system.admin Controles del sistema uses /sistema, not this link.
    accessClass: 'HIDDEN',
    group: 'admin',
  },
];

/**
 * Capability-locked surfaces — kept for direct-route gating only.
 * Product messaging stays here. /finanzas is the operational desk gated by
 * finance.operational.record, not by product capability finance=ACTIVE.
 */
export const FUTURE_NAV: NavItem[] = [
  {
    id: 'mensajes',
    href: '/mensajes',
    labelKey: 'nav.mensajes',
    icon: 'message',
    state: 'locked',
    accessClass: 'FUTURE',
    group: 'operaciones',
  },
];

/** Ids that must never appear in the primary shell nav for now. */
export const HIDDEN_PRIMARY_NAV_IDS = ['mensajes'] as const;

const HIDDEN_PRIMARY_NAV_ID_SET = new Set<string>(HIDDEN_PRIMARY_NAV_IDS);

export function filterNavByAccess(
  items: NavItem[],
  access: { showAdmin: boolean },
): NavItem[] {
  return items.filter((item) => {
    if (HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return false;
    if (item.requiresAdminProbe && !access.showAdmin) return false;
    return true;
  });
}

export function primaryNavIds(access: { showAdmin: boolean }): string[] {
  return filterNavByAccess(PRIMARY_NAV, access).map((item) => item.id);
}

export function isNavItemDisabled(item: NavItem): boolean {
  return item.state === 'locked' || item.state === 'future';
}

export function classifyNavItem(item: NavItem, access: { showAdmin: boolean }): NavAccessClass {
  if (item.accessClass === 'FUTURE' || HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return 'FUTURE';
  if (item.requiresAdminProbe && !access.showAdmin) return 'HIDDEN';
  if (item.requiresAdminProbe && access.showAdmin) return 'VISIBLE+ACTIVE';
  return item.accessClass;
}

/** Group visible items for shell hierarchy. Order within each group matches PRIMARY_NAV. */
export function groupNavItems(items: readonly NavItem[]): Array<{
  group: NavGroup;
  label: string | null;
  items: NavItem[];
}> {
  const buckets = new Map<NavGroup, NavItem[]>();
  for (const group of NAV_GROUP_ORDER) buckets.set(group, []);
  for (const item of items) {
    const group = item.group ?? 'principal';
    const list = buckets.get(group) ?? buckets.get('principal')!;
    list.push(item);
  }
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    label: NAV_GROUP_LABEL[group],
    items: buckets.get(group) ?? [],
  })).filter((section) => section.items.length > 0);
}
