import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type { OrderRecord, QuoteLineRecord, QuoteRecord } from '@isalwa/os-commercial';
import { CommercialQueryService } from './commercial-query-service';
import { CommercialProjectionConsumer } from './commercial-projection-consumer';
import type { QueryContext } from '../query-context';
import type {
  OsProjectionStorePort,
  StoredOrderReadModel,
  StoredQuoteLineReadModel,
  StoredQuoteReadModel,
} from '../projection-store-port';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const OWNER = 'mem-owner';
const QUOTE_ID = 'quote-1';
const ORDER_ID = 'order-1';
const NOW = new Date('2026-09-13T21:00:00.000Z');

function quote(status: QuoteRecord['status']): QuoteRecord {
  return {
    id: QUOTE_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    status,
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    revisionNumber: 1,
    notes: null,
    version: status === 'accepted' ? 2 : 1,
    submittedAt: NOW,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function line(): QuoteLineRecord {
  return {
    id: 'line-1',
    organizationId: ORG,
    quoteId: QUOTE_ID,
    lineNumber: 1,
    description: 'Item',
    quantity: 1,
    unitLabel: null,
    unitPriceCentavos: 100n,
    discountCentavos: 0n,
    lineTotalCentavos: 100n,
    productRef: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function order(): OrderRecord {
  return {
    id: ORDER_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    quoteId: QUOTE_ID,
    ownerMemberId: OWNER,
    orderNumber: 'O-000001',
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    version: 0,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function envelope(overrides: Partial<BusinessEventEnvelope> = {}): BusinessEventEnvelope {
  return {
    id: 'evt-order-1',
    organizationId: ORG,
    eventType: 'order.created',
    schemaVersion: 1,
    occurredAt: NOW.toISOString(),
    recordedAt: NOW.toISOString(),
    actorMemberId: OWNER,
    primaryEntityType: 'order',
    primaryEntityId: ORDER_ID,
    correlationId: 'corr-1',
    provenance: 'command',
    dataOrigin: 'production',
    payload: { orderId: ORDER_ID, quoteId: QUOTE_ID, partyId: 'party-1' },
    ...overrides,
  };
}

function harness(canonicalStatus: QuoteRecord['status'] = 'accepted') {
  const quotes = new Map<string, StoredQuoteReadModel>();
  quotes.set(QUOTE_ID, {
    quoteId: QUOTE_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    status: 'submitted',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    revisionNumber: 1,
    notes: null,
    submittedAt: NOW,
    cancelledAt: null,
    createdAt: NOW,
    lastEventId: 'evt-submit',
    lastOccurredAt: new Date('2026-09-13T20:00:00.000Z'),
    updatedAt: NOW,
  });
  const orders = new Map<string, StoredOrderReadModel>();
  const projection = {
    async getQuoteReadModel(_org: string, quoteId: string) {
      return quotes.get(quoteId) ?? null;
    },
    async upsertQuoteReadModel(model: StoredQuoteReadModel) {
      quotes.set(model.quoteId, model);
    },
    async getOrderReadModel(_org: string, orderId: string) {
      return orders.get(orderId) ?? null;
    },
    async upsertOrderReadModel(model: StoredOrderReadModel) {
      orders.set(model.orderId, model);
    },
    async replaceQuoteLineReadModels() {},
    async listQuoteLineReadModels() {
      return [] as StoredQuoteLineReadModel[];
    },
    async upsertCheckpoint() {},
    async countPendingOutbox() {
      return 0;
    },
    async upsertFreshness() {},
    async getFreshness() {
      return {
        consumerKey: 'commercial_summary',
        lastSuccessAt: null,
        lastEventOccurredAt: null,
        pendingOutboxCount: 0,
        lastError: null,
      };
    },
  };
  const commercial = {
    async getQuoteInOrg(organizationId: string, quoteId: string) {
      if (organizationId !== ORG || quoteId !== QUOTE_ID) return null;
      return quote(canonicalStatus);
    },
    async getOrderInOrg(organizationId: string, orderId: string) {
      if (organizationId !== ORG || orderId !== ORDER_ID) return null;
      return order();
    },
    async listQuoteLines() {
      return [line()];
    },
  };
  const consumer = new CommercialProjectionConsumer({
    projectionStore: projection as unknown as OsProjectionStorePort,
    commercialStore: commercial as unknown as OsCommercialStore,
  });
  const query = new CommercialQueryService({
    projectionStore: projection as unknown as OsProjectionStorePort,
    encodeOpportunityCursor: () => '',
    encodeQuoteCursor: () => '',
    encodeOrderCursor: () => '',
    directReports: null,
  });
  return { consumer, query, quotes, orders };
}

function ownerCtx(): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: OWNER,
    personId: 'person-owner',
    authIdentityId: 'auth-owner',
    correlationId: 'corr',
    effectiveAt: NOW,
    auth: {
      memberId: OWNER,
      organizationId: ORG,
      accessStatus: 'active',
      roleKeys: [],
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

describe('quote read model after CreateOrder', () => {
  it('starts submitted and becomes accepted after order.created', async () => {
    const { consumer, query, quotes, orders } = harness('accepted');
    assert.equal(quotes.get(QUOTE_ID)?.status, 'submitted');

    await consumer.deliver(envelope());

    assert.equal(orders.size, 1);
    assert.equal(orders.get(ORDER_ID)?.quoteId, QUOTE_ID);
    assert.equal(quotes.get(QUOTE_ID)?.status, 'accepted');

    const read = await query.getQuote(ownerCtx(), QUOTE_ID);
    assert.equal(read.quote.status, 'accepted');
    assert.equal(read.authority.canConvertToOrder, false);
    assert.equal(read.authority.canRequestApproval, false);
  });

  it('does not create a second order or revert the quote on replay', async () => {
    const { consumer, quotes, orders } = harness('accepted');
    const event = envelope();
    await consumer.deliver(event);
    await consumer.deliver(event);
    assert.equal(orders.size, 1);
    assert.equal(quotes.get(QUOTE_ID)?.status, 'accepted');
  });

  it('does not project a cross-tenant order into this quote', async () => {
    const { consumer, quotes, orders } = harness('accepted');
    await assert.rejects(
      () =>
        consumer.deliver(
          envelope({
            organizationId: OTHER_ORG,
            id: 'evt-other',
          }),
        ),
      /NOT_FOUND/,
    );
    assert.equal(orders.size, 0);
    assert.equal(quotes.get(QUOTE_ID)?.status, 'submitted');
  });
});
