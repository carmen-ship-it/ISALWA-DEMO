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
 * Review R2 (F10, 2026-10-16 20:39): delegated access follows the delegator. Reads,
 * new commands and idempotent replays by the delegate stop when the delegator is
 * suspended or loses the scope, and on revocation. The delegation row is not
 * rewritten. Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('Review R2 delegation standing over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const departments: string[] = [];

  function headers(who: Seeded, key?: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      ...(key ? { 'idempotency-key': key } : {}),
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>, key = `r2-${createId()}`): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(m[who]!, key),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function listMembers(who: string): Promise<number> {
    const res = await fetch(`${baseUrl}/v1/members`, { headers: headers(m[who]!) });
    await res.text();
    return res.status;
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r2.bo`, name, 'R2');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({
        where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
      });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const delegationRow = (id: string) => prisma().osDelegation.findUniqueOrThrow({ where: { id } });

  async function delegate(from: string, to: string): Promise<string> {
    const granted = await command(from, 'GrantDelegation', {
      delegateMemberId: m[to]!.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
    assert.equal(granted.status, 201, JSON.stringify(granted.body));
    return String((granted.body.data as Record<string, unknown>).delegationId);
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R2 Org', `r2-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.delegator = await seedMember('delegator', ['people.admin']);
    m.delegate = await seedMember('delegate', ['sales_rep']);
    m.delegator2 = await seedMember('delegator2', ['people.admin']);
    m.delegate2 = await seedMember('delegate2', ['sales_rep']);
    m.worker = await seedMember('worker', ['sales_rep']);
    for (const code of ['VEN', 'ADM']) {
      const id = createId();
      await prisma().osDepartment.create({ data: { id, organizationId: org.id, name: `R2 ${code}`, code } });
      departments.push(id);
    }
  });

  after(async () => {
    await app.close();
  });

  const state = { delegationId: '', replayKey: '', replayBody: {} as Record<string, unknown> };

  it('an active delegation from an active holder works for reads and commands', async () => {
    assert.equal(await listMembers('delegate'), 403, 'no access before the delegation');
    state.delegationId = await delegate('delegator', 'delegate');
    assert.equal(await listMembers('delegate'), 200);
    state.replayKey = `r2-replay-${createId()}`;
    state.replayBody = { memberId: m.worker!.member.id, departmentId: departments[0] };
    const changed = await command('delegate', 'ChangeDepartment', state.replayBody, state.replayKey);
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    const replay = await command('delegate', 'ChangeDepartment', state.replayBody, state.replayKey);
    assert.equal(replay.status, 201, 'same actor, same payload replays while authorized');
  });

  it('suspending the delegator stops the delegate: read, new command and replay; row unchanged', async () => {
    const rowBefore = await delegationRow(state.delegationId);
    const suspended = await command('admin', 'SuspendMember', { memberId: m.delegator!.member.id });
    assert.equal(suspended.status, 201, JSON.stringify(suspended.body));

    assert.equal(await listMembers('delegate'), 403);
    const fresh = await command('delegate', 'ChangeDepartment', { memberId: m.worker!.member.id, departmentId: departments[1] });
    assert.deepEqual([fresh.status, fresh.body], [403, { code: 'PERMISSION_DENIED' }]);
    const replay = await command('delegate', 'ChangeDepartment', state.replayBody, state.replayKey);
    assert.deepEqual([replay.status, replay.body], [403, { code: 'PERMISSION_DENIED' }], 'replay re-authorizes, no stored body');
    const assignment = await prisma().osDepartmentAssignment.findFirst({
      where: { memberId: m.worker!.member.id, endedAt: null },
    });
    assert.equal(assignment?.departmentId, departments[0]);

    assert.deepEqual(await delegationRow(state.delegationId), rowBefore, 'history preserved: no revocation written');
  });

  it('documents current reinstatement behavior: if the delegator becomes active again, the unexpired delegation applies again', async () => {
    // No product command reinstates a suspended member (rehire creates a new membership,
    // so the old delegation never follows it). This simulates an out-of-band status
    // change only to pin the use-time rule; it is a recorded owner decision, not a feature.
    await prisma().osOrganizationMember.update({ where: { id: m.delegator!.member.id }, data: { accessStatus: 'active' } });
    assert.equal(await listMembers('delegate'), 200);
  });

  it('the delegator losing the scope stops the delegate', async () => {
    const changed = await command('admin', 'ChangeRole', { memberId: m.delegator!.member.id, roleKey: 'sales_rep' });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    assert.equal(await listMembers('delegate'), 403);
    const rowAfter = await delegationRow(state.delegationId);
    assert.equal(rowAfter.revokedAt, null);
  });

  it('revocation stops the delegate', async () => {
    const id = await delegate('delegator2', 'delegate2');
    assert.equal(await listMembers('delegate2'), 200);
    const revoked = await command('delegator2', 'RevokeDelegation', { delegationId: id });
    assert.equal(revoked.status, 201);
    assert.equal(await listMembers('delegate2'), 403);
    assert.ok((await delegationRow(id)).revokedAt);
  });
});
