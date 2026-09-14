import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
} from '../../os-contracts/src/operations-scopes';
import { consumptionMutatesStock } from '../../os-contracts/src/production-trace';
import {
  PRODUCTION_LIVE_DB_WRITES,
  ProductionWriteService,
  type ProductionWriteSession,
} from './commands';
import {
  MemoryProductionTracePrismaPort,
  PRODUCTION_MIGRATION_APPLIED,
  createPrismaProductionTraceStore,
} from './prisma-store';

const occurredAt = '2026-09-14T14:00:00.000Z';
const recordedAt = '2026-09-14T15:00:00.000Z';
const SESSION = 'org-session';
const OTHER = 'org-other';

const entrySession: ProductionWriteSession = {
  organizationId: SESSION,
  memberId: 'member-entry',
  actorLabel: 'Encargado de planta',
  grantedScopes: [PRODUCTION_ENTRY_MEMBER_SCOPE],
};

function provenance(organizationId: string) {
  return {
    organizationId,
    actorMemberId: 'member-plant',
    actorLabel: 'Operador de planta',
    source: 'manual' as const,
    occurredAt,
    recordedAt,
    evidence: { reference: null, note: null },
  };
}

function quemaProvenance(organizationId: string) {
  return {
    organizationId,
    actorMemberId: 'member-plant',
    actorLabel: 'Operador de planta',
    source: 'manual' as const,
    recordedAt,
    evidence: { reference: null, note: null },
  };
}

function serviceWithPrisma() {
  const prisma = new MemoryProductionTracePrismaPort();
  const store = createPrismaProductionTraceStore(prisma);
  const service = new ProductionWriteService(store);
  return { prisma, store, service };
}

describe('createPrismaProductionTraceStore', () => {
  it('records entry, quema start/end/products, loss, and consumption through the prisma port', async () => {
    const { prisma, store, service } = serviceWithPrisma();

    const process = await service.recordProcess(entrySession, {
      ...provenance(OTHER),
      id: 'proc-1',
      productId: 'prod-1',
      stepKey: 'colaje',
      quemaId: null,
      note: null,
    });
    assert.equal(process.ok, true);
    if (!process.ok) return;
    assert.equal(process.value.organizationId, SESSION);
    assert.equal(process.value.productId, 'prod-1');
    assert.equal(Object.hasOwn(process.value, 'orderId'), false);

    const quema = await service.openQuema(entrySession, {
      ...quemaProvenance(OTHER),
      id: 'quema-1',
      startedAt: occurredAt,
    });
    assert.equal(quema.ok, true);
    if (!quema.ok) return;
    assert.equal(quema.value.startedAt, occurredAt);
    assert.equal(quema.value.endedAt, null);

    const linked = await service.attachQuemaProduct(entrySession, {
      ...provenance(OTHER),
      id: 'link-1',
      quemaId: 'quema-1',
      productId: 'prod-1',
      quantity: '2',
      unit: 'piezas',
    });
    assert.equal(linked.ok, true);
    if (!linked.ok) return;
    assert.equal(linked.value.productId, 'prod-1');

    const second = await service.attachQuemaProduct(entrySession, {
      ...provenance(SESSION),
      id: 'link-2',
      quemaId: 'quema-1',
      productId: 'prod-2',
      quantity: '1',
      unit: 'piezas',
    });
    assert.equal(second.ok, true);

    const ended = await service.endQuema(entrySession, {
      ...provenance(SESSION),
      id: 'end-1',
      quemaId: 'quema-1',
      endedAt: recordedAt,
    });
    assert.equal(ended.ok, true);
    if (!ended.ok) return;
    assert.equal(ended.value.endedAt, recordedAt);
    assert.equal(ended.value.products.length, 2);

    const loss = await service.recordLoss(entrySession, {
      ...provenance(OTHER),
      id: 'loss-1',
      productId: 'prod-1',
      stepKey: 'secado',
      quantityLost: '1',
      percentageLost: '5',
      reason: 'grieta',
    });
    assert.equal(loss.ok, true);
    if (!loss.ok) return;
    assert.equal(loss.value.reason, 'grieta');

    const corrected = await service.correctLoss(entrySession, {
      ...provenance(SESSION),
      id: 'loss-2',
      productId: 'prod-1',
      stepKey: 'secado',
      quantityLost: '2',
      percentageLost: '8',
      reason: 'conteo',
      correctsEntryId: 'loss-1',
      correctionReason: 'revisión',
    });
    assert.equal(corrected.ok, true);
    if (!corrected.ok) return;
    assert.equal(corrected.value.quantityLost, '2');
    const prior = await store.get(SESSION, 'loss-1');
    assert.equal(prior && prior.kind === 'loss' && prior.quantityLost, '1');

    const consumption = await service.recordConsumption(entrySession, {
      ...provenance(SESSION),
      id: 'cons-1',
      stepKey: 'horno',
      category: 'fuel',
      description: 'gas',
      reference: 'tanque-a',
      quantity: '3',
      unit: 'm3',
    });
    assert.equal(consumption.ok, true);
    if (!consumption.ok) return;
    assert.equal(consumption.value.inventoryEffect, 'none');
    assert.equal(consumptionMutatesStock(), false);
    assert.equal(store.inputStockBalance(SESSION, 'tanque-a'), null);
    assert.equal(prisma.entries.some((row) => row.inventoryEffect === 'none'), true);
    assert.equal(prisma.entries.every((row) => row.kind !== 'stock_decrement'), true);

    const classification = await service.recordClassification(entrySession, {
      ...provenance(SESSION),
      id: 'class-1',
      productId: 'prod-1',
      goodCount: 8,
      lostCount: 2,
    });
    assert.equal(classification.ok, true);
    if (!classification.ok) return;
    assert.equal(classification.value.stepKey, 'clasificacion');

    assert.equal(service.successEvents.length >= 8, true);
    assert.equal(PRODUCTION_LIVE_DB_WRITES.prisma_port, true);
    assert.equal(PRODUCTION_MIGRATION_APPLIED, false);
    assert.equal(PRODUCTION_LIVE_DB_WRITES.migrationApplied, false);
    assert.equal(JSON.stringify(consumption.value).includes('orderId'), false);
  });

  it('denies without entry scope and does not emit a success event', async () => {
    const { prisma, service } = serviceWithPrisma();
    const denied = await service.recordProcess(
      {
        organizationId: SESSION,
        grantedScopes: [PRODUCTION_REVIEW_MEMBER_SCOPE],
      },
      {
        ...provenance(SESSION),
        id: 'proc-denied',
        productId: 'prod-1',
        stepKey: 'colaje',
        quemaId: null,
        note: null,
      },
    );
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.denial, 'unauthorized');
    assert.equal(service.successEvents.length, 0);
    assert.equal(prisma.entries.length, 0);
  });

  it('denies review scope for loss and quema writes', async () => {
    const { service } = serviceWithPrisma();
    const review: ProductionWriteSession = {
      organizationId: SESSION,
      grantedScopes: [PRODUCTION_REVIEW_MEMBER_SCOPE],
    };
    const loss = await service.recordLoss(review, {
      ...provenance(SESSION),
      id: 'loss-denied',
      productId: 'prod-1',
      stepKey: 'secado',
      quantityLost: '1',
      percentageLost: '1',
      reason: 'x',
    });
    const quema = await service.openQuema(review, {
      ...quemaProvenance(SESSION),
      id: 'quema-denied',
      startedAt: occurredAt,
    });
    assert.equal(loss.ok, false);
    assert.equal(quema.ok, false);
    if (!loss.ok) assert.equal(loss.denial, 'unauthorized');
    if (!quema.ok) assert.equal(quema.denial, 'unauthorized');
    assert.equal(service.successEvents.length, 0);
  });

  it('keeps foreign organization rows invisible to the session', async () => {
    const { store, service } = serviceWithPrisma();
    await store.recordProcess(OTHER, {
      ...provenance(OTHER),
      id: 'proc-foreign',
      productId: 'prod-secret',
      stepKey: 'colaje',
      quemaId: null,
      note: 'secreto',
    });
    await store.openQuema(OTHER, {
      ...quemaProvenance(OTHER),
      id: 'quema-foreign',
      startedAt: occurredAt,
    });

    const missing = await service.recordProcess(entrySession, {
      ...provenance(SESSION),
      id: 'proc-linked',
      productId: 'prod-1',
      stepKey: 'horno',
      quemaId: 'quema-foreign',
      note: null,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.denial, 'not_found');
    assert.equal(service.successEvents.length, 0);
    assert.equal(await store.get(SESSION, 'proc-foreign'), null);
    assert.equal(JSON.stringify(missing).includes('prod-secret'), false);
    assert.equal(JSON.stringify(missing).includes('secreto'), false);
  });
});
