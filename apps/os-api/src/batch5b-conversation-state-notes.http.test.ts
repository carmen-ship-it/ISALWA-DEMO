import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * Batch 5B: durable attention state, "Tomar conversación" starting attention, human takeover
 * pausing automation, and team-only internal notes. Real Nest app over HTTP, real Postgres
 * (disposable). Nothing here connects WhatsApp or sends a message.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describeHttp('Batch 5B conversation state and internal notes over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;

  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  let customerId = '';

  const headers = (orgId: string, who: Seeded) => ({
    'content-type': 'application/json',
    'x-os-organization-id': orgId,
    'x-os-member-id': who.member.id,
    'x-os-person-id': who.person.id,
    'x-os-auth-identity-id': who.auth.id,
  });
  const call = async (
    method: 'GET' | 'POST',
    who: string,
    path: string,
    body?: unknown,
    orgId = orgA.id,
  ) => {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: headers(orgId, m[who]!),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };

  async function seedMember(orgId: string, name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@b5b.bo`, name, 'B5B');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function seedCustomer(orgId: string, name: string, ownerMemberId: string): Promise<string> {
    const partyId = createId();
    await prisma().osParty.create({
      data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: name },
    });
    await prisma().osPartyRoleAssignment.create({
      data: { id: createId(), organizationId: orgId, partyId, roleKey: 'customer', effectiveAt: new Date('2020-01-01') },
    });
    await prisma().osCommercialAccount.create({
      data: { id: createId(), organizationId: orgId, partyId, ownerMemberId },
    });
    await prisma().osPartyReadModel.create({
      data: {
        partyId,
        organizationId: orgId,
        partyKind: 'organization',
        displayName: name,
        status: 'active',
        activeRoleKeys: ['customer'],
        hasCommercialAccount: true,
        searchText: name.toLowerCase(),
      },
    });
    return partyId;
  }

  const newConversation = async (who = 'owner') => {
    const res = await call('POST', who, '/customer-conversations', {
      customerId,
      channel: 'call',
      occurredAt: '2026-11-16T14:00:00.000Z',
      reason: 'Consulta por plazo',
      summary: 'El cliente preguntó por el plazo.',
    });
    assert.equal(res.status, 201, res.text);
    return res.body.item.id as string;
  };
  const setState = (who: string, id: string, to: string, orgId = orgA.id) =>
    call('POST', who, `/customer-conversations/${id}/state`, { to }, orgId);
  const row = (id: string) => prisma().osCustomerConversation.findUniqueOrThrow({ where: { id } });
  const changes = (id: string) =>
    prisma().osCustomerConversationStateChange.findMany({
      where: { conversationId: id },
      orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    });
  const key = () => `b5b-key-${createId()}`;

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    orgA = await store.seedOrganization('B5B A', `b5b-a-${createId()}`);
    orgB = await store.seedOrganization('B5B B', `b5b-b-${createId()}`);

    m.owner = await seedMember(orgA.id, 'owner', []);
    m.orgReader = await seedMember(orgA.id, 'orgreader', ['commercial.org.read']);
    m.stranger = await seedMember(orgA.id, 'stranger', []);
    m.suspended = await seedMember(orgA.id, 'suspended', []);
    m.foreign = await seedMember(orgB.id, 'foreign', []);
    await prisma().osOrganizationMember.update({
      where: { id: m.suspended.member.id },
      data: { accessStatus: 'suspended' },
    });

    customerId = await seedCustomer(orgA.id, 'Cliente Estado B5B', m.owner.member.id);
  });

  after(async () => {
    await app.close();
  });

  it('a new conversation is Nueva, unassigned and with automation not paused; AI state is null', async () => {
    const id = await newConversation();
    const stored = await row(id);
    assert.equal(stored.attentionState, 'new');
    assert.equal(stored.assignedMemberId, null);
    assert.equal(stored.automationPausedAt, null);
    const listed = await call('GET', 'owner', `/customer-conversations?partyId=${customerId}`);
    const item = listed.body.items.find((i: { id: string }) => i.id === id);
    assert.equal(item.attentionState, 'new');
    assert.equal(item.automationPausedAt, null);
    assert.equal(item.aiState, null);
    const notices = await prisma().osInternalNotification.findMany({
      where: { organizationId: orgA.id, sourceRecordType: 'conversation', sourceRecordId: id },
    });
    assert.equal(notices.length, 1);
    assert.equal(notices[0]!.kind, 'customer_attention');
    assert.equal(notices[0]!.recipientMemberId, m.owner.member.id);
    assert.equal(notices[0]!.title, 'Conversación sin asignar');
    assert.match(notices[0]!.body ?? '', /interno/i);
  });

  it('Tomar conversación starts attention, pauses automation and records history; a waiting_customer one keeps its state', async () => {
    const id = await newConversation();
    const took = await call('POST', 'owner', `/customer-conversations/${id}/take`);
    assert.equal(took.status, 201, took.text);
    assert.equal(took.body.item.attentionState, 'in_attention');
    assert.ok(took.body.item.automationPausedAt);
    const log = await changes(id);
    assert.equal(log.length, 1);
    assert.deepEqual(
      [log[0]!.fromState, log[0]!.toState, log[0]!.cause, log[0]!.actorMemberId],
      ['new', 'in_attention', 'take', m.owner.member.id],
    );
    // Repeating the take changes nothing and adds no history.
    await call('POST', 'owner', `/customer-conversations/${id}/take`);
    assert.equal((await changes(id)).length, 1);
    const assigned = await prisma().osInternalNotification.findMany({
      where: {
        organizationId: orgA.id,
        sourceRecordType: 'conversation',
        sourceRecordId: id,
        kind: 'conversation_assigned',
      },
    });
    assert.equal(assigned.length, 1);
    assert.equal(assigned[0]!.recipientMemberId, m.owner.member.id);
    assert.equal(assigned[0]!.title, 'Conversación asignada');

    const waiting = await newConversation();
    assert.equal((await setState('owner', waiting, 'waiting_customer')).status, 201);
    const tookWaiting = await call('POST', 'owner', `/customer-conversations/${waiting}/take`);
    assert.equal(tookWaiting.body.item.attentionState, 'waiting_customer');
    assert.ok(tookWaiting.body.item.automationPausedAt);
    assert.equal(tookWaiting.body.item.assignedMemberId, m.owner.member.id);
  });

  it('keeps the unassigned queue usable: waiting states and Resuelta need no holder, En atención does', async () => {
    const id = await newConversation();
    const refused = await setState('owner', id, 'in_attention');
    assert.equal(refused.status, 409);
    assert.equal(refused.body.code, 'HOLDER_REQUIRED');
    assert.equal((await row(id)).attentionState, 'new');

    const waitingTeam = await setState('owner', id, 'waiting_team');
    assert.equal(waitingTeam.status, 201, waitingTeam.text);
    assert.equal(waitingTeam.body.item.attentionState, 'waiting_team');
    assert.equal(waitingTeam.body.item.assignedMemberId, null, 'a state change never assigns');
    assert.equal((await row(id)).assignedMemberId, null);

    const resolved = await setState('orgReader', id, 'resolved');
    assert.equal(resolved.status, 201);
    // Resuelta only reopens to En atención, and that still needs a holder.
    const backToNew = await setState('owner', id, 'new');
    assert.equal(backToNew.status, 409, 'Nueva is not a manual target');
    assert.equal(backToNew.body.code, 'TRANSITION_NOT_ALLOWED');
    assert.equal((await setState('owner', id, 'not_a_state')).status, 400);
    const reopenNoHolder = await setState('owner', id, 'in_attention');
    assert.equal(reopenNoHolder.status, 409);
    assert.equal(reopenNoHolder.body.code, 'HOLDER_REQUIRED');
    const toWaiting = await setState('owner', id, 'waiting_customer');
    assert.equal(toWaiting.status, 409);
    assert.equal(toWaiting.body.code, 'TRANSITION_NOT_ALLOWED');
  });

  it('records each change once with who and why; a repeat of the same state is a no-op', async () => {
    const id = await newConversation();
    await call('POST', 'owner', `/customer-conversations/${id}/take`);
    const first = await setState('owner', id, 'waiting_customer');
    assert.equal(first.body.changed, true);
    const again = await setState('owner', id, 'waiting_customer');
    assert.equal(again.status, 201);
    assert.equal(again.body.changed, false);
    const reopened = await setState('owner', id, 'resolved');
    assert.equal(reopened.body.item.attentionState, 'resolved');
    const back = await setState('owner', id, 'in_attention');
    assert.equal(back.body.item.attentionState, 'in_attention');

    const log = await changes(id);
    assert.deepEqual(
      log.map((c) => `${c.fromState}>${c.toState}:${c.cause}`),
      ['new>in_attention:take', 'in_attention>waiting_customer:manual', 'waiting_customer>resolved:manual', 'resolved>in_attention:manual'],
    );
    assert.ok(log.every((c) => c.actorMemberId === m.owner.member.id));
    // Automation stays paused through Resuelta and reopen: it is never silently resumed.
    assert.ok((await row(id)).automationPausedAt);
  });

  it('only the holder or a manager over the holder changes a held conversation', async () => {
    const id = await newConversation();
    const took = await call('POST', 'orgReader', `/customer-conversations/${id}/take`);
    assert.equal(took.status, 201, took.text);
    // The account owner can read the customer but does not hold the conversation.
    const notHolder = await setState('owner', id, 'resolved');
    assert.equal(notHolder.status, 403, notHolder.text);
    assert.equal(notHolder.body.code, 'NOT_HOLDER');
    assert.equal((await row(id)).attentionState, 'in_attention');
    // The holder can.
    assert.equal((await setState('orgReader', id, 'waiting_team')).status, 201);

    // Someone without customer read authority is told nothing exists; a suspended one is refused.
    assert.equal((await setState('stranger', id, 'resolved')).status, 404);
    assert.equal((await setState('suspended', id, 'resolved')).status, 403);
    assert.equal((await setState('foreign', id, 'resolved', orgB.id)).status, 404);
    assert.equal((await row(id)).attentionState, 'waiting_team');
  });

  it('two simultaneous changes never leave a broken history', async () => {
    const id = await newConversation();
    const results = await Promise.all([
      setState('owner', id, 'waiting_customer'),
      setState('orgReader', id, 'waiting_team'),
    ]);
    for (const r of results) {
      assert.ok([201, 409].includes(r.status), r.text);
      if (r.status === 409) assert.equal(r.body.code, 'STATE_CHANGED');
    }
    const winners = results.filter((r) => r.status === 201 && r.body.changed === true);
    const log = await changes(id);
    assert.equal(log.length, winners.length);
    let previous = 'new';
    for (const change of log) {
      assert.equal(change.fromState, previous, 'each change starts where the previous one ended');
      previous = change.toState;
    }
    assert.equal((await row(id)).attentionState, previous);
  });

  it('the database refuses En atención without a holder, an unknown state, and rewriting history', async () => {
    const id = await newConversation();
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `UPDATE os_customer_conversations SET attention_state = 'in_attention' WHERE id = '${id}'`,
      ),
      /in_attention_holder_chk|violates check constraint/,
    );
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `UPDATE os_customer_conversations SET attention_state = 'ai_replying' WHERE id = '${id}'`,
      ),
      /attention_state_chk|violates check constraint/,
    );
    await call('POST', 'owner', `/customer-conversations/${id}/take`);
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `UPDATE os_customer_conversation_state_changes SET to_state = 'resolved' WHERE conversation_id = '${id}'`,
      ),
      /CONVERSATION_STATE_CHANGE_APPEND_ONLY/,
    );
  });

  it('saves an internal note as Solo equipo, in its own table, without touching state or assignment', async () => {
    const id = await newConversation();
    const before = await row(id);
    const text = `El cliente suele pagar tarde ${createId()}`;
    const saved = await call('POST', 'owner', `/customer-conversations/${id}/notes`, {
      body: `  ${text}  `,
      requestKey: key(),
    });
    assert.equal(saved.status, 201, saved.text);
    assert.equal(saved.body.item.visibility, 'team_only');
    assert.equal(saved.body.item.body, text);
    assert.equal(saved.body.item.authorMemberId, m.owner.member.id);
    assert.ok(saved.body.item.authorLabel);
    assert.equal('channel' in saved.body.item, false);
    assert.equal('direction' in saved.body.item, false);

    const after = await row(id);
    assert.equal(after.attentionState, before.attentionState);
    assert.equal(after.assignedMemberId, before.assignedMemberId);
    assert.equal(after.automationPausedAt, null, 'a note is not a human takeover');
    assert.equal((await changes(id)).length, 0);

    const listed = await call('GET', 'orgReader', `/customer-conversations/${id}/notes`);
    assert.equal(listed.status, 200, listed.text);
    assert.deepEqual(listed.body.items.map((n: { body: string }) => n.body), [text]);

    // The note never travels with the conversation rows or any message list.
    const conversations = await call('GET', 'owner', `/customer-conversations?partyId=${customerId}`);
    assert.equal(conversations.text.includes(text), false);
  });

  it('repeating a save with the same key returns the same note; another text under that key is refused', async () => {
    const id = await newConversation();
    const requestKey = key();
    const body = { body: 'Pedir confirmación del plano', requestKey };
    const first = await call('POST', 'owner', `/customer-conversations/${id}/notes`, body);
    const second = await call('POST', 'owner', `/customer-conversations/${id}/notes`, body);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(second.body.item.id, first.body.item.id);
    const reused = await call('POST', 'owner', `/customer-conversations/${id}/notes`, {
      body: 'Otro texto distinto',
      requestKey,
    });
    assert.equal(reused.status, 409);
    assert.equal(reused.body.code, 'REQUEST_KEY_REUSED');
    const race = key();
    const both = await Promise.all([
      call('POST', 'owner', `/customer-conversations/${id}/notes`, { body: 'Nota simultánea', requestKey: race }),
      call('POST', 'owner', `/customer-conversations/${id}/notes`, { body: 'Nota simultánea', requestKey: race }),
    ]);
    assert.deepEqual(both.map((r) => r.status), [201, 201], both.map((r) => r.text).join('|'));
    assert.equal(both[0]!.body.item.id, both[1]!.body.item.id);
    const stored = await prisma().osCustomerConversationNote.findMany({ where: { conversationId: id } });
    assert.equal(stored.length, 2);
  });

  it('refuses empty, oversized and malformed notes and leaves nothing behind', async () => {
    const id = await newConversation();
    for (const body of [
      { body: '   ', requestKey: key() },
      { body: 'x'.repeat(4001), requestKey: key() },
      { body: 'Texto', requestKey: 'corta' },
      { body: 'Texto' },
      {},
    ]) {
      const res = await call('POST', 'owner', `/customer-conversations/${id}/notes`, body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    }
    assert.equal(await prisma().osCustomerConversationNote.count({ where: { conversationId: id } }), 0);
  });

  it('notes follow the conversation authority: no read access, another company, or a suspended member see nothing', async () => {
    const id = await newConversation();
    await call('POST', 'owner', `/customer-conversations/${id}/notes`, { body: 'Reservado al equipo', requestKey: key() });
    for (const [who, org, status] of [
      ['stranger', orgA.id, 404],
      ['foreign', orgB.id, 404],
      ['suspended', orgA.id, 403],
    ] as const) {
      const read = await call('GET', who, `/customer-conversations/${id}/notes`, undefined, org);
      assert.equal(read.status, status, `${who} read`);
      assert.equal(read.text.includes('Reservado'), false);
      const write = await call('POST', who, `/customer-conversations/${id}/notes`, { body: 'Intruso', requestKey: key() }, org);
      assert.equal(write.status, status, `${who} write`);
    }
    assert.equal(await prisma().osCustomerConversationNote.count({ where: { conversationId: id } }), 1);
  });

  it('notes can be added to a resolved conversation and cannot be edited or deleted', async () => {
    const id = await newConversation();
    await setState('owner', id, 'resolved');
    const saved = await call('POST', 'owner', `/customer-conversations/${id}/notes`, { body: 'Cierre acordado por teléfono', requestKey: key() });
    assert.equal(saved.status, 201, saved.text);
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `UPDATE os_customer_conversation_notes SET body = 'otra cosa' WHERE id = '${saved.body.item.id}'`,
      ),
      /CONVERSATION_NOTE_APPEND_ONLY/,
    );
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `DELETE FROM os_customer_conversation_notes WHERE id = '${saved.body.item.id}'`,
      ),
      /CONVERSATION_NOTE_APPEND_ONLY/,
    );
    await assert.rejects(
      prisma().$executeRawUnsafe(
        `UPDATE os_customer_conversation_notes SET visibility = 'customer' WHERE id = '${saved.body.item.id}'`,
      ),
      /CONVERSATION_NOTE_APPEND_ONLY|visibility_chk/,
    );
  });
});
