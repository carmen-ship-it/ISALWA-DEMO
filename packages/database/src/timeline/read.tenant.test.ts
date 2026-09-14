import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listAccountTimeline, TIMELINE_READ_SCOPE, type TrustedTimelineSession } from './read';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_TITLE = 'ZetaOtherName';
const SESSION_TITLE = 'AlphaSessionName';
const SESSION_ACCOUNT = 'acct-alpha';
const OTHER_ACCOUNT = 'acct-zeta';

type AccountRow = { id: string; organizationId: string };
type EventRow = {
  id: string;
  organizationId: string;
  accountId: string;
  type: string;
  title: string;
  body: string | null;
  payloadJson: null;
  occurredAt: Date;
  actorUserId: null;
};

function event(id: string, organizationId: string, accountId: string, title: string): EventRow {
  return {
    id,
    organizationId,
    accountId,
    type: 'quote.created',
    title,
    body: null,
    payloadJson: null,
    occurredAt: new Date('2026-01-02T00:00:00.000Z'),
    actorUserId: null,
  };
}

function fixture() {
  const accounts: AccountRow[] = [
    { id: SESSION_ACCOUNT, organizationId: SESSION },
    { id: OTHER_ACCOUNT, organizationId: OTHER },
  ];
  const events = [
    event('evt-alpha', SESSION, SESSION_ACCOUNT, SESSION_TITLE),
    event('evt-zeta', OTHER, OTHER_ACCOUNT, OTHER_TITLE),
  ];
  const accountCalls: Array<{ where: { id?: string; organizationId?: string }; select: unknown }> = [];
  const eventCalls: Array<{ where: { accountId?: string; organizationId?: string }; take: number }> = [];
  const db = {
    account: {
      async findFirst(args: { where: { id?: string; organizationId?: string }; select: { id: true } }) {
        accountCalls.push(args);
        return (
          accounts.find(
            (row) =>
              Boolean(args.where.organizationId) &&
              row.id === args.where.id &&
              row.organizationId === args.where.organizationId,
          ) ?? null
        );
      },
    },
    activityEvent: {
      async findMany(args: { where: { accountId?: string; organizationId?: string }; take: number }) {
        eventCalls.push(args);
        return events.filter((row) => {
          if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
          if (args.where.accountId && row.accountId !== args.where.accountId) return false;
          return true;
        }).slice(0, args.take);
      },
    },
  };
  return { db: db as never, accountCalls, eventCalls };
}

function session(scopes: readonly string[]): TrustedTimelineSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function assertNoExistence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_TITLE), false);
  assert.equal(serialized.includes(OTHER_ACCOUNT), false);
  assert.equal(serialized.includes('evt-zeta'), false);
  assert.equal(serialized.includes('exists'), false);
  assert.equal(serialized.includes('"count":1') && serialized.includes(OTHER_TITLE), false);
}

describe('listAccountTimeline tenant scope', () => {
  it('listAccountTimeline same-tenant events are allowed', async () => {
    const { db, accountCalls, eventCalls } = fixture();
    const result = await listAccountTimeline(db, SESSION_ACCOUNT, {
      session: session([TIMELINE_READ_SCOPE]),
      take: 40,
    });
    assert.equal(result.code, null);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(accountCalls[0]?.where.id, SESSION_ACCOUNT);
    assert.equal(eventCalls[0]?.where.organizationId, SESSION);
    assert.equal(eventCalls[0]?.where.accountId, SESSION_ACCOUNT);
    assert.equal(result.items[0]?.title, SESSION_TITLE);
    assert.equal(result.count, 1);
    assertNoExistence(JSON.stringify(result));
  });

  it('listAccountTimeline same-tenant wrong role is denied', async () => {
    const { db, accountCalls, eventCalls } = fixture();
    const result = await listAccountTimeline(db, SESSION_ACCOUNT, {
      session: session(['people.admin']),
    });
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(accountCalls.length, 0);
    assert.equal(eventCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoExistence(JSON.stringify(result));
  });

  it('listAccountTimeline cross-tenant account id reveals zero events and zero existence metadata', async () => {
    const { db, accountCalls, eventCalls } = fixture();
    const result = await listAccountTimeline(db, OTHER_ACCOUNT, {
      session: session([TIMELINE_READ_SCOPE]),
    });
    assert.equal(result.code, null);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(accountCalls[0]?.where.id, OTHER_ACCOUNT);
    assert.equal(eventCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assert.equal('exists' in result, false);
    assert.equal('accountId' in result, false);
    assertNoExistence(JSON.stringify(result));
  });

  it('listAccountTimeline missing session is denied', async () => {
    const { db, accountCalls, eventCalls } = fixture();
    const result = await listAccountTimeline(db, OTHER_ACCOUNT, { session: null });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(accountCalls.length, 0);
    assert.equal(eventCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoExistence(JSON.stringify(result));
  });

  it('listAccountTimeline pagination take is scoped to the session tenant', async () => {
    const { db, eventCalls } = fixture();
    const result = await listAccountTimeline(db, SESSION_ACCOUNT, {
      session: session([TIMELINE_READ_SCOPE]),
      take: 1,
    });
    assert.equal(eventCalls[0]?.take, 1);
    assert.equal(eventCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.title, SESSION_TITLE);
    assertNoExistence(JSON.stringify(result));
  });
});
