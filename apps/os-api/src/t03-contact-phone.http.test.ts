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
 * T03 phone maintenance (A2 §58, §66): change a contact's number with reason and a human
 * verification method, or retire it. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const OLD_PHONE = '+59170000123';
const NEW_PHONE = '+59171111456';

describeHttp('T03 contact phone change and retirement over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `t03-phone-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03phone.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function grantCoverage(advisor: string, coveredActions: string[]) {
    await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: ids.party!,
        primaryOwnerMemberId: m.owner!.member.id,
        actingAdvisorMemberId: m[advisor]!.member.id,
        coveredActions,
        startsAt: new Date('2020-01-01'),
        recordedAt: new Date('2020-01-01'),
      },
    });
  }

  const contact = () => prisma().osContact.findUniqueOrThrow({ where: { id: ids.contact! } });
  const phoneEvents = () => prisma().osBusinessEvent.count({ where: { organizationId: org.id, eventType: { startsWith: 'contact.phone.' } } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 Phone Org', `t03-phone-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create']);
    m.editor = await seedMember('editor', ['commercial.customer.edit']);
    m.workOnly = await seedMember('workonly', ['commercial.customer.edit']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);
    m.steward = await seedMember('steward', ['master_data.admin']);

    ids.party = createId();
    ids.contact = createId();
    await prisma().osParty.create({ data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'T03 Phone Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id } });
    await prisma().osContact.create({
      data: { id: ids.contact, organizationId: org.id, organizationPartyId: ids.party, givenName: 'Rosa', familyName: 'Quispe', phone: OLD_PHONE, whatsapp: OLD_PHONE },
    });
    await grantCoverage('editor', ['customer.edit']);
    await grantCoverage('workOnly', ['commercial.work']);
  });

  after(async () => {
    await app.close();
  });

  const change = (overrides: Record<string, unknown> = {}) => ({
    partyId: ids.party,
    contactId: ids.contact,
    expectedVersion: 0,
    newPhone: '71111456',
    reason: 'number_changed',
    verificationMethod: 'known_contact_confirmation',
    ...overrides,
  });

  it('refuses incomplete or empty changes and writes nothing', async () => {
    const before = await phoneEvents();
    for (const [label, body] of [
      ['no verification method', { ...change(), verificationMethod: undefined }],
      ['unknown verification method', change({ verificationMethod: 'sender_says_so' })],
      ['other without a note', change({ reason: 'other' })],
      ['same number', change({ newPhone: OLD_PHONE })],
      ['not a phone', change({ newPhone: 'abc' })],
    ] as const) {
      const reply = await command('editor', 'ChangeContactPhone', body as Record<string, unknown>);
      assert.equal(reply.status, 400, label);
    }
    assert.equal((await contact()).phone, OLD_PHONE);
    assert.equal(await phoneEvents(), before);
  });

  it('only someone who may edit this customer changes the number; others get the usual answers', async () => {
    const workOnly = await command('workOnly', 'ChangeContactPhone', change());
    assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await command('stranger', 'ChangeContactPhone', change());
    const missing = await command('stranger', 'ChangeContactPhone', change({ partyId: createId() }));
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual(stranger, missing);
    const otherContact = await command('editor', 'ChangeContactPhone', change({ contactId: createId() }));
    assert.deepEqual([otherContact.status, otherContact.body], [404, { code: 'NOT_FOUND' }]);
    assert.equal((await contact()).phone, OLD_PHONE);
  });

  it('changes the number with reason and verification; WhatsApp on the same number follows; history keeps both', async () => {
    const reply = await command('editor', 'ChangeContactPhone', change({ reason: 'entry_error', verificationMethod: 'in_person', evidenceNote: 'Confirmó en tienda' }));
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.version, row.phoneRetiredAt], [NEW_PHONE, NEW_PHONE, 1, null]);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id, eventType: 'contact.phone.changed' } });
    const payload = event.payloadJson as Record<string, unknown>;
    assert.deepEqual(
      [payload.previousPhone, payload.phone, payload.previousPhoneMasked, payload.phoneMasked, payload.reason, payload.verificationMethod, payload.evidenceNote, payload.whatsappFollows],
      [OLD_PHONE, NEW_PHONE, '•••123', '•••456', 'entry_error', 'in_person', 'Confirmó en tienda', true],
    );
    assert.equal(event.actorMemberId, m.editor!.member.id);
    const stale = await command('editor', 'ChangeContactPhone', change({ newPhone: '72222789' }));
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
  });

  it('retires the number: it leaves the contact and the duplicate check; retiring again is refused', async () => {
    const reply = await command('editor', 'RetireContactPhone', {
      partyId: ids.party,
      contactId: ids.contact,
      expectedVersion: 1,
      reason: 'no_longer_belongs',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.phoneRetiredReason, row.version, row.status], [null, null, 'no_longer_belongs', 2, 'active']);
    assert.ok(row.phoneRetiredAt);
    const again = await command('editor', 'RetireContactPhone', { partyId: ids.party, contactId: ids.contact, expectedVersion: 2, reason: 'no_longer_belongs' });
    assert.equal(again.status, 400);

    const registered = await command('steward', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Otro cliente con el número retirado',
      contact: { givenName: 'Luis' },
      phone: NEW_PHONE,
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
  });

  it('the general contact edit cannot set or change an existing contact\'s number', async () => {
    const edit = (phone: string) =>
      command('editor', 'UpdateContact', {
        organizationPartyId: ids.party,
        contactId: ids.contact,
        givenName: 'Rosa',
        familyName: 'Quispe Mamani',
        phone,
      });
    const bypass = await edit('+59173333000');
    assert.deepEqual([bypass.status, bypass.body], [400, { code: 'VALIDATION_FAILED' }]);
    assert.deepEqual([(await contact()).phone, (await contact()).familyName], [null, 'Quispe']);
    const nameOnly = await edit('');
    assert.equal(nameOnly.status, 201, JSON.stringify(nameOnly.body));
    assert.deepEqual([(await contact()).phone, (await contact()).familyName], [null, 'Quispe Mamani']);
  });

  it('the customer timeline shows masked numbers only', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m.editor!) });
    assert.equal(res.status, 200);
    const text = await res.text();
    const items = (JSON.parse(text).items as Array<{ eventType: string; facts: Record<string, unknown> }>);
    const changed = items.find((item) => item.eventType === 'contact.phone.changed');
    const retired = items.find((item) => item.eventType === 'contact.phone.retired');
    assert.deepEqual([changed?.facts.previousPhoneMasked, changed?.facts.phoneMasked, changed?.facts.verificationMethod], ['•••123', '•••456', 'in_person']);
    assert.deepEqual([retired?.facts.retiredPhoneMasked, retired?.facts.reason], ['•••456', 'no_longer_belongs']);
    for (const digits of ['70000123', '71111456']) assert.equal(text.includes(digits), false, digits);
    assert.equal(text.includes('Confirmó en tienda'), false, 'evidence note stays out of the timeline');
  });
});
