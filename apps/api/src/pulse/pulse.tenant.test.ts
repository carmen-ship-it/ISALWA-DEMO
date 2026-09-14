import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEMO_HEROES } from '@isalwa/contracts';
import { PulseController } from './pulse.controller';
import { PULSE_READ_SCOPE, PulseService, type PulseReadDb } from './pulse.service';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COLLECTED = 700;
const SESSION_COLLECTED = 100;
const WRONG_ROLE = 'commercial.team.read';

type Payment = { organizationId: string; amountCentavos: bigint; paidAt: Date };
type Invoice = { organizationId: string; balanceCentavos: bigint };
type Visit = { organizationId: string; plannedAt: Date; status: string };
type Conversation = { organizationId: string; status: string; slaStatus: string };
type Attention = {
  id: string;
  organizationId: string;
  kind: string;
  score: number;
  accountId: string;
  account: { id: string; organizationId: string; tradeName: string; legalName: string };
};
type Account = { id: string; organizationId: string; code: string; tradeName: string; legalName: string };

function fixture(extra?: { attentions?: Attention[] }) {
  const now = new Date();
  const payments: Payment[] = [
    { organizationId: SESSION, amountCentavos: BigInt(SESSION_COLLECTED), paidAt: now },
    { organizationId: OTHER, amountCentavos: BigInt(OTHER_COLLECTED), paidAt: now },
  ];
  const invoices: Invoice[] = [
    { organizationId: SESSION, balanceCentavos: 100n },
    { organizationId: OTHER, balanceCentavos: 700n },
  ];
  const visits: Visit[] = [
    { organizationId: SESSION, plannedAt: now, status: 'completed' },
    { organizationId: SESSION, plannedAt: now, status: 'planned' },
    ...Array.from({ length: 9 }, () => ({ organizationId: OTHER, plannedAt: now, status: 'completed' })),
  ];
  const conversations: Conversation[] = [
    { organizationId: SESSION, status: 'open', slaStatus: 'ok' },
    ...Array.from({ length: 8 }, () => ({ organizationId: OTHER, status: 'open', slaStatus: 'breached' })),
  ];
  const attentions = extra?.attentions ?? [
    {
      id: 'att-alpha',
      organizationId: SESSION,
      kind: 'visit_gap',
      score: 10,
      accountId: 'acct-alpha',
      account: { id: 'acct-alpha', organizationId: SESSION, tradeName: SESSION_NAME, legalName: SESSION_NAME },
    },
    {
      id: 'att-zeta',
      organizationId: OTHER,
      kind: 'collections',
      score: 99,
      accountId: 'acct-zeta',
      account: { id: 'acct-zeta', organizationId: OTHER, tradeName: OTHER_NAME, legalName: OTHER_NAME },
    },
  ];
  const accounts: Account[] = [
    { id: 'hero-alpha', organizationId: SESSION, code: DEMO_HEROES.donJulio, tradeName: SESSION_NAME, legalName: SESSION_NAME },
    { id: 'hero-zeta', organizationId: OTHER, code: DEMO_HEROES.donJulio, tradeName: OTHER_NAME, legalName: OTHER_NAME },
  ];
  const calls: Array<{ model: string; where: { organizationId?: string }; take?: number }> = [];
  const db = {
    payment: {
      async aggregate(args: { where: { organizationId?: string } }) {
        calls.push({ model: 'payment', where: args.where });
        const sum = payments
          .filter((row) => row.organizationId === args.where.organizationId)
          .reduce((total, row) => total + row.amountCentavos, 0n);
        return { _sum: { amountCentavos: args.where.organizationId ? sum : 0n } };
      },
    },
    invoice: {
      async aggregate(args: { where: { organizationId?: string } }) {
        calls.push({ model: 'invoice', where: args.where });
        const sum = invoices
          .filter((row) => row.organizationId === args.where.organizationId)
          .reduce((total, row) => total + row.balanceCentavos, 0n);
        return { _sum: { balanceCentavos: args.where.organizationId ? sum : 0n } };
      },
    },
    visit: {
      async count(args: { where: { organizationId?: string; status?: string } }) {
        calls.push({ model: 'visit', where: args.where });
        return visits.filter((row) => {
          if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
          if (args.where.status && row.status !== args.where.status) return false;
          return true;
        }).length;
      },
    },
    conversation: {
      async count(args: { where: { organizationId?: string; status?: string; slaStatus?: string } }) {
        calls.push({ model: 'conversation', where: args.where });
        return conversations.filter((row) => {
          if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
          if (args.where.status && row.status !== args.where.status) return false;
          if (args.where.slaStatus && row.slaStatus !== args.where.slaStatus) return false;
          return true;
        }).length;
      },
    },
    attentionItem: {
      async findMany(args: { where: { organizationId?: string }; take: number }) {
        calls.push({ model: 'attention', where: args.where, take: args.take });
        return attentions
          .filter((row) => args.where.organizationId && row.organizationId === args.where.organizationId)
          .slice(0, args.take);
      },
    },
    account: {
      async findFirst(args: { where: { organizationId?: string; code?: string } }) {
        calls.push({ model: 'account', where: args.where });
        return (
          accounts.find(
            (row) => row.organizationId === args.where.organizationId && row.code === args.where.code,
          ) ?? null
        );
      },
    },
  } as PulseReadDb;
  return { db, calls };
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes(String(OTHER_COLLECTED)), false);
}

describe('PulseService.getPulse tenant scope', () => {
  it('PulseService.getPulse same-tenant aggregates are allowed', async () => {
    const { db, calls } = fixture();
    const result = await new PulseService().getPulse({ organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] }, db);
    assert.equal(result.code, null);
    assert.equal(calls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(result.aggregates.collectedCentavos, SESSION_COLLECTED);
    assert.equal(result.focus.some((item) => item.title === SESSION_NAME) || result.sentence.includes(SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('PulseService.getPulse same-tenant wrong role is denied', async () => {
    const { db, calls } = fixture();
    const result = await new PulseService().getPulse({ organizationId: SESSION, grantedScopes: [WRONG_ROLE] }, db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assert.equal(result.aggregates.collectedCentavos, 0);
    assert.deepEqual(result.focus, []);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('PulseService.getPulse cross-tenant prefix and id are excluded from aggregates', async () => {
    const { db, calls } = fixture();
    const result = await new PulseService().getPulse({ organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] }, db);
    assert.equal(calls.every((call) => call.where.organizationId !== OTHER), true);
    assert.equal(result.focus.some((item) => item.id.startsWith('att-ze') || item.href.includes('zeta')), false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('PulseService.getPulse missing session is denied', async () => {
    const { db, calls } = fixture();
    const result = await new PulseService().getPulse(null, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('PulseService.getPulse attention pagination stays inside the session tenant', async () => {
    const attentions = [
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `att-alpha-${index}`,
        organizationId: SESSION,
        kind: 'visit_gap',
        score: index,
        accountId: `acct-alpha-${index}`,
        account: {
          id: `acct-alpha-${index}`,
          organizationId: SESSION,
          tradeName: SESSION_NAME,
          legalName: SESSION_NAME,
        },
      })),
      {
        id: 'att-zeta',
        organizationId: OTHER,
        kind: 'collections',
        score: 100,
        accountId: 'acct-zeta',
        account: { id: 'acct-zeta', organizationId: OTHER, tradeName: OTHER_NAME, legalName: OTHER_NAME },
      },
    ];
    const { db, calls } = fixture({ attentions });
    const result = await new PulseService().getPulse({ organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] }, db);
    const attentionCall = calls.find((call) => call.model === 'attention');
    assert.equal(attentionCall?.take, 5);
    assert.equal(attentionCall?.where.organizationId, SESSION);
    assert.equal(result.aggregates.attentionCount, 5);
    assert.equal(result.focus.length <= 3, true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('PulseService.getPulse count and aggregates exclude the other tenant', async () => {
    const { db } = fixture();
    const result = await new PulseService().getPulse({ organizationId: SESSION, grantedScopes: [PULSE_READ_SCOPE] }, db);
    assert.equal(result.aggregates.collectedCentavos, SESSION_COLLECTED);
    assert.notEqual(result.aggregates.collectedCentavos, SESSION_COLLECTED + OTHER_COLLECTED);
    assert.equal(result.aggregates.debtCentavos, 100);
    assert.equal(result.aggregates.visitsMonth, 2);
    assert.equal(result.aggregates.visitsDone, 1);
    assert.equal(result.aggregates.conversationsOpen, 1);
    assert.equal(result.aggregates.conversationsBreached, 0);
    assert.notEqual(result.aggregates.conversationsBreached, 8);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});

describe('PulseController session boundary', () => {
  it('PulseController.getPulse ignores caller organizationId and fails closed without a trusted session', async () => {
    const { db, calls } = fixture();
    const controller = new PulseController(new PulseService());
    const missing = await controller.getPulse({
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(missing.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
  });
});
