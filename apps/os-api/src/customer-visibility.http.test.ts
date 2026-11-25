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
 * T02 decision (2026-10-16 17:18): customer contact details follow customer/account
 * visibility on every read. Real Nest app over HTTP, real Postgres (disposable).
 * Every denial is checked on the response body and on unchanged rows.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

const PHONE = '+59170000001';
const PHONE_DIGITS = '70000001';
const SUPPLIER_PHONE = '+59170000099';
const SECRET_EMAIL = 'compras@cliente-privado.bo';
const SECRET_ADDRESS = 'Calle Reservada 123';
const CUSTOMER_NAME = 'Cliente Reservado T02';
const FOREIGN_NAME = 'Zeta Externo T02';
const CONVERSATION_SUMMARY = 'resumen privado de la conversación';

describeHttp('T02 customer visibility over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;

  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  const ids = {
    customer: '',
    customerLocation: '',
    supplier: '',
    foreign: '',
    suspendedCustomer: '',
  };

  function headers(orgId: string, who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
    };
  }
  const get = async (who: string, path: string, orgId = orgA.id) => {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(orgId, m[who]!) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };

  async function seedMember(orgId: string, name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@t02.bo`, name, 'T02');
    // seedAdminMember grants people.admin; keep it only where the test says so.
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({
        where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
      });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function seedCustomer(input: {
    orgId: string;
    name: string;
    ownerMemberId: string | null;
    roleKey: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<{ partyId: string; locationId: string }> {
    const partyId = createId();
    const locationId = createId();
    await prisma().osParty.create({
      data: { id: partyId, organizationId: input.orgId, partyKind: 'organization', displayName: input.name },
    });
    await prisma().osPartyRoleAssignment.create({
      data: { id: createId(), organizationId: input.orgId, partyId, roleKey: input.roleKey, effectiveAt: new Date('2020-01-01') },
    });
    if (input.roleKey === 'customer') {
      await prisma().osCommercialAccount.create({
        data: { id: createId(), organizationId: input.orgId, partyId, ownerMemberId: input.ownerMemberId },
      });
    }
    await prisma().osContact.create({
      data: {
        id: createId(),
        organizationId: input.orgId,
        organizationPartyId: partyId,
        givenName: 'Ana',
        familyName: 'Contacto',
        phone: input.phone,
        email: input.email ?? null,
      },
    });
    await prisma().osLocation.create({
      data: { id: locationId, organizationId: input.orgId, partyId, label: 'Principal', addressText: input.address ?? null },
    });
    await prisma().osPartyReadModel.create({
      data: {
        partyId,
        organizationId: input.orgId,
        partyKind: 'organization',
        displayName: input.name,
        status: 'active',
        activeRoleKeys: [input.roleKey],
        hasCommercialAccount: input.roleKey === 'customer',
        searchText: `${input.name} ${input.phone}`.toLowerCase(),
      },
    });
    return { partyId, locationId };
  }

  const conversations = () =>
    prisma().osCustomerConversation.count({ where: { organizationId: orgA.id } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    orgA = await store.seedOrganization('T02 A', `t02-a-${createId()}`);
    orgB = await store.seedOrganization('T02 B', `t02-b-${createId()}`);

    m.owner = await seedMember(orgA.id, 'owner', []);
    m.newOwner = await seedMember(orgA.id, 'newowner', []);
    m.advisor = await seedMember(orgA.id, 'advisor', []);
    m.lead = await seedMember(orgA.id, 'lead', ['commercial.team.read']);
    m.otherLead = await seedMember(orgA.id, 'otherlead', ['commercial.team.read']);
    m.orgReader = await seedMember(orgA.id, 'orgreader', ['commercial.org.read']);
    m.peopleAdmin = await seedMember(orgA.id, 'peopleadmin', ['people.admin']);
    m.masterData = await seedMember(orgA.id, 'masterdata', ['master_data.admin']);
    m.plain = await seedMember(orgA.id, 'plain', []);
    m.author = await seedMember(orgA.id, 'author', []);
    m.suspended = await seedMember(orgA.id, 'suspended', []);
    m.foreignOwner = await seedMember(orgB.id, 'foreignowner', []);

    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: orgA.id, memberId: m.owner.member.id, managerMemberId: m.lead.member.id, effectiveAt: new Date('2020-01-01') },
    });

    const customer = await seedCustomer({
      orgId: orgA.id, name: CUSTOMER_NAME, ownerMemberId: m.owner.member.id, roleKey: 'customer',
      phone: PHONE, email: SECRET_EMAIL, address: SECRET_ADDRESS,
    });
    ids.customer = customer.partyId;
    ids.customerLocation = customer.locationId;
    ids.supplier = (await seedCustomer({
      orgId: orgA.id, name: 'Proveedor Abierto T02', ownerMemberId: null, roleKey: 'supplier', phone: SUPPLIER_PHONE,
    })).partyId;
    ids.foreign = (await seedCustomer({
      orgId: orgB.id, name: FOREIGN_NAME, ownerMemberId: m.foreignOwner.member.id, roleKey: 'customer', phone: PHONE,
    })).partyId;
    ids.suspendedCustomer = (await seedCustomer({
      orgId: orgA.id, name: 'Cliente del suspendido T02', ownerMemberId: m.suspended.member.id, roleKey: 'customer', phone: '+59170000055',
    })).partyId;

    // Historical conversation entered by a member who never had customer authority.
    await prisma().osCustomerConversation.create({
      data: {
        id: createId(),
        organizationId: orgA.id,
        customerId: ids.customer,
        customerLabel: CUSTOMER_NAME,
        channel: 'manual',
        occurredAt: new Date('2026-10-01T15:00:00Z'),
        enteredByMemberId: m.author.member.id,
        enteredByLabel: 'author T02',
        summary: CONVERSATION_SUMMARY,
      },
    });
  });

  after(async () => {
    await app.close();
  });

  const detailPaths = () => [
    `/parties/${ids.customer}`,
    `/parties/${ids.customer}/contacts`,
    `/parties/${ids.customer}/locations`,
    `/parties/${ids.customer}/timeline`,
    `/locations/${ids.customerLocation}`,
  ];
  const PRIVATE = [PHONE_DIGITS, SECRET_EMAIL, SECRET_ADDRESS, CUSTOMER_NAME, CONVERSATION_SUMMARY];

  async function assertDenied(who: string) {
    for (const path of detailPaths()) {
      const res = await get(who, path);
      assert.equal(res.status, 404, `${who} ${path}`);
      assert.deepEqual(res.body, { code: 'NOT_FOUND' }, `${who} ${path}`);
    }
    const search = await get(who, `/parties?q=${encodeURIComponent(PHONE_DIGITS)}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.items.some((i: { partyId: string }) => i.partyId === ids.customer), false, `${who} search`);
    const byName = await get(who, `/parties?q=${encodeURIComponent('Reservado')}`);
    assert.deepEqual(byName.body.items, [], `${who} name search`);
    const list = await get(who, '/customer-conversations');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, { items: [] }, `${who} conversations`);
    const filtered = await get(who, `/customer-conversations?partyId=${ids.customer}`);
    assert.deepEqual(filtered.body, { items: [] }, `${who} conversations by party`);
    for (const res of [search, byName, list, filtered]) {
      for (const token of PRIVATE) assert.ok(!res.text.includes(token), `${who} leaked ${token}`);
    }
  }

  async function assertAllowed(who: string) {
    for (const path of detailPaths()) {
      const res = await get(who, path);
      assert.equal(res.status, 200, `${who} ${path}: ${res.text}`);
    }
    const contacts = await get(who, `/parties/${ids.customer}/contacts`);
    assert.equal(contacts.body.contacts[0].phone, PHONE);
    const search = await get(who, `/parties?q=${encodeURIComponent(PHONE_DIGITS)}`);
    const found = search.body.items.filter((i: { partyId: string }) => i.partyId === ids.customer);
    assert.equal(found.length, 1, `${who} search`);
    assert.ok(!search.text.includes(FOREIGN_NAME), `${who} search crossed tenant`);
    const list = await get(who, '/customer-conversations');
    assert.equal(list.body.items.length, 1, `${who} conversations`);
    assert.equal(list.body.items[0].summary, CONVERSATION_SUMMARY);
    assert.equal(list.body.items[0].enteredByMemberId, m.author.member.id, 'author preserved in history');
  }

  it('allows the current owner, the owner team lead, and commercial.org.read', async () => {
    await assertAllowed('owner');
    await assertAllowed('lead');
    await assertAllowed('orgReader');
  });

  it('denies membership alone, people.admin alone, master_data.admin, an unrelated team lead, and the conversation author', async () => {
    for (const who of ['plain', 'peopleAdmin', 'masterData', 'otherLead', 'author']) {
      await assertDenied(who);
    }
  });

  it('a supplier-only party keeps its existing member read (outside the customer boundary)', async () => {
    const res = await get('plain', `/parties/${ids.supplier}/contacts`);
    assert.equal(res.status, 200);
    assert.equal(res.body.contacts[0].phone, SUPPLIER_PHONE);
  });

  it('coverage: active grants read; expired, revoked and future grants do not', async () => {
    const grant = (data: Record<string, unknown>) =>
      prisma().osCustomerCoverageGrant.create({
        data: {
          id: createId(),
          organizationId: orgA.id,
          customerPartyId: ids.customer,
          primaryOwnerMemberId: m.owner.member.id,
          actingAdvisorMemberId: m.advisor.member.id,
          startsAt: new Date('2026-01-01T00:00:00Z'),
          recordedAt: new Date(),
          ...data,
        },
      });
    const expired = await grant({ endsAt: new Date(Date.now() - 60_000) });
    await assertDenied('advisor');
    const future = await grant({ startsAt: new Date(Date.now() + 86_400_000) });
    await assertDenied('advisor');
    const active = await grant({});
    await assertAllowed('advisor');
    await prisma().osCustomerCoverageGrant.update({ where: { id: active.id }, data: { revokedAt: new Date() } });
    await assertDenied('advisor');
    await prisma().osCustomerCoverageGrant.deleteMany({ where: { id: { in: [expired.id, future.id, active.id] } } });
  });

  it('customer.edit coverage reads the customer and does not open the conversation', async () => {
    const conversation = await prisma().osCustomerConversation.findFirst({
      where: { organizationId: orgA.id, customerId: ids.customer },
    });
    assert.ok(conversation);
    const grant = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: orgA.id,
        customerPartyId: ids.customer,
        primaryOwnerMemberId: m.owner.member.id,
        actingAdvisorMemberId: m.advisor.member.id,
        coveredActions: ['customer.edit'],
        startsAt: new Date('2026-01-01T00:00:00Z'),
        recordedAt: new Date(),
      },
    });
    const post = async (who: string, path: string, body: unknown, orgId = orgA.id) => {
      const res = await fetch(`${baseUrl}/v1${path}`, {
        method: 'POST',
        headers: headers(orgId, m[who]!),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    try {
      const contacts = await get('advisor', `/parties/${ids.customer}/contacts`);
      assert.equal(contacts.status, 200, contacts.text);
      assert.equal(contacts.body.contacts[0].phone, PHONE);

      const list = await get('advisor', '/customer-conversations');
      assert.deepEqual(list.body, { items: [] });
      const filtered = await get('advisor', `/customer-conversations?partyId=${ids.customer}`);
      assert.deepEqual(filtered.body, { items: [] });

      const notes = await get('advisor', `/customer-conversations/${conversation.id}/notes`);
      assert.equal(notes.status, 404);
      assert.equal(notes.body.code, 'NOT_FOUND');
      const take = await post('advisor', `/customer-conversations/${conversation.id}/take`, {});
      assert.equal(take.status, 404);
      assert.equal(take.body.code, 'NOT_FOUND');
      const state = await post('advisor', `/customer-conversations/${conversation.id}/state`, { to: 'waiting_on_customer' });
      assert.equal(state.status, 404);
      assert.equal(state.body.code, 'NOT_FOUND');
      const created = await post('advisor', '/customer-conversations', {
        customerId: ids.customer,
        channel: 'call',
        summary: 'no debe guardarse',
        occurredAt: '2026-10-02T15:00:00.000Z',
      });
      assert.equal(created.status, 400);
      const stillOne = await prisma().osCustomerConversation.count({
        where: { organizationId: orgA.id, customerId: ids.customer },
      });
      assert.equal(stillOne, 1);

      const foreign = await get('foreignOwner', `/customer-conversations/${conversation.id}/notes`, orgB.id);
      assert.equal(foreign.status, 404);
      assert.equal(foreign.body.code, 'NOT_FOUND');

      await prisma().osCustomerCoverageGrant.update({
        where: { id: grant.id },
        data: { coveredActions: ['commercial.work'] },
      });
      const allowed = await get('advisor', '/customer-conversations');
      assert.equal(allowed.body.items.length, 1);
      assert.equal(allowed.body.items[0].id, conversation.id);
      const noteRead = await get('advisor', `/customer-conversations/${conversation.id}/notes`);
      assert.equal(noteRead.status, 200);
      const takeOk = await post('advisor', `/customer-conversations/${conversation.id}/take`, {});
      assert.equal(takeOk.status, 201, JSON.stringify(takeOk.body));
      assert.equal(takeOk.body.item.assignedMemberId, m.advisor.member.id);
    } finally {
      await prisma().osCustomerConversation.update({
        where: { id: conversation.id },
        data: {
          assignedMemberId: null,
          assignedLabel: null,
          assignedAt: null,
          attentionState: 'new',
          attentionStateChangedAt: null,
          automationPausedAt: null,
        },
      });
      await prisma().osCustomerCoverageGrant.delete({ where: { id: grant.id } });
    }
  });

  it('quote.convert coverage does not open conversations', async () => {
    const conversation = await prisma().osCustomerConversation.findFirst({
      where: { organizationId: orgA.id, customerId: ids.customer },
    });
    assert.ok(conversation);
    const grant = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: orgA.id,
        customerPartyId: ids.customer,
        primaryOwnerMemberId: m.owner.member.id,
        actingAdvisorMemberId: m.advisor.member.id,
        coveredActions: ['quote.convert'],
        startsAt: new Date('2026-01-01T00:00:00Z'),
        recordedAt: new Date(),
      },
    });
    try {
      const contacts = await get('advisor', `/parties/${ids.customer}/contacts`);
      assert.equal(contacts.status, 200, contacts.text);
      const list = await get('advisor', '/customer-conversations');
      assert.deepEqual(list.body, { items: [] });
      const notes = await get('advisor', `/customer-conversations/${conversation.id}/notes`);
      assert.equal(notes.status, 404);
      assert.equal(notes.body.code, 'NOT_FOUND');
    } finally {
      await prisma().osCustomerCoverageGrant.delete({ where: { id: grant.id } });
    }
  });

  it('reassignment moves the conversation notice to the current owner and keeps the earlier row', async () => {
    const conversation = await prisma().osCustomerConversation.findFirst({
      where: { organizationId: orgA.id, customerId: ids.customer },
    });
    assert.ok(conversation);
    const noticeId = createId();
    await prisma().osInternalNotification.create({
      data: {
        id: noticeId,
        organizationId: orgA.id,
        recipientMemberId: m.owner.member.id,
        kind: 'customer_attention',
        dedupKey: `customer_attention:conversation:${conversation.id}`,
        title: 'Conversación sin asignar',
        body: 'El aviso es interno.',
        sourceRecordType: 'conversation',
        sourceRecordId: conversation.id,
        partyId: ids.customer,
        channel: 'internal',
      },
    });
    const account = await prisma().osCommercialAccount.findFirst({
      where: { organizationId: orgA.id, partyId: ids.customer },
    });
    assert.ok(account);
    await prisma().osCommercialAccount.update({
      where: { id: account.id },
      data: { ownerMemberId: m.newOwner.member.id },
    });
    try {
      const previous = await get('owner', '/notifications');
      assert.equal(previous.status, 200);
      assert.equal(
        previous.body.items.some((item: { id: string }) => item.id === noticeId),
        false,
      );
      const ack = await fetch(`${baseUrl}/v1/notifications/${noticeId}/acknowledge`, {
        method: 'POST',
        headers: headers(orgA.id, m.owner),
      });
      assert.equal(ack.status, 404);
      const stored = await prisma().osInternalNotification.findUnique({ where: { id: noticeId } });
      assert.equal(stored?.recipientMemberId, m.owner.member.id);
      assert.equal(stored?.acknowledgedAt, null);
      assert.equal(stored?.resolvedAt, null);

      const current = await get('newOwner', '/notifications');
      assert.equal(current.status, 200, JSON.stringify(current.body));
      const moved = current.body.items.filter(
        (item: { source: { recordId: string }; kind: string }) =>
          item.source.recordId === conversation.id && item.kind === 'customer_attention',
      );
      assert.equal(moved.length, 1);
      assert.notEqual(moved[0].id, noticeId);
      assert.equal(moved[0].title, 'Conversación sin asignar');

      const again = await get('owner', '/notifications');
      assert.equal(
        again.body.items.some((item: { source: { recordId: string } }) => item.source.recordId === conversation.id),
        false,
      );
      const foreign = await get('foreignOwner', '/notifications', orgB.id);
      assert.equal(
        foreign.body.items.some((item: { source: { recordId: string } }) => item.source.recordId === conversation.id),
        false,
      );
      const history = await prisma().osInternalNotification.findMany({
        where: { organizationId: orgA.id, sourceRecordId: conversation.id, kind: 'customer_attention' },
      });
      assert.equal(history.length, 2);
    } finally {
      await prisma().osCommercialAccount.update({
        where: { id: account.id },
        data: { ownerMemberId: m.owner.member.id },
      });
      await prisma().osInternalNotification.deleteMany({
        where: { organizationId: orgA.id, sourceRecordId: conversation.id },
      });
    }
  });

  it('reassignment: previous owner and stale coverage lose access, new owner gains it, author stays denied', async () => {
    const coverage = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: orgA.id,
        customerPartyId: ids.customer,
        primaryOwnerMemberId: m.owner.member.id,
        actingAdvisorMemberId: m.advisor.member.id,
        startsAt: new Date('2026-01-01T00:00:00Z'),
        recordedAt: new Date(),
      },
    });
    await assertAllowed('advisor');
    await prisma().osCommercialAccount.updateMany({
      where: { organizationId: orgA.id, partyId: ids.customer },
      data: { ownerMemberId: m.newOwner.member.id },
    });
    try {
      await assertDenied('owner');
      await assertDenied('advisor');
      await assertDenied('lead');
      await assertDenied('author');
      await assertAllowed('newOwner');
    } finally {
      await prisma().osCommercialAccount.updateMany({
        where: { organizationId: orgA.id, partyId: ids.customer },
        data: { ownerMemberId: m.owner.member.id },
      });
      await prisma().osCustomerCoverageGrant.delete({ where: { id: coverage.id } });
    }
  });

  it('a suspended owner gets ACCESS_REVOKED with no customer data on every read', async () => {
    const own = await get('suspended', `/parties/${ids.suspendedCustomer}/contacts`);
    assert.equal(own.status, 200);
    await prisma().osOrganizationMember.update({
      where: { id: m.suspended.member.id },
      data: { accessStatus: 'suspended' },
    });
    for (const path of [
      `/parties/${ids.suspendedCustomer}`,
      `/parties/${ids.suspendedCustomer}/contacts`,
      `/parties?q=70000055`,
      '/customer-conversations',
    ]) {
      const res = await get('suspended', path);
      assert.equal(res.status, 403, path);
      assert.deepEqual(res.body, { code: 'ACCESS_REVOKED' }, path);
    }
  });

  it('cross-tenant: a foreign id is the same NOT_FOUND, and the same phone in two orgs never crosses', async () => {
    const missing = await get('owner', `/parties/${createId()}/contacts`);
    for (const path of [`/parties/${ids.foreign}`, `/parties/${ids.foreign}/contacts`, `/parties/${ids.foreign}/timeline`]) {
      const res = await get('owner', path);
      assert.equal(res.status, missing.status, path);
      assert.deepEqual(res.body, missing.body, path);
      assert.ok(!res.text.includes(FOREIGN_NAME));
    }
    const a = await get('owner', `/parties?q=${PHONE_DIGITS}`);
    assert.deepEqual(a.body.items.map((i: { partyId: string }) => i.partyId), [ids.customer]);
    const b = await get('foreignOwner', `/parties?q=${PHONE_DIGITS}`, orgB.id);
    assert.deepEqual(b.body.items.map((i: { partyId: string }) => i.partyId), [ids.foreign]);
    assert.ok(!b.text.includes(CUSTOMER_NAME));
    const bConversations = await get('foreignOwner', `/customer-conversations?partyId=${ids.customer}`, orgB.id);
    assert.deepEqual(bConversations.body, { items: [] });
  });

  it('recording a conversation on an unreadable customer writes nothing and looks like an unknown customer', async () => {
    const body = { customerId: ids.customer, channel: 'manual', occurredAt: '2026-10-16T14:00:00.000Z', summary: 'intento' };
    for (const who of ['plain', 'peopleAdmin', 'author']) {
      const before = await conversations();
      const res = await fetch(`${baseUrl}/v1/customer-conversations`, {
        method: 'POST',
        headers: headers(orgA.id, m[who]!),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      assert.equal(res.status, 400, who);
      assert.match(text, /unknown_customer/);
      assert.ok(!text.includes(CUSTOMER_NAME));
      assert.equal(await conversations(), before, `${who} wrote a row`);
    }
    const before = await conversations();
    const ok = await fetch(`${baseUrl}/v1/customer-conversations`, {
      method: 'POST',
      headers: headers(orgA.id, m.owner!),
      body: JSON.stringify(body),
    });
    assert.equal(ok.status, 201, await ok.clone().text());
    assert.equal(await conversations(), before + 1);
  });
});
