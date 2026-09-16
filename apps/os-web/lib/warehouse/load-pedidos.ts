import type { WarehousePedidoFact } from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import type { OrderDetailResponse, OrderListResponse } from '@/lib/commercial/types';

const OPEN_ORDER_PAGE_LIMIT = 50;
const MAX_ORDER_DETAIL_FETCHES = 25;

/**
 * Maps tenant OsOrder + OsOrderLine snapshots into warehouse pedido facts.
 * Does not invent product catalog ids: productRef is used when present;
 * otherwise the canonical orderLineId is the product key for selection.
 * Customer display name is not invented when only partyId is known.
 */
export function mapOrderDetailToWarehousePedidos(
  detail: OrderDetailResponse['order'],
): WarehousePedidoFact[] {
  const organizationId = detail.organizationId?.trim() ?? '';
  const orderId = detail.orderId?.trim() ?? '';
  if (!organizationId || !orderId) return [];
  if (detail.status === 'cancelled') return [];
  const lines = detail.lines;
  if (!lines || lines.length === 0) return [];

  const orderLabel = detail.orderNumber?.trim() || null;
  const customerId = detail.partyId?.trim() || null;

  return lines
    .filter((line) => Boolean(line.orderLineId?.trim()))
    .map((line) => {
      const orderLineId = line.orderLineId.trim();
      const productRef = line.productRef?.trim() || '';
      return {
        organizationId,
        orderId,
        orderLabel,
        customerId,
        customerLabel: null,
        orderLineId,
        productId: productRef || orderLineId,
        productLabel: line.description?.trim() || null,
        orderedQuantity:
          typeof line.quantity === 'number' && Number.isFinite(line.quantity)
            ? String(line.quantity)
            : null,
      } satisfies WarehousePedidoFact;
    });
}

/**
 * Loads open tenant orders and their line snapshots for Almacén selection.
 * Failures that are auth/forbidden stay empty for the caller to gate separately.
 * A transport error rethrows so the page can surface error, not invent zeros.
 */
export async function loadWarehousePedidosFromOrders(
  client: OsApiClient,
): Promise<WarehousePedidoFact[]> {
  let list: OrderListResponse;
  try {
    list = await client.listOrders({ status: 'open', limit: OPEN_ORDER_PAGE_LIMIT });
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    throw err;
  }

  const open = (list.items ?? []).filter((item) => item.status !== 'cancelled');
  const slice = open.slice(0, MAX_ORDER_DETAIL_FETCHES);
  const pedidos: WarehousePedidoFact[] = [];

  for (const summary of slice) {
    try {
      const { order } = await client.getOrder(summary.orderId);
      if (order.organizationId !== summary.organizationId) continue;
      pedidos.push(...mapOrderDetailToWarehousePedidos(order));
    } catch (err) {
      if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
        continue;
      }
      if (err instanceof OsApiError && err.kind === 'not_found') {
        continue;
      }
      throw err;
    }
  }

  return pedidos;
}
