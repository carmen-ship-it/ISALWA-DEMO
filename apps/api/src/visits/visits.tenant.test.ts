import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { VisitsController, type VisitHttpRequest, type VisitMutationDb } from './visits.controller';
import {
  assertVisitTargetInTenant,
  prepareVisitCheckIn,
  VISIT_CHECK_IN_AUTHORITY,
  visitCheckInWriteGranted,
  type VisitAccountLookupArgs,
} from './visits-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const OTHER_OWNER = 'user-zeta-owner';
const FOREIGN_LAT = 41.41;
const FOREIGN_LNG = -72.72;
const READ_SCOPES = ['commercial.team.read', 'people.admin', 'management.org.read'] as const;

type Account = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  locations: Array<{ lat: number; lng: number }>;
};

function fixture() {
  const accounts: Account[] = [
    {
      id: 'acct-alpha',
      organizationId: SESSION,
      ownerUserId: 'user-alpha',
      name: 'AlphaSessionName',
      locations: [{ lat: 1.1, lng: 2.2 }],
    },
    {
      id: 'acct-zeta',
      organizationId: OTHER,
      ownerUserId: OTHER_OWNER,
      name: OTHER_NAME,
      locations: [{ lat: FOREIGN_LAT, lng: FOREIGN_LNG }],
    },
  ];
  const writes: Array<{ kind: string; payload: unknown }> = [];
  const lookups: VisitAccountLookupArgs[] = [];
  const db = {
    account: {
      async findUnique() {
        lookups.push({ where: { id: 'findUnique', organizationId: 'findUnique' } });
        throw new Error('findUnique must not be used');
      },
      async findFirst(args: VisitAccountLookupArgs) {
        lookups.push(args);
        const found = accounts.find(
          (row) => row.id === args.where.id && row.organizationId === args.where.organizationId,
        );
        if (!found) return null;
        return {
          id: found.id,
          organizationId: found.organizationId,
          ownerUserId: found.ownerUserId,
          name: found.name,
          locations: found.locations,
        };
      },
    },
    visit: {
      async create(args: { data: Record<string, unknown> }) {
        writes.push({ kind: 'create', payload: args.data });
      },
    },
    async updateAccount(args: { where: { id: string; organizationId: string }; data: { lastVisitAt: Date } }) {
      writes.push({ kind: 'update', payload: args });
    },
    async emit(payload: Record<string, unknown>) {
      writes.push({ kind: 'emit', payload });
    },
    async resolveAttention(args: { where: { accountId: string; organizationId: string } }) {
      writes.push({ kind: 'resolve', payload: args });
    },
  } as VisitMutationDb;
  return { db, writes, lookups };
}

function session(scopes: readonly string[]) {
  return {
    authenticated: true as const,
    organizationId: SESSION,
    grantedScopes: scopes,
  };
}

function req(scopes: readonly string[] | null, db: VisitMutationDb): VisitHttpRequest {
  return {
    authenticatedSession: scopes ? session(scopes) : undefined,
    query: { organizationId: OTHER },
    readDb: db,
  };
}

function foreignBody() {
  return {
    accountId: 'acct-zeta',
    organizationId: OTHER,
    lat: FOREIGN_LAT,
    lng: FOREIGN_LNG,
    notes: OTHER_NAME,
    account: { organizationId: OTHER, name: OTHER_NAME, ownerUserId: OTHER_OWNER, lat: FOREIGN_LAT, lng: FOREIGN_LNG },
  };
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes(OTHER_OWNER), false);
  assert.equal(serialized.includes('acct-zeta'), false);
  assert.equal(serialized.includes(String(FOREIGN_LAT)), false);
  assert.equal(serialized.includes(String(FOREIGN_LNG)), false);
}

describe('VisitsController.checkIn tenant scope', () => {
  it('VisitsController.checkIn missing session is AUTH_REQUIRED and does not write', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(foreignBody(), req(null, db));
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(result.allowed, false);
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assert.equal(writes.some((write) => write.kind === 'create'), false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn read capability does not authorize the write', async () => {
    const { db, writes, lookups } = fixture();
    const controller = new VisitsController();
    const team = await controller.checkIn(
      { accountId: 'acct-alpha', organizationId: OTHER, lat: FOREIGN_LAT, lng: FOREIGN_LNG },
      req(['commercial.team.read'], db),
    );
    const people = await controller.checkIn({ accountId: 'acct-alpha' }, req(['people.admin'], db));
    const management = await controller.checkIn({ accountId: 'acct-alpha' }, req(['management.org.read'], db));
    const stacked = await controller.checkIn({ accountId: 'acct-alpha' }, req(READ_SCOPES, db));
    for (const result of [team, people, management, stacked]) {
      assert.equal(result.code, 'ROLE_FORBIDDEN');
      assert.equal(result.allowed, false);
      assert.equal(result.authority, VISIT_CHECK_IN_AUTHORITY);
    }
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assertNoOtherEvidence(JSON.stringify([team, people, management, stacked]));
  });

  it('VisitsController.checkIn foreign id does not write because capability fails before lookup', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(foreignBody(), req(READ_SCOPES, db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(result.allowed, false);
    assert.equal(writes.some((write) => write.kind === 'create'), false);
    assert.equal(writes.length, 0);
    assert.equal(lookups.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn ignores body organization claims and a caller allow flag', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(foreignBody(), {
      ...req(READ_SCOPES, db),
      allow: true,
      forceAllow: true,
    } as VisitHttpRequest);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(result.allowed, false);
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assert.equal(VISIT_CHECK_IN_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('visit check-in does not call findUnique and stays a deployment blocker', () => {
    const controllerSource = readFileSync(new URL('./visits.controller.ts', import.meta.url), 'utf8');
    const querySource = readFileSync(new URL('./visits-query.ts', import.meta.url), 'utf8');
    assert.equal(controllerSource.includes('findUnique'), false);
    assert.equal(querySource.includes('findUnique'), false);
    assert.equal(querySource.includes('findFirst'), true);
    assert.equal(VISIT_CHECK_IN_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(visitCheckInWriteGranted(['commercial.team.read', 'people.admin', 'management.org.read']), false);
    assert.equal(visitCheckInWriteGranted(['commercial.order.convert', 'commercial.account.reassign']), false);
  });
});

describe('assertVisitTargetInTenant', () => {
  it('foreign and missing ids return null and where is { id, organizationId }', async () => {
    const forceAllowLookup = true;
    assert.equal(forceAllowLookup, true);
    const { db, writes, lookups } = fixture();
    const foreign = await assertVisitTargetInTenant(db, 'acct-zeta', SESSION);
    const missing = await assertVisitTargetInTenant(db, 'acct-missing', SESSION);
    assert.equal(foreign, null);
    assert.equal(missing, null);
    assert.deepEqual(lookups[0]?.where, { id: 'acct-zeta', organizationId: SESSION });
    assert.deepEqual(lookups[1]?.where, { id: 'acct-missing', organizationId: SESSION });
    assert.equal(writes.length, 0);
    assertNoOtherEvidence(JSON.stringify({ foreign, missing }));
  });

  it('same-tenant lookup stays inside the session organization', async () => {
    const forceAllowLookup = true;
    if (!forceAllowLookup) return;
    const { db, lookups } = fixture();
    const target = await assertVisitTargetInTenant(db, 'acct-alpha', SESSION);
    assert.equal(target?.id, 'acct-alpha');
    assert.equal(target?.organizationId, SESSION);
    assert.deepEqual(lookups[0]?.where, { id: 'acct-alpha', organizationId: SESSION });
    assert.equal(JSON.stringify(target).includes(OTHER), false);
    assert.equal(JSON.stringify(target).includes(OTHER_NAME), false);
  });
});

describe('prepareVisitCheckIn', () => {
  it('denies before lookup and never returns allowed', async () => {
    const { db, writes, lookups } = fixture();
    const anonymous = await prepareVisitCheckIn({
      session: null,
      accountId: 'acct-zeta',
      db,
    });
    const reader = await prepareVisitCheckIn({
      session: session(READ_SCOPES),
      accountId: 'acct-alpha',
      db,
    });
    assert.equal(anonymous.allowed, false);
    assert.equal(anonymous.code, 'AUTH_REQUIRED');
    assert.equal(reader.allowed, false);
    assert.equal(reader.code, 'ROLE_FORBIDDEN');
    assert.equal(reader.authority, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assert.equal(anonymous.account, null);
    assert.equal(reader.account, null);
  });
});
