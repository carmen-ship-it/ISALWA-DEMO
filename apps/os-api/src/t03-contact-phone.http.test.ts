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
import { pickQuoteContact } from './quote-pdf.service';

/**
 * T03 contact endpoints (A2 §58, §66; T03 C5–C7): phone and WhatsApp are one boundary. Changing
 * or retiring either needs authority, reason, verification method and version; numbers carry an
 * explicit country; every association is dated history; a number formerly on another customer
 * opens an identity review. No message is sent anywhere (T12). Real Nest app, disposable Postgres.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const OLD_PHONE = '+59170000123';
const NEW_PHONE = '+59171111456';
const OTHER_WHATSAPP = '+59172222789';
const bo = (number: string) => ({ country: 'BO', number });

describeHttp('T03 contact endpoint change, retirement and history over HTTP (disposable Postgres)', () => {
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
  const endpointEvents = () =>
    prisma().osBusinessEvent.count({ where: { organizationId: org.id, eventType: { startsWith: 'contact.endpoint.' } } });
  const associations = (contactId: string) =>
    prisma().osContactEndpointAssociation.findMany({ where: { organizationId: org.id, contactId }, orderBy: [{ startedAt: 'asc' }, { channel: 'asc' }] });

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
    for (const channel of ['phone', 'whatsapp']) {
      await prisma().osContactEndpointAssociation.create({
        data: {
          id: createId(),
          organizationId: org.id,
          partyId: ids.party,
          contactId: ids.contact,
          channel,
          numberE164: OLD_PHONE,
          startedAt: new Date('2020-01-01'),
        },
      });
    }
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
    channel: 'phone',
    newNumber: bo('71111456'),
    reason: 'number_changed',
    verificationMethod: 'known_contact_confirmation',
    ...overrides,
  });

  it('refuses incomplete changes and numbers without an explicit, valid country; writes nothing', async () => {
    const before = await endpointEvents();
    for (const [label, body] of [
      ['no verification method', { ...change(), verificationMethod: undefined }],
      ['unknown verification method', change({ verificationMethod: 'sender_says_so' })],
      ['other without a note', change({ reason: 'other' })],
      ['no channel', { ...change(), channel: undefined }],
      ['unknown channel', change({ channel: 'sms' })],
      ['same number', change({ newNumber: bo(OLD_PHONE) })],
      ['not a phone', change({ newNumber: bo('abc') })],
      ['raw string, no country', change({ newNumber: '71111456' })],
      ['unsupported country', change({ newNumber: { country: 'AR', number: '1123456789' } })],
      ['another calling code', change({ newNumber: bo('+54 11 2345 6789') })],
      ['country guessed from digit count', change({ newNumber: bo('59171111456') })],
    ] as const) {
      const reply = await command('editor', 'ChangeContactEndpoint', body as Record<string, unknown>);
      assert.equal(reply.status, 400, label);
    }
    assert.equal((await contact()).phone, OLD_PHONE);
    assert.equal(await endpointEvents(), before);
    assert.equal((await associations(ids.contact!)).length, 2);
  });

  it('only someone who may edit this customer changes either channel; others get the usual answers', async () => {
    for (const channel of ['phone', 'whatsapp']) {
      const workOnly = await command('workOnly', 'ChangeContactEndpoint', change({ channel }));
      assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }], channel);
      const stranger = await command('stranger', 'ChangeContactEndpoint', change({ channel }));
      const missing = await command('stranger', 'ChangeContactEndpoint', change({ channel, partyId: createId() }));
      assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }], channel);
      assert.deepEqual(stranger, missing);
    }
    const otherContact = await command('editor', 'ChangeContactEndpoint', change({ contactId: createId() }));
    assert.deepEqual([otherContact.status, otherContact.body], [404, { code: 'NOT_FOUND' }]);
    const row = await contact();
    assert.deepEqual([row.phone, row.whatsapp], [OLD_PHONE, OLD_PHONE]);
  });

  it('changes the phone with reason and verification; WhatsApp on the same number follows; history ends the old rows', async () => {
    const reply = await command(
      'editor',
      'ChangeContactEndpoint',
      change({ newNumber: bo('7111-1456'), reason: 'entry_error', verificationMethod: 'in_person', evidenceNote: 'Confirmó en tienda' }),
    );
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contact();
    assert.deepEqual(
      [row.phone, row.whatsapp, row.phoneDisplay, row.whatsappDisplay, row.phoneStatus, row.whatsappStatus, row.version, row.phoneRetiredAt],
      [NEW_PHONE, NEW_PHONE, '7111-1456', '7111-1456', 'unverified', 'unverified', 1, null],
    );
    const history = await associations(ids.contact!);
    assert.deepEqual(
      history.map((a) => [a.channel, a.numberE164, a.endedAt ? a.endReason : 'active', a.enteredText, a.verificationMethod]),
      [
        ['phone', OLD_PHONE, 'changed:entry_error', null, null],
        ['whatsapp', OLD_PHONE, 'changed:entry_error', null, null],
        ['phone', NEW_PHONE, 'active', '7111-1456', 'in_person'],
        ['whatsapp', NEW_PHONE, 'active', '7111-1456', 'in_person'],
      ],
    );
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id, eventType: 'contact.endpoint.changed' } });
    const payload = event.payloadJson as Record<string, unknown>;
    assert.deepEqual(
      [payload.channel, payload.previousMasked, payload.numberMasked, payload.reason, payload.verificationMethod, payload.evidenceNote, payload.whatsappFollows, payload.identityReviewRequired],
      ['phone', '•••123', '•••456', 'entry_error', 'in_person', 'Confirmó en tienda', true, false],
    );
    assert.equal(event.actorMemberId, m.editor!.member.id);
    const audit = await prisma().osAuditLog.findFirstOrThrow({ where: { organizationId: org.id, action: 'contact.endpoint.changed' } });
    for (const digits of ['70000123', '71111456']) {
      assert.equal(JSON.stringify(payload).includes(digits), false, `event keeps ${digits} out`);
      assert.equal(JSON.stringify(audit).includes(digits), false, `audit keeps ${digits} out`);
    }
    const stale = await command('editor', 'ChangeContactEndpoint', change({ newNumber: bo('72222789') }));
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
  });

  it('changes WhatsApp alone through the same rules; the phone stays', async () => {
    const unverified = await command('editor', 'ChangeContactEndpoint', { ...change({ channel: 'whatsapp', expectedVersion: 1 }), verificationMethod: undefined });
    assert.equal(unverified.status, 400);
    const reply = await command('editor', 'ChangeContactEndpoint', change({ channel: 'whatsapp', expectedVersion: 1, newNumber: bo('+591 72222789') }));
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.whatsappStatus, row.version], [NEW_PHONE, OTHER_WHATSAPP, 'unverified', 2]);
    const active = (await associations(ids.contact!)).filter((a) => !a.endedAt);
    assert.deepEqual(active.map((a) => [a.channel, a.numberE164]).sort(), [['phone', NEW_PHONE], ['whatsapp', OTHER_WHATSAPP]]);

    const detail = await fetch(`${baseUrl}/v1/parties/${ids.party}`, { headers: headers(m.editor!) });
    assert.equal(detail.status, 200);
    const shown = ((await detail.json()) as { contacts: Array<Record<string, unknown>> }).contacts.find((c) => c.id === ids.contact)!;
    assert.deepEqual(
      [shown.phone, shown.phoneDisplay, shown.phoneStatus, shown.whatsapp, shown.whatsappDisplay, shown.whatsappStatus],
      [NEW_PHONE, '7111-1456', 'unverified', OTHER_WHATSAPP, '+591 72222789', 'unverified'],
    );
  });

  it('retires WhatsApp and then the phone: neither stays a current destination; retiring again is refused', async () => {
    const target = { partyId: ids.party, contactId: ids.contact, reason: 'no_longer_belongs' };
    const wa = await command('editor', 'RetireContactEndpoint', { ...target, channel: 'whatsapp', expectedVersion: 2 });
    assert.equal(wa.status, 201, JSON.stringify(wa.body));
    let row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.whatsappRetiredReason, row.version], [NEW_PHONE, null, 'no_longer_belongs', 3]);
    assert.ok(row.whatsappRetiredAt);

    const phone = await command('editor', 'RetireContactEndpoint', { ...target, channel: 'phone', expectedVersion: 3 });
    assert.equal(phone.status, 201, JSON.stringify(phone.body));
    row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.phoneRetiredReason, row.version, row.status], [null, null, 'no_longer_belongs', 4, 'active']);
    assert.equal((await associations(ids.contact!)).filter((a) => !a.endedAt).length, 0);
    assert.deepEqual(pickQuoteContact([{ ...row, status: 'active' } as never]).contactPhone, null);

    const again = await command('editor', 'RetireContactEndpoint', { ...target, channel: 'phone', expectedVersion: 4 });
    assert.equal(again.status, 400);
  });

  it('a retired number may be registered for another customer; it opens an identity review and reveals nothing', async () => {
    const registered = await command('steward', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Otro cliente con el número retirado',
      contact: { givenName: 'Luis' },
      phone: bo('+591 7111 1456'),
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const text = JSON.stringify(registered.body);
    for (const leak of [ids.party!, ids.contact!, 'T03 Phone Cliente', 'Rosa', 'Quispe']) assert.equal(text.includes(leak), false, leak);
    const newContactId = String((registered.body.data as Record<string, unknown>).contactId);
    const created = await prisma().osContact.findUniqueOrThrow({ where: { id: newContactId } });
    assert.deepEqual([created.phone, created.phoneDisplay, created.phoneStatus], [NEW_PHONE, '+591 7111 1456', 'identity_review']);
    const review = await prisma().osContactIdentityReview.findFirstOrThrow({ where: { organizationId: org.id, contactId: newContactId } });
    const matched = await prisma().osContactEndpointAssociation.findUniqueOrThrow({ where: { id: review.matchedAssociationId } });
    assert.deepEqual([review.status, review.channel, matched.partyId, matched.numberE164], ['open', 'phone', ids.party, NEW_PHONE]);
    assert.equal(pickQuoteContact([created as never]).contactPhone, null, 'no PDF destination while under review');

    const fresh = await command('steward', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente con número nuevo',
      contact: { givenName: 'Ana' },
      phone: bo('6 555 0101'),
    });
    assert.equal(fresh.status, 201, JSON.stringify(fresh.body));
    const freshContact = await prisma().osContact.findUniqueOrThrow({ where: { id: String((fresh.body.data as Record<string, unknown>).contactId) } });
    assert.deepEqual([freshContact.phone, freshContact.phoneStatus], ['+59165550101', 'unverified']);
    assert.equal(await prisma().osContactIdentityReview.count({ where: { organizationId: org.id, contactId: freshContact.id } }), 0);
    assert.equal(pickQuoteContact([freshContact as never]).contactPhone, '+59165550101');
  });

  it('the general contact edit cannot set or change either number; new contacts use the same number contract', async () => {
    const edit = (extra: Record<string, unknown>) =>
      command('editor', 'UpdateContact', {
        organizationPartyId: ids.party,
        contactId: ids.contact,
        givenName: 'Rosa',
        familyName: 'Quispe Mamani',
        ...extra,
      });
    for (const [label, extra] of [
      ['phone', { phone: bo('73333000') }],
      ['whatsapp', { whatsapp: bo('73333000') }],
      ['raw whatsapp string', { whatsapp: '+59173333000' }],
    ] as const) {
      const bypass = await edit(extra);
      assert.equal(bypass.status, 400, label);
    }
    let row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.familyName], [null, null, 'Quispe']);
    const nameOnly = await edit({});
    assert.equal(nameOnly.status, 201, JSON.stringify(nameOnly.body));
    row = await contact();
    assert.deepEqual([row.phone, row.whatsapp, row.familyName], [null, null, 'Quispe Mamani']);

    const rawNew = await command('editor', 'UpdateContact', { organizationPartyId: ids.party, givenName: 'Eva', familyName: 'Mamani', whatsapp: '72222789' });
    assert.equal(rawNew.status, 400);
    const added = await command('editor', 'UpdateContact', { organizationPartyId: ids.party, givenName: 'Eva', familyName: 'Mamani', whatsapp: bo('7222 2789') });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    const addedId = String((added.body.data as Record<string, unknown>).contactId);
    const addedRow = await prisma().osContact.findUniqueOrThrow({ where: { id: addedId } });
    assert.deepEqual([addedRow.whatsapp, addedRow.whatsappDisplay, addedRow.whatsappStatus, addedRow.phone], [OTHER_WHATSAPP, '7222 2789', 'unverified', null]);
    assert.equal(await prisma().osContactIdentityReview.count({ where: { organizationId: org.id, contactId: addedId } }), 0, 'same customer: no review');
  });

  it('the customer timeline shows masked numbers only', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m.editor!) });
    assert.equal(res.status, 200);
    const text = await res.text();
    const items = JSON.parse(text).items as Array<{ eventType: string; facts: Record<string, unknown> }>;
    const changed = items.filter((item) => item.eventType === 'contact.endpoint.changed');
    const retired = items.filter((item) => item.eventType === 'contact.endpoint.retired');
    assert.deepEqual(
      changed.map((c) => [c.facts.channel, c.facts.previousMasked, c.facts.numberMasked]).sort(),
      [['phone', '•••123', '•••456'], ['whatsapp', '•••456', '•••789']],
    );
    assert.deepEqual(retired.map((r) => [r.facts.channel, r.facts.retiredMasked, r.facts.reason]).sort(), [
      ['phone', '•••456', 'no_longer_belongs'],
      ['whatsapp', '•••789', 'no_longer_belongs'],
    ]);
    for (const digits of ['70000123', '71111456', '72222789']) assert.equal(text.includes(digits), false, digits);
    assert.equal(text.includes('Confirmó en tienda'), false, 'evidence note stays out of the timeline');
  });
});
