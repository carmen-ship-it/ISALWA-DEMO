import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  canEnterProduction,
  scopeImplies,
} from '../../os-contracts/src/operations-scopes';
import { COMMERCIAL_TEAM_READ_SCOPE } from '../../os-contracts/src/scopes';
import {
  PRODUCTION_LIVE_DB_WRITES,
  PRODUCTION_REVIEW_MUTATION,
  ProductionWriteService,
  commercialTeamReadAuthorizesProductionWrite,
  operationalRecordAuthorizesProductionEntry,
  operationalRecordDistinctFromEntry,
  reviewAuthorizesProductionEntry,
  reviewScopeDistinctFromEntry,
  type ProductionWriteSession,
} from './commands';
import { InMemoryProductionTraceStore } from './store';

const occurredAt = '2026-09-14T14:00:00.000Z';
const recordedAt = '2026-09-14T15:00:00.000Z';
const SESSION = 'org-session';
const OTHER = 'org-other';
const FOREIGN_REASON = 'merma-secreta-org-b';
const FOREIGN_PRODUCT = 'producto-secreto-org-b';
const FOREIGN_NOTE = 'nota-secreta-org-b';

const entrySession: ProductionWriteSession = {
  organizationId: SESSION,
  memberId: 'member-entry',
  actorLabel: 'Encargado de planta',
  grantedScopes: [PRODUCTION_ENTRY_MEMBER_SCOPE],
};

function sessionWith(scopes: readonly string[], organizationId = SESSION): ProductionWriteSession {
  return { organizationId, memberId: 'member-probe', grantedScopes: scopes };
}

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

function seed() {
  const store = new InMemoryProductionTraceStore();
  store.recordProcess(SESSION, {
    ...provenance(SESSION),
    id: 'proc-own',
    productId: 'prod-own',
    stepKey: 'colaje',
    quemaId: null,
    note: null,
  });
  store.recordProcess(OTHER, {
    ...provenance(OTHER),
    id: 'proc-foreign',
    productId: FOREIGN_PRODUCT,
    stepKey: 'colaje',
    quemaId: null,
    note: FOREIGN_NOTE,
  });
  store.recordLoss(SESSION, {
    ...provenance(SESSION),
    id: 'loss-own',
    productId: 'prod-own',
    stepKey: 'secado',
    quantityLost: '1',
    percentageLost: '5',
    reason: 'grieta propia',
  });
  store.recordLoss(OTHER, {
    ...provenance(OTHER),
    id: 'loss-foreign',
    productId: FOREIGN_PRODUCT,
    stepKey: 'secado',
    quantityLost: '9',
    percentageLost: '40',
    reason: FOREIGN_REASON,
  });
  store.recordConsumption(SESSION, {
    ...provenance(SESSION),
    id: 'cons-own',
    stepKey: 'horno',
    category: 'fuel',
    description: 'gas propio',
    reference: null,
    quantity: '2',
    unit: 'm3',
  });
  store.recordConsumption(OTHER, {
    ...provenance(OTHER),
    id: 'cons-foreign',
    stepKey: 'horno',
    category: 'fuel',
    description: FOREIGN_NOTE,
    reference: FOREIGN_PRODUCT,
    quantity: '77',
    unit: 'm3',
  });
  store.openQuema(SESSION, {
    ...quemaProvenance(SESSION),
    id: 'quema-own',
    startedAt: occurredAt,
  });
  store.openQuema(OTHER, {
    ...quemaProvenance(OTHER),
    id: 'quema-foreign',
    startedAt: occurredAt,
  });
  store.attachQuemaProduct(OTHER, {
    ...provenance(OTHER),
    id: 'link-foreign',
    quemaId: 'quema-foreign',
    productId: FOREIGN_PRODUCT,
    quantity: '4',
    unit: 'piezas',
  });
  return store;
}

function denial(result: { ok: boolean; denial?: string; message?: string }) {
  assert.equal(result.ok, false);
  return { denial: result.denial, message: result.message };
}

function assertNoForeignLeak(value: unknown) {
  const encoded = JSON.stringify(value);
  assert.equal(encoded.includes(FOREIGN_REASON), false);
  assert.equal(encoded.includes(FOREIGN_PRODUCT), false);
  assert.equal(encoded.includes(FOREIGN_NOTE), false);
  assert.equal(encoded.includes(OTHER), false);
}

describe('production write scope boundaries', () => {
  it('does not let review, operational record, or commercial.team.read authorize entry', () => {
    assert.equal(reviewScopeDistinctFromEntry(), true);
    assert.equal(operationalRecordDistinctFromEntry(), true);
    assert.equal(reviewAuthorizesProductionEntry([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(operationalRecordAuthorizesProductionEntry([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), false);
    assert.equal(commercialTeamReadAuthorizesProductionWrite([COMMERCIAL_TEAM_READ_SCOPE]), false);
    assert.equal(scopeImplies(PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE), false);
    assert.equal(scopeImplies(PRODUCTION_OPERATIONAL_RECORD_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE), false);
    assert.equal(scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE), false);
    assert.equal(canEnterProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canEnterProduction([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), false);
    assert.equal(canEnterProduction([COMMERCIAL_TEAM_READ_SCOPE]), false);
    assert.equal(PRODUCTION_REVIEW_MUTATION, 'not_implemented');
    assert.equal(PRODUCTION_LIVE_DB_WRITES, 'UNPROVEN');
  });

  it('denies review, operational record, commercial read, and cargo before any write', () => {
    const store = seed();
    const service = new ProductionWriteService(store);
    const payload = {
      ...provenance(OTHER),
      id: 'proc-denied',
      productId: 'prod-own',
      stepKey: 'pulido',
      quemaId: 'quema-foreign',
      note: null,
    };
    const sessions = [
      sessionWith([PRODUCTION_REVIEW_MEMBER_SCOPE]),
      sessionWith([PRODUCTION_OPERATIONAL_RECORD_SCOPE]),
      sessionWith([COMMERCIAL_TEAM_READ_SCOPE]),
      sessionWith([PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_OPERATIONAL_RECORD_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]),
      { organizationId: SESSION, cargo: 'encargado de producción', title: 'El encargado de producción', grantedScopes: [] },
      { organizationId: '', grantedScopes: [PRODUCTION_ENTRY_MEMBER_SCOPE] },
    ];
    const denied = sessions.map((session) => service.recordProcess(session, payload));
    for (const result of denied) {
      assert.deepEqual(denial(result), denial(denied[0]!));
      assertNoForeignLeak(result);
    }
    assert.equal(service.successEvents.length, 0);
    assert.equal(store.get(SESSION, 'proc-denied'), null);
    const foreign = store.get(OTHER, 'proc-foreign');
    assert.equal(foreign && foreign.kind === 'process_record' && foreign.note, FOREIGN_NOTE);
  });
});

describe('production id mutations stay in the session organization', () => {
  it('ends, attaches, and corrects only a quema or record loaded in the session organization', () => {
    const store = seed();
    const service = new ProductionWriteService(store);
    const foreignQuemaBefore = store.getQuema(OTHER, 'quema-foreign');
    const missingEnd = service.endQuema(entrySession, {
      ...provenance(OTHER),
      id: 'end-missing',
      quemaId: 'quema-missing',
      endedAt: recordedAt,
    });
    const foreignEnd = service.endQuema(entrySession, {
      ...provenance(OTHER),
      id: 'end-foreign',
      quemaId: 'quema-foreign',
      endedAt: recordedAt,
    });
    assert.deepEqual(denial(missingEnd), denial(foreignEnd));
    assert.equal(denial(foreignEnd).denial, 'not_found');
    assertNoForeignLeak(foreignEnd);
    assert.deepEqual(store.getQuema(OTHER, 'quema-foreign'), foreignQuemaBefore);
    assert.equal(store.getQuema(SESSION, 'quema-own').endedAt, null);
    assert.equal(service.successEvents.length, 0);

    const ended = service.endQuema(entrySession, {
      ...provenance(OTHER),
      id: 'end-own',
      quemaId: 'quema-own',
      endedAt: recordedAt,
    });
    assert.equal(ended.ok, true);
    if (!ended.ok) return;
    assert.equal(ended.value.organizationId, SESSION);
    assert.equal(ended.value.endedAt, recordedAt);
    assert.equal(service.successEvents.length, 1);
    assert.equal(service.successEvents[0]?.organizationId, SESSION);
    assert.equal(store.getQuema(OTHER, 'quema-foreign').endedAt, null);

    const foreignAttach = service.attachQuemaProduct(entrySession, {
      ...provenance(OTHER),
      id: 'link-attack',
      quemaId: 'quema-foreign',
      productId: 'prod-own',
      quantity: '1',
      unit: 'piezas',
    });
    const missingAttach = service.attachQuemaProduct(entrySession, {
      ...provenance(SESSION),
      id: 'link-missing',
      quemaId: 'quema-missing',
      productId: 'prod-own',
      quantity: '1',
      unit: 'piezas',
    });
    assert.deepEqual(denial(foreignAttach), denial(missingAttach));
    assertNoForeignLeak(foreignAttach);
    assert.equal(store.getQuema(OTHER, 'quema-foreign').products.length, 1);
    assert.equal(service.successEvents.length, 1);

    const attached = service.attachQuemaProduct(entrySession, {
      ...provenance(OTHER),
      id: 'link-own',
      quemaId: 'quema-own',
      productId: 'prod-own',
      quantity: '2',
      unit: 'piezas',
    });
    assert.equal(attached.ok, true);
    if (attached.ok) assert.equal(attached.value.organizationId, SESSION);
    assert.equal(store.getQuema(OTHER, 'quema-foreign').products[0]?.productId, FOREIGN_PRODUCT);

    const foreignLoss = store.get(OTHER, 'loss-foreign');
    const missingCorrection = service.correctLoss(entrySession, {
      ...provenance(OTHER),
      id: 'loss-missing-correction',
      productId: 'prod-own',
      stepKey: 'secado',
      quantityLost: '3',
      percentageLost: '8',
      reason: 'conteo',
      correctsEntryId: 'loss-missing',
      correctionReason: 'no existe',
    });
    const foreignCorrection = service.correctLoss(entrySession, {
      ...provenance(OTHER),
      id: 'loss-foreign-correction',
      productId: 'prod-own',
      stepKey: 'secado',
      quantityLost: '3',
      percentageLost: '8',
      reason: 'conteo',
      correctsEntryId: 'loss-foreign',
      correctionReason: 'no debe cruzar',
    });
    assert.deepEqual(denial(missingCorrection), denial(foreignCorrection));
    assert.equal(denial(foreignCorrection).denial, 'not_found');
    assertNoForeignLeak(foreignCorrection);
    assert.deepEqual(store.get(OTHER, 'loss-foreign'), foreignLoss);
    assert.equal(store.get(SESSION, 'loss-foreign-correction'), null);
    assert.equal(store.get(OTHER, 'loss-foreign-correction'), null);

    const corrected = service.correctLoss(entrySession, {
      ...provenance(OTHER),
      id: 'loss-own-correction',
      productId: 'prod-own',
      stepKey: 'secado',
      quantityLost: '2',
      percentageLost: '6',
      reason: 'conteo propio',
      correctsEntryId: 'loss-own',
      correctionReason: 'revisión de planta',
    });
    assert.equal(corrected.ok, true);
    if (corrected.ok) {
      assert.equal(corrected.value.organizationId, SESSION);
      assert.equal(corrected.value.quantityLost, '2');
    }
    assert.equal(store.get(OTHER, 'loss-foreign') && 'reason' in (store.get(OTHER, 'loss-foreign') ?? {}), true);
    const stillForeign = store.get(OTHER, 'loss-foreign');
    assert.equal(stillForeign && stillForeign.kind === 'loss' && stillForeign.reason, FOREIGN_REASON);
  });

  it('does not correct a foreign consumption or attach a process to a foreign quema', () => {
    const store = seed();
    const service = new ProductionWriteService(store);
    const foreignConsumption = store.get(OTHER, 'cons-foreign');
    const missing = service.recordConsumption(entrySession, {
      ...provenance(SESSION),
      id: 'cons-missing-correction',
      stepKey: 'horno',
      category: 'fuel',
      description: 'gas',
      reference: null,
      quantity: '1',
      unit: 'm3',
      correctsEntryId: 'cons-missing',
      correctionReason: 'no existe',
    });
    const foreign = service.recordConsumption(entrySession, {
      ...provenance(OTHER),
      id: 'cons-foreign-correction',
      stepKey: 'horno',
      category: 'fuel',
      description: 'gas',
      reference: null,
      quantity: '1',
      unit: 'm3',
      correctsEntryId: 'cons-foreign',
      correctionReason: 'no debe cruzar',
    });
    assert.deepEqual(denial(missing), denial(foreign));
    assertNoForeignLeak(foreign);
    assert.deepEqual(store.get(OTHER, 'cons-foreign'), foreignConsumption);
    assert.equal(store.get(SESSION, 'cons-foreign-correction'), null);
    assert.equal(service.successEvents.length, 0);

    const recorded = service.recordConsumption(entrySession, {
      ...provenance(OTHER),
      id: 'cons-new',
      stepKey: 'horno',
      category: 'fuel',
      description: 'gas de la sesión',
      reference: null,
      quantity: '3',
      unit: 'm3',
    });
    assert.equal(recorded.ok, true);
    if (recorded.ok) assert.equal(recorded.value.organizationId, SESSION);
    assert.equal(store.get(OTHER, 'cons-new'), null);

    const foreignProcess = service.recordProcess(entrySession, {
      ...provenance(OTHER),
      id: 'proc-linked-foreign',
      productId: 'prod-own',
      stepKey: 'horno',
      quemaId: 'quema-foreign',
      note: null,
    });
    const missingProcess = service.recordProcess(entrySession, {
      ...provenance(SESSION),
      id: 'proc-linked-missing',
      productId: 'prod-own',
      stepKey: 'horno',
      quemaId: 'quema-missing',
      note: null,
    });
    assert.deepEqual(denial(foreignProcess), denial(missingProcess));
    assert.equal(store.get(SESSION, 'proc-linked-foreign'), null);
    assert.equal(store.get(OTHER, 'proc-linked-foreign'), null);
    assertNoForeignLeak(foreignProcess);

    const linked = service.recordProcess(entrySession, {
      ...provenance(OTHER),
      id: 'proc-linked-own',
      productId: 'prod-own',
      stepKey: 'horno',
      quemaId: 'quema-own',
      note: null,
    });
    assert.equal(linked.ok, true);
    if (linked.ok) {
      assert.equal(linked.value.organizationId, SESSION);
      assert.equal(linked.value.quemaId, 'quema-own');
    }
  });

  it('starts a quema in the session even if another organization already uses that id', () => {
    const store = seed();
    const service = new ProductionWriteService(store);
    const foreignBefore = store.getQuema(OTHER, 'quema-foreign');
    const started = service.openQuema(entrySession, {
      ...quemaProvenance(OTHER),
      id: 'quema-foreign',
      startedAt: occurredAt,
    });
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(started.value.organizationId, SESSION);
    assert.equal(started.value.id, 'quema-foreign');
    assert.deepEqual(store.getQuema(OTHER, 'quema-foreign'), foreignBefore);
    assert.equal(service.successEvents.at(-1)?.organizationId, SESSION);
    assertNoForeignLeak(started);
    assert.equal(JSON.stringify(service.successEvents).includes(FOREIGN_PRODUCT), false);
  });

  it('does not correct a foreign quema time or product link', () => {
    const store = seed();
    const service = new ProductionWriteService(store);
    const foreignBefore = store.getQuema(OTHER, 'quema-foreign');
    const correctedEnd = service.endQuema(entrySession, {
      ...provenance(SESSION),
      id: 'end-correct-foreign-time',
      quemaId: 'quema-own',
      endedAt: recordedAt,
      correctsTimeId: 'quema-foreign:start',
      correctionReason: 'hora ajena',
    });
    assert.equal(correctedEnd.ok, false);
    if (!correctedEnd.ok) assert.equal(correctedEnd.denial, 'not_found');
    assert.equal(store.getQuema(SESSION, 'quema-own').endedAt, null);
    assert.deepEqual(store.getQuema(OTHER, 'quema-foreign'), foreignBefore);
    assert.equal(service.successEvents.length, 0);
    assertNoForeignLeak(correctedEnd);

    const correctedLink = service.attachQuemaProduct(entrySession, {
      ...provenance(SESSION),
      id: 'link-correct-foreign',
      quemaId: 'quema-own',
      productId: 'prod-own',
      quantity: '1',
      unit: 'piezas',
      correctsLinkId: 'link-foreign',
      correctionReason: 'producto ajeno',
    });
    assert.equal(correctedLink.ok, false);
    if (!correctedLink.ok) assert.equal(correctedLink.denial, 'not_found');
    assert.equal(store.getQuema(SESSION, 'quema-own').products.length, 0);
    assert.deepEqual(store.getQuema(OTHER, 'quema-foreign'), foreignBefore);
    assert.equal(service.successEvents.length, 0);
    assertNoForeignLeak(correctedLink);
  });
});

describe('production live database writes', () => {
  it('does not invent a Prisma writer', () => {
    const src = join(__dirname);
    const files = ['store.ts', 'commands.ts', 'index.ts'];
    const source = files.map((name) => readFileSync(join(src, name), 'utf8')).join('\n');
    assert.equal(files.every((name) => readdirSync(src).includes(name)), true);
    assert.equal(/from ['"].*prisma/i.test(source), false);
    assert.equal(source.includes('PrismaClient'), false);
    assert.equal(/\.prisma\b/.test(source), false);
    assert.equal(PRODUCTION_LIVE_DB_WRITES, 'UNPROVEN');
    assert.equal(PRODUCTION_REVIEW_MUTATION, 'not_implemented');
  });
});
