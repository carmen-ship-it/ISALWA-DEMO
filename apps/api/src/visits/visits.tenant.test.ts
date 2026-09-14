import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { VisitsController, VISIT_ACCOUNT_SCOPE, type VisitWriteDb } from './visits.controller';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const WRONG_ROLE = 'management.org.read';

type Account = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  locations: Array<{ lat: number; lng: number }>;
};

function fixture() {
  const accounts: Account[] = [
    { id: 'acct-alpha', organizationId: SESSION, ownerUserId: 'user-alpha', name: 'AlphaSessionName', locations: [{ lat: 1, lng: 1 }] },
    { id: 'acct-zeta', organizationId: OTHER, ownerUserId: 'user-zeta', name: OTHER_NAME, locations: [{ lat: 9, lng: 9 }] },
    { id: 'acct-zeta-prefix-long', organizationId: OTHER, ownerUserId: 'user-zeta', name: OTHER_NAME, locations: [] },
  ];
  const writes: Array<{ kind: string; organizationId?: string; accountId?: string }> = [];
  const lookups: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const db = {
    account: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        lookups.push(args);
        const found = accounts.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId);
        return found ? { id: found.id, organizationId: found.organizationId, ownerUserId: found.ownerUserId, locations: found.locations } : null;
      },
    },
    visit: {
      async create(args: { data: { organizationId?: string; accountId?: string } }) {
        writes.push({ kind: 'create', organizationId: args.data.organizationId, accountId: args.data.accountId });
      },
    },
    async updateAccount(args: { where: { id: string; organizationId: string } }) {
      writes.push({ kind: 'update', organizationId: args.where.organizationId, accountId: args.where.id });
    },
    async emit(payload: { organizationId?: string; accountId?: string }) {
      writes.push({ kind: 'emit', organizationId: payload.organizationId, accountId: payload.accountId });
    },
    async resolveAttention(args: { where: { organizationId: string; accountId: string } }) {
      writes.push({ kind: 'resolve', organizationId: args.where.organizationId, accountId: args.where.accountId });
    },
  } as VisitWriteDb;
  return { db, writes, lookups };
}

function req(scopes: readonly string[] | null, db: VisitWriteDb) {
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
}

describe('VisitsController.checkIn tenant scope', () => {
  it('VisitsController.checkIn same-tenant account lookup is allowed', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(
      { accountId: 'acct-alpha', notes: 'ok' },
      req([VISIT_ACCOUNT_SCOPE], db),
    );
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(lookups[0]?.where.organizationId, SESSION);
    assert.equal(writes.every((write) => write.organizationId === SESSION && write.accountId === 'acct-alpha'), true);
    assert.equal('accountId' in result && result.accountId, 'acct-alpha');
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn same-tenant wrong role is denied and does not write', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn({ accountId: 'acct-alpha' }, req([WRONG_ROLE], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn cross-tenant id and prefix return no row and do not write', async () => {
    const { db, writes, lookups } = fixture();
    const controller = new VisitsController();
    const byId = await controller.checkIn({ accountId: 'acct-zeta' }, req([VISIT_ACCOUNT_SCOPE], db));
    const byPrefix = await controller.checkIn({ accountId: 'acct-zeta-pre' }, req([VISIT_ACCOUNT_SCOPE], db));
    assert.equal(lookups.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(writes.length, 0);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.equal('id' in byId, false);
    assert.equal('accountId' in byId, false);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('VisitsController.checkIn missing session is denied and does not write', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(
      { accountId: 'acct-zeta' },
      req(null, db),
    );
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(lookups.length, 0);
    assert.equal(writes.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn does not update or count the other tenant', async () => {
    const { db, writes } = fixture();
    const result = await new VisitsController().checkIn(
      { accountId: 'acct-alpha' },
      req([VISIT_ACCOUNT_SCOPE], db),
    );
    assert.equal(writes.some((write) => write.organizationId === OTHER || write.accountId === 'acct-zeta'), false);
    assert.equal(result.count, 1);
    assert.notEqual(result.count, 2);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('VisitsController.checkIn ignores a caller-supplied organizationId', async () => {
    const { db, writes, lookups } = fixture();
    const result = await new VisitsController().checkIn(
      { accountId: 'acct-alpha', organizationId: OTHER } as { accountId: string },
      req([VISIT_ACCOUNT_SCOPE], db),
    );
    assert.equal(lookups[0]?.where.organizationId, SESSION);
    assert.equal(writes.every((write) => write.organizationId === SESSION), true);
    assert.equal(result.code, null);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
