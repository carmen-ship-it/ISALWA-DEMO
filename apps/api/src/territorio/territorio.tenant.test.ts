import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TerritorioController,
  TERRITORIO_READ_SCOPE,
  type TerritorioReadDb,
} from './territorio.controller';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const WRONG_ROLE = 'management.org.read';

type Account = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string;
  segment: string;
  creditStatus: string;
  personaKey: null;
  relationshipScore: number;
  lastVisitAt: null;
  ownerUserId: string;
  owner: { id: string; name: string };
  territory: { code: string };
  locations: Array<{ lat: number; lng: number }>;
};

function account(id: string, organizationId: string, name: string): Account {
  return {
    id,
    organizationId,
    code: id,
    legalName: name,
    tradeName: name,
    segment: 'A',
    creditStatus: 'ok',
    personaKey: null,
    relationshipScore: 1,
    lastVisitAt: null,
    ownerUserId: 'user-1',
    owner: { id: 'user-1', name: 'owner' },
    territory: { code: 'T1' },
    locations: [{ lat: 1, lng: 1 }],
  };
}

function fixture(rows?: Account[]) {
  const accounts = rows ?? [
    account('acct-alpha', SESSION, SESSION_NAME),
    account('acct-zeta', OTHER, OTHER_NAME),
    ...Array.from({ length: OTHER_COUNT }, (_, index) => account(`acct-zeta-${index}`, OTHER, OTHER_NAME)),
  ];
  const calls: Array<{ where: { organizationId?: string }; take: number }> = [];
  const db = {
    account: {
      async findMany(args: { where: { organizationId?: string }; take: number }) {
        calls.push(args);
        return accounts
          .filter((row) => args.where.organizationId && row.organizationId === args.where.organizationId)
          .slice(0, args.take);
      },
    },
  } as TerritorioReadDb;
  return { db, calls };
}

function req(scopes: readonly string[] | null, db: TerritorioReadDb) {
  return {
    authenticatedSession: scopes
      ? { authenticated: true, organizationId: SESSION, grantedScopes: scopes }
      : undefined,
    query: { organizationId: OTHER },
    headers: { 'x-organization-id': OTHER },
    readDb: db,
  };
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('TerritorioController.points tenant scope', () => {
  it('TerritorioController.points same-tenant list is allowed', async () => {
    const { db, calls } = fixture();
    const result = await new TerritorioController().points(undefined, req([TERRITORIO_READ_SCOPE], db));
    assert.equal(result.code, null);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.points.some((point) => point.name === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('TerritorioController.points same-tenant wrong role is denied', async () => {
    const { db, calls } = fixture();
    const result = await new TerritorioController().points(undefined, req([WRONG_ROLE], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('TerritorioController.points cross-tenant prefix and id are excluded', async () => {
    const { db, calls } = fixture();
    const result = await new TerritorioController().points(undefined, req([TERRITORIO_READ_SCOPE], db));
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.points.some((point) => point.accountId.startsWith('acct-ze')), false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('TerritorioController.points missing session is denied', async () => {
    const { db, calls } = fixture();
    const result = await new TerritorioController().points(undefined, req(null, db));
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('TerritorioController.points pagination take stays inside the session tenant', async () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, index) => account(`acct-alpha-${index}`, SESSION, SESSION_NAME)),
      account('acct-zeta', OTHER, OTHER_NAME),
    ];
    const { db, calls } = fixture(rows);
    const result = await new TerritorioController().points('2', req([TERRITORIO_READ_SCOPE], db));
    assert.equal(calls[0]?.take, 2);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.points.length, 2);
    assert.equal(result.count, 2);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('TerritorioController.points count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await new TerritorioController().points(undefined, req([TERRITORIO_READ_SCOPE], db));
    assert.equal(result.count, 1);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
