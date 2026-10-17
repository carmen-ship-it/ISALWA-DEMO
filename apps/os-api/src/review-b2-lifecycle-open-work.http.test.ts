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
 * 23:47 §B2: open work does not block suspension or termination. Access ends at once;
 * the member's work, quote and account stay as they were (history kept); the lifecycle
 * event records what is unresolved; people.admin still sees it in the member's impact and
 * the manager in range still reads it, so it can be reassigned. No replacement is needed
 * and none keeps access. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('B2 suspension and termination with open work over HTTP (disposable Postgres)', () => {
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
      'idempotency-key': `b2-${createId()}`,
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

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@b2.bo`, name, 'B2');
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

  const lastEvent = (eventType: string, memberId: string) =>
    prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType, primaryEntityId: memberId },
      orderBy: { occurredAt: 'desc' },
    });

  const data = (reply: Reply) => reply.body.data as Record<string, unknown>;

  /** Gives `who` a customer with an account, a quote, customer work and general work. */
  async function seedOwnership(who: string, key: string) {
    const partyId = createId();
    await prisma().osParty.create({ data: { id: partyId, organizationId: org.id, partyKind: 'organization', displayName: `B2 Cliente ${key}` } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId, ownerMemberId: m[who]!.member.id } });
    const quote = await command(who, 'CreateQuote', { partyId });
    assert.equal(quote.status, 201, `quote: ${JSON.stringify(quote.body)}`);
    const customerWork = await command('admin', 'CreateWorkItem', {
      title: `B2 seguimiento ${key}`,
      ownerMemberId: m[who]!.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    assert.equal(customerWork.status, 201, `work: ${JSON.stringify(customerWork.body)}`);
    const generalWork = await command('admin', 'CreateWorkItem', { title: `B2 tarea ${key}`, ownerMemberId: m[who]!.member.id });
    assert.equal(generalWork.status, 201, `general: ${JSON.stringify(generalWork.body)}`);
    ids[`${key}Party`] = partyId;
    ids[`${key}Quote`] = String(data(quote).quoteId);
    ids[`${key}Work`] = String(data(customerWork).workItemId);
    ids[`${key}General`] = String(data(generalWork).workItemId);
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
    org = await store.seedOrganization('B2 Org', `b2-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.jefe = await seedMember('jefe', ['commercial.team.read', 'commercial.work.manage']);
    m.seller = await seedMember('seller', ['sales_rep']);
    m.seller2 = await seedMember('seller2', ['sales_rep']);
    m.colleague = await seedMember('colleague', ['sales_rep']);
    m.outsider = await seedMember('outsider', ['sales_rep']);
    for (const who of ['seller', 'seller2']) {
      await prisma().osManagerAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: m[who]!.member.id, managerMemberId: m.jefe!.member.id, effectiveAt: new Date('2020-01-01') },
      });
    }
    await seedOwnership('seller', 's1');
    await seedOwnership('seller2', 's2');
    await runner.runOnce();
    await runner.runOnce();
  });

  after(async () => {
    await app.close();
  });

  it('suspension proceeds with open work: access ends at once, ownership is untouched and recorded as unresolved', async () => {
    assert.equal((await get('seller', `/work-items/${ids.s1Work}`)).status, 200, 'before');
    const suspended = await command('admin', 'SuspendMember', { memberId: m.seller!.member.id });
    assert.equal(suspended.status, 201, JSON.stringify(suspended.body));

    const member = await prisma().osOrganizationMember.findUniqueOrThrow({ where: { id: m.seller!.member.id } });
    assert.equal(member.accessStatus, 'suspended');
    assert.equal((await get('seller', `/work-items/${ids.s1Work}`)).status, 403, 'suspended member is refused at once');
    assert.equal((await command('seller', 'CreateQuote', { partyId: ids.s1Party })).status, 403);

    const work = await prisma().osWorkItem.findUniqueOrThrow({ where: { id: ids.s1Work } });
    assert.deepEqual([work.ownerMemberId, work.status], [m.seller!.member.id, 'open'], 'history kept, nothing silently reassigned');
    const quote = await prisma().osQuote.findUniqueOrThrow({ where: { id: ids.s1Quote } });
    assert.equal(quote.ownerMemberId, m.seller!.member.id);

    const payload = (await lastEvent('member.suspended', m.seller!.member.id)).payloadJson as Record<string, unknown>;
    const unresolved = payload.unresolvedOwnership as Array<{ key: string; count: number; ids: string[] }>;
    const byKey = Object.fromEntries(unresolved.map((entry) => [entry.key, entry]));
    assert.deepEqual(byKey.open_work?.ids.sort(), [ids.s1Work!, ids.s1General!].sort());
    assert.deepEqual(byKey.active_quotes?.ids, [ids.s1Quote!]);
    assert.equal(byKey.commercial_accounts?.count, 1);
  });

  it('the unresolved ownership stays visible to people.admin and to the manager in range, and can be reassigned', async () => {
    const impact = await get('admin', `/members/${m.seller!.member.id}/termination-impact`);
    assert.equal(impact.status, 200, JSON.stringify(impact.body));
    assert.ok((impact.body.unresolvedCount as number) >= 4);
    assert.equal('canTerminate' in impact.body, false);

    assert.equal((await get('jefe', `/work-items/${ids.s1Work}`)).status, 200, 'manager reads the suspended report\'s work');
    assert.equal((await get('jefe', `/quotes/${ids.s1Quote}`)).status, 200, 'manager reads the suspended report\'s quote');
    assert.equal((await get('outsider', `/work-items/${ids.s1Work}`)).status, 404);
    assert.equal((await get('outsider', `/members/${m.seller!.member.id}/termination-impact`)).status, 403);

    const moved = await command('admin', 'ReassignWork', { workItemId: ids.s1General, newOwnerMemberId: m.colleague!.member.id });
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
    const after = await get('admin', `/members/${m.seller!.member.id}/termination-impact`);
    assert.equal(after.body.unresolvedCount, (impact.body.unresolvedCount as number) - 1);
  });

  it('termination proceeds with open work: access and login identity end at once; no replacement keeps access', async () => {
    const terminated = await command('admin', 'TerminateMember', { memberId: m.seller2!.member.id });
    assert.equal(terminated.status, 201, JSON.stringify(terminated.body));
    const member = await prisma().osOrganizationMember.findUniqueOrThrow({ where: { id: m.seller2!.member.id } });
    assert.deepEqual([member.accessStatus, member.employmentStatus], ['revoked', 'terminated']);
    assert.equal((await get('seller2', `/work-items/${ids.s2Work}`)).status, 401, 'login identity revoked with the membership');

    const work = await prisma().osWorkItem.findUniqueOrThrow({ where: { id: ids.s2Work } });
    assert.deepEqual([work.ownerMemberId, work.status], [m.seller2!.member.id, 'open']);
    const payload = (await lastEvent('member.terminated', m.seller2!.member.id)).payloadJson as Record<string, unknown>;
    const keys = (payload.unresolvedOwnership as Array<{ key: string }>).map((entry) => entry.key).sort();
    assert.deepEqual(keys, ['active_quotes', 'commercial_accounts', 'open_work']);

    const impact = await get('admin', `/members/${m.seller2!.member.id}/termination-impact`);
    assert.equal(impact.status, 200);
    assert.ok((impact.body.unresolvedCount as number) >= 4, 'still listed for reassignment after termination');
    assert.equal((await get('jefe', `/work-items/${ids.s2Work}`)).status, 200);
  });
});
