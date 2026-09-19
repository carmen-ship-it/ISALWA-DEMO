import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
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
 * Does not invent purchase requests. SoR purchase write remains unwired.
 */
export async function loadComprasLinkedOrders(listCaps?: ListCap[]): Promise<ComprasLinkedOrder[]> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return [];
    const client = createOsApiClient(auth);
    const dataMode = await resolveDemoDataMode({});
    const page = await client.listOrders({ status: 'open', limit: 50 });
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
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    return [];
  }
}
