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
 * V2 T02: the operational GETs left in the inspection ledger (delivery-ops, delivery
 * notes + PDF, fulfillment, AI capability). Two tenants, unauthorized roles, suspended
 * member, foreign ids. Bodies are checked for private customer data, not only status.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Tenant = { orgId: string; partyId: string; orderId: string; noteId: string; name: string };

const SECRET_PHONE = '+59171112222';
const SECRET_EMAIL = 'gerencia@cliente-operativo.bo';
const SECRET_ADDRESS = 'Av. Privada 742';
const FOREIGN_SECRET = 'Cliente Ajeno Operativo';

describeHttp('T02 operational reads over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  const m: Record<string, Seeded & { orgId: string }> = {};
  let a: Tenant;
  let b: Tenant;

  const get = async (who: string, path: string, orgOverride?: string) => {
    const actor = m[who]!;
    const res = await fetch(`${baseUrl}/v1${path}`, {
      headers: {
        'x-os-organization-id': orgOverride ?? actor.orgId,
        'x-os-member-id': actor.member.id,
        'x-os-person-id': actor.person.id,
        'x-os-auth-identity-id': actor.auth.id,
      },
    });
    const type = res.headers.get('content-type') ?? '';
    const raw = Buffer.from(await res.arrayBuffer());
    const text = type.includes('json') ? raw.toString('utf8') : raw.toString('latin1');
    return { status: res.status, type, text, body: type.includes('json') && text ? JSON.parse(text) : null };
  };

  function noPrivateData(text: string, label: string) {
    for (const secret of [SECRET_PHONE, SECRET_EMAIL, SECRET_ADDRESS, '71112222']) {
      assert.equal(text.includes(secret), false, `${label} leaked ${secret}`);
    }
  }

  async function seedMember(orgId: string, name: string, roleKeys: string[]) {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@ops.bo`, name, 'OPS');
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
    return { ...seeded, orgId };
  }

  async function seedTenant(orgId: string, name: string, ownerMemberId: string): Promise<Tenant> {
    const partyId = createId();
    const quoteId = createId();
    const orderId = createId();
    const noteId = createId();
    await prisma().osParty.create({ data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: name } });
    await prisma().osPartyRoleAssignment.create({
      data: { id: createId(), organizationId: orgId, partyId, roleKey: 'customer', effectiveAt: new Date('2020-01-01') },
    });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: orgId, partyId, ownerMemberId } });
    await prisma().osContact.create({
      data: { id: createId(), organizationId: orgId, organizationPartyId: partyId, givenName: 'Ana', familyName: 'Privada', phone: SECRET_PHONE, email: SECRET_EMAIL },
    });
    await prisma().osLocation.create({ data: { id: createId(), organizationId: orgId, partyId, label: 'Planta', addressText: SECRET_ADDRESS } });
    await prisma().osQuote.create({
      data: { id: quoteId, organizationId: orgId, partyId, ownerMemberId, quoteNumber: `COT-${orderId.slice(-6)}`, status: 'accepted' },
    });
    await prisma().osOrder.create({
      data: {
        id: orderId, organizationId: orgId, partyId, quoteId, ownerMemberId,
        orderNumber: `PED-${orderId.slice(-6)}`, subtotalCentavos: 10000n, totalCentavos: 10000n,
      },
    });
    await prisma().osDeliveryNote.create({
      data: {
        id: noteId, organizationId: orgId, orderId, partyId, documentKind: 'nota_de_entrega', numberingPolicy: 'provisional_internal',
        internalDocumentRef: `NE-PILOT-${noteId}`, status: 'issued', recipient: 'Recepción', deliveredBy: 'Chofer',
        createdByMemberId: ownerMemberId, bornAt: new Date('2026-10-10T15:00:00Z'),
      },
    });
    await prisma().osWarehouseExit.create({
      data: { id: createId(), organizationId: orgId, orderId, exitedAt: new Date('2026-10-10T14:00:00Z'), recordedByMemberId: ownerMemberId, source: 'employee_recorded' },
    });
    await prisma().osDelivery.create({
      data: { id: createId(), organizationId: orgId, orderId, deliveredAt: new Date('2026-10-10T16:00:00Z'), recordedByMemberId: ownerMemberId, source: 'employee_recorded' },
    });
    return { orgId, partyId, orderId, noteId, name };
  }

  const operationalPaths = (t: Tenant) => [
    '/delivery-ops/orders',
    `/delivery-ops/orders/${t.orderId}`,
    `/delivery-ops/orders/${t.orderId}/documents`,
    `/delivery-notes?orderId=${t.orderId}`,
    `/delivery-notes/${t.noteId}/pdf`,
    '/fulfillment/deliveries',
    '/fulfillment/warehouse-exits',
  ];

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    const orgA = await store.seedOrganization('OPS A', `ops-a-${createId()}`);
    const orgB = await store.seedOrganization('OPS B', `ops-b-${createId()}`);
    const opsScopes = ['delivery.record', 'warehouse.outbound.record', 'management.org.read'];
    m.ops = await seedMember(orgA.id, 'ops', opsScopes);
    m.opsSuspended = await seedMember(orgA.id, 'opssuspended', opsScopes);
    m.foreignOps = await seedMember(orgB.id, 'foreignops', opsScopes);
    m.plain = await seedMember(orgA.id, 'plain', []);
    m.peopleAdmin = await seedMember(orgA.id, 'peopleadmin', ['people.admin']);
    m.masterData = await seedMember(orgA.id, 'masterdata', ['master_data.admin']);
    m.customerReader = await seedMember(orgA.id, 'customerreader', ['commercial.org.read']);
    m.teamLead = await seedMember(orgA.id, 'teamlead', ['commercial.team.read']);

    a = await seedTenant(orgA.id, 'Cliente Operativo A', m.plain.member.id);
    b = await seedTenant(orgB.id, FOREIGN_SECRET, m.foreignOps.member.id);
  });

  after(async () => {
    await app.close();
  });

  it('roles without an operational scope get PERMISSION_DENIED and no data on every operational read', async () => {
    for (const who of ['plain', 'peopleAdmin', 'masterData', 'customerReader', 'teamLead']) {
      for (const path of operationalPaths(a)) {
        const res = await get(who, path);
        assert.equal(res.status, 403, `${who} ${path}`);
        assert.deepEqual(res.body, { code: 'PERMISSION_DENIED' }, `${who} ${path}`);
        assert.equal(res.text.includes(a.name), false, `${who} ${path}`);
      }
    }
  });

  it('the authorized operator reads its tenant with the minimum customer field and never contact details', async () => {
    const list = await get('ops', '/delivery-ops/orders');
    assert.equal(list.status, 200);
    assert.ok(list.text.includes(a.orderId));
    assert.ok(list.text.includes(a.name));
    for (const path of operationalPaths(a)) {
      const res = await get('ops', path);
      assert.equal(res.status, 200, path);
      noPrivateData(res.text, path);
      assert.equal(res.text.includes(b.orderId), false, path);
      assert.equal(res.text.includes(FOREIGN_SECRET), false, path);
    }
    const pdf = await get('ops', `/delivery-notes/${a.noteId}/pdf`);
    assert.ok(pdf.type.includes('pdf'));
  });

  it('foreign ids are the same NOT_FOUND as missing ids and expose nothing from the other tenant', async () => {
    const missing = createId();
    const pairs: Array<[string, string]> = [
      [`/delivery-ops/orders/${b.orderId}`, `/delivery-ops/orders/${missing}`],
      [`/delivery-ops/orders/${b.orderId}/documents`, `/delivery-ops/orders/${missing}/documents`],
      [`/delivery-notes?orderId=${b.orderId}`, `/delivery-notes?orderId=${missing}`],
      [`/delivery-notes/${b.noteId}/pdf`, `/delivery-notes/${missing}/pdf`],
    ];
    for (const [foreign, absent] of pairs) {
      const f = await get('ops', foreign);
      const x = await get('ops', absent);
      assert.equal(f.status, 404, foreign);
      assert.deepEqual(f.body, x.body, foreign);
      assert.deepEqual(f.body, { code: 'NOT_FOUND' }, foreign);
      assert.equal(f.text.includes(FOREIGN_SECRET), false, foreign);
    }
  });

  it('an operator presenting another organization header is refused without data', async () => {
    for (const path of operationalPaths(b)) {
      const res = await get('ops', path, b.orgId);
      assert.equal(res.status, 403, path);
      assert.equal(res.text.includes(FOREIGN_SECRET), false, path);
      assert.equal(res.text.includes(b.orderId), false, path);
    }
  });

  it('a suspended operator gets ACCESS_REVOKED on every operational read and the AI capability read', async () => {
    assert.equal((await get('opsSuspended', '/delivery-ops/orders')).status, 200);
    await prisma().osOrganizationMember.update({
      where: { id: m.opsSuspended.member.id },
      data: { accessStatus: 'suspended' },
    });
    for (const path of [...operationalPaths(a), '/ai/capability']) {
      const res = await get('opsSuspended', path);
      assert.equal(res.status, 403, path);
      assert.deepEqual(res.body, { code: 'ACCESS_REVOKED' }, path);
    }
  });

  it('AI capability is member-level and carries no customer data', async () => {
    const res = await get('plain', '/ai/capability');
    assert.equal(res.status, 200);
    noPrivateData(res.text, '/ai/capability');
    assert.equal(res.text.includes(a.name), false);
    assert.equal(res.text.includes(a.partyId), false);
    console.log(`[evidence] /ai/capability plain member body keys=${Object.keys(res.body ?? {}).sort().join(',')}`);
  });
});
