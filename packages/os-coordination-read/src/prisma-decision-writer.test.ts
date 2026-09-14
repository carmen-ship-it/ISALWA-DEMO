import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  emptyCoordinationLedger,
  type CoordinationDecisionRecord,
  type CoordinationLedger,
  type CoordinationSession,
} from '@isalwa/os-contracts';
import {
  COORDINATION_READ_AUTHORITY,
} from '../../os-finished-goods/src/writer-matrix';
import {
  COORDINATION_DECISION_MIGRATION_APPLIED,
  COORDINATION_DECISION_PRISMA_LIVE_WRITE,
  coordinationDecisionWriteUnlocksRead,
  createPrismaCoordinationDecisionWriter,
  type CoordinationDecisionPrismaPort,
} from './prisma-decision-writer';

const occurredAt = '2026-09-16T15:00:00.000Z';
const SESSION = 'org-a';
const FOREIGN = 'org-b-secreto';

function session(over: Partial<CoordinationSession> = {}): CoordinationSession {
  return {
    organizationId: SESSION,
    actorMemberId: 'member-1',
    actorLabel: 'Ana',
    grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
    cargo: null,
    title: null,
    ...over,
  };
}

function fakePrisma() {
  const rows: Record<string, unknown>[] = [];
  const prisma: CoordinationDecisionPrismaPort & { rows: Record<string, unknown>[] } = {
    rows,
    osCoordinationDecision: {
      async create(args) {
        rows.push(args.data);
        return args.data;
      },
    },
  };
  return prisma;
}

describe('createPrismaCoordinationDecisionWriter', () => {
  it('persists on allow with coordination.decision.record', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaCoordinationDecisionWriter(prisma);
    assert.equal(writer.liveWrite, COORDINATION_DECISION_PRISMA_LIVE_WRITE);
    assert.equal(writer.migrationApplied, COORDINATION_DECISION_MIGRATION_APPLIED);
    assert.equal(COORDINATION_DECISION_PRISMA_LIVE_WRITE, 'prisma_port');

    const result = await writer.record({
      session: session(),
      id: 'dec-1',
      decision: 'Reprogramar entrega del jueves',
      occurredAt,
    });

    assert.equal(result.ok, true);
    assert.equal(result.liveWrite, 'prisma_port');
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.rows[0]?.organizationId, SESSION);
    assert.equal(prisma.rows[0]?.kind, 'recorded');
    assert.equal(prisma.rows[0]?.decision, 'Reprogramar entrega del jueves');
    assert.equal(writer.createCallCount, 1);
    if (!result.ok) return;
    assert.equal(result.value.mutatedProduction, false);
    assert.equal(result.value.mutatedPayment, false);
    assert.equal(result.value.grantsProductionAuthority, false);
  });

  it('denies without capability and does not insert', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaCoordinationDecisionWriter(prisma);
    const denied = await writer.record({
      session: session({
        grantedCapabilities: ['operations.coordinator.record', 'management.org.read'],
        cargo: 'Auxiliar',
        title: 'Auxiliar',
      }),
      id: 'dec-deny',
      decision: 'No debe persistir',
      occurredAt,
    });
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'unauthorized_role');
    assert.equal(prisma.rows.length, 0);
    assert.equal(writer.createCallCount, 0);
  });

  it('denies foreign organization and does not insert', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaCoordinationDecisionWriter(prisma);
    const denied = await writer.record({
      session: session(),
      id: 'dec-foreign',
      decision: 'Decisión de otra org',
      occurredAt,
      organizationId: FOREIGN,
    });
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'cross_tenant');
    assert.equal(prisma.rows.length, 0);
    assert.doesNotMatch(JSON.stringify(denied), new RegExp(FOREIGN));
    assert.equal(writer.createCallCount, 0);
  });

  it('keeps coordination read closed and does not use write scope as read authority', async () => {
    assert.equal(COORDINATION_READ_AUTHORITY.kind, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(COORDINATION_READ_AUTHORITY.id, 'COORDINATION_READ_AUTHORITY');
    assert.equal(COORDINATION_READ_AUTHORITY.doNotUse.includes('coordination.decision.record'), true);
    assert.equal(coordinationDecisionWriteUnlocksRead(session()), false);
    assert.equal(JSON.stringify(COORDINATION_READ_AUTHORITY).includes('coordination.read'), false);

    const prisma = fakePrisma();
    const writer = createPrismaCoordinationDecisionWriter(prisma);
    assert.equal('list' in writer, false);
    assert.equal('search' in writer, false);
    assert.equal('aggregate' in writer, false);
    assert.equal('read' in writer, false);

    const prior: CoordinationDecisionRecord = {
      id: 'dec-open',
      organizationId: SESSION,
      kind: 'recorded',
      decision: 'Prior',
      ownerLabel: null,
      ownerMemberId: null,
      dueAt: null,
      actorLabel: 'Ana',
      actorMemberId: 'member-1',
      occurredAt,
      linkedCaseId: null,
      notes: null,
      resolvesDecisionId: null,
      recordedAt: occurredAt,
      grantsProductionAuthority: false,
      grantsFinanceAuthority: false,
      grantsWarehouseAuthority: false,
    };
    const ledger: CoordinationLedger = { decisions: [prior] };
    const resolved = await writer.resolve({
      session: session(),
      ledger,
      id: 'dec-res',
      resolvesDecisionId: prior.id,
      decision: 'Cerrado',
      occurredAt,
    });
    assert.equal(resolved.ok, true);
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.rows[0]?.kind, 'resolved');
    // Holding the write capability still does not invent a read surface here.
    assert.equal(coordinationDecisionWriteUnlocksRead(session()), false);
  });

  it('starts from an empty ledger when omitted', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaCoordinationDecisionWriter(prisma);
    const result = await writer.record({
      session: session(),
      id: 'dec-empty-ledger',
      decision: 'Sin ledger previo',
      occurredAt,
      ledger: emptyCoordinationLedger(),
    });
    assert.equal(result.ok, true);
    assert.equal(prisma.rows.length, 1);
  });
});
