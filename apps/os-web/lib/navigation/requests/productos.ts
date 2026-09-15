import type { NavItem } from '../nav-config';

/**
 * CROSS_LANE: merge into PRIMARY_NAV. Do not edit nav-config.ts, app-nav.tsx,
 * app-shell.tsx, or command-palette.tsx in this lane.
 * labelKey nav.productos is not in the message catalogs yet.
 * The icon union has no product icon; fileText is a placeholder for integration.
 */
export const PRODUCTOS_NAV_REQUEST: NavItem = {
  id: 'productos',
  href: '/productos',
  labelKey: 'nav.productos',
  icon: 'fileText',
  accessClass: 'VISIBLE+ACTIVE',
};
