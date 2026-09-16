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
  let linkedOrders: LinkedOrderFact[] = [];
  let warehouseExits: EntregaPanelProps['warehouseExits'] = [];
  let deliveries: EntregaPanelProps['deliveries'] = [];
  let fulfillmentDenied = false;
  let fulfillmentFailed = false;

  try {
    const orders = await client.listOrders({ status: 'open', limit: 50 });
    linkedOrders = mapOrdersToLinkedFacts(orders.items ?? []);
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

  try {
    const [exitPage, deliveryPage] = await Promise.all([
      client.listWarehouseExits(),
      client.listDeliveries(),
    ]);
    warehouseExits = mapFulfillmentExitsToPanel(
      (exitPage.items ?? []) as FulfillmentWarehouseExitItem[],
    );
    deliveries = mapFulfillmentDeliveriesToPanel(
      (deliveryPage.items ?? []) as FulfillmentDeliveryItem[],
    );
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
