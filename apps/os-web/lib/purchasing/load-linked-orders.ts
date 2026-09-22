import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';

export type ComprasLinkedOrder = {
  orderId: string;
  orderNumber: string;
  partyId: string;
  status: string;
  customerLabel: string;
};

/**
 * Surfaces open tenant orders for orderId linking on Compras.
 * Prefers commercial SoR when readable; falls back to delivery-ops for
 * purchasing writers who lack commercial-read (same Pedido facts, no money).
 * Does not invent purchase requests. SoR purchase write remains unwired.
 */
export async function loadComprasLinkedOrders(listCaps?: ListCap[]): Promise<ComprasLinkedOrder[]> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return [];
    const client = createOsApiClient(auth);
    const dataMode = await resolveDemoDataMode({});
    const fromCommercial = await loadLinkedFromCommercial(client, dataMode, listCaps);
    if (fromCommercial.length > 0) return fromCommercial;

    const capabilities = await loadMemberCapabilities();
    const organizationId = capabilities?.organizationId?.trim() ?? '';
    if (!organizationId) return [];
    return loadLinkedFromDeliveryOps(client, dataMode);
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    return [];
  }
}

async function loadLinkedFromCommercial(
  client: ReturnType<typeof createOsApiClient>,
  dataMode: Awaited<ReturnType<typeof resolveDemoDataMode>>,
  listCaps?: ListCap[],
): Promise<ComprasLinkedOrder[]> {
  let page: Awaited<ReturnType<typeof client.listOrders>>;
  try {
    page = await client.listOrders({ status: 'open', limit: 50 });
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    throw err;
  }
  pushListCap(listCaps, page, 50);
  const items = (page.items ?? []).filter((item) => item.status !== 'cancelled');
  const partyLabels = await resolvePartyLabels(
    client,
    items.map((item) => item.partyId),
  );
  return filterByDemoDataMode(items, dataMode, (item) =>
    isDemoDisplayName(partyLabel(partyLabels, item.partyId)),
  ).map((item) => ({
    orderId: item.orderId,
    orderNumber: item.orderNumber,
    partyId: item.partyId,
    status: item.status,
    customerLabel: partyLabel(partyLabels, item.partyId),
  }));
}

async function loadLinkedFromDeliveryOps(
  client: ReturnType<typeof createOsApiClient>,
  dataMode: Awaited<ReturnType<typeof resolveDemoDataMode>>,
): Promise<ComprasLinkedOrder[]> {
  let items: Awaited<ReturnType<typeof client.listDeliveryOperationalOrders>>['items'] = [];
  try {
    const page = await client.listDeliveryOperationalOrders();
    items = page.items ?? [];
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    throw err;
  }

  const mapped = items
    .filter((item) => item.status !== 'cancelled')
    .map((item) => ({
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      partyId: item.partyId,
      status: item.status,
      customerLabel: item.customerName,
    }));

  return filterByDemoDataMode(mapped, dataMode, (item) => isDemoDisplayName(item.customerLabel));
}
