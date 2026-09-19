import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE } from '@isalwa/os-contracts';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const LINE = {
  orderLineId: 'line-1',
  productRef: 'jar-500',
  description: 'Mermelada 500g',
  quantity: 12,
  unitLabel: 'unidades',
};

function readyStore() {
  const store = new MemoryDeliveryStore();
  const both = [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE];
  store.putMember({
    id: 'member-a',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: both,
  });
  store.putOrder({
    id: 'order-1',
    organizationId: 'org-a',
    partyId: 'party-a',
    orderNumber: 'PED-1',
    status: 'open',
    lines: [LINE],
  });
  return store;
}

function ctx() {
  return {
    organizationId: 'org-a',
    actorMemberId: 'member-a',
    effectiveAt: NOW,
  };
}

const nota = {
  orderId: 'order-1',
  recipient: 'Recepción',
  deliveredBy: 'Ana',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: [{ orderLineId: 'line-1', quantity: 1 }],
};

describe('delivery create retry', () => {
  it('replays nota, salida, and entrega on the same key and allows a later key', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);

    const firstNota = await svc.execute('CreateNotaDeEntrega', ctx(), nota, 'attempt-nota');
    const replayNota = await svc.execute('CreateNotaDeEntrega', ctx(), nota, 'attempt-nota');
    assert.equal(replayNota.data.deliveryNoteId, firstNota.data.deliveryNoteId);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);

    const laterNota = await svc.execute('CreateNotaDeEntrega', ctx(), nota, 'attempt-nota-2');
    assert.notEqual(laterNota.data.deliveryNoteId, firstNota.data.deliveryNoteId);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 2);

    const salidaPayload = {
      orderId: 'order-1',
      exitedAt: '2026-09-14T13:00:00.000Z',
      recordedBy: 'member-a',
      source: 'employee_recorded' as const,
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
    };
    const firstSalida = await svc.execute('RecordSalida', ctx(), salidaPayload, 'attempt-salida');
    const replaySalida = await svc.execute('RecordSalida', ctx(), {
      ...salidaPayload,
      exitedAt: '2026-09-14T13:05:00.000Z',
    }, 'attempt-salida');
    assert.equal(replaySalida.data.warehouseExitId, firstSalida.data.warehouseExitId);
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 1);

    const entregaPayload = {
      orderId: 'order-1',
      deliveredAt: '2026-09-14T14:30:00.000Z',
      receivedBy: 'Cliente',
      recordedBy: 'member-a',
      source: 'employee_recorded' as const,
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
    };
    const firstEntrega = await svc.execute('RecordEntrega', ctx(), entregaPayload, 'attempt-entrega');
    const replayEntrega = await svc.execute('RecordEntrega', ctx(), entregaPayload, 'attempt-entrega');
    assert.equal(replayEntrega.data.deliveryId, firstEntrega.data.deliveryId);
    assert.equal((await store.listAllDeliveries('org-a')).length, 1);

    const laterEntrega = await svc.execute('RecordEntrega', ctx(), entregaPayload, 'attempt-entrega-2');
    assert.notEqual(laterEntrega.data.deliveryId, firstEntrega.data.deliveryId);
    assert.equal((await store.listAllDeliveries('org-a')).length, 2);
  });

  it('does not insert when the same key is already claimed', async () => {
    const store = readyStore();
    const svc = new DeliveryCommandService(store);
    await store.saveIdempotency({
      organizationId: 'org-a',
      key: 'in-flight',
      commandName: 'CreateNotaDeEntrega',
      resultJson: { pending: true },
      expiresAt: new Date(Date.now() + 60_000),
    });
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx(), nota, 'in-flight'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 0);
  });
});
