import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { readOrderDateDelay, readOrderRecordedDateDivergence } from '@isalwa/os-read-dates';
import type { DateFactsReadPort } from '@isalwa/os-read-dates';
import { FulfillmentReadService, MemoryFulfillmentReadDb } from '@isalwa/os-read-fulfillment';
import type { OperatingReadDb, PurchaseRequestRow } from '@isalwa/os-read-ops';
import {
  PARKED_PEDIDO_PAGE_MERGED,
  PEDIDO_UNPROVEN_COPY,
  adaptProductionRead,
  getPedidoOperatingCase,
  type PedidoIdentityStore,
  type PedidoOperatingCase,
  type PedidoTrustedContext,
} from './index';

const ORDER = 'ord-1';
const ORG = 'org-a';

function team(overrides: Partial<PedidoTrustedContext> = {}): PedidoTrustedContext {
  return {
    organizationId: ORG,
    actorMemberId: 'mem-1',
    grantedScopes: ['commercial.team.read'],
    ...overrides,
  };
}

function management(overrides: Partial<PedidoTrustedContext> = {}): PedidoTrustedContext {
  return team({ grantedScopes: ['management.org.read'], ...overrides });
}

function readyOrder(): PedidoIdentityStore {
  return {
    async findOrderInOrg(organizationId, orderId) {
      if (organizationId !== ORG || orderId !== ORDER) return null;
      return {
        id: ORDER,
        organizationId: ORG,
        partyId: 'party-1',
        commercialAccountId: 'acct-1',
        ownerMemberId: 'mem-owner',
        orderNumber: 'PED-100',
        status: 'open',
        currency: 'BOB',
        createdAt: '2026-09-01T12:00:00.000Z',
        cancelledAt: null,
      };
    },
    async findPartyInOrg(organizationId, partyId) {
      if (organizationId !== ORG || partyId !== 'party-1') return null;
      return {
        id: 'party-1',
        organizationId: ORG,
        displayName: 'Cerámica Altiplano',
        status: 'active',
      };
    },
    async findCommercialAccountInOrg() {
      return null;
    },
  };
}

function assertReady(result: PedidoOperatingCase): asserts result is Extract<PedidoOperatingCase, { outcome: 'ready' }> {
  assert.equal(result.outcome, 'ready');
  if (result.outcome !== 'ready') throw new Error('not ready');
}

function datePort(): DateFactsReadPort {
  return {
    async findOrderInOrganization(input) {
      if (input.organizationId !== ORG || input.orderId !== ORDER) return null;
      return { id: ORDER, organizationId: ORG };
    },
    async findCustomerCommittedDate(input) {
      if (input.organizationId !== ORG || input.subjectId !== ORDER) return null;
      return {
        id: 'date-a',
        organizationId: ORG,
        subjectType: 'order',
        subjectId: ORDER,
        partyId: 'party-1',
        commercialOwnerMemberId: 'mem-owner',
        committedOn: '2026-10-01',
        originalCommittedOn: '2026-09-20',
        originalReason: 'acordado con el cliente',
        source: 'sales_customer_coordination',
        setByMemberId: 'mem-owner',
        setAt: '2026-09-01T15:00:00.000Z',
      };
    },
    async listCustomerCommittedDateRevisions() {
      return [];
    },
    async findProductionInternalTargetDate(input) {
      if (input.organizationId !== ORG || input.subjectId !== ORDER) return null;
      return {
        id: 'target-a',
        organizationId: ORG,
        subjectType: 'order',
        subjectId: ORDER,
        maintainedByMemberId: 'mem-production',
        targetOn: '2026-09-15',
        originalTargetOn: '2026-09-15',
        originalReason: 'carga del horno',
        source: 'production_internal',
        setByMemberId: 'mem-production',
        setAt: '2026-09-01T15:00:00.000Z',
      };
    },
    async listProductionInternalTargetRevisions() {
      return [];
    },
    async listProductionDateIssues() {
      return [];
    },
    async listCustomerDateInformedRecords() {
      return [];
    },
  };
}

function purchaseRow(over: Partial<PurchaseRequestRow> = {}): PurchaseRequestRow {
  return {
    id: 'pur-1',
    organizationId: ORG,
    requestingArea: 'comercial',
    requestedByLabel: 'Asesor',
    requestedByMemberId: 'mem-1',
    description: 'Esmalte',
    quantity: '12',
    unit: 'kg',
    productionContextId: null,
    orderId: ORDER,
    reason: 'falta insumo',
    requestedAt: '2026-09-02T15:00:00.000Z',
    status: 'solicitado',
    buyerLabel: null,
    buyerMemberId: null,
    stockAuthority: 'not_stock',
    reorderPolicy: 'none',
    updatedAt: '2026-09-02T15:00:00.000Z',
    ...over,
  };
}

function trapOps(rows: PurchaseRequestRow[] = []): { db: OperatingReadDb; calls: string[] } {
  const calls: string[] = [];
  const note = (method: string, query: object) => {
    calls.push(`${method}:${JSON.stringify(query)}`);
    if ('orderId' in query) calls.push('queried-by-order-id');
  };
  const db: OperatingReadDb = {
    async listPurchaseRequests(query) {
      note('listPurchaseRequests', query);
      return rows.filter((row) => row.organizationId === query.organizationId);
    },
    async getPurchaseRequest(query) {
      note('getPurchaseRequest', query);
      return rows.find((row) => row.id === query.id && row.organizationId === query.organizationId) ?? null;
    },
    async listPurchaseRequestStatusHistory(query) {
      note('listPurchaseRequestStatusHistory', query);
      return [];
    },
    async listPurchaseRequestNotes(query) {
      note('listPurchaseRequestNotes', query);
      return [];
    },
    async productProvenInOrganization(query) {
      note('productProvenInOrganization', query);
      return false;
    },
    async listProductionQuemas(query) {
      note('listProductionQuemas', query);
      return [];
    },
    async listProductionQuemaTimes(query) {
      note('listProductionQuemaTimes', query);
      return [];
    },
    async listProductionQuemaProducts(query) {
      note('listProductionQuemaProducts', query);
      return [];
    },
    async listProductionTraceEntries(query) {
      note('listProductionTraceEntries', query);
      return [];
    },
    async listOrderAllocations(query) {
      note('listOrderAllocations', query);
      return [];
    },
    async getOrderAllocation(query) {
      note('getOrderAllocation', query);
      return null;
    },
  };
  return { db, calls };
}

describe('pedido reader adapter', () => {
  it('keeps dates AVAILABLE while delay and risk stay NO_FACT', async () => {
    const dates = datePort();
    const result = await getPedidoOperatingCase(ORDER, team(), {
      identity: readyOrder(),
      live: { dates },
    });
    assertReady(result);
    assert.equal(result.sections.customer.state, 'AVAILABLE');
    assert.equal(result.sections.customerCommittedDate.state, 'AVAILABLE');
    assert.equal(result.sections.customerCommittedDate.displayCopy, '2026-10-01');
    if (result.sections.customerCommittedDate.state === 'AVAILABLE') {
      assert.deepEqual(result.sections.customerCommittedDate.fact, { date: '2026-10-01' });
    }
    assert.equal(result.sections.productionInternalTargetDate.state, 'AVAILABLE');
    assert.equal(result.sections.productionInternalTargetDate.displayCopy, '2026-09-15');
    assert.equal(result.sections.risk.state, 'NO_FACT');
    assert.equal(result.sections.risk.reason, 'no_recorded_date_issue');
    assert.equal(result.sections.risk.fact, null);
    assert.equal(result.sections.customerInformed.state, 'NO_FACT');
    assert.equal(JSON.stringify(result.sections.risk).includes('diverges'), false);
    assert.equal(JSON.stringify(result.sections.risk).includes('delay'), false);
    assert.equal(JSON.stringify(result.sections.customerCommittedDate).includes('delay'), false);
    assert.equal('delay' in result.sections, false);

    const delay = await readOrderDateDelay(dates, team(), ORDER);
    assert.equal(delay.coverage, 'NO_FACT');
    const divergence = await readOrderRecordedDateDivergence(dates, team(), ORDER);
    assert.equal(divergence.coverage, 'AVAILABLE');
    if (divergence.coverage === 'AVAILABLE') assert.equal(divergence.fact.diverges, true);
    assert.equal(JSON.stringify(result).includes('diverges'), false);
  });

  it('does not query production by order id or show an empty run', async () => {
    const source = readFileSync(new URL('./reader-adapter.ts', import.meta.url), 'utf8');
    const productionCalls = source.match(/readProductionFacts\(\{[^}]*\}/g) ?? [];
    assert.ok(productionCalls.length > 0);
    for (const call of productionCalls) assert.equal(call.includes('orderId'), false);

    const trap = trapOps();
    const direct = await adaptProductionRead({
      session: {
        organizationId: ORG,
        grantedScopes: ['management.org.read'],
        accessStatus: 'active',
      },
      db: trap.db,
      orderId: ORDER,
    });
    assert.equal(direct.state, 'UNPROVEN');
    assert.equal('fact' in direct, false);
    assert.equal(JSON.stringify(direct).includes('[]'), false);
    assert.deepEqual(trap.calls, []);

    const result = await getPedidoOperatingCase(ORDER, management(), {
      identity: readyOrder(),
      live: { ops: trap.db },
    });
    assertReady(result);
    assert.equal(result.sections.production.state, 'UNPROVEN');
    assert.equal(result.sections.production.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.equal(result.boundaries.productionAttachedByOrderId, false);
    assert.equal(trap.calls.some((call) => call.startsWith('listProduction')), false);
    assert.equal(trap.calls.includes('queried-by-order-id'), false);
    assert.equal(JSON.stringify(result.sections.production).includes('run'), false);
    assert.equal(JSON.stringify(result).includes('osProductionRun'), false);
  });

  it('keeps finished goods UNPROVEN when the receipt model is missing', async () => {
    const trap = trapOps([
      purchaseRow({
        id: 'pur-listo',
        description: 'nada listo',
        quantity: '0',
        orderId: ORDER,
      }),
    ]);
    const result = await getPedidoOperatingCase(ORDER, management(), {
      identity: readyOrder(),
      live: { ops: trap.db },
    });
    assertReady(result);
    const finished = result.sections.finishedGoods;
    assert.equal(finished.state, 'UNPROVEN');
    assert.equal(finished.reason, 'reader_not_connected');
    assert.equal(finished.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.equal(finished.fact, null);
    const serialized = JSON.stringify(finished);
    assert.equal(serialized.includes('"0"'), false);
    assert.equal(serialized.includes('listo'), false);
    assert.equal(serialized.includes('stock'), false);
    assert.equal(serialized.includes('nada'), false);
  });

  it('does not turn commercial.team.read into a zero purchase', async () => {
    const trap = trapOps([
      purchaseRow({
        id: 'pur-zero',
        description: 'CERO-STOCK',
        quantity: '0',
        orderId: ORDER,
      }),
    ]);
    const result = await getPedidoOperatingCase(ORDER, team({ cargo: 'Gerente comercial' }), {
      identity: readyOrder(),
      live: { ops: trap.db },
    });
    assertReady(result);
    assert.equal(result.sections.customer.state, 'AVAILABLE');
    assert.equal(result.sections.order.state, 'AVAILABLE');
    assert.equal(result.sections.purchasing.state, 'UNPROVEN');
    assert.equal(result.sections.purchasing.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.notEqual(result.sections.purchasing.state, 'NO_FACT');
    assert.equal(result.sections.allocation.state, 'UNPROVEN');
    assert.equal(result.sections.allocation.displayCopy, PEDIDO_UNPROVEN_COPY);
    const serialized = JSON.stringify({
      purchasing: result.sections.purchasing,
      allocation: result.sections.allocation,
    });
    assert.equal(serialized.includes('CERO-STOCK'), false);
    assert.equal(serialized.includes('"0"'), false);
    assert.equal(serialized.includes('factCount'), false);
    assert.equal(trap.calls.some((call) => call.startsWith('listPurchaseRequests')), false);
    assert.equal(trap.calls.some((call) => call.startsWith('listOrderAllocations')), false);
  });

  it('lets management.org.read see a purchase without attaching another order', async () => {
    const trap = trapOps([
      purchaseRow(),
      purchaseRow({
        id: 'pur-other',
        description: 'OTRO-PEDIDO',
        orderId: 'ord-other',
        quantity: '0',
      }),
    ]);
    const result = await getPedidoOperatingCase(ORDER, management(), {
      identity: readyOrder(),
      live: { ops: trap.db },
    });
    assertReady(result);
    assert.equal(result.sections.purchasing.state, 'AVAILABLE');
    if (result.sections.purchasing.state === 'AVAILABLE') {
      assert.equal(result.sections.purchasing.displayCopy, 'Solicitado');
      const fact = result.sections.purchasing.fact as { requests: Array<{ id: string; stockQuantity: null }> };
      assert.deepEqual(fact.requests.map((item) => item.id), ['pur-1']);
      assert.equal(fact.requests[0]?.stockQuantity, null);
    }
    assert.equal(JSON.stringify(result.sections.purchasing).includes('OTRO-PEDIDO'), false);
    assert.equal(JSON.stringify(result.sections.purchasing).includes('"0"'), false);
  });

  it('does not unlock warehouse or delivery with write scopes, and does not invent coordination', async () => {
    const db = new MemoryFulfillmentReadDb();
    const at = new Date('2026-09-02T15:00:00.000Z');
    db.warehouseExits.push({
      id: 'exit-1',
      organizationId: ORG,
      orderId: ORDER,
      exitedAt: at,
      recordedByMemberId: 'mem-1',
      source: 'warehouse',
      notes: null,
      createdAt: at,
    });
    db.coordinationDecisions.push({
      id: 'coord-1',
      organizationId: ORG,
      kind: 'follow_up',
      decision: 'DECISION-SECRETA',
      ownerLabel: null,
      ownerMemberId: null,
      dueAt: null,
      actorLabel: 'Coord',
      actorMemberId: null,
      occurredAt: at,
      linkedCaseId: null,
      notes: null,
      resolvesDecisionId: null,
      recordedAt: at,
    });
    const fulfillment = new FulfillmentReadService(db);
    const blocked = await getPedidoOperatingCase(
      ORDER,
      team({
        grantedScopes: [
          'commercial.team.read',
          'delivery.record',
          'warehouse.outbound.record',
          'warehouse.finished_goods.allocate',
        ],
      }),
      { identity: readyOrder(), live: { fulfillment } },
    );
    assertReady(blocked);
    assert.equal(blocked.sections.warehouseExit.state, 'UNPROVEN');
    assert.equal(blocked.sections.delivery.state, 'UNPROVEN');
    assert.equal(blocked.sections.warehouseExit.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.equal(blocked.sections.customer.state, 'AVAILABLE');
    assert.equal(db.calls.some((call) => call.method === 'listWarehouseExits'), false);
    assert.equal(db.calls.some((call) => call.method === 'listCoordinationDecisions'), false);
    assert.equal(JSON.stringify(blocked).includes('DECISION-SECRETA'), false);
    assert.equal('coordination' in blocked.sections, false);
    assert.equal(JSON.stringify(blocked).includes('allocatePermitted":true'), false);

    const allowed = await getPedidoOperatingCase(ORDER, management(), {
      identity: readyOrder(),
      live: { fulfillment },
    });
    assertReady(allowed);
    assert.equal(allowed.sections.warehouseExit.state, 'AVAILABLE');
    if (allowed.sections.warehouseExit.state === 'AVAILABLE') {
      const fact = allowed.sections.warehouseExit.fact as { exits: Array<{ id: string }> };
      assert.equal(fact.exits[0]?.id, 'exit-1');
    }
    assert.equal(allowed.sections.delivery.state, 'NO_FACT');
    assert.equal(db.calls.some((call) => call.method === 'listCoordinationDecisions'), false);
  });

  it('does not show NO_FACT as no next action when commercial coverage is incomplete', async () => {
    const db = new MemoryFulfillmentReadDb();
    db.workItems.push({
      id: 'work-open',
      organizationId: ORG,
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      title: 'Revisar cuenta',
      status: 'open',
      subjectType: 'commercial_account',
      subjectId: 'acct-1',
      dueAt: null,
      createdAt: new Date('2026-09-01T15:00:00.000Z'),
    });
    const result = await getPedidoOperatingCase(ORDER, team(), {
      identity: readyOrder(),
      live: { fulfillment: new FulfillmentReadService(db) },
    });
    assertReady(result);
    assert.equal(result.sections.nextAction.state, 'UNPROVEN');
    assert.equal(result.sections.nextAction.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.notEqual(result.sections.nextAction.displayCopy, 'No hay un siguiente paso con fecha.');
    assert.equal(result.sections.nextAction.fact, null);
    assert.equal(JSON.stringify(result.sections.nextAction).includes('no next action'), false);
  });

  it('keeps a foreign order missing when live readers are passed', async () => {
    let dateReads = 0;
    const dates: DateFactsReadPort = {
      async findOrderInOrganization() {
        dateReads += 1;
        return { id: 'ord-foreign', organizationId: 'org-b' };
      },
      async findCustomerCommittedDate() {
        dateReads += 1;
        return null;
      },
      async listCustomerCommittedDateRevisions() {
        return [];
      },
      async findProductionInternalTargetDate() {
        dateReads += 1;
        return null;
      },
      async listProductionInternalTargetRevisions() {
        return [];
      },
      async listProductionDateIssues() {
        return [];
      },
      async listCustomerDateInformedRecords() {
        return [];
      },
    };
    const result = await getPedidoOperatingCase('ord-foreign', team(), {
      identity: readyOrder(),
      live: { dates, ops: trapOps().db },
    });
    assert.equal(result.outcome, 'missing');
    assert.equal(result.sections, null);
    assert.equal(dateReads, 0);
    assert.equal(JSON.stringify(result).includes('org-b'), false);
  });

  it('does not merge the parked page and does not add mutation actions', () => {
    assert.equal(PARKED_PEDIDO_PAGE_MERGED, false);
    const source = readFileSync(new URL('./reader-adapter.ts', import.meta.url), 'utf8');
    assert.equal(source.includes('21a8b73'), false);
    assert.equal(/export (async )?function (create|update|allocate|record)/.test(source), false);
  });
});
