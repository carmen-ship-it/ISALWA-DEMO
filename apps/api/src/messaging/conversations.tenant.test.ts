import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONVERSATION_READ_SCOPE,
  ConversationsController,
  type ConversationReadDb,
} from './conversations.controller';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const WRONG_ROLE = 'management.org.read';

function conversation(id: string, organizationId: string, name: string) {
  return {
    id,
    organizationId,
    accountId: `acct-${id}`,
    contactPhoneE164: '+59170000000',
    status: 'open',
    slaStatus: 'ok',
    lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
    account: { organizationId, tradeName: name, legalName: name },
    channel: { displayName: 'Señal', purpose: 'sales' },
    messages: [{ id: `msg-${id}`, organizationId, body: name, direction: 'in', sentAt: new Date('2026-01-01T00:00:00.000Z'), senderType: 'customer' }],
  };
}

function fixture(rows?: ReturnType<typeof conversation>[]) {
  const items = rows ?? [
    conversation('alpha', SESSION, SESSION_NAME),
    conversation('zeta', OTHER, OTHER_NAME),
    ...Array.from({ length: OTHER_COUNT }, (_, index) => conversation(`zeta-${index}`, OTHER, OTHER_NAME)),
  ];
  const listCalls: Array<{ where: { organizationId?: string }; take: number }> = [];
  const oneCalls: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const db = {
    conversation: {
      async findMany(args: { where: { organizationId?: string }; take: number }) {
        listCalls.push(args);
        return items
          .filter((row) => args.where.organizationId && row.organizationId === args.where.organizationId)
          .slice(0, args.take);
      },
      async findFirst(args: { where: { id?: string; organizationId?: string } }) {
        oneCalls.push(args);
        return (
          items.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId) ??
          null
        );
      },
    },
  } as ConversationReadDb;
  return { db, listCalls, oneCalls };
}

function req(scopes: readonly string[] | null, db: ConversationReadDb) {
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

describe('ConversationsController tenant scope', () => {
  it('ConversationsController.list same-tenant list is allowed', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([CONVERSATION_READ_SCOPE], db));
    assert.equal(result.code, null);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.accountName === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.list same-tenant wrong role is denied', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([WRONG_ROLE], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(listCalls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.list cross-tenant prefix and id are excluded', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([CONVERSATION_READ_SCOPE], db));
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.id.startsWith('zeta')), false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.list missing session is denied', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req(null, db));
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(listCalls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.list pagination take stays inside the session tenant', async () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, index) => conversation(`alpha-${index}`, SESSION, SESSION_NAME)),
      conversation('zeta', OTHER, OTHER_NAME),
    ];
    const { db, listCalls } = fixture(rows);
    const result = await new ConversationsController().list('2', req([CONVERSATION_READ_SCOPE], db));
    assert.equal(listCalls[0]?.take, 2);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 2);
    assert.equal(result.count, 2);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.list count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await new ConversationsController().list(undefined, req([CONVERSATION_READ_SCOPE], db));
    assert.equal(result.count, 1);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.one same-tenant id is allowed', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one('alpha', req([CONVERSATION_READ_SCOPE], db));
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(oneCalls[0]?.where.organizationId, SESSION);
    assert.equal('accountName' in result && result.accountName, SESSION_NAME);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.one same-tenant wrong role is denied', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one('alpha', req([WRONG_ROLE], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(oneCalls.length, 0);
    assert.equal(result.count, 0);
    assert.equal('id' in result, false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.one cross-tenant id and prefix return no row', async () => {
    const { db, oneCalls } = fixture();
    const controller = new ConversationsController();
    const byId = await controller.one('zeta', req([CONVERSATION_READ_SCOPE], db));
    const byPrefix = await controller.one('ze', req([CONVERSATION_READ_SCOPE], db));
    assert.equal(oneCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.equal('id' in byId, false);
    assert.equal('messages' in byId, false);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('ConversationsController.one missing session is denied', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one('zeta', req(null, db));
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(oneCalls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('ConversationsController.one count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await new ConversationsController().one('zeta', req([CONVERSATION_READ_SCOPE], db));
    assert.equal(result.count, 0);
    assert.notEqual(result.count, 1);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
