import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MemoryFinishedGoodsWriteStore,
  receiveAuthorizesAllocate,
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
  it('records Listo without allocating, posting stock, or linking an order', async () => {
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
    assert.equal(result.migrationApplied, false);
    assert.equal(result.event.eventType, 'finished_goods.received');
    assert.equal(result.event.capabilityKey, 'warehouse.finished_goods.receive');
    assert.equal(receiveAuthorizesAllocate(), false);
    assert.equal(JSON.stringify(result).includes('orderId'), false);
  });

  it('does not treat allocate as receive and rejects an order link', async () => {
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
});
