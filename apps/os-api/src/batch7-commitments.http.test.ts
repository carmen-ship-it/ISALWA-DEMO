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
 * Batch 7 (T08/T09): creating, rescheduling, reassigning, cancelling and fulfilling commitments,
 * handover after a member loses access, and the member's own notices (read, acknowledged and
 * resolved are separate). Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { orgId: string; member: { id: string }; person: { id: string }; auth: { id: string } };
type Json = Record<string, any>;

const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

describeHttp('Batch 7 commitments and notices over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let otherOrg: { id: string };
  const m: Record<string, Seeded> = {};
  let customer = '';

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': who.orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `b7-${createId()}`,
    };
  }

  async function call(who: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: Json }> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: headers(m[who]!),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }
  const get = (who: string, path: string) => call(who, 'GET', path);
  const command = (who: string, name: string, body: Record<string, unknown>) =>
    call(who, 'POST', `/commands/${name}`, body);

  async function create(who: string, body: Record<string, unknown>): Promise<string> {
    const res = await command(who, 'CreateEmployeeCommitment', body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return String(res.body.data.commitmentId);
  }

  async function notices(who: string): Promise<Json[]> {
    const res = await get(who, '/notifications');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.items as Json[];
  }
  const noticesFor = async (who: string, commitmentId: string, kind?: string) =>
    (await notices(who)).filter((n) => n.source.recordId === commitmentId && (!kind || n.kind === kind));

  async function seedMember(orgId: string, name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@b7.bo`, name, 'B7');
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

  const suspend = (who: string) =>
    prisma().osOrganizationMember.update({ where: { id: m[who]!.member.id }, data: { accessStatus: 'suspended' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('B7 Org', `b7-${createId()}`);
    otherOrg = await store.seedOrganization('B7 Other Org', `b7-other-${createId()}`);
    m.seller = await seedMember(org.id, 'seller', ['sales_rep']);
    m.seller2 = await seedMember(org.id, 'seller2', ['sales_rep']);
    m.jefe = await seedMember(org.id, 'jefe', ['commercial.team.read', 'commercial.work.manage']);
    m.gerente = await seedMember(org.id, 'gerente', ['commercial.org.read', 'commercial.work.manage']);
    m.admin = await seedMember(org.id, 'admin', ['people.admin']);
    m.ops = await seedMember(org.id, 'ops', ['issue.manage']);
    m.foreign = await seedMember(otherOrg.id, 'foreign', ['commercial.org.read', 'commercial.work.manage', 'people.admin']);
    for (const report of ['seller', 'seller2']) {
      await prisma().osManagerAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: m[report]!.member.id, managerMemberId: m.jefe!.member.id, effectiveAt: new Date('2020-01-01') },
      });
    }
    customer = createId();
    await prisma().osParty.create({ data: { id: customer, organizationId: org.id, partyKind: 'organization', displayName: 'B7 Synth Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: customer, ownerMemberId: m.seller!.member.id } });
  });

  after(async () => {
    await app.close();
  });

  it('create for another member: the owner gets one assigned notice (deduped); read, acknowledged and resolved stay separate', async () => {
    const id = await create('gerente', {
      text: 'B7 enviar cotización firmada',
      partyId: customer,
      ownerMemberId: m.seller!.member.id,
      dueAt: inDays(3),
    });
    // The creator is not told about their own action.
    assert.equal((await noticesFor('gerente', id)).length, 0);

    const first = await noticesFor('seller', id, 'commitment_assigned');
    const second = await noticesFor('seller', id, 'commitment_assigned');
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(first[0]!.id, second[0]!.id);
    assert.deepEqual([first[0]!.readAt, first[0]!.acknowledgedAt, first[0]!.resolvedAt], [null, null, null]);
    assert.equal(first[0]!.channel, 'internal');

    // Only the recipient can touch it; other members and tenants get the missing-id answer.
    const missing = await call('seller', 'POST', `/notifications/${createId()}/read`);
    assert.equal(missing.status, 404);
    for (const who of ['gerente', 'jefe', 'admin', 'foreign']) {
      const res = await call(who, 'POST', `/notifications/${first[0]!.id}/read`);
      assert.deepEqual([res.status, res.body], [missing.status, missing.body], who);
    }

    const read = await call('seller', 'POST', `/notifications/${first[0]!.id}/read`);
    assert.equal(read.status, 201);
    assert.ok(read.body.item.readAt);
    assert.equal(read.body.item.acknowledgedAt, null);
    assert.equal(read.body.item.resolvedAt, null);
    const readAt = read.body.item.readAt;
    assert.equal((await call('seller', 'POST', `/notifications/${first[0]!.id}/read`)).body.item.readAt, readAt);

    const ack = await call('seller', 'POST', `/notifications/${first[0]!.id}/acknowledge`);
    assert.ok(ack.body.item.acknowledgedAt);
    assert.equal(ack.body.item.readAt, readAt);
    assert.equal(ack.body.item.resolvedAt, null);

    // Fulfilling resolves it: the condition is gone, and read/ack are kept as they were.
    const done = await command('seller', 'FulfillCommitment', { commitmentId: id, note: 'Enviada' });
    assert.equal(done.status, 201, JSON.stringify(done.body));
    const after = (await noticesFor('seller', id, 'commitment_assigned'))[0]!;
    assert.ok(after.resolvedAt);
    assert.equal(after.resolvedBecause, 'source_condition_gone');
    assert.equal(after.readAt, readAt);
    assert.ok(after.acknowledgedAt);
  });

  it('reschedule: owner only, reason required, previous deadline and actor are kept; an unchanged date is refused', async () => {
    const dueAt = inDays(2);
    const id = await create('seller', { text: 'B7 llamar al cliente', partyId: customer, dueAt });
    const newDue = inDays(6);

    assert.equal((await command('seller', 'RescheduleCommitment', { commitmentId: id, dueAt: newDue })).status, 400);
    assert.equal((await command('seller', 'RescheduleCommitment', { commitmentId: id, dueAt: newDue, reason: '  ' })).status, 400);
    assert.equal((await command('seller', 'RescheduleCommitment', { commitmentId: id, dueAt })).status, 400);
    // A manager who can read it is still not the owner.
    assert.equal((await command('gerente', 'RescheduleCommitment', { commitmentId: id, dueAt: newDue, reason: 'Yo lo muevo' })).status, 403);
    // Someone who cannot read the customer cannot tell it exists.
    assert.equal((await command('ops', 'RescheduleCommitment', { commitmentId: id, dueAt: newDue, reason: 'Yo lo muevo' })).status, 404);
    assert.equal((await get('seller', `/commitments/${id}`)).body.dueAt, dueAt);

    const ok = await command('seller', 'RescheduleCommitment', { commitmentId: id, dueAt: newDue, reason: 'El cliente pidió esperar' });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const detail = (await get('seller', `/commitments/${id}`)).body;
    assert.equal(detail.dueAt, newDue);
    assert.equal(detail.changes.length, 1);
    assert.deepEqual(
      [detail.changes[0].kind, detail.changes[0].previousDueAt, detail.changes[0].newDueAt, detail.changes[0].actorMemberId, detail.changes[0].reason],
      ['rescheduled', dueAt, newDue, m.seller!.member.id, 'El cliente pidió esperar'],
    );
    // The manager sees the history and may not act as the owner.
    const asManager = (await get('gerente', `/commitments/${id}`)).body;
    assert.equal(asManager.changes.length, 1);
    assert.deepEqual(
      [asManager.actor.canReschedule, asManager.actor.canCancel, asManager.actor.canFulfill, asManager.actor.canReassign],
      [false, false, false, true],
    );
    assert.deepEqual([detail.actor.canReschedule, detail.actor.handoverAuthority], [true, 'owner']);
  });

  it('cancel needs a reason, keeps it, and a cancelled commitment accepts no more actions', async () => {
    const id = await create('seller', { text: 'B7 cancelar esto', partyId: customer, dueAt: inDays(1) });
    assert.equal((await command('seller', 'CancelCommitment', { commitmentId: id })).status, 400);
    assert.equal((await command('gerente', 'CancelCommitment', { commitmentId: id, reason: 'Lo cancelo yo' })).status, 403);
    assert.equal((await command('seller', 'CancelCommitment', { commitmentId: id, reason: 'El cliente ya no lo necesita' })).status, 201);
    const detail = (await get('seller', `/commitments/${id}`)).body;
    assert.equal(detail.lifecycle, 'cancelled');
    assert.deepEqual([detail.changes[0].kind, detail.changes[0].reason], ['cancelled', 'El cliente ya no lo necesita']);
    assert.deepEqual([detail.actor.canFulfill, detail.actor.canReschedule, detail.actor.canReassign], [false, false, false]);
    for (const [name, body] of [
      ['RescheduleCommitment', { dueAt: inDays(9), reason: 'Otra vez' }],
      ['FulfillCommitment', {}],
      ['ReassignCommitmentOwner', { newOwnerMemberId: m.gerente!.member.id, reason: 'Otra vez' }],
    ] as const) {
      const res = await command('seller', name, { commitmentId: id, ...body });
      assert.ok([400, 409].includes(res.status), `${name} ${res.status}`);
    }
  });

  it('reassign: the owner hands over; the new owner is notified, the old owner\'s notices resolve; bad targets are refused without a trace', async () => {
    const id = await create('seller', { text: 'B7 preparar muestra', partyId: customer, dueAt: inDays(1) });
    const before = await prisma().osCommitmentChange.count({ where: { commitmentId: id } });

    // Cannot work this customer, suspended, unknown, another tenant, same owner, missing reason.
    const target = (who: string) => ({ commitmentId: id, newOwnerMemberId: m[who]!.member.id, reason: 'Se va de vacaciones' });
    assert.equal((await command('seller', 'ReassignCommitmentOwner', target('ops'))).status, 400);
    assert.equal((await command('seller', 'ReassignCommitmentOwner', target('foreign'))).status, 400);
    assert.equal((await command('seller', 'ReassignCommitmentOwner', { ...target('gerente'), newOwnerMemberId: createId() })).status, 400);
    assert.equal((await command('seller', 'ReassignCommitmentOwner', target('seller'))).status, 400);
    assert.equal((await command('seller', 'ReassignCommitmentOwner', { ...target('gerente'), reason: '' })).status, 400);
    assert.equal(await prisma().osCommitmentChange.count({ where: { commitmentId: id } }), before);
    assert.equal((await get('seller', `/commitments/${id}`)).body.ownerMemberId, m.seller!.member.id);

    const ok = await command('seller', 'ReassignCommitmentOwner', target('gerente'));
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const detail = (await get('gerente', `/commitments/${id}`)).body;
    assert.equal(detail.ownerMemberId, m.gerente!.member.id);
    assert.deepEqual(
      [detail.changes[0].kind, detail.changes[0].previousOwnerMemberId, detail.changes[0].newOwnerMemberId, detail.changes[0].actorMemberId],
      ['reassigned', m.seller!.member.id, m.gerente!.member.id, m.seller!.member.id],
    );
    assert.equal((await noticesFor('gerente', id, 'commitment_assigned')).length, 1);
    // The old owner no longer has a live notice for it, and is not told about their own action.
    const old = await noticesFor('seller', id);
    assert.ok(old.every((n) => n.resolvedAt !== null), JSON.stringify(old));
    // The old owner can no longer act.
    assert.equal((await command('seller', 'CancelCommitment', { commitmentId: id, reason: 'Ya no es mío' })).status, 403);
  });

  it('manager handover: a customer manager in range moves it; the previous owner is told once; team range limits the target', async () => {
    const id = await create('seller', { text: 'B7 revisar contrato', partyId: customer, dueAt: inDays(4) });
    const reason = 'Cubro mientras vuelve';
    // seller2 reports to jefe but cannot work this customer; the read-only team member has no authority at all.
    assert.equal((await command('jefe', 'ReassignCommitmentOwner', { commitmentId: id, newOwnerMemberId: m.seller2!.member.id, reason })).status, 400);
    assert.equal((await command('ops', 'ReassignCommitmentOwner', { commitmentId: id, newOwnerMemberId: m.ops!.member.id, reason })).status, 404);
    assert.equal((await command('admin', 'ReassignCommitmentOwner', { commitmentId: id, newOwnerMemberId: m.admin!.member.id, reason })).status, 404);

    const ok = await command('jefe', 'ReassignCommitmentOwner', { commitmentId: id, newOwnerMemberId: m.jefe!.member.id, reason });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal((await get('jefe', `/commitments/${id}`)).body.ownerMemberId, m.jefe!.member.id);
    const told = await noticesFor('seller', id, 'responsibility_changed');
    assert.equal(told.length, 1);
    assert.equal(told[0]!.resolvedAt, null);
    // Taking it on yourself is not announced to yourself.
    assert.equal((await noticesFor('jefe', id, 'commitment_assigned')).length, 0);
  });

  it('suspended owner: loses access; the work shows in the reassignment queue only for authorized members and moves on', async () => {
    const internal = await create('seller2', { text: 'B7 pedir repuestos', dueAt: inDays(1) });
    const customer2 = createId();
    await prisma().osParty.create({ data: { id: customer2, organizationId: org.id, partyKind: 'organization', displayName: 'B7 Synth Cliente 2' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: customer2, ownerMemberId: m.seller2!.member.id } });
    const customerOne = await create('seller2', { text: 'B7 entregar catálogo', partyId: customer2, dueAt: inDays(1) });
    // A commitment linked to another record has no handover authority; it stays with its owner.
    const other = createId();
    await prisma().osCommitment.create({
      data: {
        id: other,
        organizationId: org.id,
        ownerMemberId: m.seller2!.member.id,
        text: 'B7 ligado a otro registro',
        origin: 'employee_entered',
        relatedSubjectType: 'order',
        relatedSubjectId: createId(),
        lifecycle: 'open',
        createdByMemberId: m.seller2!.member.id,
      },
    });

    assert.equal((await get('admin', `/commitments/${internal}`)).status, 404, 'a live owner keeps it private');
    const queueBefore = (await get('admin', '/commitments?view=reassignment')).body.items as Json[];
    assert.equal(queueBefore.some((c) => c.id === internal), false);

    await suspend('seller2');
    assert.equal((await get('seller2', '/commitments')).status, 403);
    assert.equal((await get('seller2', '/notifications')).status, 403);
    assert.equal((await command('seller2', 'CancelCommitment', { commitmentId: internal, reason: 'Sigo entrando' })).status, 403);

    const queue = async (who: string) => ((await get(who, '/commitments?view=reassignment')).body.items as Json[]).map((c) => c.id);
    assert.deepEqual([(await queue('admin')).includes(internal), (await queue('admin')).includes(customerOne), (await queue('admin')).includes(other)], [true, false, false]);
    assert.deepEqual([(await queue('gerente')).includes(internal), (await queue('gerente')).includes(customerOne), (await queue('gerente')).includes(other)], [false, true, false]);
    assert.deepEqual(await queue('ops'), []);
    assert.deepEqual(await queue('foreign'), []);

    const view = (await get('admin', `/commitments/${internal}`)).body;
    assert.deepEqual([view.ownerAccessActive, view.actor.canReassign, view.actor.handoverAuthority], [false, true, 'workforce_continuity']);
    // issue.manage already reads commitments without a customer, but that is not authority to move them.
    const asOps = await get('ops', `/commitments/${internal}`);
    assert.deepEqual([asOps.status, asOps.body.actor.canReassign], [200, false]);

    // people.admin never moves a customer's work, and the target must be active.
    assert.equal((await command('admin', 'ReassignCommitmentOwner', { commitmentId: customerOne, newOwnerMemberId: m.admin!.member.id, reason: 'Continuidad' })).status, 404);
    assert.equal((await command('admin', 'ReassignCommitmentOwner', { commitmentId: internal, newOwnerMemberId: m.seller2!.member.id, reason: 'Continuidad' })).status, 400);

    const moved = await command('admin', 'ReassignCommitmentOwner', { commitmentId: internal, newOwnerMemberId: m.ops!.member.id, reason: 'Continuidad por baja de acceso' });
    assert.equal(moved.status, 201, 'moved ' + JSON.stringify(moved.body));
    assert.equal((await queue('admin')).includes(internal), false);
    const history = (await get('ops', `/commitments/${internal}`)).body;
    assert.equal(history.ownerMemberId, m.ops!.member.id);
    assert.equal(history.changes[0].previousOwnerMemberId, m.seller2!.member.id);
    assert.equal(history.changes[0].actorMemberId, m.admin!.member.id);
    assert.equal((await noticesFor('ops', internal, 'commitment_assigned')).length, 1);

    const moved2 = await command('gerente', 'ReassignCommitmentOwner', { commitmentId: customerOne, newOwnerMemberId: m.gerente!.member.id, reason: 'Cubro al cliente' });
    assert.equal(moved2.status, 201, 'moved2 ' + JSON.stringify(moved2.body));
    assert.equal((await queue('gerente')).includes(customerOne), false);
  });

  it('concurrency: two conflicting actions on one commitment have one winner', async () => {
    const id = await create('seller', { text: 'B7 carrera', partyId: customer, dueAt: inDays(2) });
    const [a, b] = await Promise.all([
      command('seller', 'CancelCommitment', { commitmentId: id, reason: 'Cancelo en paralelo' }),
      command('seller', 'FulfillCommitment', { commitmentId: id, note: 'Cumplo en paralelo' }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.equal(statuses[0], 201, JSON.stringify([a.body, b.body]));
    assert.ok([400, 409].includes(statuses[1]!), JSON.stringify([a.body, b.body]));
    const changes = await prisma().osCommitmentChange.findMany({ where: { commitmentId: id } });
    assert.equal(changes.length, 1);
    const detail = (await get('seller', `/commitments/${id}`)).body;
    assert.equal(detail.lifecycle, changes[0]!.kind === 'cancelled' ? 'cancelled' : 'fulfilled');
  });

  it('due and overdue notices appear once for the current owner and resolve when the date moves or the work is done', async () => {
    const yesterday = new Date(Date.now() - 2 * DAY).toISOString();
    const id = await create('seller', { text: 'B7 vencido', partyId: customer, dueAt: yesterday });
    const overdue = async () => noticesFor('seller', id, 'commitment_overdue');
    assert.equal((await overdue()).length, 1);
    assert.equal((await overdue()).length, 1, 'listing twice does not duplicate');
    assert.equal((await overdue())[0]!.resolvedAt, null);
    // Nobody else is notified about the owner's overdue promise.
    for (const who of ['jefe', 'gerente', 'admin']) assert.equal((await noticesFor(who, id)).length, 0, who);
    assert.equal((await get('seller', `/commitments/${id}`)).body.state, 'overdue');

    assert.equal((await command('seller', 'RescheduleCommitment', { commitmentId: id, dueAt: inDays(5), reason: 'Nueva fecha acordada' })).status, 201);
    const resolved = (await overdue())[0]!;
    assert.equal(resolved.resolvedBecause, 'source_condition_gone');
    assert.equal((await noticesFor('seller', id, 'commitment_due')).length, 0);

    // Another tenant never sees these notices.
    assert.equal((await noticesFor('foreign', id)).length, 0);
  });

  it('source: a customer-reported promise is stored with its origin and still assigns to the responsible member', async () => {
    const res = await command('jefe', 'CreateCustomerReportedCommitment', {
      text: 'B7 el cliente prometió pagar el viernes',
      partyId: customer,
      ownerMemberId: m.seller!.member.id,
      dueAt: inDays(3),
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const detail = (await get('seller', `/commitments/${res.body.data.commitmentId}`)).body;
    assert.equal(detail.origin, 'customer_reported');
    assert.equal(detail.ownerMemberId, m.seller!.member.id);
  });
});
