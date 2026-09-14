import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConversationsController, CONVERSATION_READ_CAPABILITY } from './conversations.controller';
import type { ConversationListArgs, ConversationOneArgs, ConversationReadDb } from './conversations-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-foreign-zeta';
const CAPABILITY = CONVERSATION_READ_CAPABILITY;
const WRONG_CAPABILITY = 'people.admin';
const SIBLING_CAPABILITY = 'commercial.org.read';

const SESSION_NAME = 'AlphaSessionCeramica';
const SESSION_EMAIL = 'alpha-session@example.invalid';
const SESSION_PHONE = '+59170001111';

const FOREIGN_NAME = 'ZetaForeignCeramica';
const FOREIGN_EMAIL = 'zeta-foreign-exact@example.invalid';
const FOREIGN_PHONE = '+59170000991';
const FOREIGN_ID = 'convo-zeta-foreign';
const FOREIGN_MESSAGE = 'ZetaForeignMessageBody';
const FOREIGN_CHANNEL = 'ZetaForeignChannel';
const SHARED_NAME = 'ExactSharedCeramica';
const SHARED_EMAIL = 'exact-shared@example.invalid';
const SHARED_PHONE = '+59170007777';
const OTHER_COUNT = 7;

type Row = {
  id: string;
  organizationId: string;
  accountId: string | null;
  contactPhoneE164: string;
  status: string;
  slaStatus: string | null;
  lastMessageAt: Date;
  account: {
    organizationId: string;
    tradeName: string;
    legalName: string;
    email: string;
  } | null;
  channel: { organizationId: string; displayName: string; purpose: string; phoneE164: string };
  messages: Array<{
    id: string;
    organizationId: string;
    direction: string;
    body: string;
    sentAt: Date;
    senderType: string;
  }>;
};

function conversation(input: {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  lastMessageAt: string;
  body?: string;
}): Row {
  return {
    id: input.id,
    organizationId: input.organizationId,
    accountId: `acct-${input.id}`,
    contactPhoneE164: input.phone,
    status: 'open',
    slaStatus: 'ok',
    lastMessageAt: new Date(input.lastMessageAt),
    account: {
      organizationId: input.organizationId,
      tradeName: input.name,
      legalName: input.name,
      email: input.email,
    },
    channel: {
      organizationId: input.organizationId,
      displayName: input.organizationId === OTHER ? FOREIGN_CHANNEL : 'Señal',
      purpose: 'ventas',
      phoneE164: input.phone,
    },
    messages: [
      {
        id: `msg-${input.id}`,
        organizationId: input.organizationId,
        direction: 'in',
        body: input.body ?? input.name,
        sentAt: new Date(input.lastMessageAt),
        senderType: 'customer',
      },
    ],
  };
}

function sessionRow(id = 'convo-alpha'): Row {
  return conversation({
    id,
    organizationId: SESSION,
    name: SESSION_NAME,
    email: SESSION_EMAIL,
    phone: SESSION_PHONE,
    lastMessageAt: '2026-03-01T00:00:00.000Z',
    body: 'AlphaSessionPreview',
  });
}

function foreignRow(id = FOREIGN_ID, at = '2026-09-01T00:00:00.000Z'): Row {
  return conversation({
    id,
    organizationId: OTHER,
    name: FOREIGN_NAME,
    email: FOREIGN_EMAIL,
    phone: FOREIGN_PHONE,
    lastMessageAt: at,
    body: FOREIGN_MESSAGE,
  });
}

function fixture(rows?: Row[]) {
  const items = rows ?? [
    sessionRow(),
    foreignRow(),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      foreignRow(`convo-zeta-${index}`, `2026-09-${String(index + 2).padStart(2, '0')}T00:00:00.000Z`),
    ),
  ];
  const listCalls: ConversationListArgs[] = [];
  const oneCalls: ConversationOneArgs[] = [];
  let findUniqueCalls = 0;
  const db = {
    conversation: {
      async findMany(args: ConversationListArgs) {
        listCalls.push(args);
        return items
          .filter((row) => row.organizationId === args.where.organizationId)
          .sort((left, right) => right.lastMessageAt.getTime() - left.lastMessageAt.getTime())
          .slice(0, args.take);
      },
      async findFirst(args: ConversationOneArgs) {
        oneCalls.push(args);
        return (
          items.find(
            (row) => row.id === args.where.id && row.organizationId === args.where.organizationId,
          ) ?? null
        );
      },
      async findUnique() {
        findUniqueCalls += 1;
        return items[0] ?? null;
      },
    },
  } as ConversationReadDb & { conversation: { findUnique: () => Promise<unknown> } };
  return { db, listCalls, oneCalls, findUniqueCalls: () => findUniqueCalls };
}

function req(
  scopes: readonly string[] | null,
  db: ConversationReadDb,
  extras?: { authenticated?: boolean },
) {
  return {
    authenticatedSession: scopes
      ? {
          authenticated: extras?.authenticated ?? true,
          organizationId: SESSION,
          grantedScopes: scopes,
        }
      : undefined,
    query: {
      organizationId: OTHER,
      q: FOREIGN_PHONE,
      email: FOREIGN_EMAIL,
      name: FOREIGN_NAME,
    },
    body: { organizationId: OTHER },
    headers: { 'x-organization-id': OTHER },
    readDb: db,
  };
}

function assertNoForeignEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(FOREIGN_NAME), false);
  assert.equal(serialized.includes(FOREIGN_EMAIL), false);
  assert.equal(serialized.includes(FOREIGN_PHONE), false);
  assert.equal(serialized.includes('70000991'), false);
  assert.equal(serialized.includes(FOREIGN_ID), false);
  assert.equal(serialized.includes(FOREIGN_MESSAGE), false);
  assert.equal(serialized.includes(FOREIGN_CHANNEL), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes('***'), false);
  assert.equal(serialized.includes('••••'), false);
  assert.equal(serialized.includes('similarity'), false);
  assert.equal(serialized.includes('existing customer'), false);
  assert.equal(serialized.includes('cliente existente'), false);
  assert.equal(serialized.includes('candidateCount'), false);
  assert.equal(serialized.includes('matchCount'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('conversation tenant reads', () => {
  it('lists only the session organization and keeps organizationId with orderBy and take', async () => {
    const { db, listCalls, findUniqueCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([CAPABILITY], db));
    assert.equal(result.code, null);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.deepEqual(listCalls[0]?.orderBy, { lastMessageAt: 'desc' });
    assert.equal(listCalls[0]?.take, 40);
    assert.equal(listCalls[0]?.include.messages.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.accountName === SESSION_NAME), true);
    assert.equal(result.count, 1);
    assert.equal(findUniqueCalls(), 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns an empty list and AUTH_REQUIRED when there is no session, without calling prisma', async () => {
    const { db, listCalls, oneCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req(null, db));
    assert.deepEqual(result, { items: [], code: 'AUTH_REQUIRED', count: 0 });
    assert.equal(listCalls.length, 0);
    assert.equal(oneCalls.length, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns AUTH_REQUIRED when the session is not authenticated, without calling prisma', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(
      undefined,
      req([CAPABILITY], db, { authenticated: false }),
    );
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(result.items.length, 0);
    assert.equal(listCalls.length, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns ROLE_FORBIDDEN for people.admin, without calling prisma', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([WRONG_CAPABILITY], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(result.items.length, 0);
    assert.equal(result.count, 0);
    assert.equal(listCalls.length, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns ROLE_FORBIDDEN for a sibling commercial scope, without calling prisma', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list(undefined, req([SIBLING_CAPABILITY], db));
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(listCalls.length, 0);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('ignores client organizationId, phone, email, and name when listing', async () => {
    const { db, listCalls } = fixture();
    const result = await new ConversationsController().list('40', req([CAPABILITY], db));
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(JSON.stringify(listCalls[0]?.where).includes(OTHER), false);
    assert.equal(JSON.stringify(listCalls[0]?.where).includes(FOREIGN_PHONE), false);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('keeps organizationId when pagination take would otherwise surface newer foreign rows', async () => {
    const rows = [
      sessionRow('convo-alpha-old'),
      sessionRow('convo-alpha-new'),
      foreignRow(),
      ...Array.from({ length: OTHER_COUNT }, (_, index) => foreignRow(`convo-zeta-${index}`)),
    ];
    rows[0] = { ...rows[0]!, lastMessageAt: new Date('2026-01-01T00:00:00.000Z') };
    rows[1] = { ...rows[1]!, lastMessageAt: new Date('2026-02-01T00:00:00.000Z') };
    const { db, listCalls } = fixture(rows);
    const result = await new ConversationsController().list('2', req([CAPABILITY], db));
    assert.equal(listCalls[0]?.take, 2);
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.deepEqual(listCalls[0]?.orderBy, { lastMessageAt: 'desc' });
    assert.equal(result.items.length, 2);
    assert.equal(result.count, 2);
    assert.equal(result.items.every((item) => item.id.startsWith('convo-alpha')), true);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('does not return a foreign contactPhoneE164 from the list', async () => {
    const { db } = fixture();
    const result = await new ConversationsController().list(undefined, req([CAPABILITY], db));
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(FOREIGN_PHONE), false);
    assert.equal(result.items.some((item) => item.accountName === FOREIGN_PHONE), false);
    assert.equal(result.items.some((item) => item.preview.includes(FOREIGN_PHONE)), false);
    assertNoForeignEvidence(serialized);
  });

  it('returns zero evidence for a cross-tenant exact phone, email, and name match', async () => {
    const rows = [
      conversation({
        id: 'convo-alpha-shared',
        organizationId: SESSION,
        name: SHARED_NAME,
        email: SHARED_EMAIL,
        phone: SHARED_PHONE,
        lastMessageAt: '2026-03-01T00:00:00.000Z',
        body: 'AlphaSharedPreview',
      }),
      conversation({
        id: FOREIGN_ID,
        organizationId: OTHER,
        name: SHARED_NAME,
        email: SHARED_EMAIL,
        phone: SHARED_PHONE,
        lastMessageAt: '2026-09-01T00:00:00.000Z',
        body: FOREIGN_MESSAGE,
      }),
      foreignRow('convo-zeta-distinct'),
    ];
    const { db, listCalls } = fixture(rows);
    const result = await new ConversationsController().list(undefined, req([CAPABILITY], db));
    assert.equal(listCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.count, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.id, 'convo-alpha-shared');
    assert.notEqual(result.count, 2);
    assert.notEqual(result.count, OTHER_COUNT);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(FOREIGN_ID), false);
    assert.equal(serialized.includes(FOREIGN_EMAIL), false);
    assert.equal(serialized.includes(FOREIGN_PHONE), false);
    assert.equal(serialized.includes(FOREIGN_MESSAGE), false);
    assert.equal(serialized.includes(OTHER), false);
    assertNoForeignEvidence(serialized);
  });

  it('returns a same-tenant conversation by id and organizationId', async () => {
    const { db, oneCalls, findUniqueCalls } = fixture();
    const result = await new ConversationsController().one('convo-alpha', req([CAPABILITY], db));
    assert.equal(oneCalls[0]?.where.id, 'convo-alpha');
    assert.equal(oneCalls[0]?.where.organizationId, SESSION);
    assert.equal(oneCalls[0]?.include.messages.where.organizationId, SESSION);
    assert.equal(findUniqueCalls(), 0);
    assert.ok(result && 'id' in result);
    if (!result || !('id' in result)) return;
    assert.equal(result.id, 'convo-alpha');
    assert.equal(result.accountName, SESSION_NAME);
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal('contactPhoneE164' in result, false);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns null for a missing id and a foreign id, with no existence evidence', async () => {
    const { db, oneCalls } = fixture();
    const controller = new ConversationsController();
    const request = req([CAPABILITY], db);
    const missing = await controller.one('convo-missing', request);
    const foreign = await controller.one(FOREIGN_ID, request);
    assert.equal(missing, null);
    assert.equal(foreign, null);
    assert.deepEqual(missing, foreign);
    assert.equal(oneCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(oneCalls.some((call) => call.where.id === FOREIGN_ID), true);
    assert.equal(JSON.stringify(oneCalls).includes('findUnique'), false);
    assertNoForeignEvidence(JSON.stringify(missing) + JSON.stringify(foreign));
  });

  it('returns null one and AUTH_REQUIRED when there is no session, without calling prisma', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one(FOREIGN_ID, req(null, db));
    assert.deepEqual(result, { item: null, code: 'AUTH_REQUIRED', count: 0 });
    assert.equal(result && 'item' in result ? result.item : 'missing', null);
    assert.equal(oneCalls.length, 0);
    assert.equal(result && 'id' in result, false);
    assert.equal(result && 'messages' in result, false);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('returns null one and ROLE_FORBIDDEN for people.admin, without calling prisma', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one(FOREIGN_ID, req([WRONG_CAPABILITY], db));
    assert.deepEqual(result, { item: null, code: 'ROLE_FORBIDDEN', count: 0 });
    assert.equal(oneCalls.length, 0);
    assert.equal(result && 'accountName' in result, false);
    assertNoForeignEvidence(JSON.stringify(result));
  });

  it('ignores client organizationId when reading one conversation', async () => {
    const { db, oneCalls } = fixture();
    const result = await new ConversationsController().one(FOREIGN_ID, req([CAPABILITY], db));
    assert.equal(result, null);
    assert.equal(oneCalls[0]?.where.organizationId, SESSION);
    assert.equal(oneCalls[0]?.where.id, FOREIGN_ID);
    assert.equal(JSON.stringify(oneCalls[0]?.where).includes(OTHER), false);
    assertNoForeignEvidence(JSON.stringify(result));
  });
});
