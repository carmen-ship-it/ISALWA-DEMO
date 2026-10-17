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
 * F07: commitments are read by their owner, a manager in range of the owner, whoever can
 * read the linked customer, and issue.manage only when no customer is linked. Hidden
 * commitments answer exactly like missing ones. Creating a commitment on a customer the
 * actor cannot read is NOT_FOUND. Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { orgId: string; member: { id: string }; person: { id: string }; auth: { id: string } };
type Item = { id: string };

describeHttp('F07 commitment reads over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let otherOrg: { id: string };
  const m: Record<string, Seeded> = {};
  const ids = { customer: '', supplier: '', customerCommitment: '', supplierCommitment: '' };

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': who.orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `f07-${createId()}`,
    };
  }

  async function get(who: string, path: string): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function listIds(who: string, path: string): Promise<string[]> {
    const res = await get(who, path);
    assert.equal(res.status, 200, `${who} ${path}`);
    return (res.body.items as Item[]).map((item) => item.id);
  }

  async function command(who: string, name: string, body: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : {}) as { data?: Record<string, unknown> } };
  }

  async function seedMember(orgId: string, name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@f07.bo`, name, 'F07');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({ where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' } });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return { ...seeded, orgId };
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('F07 Org', `f07-${createId()}`);
    otherOrg = await store.seedOrganization('F07 Other Org', `f07-other-${createId()}`);
    m.advisorA = await seedMember(org.id, 'advisora', ['sales_rep']);
    m.advisorB = await seedMember(org.id, 'advisorb', ['sales_rep']);
    m.jefeA = await seedMember(org.id, 'jefea', ['commercial.team.read']);
    m.otherJefe = await seedMember(org.id, 'otherjefe', ['commercial.team.read']);
    m.gerente = await seedMember(org.id, 'gerente', ['commercial.org.read']);
    m.ops = await seedMember(org.id, 'ops', ['issue.manage']);
    m.admin = await seedMember(org.id, 'admin', ['people.admin']);
    m.buyer = await seedMember(org.id, 'buyer', ['sales_rep']);
    m.foreign = await seedMember(otherOrg.id, 'foreign', ['commercial.org.read', 'issue.manage']);
    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: org.id, memberId: m.advisorA!.member.id, managerMemberId: m.jefeA!.member.id, effectiveAt: new Date('2020-01-01') },
    });

    ids.customer = createId();
    await prisma().osParty.create({ data: { id: ids.customer, organizationId: org.id, partyKind: 'organization', displayName: 'F07 Synth Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: ids.customer, ownerMemberId: m.advisorA!.member.id } });
    ids.supplier = createId();
    await prisma().osParty.create({ data: { id: ids.supplier, organizationId: org.id, partyKind: 'organization', displayName: 'F07 Synth Proveedor' } });
    await prisma().osPartyRoleAssignment.create({
      data: { id: createId(), organizationId: org.id, partyId: ids.supplier, roleKey: 'supplier', effectiveAt: new Date('2020-01-01') },
    });

    const onCustomer = await command('advisorA', 'CreateEmployeeCommitment', { text: 'F07 entregar muestra al cliente', partyId: ids.customer });
    assert.equal(onCustomer.status, 201, JSON.stringify(onCustomer.body));
    ids.customerCommitment = String(onCustomer.body.data!.commitmentId);
    const onSupplier = await command('buyer', 'CreateEmployeeCommitment', { text: 'F07 confirmar insumos', partyId: ids.supplier });
    assert.equal(onSupplier.status, 201, JSON.stringify(onSupplier.body));
    ids.supplierCommitment = String(onSupplier.body.data!.commitmentId);
  });

  after(async () => {
    await app.close();
  });

  it('detail: owner, manager in range and org.read read a customer commitment; another advisor, an unrelated manager, issue.manage, people.admin and another tenant get the missing-id 404', async () => {
    const path = `/commitments/${ids.customerCommitment}`;
    for (const who of ['advisorA', 'jefeA', 'gerente']) {
      assert.equal((await get(who, path)).status, 200, who);
    }
    const missing = await get('advisorB', `/commitments/${createId()}`);
    assert.equal(missing.status, 404);
    for (const who of ['advisorB', 'otherJefe', 'ops', 'admin', 'foreign']) {
      const res = await get(who, path);
      assert.deepEqual([res.status, res.body], [missing.status, missing.body], who);
    }
  });

  it('list: another advisor sees nothing of A\'s customer commitment by org, by owner or by party; the manager in range does', async () => {
    const owner = m.advisorA!.member.id;
    for (const path of ['/commitments', `/commitments?ownerMemberId=${owner}`, `/commitments?ownerMemberId=${owner}&lifecycle=open`, `/commitments?partyId=${ids.customer}`]) {
      for (const who of ['advisorB', 'otherJefe', 'ops', 'admin']) {
        assert.equal((await listIds(who, path)).includes(ids.customerCommitment), false, `${who} ${path}`);
      }
      for (const who of ['advisorA', 'jefeA', 'gerente']) {
        assert.equal((await listIds(who, path)).includes(ids.customerCommitment), true, `${who} ${path}`);
      }
    }
    assert.deepEqual(await listIds('foreign', `/commitments?partyId=${ids.customer}`), []);
  });

  it('issue.manage keeps non-customer commitments; unrelated members do not read them', async () => {
    const path = `/commitments/${ids.supplierCommitment}`;
    for (const who of ['buyer', 'ops']) assert.equal((await get(who, path)).status, 200, who);
    for (const who of ['advisorB', 'admin', 'foreign']) assert.equal((await get(who, path)).status, 404, who);
    assert.equal((await listIds('ops', `/commitments?partyId=${ids.supplier}`)).includes(ids.supplierCommitment), true);
  });

  it('create: a customer the actor cannot read answers like a missing party; a supplier party stays linkable', async () => {
    const hidden = await command('advisorB', 'CreateEmployeeCommitment', { text: 'F07 intento ajeno', partyId: ids.customer });
    const missing = await command('advisorB', 'CreateEmployeeCommitment', { text: 'F07 intento ajeno', partyId: createId() });
    assert.equal(missing.status, 404);
    assert.deepEqual([hidden.status, hidden.body], [missing.status, missing.body]);
    const viaOwner = await command('advisorB', 'CreateEmployeeCommitment', { text: 'F07 intento ajeno', partyId: ids.customer, ownerMemberId: m.advisorA!.member.id });
    assert.equal(viaOwner.status, 404);
    const supplier = await command('advisorB', 'CreateEmployeeCommitment', { text: 'F07 proveedor', partyId: ids.supplier });
    assert.equal(supplier.status, 201, JSON.stringify(supplier.body));
    const jefe = await command('jefeA', 'CreateEmployeeCommitment', { text: 'F07 seguimiento jefe', partyId: ids.customer });
    assert.equal(jefe.status, 201, JSON.stringify(jefe.body));
  });
});
