import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  ENTREGA_PANEL_COPY,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  assertNoteDoesNotPredateDelivery,
  assignDeliveryNoteNumber,
  assignWarehouseOutboundNumber,
  createDeliveryNoteWithoutDelivery,
  noteBeforeDelivery,
  outboundNoteIsDeliveryNote,
  paymentExceptionIsConfirmedLedgerPayment,
  paymentRequiredBeforeDelivery,
  warehouseExitIsCustomerDelivery,
} from '../../os-contracts/src/delivery';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const DELIVERED_AT = '2026-09-14T14:30:00.000Z';
const EXITED_AT = '2026-09-14T13:00:00.000Z';

function storeWithOrder(lines: readonly unknown[] | null = null) {
  const store = new MemoryDeliveryStore();
  const both = [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE];
  store.putMember({ id: 'member-a', organizationId: 'org-a', accessStatus: 'active', grantedScopes: both });
  store.putMember({ id: 'member-b', organizationId: 'org-a', accessStatus: 'active', grantedScopes: [] });
  store.putMember({ id: 'member-c', organizationId: 'org-b', accessStatus: 'active', grantedScopes: both });
  store.putOrder({ id: 'order-1', organizationId: 'org-a', status: 'open', lines });
  store.putOrder({ id: 'order-b', organizationId: 'org-b', status: 'open', lines: null });
  return store;
}

function ctx(over: Partial<{ organizationId: string; actorMemberId: string; effectiveAt: Date }> = {}) {
  return {
    organizationId: 'org-a',
    actorMemberId: 'member-a',
    effectiveAt: NOW,
    ...over,
  };
}

function deliveryPayload(over: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    deliveredAt: DELIVERED_AT,
    deliveredTo: 'Local Vainsa',
    recordedBy: 'member-a',
    notes: 'Entregado en el local',
    source: 'employee_recorded',
    ...over,
  };
}

function exitPayload(over: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    exitedAt: EXITED_AT,
    recordedBy: 'member-a',
    notes: 'Salió del almacén',
    source: 'employee_recorded',
    ...over,
  };
}

describe('delivery and nota de entrega boundary', () => {
  it('does not create a nota before delivery', async () => {
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    assert.equal(noteBeforeDelivery(), null);
    assert.equal(createDeliveryNoteWithoutDelivery.name.length > 0, true);
    await assert.rejects(() => Promise.resolve().then(() => service.createNoteBeforeDelivery()), /DELIVERY_REQUIRED/);
    const notes = await service.listNotesForOrder(ctx(), 'order-1');
    assert.deepEqual(notes, []);
    assert.equal((await store.listDeliveries('org-a', 'order-1')).length, 0);
  });

  it('creates the nota de entrega only when customer delivery is recorded', async () => {
    const store = storeWithOrder([
      {
        orderLineId: 'line-1',
        productRef: 'jar-500',
        description: 'Mermelada 500g',
        quantity: 12,
        unitLabel: 'unidades',
        unitPriceCentavos: 2500,
      },
    ]);
    const service = new DeliveryCommandService(store);
    const result = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    assert.equal(result.documentKind, 'nota_de_entrega');
    assert.equal(result.noteNumber, null);
    assert.equal(result.numberingPolicy, 'unknown');
    assert.equal(result.claimsInvoice, false);
    assert.equal(result.claimsTax, false);
    assert.equal(result.warehouseExitId, null);
    assert.equal(result.outboundNoteId, null);
    assert.equal(result.bornAt, DELIVERED_AT);
    assert.equal(result.paymentRequired, false);
    assert.equal(result.confirmedLedgerPayment, false);
    const note = await store.getDeliveryNote('org-a', result.deliveryId);
    assert.equal(note?.deliveryId, result.deliveryId);
    assert.equal(note?.documentKind, 'nota_de_entrega');
    assert.equal(note?.noteNumber, null);
    const lines = await store.listDeliveryNoteLines('org-a', result.deliveryNoteId);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.quantity, 12);
    assert.equal(lines[0]?.description, 'Mermelada 500g');
    assert.equal('unitPriceCentavos' in (lines[0] ?? {}), false);
    assert.equal((await store.listWarehouseExits('org-a', 'order-1')).length, 0);
  });

  it('does not invent lines when the order has none', async () => {
    const store = storeWithOrder(null);
    const service = new DeliveryCommandService(store);
    const result = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    assert.equal(result.lineCount, 0);
    assert.deepEqual(await store.listDeliveryNoteLines('org-a', result.deliveryNoteId), []);
  });

  it('refuses an invented number, an invoice claim, and a signature method', async () => {
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () => service.recordCustomerDelivery(ctx(), deliveryPayload({ noteNumber: 'NE-000001' })),
      /NUMBERING_POLICY_UNKNOWN/,
    );
    await assert.rejects(
      () => service.recordCustomerDelivery(ctx(), deliveryPayload({ invoiceNumber: 'F-1' })),
      /INVOICE_CLAIM_REFUSED/,
    );
    await assert.rejects(
      () => service.recordCustomerDelivery(ctx(), deliveryPayload({ taxRate: '13' })),
      /TAX_CLAIM_REFUSED/,
    );
    await assert.rejects(
      () => service.recordCustomerDelivery(ctx(), deliveryPayload({ signatureMethod: 'digital' })),
      /SIGNATURE_NOT_IN_PRODUCT/,
    );
    assert.throws(() => assignDeliveryNoteNumber('NE-000001'), /NUMBERING_POLICY_UNKNOWN/);
    assert.throws(() => assignWarehouseOutboundNumber('NS-000001'), /NUMBERING_POLICY_UNKNOWN/);
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).length, 0);
  });

  it('keeps warehouse exit distinct from customer delivery', async () => {
    assert.equal(warehouseExitIsCustomerDelivery(), false);
    assert.equal(outboundNoteIsDeliveryNote(), false);
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    const exit = await service.recordWarehouseExit(ctx(), exitPayload());
    assert.equal(exit.documentKind, 'nota_de_salida');
    assert.equal(exit.noteNumber, null);
    assert.equal(exit.numberingPolicy, 'unknown');
    assert.equal(exit.deliveryNoteId, null);
    assert.equal(exit.customerDeliveryId, null);
    assert.equal(exit.claimsInvoice, false);
    assert.notEqual(exit.documentKind, 'nota_de_entrega');
    assert.deepEqual(await store.listDeliveries('org-a', 'order-1'), []);
    assert.deepEqual(await service.listNotesForOrder(ctx(), 'order-1'), []);
    const outbound = await store.getOutboundNote('org-a', exit.warehouseExitId);
    assert.equal(outbound?.documentKind, 'nota_de_salida');
    assert.notEqual(outbound?.id, undefined);
    const delivery = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    assert.equal(delivery.documentKind, 'nota_de_entrega');
    assert.notEqual(delivery.documentKind, exit.documentKind);
    assert.notEqual(delivery.deliveryNoteId, exit.outboundNoteId);
    assert.equal(delivery.warehouseExitId, null);
    assert.equal((await store.listWarehouseExits('org-a', 'order-1')).length, 1);
    assert.equal((await store.listDeliveries('org-a', 'order-1')).length, 1);
  });

  it('does not let a nota de entrega predate the delivery', async () => {
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    assert.throws(
      () => assertNoteDoesNotPredateDelivery('2026-09-14T10:00:00.000Z', DELIVERED_AT),
      /NOTE_PREDATES_DELIVERY/,
    );
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(
          ctx(),
          deliveryPayload({ deliveredAt: '2026-09-14T16:00:00.000Z' }),
        ),
      /NOTE_PREDATES_DELIVERY/,
    );
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).length, 0);
    const result = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    const note = await store.getDeliveryNote('org-a', result.deliveryId);
    assert.ok(note);
    assert.ok(Date.parse(note.bornAt) >= Date.parse(note.deliveredAt));
  });

  it('allows a second delivery of a smaller quantity without declaring fulfillment', async () => {
    const store = storeWithOrder([
      {
        orderLineId: 'line-1',
        productRef: 'jar-500',
        description: 'Mermelada 500g',
        quantity: 12,
        unitLabel: 'unidades',
      },
    ]);
    const service = new DeliveryCommandService(store);
    const first = await service.recordCustomerDelivery(
      ctx(),
      deliveryPayload({
        deliveredAt: '2026-09-14T12:00:00.000Z',
        quantities: [{ orderLineId: 'line-1', quantity: 8 }],
      }),
    );
    const second = await service.recordCustomerDelivery(
      ctx(),
      deliveryPayload({
        deliveredAt: '2026-09-14T14:00:00.000Z',
        quantities: [{ orderLineId: 'line-1', quantity: 3 }],
      }),
    );
    assert.notEqual(first.deliveryId, second.deliveryId);
    assert.equal(first.noteNumber, null);
    assert.equal(second.noteNumber, null);
    assert.equal(first.numberingPolicy, 'unknown');
    assert.equal(second.numberingPolicy, 'unknown');
    assert.equal('fulfillmentStatus' in first, false);
    assert.equal('fulfillmentStatus' in second, false);
    const firstLines = await store.listDeliveryNoteLines('org-a', first.deliveryNoteId);
    const secondLines = await store.listDeliveryNoteLines('org-a', second.deliveryNoteId);
    assert.equal(firstLines[0]?.quantity, 8);
    assert.equal(secondLines[0]?.quantity, 3);
    assert.ok((secondLines[0]?.quantity ?? 0) < (firstLines[0]?.quantity ?? 0));
    assert.equal((await store.getOrderInOrg('org-a', 'order-1'))?.status, 'open');
    assert.equal((await store.listDeliveries('org-a', 'order-1')).length, 2);
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).length, 2);
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(
          ctx(),
          deliveryPayload({ fullyFulfilled: true, quantities: [{ orderLineId: 'line-1', quantity: 1 }] }),
        ),
      /VALIDATION_FAILED/,
    );
  });

  it('allows delivery without a payment confirmation', async () => {
    assert.equal(paymentRequiredBeforeDelivery(), false);
    assert.equal(paymentExceptionIsConfirmedLedgerPayment(), false);
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    const result = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    const evidence = await store.listEvidence('org-a', 'delivery', result.deliveryId);
    assert.deepEqual(evidence, []);
    assert.equal(result.confirmedLedgerPayment, false);
    assert.equal(result.paymentRequired, false);
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'delivery',
          subjectId: result.deliveryId,
          role: 'accounting_payment',
          recordedBy: 'member-a',
          paymentState: 'reference',
          reference: 'recibo-papel',
          confirmedLedgerPayment: true,
        }),
      /PAYMENT_CONFIRMATION_REFUSED/,
    );
    const exception = await service.recordEvidence(
      ctx({ actorMemberId: 'member-b' }),
      {
        subjectType: 'delivery',
        subjectId: result.deliveryId,
        role: 'accounting_payment',
        recordedBy: 'member-b',
        paymentState: 'authorized_exception',
        exceptionReason: 'Entrega autorizada sin cobro previo',
        authorizedBy: 'member-a',
      },
    );
    assert.equal(exception.paymentState, 'authorized_exception');
    assert.equal(exception.confirmedLedgerPayment, false);
    assert.equal(exception.ledgerPosting, 'none');
    assert.equal(exception.recordedByMemberId, 'member-b');
    assert.notEqual(exception.recordedByMemberId, 'member-a');
    const delivery = await store.getDelivery('org-a', result.deliveryId);
    assert.equal(delivery?.recordedByMemberId, 'member-a');
  });

  it('keeps evidence roles from collapsing into one actor', async () => {
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    const delivery = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'delivery',
          subjectId: delivery.deliveryId,
          roles: ['commercial_coordination', 'delivery_confirmation'],
          recordedBy: 'member-a',
        }),
      /EVIDENCE_ROLE_COLLAPSE/,
    );
    await service.recordEvidence(ctx(), {
      subjectType: 'delivery',
      subjectId: delivery.deliveryId,
      role: 'commercial_coordination',
      recordedBy: 'member-a',
      note: 'Coordinó la visita',
    });
    await service.recordEvidence(ctx({ actorMemberId: 'member-b' }), {
      subjectType: 'delivery',
      subjectId: delivery.deliveryId,
      role: 'delivery_confirmation',
      recordedBy: 'member-b',
      recipient: 'Encargado del local',
      signatureReference: 'evidencia-papel',
    });
    const rows = await store.listEvidence('org-a', 'delivery', delivery.deliveryId);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0]?.recordedByMemberId, rows[1]?.recordedByMemberId);
    assert.equal(rows.find((row) => row.role === 'delivery_confirmation')?.signatureMethod, null);
    assert.equal(rows.find((row) => row.role === 'delivery_confirmation')?.signatureReference, 'evidencia-papel');
    const exit = await service.recordWarehouseExit(ctx(), exitPayload());
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'warehouse_exit',
          subjectId: exit.warehouseExitId,
          role: 'delivery_confirmation',
          recordedBy: 'member-a',
          recipient: 'Cliente',
        }),
      /WAREHOUSE_EXIT_IS_NOT_DELIVERY/,
    );
  });

  it('isolates tenants', async () => {
    const store = storeWithOrder();
    const service = new DeliveryCommandService(store);
    const result = await service.recordCustomerDelivery(ctx(), deliveryPayload());
    await assert.rejects(
      () => service.listNotesForOrder(ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }), 'order-1'),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(
          ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }),
          deliveryPayload({ recordedBy: 'member-c' }),
        ),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () =>
        service.recordEvidence(ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }), {
          subjectType: 'delivery',
          subjectId: result.deliveryId,
          role: 'commercial_coordination',
          recordedBy: 'member-c',
        }),
      /NOT_FOUND/,
    );
    assert.equal((await store.listDeliveries('org-b', 'order-1')).length, 0);
    assert.equal((await store.listDeliveryNotes('org-b', 'order-1')).length, 0);
  });
});

describe('delivery persistence and panel stay inside the boundary', () => {
  const repo = join(__dirname, '../../..');

  it('does not invent numbering, invoice, tax, or a signature method in SQL', () => {
    const sql = readFileSync(
      join(repo, 'packages/os-database/prisma/migrations/20260915150000_os_delivery/migration.sql'),
      'utf8',
    );
    assert.match(sql, /document_kind = 'nota_de_salida'/);
    assert.match(sql, /document_kind = 'nota_de_entrega'/);
    assert.match(sql, /numbering_policy = 'unknown'/);
    assert.match(sql, /born_at >= delivered_at/);
    assert.match(sql, /confirmed_ledger_payment = false/);
    assert.match(sql, /ledger_posting = 'none'/);
    assert.match(sql, /subject_type <> 'warehouse_exit' OR role = 'warehouse_outbound'/);
    assert.doesNotMatch(sql, /note_number/);
    assert.doesNotMatch(sql, /invoice_number/);
    assert.doesNotMatch(sql, /tax_rate/);
    assert.doesNotMatch(sql, /\bnit\b/i);
    assert.doesNotMatch(sql, /signature_method/);
    assert.doesNotMatch(sql, /ALTER TABLE "os_orders"/);
    assert.doesNotMatch(sql, /ALTER TABLE os_orders/);
    const fragment = readFileSync(join(repo, 'packages/os-database/prisma/fragments/delivery.prisma'), 'utf8');
    assert.doesNotMatch(fragment, /noteNumber/);
    assert.doesNotMatch(fragment, /signatureMethod/);
    assert.doesNotMatch(fragment, /invoiceNumber/);
    const schema = readFileSync(join(repo, 'packages/os-database/prisma/schema.prisma'), 'utf8');
    assert.match(schema, /model OsWarehouseExit /);
    assert.match(schema, /model OsDelivery /);
    assert.match(schema, /model OsDeliveryNote /);
    assert.doesNotMatch(schema, /noteNumber/);
    assert.doesNotMatch(schema, /signatureMethod/);
    assert.doesNotMatch(schema, /invoiceNumber/);
    const index = readFileSync(join(repo, 'packages/os-contracts/src/index.ts'), 'utf8');
    assert.match(index, /export \* from '\.\/delivery'/);
  });

  it('mounts the Spanish panel on /entregas and leaves the pedido page alone', () => {
    const panel = readFileSync(
      join(repo, 'apps/os-web/components/delivery/entrega-panel.tsx'),
      'utf8',
    );
    for (const sentence of Object.values(ENTREGA_PANEL_COPY)) {
      assert.ok(panel.includes(sentence), sentence);
    }
    assert.doesNotMatch(panel, /signatureMethod/);
    assert.doesNotMatch(panel, /NE-\d/);
    const page = readFileSync(
      join(repo, 'apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
      'utf8',
    );
    assert.equal(page.includes('EntregaPanel'), false);
    assert.equal(page.includes('entrega-panel'), false);
    const entregas = readFileSync(join(repo, 'apps/os-web/app/(app)/entregas/page.tsx'), 'utf8');
    assert.match(entregas, /EntregaPanel/);
    assert.match(entregas, /registro interno de entrega/i);
    assert.doesNotMatch(entregas, /NE-\d/);
    assert.doesNotMatch(entregas, /noteNumber/);
    const loading = readFileSync(join(repo, 'apps/os-web/app/(app)/entregas/loading.tsx'), 'utf8');
    assert.match(loading, /loading/);
    assert.match(panel, /Cronología/);
    assert.match(panel, /Cargando el registro de entrega/);
    assert.match(panel, /No se pudo cargar el registro de entrega/);
    assert.match(panel, /No tiene permiso para ver este registro de entrega/);
    assert.doesNotMatch(panel, /Cumplido/);
  });
});
