import { getServerOsAuthContext } from '@/lib/auth/actions';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { resolveEntregaSurface, type EntregaSurfaceStatus } from '@/lib/delivery/surface';
import {
  mapFulfillmentDeliveriesToPanel,
  mapFulfillmentExitsToPanel,
  mapOrdersToLinkedFacts,
  type FulfillmentDeliveryItem,
  type FulfillmentWarehouseExitItem,
  type LinkedOrderFact,
} from '@/lib/delivery/map-fulfillment';
import type { EntregaPanelProps } from '@/components/delivery/entrega-panel';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';

export type EntregaPageModel = {
  status: EntregaSurfaceStatus;
  warehouseExits: EntregaPanelProps['warehouseExits'];
  deliveries: EntregaPanelProps['deliveries'];
  linkedOrders: LinkedOrderFact[];
};

/**
 * Mounted read surface for /entregas.
 * Delivery/exit rows come from fulfillment reads when management.org.read holds.
 * Open orders are always surfaced from commercial SoR so pedido ids are not retyped.
 * Empty lists are honest. Auto-delivery-from-order is not invented.
 */
export async function loadEntregaPage(): Promise<EntregaPageModel> {
  let auth: Awaited<ReturnType<typeof getServerOsAuthContext>>;
  try {
    auth = await getServerOsAuthContext();
  } catch {
    return {
      status: 'error',
      warehouseExits: [],
      deliveries: [],
      linkedOrders: [],
    };
  }
  if (!auth) {
    return {
      status: 'permission',
      warehouseExits: [],
      deliveries: [],
      linkedOrders: [],
    };
  }

  const client = createOsApiClient(auth);
  const dataMode = await resolveDemoDataMode({});
  let linkedOrders: LinkedOrderFact[] = [];
  let warehouseExits: EntregaPanelProps['warehouseExits'] = [];
  let deliveries: EntregaPanelProps['deliveries'] = [];
  let fulfillmentDenied = false;
  let fulfillmentFailed = false;

  try {
    const orders = await client.listOrders({ status: 'open', limit: 50 });
    const raw = mapOrdersToLinkedFacts(orders.items ?? []);
    const partyLabels = await resolvePartyLabels(
      client,
      raw.map((row) => row.partyId).filter((id): id is string => Boolean(id)),
    );
    linkedOrders = filterByDemoDataMode(raw, dataMode, (row) =>
      isDemoDisplayName(partyLabel(partyLabels, row.partyId)),
    );
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      // Commercial read denied — still try fulfillment; page permission only if both fail.
    } else {
      return {
        status: 'error',
        warehouseExits: [],
        deliveries: [],
        linkedOrders: [],
      };
    }
  }

  const allowedOrderIds = new Set(linkedOrders.map((row) => row.orderId));

  try {
    const [exitPage, deliveryPage] = await Promise.all([
      client.listWarehouseExits(),
      client.listDeliveries(),
    ]);
    warehouseExits = mapFulfillmentExitsToPanel(
      (exitPage.items ?? []) as FulfillmentWarehouseExitItem[],
    ).filter((row) => !row.orderId || allowedOrderIds.has(row.orderId) || dataMode !== 'demo');
    deliveries = mapFulfillmentDeliveriesToPanel(
      (deliveryPage.items ?? []) as FulfillmentDeliveryItem[],
    ).filter((row) => !row.orderId || allowedOrderIds.has(row.orderId) || dataMode !== 'demo');
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      fulfillmentDenied = true;
    } else {
      fulfillmentFailed = true;
    }
  }

  const organizationId = auth.mode === 'dev' ? auth.session.organizationId : 'session';
  if (!organizationId) {
    return {
      status: 'permission',
      warehouseExits: [],
      deliveries: [],
      linkedOrders: [],
    };
  }

  // Fulfillment denied without linked orders is permission. Linked orders alone stay ready/empty.
  if (fulfillmentFailed && linkedOrders.length === 0) {
    return {
      status: 'error',
      warehouseExits: [],
      deliveries: [],
      linkedOrders: [],
    };
  }
  if (fulfillmentDenied && linkedOrders.length === 0 && warehouseExits.length === 0 && deliveries.length === 0) {
    return {
      status: 'permission',
      warehouseExits: [],
      deliveries: [],
      linkedOrders: [],
    };
  }

  const status = resolveEntregaSurface({
    organizationId,
    failed: fulfillmentFailed && linkedOrders.length === 0,
    warehouseExitCount: warehouseExits.length,
    deliveryCount: deliveries.length,
  });

  return {
    status,
    warehouseExits,
    deliveries,
    linkedOrders,
  };
}
