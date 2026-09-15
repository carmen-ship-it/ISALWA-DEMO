export type NavItemState = 'active' | 'locked' | 'future';

/**
 * Authority classification for primary / future nav.
 * VISIBLE+ACTIVE — shown and navigable; destination may still fail-closed inside.
 * READ-ONLY — shown with an honest non-mutating destination (none in primary today).
 * HIDDEN — omitted from shell until the matching authority exists.
 * FUTURE — product surface not enabled; if shown, must carry locked/future labeling.
 */
export type NavAccessClass = 'VISIBLE+ACTIVE' | 'READ-ONLY' | 'HIDDEN' | 'FUTURE';

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
    | 'message';
  /** When set, item is shown but not navigable — honest locked/future state. */
  state?: NavItemState;
  /** Requires server-side admin probe (people.admin). */
  requiresAdminProbe?: boolean;
  /**
   * Declared access class. Filtering may hide HIDDEN items; FUTURE stays out of
   * primary until product enables them with clear locked labeling.
   */
  accessClass: NavAccessClass;
};

/** Commercial-first production IA — employee vocabulary. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'inicio', href: '/inicio', labelKey: 'nav.inicio', icon: 'home', accessClass: 'VISIBLE+ACTIVE' },
  { id: 'clientes', href: '/clientes', labelKey: 'nav.clientes', icon: 'users', accessClass: 'VISIBLE+ACTIVE' },
  {
    id: 'oportunidades',
    href: '/oportunidades',
    labelKey: 'nav.oportunidades',
    icon: 'target',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'cotizaciones',
    href: '/cotizaciones',
    labelKey: 'nav.cotizaciones',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
  },
  { id: 'trabajo', href: '/trabajo', labelKey: 'nav.trabajo', icon: 'briefcase', accessClass: 'VISIBLE+ACTIVE' },
  { id: 'productos', href: '/productos', labelKey: 'nav.productos', icon: 'fileText', accessClass: 'VISIBLE+ACTIVE' },
  {
    id: 'produccion',
    href: '/produccion',
    labelKey: 'nav.produccion',
    icon: 'briefcase',
    // Desk stays visible; write/record authority is enforced inside the page.
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'almacen',
    href: '/almacen',
    labelKey: 'nav.almacen',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'compras',
    href: '/compras',
    labelKey: 'nav.compras',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'entregas',
    href: '/entregas',
    labelKey: 'nav.entregas',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'coordinacion',
    href: '/coordinacion',
    labelKey: 'nav.coordinacion',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'aprobaciones',
    href: '/aprobaciones',
    labelKey: 'nav.aprobaciones',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
  },
  {
    id: 'administracion',
    href: '/administracion',
    labelKey: 'nav.administracion',
    icon: 'settings',
    requiresAdminProbe: true,
    // people.admin only. system.admin Controles del sistema uses /sistema, not this link.
    accessClass: 'HIDDEN',
  },
];

/**
 * Capability-locked surfaces — kept for direct-route gating only.
 * Intentionally omitted from primary nav until product enables them.
 */
export const FUTURE_NAV: NavItem[] = [
  {
    id: 'finanzas',
    href: '/finanzas',
    labelKey: 'nav.finanzas',
    icon: 'wallet',
    state: 'locked',
    accessClass: 'FUTURE',
  },
  {
    id: 'mensajes',
    href: '/mensajes',
    labelKey: 'nav.mensajes',
    icon: 'message',
    state: 'locked',
    accessClass: 'FUTURE',
  },
];

/** Ids that must never appear in the primary shell nav for now. */
export const HIDDEN_PRIMARY_NAV_IDS = ['finanzas', 'mensajes'] as const;

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
