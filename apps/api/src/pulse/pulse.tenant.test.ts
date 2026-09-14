import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEMO_HEROES } from '@isalwa/contracts';
import { PulseController } from './pulse.controller';
import { PulseService } from './pulse.service';
import {
  PULSE_READ_SCOPE,
  readPulse,
  resolvePulseDb,
  type PulseHeroAccount,
  type PulseReadDb,
} from './pulse-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const HERO_OTHER_NAME = 'ZetaDonJulio';
const OTHER_SCORE = 90901;
const OTHER_PAYMENT = 880880n;
const OTHER_DEBT = 770770n;
const AS_OF = new Date('2026-09-14T15:00:00.000Z');
const MONTH_START = new Date(Date.UTC(2026, 8, 1));
const IN_MONTH = new Date('2026-09-02T12:00:00.000Z');
const OLD = new Date('2020-01-15T12:00:00.000Z');

type PaymentRow = { organizationId: string; amountCentavos: bigint; paidAt: Date };
type InvoiceRow = { organizationId: string; balanceCentavos: bigint };
type VisitRow = { organizationId: string; plannedAt: Date; status: string };
type ConversationRow = { organizationId: string; status: string; slaStatus: string | null };
type AttentionRow = {
  id: string;
  organizationId: string;
  status: string;
  kind: string;
  score: number;
  accountId: string | null;
  account: {
    id: string;
    organizationId: string;
    tradeName: string | null;
    legalName: string;
  } | null;
};

type Fixture = {
  payments: PaymentRow[];
  invoices: InvoiceRow[];
  visits: VisitRow[];
  conversations: ConversationRow[];
  attention: AttentionRow[];
  accounts: PulseHeroAccount[];
};

function formatBob(centavos: bigint | number): string {
  const n = typeof centavos === 'bigint' ? Number(centavos) : centavos;
  const whole = Math.trunc(n / 100);
  const frac = Math.abs(n % 100)
    .toString()
    .padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}

function attention(
  id: string,
  organizationId: string,
  name: string,
  kind: string,
  score: number,
  status = 'open',
): AttentionRow {
  const accountId = `acct-${id}`;
  return {
    id,
    organizationId,
    status,
    kind,
    score,
    accountId,
    account: {
      id: accountId,
      organizationId,
      tradeName: name,
      legalName: name,
    },
  };
}

function otherHeavy(): Fixture {
  return {
    payments: [{ organizationId: OTHER, amountCentavos: OTHER_PAYMENT, paidAt: IN_MONTH }],
    invoices: [{ organizationId: OTHER, balanceCentavos: OTHER_DEBT }],
    visits: [
      ...Array.from({ length: 8 }, () => ({
        organizationId: OTHER,
        plannedAt: IN_MONTH,
        status: 'completed',
      })),
      ...Array.from({ length: 2 }, () => ({
        organizationId: OTHER,
        plannedAt: IN_MONTH,
        status: 'planned',
      })),
    ],
    conversations: [
      ...Array.from({ length: 8 }, () => ({
        organizationId: OTHER,
        status: 'open',
        slaStatus: 'breached',
      })),
      ...Array.from({ length: 2 }, () => ({
        organizationId: OTHER,
        status: 'open',
        slaStatus: 'ok',
      })),
    ],
    attention: [attention('zeta-debt', OTHER, OTHER_NAME, 'collections', OTHER_SCORE)],
    accounts: [
      {
        id: 'acct-zeta-hero',
        organizationId: OTHER,
        code: DEMO_HEROES.donJulio,
        tradeName: HERO_OTHER_NAME,
        legalName: HERO_OTHER_NAME,
      },
    ],
  };
}

function sessionTenant(extra?: Partial<Fixture>): Fixture {
  return {
    payments: [
      { organizationId: SESSION, amountCentavos: 15000n, paidAt: IN_MONTH },
      { organizationId: SESSION, amountCentavos: 99999n, paidAt: OLD },
    ],
    invoices: [
      { organizationId: SESSION, balanceCentavos: 25000n },
      { organizationId: SESSION, balanceCentavos: 0n },
    ],
    visits: [
      { organizationId: SESSION, plannedAt: IN_MONTH, status: 'completed' },
      { organizationId: SESSION, plannedAt: IN_MONTH, status: 'completed' },
      { organizationId: SESSION, plannedAt: IN_MONTH, status: 'completed' },
      { organizationId: SESSION, plannedAt: IN_MONTH, status: 'planned' },
    ],
    conversations: [
      { organizationId: SESSION, status: 'open', slaStatus: 'ok' },
      { organizationId: SESSION, status: 'open', slaStatus: 'ok' },
      { organizationId: SESSION, status: 'open', slaStatus: 'ok' },
      { organizationId: SESSION, status: 'open', slaStatus: 'breached' },
    ],
    attention: [attention('alpha-debt', SESSION, SESSION_NAME, 'collections', 40)],
    accounts: [],
    ...extra,
  };
}

function merge(left: Fixture, right: Fixture): Fixture {
  return {
    payments: [...left.payments, ...right.payments],
    invoices: [...left.invoices, ...right.invoices],
    visits: [...left.visits, ...right.visits],
    conversations: [...left.conversations, ...right.conversations],
    attention: [...left.attention, ...right.attention],
    accounts: [...left.accounts, ...right.accounts],
  };
}

function inOrg<T extends { organizationId: string }>(rows: T[], organizationId: string | undefined): T[] {
  if (!organizationId) return rows;
  return rows.filter((row) => row.organizationId === organizationId);
}

function fixture(data: Fixture) {
  const paymentCalls: Array<{ where: { organizationId?: string; paidAt?: { gte?: Date } } }> = [];
  const invoiceCalls: Array<{ where: { organizationId?: string; balanceCentavos?: { gt?: number } } }> = [];
  const visitCalls: Array<{ where: { organizationId?: string; plannedAt?: { gte?: Date }; status?: string } }> = [];
  const conversationCalls: Array<{ where: { organizationId?: string; status?: string; slaStatus?: string } }> = [];
  const attentionCalls: Array<{ where: { organizationId?: string; status?: string }; take?: number }> = [];
  const heroCalls: Array<{ where: { organizationId?: string; code?: string } }> = [];

  const db: PulseReadDb = {
    payment: {
      async aggregate(args) {
        paymentCalls.push(args);
        const rows = inOrg(data.payments, args.where.organizationId).filter(
          (row) => !args.where.paidAt?.gte || row.paidAt >= args.where.paidAt.gte,
        );
        const sum = rows.reduce((total, row) => total + row.amountCentavos, 0n);
        return { _sum: { amountCentavos: rows.length === 0 ? null : sum } };
      },
    },
    invoice: {
      async aggregate(args) {
        invoiceCalls.push(args);
        const floor =
          args.where.balanceCentavos?.gt === undefined ? null : BigInt(args.where.balanceCentavos.gt);
        const rows = inOrg(data.invoices, args.where.organizationId).filter(
          (row) => floor === null || row.balanceCentavos > floor,
        );
        const sum = rows.reduce((total, row) => total + row.balanceCentavos, 0n);
        return { _sum: { balanceCentavos: rows.length === 0 ? null : sum } };
      },
    },
    visit: {
      async count(args) {
        visitCalls.push(args);
        return inOrg(data.visits, args.where.organizationId).filter((row) => {
          if (args.where.plannedAt?.gte && row.plannedAt < args.where.plannedAt.gte) return false;
          if (args.where.status && row.status !== args.where.status) return false;
          return true;
        }).length;
      },
    },
    conversation: {
      async count(args) {
        conversationCalls.push(args);
        return inOrg(data.conversations, args.where.organizationId).filter((row) => {
          if (args.where.status && row.status !== args.where.status) return false;
          if (args.where.slaStatus && row.slaStatus !== args.where.slaStatus) return false;
          return true;
        }).length;
      },
    },
    attentionItem: {
      async findMany(args) {
        attentionCalls.push(args);
        const matched = inOrg(data.attention, args.where.organizationId).filter(
          (row) => !args.where.status || row.status === args.where.status,
        );
        matched.sort((left, right) => right.score - left.score);
        return matched.slice(0, args.take);
      },
    },
    account: {
      async findFirst(args) {
        heroCalls.push(args);
        const pool = args.where.organizationId
          ? data.accounts.filter((row) => row.organizationId === args.where.organizationId)
          : data.accounts;
        return pool.find((row) => row.code === args.where.code) ?? null;
      },
    },
  };

  return { db, paymentCalls, invoiceCalls, visitCalls, conversationCalls, attentionCalls, heroCalls };
}

function session(scopes: readonly string[]) {
  return {
    authenticated: true as const,
    organizationId: SESSION,
    grantedScopes: scopes,
  };
}

function assertNoForeign(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const marker of [OTHER, OTHER_NAME, HERO_OTHER_NAME, 'acct-zeta', 'zeta-debt', String(OTHER_SCORE)]) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.equal(serialized.includes(formatBob(OTHER_PAYMENT)), false);
  assert.equal(serialized.includes(formatBob(OTHER_DEBT)), false);
}

function assertScopedWheres(recorded: ReturnType<typeof fixture>): void {
  assert.equal(recorded.paymentCalls.length, 1);
  assert.deepEqual(Object.keys(recorded.paymentCalls[0] ?? {}), ['where', '_sum']);
  assert.deepEqual(Object.keys(recorded.paymentCalls[0]?.where ?? {}), ['organizationId', 'paidAt']);
  assert.equal(recorded.paymentCalls[0]?.where.organizationId, SESSION);
  assert.equal(recorded.paymentCalls[0]?.where.paidAt?.gte?.toISOString(), MONTH_START.toISOString());

  assert.deepEqual(Object.keys(recorded.invoiceCalls[0]?.where ?? {}), ['organizationId', 'balanceCentavos']);
  assert.equal(recorded.invoiceCalls[0]?.where.organizationId, SESSION);
  assert.equal(recorded.invoiceCalls[0]?.where.balanceCentavos?.gt, 0);

  assert.equal(recorded.visitCalls.length, 2);
  assert.equal(recorded.visitCalls[0]?.where.organizationId, SESSION);
  assert.equal(recorded.visitCalls[1]?.where.organizationId, SESSION);
  assert.equal(recorded.visitCalls[1]?.where.status, 'completed');

  assert.equal(recorded.conversationCalls.length, 2);
  assert.deepEqual(recorded.conversationCalls[0]?.where, { organizationId: SESSION, status: 'open' });
  assert.deepEqual(recorded.conversationCalls[1]?.where, { organizationId: SESSION, slaStatus: 'breached' });

  assert.deepEqual(Object.keys(recorded.attentionCalls[0] ?? {}), ['where', 'orderBy', 'take', 'include']);
  assert.deepEqual(recorded.attentionCalls[0]?.where, { organizationId: SESSION, status: 'open' });
  assert.equal(recorded.attentionCalls[0]?.take, 5);

  assert.deepEqual(recorded.heroCalls[0]?.where, {
    organizationId: SESSION,
    code: DEMO_HEROES.donJulio,
  });
  assert.notEqual(recorded.heroCalls[0]?.where.organizationId, OTHER);
}

describe('pulse aggregate tenant scope', () => {
  it('uses the management command-center scope and not team read', () => {
    assert.equal(PULSE_READ_SCOPE, 'management.org.read');
    assert.notEqual(PULSE_READ_SCOPE, 'commercial.team.read');
    assert.notEqual(PULSE_READ_SCOPE, 'people.admin');
  });

  it('same-tenant aggregates are allowed and every where includes the session organization', async () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const data = merge(sessionTenant(), otherHeavy());
    data.payments = data.payments.map((row) =>
      row.paidAt.getTime() === OLD.getTime() ? row : { ...row, paidAt: now },
    );
    data.visits = data.visits.map((row) => ({ ...row, plannedAt: now }));
    const recorded = fixture(data);
    const controller = new PulseController(new PulseService());
    const result = await controller.getPulse({
      authenticatedSession: session([PULSE_READ_SCOPE]),
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
      readDb: recorded.db,
    });
    assert.equal(result.code, null);
    assert.equal(recorded.paymentCalls[0]?.where.organizationId, SESSION);
    assert.equal(recorded.paymentCalls[0]?.where.paidAt?.gte?.toISOString(), monthStart.toISOString());
    assert.notEqual(recorded.paymentCalls[0]?.where.organizationId, OTHER);
    assert.equal(recorded.invoiceCalls[0]?.where.organizationId, SESSION);
    assert.equal(recorded.visitCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(recorded.conversationCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(recorded.attentionCalls[0]?.where.organizationId, SESSION);
    assert.equal(recorded.heroCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.vitals.find((vital) => vital.key === 'inflow')?.valueLabel, formatBob(15000));
    assert.equal(result.vitals.find((vital) => vital.key === 'risk')?.valueLabel, formatBob(25000));
    assert.equal(result.vitals.find((vital) => vital.key === 'field')?.valueLabel, '75%');
    assert.equal(result.vitals.find((vital) => vital.key === 'field')?.hint, '3/4 visitas del mes');
    assert.equal(result.vitals.find((vital) => vital.key === 'signal')?.valueLabel, '75%');
    assert.equal(result.sentence.includes(SESSION_NAME), true);
    assert.equal(result.focus.some((item) => item.title === SESSION_NAME && item.href === '/personas/acct-alpha-debt'), true);
    assert.equal(result.focus.every((item) => item.score !== OTHER_SCORE), true);
    assertNoForeign(result);
  });

  it('commercial.team.read does not unlock company totals and prisma is not called', async () => {
    const recorded = fixture(merge(sessionTenant(), otherHeavy()));
    const controller = new PulseController(new PulseService());
    const result = await controller.getPulse({
      authenticatedSession: session(['commercial.team.read']),
      query: { organizationId: OTHER },
      readDb: recorded.db,
    });
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(recorded.paymentCalls.length, 0);
    assert.equal(recorded.invoiceCalls.length, 0);
    assert.equal(recorded.visitCalls.length, 0);
    assert.equal(recorded.conversationCalls.length, 0);
    assert.equal(recorded.attentionCalls.length, 0);
    assert.equal(recorded.heroCalls.length, 0);
    assert.deepEqual(result.vitals, []);
    assert.deepEqual(result.focus, []);
    assert.equal(result.sentence, '');
    assertNoForeign(result);
  });

  it('people.admin denies and does not query', async () => {
    const recorded = fixture(otherHeavy());
    const result = await readPulse({
      session: { organizationId: SESSION, grantedScopes: ['people.admin'] },
      db: recorded.db,
      asOf: AS_OF,
    });
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(recorded.paymentCalls.length, 0);
    assert.equal(recorded.heroCalls.length, 0);
    assert.deepEqual(result.vitals, []);
    assertNoForeign(result);
  });

  it('missing session is denied and does not load prisma or aggregate', async () => {
    const recorded = fixture(otherHeavy());
    let loads = 0;
    const resolved = resolvePulseDb(
      { query: { organizationId: OTHER }, body: { organizationId: OTHER } },
      false,
      () => {
        loads += 1;
        return recorded.db;
      },
    );
    assert.equal(loads, 0);
    assert.equal(resolved, null);

    const controller = new PulseController(new PulseService());
    const result = await controller.getPulse({
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
      readDb: recorded.db,
    });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(recorded.paymentCalls.length, 0);
    assert.equal(recorded.invoiceCalls.length, 0);
    assert.equal(recorded.visitCalls.length, 0);
    assert.equal(recorded.conversationCalls.length, 0);
    assert.equal(recorded.attentionCalls.length, 0);
    assert.equal(recorded.heroCalls.length, 0);
    assert.deepEqual(result.vitals, []);
    assert.deepEqual(result.focus, []);
    assertNoForeign(result);
  });

  it('an unauthenticated session object is denied and does not query', async () => {
    const recorded = fixture(otherHeavy());
    const controller = new PulseController(new PulseService());
    const result = await controller.getPulse({
      authenticatedSession: {
        authenticated: false,
        organizationId: SESSION,
        grantedScopes: [PULSE_READ_SCOPE],
      },
      readDb: recorded.db,
    });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(recorded.paymentCalls.length, 0);
    assertNoForeign(result);
  });

  it('zero rows in the session tenant return zero vitals, not the other tenant sums', async () => {
    const recorded = fixture(otherHeavy());
    const result = await readPulse({
      session: { organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] },
      db: recorded.db,
      asOf: AS_OF,
    });
    assert.equal(result.code, null);
    assertScopedWheres(recorded);
    assert.equal(result.vitals.find((vital) => vital.key === 'inflow')?.valueLabel, formatBob(0));
    assert.equal(result.vitals.find((vital) => vital.key === 'risk')?.valueLabel, formatBob(0));
    assert.equal(result.vitals.find((vital) => vital.key === 'field')?.valueLabel, '0%');
    assert.equal(result.vitals.find((vital) => vital.key === 'field')?.hint, '0/0 visitas del mes');
    assert.notEqual(result.vitals.find((vital) => vital.key === 'field')?.valueLabel, '80%');
    assert.notEqual(result.vitals.find((vital) => vital.key === 'signal')?.valueLabel, '20%');
    assert.equal(result.focus.length, 0);
    assert.equal(result.sentence.includes(OTHER_NAME), false);
    assert.equal(result.sentence.includes(HERO_OTHER_NAME), false);
    assertNoForeign(result);
  });

  it('a hero code that exists only in the other tenant is omitted', async () => {
    const recorded = fixture(merge(sessionTenant(), otherHeavy()));
    const result = await readPulse({
      session: { organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] },
      db: recorded.db,
      asOf: AS_OF,
    });
    assert.equal(recorded.heroCalls[0]?.where.organizationId, SESSION);
    assert.equal(recorded.heroCalls[0]?.where.code, DEMO_HEROES.donJulio);
    assert.equal(Object.keys(recorded.heroCalls[0]?.where ?? {})[0], 'organizationId');
    assert.equal(result.focus.some((item) => item.title === HERO_OTHER_NAME), false);
    assert.equal(result.focus.some((item) => item.href.includes('acct-zeta-hero')), false);
    assert.equal(result.focus.some((item) => item.id === 'hero-acct-zeta-hero'), false);
    assert.equal(result.focus.some((item) => item.score === 95), false);
    assertNoForeign(result);
  });

  it('a hero in the session tenant is included and a foreign hero with the same code is not', async () => {
    const data = merge(sessionTenant(), otherHeavy());
    data.accounts.push({
      id: 'acct-alpha-hero',
      organizationId: SESSION,
      code: DEMO_HEROES.donJulio,
      tradeName: SESSION_NAME,
      legalName: SESSION_NAME,
    });
    const recorded = fixture(data);
    const result = await readPulse({
      session: { organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] },
      db: recorded.db,
      asOf: AS_OF,
    });
    assert.equal(recorded.heroCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.focus.some((item) => item.id === 'hero-acct-alpha-hero'), true);
    assert.equal(result.focus.some((item) => item.href === '/personas/acct-alpha-hero'), true);
    assert.equal(result.focus.some((item) => item.id === 'hero-acct-zeta-hero'), false);
    assertNoForeign(result);
  });

  it('foreign collection names do not enter the sentence when the session tenant has no open attention', async () => {
    const data = otherHeavy();
    data.attention = [attention('zeta-debt', OTHER, OTHER_NAME, 'collections', OTHER_SCORE)];
    const recorded = fixture(data);
    const result = await readPulse({
      session: { organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] },
      db: recorded.db,
      asOf: AS_OF,
    });
    assert.equal(result.sentence, 'Hoy el negocio está estable — con señales claras de seguimiento.');
    assert.equal(result.focus.length, 0);
    assertNoForeign(result);
  });
});
