import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import type { SearchableOption } from '@/lib/experience/searchable-select';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';

export type FinanceSubjectOptions = {
  orders: SearchableOption[];
  quotes: SearchableOption[];
};

/**
 * Authorized open orders + quotes for finance subject selects.
 * Fail closed: empty lists on auth/session/API failure. No invented rows.
 */
export async function loadFinanceSubjectOptions(): Promise<FinanceSubjectOptions> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return { orders: [], quotes: [] };
    const client = createOsApiClient(auth);
    const dataMode = await resolveDemoDataMode({});

    const [orderPage, quotePage] = await Promise.all([
      client.listOrders({ status: 'open', limit: 50 }).catch((err: unknown) => {
        if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
          return { items: [] as const };
        }
        return { items: [] as const };
      }),
      client.listQuotes({ limit: 50 }).catch((err: unknown) => {
        if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
          return { items: [] as const };
        }
        return { items: [] as const };
      }),
    ]);

    const ordersRaw = (orderPage.items ?? []).filter((item) => item.status !== 'cancelled');
    const quotesRaw = (quotePage.items ?? []).filter((item) => item.status !== 'cancelled');
    const labels = await resolvePartyLabels(client, [
      ...ordersRaw.map((item) => item.partyId),
      ...quotesRaw.map((item) => item.partyId),
    ]);
    const orders = filterByDemoDataMode(ordersRaw, dataMode, (item) =>
      isDemoDisplayName(partyLabel(labels, item.partyId)),
    );
    const quotes = filterByDemoDataMode(quotesRaw, dataMode, (item) =>
      isDemoDisplayName(partyLabel(labels, item.partyId)),
    );

    return {
      orders: orders.map((item) => ({
        id: item.orderId,
        label: item.orderNumber,
        hint: partyLabel(labels, item.partyId),
      })),
      quotes: quotes.map((item) => {
        const party = partyLabel(labels, item.partyId);
        const title = item.notes?.trim() ? item.notes.trim().slice(0, 48) : null;
        return {
          id: item.quoteId,
          label: title ? `${item.quoteNumber} · ${title}` : item.quoteNumber,
          hint: party,
        };
      }),
    };
  } catch {
    return { orders: [], quotes: [] };
  }
}
