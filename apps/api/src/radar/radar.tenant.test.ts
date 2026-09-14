import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RadarController } from './radar.controller';
import {
  listRadarItems,
  RADAR_ATTENTION_SCOPE,
  RADAR_TAKE,
  resolveRadarDb,
  type RadarAttentionRow,
  type RadarFindManyArgs,
  type RadarReadDb,
} from './radar-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_SCORE = 90901;
const OTHER_COUNT = 7;

function account(id: string, organizationId: string, name: string) {
  return {
    id,
    organizationId,
    tradeName: name,
    legalName: name,
    segment: organizationId === SESSION ? 'A' : 'Z',
  };
}

function item(
  id: string,
  organizationId: string,
  name: string,
  score: number,
  status = 'open',
): RadarAttentionRow {
  const accountId = `acct-${id}`;
  return {
    id,
    organizationId,
    status,
    kind: 'collections',
    score,
    reasonJson: { label: name },
    accountId,
    account: account(accountId, organizationId, name),
  };
}

function fixture(rows?: RadarAttentionRow[]) {
  const stored = rows ?? [
    item('alpha-open', SESSION, SESSION_NAME, 20),
    item('alpha-closed', SESSION, SESSION_NAME, 80808, 'closed'),
    item('zeta-open', OTHER, OTHER_NAME, OTHER_SCORE),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      item(`zeta-extra-${index}`, OTHER, OTHER_NAME, OTHER_SCORE - index),
    ),
  ];
  const calls: RadarFindManyArgs[] = [];
  const db: RadarReadDb = {
    attentionItem: {
      async findMany(args) {
        calls.push(args);
        const matched = stored.filter((row) => {
          if (!args.where?.organizationId) return true;
          if (row.organizationId !== args.where.organizationId) return false;
          if (args.where.status && row.status !== args.where.status) return false;
          return true;
        });
        matched.sort((left, right) => right.score - left.score);
        return matched.slice(0, args.take);
      },
    },
  };
  return { db, calls };
}

function session(scopes: readonly string[], organizationId = SESSION) {
  return {
    authenticated: true as const,
    organizationId,
    grantedScopes: scopes,
  };
}

function assertNoForeign(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta-open'), false);
  assert.equal(serialized.includes('acct-zeta'), false);
  assert.equal(serialized.includes(String(OTHER_SCORE)), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('radar attention tenant scope', () => {
  it('uses the existing attention scope and does not invent one', () => {
    assert.equal(RADAR_ATTENTION_SCOPE, 'commercial.team.read');
  });

  it('same-tenant open items are allowed and the where precedes take and order', async () => {
    const { db, calls } = fixture();
    const controller = new RadarController();
    const result = await controller.items({
      authenticatedSession: session([RADAR_ATTENTION_SCOPE]),
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
      readDb: db,
    });
    assert.equal(result.code, null);
    assert.deepEqual(Object.keys(calls[0] ?? {}), ['where', 'orderBy', 'take', 'include']);
    assert.deepEqual(Object.keys(calls[0]?.where ?? {}), ['organizationId', 'status']);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(calls[0]?.where.status, 'open');
    assert.equal(calls[0]?.take, RADAR_TAKE);
    assert.deepEqual(calls[0]?.include, { account: true });
    assert.equal(result.count, result.items.length);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.title, SESSION_NAME);
    assert.equal(result.items[0]?.href, '/personas/acct-alpha-open');
    assert.equal(result.items[0]?.score, 20);
    assertNoForeign(result);
  });

  it('wrong capability denies and does not query', async () => {
    for (const scopes of [['people.admin'], ['management.org.read'], []]) {
      const { db, calls } = fixture();
      const controller = new RadarController();
      const result = await controller.items({
        authenticatedSession: session(scopes),
        query: { organizationId: OTHER },
        readDb: db,
      });
      assert.equal(result.code, 'ROLE_FORBIDDEN');
      assert.equal(calls.length, 0);
      assert.deepEqual(result.items, []);
      assert.equal(result.count, 0);
      assertNoForeign(result);
    }
  });

  it('missing session is denied and does not load prisma or query', async () => {
    const { db, calls } = fixture();
    let loads = 0;
    const resolved = resolveRadarDb(
      { query: { organizationId: OTHER }, body: { organizationId: OTHER } },
      false,
      () => {
        loads += 1;
        return db;
      },
    );
    assert.equal(loads, 0);
    assert.equal(resolved, null);

    const controller = new RadarController();
    const result = await controller.items({
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
      readDb: db,
    });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoForeign(result);
  });

  it('an unauthenticated session object is denied and does not query', async () => {
    const { db, calls } = fixture();
    const result = await listRadarItems({
      session: null,
      db,
    });
    const controller = new RadarController();
    const fromRequest = await controller.items({
      authenticatedSession: {
        authenticated: false,
        organizationId: SESSION,
        grantedScopes: [RADAR_ATTENTION_SCOPE],
      },
      query: { organizationId: OTHER },
      readDb: db,
    });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(fromRequest.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assertNoForeign(fromRequest);
  });

  it('foreign tenant items are absent from title, href, score, and count', async () => {
    const { db, calls } = fixture();
    const result = await listRadarItems({
      session: { organizationId: SESSION, grantedScopes: [RADAR_ATTENTION_SCOPE] },
      db,
    });
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.notEqual(calls[0]?.where.organizationId, OTHER);
    assert.equal(result.count, 1);
    assert.notEqual(result.count, 1 + OTHER_COUNT);
    assert.equal(result.items.every((row) => row.title === SESSION_NAME), true);
    assert.equal(result.items.every((row) => row.score !== OTHER_SCORE), true);
    assertNoForeign(result);
  });

  it('count is the length of the scoped query, not the other tenant', async () => {
    const rows = [
      item('alpha-a', SESSION, SESSION_NAME, 30),
      item('alpha-b', SESSION, SESSION_NAME, 10),
      item('zeta-open', OTHER, OTHER_NAME, OTHER_SCORE),
      ...Array.from({ length: OTHER_COUNT }, (_, index) =>
        item(`zeta-extra-${index}`, OTHER, OTHER_NAME, OTHER_SCORE),
      ),
    ];
    const { db, calls } = fixture(rows);
    const result = await listRadarItems({
      session: { organizationId: SESSION, grantedScopes: [RADAR_ATTENTION_SCOPE] },
      db,
    });
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.count, result.items.length);
    assert.equal(result.count, 2);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoForeign(result);
  });

  it('closed same-tenant rows are excluded by status before take', async () => {
    const { db, calls } = fixture();
    const result = await listRadarItems({
      session: { organizationId: SESSION, grantedScopes: [RADAR_ATTENTION_SCOPE] },
      db,
    });
    assert.equal(calls[0]?.where.status, 'open');
    assert.equal(result.items.some((row) => row.id === 'alpha-closed'), false);
    assert.equal(result.items.some((row) => row.score === 80808), false);
    assert.equal(JSON.stringify(result).includes('80808'), false);
  });

  it('take stays inside the session tenant when the other tenant has higher scores', async () => {
    const rows = [
      ...Array.from({ length: RADAR_TAKE + 1 }, (_, index) =>
        item(`alpha-${index}`, SESSION, `${SESSION_NAME} ${index}`, 100 - index),
      ),
      item('zeta-open', OTHER, OTHER_NAME, OTHER_SCORE),
    ];
    const { db, calls } = fixture(rows);
    const result = await listRadarItems({
      session: { organizationId: SESSION, grantedScopes: [RADAR_ATTENTION_SCOPE] },
      db,
    });
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(calls[0]?.take, RADAR_TAKE);
    assert.equal(result.items.length, RADAR_TAKE);
    assert.equal(result.count, RADAR_TAKE);
    assert.equal(result.items.every((row) => row.title.startsWith(SESSION_NAME)), true);
    assertNoForeign(result);
  });

  it('a passed database is not queried when the capability is missing', async () => {
    const { db, calls } = fixture();
    const result = await listRadarItems({
      session: { organizationId: SESSION, grantedScopes: ['people.admin'] },
      db,
    });
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assertNoForeign(result);
  });
});
