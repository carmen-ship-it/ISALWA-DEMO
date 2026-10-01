/**
 * ADR 0003 (V1 delivery quantities): cumulative committed dispatch must not exceed the
 * current confirmed order-line quantity. Disposable in-memory fixtures only.
 *
 * Ledger decision under test (see delivery-command-service.ts): the customer delivery
 * note (nota) and the warehouse exit (salida) are two independent ledgers, each bounded
 * by the order line. They are never summed together, because a salida linked to a nota
 * describes the same physical goods. A salida linked to a reversed nota is excluded.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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

function setup(lineQuantity = 12) {
  const store = new MemoryDeliveryStore();
  store.putMember({
    id: 'member-a',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE],
  });
  store.putOrder({
    id: 'order-1',
    organizationId: 'org-a',
    partyId: 'party-a',
    orderNumber: 'PED-1',
    status: 'open',
    lines: [{ ...LINE, quantity: lineQuantity }],
  });
  return { store, svc: new DeliveryCommandService(store) };
}

const ctx = () => ({ organizationId: 'org-a', actorMemberId: 'member-a', effectiveAt: NOW });
const q = (quantity: number) => [{ orderLineId: 'line-1', quantity }];

const nota = (quantity: number) => ({
  orderId: 'order-1',
  recipient: 'Recepción',
  deliveredBy: 'Ana',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
});

const salida = (quantity: number, deliveryNoteId?: string) => ({
  orderId: 'order-1',
  exitedAt: '2026-09-14T13:00:00.000Z',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
  ...(deliveryNoteId ? { deliveryNoteId } : {}),
});

const entrega = (quantity: number, deliveryNoteId?: string) => ({
  orderId: 'order-1',
  deliveredAt: '2026-09-14T14:30:00.000Z',
  receivedBy: 'Cliente',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
  ...(deliveryNoteId ? { deliveryNoteId } : {}),
});

const rejectedValidation = (err: unknown) => err instanceof Error && err.message === 'VALIDATION_FAILED';

describe('ADR 0003 cumulative dispatch — delivery notes', () => {
  it('allows partial dispatches that add up to exactly the order quantity', async () => {
    const { svc, store } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(5));
    await svc.createNotaDeEntrega(ctx(), nota(7));
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 2);
  });

  it('rejects a note that would push the cumulative total past the order line', async () => {
    const { svc, store } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(5));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(8)), rejectedValidation);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('rejects any further dispatch once the order line is fully dispatched', async () => {
    const { svc, store } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('carries a machine-readable reason so callers can tell it from a generic validation error', async () => {
    const { svc } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(
      () => svc.createNotaDeEntrega(ctx(), nota(1)),
      (err: Error & { reason?: string }) => err.reason === 'DELIVERY_QUANTITY_EXCEEDS_ORDER',
    );
  });
});

describe('ADR 0003 cumulative dispatch — warehouse exits', () => {
  it('allows partial exits and rejects the one that exceeds the order line', async () => {
    const { svc, store } = setup();
    await svc.recordSalida(ctx(), salida(10));
    await svc.recordSalida(ctx(), salida(2));
    await assert.rejects(() => svc.recordSalida(ctx(), salida(1)), rejectedValidation);
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 2);
  });
});

describe('ADR 0003 — no double counting between nota, salida, and receipt', () => {
  it('does not count a salida linked to a nota on top of that nota', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    // Same physical goods, recorded again as the warehouse exit for that nota.
    await svc.recordSalida(ctx(), salida(12, created.deliveryNoteId));
  });

  it('still bounds the salida ledger on its own', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await svc.recordSalida(ctx(), salida(12, created.deliveryNoteId));
    await assert.rejects(() => svc.recordSalida(ctx(), salida(1, created.deliveryNoteId)), rejectedValidation);
  });

  it('recording receipt does not consume dispatchable quantity (ADR 0003: receipt must not count again)', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(5));
    await svc.recordSalida(ctx(), salida(5, created.deliveryNoteId));
    await svc.recordEntrega(ctx(), entrega(5, created.deliveryNoteId));
    await svc.recordEntrega(ctx(), entrega(5, created.deliveryNoteId));
    // 7 of 12 still dispatchable after two receipts of the same 5.
    await svc.createNotaDeEntrega(ctx(), nota(7));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
  });

  it('still lets a receipt be recorded after the line is fully dispatched', async () => {
    const { svc, store } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await svc.recordSalida(ctx(), salida(12, created.deliveryNoteId));
    const result = await svc.recordEntrega(ctx(), entrega(12, created.deliveryNoteId));
    assert.ok(result.deliveryId);
    assert.equal((await store.listAllDeliveries('org-a')).length, 1);
  });
});

describe('ADR 0003 — authorized, audited reversal restores dispatchable quantity', () => {
  it('rejects excess, then accepts it after the note is reversed', async () => {
    const { svc, store } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);

    const reversal = await svc.correctDeliveryDocument(ctx(), {
      deliveryNoteId: created.deliveryNoteId,
      reason: 'Cantidad mal registrada',
      recordedBy: 'member-a',
      source: 'employee_recorded' as const,
    });
    assert.equal(reversal.status, 'reversed');

    await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
    const notes = await store.listAllDeliveryNotes('org-a');
    assert.equal(notes.filter((note) => note.status === 'issued').length, 1);
  });

  it('does not let the reversal row itself double-restore quantity', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await svc.correctDeliveryDocument(ctx(), {
      deliveryNoteId: created.deliveryNoteId,
      reason: 'Error',
      recordedBy: 'member-a',
      source: 'employee_recorded' as const,
    });
    // Original (reversed) + reversal copy (reversed) must not make 24 dispatchable.
    await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(12)), rejectedValidation);
  });

  it('excludes a salida linked to a reversed nota, but keeps an unlinked salida counted', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(6));
    await svc.recordSalida(ctx(), salida(6, created.deliveryNoteId));
    await svc.recordSalida(ctx(), salida(6)); // unlinked: salida ledger now 12/12
    await svc.correctDeliveryDocument(ctx(), {
      deliveryNoteId: created.deliveryNoteId,
      reason: 'Error',
      recordedBy: 'member-a',
      source: 'employee_recorded' as const,
    });
    // Linked 6 restored; unlinked 6 still committed. 6 dispatchable, not 12 and not 0.
    await svc.recordSalida(ctx(), salida(6));
    await assert.rejects(() => svc.recordSalida(ctx(), salida(1)), rejectedValidation);
  });

  it('a recorded receipt alone never restores quantity (a return needs a reversal, not a receipt)', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await svc.recordSalida(ctx(), salida(12, created.deliveryNoteId));
    await svc.recordEntrega(ctx(), entrega(12, created.deliveryNoteId));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
  });
});

describe('ADR 0003 — current confirmed order quantity governs', () => {
  it('blocks further dispatch when the order line was revised below what is already dispatched', async () => {
    const { svc, store } = setup(12);
    await svc.createNotaDeEntrega(ctx(), nota(10));
    store.putOrder({
      id: 'order-1',
      organizationId: 'org-a',
      partyId: 'party-a',
      orderNumber: 'PED-1',
      status: 'open',
      lines: [{ ...LINE, quantity: 8 }],
    });
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
  });

  it('allows additional dispatch after the order line is revised upward', async () => {
    const { svc, store } = setup(12);
    await svc.createNotaDeEntrega(ctx(), nota(12));
    store.putOrder({
      id: 'order-1',
      organizationId: 'org-a',
      partyId: 'party-a',
      orderNumber: 'PED-1',
      status: 'open',
      lines: [{ ...LINE, quantity: 15 }],
    });
    await svc.createNotaDeEntrega(ctx(), nota(3));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
  });
});

describe('ADR 0003 — concurrent dispatch is enforced atomically', () => {
  it('lets exactly one of two concurrent notes through when together they exceed the line', async () => {
    const { svc, store } = setup();
    const results = await Promise.allSettled([
      svc.createNotaDeEntrega(ctx(), nota(8)),
      svc.createNotaDeEntrega(ctx(), nota(8)),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('lets exactly one of two concurrent salidas through when together they exceed the line', async () => {
    const { svc, store } = setup();
    const results = await Promise.allSettled([svc.recordSalida(ctx(), salida(8)), svc.recordSalida(ctx(), salida(8))]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 1);
  });

  it('lets two concurrent partial notes through when they fit', async () => {
    const { svc, store } = setup();
    const results = await Promise.allSettled([
      svc.createNotaDeEntrega(ctx(), nota(6)),
      svc.createNotaDeEntrega(ctx(), nota(6)),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 2);
  });
});

describe('ADR 0003 — historical over-delivery is reported, never rewritten', () => {
  async function overDeliveredFixture() {
    const { svc, store } = setup(10);
    // Simulate pre-ADR rows: two notes of 8 against a line of 10 (16 > 10).
    for (const id of ['hist-1', 'hist-2']) {
      await store.insertDeliveryNote({
        id,
        organizationId: 'org-a',
        deliveryId: null,
        orderId: 'order-1',
        partyId: 'party-a',
        documentKind: 'nota_de_entrega',
        numberingPolicy: 'provisional_internal',
        noteNumber: null,
        internalDocumentRef: `NE-${id}`,
        displayDocumentNumber: null,
        externalDocumentNumber: null,
        status: 'issued',
        recipient: 'Cliente',
        deliveredBy: 'Ana',
        receivedBy: null,
        observations: null,
        locationId: null,
        createdByMemberId: 'member-a',
        correctsNoteId: null,
        supersedesNoteId: null,
        correctionReason: null,
        deliveredAt: null,
        bornAt: '2026-09-01T10:00:00.000Z',
        claimsInvoice: false,
        claimsTax: false,
        createdAt: '2026-09-01T10:00:00.000Z',
      });
      await store.insertDeliveryNoteLines([
        { id: `${id}-l`, organizationId: 'org-a', noteId: id, ...LINE, quantity: 8 },
      ]);
    }
    return { svc, store };
  }

  it('reports the over-delivered order and line without changing any stored row', async () => {
    const { svc, store } = await overDeliveredFixture();
    const before = JSON.stringify(await store.listAllDeliveryNotes('org-a'));
    const report = await svc.reportOverDeliveredOrders(ctx());
    assert.equal(report.length, 1);
    assert.equal(report[0]?.orderId, 'order-1');
    assert.deepEqual(report[0]?.lines, [
      {
        orderLineId: 'line-1',
        ordered: 10,
        committedDeliveryNotes: 16,
        committedWarehouseExits: 0,
        excessDeliveryNotes: 6,
        excessWarehouseExits: 0,
      },
    ]);
    assert.equal(JSON.stringify(await store.listAllDeliveryNotes('org-a')), before);
  });

  it('blocks further dispatch on an already over-delivered order', async () => {
    const { svc } = await overDeliveredFixture();
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), rejectedValidation);
  });

  it('does not report an order that is within its quantity', async () => {
    const { svc } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(12));
    assert.deepEqual(await svc.reportOverDeliveredOrders(ctx()), []);
  });

  it('exposes the per-line dispatch balance for an order', async () => {
    const { svc } = setup();
    await svc.createNotaDeEntrega(ctx(), nota(5));
    const balance = await svc.getDispatchBalanceForOrder(ctx(), 'order-1');
    assert.deepEqual(balance.lines, [
      {
        orderLineId: 'line-1',
        ordered: 12,
        committedDeliveryNotes: 5,
        committedWarehouseExits: 0,
        remainingDeliveryNotes: 7,
        remainingWarehouseExits: 12,
      },
    ]);
  });
});
