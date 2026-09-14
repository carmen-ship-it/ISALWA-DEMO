import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readOrderAllocationById, readOrderAllocations } from './allocation-reader';
import {
  SCOPES_THAT_DO_NOT_UNLOCK_COMPANY_OPERATING_STORES,
  WRITE_SCOPES_THAT_DO_NOT_AUTHORIZE_READS,
  type TrustedOperatingSession,
} from './capability';
import { readCompanyOperatingStores } from './company-reader';
import { CROSS_LANE_CHANGE_REQUESTS } from './cross-lane';
import type {
  OperatingReadDb,
  OrderAllocationRow,
  ProductionQuemaProductRow,
  ProductionQuemaRow,
  ProductionTraceRow,
  PurchaseRequestRow,
} from './db-port';
import { readFinishedGoodsReceipts } from './finished-goods-reader';
import { createPrismaOperatingReadDb, type OperatingReadPrisma } from './prisma-operating-read';
import { readProductionFacts } from './production-reader';
import { readPurchaseRequestById, readPurchaseRequests } from './purchase-reader';
import { PURCHASE_HAPPY_PATH_LABELS, PURCHASE_STOP_LABEL } from './purchase-status';
import { COMPANY_OPERATING_READ_SCOPE, TENANT_PREDICATE_FIELD } from './source-state';

const ORG = 'org-session';
const OTHER = 'org-foreign';
const AT = '2026-09-14T15:00:00.000Z';

type Call = { method: string; query: Record<string, unknown> };

function session(scopes: readonly string[], extras: Partial<TrustedOperatingSession> = {}): TrustedOperatingSession {
  return {
    organizationId: ORG,
    grantedScopes: scopes,
    accessStatus: 'active',
    ...extras,
  };
}

function purchase(overrides: Partial<PurchaseRequestRow> = {}): PurchaseRequestRow {
  return {
    id: 'pr-1',
    organizationId: ORG,
    requestingArea: 'Producción',
    requestedByLabel: 'Isa',
    requestedByMemberId: 'mem-1',
    description: 'esmalte',
    quantity: '4',
    unit: 'kg',
    productionContextId: null,
    orderId: null,
    reason: 'falta',
    requestedAt: AT,
    status: 'solicitado',
    buyerLabel: null,
    buyerMemberId: null,
    stockAuthority: 'not_official',
    reorderPolicy: 'none',
    updatedAt: AT,
    ...overrides,
  };
}

function allocation(overrides: Partial<OrderAllocationRow> = {}): OrderAllocationRow {
  return {
    id: 'alloc-1',
    organizationId: ORG,
    productId: 'prod-1',
    goodsKind: 'finished',
    quantity: '1.5',
    orderLineId: 'line-1',
    allocatedAt: AT,
    recordedAt: AT,
    actorMemberId: 'mem-1',
    actorLabel: 'Almacén',
    source: 'explicit_command',
    finishedGoodsReceiptId: null,
    ...overrides,
  };
}

function memoryDb(seed?: {
  purchases?: PurchaseRequestRow[];
  products?: Array<{ organizationId: string; id: string }>;
  quemas?: ProductionQuemaRow[];
  quemaProducts?: ProductionQuemaProductRow[];
  traces?: ProductionTraceRow[];
  allocations?: OrderAllocationRow[];
  leak?: boolean;
  fail?: boolean;
}): OperatingReadDb & { calls: Call[] } {
  const calls: Call[] = [];
  const purchases = seed?.purchases ?? [];
  const products = seed?.products ?? [];
  const quemas = seed?.quemas ?? [];
  const quemaProducts = seed?.quemaProducts ?? [];
  const traces = seed?.traces ?? [];
  const allocations = seed?.allocations ?? [];

  function record(method: string, query: Record<string, unknown>): void {
    if (seed?.fail) throw new Error('db down');
    calls.push({ method, query: { ...query } });
    assert.equal(typeof query.organizationId, 'string');
    assert.notEqual(query.organizationId, '');
    assert.equal('orderId' in query, false);
  }

  function inOrg<T extends { organizationId: string }>(query: { organizationId: string }, rows: T[]): T[] {
    if (seed?.leak) return rows;
    return rows.filter((row) => row.organizationId === query.organizationId);
  }

  return {
    calls,
    async listPurchaseRequests(query) {
      record('listPurchaseRequests', query);
      return inOrg(query, purchases);
    },
    async getPurchaseRequest(query) {
      record('getPurchaseRequest', query);
      return inOrg(query, purchases).find((row) => row.id === query.id) ?? null;
    },
    async listPurchaseRequestStatusHistory(query) {
      record('listPurchaseRequestStatusHistory', query);
      return [];
    },
    async listPurchaseRequestNotes(query) {
      record('listPurchaseRequestNotes', query);
      return [];
    },
    async productProvenInOrganization(query) {
      record('productProvenInOrganization', query);
      if (seed?.leak) return true;
      return products.some(
        (row) => row.organizationId === query.organizationId && row.id === query.productId,
      );
    },
    async listProductionQuemas(query) {
      record('listProductionQuemas', query);
      if (query.quemaIds && query.quemaIds.length === 0) return [];
      return inOrg(query, quemas).filter((row) => !query.quemaIds || query.quemaIds.includes(row.id));
    },
    async listProductionQuemaTimes(query) {
      record('listProductionQuemaTimes', query);
      if (query.quemaIds && query.quemaIds.length === 0) return [];
      return [];
    },
    async listProductionQuemaProducts(query) {
      record('listProductionQuemaProducts', query);
      return inOrg(query, quemaProducts).filter(
        (row) => !query.productId || row.productId === query.productId,
      );
    },
    async listProductionTraceEntries(query) {
      record('listProductionTraceEntries', query);
      return inOrg(query, traces).filter((row) => !query.productId || row.productId === query.productId);
    },
    async listOrderAllocations(query) {
      record('listOrderAllocations', query);
      return inOrg(query, allocations).filter((row) => {
        if (query.productId && row.productId !== query.productId) return false;
        if (query.orderLineId && row.orderLineId !== query.orderLineId) return false;
        return true;
      });
    },
    async getOrderAllocation(query) {
      record('getOrderAllocation', query);
      return inOrg(query, allocations).find((row) => row.id === query.id) ?? null;
    },
  };
}

describe('company operating readers', () => {
  it('reads the same tenant when management.org.read is exact', async () => {
    const db = memoryDb({
      purchases: [purchase(), purchase({ id: 'pr-other', organizationId: OTHER, description: 'foreign-secret' })],
    });
    const result = await readPurchaseRequests({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'AVAILABLE');
    assert.equal(result.capability, 'management.org.read');
    assert.equal(result.tenantPredicate?.field, TENANT_PREDICATE_FIELD);
    assert.equal(result.tenantPredicate?.organizationId, ORG);
    assert.equal(db.calls[0]?.query.organizationId, ORG);
    assert.equal(result.factCount, 1);
    if (result.state === 'AVAILABLE') {
      assert.equal(result.facts[0]?.description, 'esmalte');
      assert.equal(result.facts[0]?.isStockTruth, false);
      assert.equal(result.facts[0]?.stockQuantity, null);
    }
    assert.equal(JSON.stringify(result).includes('foreign-secret'), false);
  });

  it('denies a wrong role and does not query', async () => {
    const db = memoryDb({ purchases: [purchase()] });
    const result = await readPurchaseRequests({
      session: session(['commercial.team.read'], { cargo: 'Gerencia', title: 'Jefe' }),
      db,
    });
    assert.equal(result.state, 'UNPROVEN');
    assert.equal(result.reasonCode, 'unauthorized');
    assert.equal(result.factCount, null);
    assert.equal(result.stockQuantity, null);
    assert.equal(result.representAsZeroStock, false);
    assert.equal(db.calls.length, 0);
  });

  it('treats people.admin and cargo or title as granting nothing', async () => {
    const db = memoryDb({ purchases: [purchase()] });
    const result = await readProductionFacts({
      session: session(['people.admin'], {
        cargo: 'Encargado de producción',
        title: 'Jefe de almacén',
      }),
      db,
    });
    assert.equal(result.state, 'UNPROVEN');
    assert.equal(result.reasonCode, 'unauthorized');
    assert.equal(db.calls.length, 0);
  });

  it('does not leak a foreign id', async () => {
    const db = memoryDb({
      purchases: [
        purchase({
          id: 'pr-foreign',
          organizationId: OTHER,
          description: 'foreign-secret',
          quantity: '99',
        }),
      ],
    });
    const result = await readPurchaseRequestById({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
      id: 'pr-foreign',
    });
    assert.equal(result.state, 'NO_FACT');
    assert.equal(result.reason, 'missing');
    assert.equal(db.calls[0]?.method, 'getPurchaseRequest');
    assert.equal(db.calls[0]?.query.organizationId, ORG);
    assert.equal(db.calls[0]?.query.id, 'pr-foreign');
    assert.notEqual(db.calls[0]?.query.organizationId, OTHER);
    assert.equal(JSON.stringify(result).includes('foreign-secret'), false);
    assert.equal(JSON.stringify(result).includes('99'), false);
  });

  it('drops a cross-tenant row if a port ignores the predicate', async () => {
    const db = memoryDb({
      leak: true,
      purchases: [purchase({ organizationId: OTHER, description: 'foreign-secret' })],
    });
    const result = await readPurchaseRequests({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'NO_FACT');
    assert.equal(JSON.stringify(result).includes('foreign-secret'), false);
  });

  it('denies write-only scopes on every operating reader', async () => {
    for (const scope of WRITE_SCOPES_THAT_DO_NOT_AUTHORIZE_READS) {
      const db = memoryDb({
        purchases: [purchase()],
        allocations: [allocation()],
        products: [{ organizationId: ORG, id: 'prod-1' }],
      });
      const actor = session([scope]);
      const purchaseResult = await readPurchaseRequests({ session: actor, db });
      const productionResult = await readProductionFacts({ session: actor, db });
      const finished = await readFinishedGoodsReceipts({ session: actor, db });
      const allocated = await readOrderAllocations({ session: actor, db });
      for (const result of [purchaseResult, productionResult, finished, allocated]) {
        assert.equal(result.state, 'UNPROVEN', scope);
        assert.equal(result.reasonCode, 'unauthorized', scope);
        assert.equal(result.factCount, null, scope);
        assert.equal(result.stockQuantity, null, scope);
        assert.notEqual(result.stockQuantity, 0);
      }
      assert.equal(db.calls.length, 0, scope);
    }
  });

  it('does not let commercial.team.read unlock company stores', async () => {
    const db = memoryDb({ purchases: [purchase()], allocations: [allocation()] });
    const actor = session(['commercial.team.read']);
    const company = await readCompanyOperatingStores({ session: actor, db });
    assert.equal(company.purchase.state, 'UNPROVEN');
    assert.equal(company.production.state, 'UNPROVEN');
    assert.equal(company.finishedGoodsReceipts.state, 'UNPROVEN');
    assert.equal(company.allocations.state, 'UNPROVEN');
    assert.equal(db.calls.length, 0);
    assert.ok(SCOPES_THAT_DO_NOT_UNLOCK_COMPANY_OPERATING_STORES.includes('commercial.team.read'));
  });

  it('preserves purchase status labels and keeps Cancelado as a stop', async () => {
    const db = memoryDb({
      purchases: [
        purchase({ id: 'a', status: 'solicitado' }),
        purchase({ id: 'b', status: 'cotizandose' }),
        purchase({ id: 'c', status: 'pedido_preparandose' }),
        purchase({ id: 'd', status: 'entregado' }),
        purchase({ id: 'e', status: 'cancelled' }),
        purchase({ id: 'f', status: 'en_stock' }),
      ],
    });
    const result = await readPurchaseRequests({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'AVAILABLE');
    if (result.state !== 'AVAILABLE') return;
    const labels = result.facts.map((fact) => fact.status.label);
    assert.deepEqual(labels.slice(0, 4), [...PURCHASE_HAPPY_PATH_LABELS]);
    assert.equal(result.facts[4]?.status.label, PURCHASE_STOP_LABEL);
    assert.equal(result.facts[4]?.status.isStop, true);
    assert.equal(result.facts[4]?.status.isHappyPath, false);
    assert.equal(result.facts[5]?.status.label, null);
    assert.equal(result.facts[5]?.status.labelInvented, false);
    assert.equal(PURCHASE_HAPPY_PATH_LABELS.includes('Cancelado' as 'Solicitado'), false);
    assert.equal(result.facts.every((fact) => fact.isStockTruth === false), true);
    assert.equal(result.facts.every((fact) => fact.stockQuantity === null), true);
    assert.equal(result.stockQuantity, null);
  });

  it('does not query production by order id as if the order owned a run', async () => {
    const db = memoryDb({
      products: [{ organizationId: ORG, id: 'prod-1' }],
      quemas: [
        {
          id: 'quema-1',
          organizationId: ORG,
          actorMemberId: null,
          actorLabel: 'Horno',
          source: 'manual',
          recordedAt: AT,
        },
      ],
    });
    const refused = await readProductionFacts({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
      orderId: 'order-9',
      productId: 'prod-1',
    });
    assert.equal(refused.state, 'UNPROVEN');
    assert.equal(refused.reasonCode, 'production_not_order_keyed');
    assert.equal(refused.factCount, null);
    assert.equal(db.calls.length, 0);
    assert.equal('listProductionByOrder' in db, false);

    const byProduct = await readProductionFacts({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
      productId: 'prod-1',
    });
    assert.notEqual(byProduct.state, 'UNPROVEN');
    for (const call of db.calls) {
      assert.equal(call.query.organizationId, ORG);
      assert.equal('orderId' in call.query, false);
    }
    assert.equal(db.calls.some((call) => call.method === 'productProvenInOrganization'), true);
    assert.equal(db.calls.some((call) => call.method === 'listProductionQuemaProducts'), true);
  });

  it('does not query production for a product that is not proven in the session organization', async () => {
    const db = memoryDb({
      products: [{ organizationId: OTHER, id: 'prod-foreign' }],
      traces: [
        {
          id: 'trace-foreign',
          organizationId: OTHER,
          kind: 'finished_goods_receipt',
          productId: 'prod-foreign',
          stepKey: 'almacen_productos_terminados',
          quemaId: null,
          actorLabel: 'Horno',
          occurredAt: AT,
          recordedAt: AT,
          receiptQuantity: '8',
          quantityLost: null,
          goodCount: null,
          lostCount: null,
        },
      ],
    });
    const result = await readProductionFacts({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
      productId: 'prod-foreign',
    });
    assert.equal(result.state, 'NO_FACT');
    assert.equal(result.reason, 'missing');
    assert.deepEqual(
      db.calls.map((call) => call.method),
      ['productProvenInOrganization'],
    );
    assert.equal(db.calls[0]?.query.organizationId, ORG);
    assert.equal(JSON.stringify(result).includes('8'), false);
  });

  it('keeps a missing finished-goods receipt model UNPROVEN, not zero stock', async () => {
    const db = memoryDb({
      allocations: [
        allocation({ quantity: '2' }),
        allocation({ id: 'alloc-2', quantity: '1', orderLineId: 'line-1' }),
      ],
    });
    const company = await readCompanyOperatingStores({
      session: session([COMPANY_OPERATING_READ_SCOPE, 'warehouse.finished_goods.allocate']),
      db,
    });
    assert.equal(company.allocations.state, 'AVAILABLE');
    assert.equal(company.finishedGoodsReceipts.state, 'UNPROVEN');
    assert.equal(company.finishedGoodsReceipts.reasonCode, 'NO_LIVE_READER');
    assert.equal(company.finishedGoodsReceipts.reason, 'missing_model');
    assert.equal(company.finishedGoodsReceipts.factCount, null);
    assert.equal(company.finishedGoodsReceipts.stockQuantity, null);
    assert.notEqual(company.finishedGoodsReceipts.stockQuantity, 0);
    assert.equal(company.finishedGoodsReceipts.representAsZeroStock, false);
    assert.equal('listFinishedGoodsReceipts' in db, false);
    assert.equal(
      db.calls.some((call) => call.method.toLowerCase().includes('receipt')),
      false,
    );
    if (company.allocations.state === 'AVAILABLE') {
      assert.equal(company.allocations.facts.length, 2);
      assert.equal(company.allocations.facts[0]?.remainingQuantity, null);
      assert.equal(company.allocations.facts[0]?.remainingQuantityState, 'UNPROVEN');
      assert.equal(company.allocations.facts[0]?.onHandStock, null);
      assert.equal(company.allocations.allocatePermitted, false);
    }
  });

  it('returns NO_FACT for an authorized empty query, not UNPROVEN', async () => {
    const db = memoryDb();
    const result = await readPurchaseRequests({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'NO_FACT');
    assert.equal(result.factCount, 0);
    assert.equal(result.reason, 'empty_authorized_query');
    assert.notEqual(result.state, 'UNPROVEN');
    assert.equal(result.stockQuantity, null);
    assert.equal(db.calls[0]?.query.organizationId, ORG);
  });

  it('does not invent remaining quantity or on-hand stock from allocations', async () => {
    const db = memoryDb({
      allocations: [
        allocation({ id: 'a', quantity: '1.5' }),
        allocation({ id: 'b', quantity: '2', orderLineId: 'line-1' }),
      ],
    });
    const result = await readOrderAllocations({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'AVAILABLE');
    assert.equal(result.allocatePermitted, false);
    assert.equal(result.readDoesNotAuthorizeAllocate, true);
    if (result.state !== 'AVAILABLE') return;
    assert.deepEqual(
      result.facts.map((fact) => fact.quantity),
      ['1.5', '2'],
    );
    assert.equal(result.facts.every((fact) => fact.remainingQuantity === null), true);
    assert.equal(result.facts.every((fact) => fact.onHandStock === null), true);
    assert.equal(result.facts.every((fact) => fact.partialAllowed && fact.multipleAllowed), true);
    assert.equal(JSON.stringify(result).includes('"remainingQuantity":"'), false);
  });

  it('reports a missing database port as UNPROVEN, not zero', async () => {
    const result = await readOrderAllocationById({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db: null,
      id: 'alloc-1',
    });
    assert.equal(result.state, 'UNPROVEN');
    assert.equal(result.reasonCode, 'NO_LIVE_READER');
    assert.equal(result.factCount, null);
    assert.equal(result.stockQuantity, null);
  });

  it('returns ERROR when the tenant query fails', async () => {
    const db = memoryDb({ fail: true, purchases: [purchase()] });
    const result = await readPurchaseRequests({
      session: session([COMPANY_OPERATING_READ_SCOPE]),
      db,
    });
    assert.equal(result.state, 'ERROR');
    assert.equal(result.factCount, null);
    assert.equal(result.stockQuantity, null);
  });

  it('records department read capabilities as a change request and does not invent the string', () => {
    const request = CROSS_LANE_CHANGE_REQUESTS[0];
    assert.equal(request?.kind, 'CROSS_LANE_CHANGE_REQUEST');
    assert.deepEqual(request?.homes, ['Producción', 'Almacén', 'Compras']);
    assert.equal(request?.existingCompanyGate, 'management.org.read');
    assert.equal(request?.doNotInventCapabilityString, true);
    const serialized = JSON.stringify(CROSS_LANE_CHANGE_REQUESTS);
    assert.equal(serialized.includes('production.department.read'), false);
    assert.equal(serialized.includes('warehouse.department.read'), false);
    assert.equal(serialized.includes('purchasing.department.read'), false);
  });

  it('puts organizationId on every Prisma query, including receipts, and never filters receipts by order', async () => {
    const calls: Array<{ model: string; where: Record<string, unknown> }> = [];
    function many(model: string) {
      return async (args: { where: Record<string, unknown> }) => {
        calls.push({ model, where: args.where });
        assert.equal(args.where.organizationId, ORG);
        assert.equal('orderId' in args.where, false);
        return [];
      };
    }
    const prisma: OperatingReadPrisma = {
      osCatalogProduct: {
        findFirst: async (args) => {
          calls.push({ model: 'osCatalogProduct', where: args.where });
          return { id: 'prod-1' };
        },
      },
      osPurchaseRequest: { findMany: many('osPurchaseRequest'), findFirst: async () => null },
      osPurchaseRequestStatusHistory: { findMany: many('osPurchaseRequestStatusHistory') },
      osPurchaseRequestNote: { findMany: many('osPurchaseRequestNote') },
      osProductionQuema: { findMany: many('osProductionQuema') },
      osProductionQuemaTime: { findMany: many('osProductionQuemaTime') },
      osProductionQuemaProduct: { findMany: many('osProductionQuemaProduct') },
      osProductionTraceEntry: { findMany: many('osProductionTraceEntry') },
      osOrderAllocation: { findMany: many('osOrderAllocation'), findFirst: async () => null },
      osFinishedGoodsReceipt: { findMany: many('osFinishedGoodsReceipt') },
    };
    const db = createPrismaOperatingReadDb(prisma);
    assert.equal(typeof db.listFinishedGoodsReceipts, 'function');
    await db.listPurchaseRequests({ organizationId: ORG });
    await db.listProductionTraceEntries({ organizationId: ORG, productId: 'prod-1' });
    await db.listProductionQuemas({ organizationId: ORG });
    await db.listOrderAllocations({ organizationId: ORG, orderLineId: 'line-1' });
    await db.listFinishedGoodsReceipts?.({ organizationId: ORG, productId: 'prod-1' });
    assert.equal(calls.every((call) => call.where.organizationId === ORG), true);
    assert.equal(calls.some((call) => call.model === 'osProductionTraceEntry'), true);
    assert.equal(calls.some((call) => call.model === 'osFinishedGoodsReceipt'), true);
    assert.equal(calls.some((call) => 'orderId' in call.where), false);
    await assert.rejects(() => db.listPurchaseRequests({ organizationId: '  ' }));
  });
});
