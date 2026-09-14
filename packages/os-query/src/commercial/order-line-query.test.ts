import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORDER_LINE_PROVENANCE, type OrderLineRecord } from '@isalwa/os-commercial';
import { CommercialQueryService } from './commercial-query-service';
import type { QueryContext } from '../query-context';
import type { StoredOrderReadModel } from '../projection-store-port';

const ORG = 'org-a';
const OTHER = 'org-b';
const OWNER = 'mem-owner';
const NOW = new Date('2026-09-14T15:00:00.000Z');

function ctx(organizationId = ORG): QueryContext {
  return {
    organizationId,
    actorMemberId: OWNER,
    personId: 'person-owner',
    authIdentityId: 'auth-owner',
    correlationId: 'corr',
    effectiveAt: NOW,
    auth: {
      memberId: OWNER,
      organizationId,
      accessStatus: 'active',
      roleKeys: [],
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function order(): StoredOrderReadModel {
  return {
    orderId: 'order-1',
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: null,
    quoteId: 'quote-1',
    ownerMemberId: OWNER,
    orderNumber: 'O-000001',
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 375000n,
    headerDiscountCentavos: 0n,
    totalCentavos: 375000n,
    cancelledAt: null,
    createdAt: NOW,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: NOW,
  };
}

function snapshot(overrides: Partial<OrderLineRecord> = {}): OrderLineRecord {
  return {
    id: 'ol-1',
    organizationId: ORG,
    orderId: 'order-1',
    quoteId: 'quote-1',
    quoteLineId: 'ql-1',
    lineNumber: 1,
    descriptionSnapshot: 'Lavamanos cerámico',
    quantity: 2,
    unitLabel: 'pza',
    unitPriceCentavosSnapshot: 150000n,
    discountCentavos: 5000n,
    lineTotalCentavos: 295000n,
    productRefSnapshot: 'SKU-LAV',
    provenance: ORDER_LINE_PROVENANCE,
    copiedAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function service(lines: OrderLineRecord[]) {
  return new CommercialQueryService({
    projectionStore: {
      async getFreshness() {
        return null;
      },
      async getOrderReadModel(organizationId: string, orderId: string) {
        const row = order();
        if (organizationId !== row.organizationId || orderId !== row.orderId) return null;
        return row;
      },
    } as never,
    encodeOpportunityCursor: () => 'c',
    encodeQuoteCursor: () => 'c',
    encodeOrderCursor: () => 'c',
    listOrderLines: async (organizationId, orderId) =>
      lines.filter((line) => line.organizationId === organizationId && line.orderId === orderId),
  });
}

describe('order line query', () => {
  it('returns copied snapshots and does not invent a line for a legacy order', async () => {
    const withLines = await service([snapshot()]).getOrder(ctx(), 'order-1');
    assert.equal(withLines.order.totalCentavos, '375000');
    assert.equal(withLines.order.lines?.length, 1);
    assert.equal(withLines.order.lines?.[0]?.description, 'Lavamanos cerámico');
    assert.equal(withLines.order.lines?.[0]?.unitPriceCentavos, '150000');
    assert.equal(withLines.order.lines?.[0]?.quoteLineId, 'ql-1');
    assert.equal(withLines.order.lines?.[0]?.provenance, ORDER_LINE_PROVENANCE);

    const legacy = await service([]).getOrder(ctx(), 'order-1');
    assert.equal(legacy.order.orderNumber, 'O-000001');
    assert.equal(legacy.order.totalCentavos, '375000');
    assert.equal(legacy.order.lines?.length, 0);
  });

  it('does not return another tenant line on this order', async () => {
    const result = await service([
      snapshot(),
      snapshot({ id: 'ol-foreign', organizationId: OTHER, descriptionSnapshot: 'Ajeno' }),
    ]).getOrder(ctx(), 'order-1');
    assert.equal(result.order.lines?.length, 1);
    assert.equal(result.order.lines?.[0]?.description, 'Lavamanos cerámico');
  });
});
