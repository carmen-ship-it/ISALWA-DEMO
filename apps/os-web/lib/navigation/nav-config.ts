export type NavItemState = 'active' | 'locked' | 'future';

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
};

/** Commercial-first production IA — employee vocabulary. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'inicio', href: '/inicio', labelKey: 'nav.inicio', icon: 'home' },
  { id: 'clientes', href: '/clientes', labelKey: 'nav.clientes', icon: 'users' },
  {
    id: 'oportunidades',
    href: '/oportunidades',
    labelKey: 'nav.oportunidades',
    icon: 'target',
  },
  {
    id: 'cotizaciones',
    href: '/cotizaciones',
    labelKey: 'nav.cotizaciones',
    icon: 'fileText',
  },
  { id: 'trabajo', href: '/trabajo', labelKey: 'nav.trabajo', icon: 'briefcase' },
  { id: 'aprobaciones', href: '/aprobaciones', labelKey: 'nav.aprobaciones', icon: 'check' },
  {
    id: 'administracion',
    href: '/administracion',
    labelKey: 'nav.administracion',
    icon: 'settings',
    requiresAdminProbe: true,
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
  },
  {
    id: 'mensajes',
    href: '/mensajes',
    labelKey: 'nav.mensajes',
    icon: 'message',
    state: 'locked',
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
