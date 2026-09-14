/**
 * Navigation request for the purchasing queue.
 * CROSS_LANE: do not edit app-nav or nav-config.ts from this lane.
 * Coordination mounts this item. The page at /compras is already mounted here.
 */
export const COMPRAS_NAV_REQUEST = {
  id: 'compras',
  href: '/compras',
  label: 'Compras',
  labelKey: 'nav.compras',
  state: 'active',
  owner: 'wave2/purchases',
  reason:
    'Cola de pedidos de compra. El área responsable pide. La encargada de compras compra. No es inventario.',
} as const;
