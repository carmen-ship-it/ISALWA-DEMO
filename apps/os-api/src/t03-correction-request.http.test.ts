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
 * T03 L4: a correction request is an issue with a restricted correction record. It never writes
 * customer data; the responsible person applies the change with the customer command and
 * resolves the request citing that event. Real Nest app, disposable Postgres, synthetic data.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const PROPOSED = 'Ana María Quispe';

describeHttp('T03 correction requests over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
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
      'idempotency-key': `t03-l4-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function correction(who: string, issueId = ids.issue!): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/issues/${issueId}/correction`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function candidates(who: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/issues/${ids.issue}/correction/candidate-events`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03l4.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const issueVersion = async () => (await prisma().osIssue.findUniqueOrThrow({ where: { id: ids.issue! } })).version;
  const latestEvent = (eventType: string, primaryEntityId: string) =>
    prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType, primaryEntityId },
      orderBy: { recordedAt: 'desc' },
    });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('T03 L4 Org', `t03-l4-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.manager = await seedMember('manager', ['issue.manage']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);
    m.reader = await seedMember('reader', ['commercial.org.read']);

    const created = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente Corrección L4',
      contact: { givenName: 'Ana', familyName: 'Quispe' },
      phone: { country: 'BO', number: '70020002' },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const data = created.body.data as Record<string, unknown>;
    ids.party = String(data.partyId);
    ids.contact = String(data.contactId);
  });

  after(async () => {
    await app?.close();
  });

  const request = {
    description: 'La clienta pide corregir su nombre',
    correction: () => ({ partyId: ids.party, contactId: ids.contact, field: 'contact_name', proposedValue: PROPOSED, source: 'customer' }),
  };

  it('a reporter who cannot know the customer gets 404 and nothing is stored', async () => {
    const before = await prisma().osIssueCorrectionRequest.count({ where: { organizationId: org.id } });
    const reply = await command('stranger', 'ReportIssue', { description: request.description, correction: request.correction() });
    assert.equal(reply.status, 404, JSON.stringify(reply.body));
    assert.equal(await prisma().osIssueCorrectionRequest.count({ where: { organizationId: org.id } }), before);
  });

  it('stores the restricted record and links the customer; the event carries no proposed value', async () => {
    const reply = await command('owner', 'ReportIssue', { description: request.description, correction: request.correction() });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    ids.issue = String((reply.body.data as Record<string, unknown>).issueId);
    const row = await prisma().osIssueCorrectionRequest.findUniqueOrThrow({ where: { issueId: ids.issue } });
    assert.equal(row.proposedValue, PROPOSED);
    assert.equal(row.decision, null);
    const refs = await prisma().osIssueReference.findMany({ where: { issueId: ids.issue } });
    assert.deepEqual(refs.map((r) => [r.referenceType, r.referenceId]), [['party', ids.party]]);
    const reported = await latestEvent('issue.reported', ids.issue);
    assert.equal(JSON.stringify(reported.payloadJson).includes(PROPOSED), false);
  });

  it('the correction read needs customer knowledge; the value is shown only to permitted viewers', async () => {
    const own = await correction('owner');
    assert.equal(own.status, 200, JSON.stringify(own.body));
    const view = own.body.correction as Record<string, unknown>;
    assert.equal(view.proposedValue, PROPOSED);
    assert.equal(view.state, 'pending');
    assert.equal(view.canDecide, false);
    // issue.manage can read the issue but cannot know this customer.
    assert.equal((await correction('manager')).status, 404);
    // Not reporter, owner or manager of the issue.
    assert.equal((await correction('reader')).status, 404);
  });

  it('the issue detail marks a correction request without its contents, so no generic resolve is offered', async () => {
    const res = await fetch(`${baseUrl}/v1/issues/${ids.issue}`, { headers: headers(m.manager!) });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal((JSON.parse(text).issue as Record<string, unknown>).isCorrectionRequest, true);
    assert.equal(text.includes(PROPOSED), false);
    const plain = await command('owner', 'ReportIssue', { description: 'Incidencia común sin corrección' });
    assert.equal(plain.status, 201, JSON.stringify(plain.body));
    const plainId = String((plain.body.data as Record<string, unknown>).issueId);
    const plainRes = await fetch(`${baseUrl}/v1/issues/${plainId}`, { headers: headers(m.owner!) });
    assert.equal(((await plainRes.json()).issue as Record<string, unknown>).isCorrectionRequest, false);
  });

  it('assigns only a responsible person who may apply the change', async () => {
    const toStranger = await command('manager', 'AssignIssueOwner', {
      issueId: ids.issue,
      ownerMemberId: m.stranger!.member.id,
      expectedVersion: await issueVersion(),
    });
    assert.equal(toStranger.status, 400, JSON.stringify(toStranger.body));
    const toOwner = await command('manager', 'AssignIssueOwner', {
      issueId: ids.issue,
      ownerMemberId: m.owner!.member.id,
      expectedVersion: await issueVersion(),
    });
    assert.equal(toOwner.status, 201, JSON.stringify(toOwner.body));
    assert.equal(((await correction('owner')).body.correction as Record<string, unknown>).canDecide, true);
  });

  it('"applied" must cite the matching customer event; the request itself changed nothing', async () => {
    const contactBefore = await prisma().osContact.findUniqueOrThrow({ where: { id: ids.contact! } });
    assert.equal(contactBefore.givenName, 'Ana');

    const renamed = await command('owner', 'UpdateParty', {
      partyId: ids.party,
      displayName: 'Cliente Corrección L4 SRL',
      changeReason: 'Razón comercial actualizada',
      expectedVersion: (await prisma().osParty.findUniqueOrThrow({ where: { id: ids.party! } })).version,
    });
    assert.equal(renamed.status, 201, JSON.stringify(renamed.body));
    const partyEvent = await latestEvent('party.updated', ids.party!);
    const wrong = await command('owner', 'ResolveIssue', {
      issueId: ids.issue,
      resolution: 'Corregido',
      expectedVersion: await issueVersion(),
      correction: { decision: 'applied', appliedEventId: partyEvent.id, reason: 'Nombre corregido en la ficha' },
    });
    assert.equal(wrong.status, 409, JSON.stringify(wrong.body));

    const fixed = await command('owner', 'UpdateContact', {
      organizationPartyId: ids.party,
      contactId: ids.contact,
      givenName: 'Ana María',
      familyName: 'Quispe',
    });
    assert.equal(fixed.status, 201, JSON.stringify(fixed.body));
    const contactEvent = await latestEvent('contact.updated', ids.contact!);

    // A same-kind change on another customer's contact must not be offered.
    const other = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Otro Cliente L4',
      contact: { givenName: 'Luis', familyName: 'Rojas' },
      phone: { country: 'BO', number: '70020003' },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(other.status, 201, JSON.stringify(other.body));
    const otherData = other.body.data as Record<string, unknown>;
    const decoy = await command('owner', 'UpdateContact', {
      organizationPartyId: String(otherData.partyId),
      contactId: String(otherData.contactId),
      givenName: 'Luis Alberto',
      familyName: 'Rojas',
    });
    assert.equal(decoy.status, 201, JSON.stringify(decoy.body));

    const listed = await candidates('owner');
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const events = listed.body.events as Array<Record<string, unknown>>;
    assert.deepEqual(events.map((e) => e.eventId), [contactEvent.id]);
    assert.deepEqual(Object.keys(events[0]!).sort(), ['actorMemberId', 'eventId', 'eventType', 'fields', 'occurredAt']);
    assert.equal((await candidates('manager')).status, 404);

    const resolved = await command('owner', 'ResolveIssue', {
      issueId: ids.issue,
      resolution: 'Corregido',
      expectedVersion: await issueVersion(),
      correction: { decision: 'applied', appliedEventId: contactEvent.id, reason: 'Nombre corregido en la ficha' },
    });
    assert.equal(resolved.status, 201, JSON.stringify(resolved.body));

    const issue = await prisma().osIssue.findUniqueOrThrow({ where: { id: ids.issue! } });
    assert.equal(issue.status, 'resolved');
    assert.equal(issue.outcome, 'applied');
    const view = (await correction('owner')).body.correction as Record<string, unknown>;
    assert.equal(view.state, 'applied');
    assert.equal(view.appliedEventId, contactEvent.id);
    assert.equal(view.decidedByMemberId, m.owner!.member.id);
    assert.equal(view.canDecide, false);
  });

  it('the outcome is the decision: RecordIssueOutcome is refused', async () => {
    const reply = await command('owner', 'RecordIssueOutcome', {
      issueId: ids.issue,
      outcome: 'otro',
      expectedVersion: await issueVersion(),
    });
    assert.equal(reply.status, 400, JSON.stringify(reply.body));
  });
});
