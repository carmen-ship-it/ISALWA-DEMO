import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { ProjectionRunner } from '@isalwa/os-query';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * T03 contract C3: the customer detail tells each viewer what they may do, using the same
 * rule the commands enforce, and returns the legal name only to viewers who may read it.
 * Real Nest app, disposable Postgres, synthetic members. Assertions are on response bodies.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Flags = Record<string, boolean>;

const LEGAL_NAME = 'Ferretería Flags T03 S.R.L.';
const EDITOR_FLAGS = {
  canEditDisplayName: true,
  canReadLegalName: true,
  canEditLegalName: false,
  canEditContacts: true,
  canChangeEndpoints: true,
  canReviewEndpointHistory: true,
  canRevealEndpoint: true,
  canResolveIdentityReview: true,
  canEndContactRelationship: true,
};
const READER_FLAGS = {
  canEditDisplayName: false,
  canReadLegalName: false,
  canEditLegalName: false,
  canEditContacts: false,
  canChangeEndpoints: false,
  canReviewEndpointHistory: false,
  canRevealEndpoint: false,
  canResolveIdentityReview: false,
  canEndContactRelationship: false,
};

describeHttp('T03 customer authority flags over HTTP (disposable Postgres)', () => {
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
      'idempotency-key': `t03-flags-${createId()}`,
    };
  }

  async function detail(who: string): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}`, { headers: headers(m[who]!) });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  async function command(who: string, name: string, body: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : {}) as Record<string, unknown> };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03flags.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function cover(helper: Seeded, coveredActions: string[]) {
    await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: ids.party!,
        primaryOwnerMemberId: m.owner!.member.id,
        actingAdvisorMemberId: helper.member.id,
        coveredActions,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 7 * 86_400_000),
        recordedAt: new Date(),
      },
    });
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 Flags Org', `t03-flags-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.ownerPlain = await seedMember('ownerPlain', ['commercial.customer.create']);
    m.steward = await seedMember('steward', ['master_data.admin']);
    m.stewardReader = await seedMember('stewardReader', ['master_data.admin', 'commercial.org.read']);
    m.orgReader = await seedMember('orgReader', ['commercial.org.read']);
    m.orgEditor = await seedMember('orgEditor', ['commercial.org.read', 'commercial.customer.edit']);
    m.workHelper = await seedMember('workHelper', ['commercial.customer.edit']);
    m.editHelper = await seedMember('editHelper', ['commercial.customer.edit']);
    m.stranger = await seedMember('stranger', ['commercial.customer.edit']);

    ids.party = createId();
    await prisma().osParty.create({
      data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'Ferretería Flags', legalName: LEGAL_NAME },
    });
    await prisma().osCommercialAccount.create({
      data: { id: createId(), organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id },
    });
    await cover(m.workHelper!, ['commercial.work']);
    await cover(m.editHelper!, ['commercial.work', 'customer.edit']);
  });

  after(async () => {
    await app.close();
  });

  it('editors get edit flags and the legal name; only the data steward may change the legal name', async () => {
    for (const who of ['owner', 'orgEditor', 'editHelper']) {
      const { status, body } = await detail(who);
      assert.equal(status, 200, who);
      assert.deepEqual(body.customerAuthority, EDITOR_FLAGS, who);
      assert.equal((body.party as Record<string, unknown>).legalName, LEGAL_NAME, who);
    }
    const steward = await detail('stewardReader');
    assert.deepEqual(steward.body.customerAuthority, { ...EDITOR_FLAGS, canEditLegalName: true });
    assert.equal((steward.body.party as Record<string, unknown>).legalName, LEGAL_NAME);
    // A steward alone does not open commercial customer records (unchanged T02 boundary).
    const stewardOnly = await detail('steward');
    assert.deepEqual([stewardOnly.status, stewardOnly.body], [404, { code: 'NOT_FOUND' }]);
  });

  it('readers without edit authority get no edit flags and no legal name in the body', async () => {
    for (const who of ['orgReader', 'workHelper']) {
      const { status, body } = await detail(who);
      assert.equal(status, 200, who);
      assert.deepEqual(body.customerAuthority, READER_FLAGS, who);
      assert.equal((body.party as Record<string, unknown>).legalName, null, who);
      assert.doesNotMatch(JSON.stringify(body), /Flags T03 S\.R\.L\./, who);
    }
    const stranger = await detail('stranger');
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
  });

  it('the flags match what the commands accept', async () => {
    const version = (await prisma().osParty.findUniqueOrThrow({ where: { id: ids.party! } })).version;
    const refused = await command('workHelper', 'UpdateParty', { partyId: ids.party, displayName: 'Otro', expectedVersion: version, changeReason: 'Prueba' });
    assert.deepEqual([refused.status, refused.body], [403, { code: 'PERMISSION_DENIED' }]);
    const legal = await command('owner', 'UpdateParty', { partyId: ids.party, legalName: 'Otra S.R.L.', expectedVersion: version, changeReason: 'Prueba' });
    assert.deepEqual([legal.status, legal.body], [403, { code: 'PERMISSION_DENIED' }]);
    const renamed = await command('editHelper', 'UpdateParty', {
      partyId: ids.party,
      displayName: 'Ferretería Flags Centro',
      expectedVersion: version,
      changeReason: 'Nombre comercial actual',
    });
    assert.equal(renamed.status, 201, JSON.stringify(renamed.body));
  });

  it('C2: the timeline shows names, reasons and numbers only to viewers who may edit the customer', async () => {
    const contact = await command('owner', 'UpdateContact', {
      organizationPartyId: ids.party,
      givenName: 'Rosa',
      familyName: 'Contacto',
      phone: { country: 'BO', number: '+59170001234' },
    });
    assert.equal(contact.status, 201, JSON.stringify(contact.body));
    const contactId = String((contact.body.data as Record<string, unknown>).contactId);
    const changed = await command('owner', 'ChangeContactEndpoint', {
      partyId: ids.party,
      contactId,
      expectedVersion: 0,
      channel: 'phone',
      newNumber: { country: 'BO', number: '+59170005678' },
      reason: 'other',
      reasonNote: 'Aviso en mostrador C2',
      verificationMethod: 'in_person',
    });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    await runner.runOnce();
    await runner.runOnce();

    type Entry = { eventType: string; detail?: string; facts: Record<string, unknown> };
    const timeline = async (who: string) => {
      const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline?limit=50`, { headers: headers(m[who]!) });
      assert.equal(res.status, 200, who);
      const text = await res.text();
      return { text, items: (JSON.parse(text) as { items: Entry[] }).items };
    };
    const find = (items: Entry[], type: string) => items.find((e) => e.eventType === type);

    const full = await timeline('editHelper');
    const renamedFull = find(full.items, 'party.updated')!;
    assert.equal(renamedFull.detail, 'full');
    assert.equal(renamedFull.facts.reason, 'Nombre comercial actual');
    assert.equal(renamedFull.facts.previousDisplayName, 'Ferretería Flags');
    assert.equal(find(full.items, 'contact.endpoint.changed')!.facts.reasonNote, 'Aviso en mostrador C2');

    for (const who of ['orgReader', 'workHelper']) {
      const summary = await timeline(who);
      const renamed = find(summary.items, 'party.updated')!;
      assert.equal(renamed.detail, 'summary', who);
      assert.deepEqual(Object.keys(renamed.facts).sort(), ['changedFields', 'partyId', 'source', 'version'], who);
      const phone = find(summary.items, 'contact.endpoint.changed')!;
      assert.equal(phone.detail, 'summary', who);
      assert.deepEqual(Object.keys(phone.facts).sort(), ['channel', 'contactId', 'partyId', 'reason', 'version'], who);
      assert.equal(find(summary.items, 'contact.updated')!.detail, 'summary', who);
      // The raw body carries no historical name, reason text, number or contact name.
      for (const secret of ['Nombre comercial actual', 'Ferretería Flags"', 'Aviso en mostrador', '5678', '1234', 'Rosa']) {
        assert.ok(!summary.text.includes(secret), `${who} body contains ${secret}`);
      }
    }
  });

  it('an owner without the customer edit permission reads the customer but gets no edit flags', async () => {
    await prisma().osCommercialAccount.updateMany({ where: { organizationId: org.id, partyId: ids.party! }, data: { ownerMemberId: m.ownerPlain!.member.id } });
    const { status, body } = await detail('ownerPlain');
    assert.equal(status, 200);
    assert.deepEqual(body.customerAuthority, READER_FLAGS);
    assert.equal((body.party as Record<string, unknown>).legalName, null);
  });
});
