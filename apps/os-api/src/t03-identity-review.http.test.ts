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
 * T03 C7: a number formerly held by another customer opens an identity review on the new
 * holder. An editor of the new customer confirms (number in use, unverified) or rejects (number
 * retired). Changing or retiring the number first supersedes the review. Nothing about the
 * earlier customer is shown. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const bo = (number: string) => ({ country: 'BO', number });
const FORMER_NAME = 'Cliente Anterior C7';

describeHttp('T03 identity review resolution over HTTP (disposable Postgres)', () => {
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
      'idempotency-key': `t03-c7-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03c7.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  /** Registers a customer with a phone; returns party and contact ids. */
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

  async function retirePhone(partyId: string, contactId: string) {
    const contact = await prisma().osContact.findUniqueOrThrow({ where: { id: contactId } });
    const reply = await command('owner', 'RetireContactEndpoint', {
      partyId,
      contactId,
      expectedVersion: contact.version,
      channel: 'phone',
      reason: 'no_longer_belongs',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
  }

  const contactRow = (contactId: string) => prisma().osContact.findUniqueOrThrow({ where: { id: contactId } });
  const reviews = (contactId: string) => prisma().osContactIdentityReview.findMany({ where: { organizationId: org.id, contactId }, orderBy: { openedAt: 'asc' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 C7 Org', `t03-c7-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.workOnly = await seedMember('workonly', ['commercial.customer.edit']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);

    const former = await register(FORMER_NAME, '70007001');
    ids.formerParty = former.partyId;
    ids.formerContact = former.contactId;
    await retirePhone(former.partyId, former.contactId);
    const holder = await register('Nuevo Titular C7', '7000 7001');
    ids.party = holder.partyId;
    ids.contact = holder.contactId;
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

  const resolve = (overrides: Record<string, unknown> = {}) => ({
    partyId: ids.party,
    contactId: ids.contact,
    expectedVersion: 0,
    channel: 'phone',
    decision: 'confirmed',
    verificationMethod: 'in_person',
    ...overrides,
  });

  it('the new holder shows the number under review, with the resolve flag and nothing about the earlier customer', async () => {
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}`, { headers: headers(m.owner!) });
    assert.equal(res.status, 200);
    const text = await res.text();
    const body = JSON.parse(text) as { contacts: Array<Record<string, unknown>>; customerAuthority: Record<string, boolean> };
    const contact = body.contacts.find((c) => c.id === ids.contact)!;
    assert.deepEqual([contact.phone, contact.phoneStatus], ['+59170007001', 'identity_review']);
    assert.equal(body.customerAuthority.canResolveIdentityReview, true);
    for (const leak of [ids.formerParty!, ids.formerContact!, FORMER_NAME]) assert.equal(text.includes(leak), false, leak);
    assert.equal(pickQuoteContact([(await contactRow(ids.contact!)) as never]).contactPhone, null);
  });

  it('refuses incomplete or unauthorized decisions and changes nothing', async () => {
    for (const [label, body] of [
      ['no verification method', { ...resolve(), verificationMethod: undefined }],
      ['unknown decision', resolve({ decision: 'maybe' })],
      ['channel without a review', resolve({ channel: 'whatsapp' })],
    ] as const) {
      const reply = await command('owner', 'ResolveContactIdentityReview', body as Record<string, unknown>);
      assert.equal(reply.status, 400, label);
    }
    const stale = await command('owner', 'ResolveContactIdentityReview', resolve({ expectedVersion: 7 }));
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const workOnly = await command('workOnly', 'ResolveContactIdentityReview', resolve());
    assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await command('stranger', 'ResolveContactIdentityReview', resolve());
    const missing = await command('stranger', 'ResolveContactIdentityReview', resolve({ partyId: createId() }));
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual(stranger, missing);
    assert.equal((await contactRow(ids.contact!)).phoneStatus, 'identity_review');
    assert.deepEqual((await reviews(ids.contact!)).map((r) => r.status), ['open']);
  });

  it('confirming puts the number in use as unverified; the record names the decision only', async () => {
    const reply = await command('owner', 'ResolveContactIdentityReview', resolve({ note: 'Confirmó en tienda con documento' }));
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contactRow(ids.contact!);
    assert.deepEqual([row.phone, row.phoneStatus, row.version], ['+59170007001', 'unverified', 1]);
    const [review] = await reviews(ids.contact!);
    assert.deepEqual(
      [review!.status, review!.resolvedByMemberId, review!.verificationMethod, review!.note],
      ['confirmed', m.owner!.member.id, 'in_person', 'Confirmó en tienda con documento'],
    );
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id, eventType: 'contact.identity_review.resolved' } });
    const text = JSON.stringify(event.payloadJson);
    for (const leak of ['70007001', ids.formerParty!, ids.formerContact!, review!.matchedAssociationId]) assert.equal(text.includes(leak), false, leak);
    assert.equal(pickQuoteContact([row as never]).contactPhone, '+59170007001');
    const again = await command('owner', 'ResolveContactIdentityReview', resolve({ expectedVersion: 1 }));
    assert.equal(again.status, 400);
  });

  it('rejecting retires the number and ends its association', async () => {
    const former = await register('Otro Anterior C7', '70007002');
    await retirePhone(former.partyId, former.contactId);
    const holder = await register('Titular Rechazado C7', '70007002');
    assert.equal((await contactRow(holder.contactId)).phoneStatus, 'identity_review');
    const reply = await command('owner', 'ResolveContactIdentityReview', {
      ...resolve({ partyId: holder.partyId, contactId: holder.contactId, decision: 'rejected', verificationMethod: 'known_contact_confirmation' }),
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await contactRow(holder.contactId);
    assert.deepEqual([row.phone, row.phoneStatus, row.phoneRetiredReason, row.status], [null, null, 'identity_rejected', 'active']);
    const associations = await prisma().osContactEndpointAssociation.findMany({ where: { organizationId: org.id, contactId: holder.contactId } });
    assert.deepEqual(associations.map((a) => [a.numberE164, a.endReason]), [['+59170007002', 'identity_rejected']]);
    assert.deepEqual((await reviews(holder.contactId)).map((r) => r.status), ['rejected']);
  });

  it('changing the number before a decision supersedes the review', async () => {
    const former = await register('Tercer Anterior C7', '70007003');
    await retirePhone(former.partyId, former.contactId);
    const holder = await register('Titular Cambiado C7', '70007003');
    const changed = await command('owner', 'ChangeContactEndpoint', {
      partyId: holder.partyId,
      contactId: holder.contactId,
      expectedVersion: 0,
      channel: 'phone',
      newNumber: bo('70007999'),
      reason: 'entry_error',
      verificationMethod: 'in_person',
    });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    const row = await contactRow(holder.contactId);
    assert.deepEqual([row.phone, row.phoneStatus], ['+59170007999', 'unverified']);
    const [review] = await reviews(holder.contactId);
    assert.deepEqual([review!.status, review!.resolvedByMemberId], ['superseded', m.owner!.member.id]);
    const late = await command('owner', 'ResolveContactIdentityReview', resolve({ partyId: holder.partyId, contactId: holder.contactId, expectedVersion: 1 }));
    assert.equal(late.status, 400);
  });

  it('the new holder\'s timeline shows the decision without numbers or the earlier customer', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m.owner!) });
    assert.equal(res.status, 200);
    const text = await res.text();
    const items = JSON.parse(text).items as Array<{ eventType: string; facts: Record<string, unknown> }>;
    const resolved = items.find((item) => item.eventType === 'contact.identity_review.resolved');
    assert.deepEqual([resolved?.facts.channel, resolved?.facts.decision, resolved?.facts.verificationMethod], ['phone', 'confirmed', 'in_person']);
    for (const leak of ['70007001', ids.formerParty!, FORMER_NAME]) assert.equal(text.includes(leak), false, leak);
  });
});
