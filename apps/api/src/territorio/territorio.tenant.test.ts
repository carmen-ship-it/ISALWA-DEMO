import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sessionFromAuthenticatedRequest } from '../auth/trusted-session';
import {
  TERRITORY_POINTS_SCOPE,
  listTerritoryPoints,
  type TerritoryAccountRow,
  type TerritoryFindManyArgs,
  type TerritoryReadDb,
} from './territorio-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_ID = 'acct-zeta-foreign';
const OTHER_NAME = 'ZetaForeignMapName';
const OTHER_CODE = 'ZETA-CODE-991';
const OTHER_SEGMENT = 'ZETA-SEG';
const OTHER_CREDIT = 'zeta-credit-hold';
const OTHER_OWNER = 'ZetaOwnerName';
const OTHER_TERRITORY = 'ZETA-TERR';
const OTHER_LAT = -12.345671;
const OTHER_LNG = -67.890123;
const SESSION_ID = 'acct-alpha-session';
const SESSION_NAME = 'AlphaSessionTile';
const SESSION_LAT = -17.800001;
const SESSION_LNG = -63.180002;

function account(input: {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  segment: string;
  creditStatus: string;
  ownerName: string;
  territoryCode: string;
  lat: number;
  lng: number;
}): TerritoryAccountRow {
  return {
    id: input.id,
    organizationId: input.organizationId,
    code: input.code,
    legalName: input.name,
    tradeName: input.name,
    segment: input.segment,
    creditStatus: input.creditStatus,
    personaKey: null,
    relationshipScore: 10,
    lastVisitAt: null,
    ownerUserId: `owner-${input.id}`,
    locations: [{ lat: input.lat, lng: input.lng }],
    territory: { code: input.territoryCode },
    owner: { id: `owner-${input.id}`, name: input.ownerName },
  };
}

function foreignAccount(): TerritoryAccountRow {
  return account({
    id: OTHER_ID,
    organizationId: OTHER,
    name: OTHER_NAME,
    code: OTHER_CODE,
    segment: OTHER_SEGMENT,
    creditStatus: OTHER_CREDIT,
    ownerName: OTHER_OWNER,
    territoryCode: OTHER_TERRITORY,
    lat: OTHER_LAT,
    lng: OTHER_LNG,
  });
}

function sessionAccount(id = SESSION_ID, name = SESSION_NAME): TerritoryAccountRow {
  return account({
    id,
    organizationId: SESSION,
    name,
    code: 'ALPHA-CODE-101',
    segment: 'A',
    creditStatus: 'ok',
    ownerName: 'AlphaOwnerName',
    territoryCode: 'ALPHA-TERR',
    lat: SESSION_LAT,
    lng: SESSION_LNG,
  });
}

function fixtureDb(rows: TerritoryAccountRow[]) {
  const calls: TerritoryFindManyArgs[] = [];
  const db: TerritoryReadDb = {
    account: {
      async findMany(args) {
        calls.push(args);
        const organizationId = args.where?.organizationId;
        const matched =
          typeof organizationId === 'string' && organizationId.length > 0
            ? rows.filter((row) => row.organizationId === organizationId)
            : rows;
        return matched.slice(0, args.take);
      },
    },
  };
  return { db, calls };
}

function authenticated(scopes: readonly string[]) {
  return {
    authenticated: true as const,
    organizationId: SESSION,
    grantedScopes: scopes,
  };
}

async function points(
  take: string | undefined,
  grantedScopes: readonly string[] | null,
  rows: TerritoryAccountRow[],
  callerOrganizationId?: string,
) {
  const { db, calls } = fixtureDb(rows);
  const request = {
    authenticatedSession: grantedScopes ? authenticated(grantedScopes) : undefined,
    query: { organizationId: callerOrganizationId },
    readDb: db,
  };
  const session = sessionFromAuthenticatedRequest(request);
  const result = await listTerritoryPoints({ take, session, db });
  return { result, calls };
}

function assertNoForeignEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_ID), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes(OTHER_CODE), false);
  assert.equal(serialized.includes(OTHER_SEGMENT), false);
  assert.equal(serialized.includes(OTHER_CREDIT), false);
  assert.equal(serialized.includes(OTHER_OWNER), false);
  assert.equal(serialized.includes(OTHER_TERRITORY), false);
  assert.equal(serialized.includes(String(OTHER_LAT)), false);
  assert.equal(serialized.includes(String(OTHER_LNG)), false);
}

describe('territorio points tenant scope', () => {
  const mixed = [foreignAccount(), sessionAccount()];

  it('returns only the session tenant point and omits the foreign point', async () => {
    const { result, calls } = await points('200', [TERRITORY_POINTS_SCOPE], mixed);
    assert.equal(result.code, null);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.equal(result.count, 1);
    assert.notEqual(result.count, mixed.length);
    assert.equal(result.points[0]?.accountId, SESSION_ID);
    assert.equal(result.points[0]?.name, SESSION_NAME);
    assert.equal(result.points[0]?.lat, SESSION_LAT);
    assert.equal(result.points[0]?.lng, SESSION_LNG);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('queries where only the session organization so a foreign point cannot enter counting', async () => {
    const { result, calls } = await points('200', [TERRITORY_POINTS_SCOPE], mixed);
    const args = calls[0];
    assert.ok(args);
    assert.deepEqual(args.where, { organizationId: SESSION });
    assert.equal(Object.keys(args).indexOf('where') < Object.keys(args).indexOf('take'), true);
    assert.equal(result.count, 1);
    assert.equal(
      result.points.some((point) => point.accountId === OTHER_ID),
      false,
    );
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('keeps organizationId when take limits the map points', async () => {
    const rows = [
      foreignAccount(),
      sessionAccount('acct-alpha-a', 'AlphaSessionTile A'),
      sessionAccount('acct-alpha-b', 'AlphaSessionTile B'),
    ];
    const { result, calls } = await points('1', [TERRITORY_POINTS_SCOPE], rows);
    assert.equal(calls[0]?.take, 1);
    assert.deepEqual(calls[0]?.where, { organizationId: SESSION });
    assert.equal(result.count, 1);
    assert.equal(result.points[0]?.accountId, 'acct-alpha-a');
    assert.notEqual(result.points[0]?.accountId, OTHER_ID);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('missing session is AUTH_REQUIRED and does not query', async () => {
    const { result, calls } = await points('200', null, mixed, OTHER);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
    assert.deepEqual(result.points, []);
    assert.equal(result.count, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('people.admin is not a map capability and does not query', async () => {
    const { result, calls } = await points('200', ['people.admin'], mixed, OTHER);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assert.deepEqual(result.points, []);
    assert.equal(result.count, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('a non-exact commercial scope is ROLE_FORBIDDEN and does not query', async () => {
    const { result, calls } = await points('200', ['commercial.team.read.extra'], mixed);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
    assert.equal(result.count, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('authorized tenant with no points is a real zero, not a leak', async () => {
    const { result, calls } = await points('200', [TERRITORY_POINTS_SCOPE], [foreignAccount()]);
    assert.equal(result.code, null);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0]?.where, { organizationId: SESSION });
    assert.deepEqual(result.points, []);
    assert.equal(result.count, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('controller uses the authenticated request and does not read organizationId', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./territorio.controller.ts', import.meta.url)),
      'utf8',
    );
    assert.equal(source.includes('@Req()'), true);
    assert.equal(source.includes('sessionFromAuthenticatedRequest'), true);
    assert.equal(source.includes('holdsExactScope'), true);
    assert.equal(source.includes('TERRITORY_POINTS_SCOPE'), true);
    assert.equal(source.includes('organizationId'), false);
    assert.equal(source.includes("@Query('organizationId')"), false);
  });

  it('ignores a caller-supplied organizationId', async () => {
    const { result, calls } = await points('200', [TERRITORY_POINTS_SCOPE], mixed, OTHER);
    assert.equal(calls[0]?.where.organizationId, SESSION);
    assert.notEqual(calls[0]?.where.organizationId, OTHER);
    assert.equal(result.points[0]?.accountId, SESSION_ID);
    assertNoForeignEvidence(JSON.stringify(result));
  });
});
