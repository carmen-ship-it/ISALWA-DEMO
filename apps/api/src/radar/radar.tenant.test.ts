import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RadarController, RADAR_READ_SCOPE, type RadarReadDb } from './radar.controller';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const WRONG_ROLE = 'management.org.read';

type Row = {
  id: string;
  organizationId: string;
  kind: string;
  score: number;
  reasonJson: null;
  accountId: string;
  account: { organizationId: string; tradeName: string; legalName: string; segment: string };
};

function row(id: string, organizationId: string, name: string, score: number): Row {
  return {
    id,
    organizationId,
    kind: 'visit_gap',
    score,
    reasonJson: null,
    accountId: `acct-${id}`,
    account: { organizationId, tradeName: name, legalName: name, segment: 'A' },
  };
}

function fixture(rows?: Row[]) {
  const items = rows ?? [
    row('alpha', SESSION, SESSION_NAME, 10),
    row('zeta', OTHER, OTHER_NAME, 99),
    ...Array.from({ length: OTHER_COUNT }, (_, index) => row(`zeta-${index}`, OTHER, OTHER_NAME, 50)),
  ];
  const calls: Array<{ where: { organizationId?: string }; take: number }> = [];
  const db = {
    attentionItem: {
      async findMany(args: { where: { organizationId?: string }; take: number }) {
        calls.push(args);
        return items
          .filter((item) => args.where.organizationId && item.organizationId === args.where.organizationId)
          .slice(0, args.take);
      },
    },
  } as RadarReadDb;
  return { db, calls };
}

function req(scopes: readonly string[] | null, db: RadarReadDb, callerOrg?: string) {
  return {
    authenticatedSession: scopes
      ? { authenticated: true, organizationId: SESSION, grantedScopes: scopes }
      : undefined,
    query: { organizationId: callerOrg },
    headers: { 'x-organization-id': callerOrg },
    readDb: db,
  };
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('RadarController.items tenant scope', () => {
  it('RadarController.items same-tenant list is allowed', async () => {
    const { db, calls } = fixture();
    const result = await new RadarController().items(req([RADAR_READ_SCOPE], db, OTHER));
    assert.equal(result.code, null);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.title === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('RadarController.items same-tenant wrong role is denied', async () => {
    const { db, calls } = fixture();
    const result = await new RadarController().items(req([WRONG_ROLE], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('RadarController.items cross-tenant prefix and id are excluded', async () => {
    const { db, calls } = fixture();
    const result = await new RadarController().items(req([RADAR_READ_SCOPE], db, OTHER));
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.id.startsWith('zeta') || item.accountId?.includes('zeta')), false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('RadarController.items missing session is denied', async () => {
    const { db, calls } = fixture();
    const result = await new RadarController().items(req(null, db, OTHER));
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('RadarController.items pagination take stays inside the session tenant', async () => {
    const rows = [
      ...Array.from({ length: 31 }, (_, index) => row(`alpha-${index}`, SESSION, SESSION_NAME, 10)),
      row('zeta', OTHER, OTHER_NAME, 100),
    ];
    const { db, calls } = fixture(rows);
    const result = await new RadarController().items(req([RADAR_READ_SCOPE], db));
    assert.equal(calls[0]?.take, 30);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 30);
    assert.equal(result.count, 30);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('RadarController.items count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await new RadarController().items(req([RADAR_READ_SCOPE], db));
    assert.equal(result.count, 1);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
