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
 * R4 23:27 §1: ReassignWork needs current authority over the work and the specific
 * permission for its class. people.admin alone moves only general (workforce) work;
 * customer work needs commercial.work.manage plus range; purchasing prep reviews are not
 * reassignable. Refused attempts change nothing. Real Nest app, disposable Postgres,
 * synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('R4 ReassignWork authority over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let foreignOrg: { id: string };
  const m: Record<string, Seeded> = {};
  const w: Record<string, string> = {};
  let partyId = '';

  function headers(who: Seeded, orgId = org.id): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `r4-reassign-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[], orgId = org.id): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@r4rw.bo`, name, 'R4');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({ where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' } });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function reportsTo(memberId: string, managerMemberId: string) {
    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: org.id, memberId, managerMemberId, effectiveAt: new Date('2020-01-01') },
    });
  }

  async function createWork(key: string, body: Record<string, unknown>) {
    const created = await command('admin', 'CreateWorkItem', { ownerMemberId: m.seller!.member.id, ...body });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    w[key] = String((created.body.data as Record<string, unknown>).workItemId);
  }

  /** Everything a reassignment could write for this item. */
  async function footprint(workItemId: string) {
    const item = await prisma().osWorkItem.findUniqueOrThrow({ where: { id: workItemId } });
    const events = await prisma().osBusinessEvent.findMany({ where: { primaryEntityId: workItemId }, select: { id: true } });
    return {
      owner: item.ownerMemberId,
      version: item.version,
      history: await prisma().osWorkItemOwnershipHistory.count({ where: { workItemId } }),
      events: events.length,
      outbox: await prisma().osOutboxMessage.count({ where: { eventId: { in: events.map((e) => e.id) } } }),
      audit: await prisma().osAuditLog.count({ where: { resourceId: workItemId } }),
      notifications: await prisma().osInternalNotification.count({ where: { sourceRecordId: workItemId } }),
    };
  }

  async function refusedWithoutMutation(who: string, workItemId: string, target: string, status: number) {
    const before = await footprint(workItemId);
    const res = await command(who, 'ReassignWork', { workItemId, newOwnerMemberId: target });
    assert.equal(res.status, status, `${who}: ${JSON.stringify(res.body)}`);
    await runner.runOnce();
    assert.deepEqual(await footprint(workItemId), before, `${who} left a trace`);
    return res;
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
    org = await store.seedOrganization('R4 Reassign Org', `r4-rw-${createId()}`);
    foreignOrg = await store.seedOrganization('R4 Reassign Foreign', `r4-rwf-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.seller = await seedMember('seller', ['sales_rep']);
    m.seller2 = await seedMember('seller2', ['sales_rep']);
    m.jefe = await seedMember('jefe', ['commercial.team.read', 'commercial.work.manage']);
    m.jefeReadOnly = await seedMember('jefero', ['commercial.team.read']);
    m.gerente = await seedMember('gerente', ['commercial.org.read', 'commercial.work.manage']);
    m.compras = await seedMember('compras', ['purchasing.operational.record']);
    m.outsider = await seedMember('outsider', ['sales_rep']);
    m.suspended = await seedMember('suspended', ['sales_rep']);
    m.foreign = await seedMember('foreign', ['sales_rep'], foreignOrg.id);
    await prisma().osOrganizationMember.update({ where: { id: m.suspended!.member.id }, data: { accessStatus: 'suspended' } });
    await reportsTo(m.seller!.member.id, m.jefe!.member.id);
    await reportsTo(m.seller2!.member.id, m.jefe!.member.id);
    await reportsTo(m.suspended!.member.id, m.jefe!.member.id);
    await reportsTo(m.seller!.member.id, m.jefeReadOnly!.member.id);

    partyId = createId();
    await prisma().osParty.create({ data: { id: partyId, organizationId: org.id, partyKind: 'organization', displayName: 'R4 RW Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId, ownerMemberId: m.seller!.member.id } });

    await createWork('customer', { title: 'R4 customer follow-up', subjectType: 'party', subjectId: partyId });
    await createWork('linked', { title: 'R4 linked to customer work', subjectType: 'work_item', subjectId: w.customer });
    await createWork('purchasing', { title: 'R4 compras', description: '[[order-prep:purchasing:ORD-R4]]' });
    await createWork('general', { title: 'R4 general handover' });
    await createWork('general2', { title: 'R4 general stays' });
    await runner.runOnce();
    await runner.runOnce();
  });

  after(async () => {
    await app.close();
  });

  it('people.admin alone cannot move customer, linked-customer or purchasing work: missing-id answer, no ownership, event, outbox, audit or notification', async () => {
    const missing = await command('admin', 'ReassignWork', { workItemId: createId(), newOwnerMemberId: m.outsider!.member.id });
    assert.equal(missing.status, 404);
    for (const key of ['customer', 'linked', 'purchasing']) {
      const res = await refusedWithoutMutation('admin', w[key]!, m.outsider!.member.id, 404);
      assert.deepEqual(res.body, missing.body, key);
    }
  });

  it('out-of-scope actors are refused without mutation: team.read without work.manage, unrelated members, Compras on purchasing; the owner gets 403', async () => {
    await refusedWithoutMutation('jefeReadOnly', w.customer!, m.seller!.member.id, 404);
    await refusedWithoutMutation('outsider', w.customer!, m.outsider!.member.id, 404);
    await refusedWithoutMutation('compras', w.purchasing!, m.compras!.member.id, 404);
    await refusedWithoutMutation('seller', w.customer!, m.seller2!.member.id, 403);
    await refusedWithoutMutation('seller', w.purchasing!, m.seller2!.member.id, 403);
    await refusedWithoutMutation('jefe', w.general!, m.seller2!.member.id, 404);
  });

  it('target validation: other tenant, suspended (even a direct report), unknown and outside the team range are refused without mutation', async () => {
    for (const target of [m.foreign!.member.id, m.suspended!.member.id, createId(), m.outsider!.member.id]) {
      await refusedWithoutMutation('jefe', w.customer!, target, 400);
    }
    for (const target of [m.foreign!.member.id, m.suspended!.member.id, createId()]) {
      await refusedWithoutMutation('gerente', w.customer!, target, 400);
      await refusedWithoutMutation('admin', w.general!, target, 400);
    }
  });

  it('commercial.work.manage with team range moves customer work to a direct report; the target gains no customer access', async () => {
    const before = await footprint(w.customer!);
    const moved = await command('jefe', 'ReassignWork', { workItemId: w.customer, newOwnerMemberId: m.seller2!.member.id });
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
    const after = await footprint(w.customer!);
    assert.equal(after.owner, m.seller2!.member.id);
    assert.equal(after.history, before.history + 1);
    assert.equal(after.events, before.events + 1);
    await runner.runOnce();
    await runner.runOnce();
    assert.equal((await get('seller2', `/parties/${partyId}`)).status, 404, 'work assignment does not grant customer access');
    assert.equal((await get('seller2', `/work-items/${w.customer}`)).status, 200);
  });

  it('commercial.work.manage with organization range moves customer work to any active member; linked work follows its referenced class', async () => {
    const moved = await command('gerente', 'ReassignWork', { workItemId: w.customer, newOwnerMemberId: m.outsider!.member.id });
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
    const linked = await command('gerente', 'ReassignWork', { workItemId: w.linked, newOwnerMemberId: m.outsider!.member.id });
    assert.equal(linked.status, 201, JSON.stringify(linked.body));
  });

  it('workforce continuity is preserved: people.admin lists and moves only the member\'s general work', async () => {
    const listed = await get('admin', `/work-items?status=open&ownerMemberId=${m.seller!.member.id}&limit=100`);
    assert.equal(listed.status, 200);
    const ids = (listed.body.items as Array<{ workItemId: string }>).map((item) => item.workItemId).sort();
    assert.deepEqual(ids, [w.general!, w.general2!].sort());
    const moved = await command('admin', 'ReassignWork', { workItemId: w.general, newOwnerMemberId: m.seller2!.member.id });
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
    assert.equal((await footprint(w.general!)).owner, m.seller2!.member.id);
  });
});
