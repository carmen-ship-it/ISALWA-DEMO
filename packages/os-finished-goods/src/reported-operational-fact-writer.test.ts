import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FINANCE_OPERATIONAL_RECORD_SCOPE } from '../../os-contracts/src/operations-scopes';
import {
  REPORTED_OPERATIONAL_FACT_CONFIRMATION,
  REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE,
  createPrismaReportedOperationalFactWriter,
  reportedFactWriterMayConfirmLedger,
  type ReportedOperationalFactPrismaPort,
  type ReportedFactSession,
} from './reported-operational-fact-writer';

const createdAt = '2026-09-14T18:00:00.000Z';
const reportedAt = '2026-09-14T17:30:00.000Z';
const SESSION = 'org-a';
const FOREIGN = 'org-b';

function session(over: Partial<ReportedFactSession> = {}): ReportedFactSession {
  return {
    organizationId: SESSION,
    actorMemberId: 'mem-fin',
    actorLabel: 'Contabilidad',
    grantedScopes: [FINANCE_OPERATIONAL_RECORD_SCOPE],
    ...over,
  };
}

function paymentFact(over: Record<string, unknown> = {}) {
  return {
    id: 'rof-1',
    organizationId: SESSION,
    kind: 'payment' as const,
    subjectType: 'order' as const,
    subjectId: 'order-1',
    reportedAt,
    reportedByLabel: 'Contabilidad',
    reportedByMemberId: 'mem-fin',
    payload: {
      amountCentavos: '127000',
      currency: 'BOB',
      tenders: [
        { method: 'efectivo', amountCentavos: '107000' },
        { method: 'QR', amountCentavos: '20000' },
      ],
    },
    ...over,
  };
}

type FactRow = {
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

function fakePrisma() {
  const rows: FactRow[] = [];

  const prisma: ReportedOperationalFactPrismaPort & { rows: FactRow[] } = {
    rows,
    osReportedOperationalFact: {
      async findFirst(args) {
        const where = args.where as { organizationId?: string; id?: string };
        return (
          rows.find(
            (row) =>
              row.organizationId === where.organizationId &&
              (!where.id || row.id === where.id),
          ) ?? null
        );
      },
      async create(args) {
        const data = args.data as FactRow;
        rows.push({
          ...data,
          reportedAt: data.reportedAt instanceof Date ? data.reportedAt : new Date(String(data.reportedAt)),
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(String(data.createdAt)),
        });
        return data;
      },
      async update(args) {
        const idx = rows.findIndex((row) => row.id === args.where.id);
        if (idx < 0) throw new Error('missing');
        rows[idx] = { ...rows[idx]!, ...(args.data as Partial<FactRow>) };
        return rows[idx];
      },
    },
  };
  return prisma;
}

describe('createPrismaReportedOperationalFactWriter', () => {
  it('persists payment evidence on finance.operational.record without ledger confirm', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaReportedOperationalFactWriter(prisma);
    const result = await writer.record({
      session: session(),
      fact: paymentFact(),
      createdAt,
    });
    assert.equal(result.ok, true);
    assert.equal(result.liveWrite, REPORTED_OPERATIONAL_FACT_PRISMA_LIVE_WRITE);
    assert.equal(result.confirmation, REPORTED_OPERATIONAL_FACT_CONFIRMATION);
    assert.equal(result.ledgerConfirmed, false);
    assert.equal(reportedFactWriterMayConfirmLedger(), false);
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.rows[0]?.confirmation, 'pending');
    assert.equal(prisma.rows[0]?.source, 'manual');
    const tenders = (prisma.rows[0]?.payloadJson as { tenders?: unknown }).tenders;
    assert.equal(Array.isArray(tenders), true);
    assert.equal((tenders as unknown[]).length, 2);
    if (!result.ok) return;
    assert.equal(result.row.confirmation, 'pending');
    assert.deepEqual(result.row.payload_json.tenders, [
      { method: 'efectivo', amountCentavos: '107000' },
      { method: 'QR', amountCentavos: '20000' },
    ]);
  });

  it('denies without finance scope and does not insert', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaReportedOperationalFactWriter(prisma);
    const denied = await writer.record({
      session: session({ grantedScopes: ['commercial.team.read'] }),
      fact: paymentFact(),
      createdAt,
    });
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'unauthorized');
    assert.equal(prisma.rows.length, 0);
    assert.equal(writer.createCallCount, 0);
  });

  it('denies foreign organization and does not insert', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaReportedOperationalFactWriter(prisma);
    const denied = await writer.record({
      session: session(),
      fact: paymentFact({ organizationId: FOREIGN }),
      createdAt,
    });
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'cross_tenant');
    assert.equal(prisma.rows.length, 0);
  });

  it('reverses in-org without confirming the ledger', async () => {
    const prisma = fakePrisma();
    const writer = createPrismaReportedOperationalFactWriter(prisma);
    const recorded = await writer.record({
      session: session(),
      fact: paymentFact(),
      createdAt,
    });
    assert.equal(recorded.ok, true);

    const reversed = await writer.reverse({
      session: session(),
      factId: 'rof-1',
      organizationId: SESSION,
      reason: 'Monto mal tipiado',
    });
    assert.equal(reversed.ok, true);
    assert.equal(reversed.ledgerConfirmed, false);
    assert.equal(reversed.confirmation, 'pending');
    assert.equal(prisma.rows[0]?.activity, 'reversed');
    assert.equal(prisma.rows[0]?.confirmation, 'pending');
    assert.equal(writer.updateCallCount, 1);
  });
});
