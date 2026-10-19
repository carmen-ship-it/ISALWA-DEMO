import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { ProjectionRunner } from '@isalwa/os-query';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * T03 L2: a person records a contact's follow-up preference per channel. Restricting is always
 * accepted; relaxing needs a staff record with confirmed identity and a note. Every reader of the
 * customer sees the current preference; the note stays with editors. Real Nest app, disposable
 * Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const bo = (number: string) => ({ country: 'BO', number });
const NOTE = 'Escribió: no me manden más mensajes';
const ALLOW_NOTE = 'Pidió en tienda volver a recibir seguimiento';

describeHttp('T03 contact follow-up preferences over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded, key = `t03-l2-${createId()}`): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': key,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>, key?: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!, key), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function read(who: string, partyId = ids.party!, contactId = ids.contact!) {
    const res = await fetch(`${baseUrl}/v1/parties/${partyId}/contacts/${contactId}/followup-preferences`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03l2.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function register(name: string, phone: string): Promise<{ partyId: string; contactId: string }> {
    const reply = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: name,
      contact: { givenName: 'Contacto', familyName: name },
      phone: bo(phone),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const data = reply.body.data as Record<string, unknown>;
    return { partyId: String(data.partyId), contactId: String(data.contactId) };
  }

  const rows = () => prisma().osContactFollowupPreference.findMany({ where: { organizationId: org.id, contactId: ids.contact! }, orderBy: { channel: 'asc' } });
  const events = () =>
    prisma().osBusinessEvent.findMany({ where: { organizationId: org.id, eventType: 'contact.followup_preference.changed' }, orderBy: { occurredAt: 'asc' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 L2 Org', `t03-l2-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.workOnly = await seedMember('workonly', ['commercial.customer.edit']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);
    const customer = await register('Cliente Preferencias L2', '70009001');
    ids.party = customer.partyId;
    ids.contact = customer.contactId;
    await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: ids.party,
        primaryOwnerMemberId: m.owner!.member.id,
        actingAdvisorMemberId: m.workOnly!.member.id,
        coveredActions: ['commercial.work'],
        startsAt: new Date('2020-01-01'),
        recordedAt: new Date('2020-01-01'),
      },
    });
  });

  after(async () => {
    await app.close();
  });

  const restrict = (overrides: Record<string, unknown> = {}) => ({
    partyId: ids.party,
    contactId: ids.contact,
    channel: 'whatsapp',
    preference: 'no_unsolicited_followups',
    source: 'customer_message',
    identityConfirmed: true,
    expectedVersion: 0,
    note: NOTE,
    ...overrides,
  });

  it('every reader of the customer sees one entry per channel, none recorded yet', async () => {
    for (const who of ['owner', 'workOnly']) {
      const reply = await read(who);
      assert.equal(reply.status, 200, reply.text);
      assert.deepEqual(
        reply.body.items.map((i: Record<string, unknown>) => [i.channel, i.preference, i.version]),
        [['whatsapp', null, 0], ['phone', null, 0], ['email', null, 0]],
      );
    }
    const stranger = await read('stranger');
    const missing = await read('stranger', createId());
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual([missing.status, missing.body], [stranger.status, stranger.body]);
  });

  it('refuses unconfirmed senders, relaxing without a staff record, unauthorized actors and stale versions; stores nothing', async () => {
    for (const [label, body] of [
      ['customer message without a confirmed sender', restrict({ identityConfirmed: false })],
      ['allowed from a customer message', restrict({ preference: 'allowed', note: ALLOW_NOTE })],
      ['allowed without a note', restrict({ preference: 'allowed', source: 'staff_recorded', note: undefined })],
      ['allowed with a generic yes', restrict({ preference: 'allowed', source: 'staff_recorded', note: 'sí' })],
      ['unknown channel', restrict({ channel: 'sms' })],
    ] as const) {
      const reply = await command('owner', 'SetContactFollowupPreference', body as Record<string, unknown>);
      assert.equal(reply.status, 400, `${label}: ${JSON.stringify(reply.body)}`);
    }
    const stale = await command('owner', 'SetContactFollowupPreference', restrict({ expectedVersion: 1 }));
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const workOnly = await command('workOnly', 'SetContactFollowupPreference', restrict());
    assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await command('stranger', 'SetContactFollowupPreference', restrict());
    const missing = await command('stranger', 'SetContactFollowupPreference', restrict({ partyId: createId() }));
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual(stranger, missing);
    assert.deepEqual(await rows(), []);
    assert.deepEqual(await events(), []);
  });

  it('records a restriction with who, source and version; a replay adds nothing', async () => {
    const key = `t03-l2-restrict-${createId()}`;
    const reply = await command('owner', 'SetContactFollowupPreference', restrict(), key);
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    assert.deepEqual(await command('owner', 'SetContactFollowupPreference', restrict(), key), reply);
    const [row] = await rows();
    assert.deepEqual(
      [row!.channel, row!.preference, row!.source, row!.identityConfirmed, row!.version, row!.recordedByMemberId],
      ['whatsapp', 'no_unsolicited_followups', 'customer_message', true, 1, m.owner!.member.id],
    );
    const recorded = await events();
    assert.equal(recorded.length, 1);
    const payload = recorded[0]!.payloadJson as Record<string, unknown>;
    assert.deepEqual([payload.from, payload.to, payload.source, payload.version], [null, 'no_unsolicited_followups', 'customer_message', 1]);
    const view = await read('workOnly');
    assert.deepEqual(view.body.items[0], {
      channel: 'whatsapp',
      preference: 'no_unsolicited_followups',
      source: 'customer_message',
      identityConfirmed: true,
      version: 1,
      updatedAt: row!.updatedAt.toISOString(),
    });
    assert.equal(view.text.includes(NOTE), false, 'the note is not part of the preference read');
  });

  it('relaxing needs the current version; the earlier record stays in history', async () => {
    const allow = restrict({ preference: 'allowed', source: 'staff_recorded', note: ALLOW_NOTE, expectedVersion: 1 });
    const reply = await command('owner', 'SetContactFollowupPreference', allow);
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const stale = await command('owner', 'SetContactFollowupPreference', allow);
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const current = await rows();
    assert.deepEqual(current.map((r) => [r.channel, r.preference, r.version]), [['whatsapp', 'allowed', 2]]);
    const history = (await events()).map((e) => (e.payloadJson as Record<string, unknown>).to);
    assert.deepEqual(history, ['no_unsolicited_followups', 'allowed']);
  });

  it('a former contact\'s preference cannot be changed', async () => {
    const customer = await register('Cliente Excontacto L2', '70009002');
    const ended = await command('owner', 'EndContactRelationship', {
      partyId: customer.partyId,
      contactId: customer.contactId,
      expectedVersion: 0,
      reason: 'left_company',
    });
    assert.equal(ended.status, 201, JSON.stringify(ended.body));
    const reply = await command('owner', 'SetContactFollowupPreference', restrict({ partyId: customer.partyId, contactId: customer.contactId }));
    assert.deepEqual([reply.status, reply.body], [400, { code: 'CONFLICT' }]);
  });

  it('the timeline gives the note only to customer editors', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const timeline = async (who: string) => {
      const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m[who]!) });
      assert.equal(res.status, 200);
      const items = (await res.json()).items as Array<{ eventType: string; facts: Record<string, unknown> }>;
      return items.filter((item) => item.eventType === 'contact.followup_preference.changed');
    };
    const owner = await timeline('owner');
    assert.deepEqual(owner.map((i) => i.facts.note).sort(), [ALLOW_NOTE, NOTE].sort());
    const workOnly = await timeline('workOnly');
    assert.deepEqual(workOnly.map((i) => i.facts.to).sort(), ['allowed', 'no_unsolicited_followups']);
    assert.equal(workOnly.some((i) => i.facts.note !== undefined), false);
  });
});
