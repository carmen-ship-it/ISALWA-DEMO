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
 * R4 read gaps (20:03 §4; F10 authorship half, F11): work items and approvals are read
 * through assigned responsibility, the approver, or explicit managerial read scope.
 * people.admin and authorship authorize nothing; unknowable records are 404 like
 * missing ones. Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describeHttp('R4 work and approval reads over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids = { work: '', approval: '', quote: '', party: '' };

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `r4-reads-${createId()}`,
    };
  }

  async function get(who: string, path: string): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function command(who: string, name: string, body: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : {}) as { data?: Record<string, unknown> } };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4reads.bo`, name, 'R4');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
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
    org = await store.seedOrganization('R4 Reads Org', `r4-reads-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.owner = await seedMember('owner', ['sales_rep']);
    m.jefe = await seedMember('jefe', ['commercial.team.read']);
    m.otherJefe = await seedMember('otherjefe', ['commercial.team.read']);
    m.gerente = await seedMember('gerente', ['commercial.org.read']);
    m.approver = await seedMember('approver', ['sales_rep']);
    m.outsider = await seedMember('outsider', ['sales_rep']);
    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: org.id, memberId: m.owner!.member.id, managerMemberId: m.jefe!.member.id, effectiveAt: new Date('2020-01-01') },
    });

    const created = await command('admin', 'CreateWorkItem', { title: 'R4 private work', ownerMemberId: m.owner!.member.id });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ids.work = String(created.body.data!.workItemId);
    const requested = await command('owner', 'RequestApproval', {
      approverMemberId: m.approver!.member.id,
      subjectType: 'work_item',
      subjectId: ids.work,
    });
    assert.equal(requested.status, 201, JSON.stringify(requested.body));
    ids.approval = String(requested.body.data!.approvalRequestId);
    await runner.runOnce();
    await runner.runOnce();

    ids.party = createId();
    await prisma().osParty.create({ data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'R4 Synth Cliente' } });
    ids.quote = createId();
    await prisma().osQuote.create({
      data: { id: ids.quote, organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id, quoteNumber: `R4-${createId().slice(-8)}`, status: 'submitted' },
    });
    await prisma().osApprovalRequest.create({
      data: {
        id: createId(),
        organizationId: org.id,
        subjectType: 'quote',
        subjectId: ids.quote,
        requestedByMemberId: m.owner!.member.id,
        approverMemberId: m.approver!.member.id,
        status: 'pending',
        contextSnapshotJson: {},
      },
    });
  });

  after(async () => {
    await app.close();
  });

  it('work detail: owner, direct manager (team.read) and org.read read it; creator with people.admin, unrelated team.read and outsiders get the same 404 as a missing id', async () => {
    for (const who of ['owner', 'jefe', 'gerente']) {
      const res = await get(who, `/work-items/${ids.work}`);
      assert.equal(res.status, 200, who);
    }
    const missing = await get('outsider', `/work-items/${createId()}`);
    assert.equal(missing.status, 404);
    for (const who of ['admin', 'otherJefe', 'outsider', 'approver']) {
      const res = await get(who, `/work-items/${ids.work}`);
      assert.deepEqual([res.status, res.body], [missing.status, missing.body], who);
    }
  });

  it('work list: people.admin cannot list another owner and its default list does not include work it only created', async () => {
    const filtered = await get('admin', `/work-items?ownerMemberId=${m.owner!.member.id}`);
    assert.equal(filtered.status, 403);
    const own = await get('admin', '/work-items');
    assert.equal(own.status, 200);
    assert.equal((own.body.items as Array<{ workItemId: string }>).some((item) => item.workItemId === ids.work), false);
    const team = await get('jefe', '/work-items?visibility=team');
    assert.equal((team.body.items as Array<{ workItemId: string }>).some((item) => item.workItemId === ids.work), true);
  });

  it('approval detail: approver, requester who still owns the work, and the manager read it; people.admin and outsiders get 404', async () => {
    for (const who of ['approver', 'owner', 'jefe', 'gerente']) {
      assert.equal((await get(who, `/approvals/${ids.approval}`)).status, 200, who);
    }
    for (const who of ['admin', 'otherJefe', 'outsider']) {
      assert.equal((await get(who, `/approvals/${ids.approval}`)).status, 404, who);
    }
    assert.equal((await get('admin', `/approvals?approverMemberId=${m.approver!.member.id}`)).status, 403);
  });

  it('quote subject approvals: owner, approver and the owner\'s manager read them; team.read without that report and people.admin get 404', async () => {
    const path = `/approvals/subject?subjectType=quote&subjectId=${ids.quote}`;
    for (const who of ['owner', 'approver', 'jefe', 'gerente']) {
      const res = await get(who, path);
      assert.equal(res.status, 200, who);
      assert.equal((res.body.items as unknown[]).length, 1, who);
    }
    for (const who of ['otherJefe', 'admin', 'outsider']) {
      assert.equal((await get(who, path)).status, 404, who);
    }
  });

  it('customer scope: work about a customer (party or commercial account subject) is read by that customer\'s account owner, not by others', async () => {
    const party = createId();
    const account = createId();
    await prisma().osParty.create({ data: { id: party, organizationId: org.id, partyKind: 'organization', displayName: 'R4 Synth Cuenta' } });
    await prisma().osCommercialAccount.create({ data: { id: account, organizationId: org.id, partyId: party, ownerMemberId: m.approver!.member.id } });
    const onParty = await command('admin', 'CreateWorkItem', { title: 'R4 party work', ownerMemberId: m.outsider!.member.id, subjectType: 'party', subjectId: party });
    const onAccount = await command('admin', 'CreateWorkItem', { title: 'R4 account work', ownerMemberId: m.outsider!.member.id, subjectType: 'commercial_account', subjectId: account });
    assert.equal(onParty.status, 201, JSON.stringify(onParty.body));
    assert.equal(onAccount.status, 201, JSON.stringify(onAccount.body));
    await runner.runOnce();
    await runner.runOnce();
    for (const created of [onParty, onAccount]) {
      const path = `/work-items/${String(created.body.data!.workItemId)}`;
      assert.equal((await get('approver', path)).status, 200, 'account owner');
      assert.equal((await get('gerente', path)).status, 200, 'commercial.org.read');
      for (const who of ['owner', 'jefe', 'admin']) assert.equal((await get(who, path)).status, 404, who);
    }
  });

  it('authorship is not authority: after the quote and the work move to another owner, the original requester loses both reads', async () => {
    await prisma().osQuote.update({ where: { id: ids.quote }, data: { ownerMemberId: m.outsider!.member.id } });
    const reassigned = await command('admin', 'ReassignWork', { workItemId: ids.work, newOwnerMemberId: m.outsider!.member.id });
    assert.equal(reassigned.status, 201, JSON.stringify(reassigned.body));
    await runner.runOnce();
    await runner.runOnce();
    assert.equal((await get('owner', `/approvals/subject?subjectType=quote&subjectId=${ids.quote}`)).status, 404);
    assert.equal((await get('owner', `/approvals/${ids.approval}`)).status, 404);
    assert.equal((await get('owner', `/work-items/${ids.work}`)).status, 404);
    assert.equal((await get('outsider', `/work-items/${ids.work}`)).status, 200);
    assert.equal((await get('approver', `/approvals/${ids.approval}`)).status, 200);
  });
});
