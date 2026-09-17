import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCliente360Intelligence } from './client-intelligence';
import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';
import type {
  OpportunityListResponse,
  OrderListResponse,
  QuoteListResponse,
} from '@/lib/commercial/types';
import type { Cliente360Composition } from '@/lib/party/next-action';

function ok<T>(data: T): FetchOutcome<T> {
  return { status: 'ok', data };
}

const composition = {
  latestActivity: { label: 'Cotización enviada', occurredLabel: 'hoy' },
} as Cliente360Composition;

describe('buildCliente360Intelligence', () => {
  it('counts won opportunities and linked orders so Resumen matches the party graph', () => {
    const facts = buildCliente360Intelligence({
      opportunities: ok({
        items: [
          { status: 'won', opportunityId: 'o1' },
          { status: 'open', opportunityId: 'o2' },
        ],
        meta: { nextCursor: null, limit: 10, hasMore: false },
        freshness: null,
      } as OpportunityListResponse),
      quotes: ok({
        items: [{ quoteId: 'q1' }, { quoteId: 'q2' }],
        meta: { nextCursor: null, limit: 10, hasMore: false },
        freshness: null,
      } as QuoteListResponse),
      orders: ok({
        items: [
          { status: 'open', orderId: 'ord1', quoteId: 'q1' },
          { status: 'fulfilled', orderId: 'ord2', quoteId: 'q2' },
        ],
        meta: { nextCursor: null, limit: 10, hasMore: false },
        freshness: null,
      } as OrderListResponse),
      documentLinks: {
        status: 'ok',
        links: [{ type: 'delivery_note_pdf' }, { type: 'quote_pdf' }],
      } as never,
      openIssues: 0,
      composition,
    });

    assert.equal(facts.opportunities, 2);
    assert.equal(facts.openOpportunities, 1);
    assert.equal(facts.quotes, 2);
    assert.equal(facts.orders, 2);
    assert.equal(facts.openOrders, 1);
    assert.equal(facts.ordersFromQuotes, 2);
    assert.equal(facts.deliveryNotes, 1);
  });
});
