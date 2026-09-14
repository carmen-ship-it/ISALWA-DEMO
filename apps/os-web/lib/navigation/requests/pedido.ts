/**
 * Route request for the shared Pedido case.
 * Other lanes link by these strings. Do not import their editors here.
 * A missing page is an honest link.
 */

export const PEDIDO_CASE_REQUEST_ID = 'pedido-case' as const;

export function pedidoCasePath(partyId: string, orderId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(orderId)}`;
}

export const PEDIDO_FUNCTION_ROUTES = {
  produccion: '/produccion',
  almacen: '/almacen',
  compras: '/compras',
  entregas: '/entregas',
} as const;

export type PedidoFunctionRoute = (typeof PEDIDO_FUNCTION_ROUTES)[keyof typeof PEDIDO_FUNCTION_ROUTES];

export const PEDIDO_FUNCTION_LABELS: Record<keyof typeof PEDIDO_FUNCTION_ROUTES, string> = {
  produccion: 'Producción',
  almacen: 'Almacén',
  compras: 'Compras',
  entregas: 'Entregas',
};
