import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';
import type {
  OpportunityListResponse,
  OrderListResponse,
  QuoteListResponse,
} from '@/lib/commercial/types';
import type { DocumentLinksOutcome } from '@/lib/cliente/document-links';
import type { Cliente360Composition } from '@/lib/party/next-action';

export type Cliente360Intelligence = {
  openOpportunities: number | null;
  quotes: number | null;
  openOrders: number | null;
  deliveryNotes: number | null;
  ordersFromQuotes: number | null;
  openIssues: number;
  lastActivityLabel: string | null;
};

function countItems<T extends { items: readonly unknown[] }>(
  outcome: FetchOutcome<T>,
): number | null {
  if (outcome.status !== 'ok') return null;
  return outcome.data.items.length;
}

export function buildCliente360Intelligence(input: {
  opportunities: FetchOutcome<OpportunityListResponse>;
  quotes: FetchOutcome<QuoteListResponse>;
  orders: FetchOutcome<OrderListResponse>;
  documentLinks: DocumentLinksOutcome;
  openIssues: number;
  composition: Cliente360Composition;
}): Cliente360Intelligence {
  const openOpportunities =
    input.opportunities.status === 'ok'
      ? input.opportunities.data.items.filter((row) => row.status === 'open').length
      : null;

  const openOrders =
    input.orders.status === 'ok'
      ? input.orders.data.items.filter((row) => row.status === 'open').length
      : null;

  const ordersFromQuotes =
    input.orders.status === 'ok'
      ? input.orders.data.items.filter((row) => row.quoteId?.trim()).length
      : null;

  const deliveryNotes =
    input.documentLinks.status === 'ok'
      ? input.documentLinks.links.filter((link) => link.type === 'delivery_note_pdf').length
      : null;

  const lastActivityLabel =
    input.composition.latestActivity.occurredLabel?.trim() ||
    input.composition.latestActivity.label?.trim() ||
    null;

  return {
    openOpportunities,
    quotes: countItems(input.quotes),
    openOrders,
    deliveryNotes,
    ordersFromQuotes,
    openIssues: input.openIssues,
    lastActivityLabel,
  };
}
