import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NON_READ_SCOPES } from './capabilities';
import type { FulfillmentPrismaDb } from './prisma-db';
import { createPrismaFulfillmentReadDb } from './prisma-db';
import { MemoryFulfillmentReadDb } from './memory-db';
import { FulfillmentReadService } from './readers';
import type { TrustedReadContext } from './trusted-context';

const ORG = 'org-a';
const OTHER = 'org-b';
const AT = new Date('2026-09-14T15:00:00.000Z');
const BEFORE = new Date('2026-09-14T14:00:00.000Z');

function ctx(scopes: readonly string[], organizationId: string | null = ORG): TrustedReadContext {
  return { organizationId, actorMemberId: 'mem-1', grantedScopes: scopes };
}

function company(): TrustedReadContext {
  return ctx(['management.org.read']);
}

function seed(db: MemoryFulfillmentReadDb) {
  db.warehouseExits.push({
    id: 'exit-a',
    organizationId: ORG,
    orderId: 'order-1',
    exitedAt: AT,
    recordedByMemberId: 'mem-wh',
    source: 'employee_recorded',
    notes: null,
    createdAt: AT,
  });
  db.warehouseExits.push({
    id: 'exit-b',
    organizationId: OTHER,
    orderId: 'order-1',
    exitedAt: AT,
    recordedByMemberId: 'mem-other',
    source: 'employee_recorded',
    notes: 'foreign',
    createdAt: AT,
  });
  db.outboundNotes.push({
    id: 'salida-a',
    organizationId: ORG,
    warehouseExitId: 'exit-a',
    orderId: 'order-1',
    documentKind: 'nota_de_salida',
    numberingPolicy: 'unknown',
    exitedAt: AT,
    bornAt: AT,
    createdAt: AT,
  });
  db.outboundLines.push({
    id: 'salida-line',
    organizationId: ORG,
    noteId: 'salida-a',
    orderLineId: 'line-1',
    productRef: null,
    description: 'Ladrillo',
    quantity: 4,
    unitLabel: null,
  });
  db.deliveries.push({
    id: 'del-a',
    organizationId: ORG,
    orderId: 'order-1',
    deliveredAt: AT,
    deliveredTo: 'Cliente',
    recordedByMemberId: 'mem-del',
    source: 'employee_recorded',
    notes: null,
    createdAt: AT,
  });
  db.deliveries.push({
    id: 'del-b',
    organizationId: OTHER,
    orderId: 'order-1',
    deliveredAt: AT,
    deliveredTo: 'Otro',
    recordedByMemberId: 'mem-other',
    source: 'employee_recorded',
    notes: null,
    createdAt: AT,
  });
  db.deliveryNotes.push({
    id: 'entrega-a',
    organizationId: ORG,
    deliveryId: 'del-a',
    orderId: 'order-1',
    documentKind: 'nota_de_entrega',
    numberingPolicy: 'unknown',
    deliveredAt: AT,
    bornAt: AT,
    createdAt: AT,
  });
  db.deliveryLines.push({
    id: 'entrega-line',
    organizationId: ORG,
    noteId: 'entrega-a',
    orderLineId: 'line-1',
    productRef: null,
    description: 'Ladrillo',
    quantity: 2,
    unitLabel: null,
  });
  db.evidence.push({
    id: 'ev-exit',
    organizationId: ORG,
    subjectType: 'warehouse_exit',
    subjectId: 'exit-a',
    role: 'warehouse_outbound',
    recordedByMemberId: 'mem-wh',
    reference: null,
    note: null,
    paymentState: null,
    exceptionReason: null,
    authorizedByMemberId: null,
    recipient: null,
    signatureReference: null,
    confirmedLedgerPayment: false,
    ledgerPosting: 'none',
    createdAt: AT,
  });
  db.evidence.push({
    id: 'ev-del',
    organizationId: ORG,
    subjectType: 'delivery',
    subjectId: 'del-a',
    role: 'delivery_confirmation',
    recordedByMemberId: 'mem-del',
    reference: null,
    note: null,
    paymentState: null,
    exceptionReason: null,
    authorizedByMemberId: null,
    recipient: 'Cliente',
    signatureReference: 'sig-ref',
    confirmedLedgerPayment: false,
    ledgerPosting: 'none',
    createdAt: AT,
  });
  db.releases.push({
    id: 'rel-a',
    organizationId: ORG,
    caseId: 'case-1',
    orderId: 'order-1',
    state: 'released',
    basis: 'commercial_agreement',
    reason: 'acuerdo',
    source: 'manual',
    actorMemberId: 'mem-auth',
    actorLabel: 'Jefe',
    decidedAt: AT,
    recordedAt: AT,
    evidenceText: 'visto',
    evidenceReference: null,
    correctsDecisionId: null,
  });
  db.releases.push({
    id: 'rel-b',
    organizationId: OTHER,
    caseId: 'case-9',
    orderId: 'order-9',
    state: 'held',
    basis: 'authorized_other',
    reason: 'foreign',
    source: 'manual',
    actorMemberId: null,
    actorLabel: 'Otro',
    decidedAt: AT,
    recordedAt: AT,
    evidenceText: 'no',
    evidenceReference: null,
    correctsDecisionId: null,
  });
  db.coordinationDecisions.push({
    id: 'dec-a',
    organizationId: ORG,
    kind: 'recorded',
    decision: 'seguir',
    ownerLabel: null,
    ownerMemberId: null,
    dueAt: null,
    actorLabel: 'Coord',
    actorMemberId: 'mem-c',
    occurredAt: AT,
    linkedCaseId: null,
    notes: null,
    resolvesDecisionId: null,
    recordedAt: AT,
  });
  db.coordinationDecisions.push({
    id: 'dec-b',
    organizationId: OTHER,
    kind: 'recorded',
    decision: 'foreign',
    ownerLabel: null,
    ownerMemberId: null,
    dueAt: null,
    actorLabel: 'Otro',
    actorMemberId: null,
    occurredAt: AT,
    linkedCaseId: null,
    notes: null,
    resolvesDecisionId: null,
    recordedAt: AT,
  });
  db.workItems.push(
    {
      id: 'work-commercial',
      organizationId: ORG,
      ownerMemberId: 'mem-sales',
      createdByMemberId: 'mem-sales',
      title: 'Seguimiento comercial',
      status: 'open',
      subjectType: 'commercial_account',
      subjectId: 'acc-1',
      dueAt: AT,
      createdAt: AT,
    },
    {
      id: 'work-party',
      organizationId: ORG,
      ownerMemberId: 'mem-ops',
      createdByMemberId: 'mem-ops',
      title: 'Parte no comercial',
      status: 'open',
      subjectType: 'party',
      subjectId: 'party-1',
      dueAt: BEFORE,
      createdAt: BEFORE,
    },
    {
      id: 'work-other',
      organizationId: OTHER,
      ownerMemberId: 'mem-other',
      createdByMemberId: 'mem-other',
      title: 'Otro org',
      status: 'open',
      subjectType: 'commercial_account',
      subjectId: 'acc-9',
      dueAt: AT,
      createdAt: AT,
    },
  );
  db.attention.push(
    {
      attentionKey: 'att-commercial',
      organizationId: ORG,
      memberId: 'mem-sales',
      attentionType: 'follow_up',
      reasonCode: 'due',
      resourceType: 'work_item',
      resourceId: 'work-commercial',
      workItemId: 'work-commercial',
      subjectType: 'commercial_account',
      subjectId: 'acc-1',
      isActive: true,
    },
    {
      attentionKey: 'att-party',
      organizationId: ORG,
      memberId: 'mem-ops',
      attentionType: 'follow_up',
      reasonCode: 'due',
      resourceType: 'work_item',
      resourceId: 'work-party',
      workItemId: 'work-party',
      subjectType: 'party',
      subjectId: 'party-1',
      isActive: true,
    },
  );
}

function service() {
  const db = new MemoryFulfillmentReadDb();
  seed(db);
  return { db, readers: new FulfillmentReadService(db) };
}

describe('warehouse exit reader', () => {
  it('reads nota de salida for the trusted org and ignores the client org', async () => {
    const { db, readers } = service();
    const result = await readers.readWarehouseExits(company(), { organizationId: OTHER });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.count, 1);
    assert.equal(result.rows[0]?.id, 'exit-a');
    assert.equal(result.rows[0]?.outboundNote?.documentKind, 'nota_de_salida');
    assert.equal(result.rows[0]?.outboundNote?.noteNumber, null);
    assert.equal(result.rows[0]?.deliveryNoteId, null);
    assert.equal(result.rows[0]?.customerDeliveryId, null);
    assert.equal(result.rows[0]?.outboundNote?.lines[0]?.quantity, 4);
    assert.equal(result.rows[0]?.outboundNote?.lines[0]?.remainingQuantity, null);
    assert.equal(db.calls[0]?.predicate.organizationId, ORG);
    assert.equal('count' in result, true);
  });

  it('treats a foreign id as missing', async () => {
    const { readers } = service();
    const result = await readers.readWarehouseExits(company(), { id: 'exit-b', organizationId: OTHER });
    assert.equal(result.sourceState, 'NO_FACT');
    assert.equal('count' in result, false);
  });

  it('returns an authorized empty list without calling it unproven', async () => {
    const { readers } = service();
    const result = await readers.readWarehouseExits(company(), { orderId: 'missing-order' });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.count, 0);
    assert.deepEqual(result.rows, []);
  });

  it('does not let write scopes or commercial.team.read unlock the company store', async () => {
    const { db, readers } = service();
    for (const scope of NON_READ_SCOPES) {
      const result = await readers.readWarehouseExits(ctx([scope]));
      assert.equal(result.sourceState, 'ERROR');
      assert.equal(result.code, 'PERMISSION_DENIED');
      assert.equal('count' in result, false);
    }
    assert.equal(db.calls.length, 0);
  });

  it('rejects an outbound note that predates the exit and does not invent a number', async () => {
    const { db, readers } = service();
    db.outboundNotes[0]!.bornAt = BEFORE;
    const result = await readers.readWarehouseExits(company(), { id: 'exit-a' });
    assert.equal(result.sourceState, 'ERROR');
    assert.equal(result.code, 'NOTE_PREDATES_EXIT');
    if (result.sourceState !== 'ERROR' || !('violations' in result)) return;
    assert.equal(result.violations[0]?.bornAt, BEFORE.toISOString());
    assert.equal(result.violations[0]?.eventAt, AT.toISOString());
    assert.equal('count' in result, false);
    assert.equal(JSON.stringify(result).includes('noteNumber'), false);
  });
});

describe('delivery reader', () => {
  it('keeps nota de entrega distinct from warehouse exit', async () => {
    const { readers } = service();
    const result = await readers.readDeliveries(company(), { organizationId: OTHER });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.count, 1);
    assert.equal(result.rows[0]?.deliveryNote?.documentKind, 'nota_de_entrega');
    assert.equal(result.rows[0]?.deliveryNote?.noteNumber, null);
    assert.equal(result.rows[0]?.warehouseExitId, null);
    assert.equal(result.rows[0]?.outboundNoteId, null);
    assert.equal(result.rows[0]?.deliveryNote?.claimsInvoice, false);
    assert.equal(result.rows[0]?.deliveryNote?.lines[0]?.remainingQuantity, null);
    assert.deepEqual(result.storedPartialQuantities, []);
  });

  it('reports partial delivery only from multiple stored quantities and does not invent remaining', async () => {
    const { db, readers } = service();
    db.deliveries.push({
      id: 'del-a2',
      organizationId: ORG,
      orderId: 'order-1',
      deliveredAt: new Date('2026-09-15T15:00:00.000Z'),
      deliveredTo: 'Cliente',
      recordedByMemberId: 'mem-del',
      source: 'employee_recorded',
      notes: null,
      createdAt: AT,
    });
    db.deliveryNotes.push({
      id: 'entrega-a2',
      organizationId: ORG,
      deliveryId: 'del-a2',
      orderId: 'order-1',
      documentKind: 'nota_de_entrega',
      numberingPolicy: 'unknown',
      deliveredAt: new Date('2026-09-15T15:00:00.000Z'),
      bornAt: new Date('2026-09-15T15:00:00.000Z'),
      createdAt: AT,
    });
    db.deliveryLines.push({
      id: 'entrega-line-2',
      organizationId: ORG,
      noteId: 'entrega-a2',
      orderLineId: 'line-1',
      productRef: null,
      description: 'Ladrillo',
      quantity: 1,
      unitLabel: null,
    });
    const result = await readers.readDeliveries(company(), { orderId: 'order-1' });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.storedPartialQuantities.length, 1);
    assert.deepEqual(result.storedPartialQuantities[0]?.recordedQuantities, [2, 1]);
    assert.equal(result.storedPartialQuantities[0]?.remainingQuantity, null);
    assert.equal(JSON.stringify(result).includes('whatsapp'), false);
  });

  it('refuses a delivery note that predates the delivery', async () => {
    const { db, readers } = service();
    db.deliveryNotes[0]!.bornAt = BEFORE;
    const result = await readers.readDeliveries(company(), { id: 'del-a' });
    assert.equal(result.sourceState, 'ERROR');
    assert.equal(result.code, 'NOTE_PREDATES_DELIVERY');
    if (!('violations' in result)) return;
    assert.equal(result.violations[0]?.bornAt, BEFORE.toISOString());
    assert.equal('count' in result, false);
  });

  it('does not unlock on delivery.record or commercial.team.read', async () => {
    const { db, readers } = service();
    for (const scope of ['delivery.record', 'commercial.team.read', 'warehouse.finished_goods.allocate', 'people.admin']) {
      const result = await readers.readDeliveries(ctx([scope]));
      assert.equal(result.code, 'PERMISSION_DENIED');
      assert.equal('count' in result, false);
    }
    assert.equal(db.calls.length, 0);
  });
});

describe('operational release reader', () => {
  it('returns stored operational context and not ledger truth', async () => {
    const { db, readers } = service();
    const result = await readers.readOperationalReleases(company(), { organizationId: OTHER, orderId: 'order-1' });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.count, 1);
    assert.equal(result.rows[0]?.state, 'released');
    assert.equal(result.rows[0]?.reason, 'acuerdo');
    assert.equal(result.rows[0]?.authorizedByMemberId, 'mem-auth');
    assert.equal(result.rows[0]?.source, 'manual');
    assert.equal(result.rows[0]?.timestamp, AT.toISOString());
    assert.equal(result.rows[0]?.evidence.text, 'visto');
    assert.equal(result.rows[0]?.ledgerTruth, false);
    assert.equal(db.calls[0]?.predicate.organizationId, ORG);
  });

  it('does not unlock on commercial.exception.authorize', async () => {
    const { db, readers } = service();
    const result = await readers.readOperationalReleases(ctx(['commercial.exception.authorize']));
    assert.equal(result.sourceState, 'ERROR');
    assert.equal(result.code, 'PERMISSION_DENIED');
    assert.equal('count' in result, false);
    assert.equal(db.calls.length, 0);
  });

  it('treats a foreign release id as missing', async () => {
    const { readers } = service();
    const result = await readers.readOperationalReleases(company(), { id: 'rel-b' });
    assert.equal(result.sourceState, 'NO_FACT');
  });
});

describe('coordination decision reader', () => {
  it('denies with CROSS_LANE_CHANGE_REQUEST and does not query', async () => {
    const { db, readers } = service();
    const result = await readers.readCoordinationDecisions(company());
    assert.equal(result.sourceState, 'UNPROVEN');
    assert.equal(result.code, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal('count' in result, false);
    assert.equal('rows' in result, false);
    assert.equal(db.calls.some((call) => call.method === 'listCoordinationDecisions'), false);
  });

  it('does not unlock on the write capability or coordinator record', async () => {
    const { db, readers } = service();
    for (const scope of ['coordination.decision.record', 'operations.coordinator.record', 'people.admin']) {
      const result = await readers.readCoordinationDecisions(ctx([scope]));
      assert.equal(result.sourceState, 'UNPROVEN');
      assert.equal(result.code, 'CROSS_LANE_CHANGE_REQUEST');
      assert.equal('count' in result, false);
    }
    assert.equal(db.calls.length, 0);
  });

  it('does not return coordination rows when the port is called directly', async () => {
    const db = new MemoryFulfillmentReadDb();
    seed(db);
    await assert.rejects(() => db.listCoordinationDecisions({ organizationId: ORG }), /CROSS_LANE_CHANGE_REQUEST/);
  });
});

describe('work and next action reader', () => {
  it('uses management.org.read for the org queue and does not query another org', async () => {
    const { db, readers } = service();
    const result = await readers.readWorkNextAction(company(), { organizationId: OTHER });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    const value = result.rows[0];
    assert.equal(value?.scope, 'management.org.read');
    assert.equal(value?.tenantPredicate.organizationId, ORG);
    assert.equal(value?.openWork.length, 2);
    assert.equal(value?.attention.length, 2);
    assert.equal(value?.nextAction.sourceState, 'AVAILABLE');
    if (value?.nextAction.sourceState === 'AVAILABLE') {
      assert.equal(value.nextAction.workItemId, 'work-party');
    }
    assert.equal(db.calls[0]?.method, 'listWorkItems');
    assert.equal(db.calls[0]?.predicate.organizationId, ORG);
    assert.equal(db.calls[0]?.predicate.status, 'open');
    assert.equal('subjectTypes' in (db.calls[0]?.predicate ?? {}), false);
  });

  it('lets commercial.team.read see only query-proven commercial work', async () => {
    const { db, readers } = service();
    const result = await readers.readWorkNextAction(ctx(['commercial.team.read']));
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.deepEqual(result.rows[0]?.openWork.map((item) => item.id), ['work-commercial']);
    assert.deepEqual(result.rows[0]?.attention.map((item) => item.attentionKey), ['att-commercial']);
    assert.deepEqual(db.calls[0]?.predicate.subjectTypes, ['commercial_account']);
    assert.deepEqual(db.calls[1]?.predicate.subjectTypes, ['commercial_account']);
    assert.equal(db.calls[0]?.predicate.organizationId, ORG);
    assert.equal(result.rows[0]?.queueCoverage, 'UNPROVEN');
    assert.notEqual(result.rows[0]?.nextAction.sourceState, 'NO_FACT');
  });

  it('does not let people.admin or delivery.record unlock the work queue', async () => {
    const { db, readers } = service();
    for (const scope of ['people.admin', 'delivery.record', 'coordination.decision.record']) {
      const result = await readers.readWorkNextAction(ctx([scope]));
      assert.equal(result.code, 'PERMISSION_DENIED');
      assert.equal('count' in result, false);
    }
    assert.equal(db.calls.length, 0);
  });

  it('does not invent a next action when no due date is stored', async () => {
    const db = new MemoryFulfillmentReadDb();
    db.workItems.push({
      id: 'work-undated',
      organizationId: ORG,
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      title: 'Sin fecha',
      status: 'open',
      subjectType: 'party',
      subjectId: null,
      dueAt: null,
      createdAt: AT,
    });
    const readers = new FulfillmentReadService(db);
    const result = await readers.readWorkNextAction(company());
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    assert.equal(result.rows[0]?.nextAction.sourceState, 'NO_FACT');
    assert.equal(result.rows[0]?.queueCoverage, 'COMPLETE');
    assert.equal(result.count, 1);
  });

  it('does not treat a stored ledger-confirmation flag as ledger truth', async () => {
    const db = new MemoryFulfillmentReadDb();
    seed(db);
    const evidence = db.evidence.find((row) => row.id === 'ev-del');
    assert.ok(evidence);
    evidence.confirmedLedgerPayment = true;
    evidence.ledgerPosting = 'posted-ledger-id';
    const readers = new FulfillmentReadService(db);
    const result = await readers.readDeliveries(company(), { id: 'del-a' });
    assert.equal(result.sourceState, 'AVAILABLE');
    if (result.sourceState !== 'AVAILABLE') return;
    const read = result.rows[0]?.evidence[0];
    assert.equal(read?.confirmedLedgerPayment, false);
    assert.equal(read?.ledgerPosting, null);
    assert.equal(read?.ledgerTruth, false);
  });
});

describe('trusted organization', () => {
  it('does not query when the trusted organization is missing', async () => {
    const { db, readers } = service();
    const result = await readers.readWarehouseExits(ctx(['management.org.read'], null), { organizationId: ORG });
    assert.equal(result.sourceState, 'ERROR');
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal('count' in result, false);
    assert.equal(db.calls.length, 0);
  });
});

describe('prisma db port', () => {
  it('puts organizationId in every where and does not scan without it', async () => {
    const calls: Array<{ model: string; where: Record<string, unknown> }> = [];
    const findMany = (model: string) => async (args: { where: Record<string, unknown> }) => {
      calls.push({ model, where: args.where });
      return [];
    };
    const db = {
      osWarehouseExit: { findMany: findMany('osWarehouseExit') },
      osWarehouseOutboundNote: { findMany: findMany('osWarehouseOutboundNote') },
      osWarehouseOutboundNoteLine: { findMany: findMany('osWarehouseOutboundNoteLine') },
      osDelivery: { findMany: findMany('osDelivery') },
      osDeliveryNote: { findMany: findMany('osDeliveryNote') },
      osDeliveryNoteLine: { findMany: findMany('osDeliveryNoteLine') },
      osDeliveryEvidence: { findMany: findMany('osDeliveryEvidence') },
      osOperationalReleaseDecision: { findMany: findMany('osOperationalReleaseDecision') },
      osOperationalReleaseDecisionReversal: { findMany: findMany('osOperationalReleaseDecisionReversal') },
      osCoordinationDecision: { findMany: findMany('osCoordinationDecision') },
      osWorkItem: { findMany: findMany('osWorkItem') },
      osAttentionReadModel: { findMany: findMany('osAttentionReadModel') },
    } as FulfillmentPrismaDb;
    const port = createPrismaFulfillmentReadDb(db);
    await port.listWarehouseExits({ organizationId: ORG, orderId: 'order-1' });
    await port.listOutboundNoteLines({ organizationId: ORG, outboundNoteIds: [] });
    await port.listDeliveries({ organizationId: ORG, id: 'del-a' });
    await port.listReleaseDecisions({ organizationId: ORG, orderId: 'order-1' });
    await assert.rejects(() => port.listCoordinationDecisions({ organizationId: ORG }), /CROSS_LANE_CHANGE_REQUEST/);
    await port.listWorkItems({ organizationId: ORG, status: 'open', subjectTypes: ['commercial_account'] });
    await port.listAttention({ organizationId: ORG, isActive: true, subjectTypes: ['commercial_account'] });

    assert.equal(calls.every((call) => call.where.organizationId === ORG), true);
    assert.equal(calls.some((call) => call.model === 'osCoordinationDecision'), false);
    assert.equal(calls.some((call) => call.model === 'osWarehouseOutboundNoteLine'), false);
    const work = calls.find((call) => call.model === 'osWorkItem');
    assert.deepEqual(work?.where.subjectType, { in: ['commercial_account'] });
    assert.equal(work?.where.status, 'open');
    const attention = calls.find((call) => call.model === 'osAttentionReadModel');
    assert.equal(attention?.where.isActive, true);
    assert.equal(JSON.stringify(calls).includes(OTHER), false);
  });
});
