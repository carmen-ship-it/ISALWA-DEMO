/**
 * Prisma port for OsCoordinationDecision. Migration 20260916160000 exists and is
 * not applied here. recordCoordinationDecision / resolveCoordinationDecision stay
 * the pure builders; this module inserts only after they authorize.
 *
 * coordination.decision.record is write-only. This writer does not list, search,
 * or aggregate decisions and does not treat the write scope as read authority.
 */

import {
  COORDINATION_DECISION_CAPABILITY,
  emptyCoordinationLedger,
  recordCoordinationDecision,
  resolveCoordinationDecision,
  type CoordinationDecisionRecord,
  type CoordinationFailure,
  type CoordinationLedger,
  type CoordinationResult,
  type CoordinationSession,
  type RecordCoordinationDecisionInput,
  type RecordedCoordinationDecision,
  type ResolveCoordinationDecisionInput,
} from '@isalwa/os-contracts';

export const COORDINATION_DECISION_PRISMA_LIVE_WRITE = 'prisma_port' as const;
export const COORDINATION_DECISION_MIGRATION_APPLIED = false as const;

type PrismaDecisionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

export type CoordinationDecisionPrismaPort = {
  osCoordinationDecision: PrismaDecisionDelegate;
};

export type CoordinationDecisionWriteResult =
  | {
      ok: true;
      value: RecordedCoordinationDecision;
      liveWrite: typeof COORDINATION_DECISION_PRISMA_LIVE_WRITE;
      migrationApplied: typeof COORDINATION_DECISION_MIGRATION_APPLIED;
    }
  | {
      ok: false;
      reason: CoordinationFailure;
      liveWrite: typeof COORDINATION_DECISION_PRISMA_LIVE_WRITE;
      migrationApplied: typeof COORDINATION_DECISION_MIGRATION_APPLIED;
    };

function persistData(row: CoordinationDecisionRecord): Record<string, unknown> {
  return {
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind,
    decision: row.decision,
    ownerLabel: row.ownerLabel,
    ownerMemberId: row.ownerMemberId,
    dueAt: row.dueAt,
    actorLabel: row.actorLabel,
    actorMemberId: row.actorMemberId,
    occurredAt: new Date(row.occurredAt),
    linkedCaseId: row.linkedCaseId,
    notes: row.notes,
    resolvesDecisionId: row.resolvesDecisionId,
    recordedAt: new Date(row.recordedAt),
  };
}

function denied(reason: CoordinationFailure): CoordinationDecisionWriteResult {
  return {
    ok: false,
    reason,
    liveWrite: COORDINATION_DECISION_PRISMA_LIVE_WRITE,
    migrationApplied: COORDINATION_DECISION_MIGRATION_APPLIED,
  };
}

function accepted(value: RecordedCoordinationDecision): CoordinationDecisionWriteResult {
  return {
    ok: true,
    value,
    liveWrite: COORDINATION_DECISION_PRISMA_LIVE_WRITE,
    migrationApplied: COORDINATION_DECISION_MIGRATION_APPLIED,
  };
}

/**
 * Inserts a built coordination decision row when authorization succeeds.
 * A deny path never calls create. Does not unlock prior-decision reads.
 */
export function createPrismaCoordinationDecisionWriter(prisma: CoordinationDecisionPrismaPort) {
  let createCalls = 0;

  return {
    liveWrite: COORDINATION_DECISION_PRISMA_LIVE_WRITE,
    migrationApplied: COORDINATION_DECISION_MIGRATION_APPLIED,
    capability: COORDINATION_DECISION_CAPABILITY,
    /** Inspection for tests. Production callers should not use create as a read. */
    get createCallCount() {
      return createCalls;
    },

    async record(
      input: Omit<RecordCoordinationDecisionInput, 'ledger'> & { ledger?: CoordinationLedger },
    ): Promise<CoordinationDecisionWriteResult> {
      const built = recordCoordinationDecision({
        ...input,
        ledger: input.ledger ?? emptyCoordinationLedger(),
      });
      if (!built.ok) return denied(built.reason);
      await prisma.osCoordinationDecision.create({ data: persistData(built.value.decision) });
      createCalls += 1;
      return accepted(built.value);
    },

    async resolve(
      input: Omit<ResolveCoordinationDecisionInput, 'ledger'> & { ledger: CoordinationLedger },
    ): Promise<CoordinationDecisionWriteResult> {
      const built = resolveCoordinationDecision(input);
      if (!built.ok) return denied(built.reason);
      await prisma.osCoordinationDecision.create({ data: persistData(built.value.decision) });
      createCalls += 1;
      return accepted(built.value);
    },
  };
}

export type PrismaCoordinationDecisionWriter = ReturnType<typeof createPrismaCoordinationDecisionWriter>;

/** Write scope is not a read. Callers must not invent a list from this helper. */
export function coordinationDecisionWriteUnlocksRead(_session: CoordinationSession | null | undefined): false {
  return false;
}

export function authorizeCoordinationDecisionWriteOnly(
  result: CoordinationResult<unknown> | CoordinationDecisionWriteResult,
): boolean {
  return result.ok === true;
}
