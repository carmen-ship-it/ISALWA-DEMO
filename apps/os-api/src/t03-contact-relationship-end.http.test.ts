import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { ProjectionRunner } from '@isalwa/os-query';
import { getOsPrisma } from '@isalwa/os-database';
import { contactRecipientEligibility } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import { pickQuoteContact } from './quote-pdf.service';

/**
 * T03 L1: ending a contact's relationship with the customer. The contact stops being a current
 * recipient (documents, eligibility), its number associations end so the number reappearing
 * elsewhere opens an identity review, and nothing else changes. Real Nest app, disposable
 * Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const bo = (number: string) => ({ country: 'BO', number });
const NOTE = 'Dejó la empresa en septiembre';

describeHttp('T03 contact relationship ending over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded, key = `t03-l1-${createId()}`): Record<string, string> {
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

  async function preview(who: string, partyId: string, contactId: string) {
    const res = await fetch(`${baseUrl}/v1/parties/${partyId}/contacts/${contactId}/relationship-end-preview`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03l1.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function register(name: string, phone: string, duplicateReason?: string): Promise<{ partyId: string; contactId: string }> {
    const reply = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: name,
      contact: { givenName: 'Contacto', familyName: name },
      phone: bo(phone),
      ...(duplicateReason ? { duplicateReason } : {}),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const data = reply.body.data as Record<string, unknown>;
    return { partyId: String(data.partyId), contactId: String(data.contactId) };
  }

  const contactRow = (contactId: string) => prisma().osContact.findUniqueOrThrow({ where: { id: contactId } });
  const contactsOf = (partyId: string) =>
    prisma().osContact.findMany({ where: { organizationId: org.id, organizationPartyId: partyId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 L1 Org', `t03-l1-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.workOnly = await seedMember('workonly', ['commercial.customer.edit']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);

    const customer = await register('Cliente Relación L1', '70008001');
    ids.party = customer.partyId;
    ids.firstContact = customer.contactId;
    const second = await command('owner', 'UpdateContact', {
      organizationPartyId: ids.party,
      givenName: 'Marta',
      familyName: 'Salida',
      phone: bo('70008002'),
      whatsapp: bo('70008003'),
    });
    assert.equal(second.status, 201, JSON.stringify(second.body));
    ids.contact = String((second.body.data as Record<string, unknown>).contactId);
    ids.otherParty = (await register('Otro Cliente L1', '70008009')).partyId;
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
    ids.commitment = createId();
    await prisma().osCommitment.create({
      data: {
        id: ids.commitment,
        organizationId: org.id,
        partyId: ids.party,
        ownerMemberId: m.owner!.member.id,
        text: 'Enviar muestras',
        dueAt: new Date('2030-01-15T15:00:00.000Z'),
        origin: 'employee_entered',
        createdByMemberId: m.owner!.member.id,
      },
    });
  });

  after(async () => {
    await app.close();
  });

  const end = (overrides: Record<string, unknown> = {}) => ({
    partyId: ids.party,
    contactId: ids.contact,
    expectedVersion: 0,
    reason: 'left_company',
    reasonNote: NOTE,
    endedOn: '2026-10-01',
    ...overrides,
  });

  it('previews the customer\'s commitments and states that no automatic sending exists', async () => {
    const reply = await preview('owner', ids.party!, ids.contact!);
    assert.equal(reply.status, 200, reply.text);
    const body = reply.body;
    assert.equal(body.relationStatus, 'current');
    assert.deepEqual(body.documentRecipient, { isCurrentDefault: true, replacementContactId: ids.firstContact });
    assert.deepEqual(body.channels.map((c: { channel: string }) => c.channel), ['phone', 'whatsapp']);
    for (const full of ['70008002', '70008003']) assert.equal(reply.text.includes(full), false, full);
    assert.deepEqual(body.customerOpenCommitments.map((c: { id: string; state: string }) => [c.id, c.state]), [[ids.commitment, 'pending']]);
    assert.equal(reply.text.includes('Enviar muestras'), false, 'commitment text is not part of the preview');
    assert.equal(body.commitmentLinkage, 'customer');
    assert.deepEqual(body.automaticSends, { configured: false, label: 'Envíos automáticos no configurados.' });

    const workOnly = await preview('workOnly', ids.party!, ids.contact!);
    assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await preview('stranger', ids.party!, ids.contact!);
    const missing = await preview('stranger', createId(), ids.contact!);
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual([missing.status, missing.body], [stranger.status, stranger.body]);
    const elsewhere = await preview('owner', ids.otherParty!, ids.contact!);
    assert.equal(elsewhere.status, 404);
  });

  it('refuses incomplete, out-of-range or unauthorized requests and changes nothing', async () => {
    for (const [label, body] of [
      ['other without a note', end({ reason: 'other', reasonNote: undefined })],
      ['unknown reason', end({ reason: 'moved' })],
      ['future day', end({ endedOn: '2999-01-01' })],
      ['impossible day', end({ endedOn: '2026-02-30' })],
    ] as const) {
      const reply = await command('owner', 'EndContactRelationship', body as Record<string, unknown>);
      assert.equal(reply.status, 400, `${label}: ${JSON.stringify(reply.body)}`);
    }
    const stale = await command('owner', 'EndContactRelationship', end({ expectedVersion: 4 }));
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const workOnly = await command('workOnly', 'EndContactRelationship', end());
    assert.deepEqual([workOnly.status, workOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await command('stranger', 'EndContactRelationship', end());
    const missing = await command('stranger', 'EndContactRelationship', end({ partyId: createId() }));
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual(stranger, missing);
    const wrongParty = await command('owner', 'EndContactRelationship', end({ partyId: ids.otherParty }));
    assert.deepEqual([wrongParty.status, wrongParty.body], [404, { code: 'NOT_FOUND' }]);
    const row = await contactRow(ids.contact!);
    assert.deepEqual([row.status, row.relationEndedAt, row.version], ['active', null, 0]);
  });

  it('ends the relationship: dated, reasoned, versioned; numbers kept as history; nothing else changes', async () => {
    const key = `t03-l1-end-${createId()}`;
    const reply = await command('owner', 'EndContactRelationship', end(), key);
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const replay = await command('owner', 'EndContactRelationship', end(), key);
    assert.deepEqual(replay, reply);

    const row = await contactRow(ids.contact!);
    assert.deepEqual(
      [row.status, row.relationEndedAt?.toISOString(), row.relationEndReason, row.version, row.phone, row.whatsapp],
      ['inactive', '2026-10-01T04:00:00.000Z', 'left_company', 1, '+59170008002', '+59170008003'],
    );
    const associations = await prisma().osContactEndpointAssociation.findMany({ where: { organizationId: org.id, contactId: ids.contact! }, orderBy: { channel: 'asc' } });
    assert.deepEqual(
      associations.map((a) => [a.channel, a.endedAt !== null, a.endReason]),
      [['phone', true, 'relation_ended:left_company'], ['whatsapp', true, 'relation_ended:left_company']],
    );
    const events = await prisma().osBusinessEvent.findMany({ where: { organizationId: org.id, eventType: 'contact.relation.ended' } });
    assert.equal(events.length, 1);
    const text = JSON.stringify(events[0]!.payloadJson);
    for (const full of ['70008002', '70008003']) assert.equal(text.includes(full), false, full);
    assert.equal(events[0]!.actorMemberId, m.owner!.member.id);
    const audit = await prisma().osAuditLog.count({ where: { organizationId: org.id, action: 'contact.relation.ended', resourceId: ids.contact! } });
    assert.equal(audit, 1);

    const first = await contactRow(ids.firstContact!);
    assert.deepEqual([first.status, first.version, first.relationEndedAt], ['active', 0, null]);
    const commitment = await prisma().osCommitment.findUniqueOrThrow({ where: { id: ids.commitment! } });
    assert.equal(commitment.lifecycle, 'open');

    assert.deepEqual(contactRecipientEligibility(row as never, 'whatsapp'), { eligible: false, reason: 'relation_ended' });
    const contacts = await contactsOf(ids.party!);
    assert.equal(pickQuoteContact(contacts as never).contactName, `Contacto Cliente Relación L1`);
    assert.deepEqual(pickQuoteContact([row as never]), { contactName: null, contactPhone: null, contactEmail: null });
  });

  it('a former contact cannot be edited, re-numbered or ended again; the preview shows it ended', async () => {
    const edit = await command('owner', 'UpdateContact', { organizationPartyId: ids.party, contactId: ids.contact, givenName: 'Marta', familyName: 'Vuelve' });
    assert.deepEqual([edit.status, edit.body], [400, { code: 'CONFLICT' }]);
    const change = await command('owner', 'ChangeContactEndpoint', {
      partyId: ids.party,
      contactId: ids.contact,
      expectedVersion: 1,
      channel: 'phone',
      newNumber: bo('70008004'),
      reason: 'number_changed',
      verificationMethod: 'in_person',
    });
    assert.equal(change.status, 400);
    const again = await command('owner', 'EndContactRelationship', end({ expectedVersion: 1 }));
    assert.deepEqual([again.status, again.body], [400, { code: 'CONFLICT' }]);
    const row = await contactRow(ids.contact!);
    assert.deepEqual([row.familyName, row.version, row.phone], ['Salida', 1, '+59170008002']);

    const after = await preview('owner', ids.party!, ids.contact!);
    assert.equal(after.status, 200);
    assert.equal(after.body.relationStatus, 'ended');
    assert.deepEqual(after.body.documentRecipient, { isCurrentDefault: false, replacementContactId: null });
  });

  it('the former contact\'s number appearing on another customer opens an identity review', async () => {
    const holder = await register('Nuevo Titular L1', '70008002', 'Número nuevo del cliente');
    assert.equal((await contactRow(holder.contactId)).phoneStatus, 'identity_review');
  });

  it('defaults the day to today in Bolivia', async () => {
    const customer = await register('Cliente Hoy L1', '70008005');
    const reply = await command('owner', 'EndContactRelationship', {
      partyId: customer.partyId,
      contactId: customer.contactId,
      expectedVersion: 0,
      reason: 'duplicate_contact',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    assert.equal((reply.body.data as Record<string, unknown>).endedOn, today);
    assert.equal((await contactRow(customer.contactId)).relationEndedAt?.toISOString(), `${today}T04:00:00.000Z`);
  });

  it('the timeline gives the reason note only to customer editors', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const read = async (who: string) => {
      const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m[who]!) });
      assert.equal(res.status, 200);
      const items = (await res.json()).items as Array<{ eventType: string; facts: Record<string, unknown> }>;
      return items.find((item) => item.eventType === 'contact.relation.ended');
    };
    const owner = await read('owner');
    assert.deepEqual([owner?.facts.reason, owner?.facts.reasonNote, owner?.facts.endedOn], ['left_company', NOTE, '2026-10-01']);
    const workOnly = await read('workOnly');
    assert.equal(workOnly?.facts.reason, 'left_company');
    assert.equal(workOnly?.facts.reasonNote, undefined);
  });
});
