import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';

export type ComprasLinkedOrder = {
  orderId: string;
  orderNumber: string;
  partyId: string;
  status: string;
};

/**
 * Surfaces open tenant orders for orderId linking on Compras.
 * Does not invent purchase requests. SoR purchase write remains unwired.
 */
export async function loadComprasLinkedOrders(): Promise<ComprasLinkedOrder[]> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return [];
    const client = createOsApiClient(auth);
    const page = await client.listOrders({ status: 'open', limit: 50 });
    return (page.items ?? [])
      .filter((item) => item.status !== 'cancelled')
      .map((item) => ({
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        partyId: item.partyId,
        status: item.status,
      }));
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return [];
    }
    return [];
  }
}
