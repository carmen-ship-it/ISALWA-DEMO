import { PRODUCTION_ENTRY_SCOPE, PRODUCTION_REVIEW_SCOPE } from '@/lib/production/access';

/**
 * Navigation request for the integrator.
 * Do not add this item in nav-config or app-nav from this lane.
 * Do not mount it on the pedido page. Do not add an order id.
 */
export const PRODUCCION_NAV_REQUEST = {
  id: 'produccion',
  href: '/produccion',
  label: 'Producción',
  entryScope: PRODUCTION_ENTRY_SCOPE,
  reviewScope: PRODUCTION_REVIEW_SCOPE,
  mountOn: 'manufacturing',
  doNotMountOnPedidoPage: true,
  doNotAddOrderId: true,
  icon: null,
} as const;

export const PRODUCCION_NAV_CROSS_LANE =
  'Wire this request in app-nav and nav-config. Reuse an existing icon. Do not mount the panel on the pedido page. Member scopes are not on the session read; the hosted write stays unproven until that scope is passed in.';
