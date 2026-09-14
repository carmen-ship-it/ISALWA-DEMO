import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
} from '../../os-contracts/src/delivery';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';
import type {
  DeliveryNoteRecord,
  DeliveryRecord,
  WarehouseExitRecord,
} from './store-types';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const FOREIGN_SECRET = 'org-b-recipient-secreto';

class LeakyDeliveryStore extends MemoryDeliveryStore {
  override async getWarehouseExit(_organizationId: string, warehouseExitId: string) {
    return this.warehouseExitRows().find((row) => row.id === warehouseExitId) ?? null;
  }

  override async getDelivery(_organizationId: string, deliveryId: string) {
    return this.deliveryRows().find((row) => row.id === deliveryId) ?? null;
  }

  override async getDeliveryNoteById(_organizationId: string, noteId: string) {
    return this.deliveryNoteRows().find((row) => row.id === noteId) ?? null;
  }

  override async listAllWarehouseExits(_organizationId: string) {
    return this.warehouseExitRows();
  }

  override async listAllDeliveries(_organizationId: string) {
    return this.deliveryRows();
  }

  override async listAllDeliveryNotes(_organizationId: string) {
    return this.deliveryNoteRows();
  }

  override async listRecipientCandidates(_organizationId: string) {
    return this.recipientRows();
  }
}

function exitRow(over: Partial<WarehouseExitRecord> = {}): WarehouseExitRecord {
  return {
    id: 'exit-a',
    organizationId: 'org-a',
    orderId: 'order-1',
    exitedAt: '2026-09-14T13:00:00.000Z',
    recordedByMemberId: 'member-warehouse',
    source: 'employee_recorded',
    notes: 'salida-org-a',
    createdAt: NOW.toISOString(),
    ...over,
  };
}

function deliveryRow(over: Partial<DeliveryRecord> = {}): DeliveryRecord {
  return {
    id: 'delivery-a',
    organizationId: 'org-a',
    orderId: 'order-1',
    deliveredAt: '2026-09-14T14:30:00.000Z',
    deliveredTo: 'Local Vainsa',
    recordedByMemberId: 'member-delivery',
    source: 'employee_recorded',
    notes: 'entrega-org-a',
    createdAt: NOW.toISOString(),
    ...over,
  };
}

function noteRow(over: Partial<DeliveryNoteRecord> = {}): DeliveryNoteRecord {
  return {
    id: 'note-a',
    organizationId: 'org-a',
    deliveryId: 'delivery-a',
    orderId: 'order-1',
    documentKind: 'nota_de_entrega',
    numberingPolicy: 'unknown',
    noteNumber: null,
    deliveredAt: '2026-09-14T14:30:00.000Z',
    bornAt: '2026-09-14T14:30:00.000Z',
    claimsInvoice: false,
    claimsTax: false,
    createdAt: NOW.toISOString(),
    ...over,
  };
}

function seededStore() {
  const store = new LeakyDeliveryStore();
  store.putMember({
    id: 'member-warehouse',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: [WAREHOUSE_EXIT_RECORD_SCOPE],
  });
  store.putMember({
    id: 'member-delivery',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: [CUSTOMER_DELIVERY_RECORD_SCOPE],
  });
  store.putMember({
    id: 'member-both',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE],
  });
  store.putMember({
    id: 'member-none',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: ['people.admin'],
  });
  store.putMember({
    id: 'member-b',
    organizationId: 'org-b',
    accessStatus: 'active',
    grantedScopes: [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE],
  });
  store.putOrder({ id: 'order-1', organizationId: 'org-a', status: 'open', lines: null });
  store.putOrder({ id: 'order-b', organizationId: 'org-b', status: 'open', lines: null });
  return store;
}

async function seedBothTenants(store: LeakyDeliveryStore) {
  await store.insertWarehouseExit(exitRow());
  await store.insertWarehouseExit(
    exitRow({
      id: 'exit-b',
      organizationId: 'org-b',
      orderId: 'order-b',
      notes: FOREIGN_SECRET,
      recordedByMemberId: 'member-b',
    }),
  );
  await store.insertDelivery(deliveryRow());
  await store.insertDelivery(
    deliveryRow({
      id: 'delivery-b',
      organizationId: 'org-b',
      orderId: 'order-b',
      deliveredTo: FOREIGN_SECRET,
      notes: FOREIGN_SECRET,
      recordedByMemberId: 'member-b',
    }),
  );
  await store.insertDelivery(
    deliveryRow({ id: 'delivery-a-2', deliveredTo: 'Local Vainsa', notes: 'segunda-org-a' }),
  );
  await store.insertDeliveryNote(noteRow());
  await store.insertDeliveryNote(
    noteRow({
      id: 'note-b',
      organizationId: 'org-b',
      deliveryId: 'delivery-b',
      orderId: 'order-b',
    }),
  );
  await store.insertDeliveryNote(noteRow({ id: 'note-a-2', deliveryId: 'delivery-a-2' }));
  await store.insertEvidence({
    id: 'evidence-b',
    organizationId: 'org-b',
    subjectType: 'delivery',
    subjectId: 'delivery-b',
    role: 'delivery_confirmation',
    recordedByMemberId: 'member-b',
    reference: null,
    note: null,
    paymentState: null,
    exceptionReason: null,
    authorizedByMemberId: null,
    recipient: FOREIGN_SECRET,
    signatureReference: null,
    confirmedLedgerPayment: false,
    ledgerPosting: 'none',
    signatureMethod: null,
    createdAt: NOW.toISOString(),
  });
}

function ctx(actorMemberId: string, organizationId: string | null | undefined = 'org-a') {
  return { organizationId, actorMemberId, effectiveAt: NOW };
}

function sessionWithoutOrg(actorMemberId: string, organizationId: string | null | undefined) {
  return { organizationId, actorMemberId, effectiveAt: NOW };
}

function assertNotTheRow(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  assert.equal(message.includes(FOREIGN_SECRET), false);
  assert.equal(message.includes('org-b'), false);
  assert.equal(message.includes('note-b'), false);
  assert.equal(message.includes('delivery-b'), false);
  assert.equal(message.includes('exit-b'), false);
}

describe('delivery tenant and role isolation', () => {
  it('allows a same-tenant read of warehouse exit, delivery, and delivery note', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);

    const exit = await service.getWarehouseExitById(ctx('member-warehouse'), 'exit-a');
    assert.equal(exit.organizationId, 'org-a');
    assert.equal(exit.id, 'exit-a');

    const delivery = await service.getDeliveryById(ctx('member-delivery'), 'delivery-a');
    assert.equal(delivery.organizationId, 'org-a');
    assert.equal(delivery.id, 'delivery-a');

    const note = await service.getDeliveryNoteById(ctx('member-delivery'), 'note-a');
    assert.equal(note.organizationId, 'org-a');
    assert.equal(note.noteNumber, null);
    assert.equal(note.numberingPolicy, 'unknown');
  });

  it('denies the same tenant when the role does not match the resource', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);

    await assert.rejects(
      () => service.getWarehouseExitById(ctx('member-delivery'), 'exit-a'),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => service.getDeliveryById(ctx('member-warehouse'), 'delivery-a'),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => service.getDeliveryNoteById(ctx('member-warehouse'), 'note-a'),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => service.listDeliveryNotesForSession(ctx('member-none')),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx('member-delivery'), {
          orderId: 'order-1',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedBy: 'member-delivery',
          source: 'employee_recorded',
        }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(ctx('member-warehouse'), {
          orderId: 'order-1',
          deliveredAt: '2026-09-14T14:00:00.000Z',
          recordedBy: 'member-warehouse',
          source: 'employee_recorded',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).some((row) => row.id === 'note-b'), false);
  });

  it('returns not found for a direct get from the wrong organization and does not return the row', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);

    await assert.rejects(() => service.getWarehouseExitById(ctx('member-warehouse'), 'exit-b'), (err: unknown) => {
      assert.match(err instanceof Error ? err.message : String(err), /^NOT_FOUND$/);
      assertNotTheRow(err);
      return true;
    });
    await assert.rejects(() => service.getDeliveryById(ctx('member-delivery'), 'delivery-b'), (err: unknown) => {
      assert.match(err instanceof Error ? err.message : String(err), /^NOT_FOUND$/);
      assertNotTheRow(err);
      return true;
    });
    await assert.rejects(() => service.getDeliveryNoteById(ctx('member-delivery'), 'note-b'), (err: unknown) => {
      assert.match(err instanceof Error ? err.message : String(err), /^NOT_FOUND$/);
      assertNotTheRow(err);
      return true;
    });
  });

  it('denies a direct call when the session has no organization', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);
    const missing = [undefined, null, '', '   '] as const;

    for (const organizationId of missing) {
      await assert.rejects(
        () => service.getWarehouseExitById(sessionWithoutOrg('member-warehouse', organizationId), 'exit-b'),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.getDeliveryById(sessionWithoutOrg('member-delivery', organizationId), 'delivery-b'),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.getDeliveryNoteById(sessionWithoutOrg('member-delivery', organizationId), 'note-b'),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.searchWarehouseExits(sessionWithoutOrg('member-warehouse', organizationId), FOREIGN_SECRET),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.searchDeliveries(sessionWithoutOrg('member-delivery', organizationId), FOREIGN_SECRET),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.searchDeliveryNotes(sessionWithoutOrg('member-delivery', organizationId), 'order-b'),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.aggregateWarehouseExits(sessionWithoutOrg('member-warehouse', organizationId)),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.aggregateDeliveries(sessionWithoutOrg('member-delivery', organizationId)),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.aggregateDeliveryNotes(sessionWithoutOrg('member-delivery', organizationId)),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.listDeliveryNotesForSession(sessionWithoutOrg('member-delivery', organizationId)),
        /TENANT_FORBIDDEN/,
      );
      await assert.rejects(
        () => service.suggestRecipients(sessionWithoutOrg('member-delivery', organizationId), 'secreto'),
        /TENANT_FORBIDDEN/,
      );
    }
  });

  it('does not leak another tenant through search', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);

    const exits = await service.searchWarehouseExits(ctx('member-warehouse'), 'secreto');
    assert.deepEqual(exits, []);
    const ownExits = await service.searchWarehouseExits(ctx('member-warehouse'), 'salida-org-a');
    assert.equal(ownExits.length, 1);
    assert.equal(ownExits[0]?.organizationId, 'org-a');

    const deliveries = await service.searchDeliveries(ctx('member-delivery'), FOREIGN_SECRET);
    assert.deepEqual(deliveries, []);
    const ownDeliveries = await service.searchDeliveries(ctx('member-delivery'), 'Local Vainsa');
    assert.ok(ownDeliveries.length >= 1);
    assert.equal(ownDeliveries.every((row) => row.organizationId === 'org-a'), true);
    assert.equal(ownDeliveries.some((row) => row.id === 'delivery-b'), false);

    const notes = await service.searchDeliveryNotes(ctx('member-delivery'), 'order-b');
    assert.deepEqual(notes, []);
    const ownNotes = await service.searchDeliveryNotes(ctx('member-delivery'), 'order-1');
    assert.equal(ownNotes.every((row) => row.organizationId === 'org-a'), true);
    assert.equal(ownNotes.some((row) => row.id === 'note-b'), false);
  });

  it('does not leak another tenant through aggregates, the note list, or recipient suggestions', async () => {
    const store = seededStore();
    await seedBothTenants(store);
    const service = new DeliveryCommandService(store);

    assert.deepEqual(await service.aggregateWarehouseExits(ctx('member-warehouse')), { count: 1 });
    assert.deepEqual(await service.aggregateDeliveries(ctx('member-delivery')), { count: 2 });
    assert.deepEqual(await service.aggregateDeliveryNotes(ctx('member-delivery')), { count: 2 });

    const notes = await service.listDeliveryNotesForSession(ctx('member-delivery'));
    assert.equal(notes.every((row) => row.organizationId === 'org-a'), true);
    assert.equal(notes.some((row) => row.id === 'note-b'), false);
    assert.equal(notes.some((row) => row.noteNumber !== null), false);

    const suggestions = await service.suggestRecipients(ctx('member-delivery'), 'secreto');
    assert.equal(suggestions.includes(FOREIGN_SECRET), false);
    assert.deepEqual(suggestions, []);
    const own = await service.suggestRecipients(ctx('member-delivery'), 'vainsa');
    assert.deepEqual(own, ['Local Vainsa']);
    assert.equal(own.some((name) => name.includes('org-b')), false);
  });
});
