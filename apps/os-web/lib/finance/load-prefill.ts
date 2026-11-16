import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';

export type FinancePrefill = {
  customerId: string;
  customerLabel: string;
  orderId: string;
};

/**
 * /finanzas?partyId=… or ?orderId=… arrives from a customer or order screen. The customer comes
 * from the API (tenant-scoped, fail closed); nothing is invented when the lookup is not allowed.
 */
export async function loadFinancePrefill(input: {
  partyId: string | null;
  orderId: string | null;
}): Promise<FinancePrefill | null> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return null;
    const client = createOsApiClient(auth);
    let customerId = input.partyId ?? '';
    let orderId = '';
    if (input.orderId) {
      const detail = await client.getOrder(input.orderId);
      customerId = detail.order.partyId;
      orderId = detail.order.orderId;
    }
    if (!customerId) return null;
    const labels = await resolvePartyLabels(client, [customerId]);
    return { customerId, customerLabel: partyLabel(labels, customerId), orderId };
  } catch {
    return input.partyId ? { customerId: input.partyId, customerLabel: '', orderId: '' } : null;
  }
}
