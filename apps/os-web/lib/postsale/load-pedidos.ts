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
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import type { DemoDataMode } from '@/lib/demo/owner-demo-identity';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';

const OPEN_ORDER_PAGE_LIMIT = 50;
const MAX_ORDER_DETAIL_FETCHES = 25;

export type LoadPostSalePedidosOptions = {
  /** Required for delivery-ops fallback mapping (ops payload has no org field). */
  organizationId?: string | null;
  /** When set, keep only Pedidos whose party display name matches Demo/Real mode. */
  dataMode?: 'real' | 'demo';
  listCaps?: ListCap[];
};

/**
 * Load open Pedidos as human-readable post-sale handoff options.
 * Prefers commercial SoR when readable; falls back to delivery-ops for
 * warehouse/delivery writers who lack commercial-read (same Pedido facts, no money).
 */
export async function loadPostSalePedidos(
  client: OsApiClient,
  options: LoadPostSalePedidosOptions = {},
): Promise<PostSalePedidoOption[]> {
  const fromCommercial = await loadFromCommercial(client, options.dataMode, options.listCaps);
  if (fromCommercial.length > 0) return fromCommercial;

  const organizationId = options.organizationId?.trim() ?? '';
  if (!organizationId) return [];
  return loadFromDeliveryOps(client, organizationId, options.dataMode);
}

async function loadFromCommercial(
  client: OsApiClient,
  dataMode?: DemoDataMode,
  listCaps?: ListCap[],
): Promise<PostSalePedidoOption[]> {
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
  pushListCap(listCaps, { ...list, items: open }, OPEN_ORDER_PAGE_LIMIT, slice.length);
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
    const customer = partyLabel(partyLabels, order.partyId);
    if (dataMode) {
      const keep = filterByDemoDataMode([{ customer }], dataMode, (row) =>
        isDemoDisplayName(row.customer),
      );
      if (keep.length === 0) continue;
    }
    const built = buildPostSalePedidoOption({
      organizationId: order.organizationId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      partyId: order.partyId,
      customerLabel: customer,
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

async function loadFromDeliveryOps(
  client: OsApiClient,
  organizationId: string,
  dataMode?: DemoDataMode,
): Promise<PostSalePedidoOption[]> {
  let items: Awaited<ReturnType<OsApiClient['listDeliveryOperationalOrders']>>['items'] = [];
  try {
    const page = await client.listDeliveryOperationalOrders();
    items = page.items ?? [];
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    throw err;
  }

  const options: PostSalePedidoOption[] = [];
  for (const order of items) {
    if (order.status === 'cancelled') continue;
    if (dataMode) {
      const keep = filterByDemoDataMode([{ name: order.customerName }], dataMode, (row) =>
        isDemoDisplayName(row.name),
      );
      if (keep.length === 0) continue;
    }
    const built = buildPostSalePedidoOption({
      organizationId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      partyId: order.partyId,
      customerLabel: order.customerName,
      quoteId: null,
      quoteNumber: null,
      ownerLabel: null,
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
