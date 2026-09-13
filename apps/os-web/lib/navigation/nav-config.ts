export type NavItemState = 'active' | 'locked' | 'future';

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  icon: 'home' | 'users' | 'briefcase' | 'check' | 'settings' | 'wallet' | 'message';
  /** When set, item is shown but not navigable — honest locked/future state. */
  state?: NavItemState;
  /** Requires server-side admin probe (people.admin). */
  requiresAdminProbe?: boolean;
};

/** Core production IA — employee vocabulary, not legacy demo nav. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'inicio', href: '/inicio', labelKey: 'nav.inicio', icon: 'home' },
  { id: 'clientes', href: '/clientes', labelKey: 'nav.clientes', icon: 'users' },
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

/** Future capabilities — honest LOCKED until Lane G+ enables them. */
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

export function filterNavByAccess(
  items: NavItem[],
  access: { showAdmin: boolean },
): NavItem[] {
  return items.filter((item) => {
    if (item.requiresAdminProbe && !access.showAdmin) return false;
    return true;
  });
}

export function isNavItemDisabled(item: NavItem): boolean {
  return item.state === 'locked' || item.state === 'future';
}
