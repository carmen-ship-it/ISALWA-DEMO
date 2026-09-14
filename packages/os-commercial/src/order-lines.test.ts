import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import {
  ORDER_LINE_PROVENANCE,
  copyQuoteLinesToOrderLines,
  orderLinesFromHeader,
} from './order-lines';
import type { OsCommercialStore } from './os-commercial-store';
import type { OrderLineRecord, OrderRecord, QuoteLineRecord, QuoteRecord } from './store-types';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const OWNER = 'mem-owner';
const QUOTE_ID = 'quote-1';
const NOW = new Date('2026-09-14T15:00:00.000Z');

function quoteLine(overrides: Partial<QuoteLineRecord> = {}): QuoteLineRecord {
  return {
    id: 'ql-1',
    organizationId: ORG,
    quoteId: QUOTE_ID,
    lineNumber: 1,
    description: 'Lavamanos cerámico',
    quantity: 2,
    unitLabel: 'pza',
    unitPriceCentavos: 150000n,
    discountCentavos: 5000n,
    lineTotalCentavos: 295000n,
    productRef: 'SKU-LAV',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('copyQuoteLinesToOrderLines', () => {
  it('copies description, quantity, prices, and productRef exactly', () => {
    const source = quoteLine();
    const [copied] = copyQuoteLinesToOrderLines({
      organizationId: ORG,
      orderId: 'order-1',
      quoteId: QUOTE_ID,
      lines: [source],
      copiedAt: NOW,
      createLineId: () => 'ol-1',
    });
    assert.equal(copied.descriptionSnapshot, 'Lavamanos cerámico');
    assert.equal(copied.quantity, 2);
    assert.equal(copied.unitLabel, 'pza');
    assert.equal(copied.unitPriceCentavosSnapshot, 150000n);
    assert.equal(copied.discountCentavos, 5000n);
    assert.equal(copied.lineTotalCentavos, 295000n);
    assert.equal(copied.productRefSnapshot, 'SKU-LAV');
    assert.equal(copied.lineNumber, 1);
    assert.equal(copied.provenance, ORDER_LINE_PROVENANCE);
    assert.notEqual(
      copied.lineTotalCentavos,
      BigInt(copied.quantity) * copied.unitPriceCentavosSnapshot,
    );
  });

  it('keeps quote id and quote line id as source links', () => {
    const second = quoteLine({
      id: 'ql-2',
      lineNumber: 3,
      description: 'Grifería',
      quantity: 1,
      unitPriceCentavos: 80000n,
      discountCentavos: 0n,
      lineTotalCentavos: 80000n,
      productRef: null,
      unitLabel: null,
    });
    const copied = copyQuoteLinesToOrderLines({
      organizationId: ORG,
      orderId: 'order-1',
      quoteId: QUOTE_ID,
      lines: [second, quoteLine()],
      copiedAt: NOW,
      createLineId: () => 'ol',
    });
    assert.deepEqual(
      copied.map((line) => [line.lineNumber, line.quoteId, line.quoteLineId]),
      [
        [1, QUOTE_ID, 'ql-1'],
        [3, QUOTE_ID, 'ql-2'],
      ],
    );
    assert.equal(copied[1].productRefSnapshot, null);
  });

  it('does not follow a later product master or quote-line edit', () => {
    const source = quoteLine();
    const catalog = new Map([
      ['SKU-LAV', { description: 'Lavamanos cerámico', unitPriceCentavos: 150000n }],
    ]);
    const [copied] = copyQuoteLinesToOrderLines({
      organizationId: ORG,
      orderId: 'order-1',
      quoteId: QUOTE_ID,
      lines: [source],
      copiedAt: NOW,
      createLineId: () => 'ol-1',
    });
    source.description = 'Lavamanos premium';
    source.unitPriceCentavos = 999999n;
    source.productRef = 'SKU-NEW';
    catalog.set('SKU-LAV', { description: 'Lavamanos premium', unitPriceCentavos: 999999n });
    assert.equal(copied.descriptionSnapshot, 'Lavamanos cerámico');
    assert.equal(copied.unitPriceCentavosSnapshot, 150000n);
    assert.equal(copied.productRefSnapshot, 'SKU-LAV');
    assert.equal(copied.lineTotalCentavos, 295000n);
    assert.equal(catalog.get('SKU-LAV')?.unitPriceCentavos, 999999n);
  });

  it('refuses another tenant and another quote', () => {
    assert.throws(
      () =>
        copyQuoteLinesToOrderLines({
          organizationId: ORG,
          orderId: 'order-1',
          quoteId: QUOTE_ID,
          lines: [quoteLine({ organizationId: OTHER_ORG })],
          copiedAt: NOW,
        }),
      /TENANT_FORBIDDEN/,
    );
    assert.throws(
      () =>
        copyQuoteLinesToOrderLines({
          organizationId: ORG,
          orderId: 'order-1',
          quoteId: QUOTE_ID,
          lines: [quoteLine({ quoteId: 'quote-other' })],
          copiedAt: NOW,
        }),
      /VALIDATION_FAILED/,
    );
  });

  it('does not invent lines from a header total', () => {
    assert.equal(orderLinesFromHeader({ totalCentavos: 295000n, subtotalCentavos: 295000n }), null);
    assert.deepEqual(
      copyQuoteLinesToOrderLines({
        organizationId: ORG,
        orderId: 'order-legacy',
        quoteId: QUOTE_ID,
        lines: [],
        copiedAt: NOW,
      }),
      [],
    );
  });
});

function ctx(actorMemberId = OWNER): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-order-lines',
    effectiveAt: NOW,
  };
}

function quote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: QUOTE_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    status: 'submitted',
    currency: 'BOB',
    subtotalCentavos: 375000n,
    headerDiscountCentavos: 0n,
    totalCentavos: 375000n,
    revisionNumber: 1,
    notes: null,
    version: 1,
    submittedAt: NOW,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function conversionStore(input: {
  lines: QuoteLineRecord[];
  existingOrder?: boolean;
  organizationId?: string;
}) {
  const row = quote(input.organizationId ? { organizationId: input.organizationId } : {});
  const inserted: OrderLineRecord[] = [];
  const orders: OrderRecord[] = [];
  const store = {
    async runInTransaction(fn: (next: OsCommercialStore) => Promise<unknown>) {
      return fn(store as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember() {
      return [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getQuoteInOrg(organizationId: string, quoteId: string) {
      if (organizationId !== row.organizationId || quoteId !== row.id) return null;
      return row;
    },
    async getOrderForQuote() {
      if (input.existingOrder || orders.length > 0) return { id: orders[0]?.id ?? 'order-existing' };
      return null;
    },
    async listQuoteLines(organizationId: string, quoteId: string) {
      return input.lines.filter(
        (line) => line.organizationId === organizationId && line.quoteId === quoteId,
      );
    },
    async countOrdersForOrg() {
      return orders.length;
    },
    async insertOrder(order: OrderRecord) {
      orders.push(order);
    },
    async insertOrderLines(records: OrderLineRecord[]) {
      inserted.push(...records);
    },
    async listOrderLines(organizationId: string, orderId: string) {
      return inserted.filter(
        (line) => line.organizationId === organizationId && line.orderId === orderId,
      );
    },
    async updateQuote(_quoteId: string, patch: { status?: string }) {
      if (patch.status) row.status = patch.status as QuoteRecord['status'];
    },
    async appendEventAndAudit() {},
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
  return { store: store as unknown as OsCommercialStore, inserted, orders, quote: row };
}

describe('CreateOrder line copy', () => {
  it('stores snapshots and source links and blocks a second conversion', async () => {
    const first = quoteLine();
    const second = quoteLine({
      id: 'ql-2',
      lineNumber: 2,
      description: 'Inodoro',
      quantity: 1,
      unitPriceCentavos: 80000n,
      discountCentavos: 0n,
      lineTotalCentavos: 80000n,
      productRef: 'SKU-INO',
    });
    const harness = conversionStore({ lines: [first, second] });
    const service = new CommercialCommandService(harness.store);
    const result = await service.execute('CreateOrder', ctx(), { quoteId: QUOTE_ID });
    assert.equal(result.data.lineCount, 2);
    assert.deepEqual(result.data.quoteLineIds, ['ql-1', 'ql-2']);
    assert.equal(harness.inserted.length, 2);
    assert.equal(harness.inserted[0].quoteId, QUOTE_ID);
    assert.equal(harness.inserted[0].quoteLineId, 'ql-1');
    assert.equal(harness.inserted[1].productRefSnapshot, 'SKU-INO');
    assert.equal(harness.inserted[0].unitPriceCentavosSnapshot, 150000n);
    first.description = 'changed after conversion';
    first.unitPriceCentavos = 1n;
    assert.equal(harness.inserted[0].descriptionSnapshot, 'Lavamanos cerámico');
    assert.equal(harness.inserted[0].unitPriceCentavosSnapshot, 150000n);
    await assert.rejects(
      () => service.execute('CreateOrder', ctx(), { quoteId: QUOTE_ID }),
      /VALIDATION_FAILED/,
    );
    assert.equal(harness.inserted.length, 2);
    assert.equal(harness.orders.length, 1);
  });

  it('blocks a duplicate order even while the quote is still submitted', async () => {
    const harness = conversionStore({ lines: [quoteLine()], existingOrder: true });
    const service = new CommercialCommandService(harness.store);
    await assert.rejects(
      () => service.execute('CreateOrder', ctx(), { quoteId: QUOTE_ID }),
      /CONFLICT/,
    );
    assert.equal(harness.inserted.length, 0);
    assert.equal(harness.orders.length, 0);
  });

  it('does not copy another tenant quote into this order', async () => {
    const harness = conversionStore({
      lines: [quoteLine({ organizationId: OTHER_ORG })],
      organizationId: OTHER_ORG,
    });
    const service = new CommercialCommandService(harness.store);
    await assert.rejects(
      () => service.execute('CreateOrder', ctx(), { quoteId: QUOTE_ID }),
      /NOT_FOUND/,
    );
    assert.equal(harness.inserted.length, 0);
  });

  it('leaves a legacy order readable without inventing lines', async () => {
    const legacy: OrderRecord = {
      id: 'order-legacy',
      organizationId: ORG,
      partyId: 'party-1',
      commercialAccountId: null,
      quoteId: QUOTE_ID,
      ownerMemberId: OWNER,
      orderNumber: 'O-000001',
      status: 'open',
      currency: 'BOB',
      subtotalCentavos: 375000n,
      headerDiscountCentavos: 0n,
      totalCentavos: 375000n,
      version: 0,
      cancelledAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const harness = conversionStore({ lines: [] });
    const listed = await (harness.store.listOrderLines as OsCommercialStore['listOrderLines'])(
      ORG,
      legacy.id,
    );
    assert.deepEqual(listed, []);
    assert.equal(legacy.totalCentavos, 375000n);
    assert.equal(orderLinesFromHeader(legacy), null);
    assert.equal('lines' in legacy, false);
  });

  it('does not add an update path for stored snapshots', () => {
    const source = readFileSync(resolve(__dirname, 'os-commercial-store.ts'), 'utf8');
    assert.match(source, /insertOrderLines/);
    assert.match(source, /listOrderLines/);
    assert.doesNotMatch(source, /updateOrderLine|deleteOrderLine/);
  });
});
