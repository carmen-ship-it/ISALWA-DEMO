import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { formatOrderStatus } from '@/lib/commercial/labels';
import type { OrderDetailResponse, OrderListResponse } from '@/lib/commercial/types';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import {
  buildPostSalePedidoOption,
  type PostSalePedidoOption,
} from '@/lib/postsale/pedido-context';

const OPEN_ORDER_PAGE_LIMIT = 50;
const MAX_ORDER_DETAIL_FETCHES = 25;

/**
 * Load open Pedidos as human-readable post-sale handoff options.
 * Inherits customer / quote / lines / quantities from commercial SoR.
 */
export async function loadPostSalePedidos(client: OsApiClient): Promise<PostSalePedidoOption[]> {
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
  const details: OrderDetailResponse['order'][] = [];

  for (const summary of slice) {
    try {
      const { order } = await client.getOrder(summary.orderId);
      if (order.organizationId !== summary.organizationId) continue;
      if (order.status === 'cancelled') continue;
      details.push(order);
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

  const partyIds = [...new Set(details.map((row) => row.partyId).filter(Boolean))];
  const ownerIds = [...new Set(details.map((row) => row.ownerMemberId).filter(Boolean))];
  const partyLabels = await resolvePartyLabels(client, partyIds);
  const memberLabels = await resolveMemberLabels(client, ownerIds);

  const quoteNumbers = new Map<string, string>();
  for (const order of details) {
    if (!order.quoteId || quoteNumbers.has(order.quoteId)) continue;
    try {
      const { quote } = await client.getQuote(order.quoteId);
      if (quote.quoteNumber?.trim()) quoteNumbers.set(order.quoteId, quote.quoteNumber.trim());
    } catch {
      // Quote label stays generic when unavailable; Pedido context still works.
    }
  }

  const options: PostSalePedidoOption[] = [];
  for (const order of details) {
    const built = buildPostSalePedidoOption({
      organizationId: order.organizationId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      partyId: order.partyId,
      customerLabel: partyLabel(partyLabels, order.partyId),
      quoteId: order.quoteId,
      quoteNumber: order.quoteId ? quoteNumbers.get(order.quoteId) ?? null : null,
      ownerLabel: memberLabel(memberLabels, order.ownerMemberId),
      statusLabel: formatOrderStatus(order.status),
      lines: (order.lines ?? []).map((line) => ({
        orderLineId: line.orderLineId,
        productRef: line.productRef,
        description: line.description,
        quantity: line.quantity,
      })),
    });
    if (built) options.push(built);
  }

  return options.sort((left, right) => left.optionLabel.localeCompare(right.optionLabel, 'es'));
}
