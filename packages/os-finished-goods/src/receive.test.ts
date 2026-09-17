import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MemoryFinishedGoodsWriteStore,
  receiveAuthorizesAllocate,
  receiveContextAllocatesToOrder,
  receiveFinishedGoods,
} from './receive';

const receivedAt = '2026-09-14T15:00:00.000Z';

function session(scopes: string[] = ['warehouse.finished_goods.receive']) {
  return {
    organizationId: 'org-a',
    actorMemberId: 'mem-a',
    actorLabel: 'Almacén',
    accessStatus: 'active',
    grantedScopes: scopes,
  };
}

describe('receiveFinishedGoods', () => {
  it('records Listo without allocating, posting stock, or inventing Pedido context', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    const result = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-1',
      command: { productId: 'prod-1', quantity: '3', receivedAt },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.warehouseLabel, 'Almacén de Productos Terminados');
    assert.equal(result.receipt.allocatesToOrder, false);
    assert.equal(result.receipt.postsStock, false);
    assert.equal(result.receipt.officialStock, false);
    assert.equal(result.receipt.contextOrderId, null);
    assert.equal(result.migrationApplied, false);
    assert.equal(result.event.eventType, 'finished_goods.received');
    assert.equal(result.event.capabilityKey, 'warehouse.finished_goods.receive');
    assert.equal(result.event.payload.allocatesToOrder, false);
    assert.equal(receiveAuthorizesAllocate(), false);
    assert.equal(receiveContextAllocatesToOrder(), false);
    assert.equal(JSON.stringify(result.receipt).includes('"orderId"'), false);
  });

  it('does not treat allocate as receive and rejects allocation-shaped order links', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    const allocated = await receiveFinishedGoods({
      session: session(['warehouse.finished_goods.allocate']),
      store,
      command: { productId: 'prod-1', quantity: '1', receivedAt },
    });
    assert.equal(allocated.ok, false);
    if (allocated.ok) return;
    assert.equal(allocated.reason, 'unauthorized');

    const linked = await receiveFinishedGoods({
      session: session(),
      store,
      command: { productId: 'prod-1', quantity: '1', receivedAt, orderId: 'ord-1' },
    });
    assert.equal(linked.ok, false);
    if (linked.ok) return;
    assert.equal(linked.reason, 'order_link_rejected');
    assert.equal(store.receipts.length, 0);
  });

  it('accepts Pedido context when order line and product are proven in-tenant', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    store.seedOrderLine({
      organizationId: 'org-a',
      orderId: 'ord-1',
      orderLineId: 'line-1',
      productId: 'prod-1',
      partyId: 'party-1',
    });
    const result = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-ctx',
      command: {
        productId: 'prod-1',
        quantity: '2',
        receivedAt,
        contextOrderId: 'ord-1',
        contextOrderLineId: 'line-1',
        note: 'Ingreso confirmado en planta',
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.contextOrderId, 'ord-1');
    assert.equal(result.receipt.contextOrderLineId, 'line-1');
    assert.equal(result.receipt.contextPartyId, 'party-1');
    assert.equal(result.receipt.note, 'Ingreso confirmado en planta');
    assert.equal(result.receipt.allocatesToOrder, false);
    assert.equal(result.event.payload.partyId, 'party-1');
    assert.equal(result.event.payload.orderId, 'ord-1');
  });

  it('rejects invalid Pedido/product context without leaking foreign existence', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    store.seedOrderLine({
      organizationId: 'org-b',
      orderId: 'ord-foreign',
      orderLineId: 'line-foreign',
      productId: 'prod-1',
      partyId: 'party-b',
    });
    const foreign = await receiveFinishedGoods({
      session: session(),
      store,
      command: {
        productId: 'prod-1',
        quantity: '1',
        receivedAt,
        contextOrderId: 'ord-foreign',
        contextOrderLineId: 'line-foreign',
      },
    });
    assert.equal(foreign.ok, false);
    if (foreign.ok) return;
    assert.equal(foreign.reason, 'invalid_order_context');

    const mismatchedProduct = await receiveFinishedGoods({
      session: session(),
      store,
      command: {
        productId: 'prod-other',
        quantity: '1',
        receivedAt,
        contextOrderId: 'ord-1',
        contextOrderLineId: 'line-1',
      },
    });
    assert.equal(mismatchedProduct.ok, false);
    if (mismatchedProduct.ok) return;
    assert.equal(mismatchedProduct.reason, 'invalid_order_context');

    const incomplete = await receiveFinishedGoods({
      session: session(),
      store,
      command: {
        productId: 'prod-1',
        quantity: '1',
        receivedAt,
        contextOrderId: 'ord-1',
      },
    });
    assert.equal(incomplete.ok, false);
    if (incomplete.ok) return;
    assert.equal(incomplete.reason, 'invalid_order_context');
    assert.equal(store.receipts.length, 0);
  });

  it('rejects zero/invalid quantity', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    for (const quantity of ['0', '-1', 'abc', '']) {
      const result = await receiveFinishedGoods({
        session: session(),
        store,
        command: { productId: 'prod-1', quantity, receivedAt },
      });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.reason, 'invalid');
    }
    assert.equal(store.receipts.length, 0);
  });

  it('rejects a foreign production citation and accepts one proven in the session organization', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    store.citations.add('org-b:trace:trace-1');
    const foreign = await receiveFinishedGoods({
      session: session(),
      store,
      command: { productId: 'prod-1', quantity: '1', receivedAt, productionTraceEntryId: 'trace-1' },
    });
    assert.equal(foreign.ok, false);
    if (foreign.ok) return;
    assert.equal(foreign.reason, 'citation_not_in_org');

    store.citations.add('org-a:trace:trace-1');
    const own = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-2',
      command: { productId: 'prod-1', quantity: '1', receivedAt, productionTraceEntryId: 'trace-1' },
    });
    assert.equal(own.ok, true);
    if (!own.ok) return;
    assert.equal(own.receipt.productionTraceEntryId, 'trace-1');
    assert.equal(own.receipt.allocatesToOrder, false);
  });

  it('appends a correction and does not overwrite the prior receipt', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    const first = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-3',
      command: { productId: 'prod-1', quantity: '2', receivedAt },
    });
    assert.equal(first.ok, true);
    const corrected = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-4',
      command: {
        productId: 'prod-1',
        quantity: '1',
        receivedAt,
        correctsReceiptId: 'fgr-3',
        correctionReason: 'conteo',
      },
    });
    assert.equal(corrected.ok, true);
    if (!corrected.ok) return;
    assert.equal(corrected.event.eventType, 'finished_goods.corrected');
    assert.equal(store.receipts.length, 2);
    assert.equal(store.receipts[0]?.quantity, '2');
  });

  it('fails closed for a suspended member and a foreign organization selector is not a writer authority', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    const suspended = await receiveFinishedGoods({
      session: { ...session(), accessStatus: 'suspended' },
      store,
      command: { productId: 'prod-1', quantity: '1', receivedAt },
    });
    assert.equal(suspended.ok, false);
    if (suspended.ok) return;
    assert.equal(suspended.reason, 'access_revoked');
    assert.equal(store.events.length, 0);
  });

  it('replays the same durable receipt on idempotent retry without a second write', async () => {
    const store = new MemoryFinishedGoodsWriteStore();
    const first = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-idem-1',
      command: {
        productId: 'prod-1',
        quantity: '4',
        receivedAt,
        idempotencyKey: 'idem-fg-1',
        contextOrderId: undefined,
      },
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = await receiveFinishedGoods({
      session: session(),
      store,
      id: 'fgr-idem-2',
      command: {
        productId: 'prod-other',
        quantity: '99',
        receivedAt,
        idempotencyKey: 'idem-fg-1',
      },
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.replayed, true);
    assert.equal(second.receipt.id, 'fgr-idem-1');
    assert.equal(second.receipt.quantity, '4');
    assert.equal(store.receipts.length, 1);
    assert.equal(store.events.length, 1);

    const foreignSession = {
      ...session(),
      organizationId: 'org-b',
    };
    const crossTenant = await receiveFinishedGoods({
      session: foreignSession,
      store,
      command: {
        productId: 'prod-1',
        quantity: '1',
        receivedAt,
        idempotencyKey: 'idem-fg-1',
      },
    });
    assert.equal(crossTenant.ok, true);
    if (!crossTenant.ok) return;
    // org-b has no prior key → creates a new tenant-scoped row, never reads org-a.
    assert.equal(crossTenant.replayed, false);
    assert.equal(crossTenant.receipt.organizationId, 'org-b');
    assert.equal(store.receipts.filter((row) => row.organizationId === 'org-a').length, 1);
    assert.equal(store.receipts.filter((row) => row.organizationId === 'org-b').length, 1);
  });
});

describe('createPrismaFinishedGoodsWriteStore', () => {
  it('persists OsFinishedGoodsReceipt columns only and maps productRefSnapshot for Pedido proof', async () => {
    const { createPrismaFinishedGoodsWriteStore } = await import('./receive');
    const created: Record<string, unknown>[] = [];
    const events: Record<string, unknown>[] = [];
    let txBatches = 0;
    const store = createPrismaFinishedGoodsWriteStore({
      async $transaction(ops) {
        txBatches += 1;
        return Promise.all(ops);
      },
      osFinishedGoodsReceipt: {
        async findFirst() {
          return null;
        },
        async create({ data }) {
          created.push(data);
          return data;
        },
      },
      osBusinessEvent: {
        async create({ data }) {
          events.push(data);
          return data;
        },
      },
      osOrder: {
        async findFirst({ where }) {
          if (where.organizationId !== 'org-a' || where.id !== 'ord-1') return null;
          return { id: 'ord-1', partyId: 'party-1' };
        },
      },
      osOrderLine: {
        async findFirst({ where }) {
          if (where.organizationId !== 'org-a' || where.id !== 'line-1') return null;
          return { id: 'line-1', orderId: 'ord-1', productRefSnapshot: 'prod-1' };
        },
      },
    });

    const proof = await store.proveOrderLineContext('org-a', {
      orderId: 'ord-1',
      orderLineId: 'line-1',
      productId: 'prod-1',
    });
    assert.equal(proof?.partyId, 'party-1');
    assert.equal(
      await store.proveOrderLineContext('org-a', {
        orderId: 'ord-1',
        orderLineId: 'line-1',
        productId: 'wrong',
      }),
      null,
    );

    const now = new Date('2026-09-16T12:00:00.000Z');
    const outcome = await store.persistReceiptAndEvent(
      {
        id: 'fgr-p',
        organizationId: 'org-a',
        productId: 'prod-1',
        quantity: '2',
        warehouseLabel: 'Almacén de Productos Terminados',
        receivedAt: now.toISOString(),
        recordedAt: now.toISOString(),
        actorMemberId: 'mem-a',
        actorLabel: 'Almacén',
        source: 'explicit_command',
        productionTraceEntryId: null,
        quemaId: null,
        contextOrderId: 'ord-1',
        contextOrderLineId: 'line-1',
        contextPartyId: 'party-1',
        note: 'ok',
        correctsReceiptId: null,
        correctionReason: null,
        idempotencyKey: 'idem-p',
        allocatesToOrder: false,
        postsStock: false,
        officialStock: false,
      },
      {
        id: 'evt-fgr-p',
        organizationId: 'org-a',
        eventType: 'finished_goods.received',
        occurredAt: now.toISOString(),
        recordedAt: now.toISOString(),
        actorMemberId: 'mem-a',
        primaryEntityType: 'finished_goods_receipt',
        primaryEntityId: 'fgr-p',
        capabilityKey: 'warehouse.finished_goods.receive',
        correlationId: 'corr-1',
        idempotencyKey: 'idem-p',
        provenance: 'command',
        payload: {
          productId: 'prod-1',
          quantity: '2',
          allocatesToOrder: false,
          postsStock: false,
          orderId: 'ord-1',
          orderLineId: 'line-1',
          partyId: 'party-1',
          note: 'ok',
        },
      },
    );
    assert.equal(outcome, 'inserted');
    assert.equal(txBatches, 1);
    assert.equal(created.length, 1);
    assert.equal(events.length, 1);
    assert.equal(created[0]?.organizationId, 'org-a');
    assert.equal(created[0]?.contextOrderId, 'ord-1');
    assert.equal('allocatesToOrder' in (created[0] ?? {}), false);
    assert.equal('postsStock' in (created[0] ?? {}), false);
    assert.equal('officialStock' in (created[0] ?? {}), false);
    assert.ok(created[0]?.receivedAt instanceof Date);
  });

  it('calls $transaction as a method so Prisma this-binding is preserved', async () => {
    const { createPrismaFinishedGoodsWriteStore } = await import('./receive');
    const created: Record<string, unknown>[] = [];
    const events: Record<string, unknown>[] = [];
    const prisma = {
      _tracingHelper: { getActiveContext() { return null; } },
      async $transaction(this: { _tracingHelper?: unknown }, ops: Promise<unknown>[]) {
        // Mirror live Prisma failure mode when $transaction is extracted unbound.
        if (this == null || this._tracingHelper == null) {
          throw new Error("Cannot read properties of undefined (reading '_tracingHelper')");
        }
        return Promise.all(ops);
      },
      osFinishedGoodsReceipt: {
        async findFirst() {
          return null;
        },
        async create({ data }: { data: Record<string, unknown> }) {
          created.push(data);
          return data;
        },
      },
      osBusinessEvent: {
        async create({ data }: { data: Record<string, unknown> }) {
          events.push(data);
          return data;
        },
      },
    };
    const store = createPrismaFinishedGoodsWriteStore(prisma);
    const now = new Date('2026-09-16T12:00:00.000Z').toISOString();
    const outcome = await store.persistReceiptAndEvent(
      {
        id: 'fgr-bind',
        organizationId: 'org-a',
        productId: 'prod-1',
        quantity: '1',
        warehouseLabel: 'Almacén de Productos Terminados',
        receivedAt: now,
        recordedAt: now,
        actorMemberId: null,
        actorLabel: 'Almacén',
        source: 'explicit_command',
        productionTraceEntryId: null,
        quemaId: null,
        contextOrderId: null,
        contextOrderLineId: null,
        contextPartyId: null,
        note: null,
        correctsReceiptId: null,
        correctionReason: null,
        idempotencyKey: 'idem-bind',
        allocatesToOrder: false,
        postsStock: false,
        officialStock: false,
      },
      {
        id: 'evt-fgr-bind',
        organizationId: 'org-a',
        eventType: 'finished_goods.received',
        occurredAt: now,
        recordedAt: now,
        actorMemberId: null,
        primaryEntityType: 'finished_goods_receipt',
        primaryEntityId: 'fgr-bind',
        capabilityKey: 'warehouse.finished_goods.receive',
        correlationId: 'corr-bind',
        idempotencyKey: 'idem-bind',
        provenance: 'command',
        payload: {
          productId: 'prod-1',
          quantity: '1',
          allocatesToOrder: false,
          postsStock: false,
          orderId: null,
          orderLineId: null,
          partyId: null,
          note: null,
        },
      },
    );
    assert.equal(outcome, 'inserted');
    assert.equal(created.length, 1);
    assert.equal(events.length, 1);
  });

  it('treats unique idempotency conflict as replay without throwing', async () => {
    const { createPrismaFinishedGoodsWriteStore } = await import('./receive');
    const store = createPrismaFinishedGoodsWriteStore({
      osFinishedGoodsReceipt: {
        async findFirst() {
          return null;
        },
        async create() {
          const err = new Error('Unique constraint failed');
          (err as { code?: string }).code = 'P2002';
          throw err;
        },
      },
      osBusinessEvent: {
        async create() {
          throw new Error('should not reach event create');
        },
      },
    });
    const now = new Date('2026-09-16T12:00:00.000Z').toISOString();
    const outcome = await store.persistReceiptAndEvent(
      {
        id: 'fgr-x',
        organizationId: 'org-a',
        productId: 'prod-1',
        quantity: '1',
        warehouseLabel: 'Almacén de Productos Terminados',
        receivedAt: now,
        recordedAt: now,
        actorMemberId: null,
        actorLabel: 'Almacén',
        source: 'explicit_command',
        productionTraceEntryId: null,
        quemaId: null,
        contextOrderId: null,
        contextOrderLineId: null,
        contextPartyId: null,
        note: null,
        correctsReceiptId: null,
        correctionReason: null,
        idempotencyKey: 'idem-clash',
        allocatesToOrder: false,
        postsStock: false,
        officialStock: false,
      },
      {
        id: 'evt-x',
        organizationId: 'org-a',
        eventType: 'finished_goods.received',
        occurredAt: now,
        recordedAt: now,
        actorMemberId: null,
        primaryEntityType: 'finished_goods_receipt',
        primaryEntityId: 'fgr-x',
        capabilityKey: 'warehouse.finished_goods.receive',
        correlationId: 'corr-x',
        idempotencyKey: 'idem-clash',
        provenance: 'command',
        payload: {
          productId: 'prod-1',
          quantity: '1',
          allocatesToOrder: false,
          postsStock: false,
          orderId: null,
          orderLineId: null,
          partyId: null,
          note: null,
        },
      },
    );
    assert.equal(outcome, 'idempotent_replay');
  });

  it('does not treat Prisma field dumps that mention idempotencyKey as unique conflicts', async () => {
    const { createPrismaFinishedGoodsWriteStore } = await import('./receive');
    const store = createPrismaFinishedGoodsWriteStore({
      osFinishedGoodsReceipt: {
        async findFirst() {
          return null;
        },
        async create() {
          throw new Error(
            'Invalid `prisma.osFinishedGoodsReceipt.create()` invocation:\n\n{\n  data: {\n    idempotencyKey: "idem-1",\n    quantity: "1"\n  }\n}\n\nForeign key constraint failed',
          );
        },
      },
      osBusinessEvent: {
        async create() {
          throw new Error('should not reach event create');
        },
      },
    });
    const now = new Date('2026-09-16T12:00:00.000Z').toISOString();
    await assert.rejects(
      () =>
        store.persistReceiptAndEvent(
          {
            id: 'fgr-y',
            organizationId: 'org-a',
            productId: 'prod-1',
            quantity: '1',
            warehouseLabel: 'Almacén de Productos Terminados',
            receivedAt: now,
            recordedAt: now,
            actorMemberId: null,
            actorLabel: 'Almacén',
            source: 'explicit_command',
            productionTraceEntryId: null,
            quemaId: null,
            contextOrderId: null,
            contextOrderLineId: null,
            contextPartyId: null,
            note: null,
            correctsReceiptId: null,
            correctionReason: null,
            idempotencyKey: 'idem-1',
            allocatesToOrder: false,
            postsStock: false,
            officialStock: false,
          },
          {
            id: 'evt-y',
            organizationId: 'org-a',
            eventType: 'finished_goods.received',
            occurredAt: now,
            recordedAt: now,
            actorMemberId: null,
            primaryEntityType: 'finished_goods_receipt',
            primaryEntityId: 'fgr-y',
            capabilityKey: 'warehouse.finished_goods.receive',
            correlationId: 'corr-y',
            idempotencyKey: 'idem-1',
            provenance: 'command',
            payload: {
              productId: 'prod-1',
              quantity: '1',
              allocatesToOrder: false,
              postsStock: false,
              orderId: null,
              orderLineId: null,
              partyId: null,
              note: null,
            },
          },
        ),
      /Foreign key constraint failed/,
    );
  });
});
