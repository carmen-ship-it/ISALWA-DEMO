/**
 * Navigation request only. This lane does not edit app-nav or nav-config.
 * CROSS_LANE: add Almacén to the shell only from the navigation owner.
 * Reuse an existing icon. Do not mount this from the pedido page.
 * Do not treat the item as stock or as Entregas.
 */
export const ALMACEN_NAV_REQUEST = {
  id: 'almacen-primary-nav',
  lane: 'warehouse',
  owner: 'navigation',
  classification: 'SHARED_CONTRACT_BLOCKED',
  target: 'apps/os-web/lib/navigation/nav-config.ts and apps/os-web/components/shell/app-nav.tsx',
  href: '/almacen',
  label: 'Almacén',
  icon: 'briefcase',
  required: false,
  request:
    'Expose /almacen in primary navigation after warehouse.finished_goods.allocate can be confirmed on the session. The cargo Encargado de Almacén does not grant it. Do not link this item to a stock total or to the nota de entrega.',
  unblock:
    'Navigation owner adds the item with an existing icon. This lane does not edit app-nav. Session scopes are not on the web session today, so the route fails closed to permission until they are.',
} as const;

export type AlmacenNavRequest = typeof ALMACEN_NAV_REQUEST;
