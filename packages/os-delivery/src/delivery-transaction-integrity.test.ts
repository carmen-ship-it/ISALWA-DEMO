/**
 * D3 delivery integrity: each command is all-or-nothing, a failed command can be retried
 * with the same idempotency key without leaving or duplicating partial rows, and
 * concurrent corrections of one note cannot both succeed. Disposable in-memory fixtures.
 *
 * MemoryDeliveryStore proves service logic only. It is not Postgres. Real row-lock and
 * rollback behaviour on Postgres is UNPROVEN here (no database is used).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE } from '@isalwa/os-contracts';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';
import type { DeliveryNoteRecord, NoteLineRecord } from './store-types';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const LINE = {
  orderLineId: 'line-1',
  productRef: 'jar-500',
  description: 'Mermelada 500g',
  quantity: 12,
  unitLabel: 'unidades',
};

type Fault = 'noteLines' | 'outboundLines' | 'reversalInsert' | 'reversalLines' | 'evidence';

class FaultyStore extends MemoryDeliveryStore {
  private armed = new Set<Fault>();
  arm(fault: Fault) {
    this.armed.add(fault);
  }
  private trip(fault: Fault) {
    if (this.armed.delete(fault)) throw new Error('INJECTED_FAILURE');
  }
  override async insertDeliveryNoteLines(rows: NoteLineRecord[]) {
    const owner = rows[0]
      ? (await this.listAllDeliveryNotes('org-a')).find((note) => note.id === rows[0]?.noteId)
      : undefined;
    if (owner?.correctsNoteId) this.trip('reversalLines');
    else this.trip('noteLines');
    return super.insertDeliveryNoteLines(rows);
  }
  override async insertDeliveryNote(row: DeliveryNoteRecord) {
    if (row.correctsNoteId) this.trip('reversalInsert');
    return super.insertDeliveryNote(row);
  }
  override async insertOutboundLines(rows: NoteLineRecord[]) {
    this.trip('outboundLines');
    return super.insertOutboundLines(rows);
  }
  override async insertEvidence(row: Parameters<MemoryDeliveryStore['insertEvidence']>[0]) {
    this.trip('evidence');
    return super.insertEvidence(row);
  }
}

function setup() {
  const store = new FaultyStore();
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
    lines: [LINE],
  });
  return { store, svc: new DeliveryCommandService(store) };
}

const ctx = () => ({ organizationId: 'org-a', actorMemberId: 'member-a', effectiveAt: NOW });
const q = (quantity: number) => [{ orderLineId: 'line-1', quantity }];
const nota = (quantity = 3) => ({
  orderId: 'order-1',
  recipient: 'Recepción',
  deliveredBy: 'Ana',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
});
const salida = (quantity = 3) => ({
  orderId: 'order-1',
  exitedAt: '2026-09-14T13:00:00.000Z',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
});
const entrega = (deliveryNoteId?: string) => ({
  orderId: 'order-1',
  deliveredAt: '2026-09-14T14:30:00.000Z',
  receivedBy: 'Cliente',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(1),
  evidenceReference: 'foto-1',
  ...(deliveryNoteId ? { deliveryNoteId } : {}),
});

describe('D3 — a command that fails part-way leaves nothing behind', () => {
  it('rolls back the nota row when its lines cannot be written', async () => {
    const { store, svc } = setup();
    store.arm('noteLines');
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota()), /INJECTED_FAILURE/);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 0);
  });

  it('rolls back the salida and its outbound note when the outbound lines cannot be written', async () => {
    const { store, svc } = setup();
    store.arm('outboundLines');
    await assert.rejects(() => svc.recordSalida(ctx(), salida()), /INJECTED_FAILURE/);
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 0);
    assert.equal((await store.listDomainEvents('org-a')).length, 0);
  });

  it('rolls back the entrega and the note link when evidence cannot be written', async () => {
    const { store, svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota());
    await svc.recordSalida(ctx(), salida());
    store.arm('evidence');
    await assert.rejects(() => svc.recordEntrega(ctx(), entrega(created.deliveryNoteId)), /INJECTED_FAILURE/);
    assert.equal((await store.listAllDeliveries('org-a')).length, 0);
    const note = await store.getDeliveryNoteById('org-a', created.deliveryNoteId);
    assert.equal(note?.deliveryId, null);
    assert.equal(note?.receivedBy, null);
  });

  it('keeps the original note issued when the reversal row cannot be written', async () => {
    const { store, svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota());
    store.arm('reversalInsert');
    await assert.rejects(
      () =>
        svc.correctDeliveryDocument(ctx(), {
          deliveryNoteId: created.deliveryNoteId,
          reason: 'Error',
          recordedBy: 'member-a',
          source: 'employee_recorded' as const,
        }),
      /INJECTED_FAILURE/,
    );
    const note = await store.getDeliveryNoteById('org-a', created.deliveryNoteId);
    assert.equal(note?.status, 'issued');
    assert.equal(note?.correctionReason, null);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('does not leave an original reversed with a missing reversal when reversal lines fail', async () => {
    const { store, svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota());
    store.arm('reversalLines');
    await assert.rejects(
      () =>
        svc.correctDeliveryDocument(ctx(), {
          deliveryNoteId: created.deliveryNoteId,
          reason: 'Error',
          recordedBy: 'member-a',
          source: 'employee_recorded' as const,
        }),
      /INJECTED_FAILURE/,
    );
    const notes = await store.listAllDeliveryNotes('org-a');
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.status, 'issued');
  });
});

describe('D3 — retry with the same idempotency key after a failed command', () => {
  it('re-runs cleanly and creates exactly one nota (no orphaned first attempt)', async () => {
    const { store, svc } = setup();
    store.arm('noteLines');
    await assert.rejects(() => svc.execute('CreateNotaDeEntrega', ctx(), nota(), 'retry-1'), /INJECTED_FAILURE/);
    const retried = await svc.execute('CreateNotaDeEntrega', ctx(), nota(), 'retry-1');
    assert.ok(retried.data.deliveryNoteId);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
    assert.equal((await store.listDomainEvents('org-a')).length, 1);
  });

  it('a retry after a failed salida does not double-dispatch (ADR 0003 quantity stays correct)', async () => {
    const { store, svc } = setup();
    store.arm('outboundLines');
    await assert.rejects(() => svc.execute('RecordSalida', ctx(), salida(12), 'retry-2'), /INJECTED_FAILURE/);
    await svc.execute('RecordSalida', ctx(), salida(12), 'retry-2');
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 1);
  });

  it('still replays a successful command on the same key without re-running it', async () => {
    const { store, svc } = setup();
    const first = await svc.execute('CreateNotaDeEntrega', ctx(), nota(), 'replay-1');
    const second = await svc.execute('CreateNotaDeEntrega', ctx(), nota(), 'replay-1');
    assert.equal(second.data.deliveryNoteId, first.data.deliveryNoteId);
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });

  it('keeps a validation failure retryable with a corrected payload on the same key', async () => {
    const { store, svc } = setup();
    await assert.rejects(
      () => svc.execute('CreateNotaDeEntrega', ctx(), nota(99), 'retry-3'),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
    await svc.execute('CreateNotaDeEntrega', ctx(), nota(3), 'retry-3');
    assert.equal((await store.listAllDeliveryNotes('org-a')).length, 1);
  });
});

describe('D3 — corrections are single-winner under concurrency', () => {
  const correction = (deliveryNoteId: string) => ({
    deliveryNoteId,
    reason: 'Error',
    recordedBy: 'member-a',
    source: 'employee_recorded' as const,
  });

  it('lets exactly one of two concurrent corrections reverse a note and create one reversal', async () => {
    const { store, svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    const results = await Promise.allSettled([
      svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
      svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const loser = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    assert.equal((loser.reason as Error).message, 'NOT_FOUND');
    const notes = await store.listAllDeliveryNotes('org-a');
    assert.equal(notes.filter((note) => note.correctsNoteId === created.deliveryNoteId).length, 1);
    // The reversed total must restore exactly 12, never 24, of dispatchable quantity.
    await svc.createNotaDeEntrega(ctx(), nota(12));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), /VALIDATION_FAILED/);
  });

  it('a single correction still succeeds and a second sequential one is refused', async () => {
    const { svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota());
    const done = await svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId));
    assert.equal(done.status, 'reversed');
    await assert.rejects(
      () => svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('a receipt racing a correction can never resurrect a reversed note', async () => {
    const { store, svc } = setup();
    const created = await svc.createNotaDeEntrega(ctx(), nota());
    await svc.recordSalida(ctx(), salida());
    await Promise.allSettled([
      svc.recordEntrega(ctx(), entrega(created.deliveryNoteId)),
      svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
    ]);
    const note = await store.getDeliveryNoteById('org-a', created.deliveryNoteId);
    assert.equal(note?.status, 'reversed');
  });
});

describe('D3 — the Pedido timeline is unchanged by the transactional wrapper', () => {
  it('still records events for committed commands and none for rolled-back ones', async () => {
    const { store, svc } = setup();
    store.arm('noteLines');
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota()), /INJECTED_FAILURE/);
    assert.equal((await svc.listTimelineForOrder(ctx(), 'order-1')).length, 0);
    await svc.createNotaDeEntrega(ctx(), nota());
    const timeline = await svc.listTimelineForOrder(ctx(), 'order-1');
    assert.deepEqual(
      timeline.map((item) => item.eventType),
      ['delivery_note.created'],
    );
  });
});
