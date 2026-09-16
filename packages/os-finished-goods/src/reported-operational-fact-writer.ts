/**
 * Prisma port for OsReportedOperationalFact. Builders stay pure; this module
 * inserts or reverses only after finance.operational.record authorizes.
 *
 * Confirmation stays pending. This is not a ledger post and not a payment
 * confirmation. Mixed tenders remain in the builder payload.
 */

import {
  buildReportedOperationalFactRow,
  reverseReportedOperationalFactRow,
  type RecordReportedOperationalFactInput,
  type ReportedOperationalFactRow,
} from '@isalwa/os-contracts';
import {
  canRecordOperationalFinance,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
} from '@isalwa/os-contracts';

export const REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE = 'prisma_port' as const;
export const REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED = false as const;
export const REPORTED_OPERATIONAL_FACT_CONFIRMATION = 'pending' as const;

export type ReportedFactSession = {
  organizationId?: string | null;
  actorMemberId?: string | null;
  actorLabel?: string | null;
  grantedScopes?: readonly string[] | null;
};

export type ReportedFactWriteFailure =
  | 'missing_session_org'
  | 'unauthorized'
  | 'cross_tenant'
  | 'not_found'
  | 'invalid';

type PrismaFactRow = {
  id: string;
  organizationId: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  reportedAt: Date;
  reportedByMemberId: string | null;
  reportedByLabel: string;
  source: string;
  confirmation: string;
  activity: string;
  reversalReason: string | null;
  sourceReference: string | null;
  note: string | null;
  payloadJson: Record<string, unknown>;
  correctsFactId: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
};

type PrismaFactDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<PrismaFactRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
};

export type ReportedOperationalFactPrismaPort = {
  osReportedOperationalFact: PrismaFactDelegate;
};

export type ReportedFactWriteResult =
  | {
      ok: true;
      row: ReportedOperationalFactRow;
      liveWrite: typeof REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE;
      migrationApplied: typeof REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED;
      confirmation: typeof REPORTED_OPERATIONAL_FACT_CONFIRMATION;
      ledgerConfirmed: false;
    }
  | {
      ok: false;
      reason: ReportedFactWriteFailure;
      liveWrite: typeof REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE;
      migrationApplied: typeof REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED;
      confirmation: typeof REPORTED_OPERATIONAL_FACT_CONFIRMATION;
      ledgerConfirmed: false;
    };

function blank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function denied(reason: ReportedFactWriteFailure): ReportedFactWriteResult {
  return {
    ok: false,
    reason,
    liveWrite: REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE,
    migrationApplied: REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED,
    confirmation: REPORTED_OPERATIONAL_FACT_CONFIRMATION,
    ledgerConfirmed: false,
  };
}

function accepted(row: ReportedOperationalFactRow): ReportedFactWriteResult {
  return {
    ok: true,
    row,
    liveWrite: REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE,
    migrationApplied: REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED,
    confirmation: REPORTED_OPERATIONAL_FACT_CONFIRMATION,
    ledgerConfirmed: false,
  };
}

function authorize(
  session: ReportedFactSession | null | undefined,
  organizationId: string,
): ReportedFactWriteFailure | null {
  const sessionOrg = blank(session?.organizationId);
  if (!sessionOrg) return 'missing_session_org';
  if (sessionOrg !== organizationId) return 'cross_tenant';
  if (!canRecordOperationalFinance(session?.grantedScopes ?? [])) return 'unauthorized';
  return null;
}

function toPrismaData(row: ReportedOperationalFactRow): Record<string, unknown> {
  return {
    id: row.id,
    organizationId: row.organization_id,
    kind: row.kind,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    reportedAt: new Date(row.reported_at),
    reportedByMemberId: row.reported_by_member_id,
    reportedByLabel: row.reported_by_label,
    source: row.source,
    confirmation: 'pending',
    activity: row.activity,
    reversalReason: row.reversal_reason,
    sourceReference: row.source_reference,
    note: row.note,
    payloadJson: row.payload_json,
    correctsFactId: row.corrects_fact_id,
    idempotencyKey: row.idempotency_key,
    createdAt: new Date(row.created_at),
  };
}

function fromPrisma(row: PrismaFactRow): ReportedOperationalFactRow {
  return {
    id: row.id,
    organization_id: row.organizationId,
    kind: row.kind as ReportedOperationalFactRow['kind'],
    subject_type: row.subjectType as ReportedOperationalFactRow['subject_type'],
    subject_id: row.subjectId,
    reported_at: row.reportedAt.toISOString(),
    reported_by_member_id: row.reportedByMemberId,
    reported_by_label: row.reportedByLabel,
    source: 'manual',
    confirmation: 'pending',
    activity: row.activity as ReportedOperationalFactRow['activity'],
    reversal_reason: row.reversalReason,
    source_reference: row.sourceReference,
    note: row.note,
    payload_json: row.payloadJson,
    corrects_fact_id: row.correctsFactId,
    idempotency_key: row.idempotencyKey,
    created_at: row.createdAt.toISOString(),
    canonical_effect: 'none',
  };
}

/**
 * Inserts or reverses reported operational facts. Never ledger-confirms.
 * Gate: finance.operational.record. Session organization must match the row.
 */
export function createPrismaReportedOperationalFactWriter(prisma: ReportedOperationalFactPrismaPort) {
  let createCalls = 0;
  let updateCalls = 0;

  return {
    liveWrite: REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE,
    migrationApplied: REPORTED_OPERATIONAL_FACT_MIGRATION_APPLIED,
    capability: FINANCE_OPERATIONAL_RECORD_SCOPE,
    get createCallCount() {
      return createCalls;
    },
    get updateCallCount() {
      return updateCalls;
    },

    async record(input: {
      session: ReportedFactSession | null | undefined;
      fact: RecordReportedOperationalFactInput;
      createdAt?: string;
    }): Promise<ReportedFactWriteResult> {
      const organizationId = blank(
        typeof input.fact.organizationId === 'string' ? input.fact.organizationId : null,
      );
      if (!organizationId) return denied('invalid');
      const auth = authorize(input.session, organizationId);
      if (auth) return denied(auth);

      let row: ReportedOperationalFactRow;
      try {
        row = buildReportedOperationalFactRow(
          input.fact,
          input.createdAt ?? new Date().toISOString(),
        );
      } catch {
        return denied('invalid');
      }
      if (row.confirmation !== 'pending' || row.source !== 'manual') return denied('invalid');

      await prisma.osReportedOperationalFact.create({ data: toPrismaData(row) });
      createCalls += 1;
      return accepted(row);
    },

    async reverse(input: {
      session: ReportedFactSession | null | undefined;
      factId: string;
      organizationId: string;
      reason: string;
    }): Promise<ReportedFactWriteResult> {
      const organizationId = blank(input.organizationId);
      const factId = blank(input.factId);
      if (!organizationId || !factId) return denied('invalid');
      const auth = authorize(input.session, organizationId);
      if (auth) return denied(auth);

      const existing = await prisma.osReportedOperationalFact.findFirst({
        where: { organizationId, id: factId },
      });
      if (!existing || existing.organizationId !== organizationId) return denied('not_found');

      let reversed: ReportedOperationalFactRow;
      try {
        reversed = reverseReportedOperationalFactRow(fromPrisma(existing), {
          factId,
          organizationId,
          reason: input.reason,
        });
      } catch {
        return denied('invalid');
      }
      if (reversed.confirmation !== 'pending') return denied('invalid');

      await prisma.osReportedOperationalFact.update({
        where: { id: factId },
        data: {
          activity: reversed.activity,
          reversalReason: reversed.reversal_reason,
          confirmation: 'pending',
          source: 'manual',
        },
      });
      updateCalls += 1;
      return accepted(reversed);
    },
  };
}

export type PrismaReportedOperationalFactWriter = ReturnType<
  typeof createPrismaReportedOperationalFactWriter
>;

export function reportedFactWriterMayConfirmLedger(): false {
  return false;
}
