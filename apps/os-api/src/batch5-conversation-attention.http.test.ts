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
 * Batch 5: "Registrar atención" (channels, required reason, next step as a real commitment),
 * the recoverable partial outcome, and "Tomar conversación" (one winner, no account change).
 * Real Nest app over HTTP, real Postgres (disposable).
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describeHttp('Batch 5 conversation attention over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;

  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  let customerId = '';
  let foreignCustomerId = '';

  const headers = (orgId: string, who: Seeded, extra: Record<string, string> = {}) => ({
    'content-type': 'application/json',
    'x-os-organization-id': orgId,
    'x-os-member-id': who.member.id,
    'x-os-person-id': who.person.id,
    'x-os-auth-identity-id': who.auth.id,
    ...extra,
  });
  const call = async (
    method: 'GET' | 'POST',
    who: string,
    path: string,
    body?: unknown,
    orgId = orgA.id,
    extra: Record<string, string> = {},
  ) => {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: headers(orgId, m[who]!, extra),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };

  async function seedMember(orgId: string, name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@b5.bo`, name, 'B5');
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

  const attention = (overrides: Record<string, unknown> = {}) => ({
    customerId,
    channel: 'call',
    occurredAt: '2026-11-16T14:00:00.000Z',
    reason: 'Consulta por plazo de entrega',
    summary: 'El cliente preguntó por el plazo. Se le explicó el calendario.',
    ...overrides,
  });
  const conversationCount = () =>
    prisma().osCustomerConversation.count({ where: { organizationId: orgA.id, customerId } });
  const commitmentsFor = (text: string) =>
    prisma().osCommitment.findMany({ where: { organizationId: orgA.id, text } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    orgA = await store.seedOrganization('B5 A', `b5-a-${createId()}`);
    orgB = await store.seedOrganization('B5 B', `b5-b-${createId()}`);

    m.owner = await seedMember(orgA.id, 'owner', []);
    m.orgReader = await seedMember(orgA.id, 'orgreader', ['commercial.org.read']);
    m.responsible = await seedMember(orgA.id, 'responsible', []);
    m.suspended = await seedMember(orgA.id, 'suspended', []);
    m.stranger = await seedMember(orgA.id, 'stranger', []);
    m.foreign = await seedMember(orgB.id, 'foreign', []);
    await prisma().osOrganizationMember.update({
      where: { id: m.suspended.member.id },
      data: { accessStatus: 'suspended' },
    });

    customerId = await seedCustomer(orgA.id, 'Cliente Atención B5', m.owner.member.id);
    foreignCustomerId = await seedCustomer(orgB.id, 'Cliente Ajeno B5', m.foreign.member.id);
  });

  after(async () => {
    await app.close();
  });

  it('saves a call with reason, note and a next step as a real commitment, unassigned by default', async () => {
    const text = `Llamar con el plazo ${createId()}`;
    const res = await call('POST', 'owner', '/customer-conversations', attention({
      nextStep: { description: text, ownerMemberId: m.responsible.member.id, dueDate: '2026-11-20' },
    }));
    assert.equal(res.status, 201, res.text);
    const { item, nextStep } = res.body;
    assert.equal(item.channel, 'call');
    assert.equal(item.reason, 'Consulta por plazo de entrega');
    assert.equal(item.assignedMemberId, null);
    assert.equal(item.nextAction, text);
    assert.equal(nextStep.status, 'created');
    assert.equal(item.nextStepCommitmentId, nextStep.commitmentId);

    const commitments = await commitmentsFor(text);
    assert.equal(commitments.length, 1);
    assert.equal(commitments[0]!.id, nextStep.commitmentId);
    assert.equal(commitments[0]!.ownerMemberId, m.responsible.member.id);
    assert.equal(commitments[0]!.partyId, customerId);
    assert.equal(commitments[0]!.origin, 'employee_entered');
    assert.equal(commitments[0]!.lifecycle, 'open');
    // Calendar day in La Paz, not the UTC day.
    assert.equal(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(commitments[0]!.dueAt!),
      '2026-11-20',
    );

    const row = await prisma().osCustomerConversation.findFirstOrThrow({ where: { id: item.id } });
    assert.equal(row.nextStepCommitmentId, nextStep.commitmentId);
    assert.equal(row.assignedMemberId, null);
    assert.equal(row.enteredByMemberId, m.owner.member.id);
  });

  it('refuses an attention without a reason or note and writes nothing', async () => {
    const before = await conversationCount();
    for (const channel of ['call', 'visit', 'in_person']) {
      const res = await call('POST', 'owner', '/customer-conversations', attention({ channel, reason: '   ' }));
      assert.equal(res.status, 400, channel);
      assert.match(res.text, /missing_reason/);
    }
    const noNote = await call('POST', 'owner', '/customer-conversations', attention({ summary: '' }));
    assert.equal(noNote.status, 400);
    assert.match(noNote.text, /missing_summary/);
    assert.equal(await conversationCount(), before);
  });

  it('accepts visit, in-person and manual WhatsApp records; never connects a provider', async () => {
    for (const channel of ['visit', 'in_person', 'whatsapp']) {
      const res = await call('POST', 'owner', '/customer-conversations', attention({ channel }));
      assert.equal(res.status, 201, `${channel}: ${res.text}`);
      assert.equal(res.body.item.channel, channel);
      assert.equal(res.body.item.providerConnected, false);
      assert.equal(res.body.item.providerCalled, false);
      assert.equal(res.body.nextStep, null);
    }
    const bogus = await call('POST', 'owner', '/customer-conversations', attention({ channel: 'sms' }));
    assert.equal(bogus.status, 400);
  });

  it('a partial next-step failure keeps the conversation, says so, and is recoverable without duplicates', async () => {
    const text = `Enviar muestra ${createId()}`;
    const failed = await call('POST', 'owner', '/customer-conversations', attention({
      nextStep: { description: text, ownerMemberId: m.suspended.member.id, dueDate: '2026-11-21' },
    }));
    assert.equal(failed.status, 201, failed.text);
    assert.equal(failed.body.nextStep.status, 'failed');
    assert.equal(failed.body.nextStep.code, 'VALIDATION_FAILED');
    assert.equal(failed.body.item.nextStepCommitmentId, null);
    assert.equal((await commitmentsFor(text)).length, 0);
    const savedId = failed.body.item.id as string;
    assert.ok(await prisma().osCustomerConversation.findUnique({ where: { id: savedId } }));

    const fixed = { description: text, ownerMemberId: m.responsible.member.id, dueDate: '2026-11-21' };
    const retry = await call('POST', 'owner', `/customer-conversations/${savedId}/next-step`, fixed);
    assert.equal(retry.status, 201, retry.text);
    assert.equal(retry.body.nextStep.status, 'created');
    assert.equal(retry.body.item.nextStepCommitmentId, retry.body.nextStep.commitmentId);

    const again = await call('POST', 'owner', `/customer-conversations/${savedId}/next-step`, fixed);
    assert.equal(again.body.nextStep.commitmentId, retry.body.nextStep.commitmentId);
    assert.equal((await commitmentsFor(text)).length, 1);
  });

  it('a stranger or another company cannot save a next step on or take a conversation', async () => {
    const created = await call('POST', 'owner', '/customer-conversations', attention());
    const id = created.body.item.id as string;
    const step = { description: 'Intento ajeno', ownerMemberId: m.responsible.member.id, dueDate: '2026-11-22' };
    for (const who of ['stranger', 'foreign']) {
      const org = who === 'foreign' ? orgB.id : orgA.id;
      const next = await call('POST', who, `/customer-conversations/${id}/next-step`, step, org);
      const take = await call('POST', who, `/customer-conversations/${id}/take`, undefined, org);
      assert.equal(next.status, 404, who);
      assert.equal(take.status, 404, who);
      assert.deepEqual(take.body, { code: 'NOT_FOUND' });
    }
    assert.equal((await commitmentsFor('Intento ajeno')).length, 0);
    const row = await prisma().osCustomerConversation.findUniqueOrThrow({ where: { id: id } });
    assert.equal(row.assignedMemberId, null);
    // A next step for a customer the actor cannot read is refused at creation, nothing saved.
    const before = await conversationCount();
    const unreadable = await call('POST', 'stranger', '/customer-conversations', attention());
    assert.equal(unreadable.status, 400);
    const foreignTarget = await call('POST', 'owner', '/customer-conversations', attention({ customerId: foreignCustomerId }));
    assert.equal(foreignTarget.status, 400);
    assert.equal(await conversationCount(), before);
  });

  it('a request cannot assign the conversation or claim a commitment', async () => {
    const res = await call('POST', 'owner', '/customer-conversations', attention({
      assignedMemberId: m.responsible.member.id,
      assignedLabel: 'Quien sea',
      assignedAt: '2026-11-16T14:00:00.000Z',
      nextStepCommitmentId: 'commitment-no-existe',
    }));
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.item.assignedMemberId, null);
    assert.equal(res.body.item.nextStepCommitmentId, null);
    const row = await prisma().osCustomerConversation.findUniqueOrThrow({ where: { id: res.body.item.id } });
    assert.equal(row.assignedMemberId, null);
    assert.equal(row.nextStepCommitmentId, null);
  });

  it('Tomar conversación has one winner under concurrency and never changes the account owner', async () => {
    const created = await call('POST', 'owner', '/customer-conversations', attention());
    const id = created.body.item.id as string;
    const accountBefore = await prisma().osCommercialAccount.findFirstOrThrow({
      where: { organizationId: orgA.id, partyId: customerId },
    });

    const results = await Promise.all([
      call('POST', 'owner', `/customer-conversations/${id}/take`),
      call('POST', 'orgReader', `/customer-conversations/${id}/take`),
    ]);
    const winners = results.filter((r) => r.status === 201);
    const losers = results.filter((r) => r.status === 409);
    assert.equal(winners.length, 1, results.map((r) => r.text).join(' | '));
    assert.equal(losers.length, 1);
    assert.equal(losers[0]!.body.code, 'ALREADY_ASSIGNED');
    assert.ok(losers[0]!.body.assignedLabel);

    const row = await prisma().osCustomerConversation.findUniqueOrThrow({ where: { id } });
    assert.equal(row.assignedMemberId, winners[0]!.body.item.assignedMemberId);
    assert.ok(row.assignedAt);
    const loserWho = winners[0]!.body.item.assignedMemberId === m.owner.member.id ? 'orgReader' : 'owner';
    const winnerWho = loserWho === 'owner' ? 'orgReader' : 'owner';
    assert.equal(row.assignedMemberId, m[winnerWho]!.member.id);

    // Same member again is a no-op; the other cannot take it over.
    const repeat = await call('POST', winnerWho, `/customer-conversations/${id}/take`);
    assert.equal(repeat.status, 201);
    assert.equal(repeat.body.item.assignedMemberId, m[winnerWho]!.member.id);
    const takeover = await call('POST', loserWho, `/customer-conversations/${id}/take`);
    assert.equal(takeover.status, 409);
    assert.equal(
      (await prisma().osCustomerConversation.findUniqueOrThrow({ where: { id } })).assignedMemberId,
      m[winnerWho]!.member.id,
    );

    const accountAfter = await prisma().osCommercialAccount.findFirstOrThrow({
      where: { organizationId: orgA.id, partyId: customerId },
    });
    assert.equal(accountAfter.ownerMemberId, accountBefore.ownerMemberId);
    assert.equal(accountAfter.ownerMemberId, m.owner.member.id);

    const listed = await call('GET', 'orgReader', `/customer-conversations?partyId=${customerId}`);
    const listedItem = listed.body.items.find((i: { id: string }) => i.id === id);
    assert.equal(listedItem.assignedMemberId, m[winnerWho]!.member.id);
  });

  it('a suspended member cannot take', async () => {
    const created = await call('POST', 'owner', '/customer-conversations', attention());
    const id = created.body.item.id as string;
    const res = await call('POST', 'suspended', `/customer-conversations/${id}/take`);
    assert.equal(res.status, 403);
    assert.equal(
      (await prisma().osCustomerConversation.findUniqueOrThrow({ where: { id } })).assignedMemberId,
      null,
    );
  });

  it('idempotent replay of the record command does not duplicate the conversation or the commitment', async () => {
    const text = `Seguir pedido ${createId()}`;
    const key = `b5-replay-${createId()}`;
    const body = attention({
      nextStep: { description: text, ownerMemberId: m.responsible.member.id, dueDate: '2026-11-23' },
    });
    const first = await call('POST', 'owner', '/customer-conversations', body, orgA.id, { 'idempotency-key': key });
    const second = await call('POST', 'owner', '/customer-conversations', body, orgA.id, { 'idempotency-key': key });
    assert.equal(first.status, 201, first.text);
    assert.equal(second.status, 201, second.text);
    assert.equal(second.body.item.id, first.body.item.id);
    assert.equal(second.body.nextStep.commitmentId, first.body.nextStep.commitmentId);
    assert.equal((await commitmentsFor(text)).length, 1);
  });
});
