import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const SCOPE = 'commercial.team.read';
const ALPHA_ID = 'acct-alpha-1';
const ALPHA_TWO = 'acct-alpha-2';
const ZETA_ID = 'acct-zeta-9';
const MISSING_ID = 'acct-missing-0';

const FOREIGN_TOKENS = [
  OTHER,
  ZETA_ID,
  'ZETA-9',
  'ZetaOtherPrefix',
  'Zeta Trade',
  '999ZETA999',
  '12.345671',
  '-54.321009',
  'Zeta Contact Person',
  'Q-ZETA-77',
  'INV-ZETA-88',
  'Zeta Price Sku',
  'zeta-conversation-id',
  'ZetaOtherEvent',
];

import { AccountsController } from './accounts.controller.ts';
import { AccountsService } from './accounts.service.ts';

type TimelineCall = {
  id: string;
  opts: { take?: number; session?: { organizationId?: string; grantedScopes?: readonly string[] } | null };
};

const timelineCalls: TimelineCall[] = [];

function ensureDomainStub() {
  const dir = join(process.cwd(), 'node_modules/@isalwa/domain');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: '@isalwa/domain', type: 'module', exports: { '.': './index.js' } }),
  );
  writeFileSync(
    join(dir, 'index.js'),
    "export function normalizeEventType(type) { return type; }\nexport function eventFamily() { return 'fixture-family'; }\n",
  );
}

async function timelineReader() {
  ensureDomainStub();
  const timeline = await import('../../../../packages/database/src/timeline/read.ts');
  return (
    db: unknown,
    id: string,
    opts: TimelineCall['opts'],
  ) => {
    timelineCalls.push({ id, opts });
    return timeline.listAccountTimeline(db as never, id, opts);
  };
}

type AccountRow = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  nit: string | null;
  segment: string;
  personaKey: string | null;
  creditStatus: string;
  relationshipScore: number;
  accountType: string;
  creditLimitCentavos: bigint;
  relationshipScoreComponents: null;
  aiSummary: null;
  aiSummaryEvidenceJson: null;
  favoriteProductsJson: null;
  predictedNextOrderStart: null;
  predictedNextOrderEnd: null;
  predictionConfidence: null;
  lastVisitAt: null;
  lastPurchaseAt: null;
  lastWhatsappAt: null;
  owner: { name: string };
  territory: { code: string };
  contacts: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; label: string; lat: number; lng: number; isPrimary: boolean }>;
  creditTerms: { netDays: number } | null;
  quotes: Array<{ id: string; number: string; status: string; totalCentavos: bigint; createdAt: Date }>;
  orders: Array<{ id: string; number: string; status: string; totalCentavos: bigint; orderedAt: Date }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    totalCentavos: bigint;
    balanceCentavos: bigint;
    dueAt: Date | null;
  }>;
  visits: unknown[];
  conversations: Array<{ id: string }>;
  priceObservations: Array<{ product: { name: string; sku: string } }>;
};

type EventRow = {
  id: string;
  organizationId: string;
  accountId: string;
  type: string;
  title: string;
  body: null;
  payloadJson: null;
  occurredAt: Date;
  actorUserId: null;
};

type RecordedCall = {
  model: 'account' | 'activityEvent';
  method: string;
  args: {
    where?: {
      organizationId?: string;
      id?: string;
      accountId?: string;
      AND?: Array<Record<string, unknown>>;
    };
    take?: number;
    orderBy?: unknown;
    include?: Record<string, unknown> | true;
    select?: unknown;
  };
};

function account(partial: Pick<AccountRow, 'id' | 'organizationId' | 'code' | 'legalName' | 'segment' | 'relationshipScore'> & Partial<AccountRow>): AccountRow {
  return {
    tradeName: null,
    nit: null,
    personaKey: null,
    creditStatus: 'ok',
    accountType: 'otro',
    creditLimitCentavos: 0n,
    relationshipScoreComponents: null,
    aiSummary: null,
    aiSummaryEvidenceJson: null,
    favoriteProductsJson: null,
    predictedNextOrderStart: null,
    predictedNextOrderEnd: null,
    predictionConfidence: null,
    lastVisitAt: null,
    lastPurchaseAt: null,
    lastWhatsappAt: null,
    owner: { name: 'Alpha Owner' },
    territory: { code: 'ALP' },
    contacts: [],
    locations: [],
    creditTerms: null,
    quotes: [],
    orders: [],
    invoices: [],
    visits: [],
    conversations: [],
    priceObservations: [],
    ...partial,
  };
}

function fixture() {
  timelineCalls.length = 0;
  const accounts: AccountRow[] = [
    account({
      id: ALPHA_ID,
      organizationId: SESSION,
      code: 'ALFA-1',
      legalName: 'Alpha Session Fixture',
      tradeName: 'Alpha Trade',
      nit: '111ALPHA111',
      segment: 'A',
      personaKey: 'persona-alpha-fixture',
      relationshipScore: 80,
      contacts: [{ id: 'contact-alpha', name: 'Alpha Contact Person' }],
      locations: [{ id: 'loc-alpha', label: 'Alpha HQ', lat: 1.010101, lng: -2.020202, isPrimary: true }],
    }),
    account({
      id: ALPHA_TWO,
      organizationId: SESSION,
      code: 'ALFA-2',
      legalName: 'Alpha Second Fixture',
      segment: 'B',
      personaKey: 'persona-alpha-other',
      relationshipScore: 10,
    }),
    account({
      id: ZETA_ID,
      organizationId: OTHER,
      code: 'ZETA-9',
      legalName: 'ZetaOtherPrefix Fixture',
      tradeName: 'Zeta Trade',
      nit: '999ZETA999',
      segment: 'A',
      personaKey: 'persona-zeta-fixture',
      relationshipScore: 99,
      owner: { name: 'Zeta Owner' },
      territory: { code: 'ZET' },
      contacts: [{ id: 'contact-zeta', name: 'Zeta Contact Person' }],
      locations: [{ id: 'loc-zeta', label: 'Zeta HQ', lat: 12.345671, lng: -54.321009, isPrimary: true }],
      quotes: [{ id: 'quote-zeta', number: 'Q-ZETA-77', status: 'open', totalCentavos: 100n, createdAt: new Date('2026-01-01') }],
      invoices: [{
        id: 'inv-zeta',
        number: 'INV-ZETA-88',
        status: 'open',
        totalCentavos: 200n,
        balanceCentavos: 200n,
        dueAt: null,
      }],
      conversations: [{ id: 'zeta-conversation-id' }],
      priceObservations: [{ product: { name: 'Zeta Price Sku', sku: 'ZETA-SKU' } }],
    }),
  ];
  const events: EventRow[] = [
    {
      id: 'evt-alpha',
      organizationId: SESSION,
      accountId: ALPHA_ID,
      type: 'quote.created',
      title: 'AlphaSessionEvent',
      body: null,
      payloadJson: null,
      occurredAt: new Date('2026-02-01T00:00:00.000Z'),
      actorUserId: null,
    },
    {
      id: 'evt-zeta',
      organizationId: OTHER,
      accountId: ZETA_ID,
      type: 'quote.created',
      title: 'ZetaOtherEvent',
      body: null,
      payloadJson: null,
      occurredAt: new Date('2026-02-02T00:00:00.000Z'),
      actorUserId: null,
    },
  ];
  const calls: RecordedCall[] = [];

  function scoped(where: { organizationId?: string } | undefined, rowOrg: string) {
    return Boolean(where?.organizationId) && where.organizationId === rowOrg;
  }

  const db = {
    account: {
      async findMany(args: RecordedCall['args'] & { where: { organizationId?: string; AND?: Array<Record<string, unknown>> }; take?: number }) {
        calls.push({ model: 'account', method: 'findMany', args });
        const matched = accounts.filter((row) => {
          if (!args.where?.organizationId) return true;
          if (!scoped(args.where, row.organizationId)) return false;
          return (args.where.AND ?? []).every((clause) => matchesClause(row, clause));
        });
        matched.sort((left, right) => {
          if (left.segment !== right.segment) return left.segment < right.segment ? -1 : 1;
          return right.relationshipScore - left.relationshipScore;
        });
        return matched.slice(0, args.take ?? matched.length);
      },
      async findFirst(args: RecordedCall['args'] & { where: { id?: string; organizationId?: string } }) {
        calls.push({ model: 'account', method: 'findFirst', args });
        const row = accounts.find((candidate) => {
          if (args.where?.id && candidate.id !== args.where.id) return false;
          if (!args.where?.organizationId) return true;
          return candidate.organizationId === args.where.organizationId;
        });
        if (!row) return null;
        if (args.select && !args.include) return { id: row.id };
        return row;
      },
      async findUnique(args: RecordedCall['args']) {
        calls.push({ model: 'account', method: 'findUnique', args });
        return accounts.find((row) => row.id === args.where?.id) ?? null;
      },
    },
    activityEvent: {
      async findMany(args: RecordedCall['args'] & { where: { accountId?: string; organizationId?: string }; take?: number }) {
        calls.push({ model: 'activityEvent', method: 'findMany', args });
        return events.filter((row) => {
          if (!args.where?.organizationId) return row.accountId === args.where?.accountId;
          if (row.organizationId !== args.where.organizationId) return false;
          if (args.where.accountId && row.accountId !== args.where.accountId) return false;
          return true;
        }).slice(0, args.take ?? events.length);
      },
    },
    calls,
  };
  return db;
}

function matchesClause(row: AccountRow, clause: Record<string, unknown>) {
  if (Object.keys(clause).length === 0) return true;
  if (typeof clause.segment === 'string' && row.segment !== clause.segment) return false;
  if (typeof clause.personaKey === 'string' && row.personaKey !== clause.personaKey) return false;
  const alternatives = clause.OR;
  if (Array.isArray(alternatives)) {
    return alternatives.some((part) => {
      const entry = part as Record<string, { contains?: string }>;
      if (entry.legalName?.contains) return row.legalName.toLowerCase().includes(entry.legalName.contains.toLowerCase());
      if (entry.tradeName?.contains) return (row.tradeName ?? '').toLowerCase().includes(entry.tradeName.contains.toLowerCase());
      if (entry.code?.contains) return row.code.toLowerCase().includes(entry.code.contains.toLowerCase());
      return false;
    });
  }
  return true;
}

function alphaSession(scopes: readonly string[] = [SCOPE]) {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function assertNoForeignLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const token of FOREIGN_TOKENS) {
    assert.equal(serialized.includes(token), false, `leaked ${token}`);
  }
}

function assertTenantPredicate(calls: RecordedCall[]) {
  assert.ok(calls.length > 0);
  for (const call of calls) {
    assert.equal(call.args.where?.organizationId, SESSION);
    assert.notEqual(call.method, 'findUnique');
  }
}

async function notFoundPayload(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof NotFoundException);
    return {
      name: error.name,
      message: error.message,
      status: error.getStatus(),
      response: error.getResponse(),
    };
  }
  throw new Error('expected NotFoundException');
}

describe('accounts tenant scope', () => {
  it('same tenant with commercial.team.read returns that tenant rows only', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.list(alphaSession(), {}, db as never);
    assert.equal(result.code, null);
    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item) => item.id), [ALPHA_ID, ALPHA_TWO]);
    assert.equal(result.items[0]?.name, 'Alpha Trade');
    assert.equal(result.items[0]?.lat, 1.010101);
    assert.equal(result.items[0]?.lng, -2.020202);
    assertTenantPredicate(db.calls);
    assertNoForeignLeak(result);
  });

  it('same tenant dossier loads related rows only after id and organizationId match', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.dossier(alphaSession(), ALPHA_ID, db as never);
    assert.ok(result && 'name' in result);
    assert.equal(result.name, 'Alpha Trade');
    assert.equal(result.nit, '111ALPHA111');
    assert.equal(result.locations[0]?.lat, 1.010101);
    assert.equal(result.contacts[0]?.name, 'Alpha Contact Person');
    assert.equal(db.calls.length, 2);
    assert.equal(db.calls[0]?.method, 'findFirst');
    assert.equal(db.calls[0]?.args.include, undefined);
    assert.deepEqual(db.calls[0]?.args.where, { id: ALPHA_ID, organizationId: SESSION });
    assert.equal(db.calls[1]?.method, 'findFirst');
    assert.equal(db.calls[1]?.args.where?.organizationId, SESSION);
    assert.equal(db.calls[1]?.args.where?.id, ALPHA_ID);
    assert.equal(typeof db.calls[1]?.args.include, 'object');
    const include = db.calls[1]?.args.include as Record<string, unknown>;
    for (const key of ['contacts', 'locations', 'quotes', 'orders', 'invoices', 'visits', 'conversations', 'priceObservations']) {
      assert.ok(include[key], key);
    }
    assertNoForeignLeak(result);
  });

  it('same tenant timeline passes session and keeps organizationId on the query', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.timeline(alphaSession(), ALPHA_ID, db as never, await timelineReader());
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(result.items[0]?.title, 'AlphaSessionEvent');
    assert.equal(timelineCalls.length, 1);
    assert.equal(timelineCalls[0]?.id, ALPHA_ID);
    assert.equal(timelineCalls[0]?.opts.take, 40);
    assert.deepEqual(timelineCalls[0]?.opts.session, {
      organizationId: SESSION,
      grantedScopes: [SCOPE],
    });
    assert.equal(db.calls[0]?.model, 'account');
    assert.deepEqual(db.calls[0]?.args.where, { id: ALPHA_ID, organizationId: SESSION });
    assert.equal(db.calls[1]?.model, 'activityEvent');
    assert.equal(db.calls[1]?.args.where?.organizationId, SESSION);
    assert.equal(db.calls[1]?.args.where?.accountId, ALPHA_ID);
    assertNoForeignLeak(result);
  });

  it('same tenant with the wrong scope is ROLE_FORBIDDEN and does not query', async () => {
    const db = fixture();
    const service = new AccountsService();
    const session = alphaSession(['people.admin']);
    const listed = await service.list(session, { q: 'ZetaOther' }, db as never);
    const dossier = await service.dossier(session, ZETA_ID, db as never);
    const timelineResult = await service.timeline(session, ZETA_ID, db as never, await timelineReader());
    assert.equal(listed.code, 'ROLE_FORBIDDEN');
    assert.equal(dossier.code, 'ROLE_FORBIDDEN');
    assert.equal(timelineResult.code, 'ROLE_FORBIDDEN');
    assert.equal(listed.count, 0);
    assert.deepEqual(listed.items, []);
    assert.equal(db.calls.length, 0);
    assert.equal(timelineCalls.length, 0);
    assertNoForeignLeak(listed);
    assertNoForeignLeak(dossier);
    assertNoForeignLeak(timelineResult);
  });

  it('foreign tenant data does not leak name, coordinates, or count', async () => {
    const db = fixture();
    const service = new AccountsService();
    const listed = await service.list(alphaSession(), {}, db as never);
    assert.equal(listed.count, 2);
    assert.notEqual(listed.count, 3);
    assertNoForeignLeak(listed);
    const dossier = await service.dossier(alphaSession(), ZETA_ID, db as never).catch((error: unknown) => error);
    assert.ok(dossier instanceof NotFoundException);
    assertNoForeignLeak(dossier instanceof NotFoundException ? dossier.getResponse() : dossier);
    const timelineResult = await service.timeline(alphaSession(), ZETA_ID, db as never, await timelineReader());
    assert.equal(timelineResult.count, 0);
    assert.deepEqual(timelineResult.items, []);
    assert.equal(timelineResult.code, null);
    assertNoForeignLeak(timelineResult);
    assert.equal(db.calls.some((call) => call.args.where?.organizationId === OTHER), false);
  });

  it('no session is AUTH_REQUIRED and does not query', async () => {
    const db = fixture();
    const service = new AccountsService();
    for (const session of [null, undefined, { organizationId: '   ', grantedScopes: [SCOPE] }]) {
      const listed = await service.list(session, {}, db as never);
      const dossier = await service.dossier(session, ZETA_ID, db as never);
      const timelineResult = await service.timeline(session, ZETA_ID, db as never, await timelineReader());
      assert.equal(listed.code, 'AUTH_REQUIRED');
      assert.equal(dossier.code, 'AUTH_REQUIRED');
      assert.equal(timelineResult.code, 'AUTH_REQUIRED');
      assert.deepEqual(listed.items, []);
      assertNoForeignLeak(listed);
      assertNoForeignLeak(dossier);
      assertNoForeignLeak(timelineResult);
    }
    assert.equal(db.calls.length, 0);
    assert.equal(timelineCalls.length, 0);
  });

  it('exact foreign id returns the same result as a missing id', async () => {
    const db = fixture();
    const service = new AccountsService();
    const foreignDossier = await notFoundPayload(() => service.dossier(alphaSession(), ZETA_ID, db as never));
    const missingDossier = await notFoundPayload(() => service.dossier(alphaSession(), MISSING_ID, db as never));
    assert.deepEqual(foreignDossier, missingDossier);
    assert.equal(foreignDossier.message, 'Cuenta no encontrada');
    assert.deepEqual(foreignDossier.response, {
      message: 'Cuenta no encontrada',
      error: 'Not Found',
      statusCode: 404,
    });
    assertNoForeignLeak(foreignDossier);
    const includeCalls = db.calls.filter((call) => call.args.include);
    assert.equal(includeCalls.length, 0);
    for (const call of db.calls) {
      assert.equal(call.args.where?.organizationId, SESSION);
      assert.equal(call.args.select && !call.args.include, true);
    }

    const read = await timelineReader();
    const foreignTimeline = await service.timeline(alphaSession(), ZETA_ID, db as never, read);
    const missingTimeline = await service.timeline(alphaSession(), MISSING_ID, db as never, read);
    assert.deepEqual(foreignTimeline, missingTimeline);
    assert.deepEqual(foreignTimeline.items, []);
    assert.equal(foreignTimeline.code, null);
    assert.equal(foreignTimeline.count, 0);
    assertNoForeignLeak(foreignTimeline);
    assert.equal('name' in foreignTimeline, false);
    assert.equal('nit' in foreignTimeline, false);
    assert.equal('lat' in foreignTimeline, false);
  });

  it('search prefix of the other tenant name returns zero rows', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.list(alphaSession(), { q: 'ZetaOther' }, db as never);
    assert.equal(result.count, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.code, null);
    assert.equal(db.calls[0]?.method, 'findMany');
    assert.equal(db.calls[0]?.args.where?.organizationId, SESSION);
    const textFilter = db.calls[0]?.args.where?.AND?.[2] as { OR?: Array<Record<string, { contains?: string }>> };
    assert.equal(textFilter.OR?.[0]?.legalName?.contains, 'ZetaOther');
    assertNoForeignLeak(result);
  });

  it('take, filters, and sort keep the organizationId predicate', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.list(
      alphaSession(),
      { q: 'Alpha', segment: 'A', persona: 'persona-alpha-fixture', take: 1 },
      db as never,
    );
    assert.equal(result.count, 1);
    assert.equal(result.items[0]?.id, ALPHA_ID);
    const call = db.calls[0];
    assert.equal(call?.method, 'findMany');
    assert.equal(call?.args.where?.organizationId, SESSION);
    assert.equal(call?.args.take, 1);
    assert.deepEqual(call?.args.orderBy, [{ segment: 'asc' }, { relationshipScore: 'desc' }]);
    assert.equal((call?.args.where?.AND?.[0] as { segment?: string }).segment, 'A');
    assert.equal((call?.args.where?.AND?.[1] as { personaKey?: string }).personaKey, 'persona-alpha-fixture');
    assert.equal(
      (call?.args.where?.AND?.[2] as { OR?: Array<Record<string, { contains?: string }>> }).OR?.[0]?.legalName?.contains,
      'Alpha',
    );
    assertNoForeignLeak(result);
  });

  it('client organizationId is unread; the session org stays the predicate', async () => {
    const db = fixture();
    const service = new AccountsService();
    const result = await service.list(
      alphaSession(),
      { q: 'Alpha', organizationId: OTHER } as { q: string },
      db as never,
    );
    assert.equal(db.calls[0]?.args.where?.organizationId, SESSION);
    assert.notEqual(db.calls[0]?.args.where?.organizationId, OTHER);
    assert.equal(result.items[0]?.id, ALPHA_ID);
    assertNoForeignLeak(result);

    const seen: Array<{ session: { organizationId?: string } | null; params: Record<string, unknown>; id?: string }> = [];
    const controller = new AccountsController({
      list(session, params) {
        seen.push({ session, params });
        return { items: [], code: null, count: 0 };
      },
      dossier(session, id) {
        seen.push({ session, params: {}, id });
        return { items: [], code: null, count: 0 };
      },
      timeline(session, id) {
        seen.push({ session, params: {}, id });
        return { items: [], code: null, count: 0 };
      },
    } as never);
    const req = {
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [SCOPE],
      },
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
    };
    await controller.list(req, 'ZetaOther', 'A', 'persona-alpha-fixture', '2');
    await controller.dossier(req, ZETA_ID);
    await controller.timeline(req, ZETA_ID);
    assert.equal(seen.length, 3);
    for (const call of seen) {
      assert.equal(call.session?.organizationId, SESSION);
      assert.equal('organizationId' in call.params, false);
    }
    assert.equal(seen[0]?.params.q, 'ZetaOther');
    assert.equal(seen[0]?.params.take, 2);
  });

  it('controller without a session returns AUTH_REQUIRED and does not open prisma', async () => {
    const service = new AccountsService();
    const controller = new AccountsController(service);
    const req = {
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
    };
    const listed = await controller.list(req, 'ZetaOther');
    const dossier = await controller.dossier(req, ZETA_ID);
    const timelineResult = await controller.timeline(req, ZETA_ID);
    assert.equal(listed.code, 'AUTH_REQUIRED');
    assert.equal(dossier.code, 'AUTH_REQUIRED');
    assert.equal(timelineResult.code, 'AUTH_REQUIRED');
    assert.deepEqual(listed.items, []);
    assertNoForeignLeak(listed);
    assertNoForeignLeak(dossier);
    assertNoForeignLeak(timelineResult);
  });
});
