import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AccountsController } from './accounts.controller';
import {
  ACCOUNT_READ_SCOPE,
  AccountsService,
  type AccountReadDb,
  type TrustedAccountSession,
} from './accounts.service';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const WRONG_ROLE = 'master_data.admin';

type ListRow = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  segment: string;
  personaKey: string | null;
  creditStatus: string;
  relationshipScore: number;
  lastVisitAt: Date | null;
  lastPurchaseAt: Date | null;
  aiSummary: string | null;
  owner: { name: string };
  territory: { code: string };
  locations: Array<{ lat: number; lng: number }>;
};

function listRow(id: string, organizationId: string, name: string, code = id): ListRow {
  return {
    id,
    organizationId,
    code,
    legalName: name,
    tradeName: name,
    segment: 'A',
    personaKey: null,
    creditStatus: 'ok',
    relationshipScore: 1,
    lastVisitAt: null,
    lastPurchaseAt: null,
    aiSummary: null,
    owner: { name: 'owner' },
    territory: { code: 'T1' },
    locations: [],
  };
}

function matchesContains(row: Record<string, unknown>, clause: Record<string, { contains: string }>): boolean {
  const entry = Object.entries(clause)[0];
  if (!entry) return false;
  const [field, cond] = entry;
  const value = row[field];
  return typeof value === 'string' && value.toLowerCase().includes(cond.contains.toLowerCase());
}

function matchesAnd(row: ListRow, clause: Record<string, unknown>): boolean {
  if (!clause || Object.keys(clause).length === 0) return true;
  if (Array.isArray(clause.OR)) {
    return clause.OR.some((part) => matchesContains(row as never, part as never));
  }
  if (typeof clause.segment === 'string') return row.segment === clause.segment;
  if (typeof clause.personaKey === 'string') return row.personaKey === clause.personaKey;
  return true;
}

function dossier(id: string, organizationId: string, name: string) {
  return {
    ...listRow(id, organizationId, name),
    nit: null,
    accountType: 'otro',
    creditLimitCentavos: 0n,
    relationshipScoreComponents: null,
    aiSummaryEvidenceJson: null,
    favoriteProductsJson: null,
    predictedNextOrderStart: null,
    predictedNextOrderEnd: null,
    predictionConfidence: null,
    lastWhatsappAt: null,
    contacts: [],
    creditTerms: null,
    quotes: [],
    orders: [],
    invoices: [],
    visits: [],
    conversations: [],
    priceObservations: [],
  };
}

function fixture(rows?: ListRow[]) {
  const accounts = rows ?? [
    listRow('acct-alpha', SESSION, SESSION_NAME, 'ALP-1'),
    listRow('acct-zeta', OTHER, OTHER_NAME, OTHER),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      listRow(`acct-zeta-${index}`, OTHER, OTHER_NAME, `${OTHER}-${index}`),
    ),
  ];
  const dossiers = accounts.map((row) => dossier(row.id, row.organizationId, row.tradeName ?? row.legalName));
  const listCalls: Array<{ where: { organizationId?: string }; take: number; include: unknown }> = [];
  const dossierCalls: Array<{ where: { id?: string; organizationId?: string }; include: Record<string, unknown> }> = [];
  const db = {
    account: {
      async findMany(args: { where: { organizationId?: string; AND?: Array<Record<string, unknown>> }; take: number; include: unknown }) {
        listCalls.push(args);
        return accounts
          .filter((row) => {
            if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
            return (args.where.AND ?? []).every((clause) => matchesAnd(row, clause));
          })
          .slice(0, args.take);
      },
      async findFirst(args: { where: { id?: string; organizationId?: string }; include: Record<string, unknown> }) {
        dossierCalls.push(args);
        return (
          dossiers.find(
            (row) => row.id === args.where.id && row.organizationId === args.where.organizationId,
          ) ?? null
        );
      },
    },
  } as AccountReadDb;
  return { db, listCalls, dossierCalls };
}

function session(scopes: readonly string[]): TrustedAccountSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function service() {
  return new AccountsService();
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('AccountsService tenant scope', () => {
  it('AccountsService.list same-tenant prefix search is allowed', async () => {
    const { db, listCalls } = fixture();
    const result = await service().list({ q: 'Alp', session: session([ACCOUNT_READ_SCOPE]), db });
    assert.equal(result.code, null);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.name === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.list same-tenant wrong role is denied', async () => {
    const { db, listCalls } = fixture();
    const result = await service().list({ q: 'Alpha', session: session([WRONG_ROLE]), db });
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(listCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.list cross-tenant prefix and id are not queried', async () => {
    const { db, listCalls } = fixture();
    const result = await service().list({ q: 'Zet', session: session([ACCOUNT_READ_SCOPE]), db });
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.notEqual(listCalls[0]?.where.organizationId, OTHER);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.list missing session is denied', async () => {
    const { db, listCalls } = fixture();
    const result = await service().list({ q: 'Zeta', session: null, db });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(listCalls.length, 0);
    assert.deepEqual(result.items, []);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.list pagination take is scoped to the session tenant', async () => {
    const rows = [
      ...Array.from({ length: 51 }, (_, index) => listRow(`acct-alpha-${index}`, SESSION, SESSION_NAME)),
      listRow('acct-zeta', OTHER, OTHER_NAME, OTHER),
    ];
    const { db, listCalls } = fixture(rows);
    const result = await service().list({ session: session([ACCOUNT_READ_SCOPE]), db });
    assert.equal(listCalls[0]?.take, 50);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 50);
    assert.equal(result.count, 50);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.list count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await service().list({ q: 'Zeta', session: session([ACCOUNT_READ_SCOPE]), db });
    assert.equal(result.count, 0);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.dossier same-tenant id is allowed', async () => {
    const { db, dossierCalls } = fixture();
    const result = await service().dossier('acct-alpha', session([ACCOUNT_READ_SCOPE]), db);
    assert.equal(result.denial, null);
    assert.equal(result.count, 1);
    assert.equal(dossierCalls[0]?.where.id, 'acct-alpha');
    assert.equal(dossierCalls[0]?.where.organizationId, SESSION);
    assert.equal('name' in result && result.name, SESSION_NAME);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.dossier same-tenant wrong role is denied', async () => {
    const { db, dossierCalls } = fixture();
    const result = await service().dossier('acct-alpha', session([WRONG_ROLE]), db);
    assert.equal(result.denial, 'ROLE_FORBIDDEN');
    assert.equal(dossierCalls.length, 0);
    assert.equal(result.count, 0);
    assert.equal('name' in result, false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.dossier cross-tenant id and prefix return no row', async () => {
    const { db, dossierCalls } = fixture();
    const byId = await service().dossier('acct-zeta', session([ACCOUNT_READ_SCOPE]), db);
    const byPrefix = await service().dossier('acct-ze', session([ACCOUNT_READ_SCOPE]), db);
    assert.equal(dossierCalls[0]?.where.organizationId, SESSION);
    assert.equal(dossierCalls[1]?.where.organizationId, SESSION);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.equal(byId.denial, null);
    assert.equal('id' in byId, false);
    assert.equal('name' in byId, false);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('AccountsService.dossier missing session is denied', async () => {
    const { db, dossierCalls } = fixture();
    const result = await service().dossier('acct-zeta', null, db);
    assert.equal(result.denial, 'AUTH_REQUIRED');
    assert.equal(dossierCalls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.dossier count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await service().dossier('acct-zeta', session([ACCOUNT_READ_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, 1);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.timeline same-tenant id is allowed', async () => {
    const calls: Array<{ where: { organizationId?: string } }> = [];
    const db = {
      account: {
        async findFirst(args: { where: { id: string; organizationId: string } }) {
          calls.push(args);
          return args.where.organizationId === SESSION && args.where.id === 'acct-alpha'
            ? { id: 'acct-alpha' }
            : null;
        },
      },
      activityEvent: {
        async findMany(args: { where: { organizationId: string }; take: number }) {
          calls.push(args);
          if (args.where.organizationId !== SESSION) return [];
          return [
            {
              id: 'evt-alpha',
              type: 'visit.completed',
              title: SESSION_NAME,
              body: null,
              occurredAt: new Date('2026-01-01T00:00:00.000Z'),
              accountId: 'acct-alpha',
              actorUserId: null,
              payloadJson: null,
            },
          ];
        },
      },
    };
    const result = await service().timeline('acct-alpha', session([ACCOUNT_READ_SCOPE]), db as never);
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(calls[1]?.where.organizationId, SESSION);
    assert.equal(result.items[0]?.title, SESSION_NAME);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.timeline same-tenant wrong role is denied', async () => {
    let queried = 0;
    const db = {
      account: { async findFirst() { queried += 1; return null; } },
      activityEvent: { async findMany() { queried += 1; return []; } },
    };
    const result = await service().timeline('acct-alpha', session([WRONG_ROLE]), db as never);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(queried, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.timeline cross-tenant id and prefix return no events', async () => {
    const calls: Array<{ where: { id?: string; organizationId?: string } }> = [];
    const db = {
      account: {
        async findFirst(args: { where: { id: string; organizationId: string } }) {
          calls.push(args);
          return null;
        },
      },
      activityEvent: {
        async findMany() {
          return [{ id: 'evt-zeta', type: 'x', title: OTHER_NAME, body: OTHER, occurredAt: new Date(), accountId: 'acct-zeta', actorUserId: null, payloadJson: null }];
        },
      },
    };
    const byId = await service().timeline('acct-zeta', session([ACCOUNT_READ_SCOPE]), db as never);
    const byPrefix = await service().timeline('acct-ze', session([ACCOUNT_READ_SCOPE]), db as never);
    assert.equal(calls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.deepEqual(byId.items, []);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('AccountsService.timeline missing session is denied', async () => {
    let queried = 0;
    const db = {
      account: { async findFirst() { queried += 1; return null; } },
      activityEvent: { async findMany() { queried += 1; return []; } },
    };
    const result = await service().timeline('acct-zeta', undefined, db as never);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(queried, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('AccountsService.timeline count excludes the other tenant', async () => {
    const db = {
      account: {
        async findFirst(args: { where: { id: string; organizationId: string } }) {
          return args.where.organizationId === SESSION && args.where.id === 'acct-alpha' ? { id: 'acct-alpha' } : null;
        },
      },
      activityEvent: {
        async findMany(args: { where: { organizationId: string } }) {
          if (args.where.organizationId !== SESSION) {
            return Array.from({ length: OTHER_COUNT }, () => ({
              id: 'evt-zeta',
              type: 'x',
              title: OTHER_NAME,
              body: null,
              occurredAt: new Date(),
              accountId: 'acct-zeta',
              actorUserId: null,
              payloadJson: null,
            }));
          }
          return [];
        },
      },
    };
    const result = await service().timeline('acct-zeta', session([ACCOUNT_READ_SCOPE]), db as never);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});

describe('AccountsController session boundary', () => {
  it('AccountsController.list ignores caller organizationId and fails closed without a trusted session', async () => {
    const { db, listCalls } = fixture();
    const controller = new AccountsController(service());
    const missing = await controller.list('Zeta', undefined, undefined, undefined, {
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(missing.code, 'AUTH_REQUIRED');
    assert.equal(listCalls.length, 0);

    const allowed = await controller.list(undefined, undefined, undefined, undefined, {
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [ACCOUNT_READ_SCOPE],
      },
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(allowed.items.some((item) => item.name === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(missing) + JSON.stringify({ count: allowed.count, names: allowed.items.map((item) => item.name) }));
  });
});
