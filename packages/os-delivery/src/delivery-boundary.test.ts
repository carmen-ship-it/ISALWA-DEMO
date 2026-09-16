import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  DELIVERY_NOTE_NUMBERING_POLICY,
  ENTREGA_PANEL_COPY,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  assignDeliveryNoteNumber,
  assignWarehouseOutboundNumber,
  createDeliveryNoteWithoutDelivery,
  entregaCreatesNota,
  noteBeforeDelivery,
  outboundNoteIsDeliveryNote,
  paymentExceptionIsConfirmedLedgerPayment,
  paymentRequiredBeforeDelivery,
  pdfDownloadCreatesSalida,
  provisionalInternalDocumentRef,
  warehouseExitIsCustomerDelivery,
} from '../../os-contracts/src/delivery';
import { DeliveryCommandService } from './delivery-command-service';
import { MemoryDeliveryStore } from './memory-store';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const DELIVERED_AT = '2026-09-14T14:30:00.000Z';
const EXITED_AT = '2026-09-14T13:00:00.000Z';

const LINE = {
  orderLineId: 'line-1',
  productRef: 'jar-500',
  description: 'Mermelada 500g',
  quantity: 12,
  unitLabel: 'unidades',
  unitPriceCentavos: 2500,
};

function storeWithOrder(lines: readonly unknown[] | null = null) {
  const store = new MemoryDeliveryStore();
  const both = [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE];
  store.putMember({ id: 'member-a', organizationId: 'org-a', accessStatus: 'active', grantedScopes: both });
  store.putMember({ id: 'member-b', organizationId: 'org-a', accessStatus: 'active', grantedScopes: [CUSTOMER_DELIVERY_RECORD_SCOPE] });
  store.putMember({ id: 'member-c', organizationId: 'org-b', accessStatus: 'active', grantedScopes: both });
  store.putMember({ id: 'member-none', organizationId: 'org-a', accessStatus: 'active', grantedScopes: ['people.admin'] });
  store.putOrder({
    id: 'order-1',
    organizationId: 'org-a',
    partyId: 'party-a',
    orderNumber: 'PED-1',
    status: 'open',
    lines,
  });
  store.putOrder({
    id: 'order-b',
    organizationId: 'org-b',
    partyId: 'party-b',
    orderNumber: 'PED-B',
    status: 'open',
    lines: null,
  });
  store.putOrder({
    id: 'order-cancelled',
    organizationId: 'org-a',
    partyId: 'party-a',
    orderNumber: 'PED-X',
    status: 'cancelled',
    lines,
  });
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

function notaPayload(over: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    recipient: 'Encargado del local',
    deliveredBy: 'Chofer ISALWA',
    recordedBy: 'member-a',
    observations: 'Entrega parcial del pedido',
    source: 'employee_recorded',
    quantities: [{ orderLineId: 'line-1', quantity: 8 }],
    ...over,
  };
}

function salidaPayload(over: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    exitedAt: EXITED_AT,
    recordedBy: 'member-a',
    notes: 'Salió del almacén',
    source: 'employee_recorded',
    ...over,
  };
}

function entregaPayload(over: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    deliveredAt: DELIVERED_AT,
    receivedBy: 'Encargado del local',
    recordedBy: 'member-a',
    notes: 'Entregado en el local',
    source: 'employee_recorded',
    ...over,
  };
}

describe('delivery documents: Pedido → Nota → Salida → Entrega', () => {
  it('creates nota de entrega from pedido with provisional numbering (SYNTH)', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    assert.equal(noteBeforeDelivery(), null);
    await assert.rejects(() => Promise.resolve().then(() => service.createNoteBeforeDelivery()), /USE_CREATE_NOTA/);
    await assert.rejects(() => Promise.resolve().then(() => createDeliveryNoteWithoutDelivery()), /USE_CREATE_NOTA/);

    const result = await service.createNotaDeEntrega(ctx(), notaPayload());
    assert.equal(result.documentKind, 'nota_de_entrega');
    assert.equal(result.numberingPolicy, DELIVERY_NOTE_NUMBERING_POLICY);
    assert.equal(result.numberingPolicy, 'provisional_internal');
    assert.equal(result.noteNumber, null);
    assert.match(result.internalDocumentRef, /^NE-PILOT-/);
    assert.equal(result.internalDocumentRef, provisionalInternalDocumentRef(result.deliveryNoteId));
    assert.equal(result.receivedBy, null);
    assert.equal(result.partyId, 'party-a');
    assert.equal(result.recipient, 'Encargado del local');
    assert.equal(result.deliveredBy, 'Chofer ISALWA');
    assert.equal(result.claimsInvoice, false);
    assert.equal(result.claimsTax, false);
    assert.equal(result.lineCount, 1);

    const note = await store.getDeliveryNoteById('org-a', result.deliveryNoteId);
    assert.equal(note?.deliveryId, null);
    assert.equal(note?.deliveredAt, null);
    assert.equal(note?.receivedBy, null);
    assert.equal(note?.status, 'issued');
    const lines = await store.listDeliveryNoteLines('org-a', result.deliveryNoteId);
    assert.equal(lines[0]?.quantity, 8);
    assert.equal(lines[0]?.description, 'Mermelada 500g');
    assert.equal('unitPriceCentavos' in (lines[0] ?? {}), false);

    const events = await store.listDomainEvents('org-a', 'order-1');
    assert.equal(events.some((e) => e.eventType === 'delivery_note.created'), true);
  });

  it('prefills party/order/lines from order — no retype of customer or line labels', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const result = await service.createNotaDeEntrega(
      ctx(),
      notaPayload({
        quantities: [{ orderLineId: 'line-1', quantity: 5 }],
      }),
    );
    const note = await store.getDeliveryNoteById('org-a', result.deliveryNoteId);
    assert.equal(note?.partyId, 'party-a');
    assert.equal(note?.orderId, 'order-1');
    const lines = await store.listDeliveryNoteLines('org-a', result.deliveryNoteId);
    assert.equal(lines[0]?.description, 'Mermelada 500g');
    assert.equal(lines[0]?.productRef, 'jar-500');
    assert.equal(lines[0]?.orderLineId, 'line-1');
  });

  it('keeps provisional numbering honest and refuses invented official numbers', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx(), notaPayload({ noteNumber: 'NE-000001' })),
      /NUMBERING_POLICY_UNKNOWN/,
    );
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx(), notaPayload({ invoiceNumber: 'F-1' })),
      /INVOICE_CLAIM_REFUSED/,
    );
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx(), notaPayload({ taxRate: '13' })),
      /TAX_CLAIM_REFUSED/,
    );
    assert.throws(() => assignDeliveryNoteNumber('NE-000001'), /NUMBERING_POLICY_UNKNOWN/);
    assert.throws(() => assignWarehouseOutboundNumber('NS-000001'), /NUMBERING_POLICY_UNKNOWN/);
    const ok = await service.createNotaDeEntrega(ctx(), notaPayload());
    assert.match(ok.internalDocumentRef, /^NE-PILOT-/);
    assert.equal(ok.numberingPolicy, 'provisional_internal');
  });

  it('records salida without creating a nota; PDF download does not create salida', async () => {
    assert.equal(pdfDownloadCreatesSalida(), false);
    assert.equal(warehouseExitIsCustomerDelivery(), false);
    assert.equal(outboundNoteIsDeliveryNote(), false);
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const exit = await service.recordSalida(ctx(), salidaPayload());
    assert.equal(exit.documentKind, 'nota_de_salida');
    assert.equal(exit.deliveryNoteId, null);
    assert.equal(exit.customerDeliveryId, null);
    assert.deepEqual(await store.listDeliveries('org-a', 'order-1'), []);
    assert.deepEqual(await service.listNotesForOrder(ctx(), 'order-1'), []);
    assert.equal((await store.listDomainEvents('org-a', 'order-1')).some((e) => e.eventType === 'warehouse_exit.recorded'), true);
  });

  it('records entrega without auto-creating a nota and sets receivedBy on linked nota', async () => {
    assert.equal(entregaCreatesNota(), false);
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const nota = await service.createNotaDeEntrega(ctx(), notaPayload());
    assert.equal(nota.receivedBy, null);
    const entrega = await service.recordEntrega(
      ctx(),
      entregaPayload({ deliveryNoteId: nota.deliveryNoteId }),
    );
    assert.equal(entrega.deliveryNoteId, nota.deliveryNoteId);
    assert.equal(entrega.documentKind, null);
    assert.equal(entrega.receivedBy, 'Encargado del local');
    const note = await store.getDeliveryNoteById('org-a', nota.deliveryNoteId);
    assert.equal(note?.receivedBy, 'Encargado del local');
    assert.equal(note?.deliveryId, entrega.deliveryId);
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).length, 1);
  });

  it('keeps correction history append-only', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const nota = await service.createNotaDeEntrega(ctx(), notaPayload());
    const correction = await service.correctDeliveryDocument(ctx(), {
      deliveryNoteId: nota.deliveryNoteId,
      reason: 'Cantidad incorrecta en papel',
      recordedBy: 'member-a',
      source: 'employee_recorded',
    });
    assert.equal(correction.originalNoteId, nota.deliveryNoteId);
    assert.notEqual(correction.reversalNoteId, nota.deliveryNoteId);
    const original = await store.getDeliveryNoteById('org-a', nota.deliveryNoteId);
    const reversal = await store.getDeliveryNoteById('org-a', correction.reversalNoteId);
    assert.equal(original?.status, 'reversed');
    assert.equal(original?.correctionReason, 'Cantidad incorrecta en papel');
    assert.equal(reversal?.correctsNoteId, nota.deliveryNoteId);
    assert.equal(reversal?.status, 'reversed');
    assert.equal((await store.listDeliveryNotes('org-a', 'order-1')).length, 2);
  });

  it('rejects cross-tenant access as NOT_FOUND', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const nota = await service.createNotaDeEntrega(ctx(), notaPayload());
    await assert.rejects(
      () => service.listNotesForOrder(ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }), 'order-1'),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () =>
        service.createNotaDeEntrega(ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }), {
          ...notaPayload(),
          recordedBy: 'member-c',
        }),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () => service.getDeliveryNoteById(ctx({ organizationId: 'org-b', actorMemberId: 'member-c' }), nota.deliveryNoteId),
      /NOT_FOUND/,
    );
  });

  it('denies unauthorized create', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx({ actorMemberId: 'member-none' }), notaPayload({ recordedBy: 'member-none' })),
      /PERMISSION_DENIED/,
    );
  });

  it('rejects invalid or cancelled order', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx(), notaPayload({ orderId: 'missing' })),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () => service.createNotaDeEntrega(ctx(), notaPayload({ orderId: 'order-cancelled' })),
      /VALIDATION_FAILED/,
    );
  });

  it('rejects quantity above order line when lines are known', async () => {
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.createNotaDeEntrega(
          ctx(),
          notaPayload({ quantities: [{ orderLineId: 'line-1', quantity: 13 }] }),
        ),
      /VALIDATION_FAILED/,
    );
    await assert.rejects(
      () =>
        service.recordSalida(
          ctx(),
          salidaPayload({ quantities: [{ orderLineId: 'line-1', quantity: 99 }] }),
        ),
      /VALIDATION_FAILED/,
    );
  });

  it('allows partial quantities and payment-optional entrega', async () => {
    assert.equal(paymentRequiredBeforeDelivery(), false);
    assert.equal(paymentExceptionIsConfirmedLedgerPayment(), false);
    const store = storeWithOrder([LINE]);
    const service = new DeliveryCommandService(store);
    const nota = await service.createNotaDeEntrega(
      ctx(),
      notaPayload({ quantities: [{ orderLineId: 'line-1', quantity: 3 }] }),
    );
    assert.equal(nota.lineCount, 1);
    const entrega = await service.recordEntrega(ctx(), entregaPayload());
    assert.equal(entrega.paymentRequired, false);
    assert.equal(entrega.confirmedLedgerPayment, false);
  });

  it('creates notes across seven synthetic orgs (REAL_SEVEN_MUTATED via SYNTH)', async () => {
    const store = new MemoryDeliveryStore();
    const scopes = [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE];
    for (let i = 1; i <= 7; i += 1) {
      const orgId = `synth-org-${i}`;
      const memberId = `synth-member-${i}`;
      store.putMember({ id: memberId, organizationId: orgId, accessStatus: 'active', grantedScopes: scopes });
      store.putOrder({
        id: `synth-order-${i}`,
        organizationId: orgId,
        partyId: `synth-party-${i}`,
        orderNumber: `PED-S${i}`,
        status: 'open',
        lines: [
          {
            orderLineId: `synth-line-${i}`,
            productRef: null,
            description: `Producto synth ${i}`,
            quantity: 4,
            unitLabel: 'cajas',
          },
        ],
      });
      const service = new DeliveryCommandService(store);
      const result = await service.createNotaDeEntrega(
        { organizationId: orgId, actorMemberId: memberId, effectiveAt: NOW },
        {
          orderId: `synth-order-${i}`,
          recipient: `Destinatario ${i}`,
          deliveredBy: `Chofer ${i}`,
          recordedBy: memberId,
          source: 'employee_recorded',
          quantities: [{ orderLineId: `synth-line-${i}`, quantity: 2 }],
        },
      );
      assert.match(result.internalDocumentRef, /^NE-PILOT-/);
      assert.equal(result.partyId, `synth-party-${i}`);
    }
    assert.equal((await store.listAllDeliveryNotes('synth-org-1')).length, 1);
    assert.equal((await store.listAllDeliveryNotes('synth-org-7')).length, 1);
    assert.equal((await store.listAllDeliveryNotes('synth-org-1')).length, 1);
  });
});

describe('delivery persistence and panel stay inside the boundary', () => {
  const repo = join(__dirname, '../../..');

  it('evolves SQL for flexible notas without inventing official numbering', () => {
    const sql = readFileSync(
      join(repo, 'packages/os-database/prisma/migrations/20260920120000_os_delivery_documents_flexible/migration.sql'),
      'utf8',
    );
    assert.match(sql, /provisional_internal/);
    assert.match(sql, /internal_document_ref/);
    assert.match(sql, /NE-PILOT-/);
    assert.doesNotMatch(sql, /invoice_number/);
    assert.doesNotMatch(sql, /tax_rate/);
    assert.doesNotMatch(sql, /\bnit\b/i);
    assert.doesNotMatch(sql, /signature_method/);
    const fragment = readFileSync(join(repo, 'packages/os-database/prisma/fragments/delivery.prisma'), 'utf8');
    assert.match(fragment, /internalDocumentRef/);
    assert.match(fragment, /deliveryId\s+String\?/);
    assert.doesNotMatch(fragment, /noteNumber/);
    assert.doesNotMatch(fragment, /signatureMethod/);
    const schema = readFileSync(join(repo, 'packages/os-database/prisma/schema.prisma'), 'utf8');
    assert.match(schema, /model OsDeliveryNote /);
    assert.match(schema, /internalDocumentRef/);
    const index = readFileSync(join(repo, 'packages/os-contracts/src/index.ts'), 'utf8');
    assert.match(index, /export \* from '\.\/delivery'/);
  });

  it('mounts delivery documents on pedido and keeps /entregas warehouse ≠ delivery honesty', () => {
    const panel = readFileSync(join(repo, 'apps/os-web/components/delivery/entrega-panel.tsx'), 'utf8');
    for (const key of [
      'beforeDelivery',
      'warehouseDistinct',
      'numberingUnknown',
      'notInvoice',
      'internalRecord',
      'provisionalDisclaimer',
    ] as const) {
      assert.match(panel, new RegExp(`ENTREGA_PANEL_COPY\\.${key}`));
      assert.ok(typeof ENTREGA_PANEL_COPY[key] === 'string' && ENTREGA_PANEL_COPY[key].length > 0);
    }
    assert.doesNotMatch(panel, /signatureMethod/);
    const docs = readFileSync(
      join(repo, 'apps/os-web/components/delivery/delivery-documents-panel.tsx'),
      'utf8',
    );
    assert.match(docs, /ENTREGA_PANEL_COPY\.createNota/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.recordSalida/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.recordEntrega/);
    const page = readFileSync(
      join(repo, 'apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
      'utf8',
    );
    assert.match(page, /DeliveryDocumentsPanel|delivery-documents-panel/);
    const entregas = readFileSync(join(repo, 'apps/os-web/app/(app)/entregas/page.tsx'), 'utf8');
    assert.match(entregas, /EntregaPanel/);
  });
});
