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
 * Review R2 follow-up (2026-10-16 21:33 §3): ChangeRole replaces the primary role
 * only. Additional permissions stay unless the request names them for revocation;
 * the preview endpoint shows the effective change before confirmation and matches
 * what the command does. Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('Review R2 follow-up: ChangeRole preserves additional grants (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let otherOrg: { id: string };
  let outsider: Seeded;
  const m: Record<string, Seeded> = {};

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

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(m[who]!, `r2b-${createId()}`),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function preview(who: string, memberId: string, roleKey: string, revoke: string[] = []): Promise<Reply> {
    const query = new URLSearchParams({ roleKey, ...(revoke.length ? { revoke: revoke.join(',') } : {}) });
    const res = await fetch(`${baseUrl}/v1/members/${memberId}/role-change-preview?${query}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[], orgId = org.id): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@r2b.bo`, name, 'R2b');
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

  async function openRoleKeys(memberId: string): Promise<string[]> {
    const rows = await prisma().osRoleAssignment.findMany({ where: { memberId, endedAt: null } });
    return rows.map((row) => row.roleKey).sort();
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R2b Org', `r2b-${createId()}`);
    otherOrg = await store.seedOrganization('R2b Other', `r2b-o-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.rep = await seedMember('rep', ['sales_rep']);
    m.target = await seedMember('target', ['sales_rep', 'commercial.team.read', 'commercial.customer.create']);
    m.target2 = await seedMember('target2', ['sales_rep', 'commercial.team.read', 'commercial.customer.create']);
    outsider = await seedMember('outsider', ['sales_rep', 'commercial.team.read'], otherOrg.id);
  });

  after(async () => {
    await app.close();
  });

  it('preview shows primary replacement with additional grants preserved, and the command does exactly that', async () => {
    const shown = await preview('admin', m.target!.member.id, 'account_manager');
    assert.equal(shown.status, 200, JSON.stringify(shown.body));
    assert.equal(shown.body.allowed, true);
    assert.deepEqual(
      {
        newPrimaryRoleKey: shown.body.newPrimaryRoleKey,
        endedPrimaryRoleKeys: shown.body.endedPrimaryRoleKeys,
        preservedAdditionalRoleKeys: shown.body.preservedAdditionalRoleKeys,
        revokedAdditionalRoleKeys: shown.body.revokedAdditionalRoleKeys,
        scopesGained: shown.body.scopesGained,
        scopesLost: shown.body.scopesLost,
      },
      {
        newPrimaryRoleKey: 'account_manager',
        endedPrimaryRoleKeys: ['sales_rep'],
        preservedAdditionalRoleKeys: ['commercial.customer.create', 'commercial.team.read'],
        revokedAdditionalRoleKeys: [],
        scopesGained: [],
        scopesLost: [],
      },
    );
    assert.deepEqual(await openRoleKeys(m.target!.member.id), ['commercial.customer.create', 'commercial.team.read', 'sales_rep'], 'preview writes nothing');

    const changed = await command('admin', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'account_manager' });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    assert.deepEqual(await openRoleKeys(m.target!.member.id), ['account_manager', 'commercial.customer.create', 'commercial.team.read']);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'member.role.changed', primaryEntityId: m.target!.member.id },
    });
    const payload = event.payloadJson as Record<string, unknown>;
    assert.deepEqual(payload.preservedAdditionalRoleKeys, ['commercial.customer.create', 'commercial.team.read']);
    assert.deepEqual(payload.endedPrimaryRoleKeys, ['sales_rep']);
  });

  it('explicit revocation ends only the named additional grant, and the preview lists the lost scope first', async () => {
    const shown = await preview('admin', m.target2!.member.id, 'account_manager', ['commercial.team.read']);
    assert.equal(shown.status, 200, JSON.stringify(shown.body));
    assert.deepEqual(shown.body.revokedAdditionalRoleKeys, ['commercial.team.read']);
    assert.deepEqual(shown.body.preservedAdditionalRoleKeys, ['commercial.customer.create']);
    assert.deepEqual(shown.body.scopesLost, ['commercial.team.read']);

    const changed = await command('admin', 'ChangeRole', {
      memberId: m.target2!.member.id,
      roleKey: 'account_manager',
      revokeAdditionalRoleKeys: ['commercial.team.read'],
    });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    assert.deepEqual(await openRoleKeys(m.target2!.member.id), ['account_manager', 'commercial.customer.create']);
  });

  it('revoking a grant the member does not hold is rejected with no change', async () => {
    const before = await openRoleKeys(m.target2!.member.id);
    const shown = await preview('admin', m.target2!.member.id, 'sales_rep', ['commercial.org.read']);
    // 22:29 decision 4: the preview reports the refusal instead of failing.
    assert.equal(shown.status, 200, JSON.stringify(shown.body));
    assert.deepEqual([shown.body.allowed, shown.body.refusal], [false, 'revoke_not_held']);
    assert.equal(shown.body.scopesGained, undefined, 'no plan for a refused change');
    const changed = await command('admin', 'ChangeRole', {
      memberId: m.target2!.member.id,
      roleKey: 'sales_rep',
      revokeAdditionalRoleKeys: ['commercial.org.read'],
    });
    assert.equal(changed.status, 400, JSON.stringify(changed.body));
    assert.deepEqual(await openRoleKeys(m.target2!.member.id), before);
  });

  it('no unauthorized expansion: a commercial or admin scope the actor lacks, or a non-admin actor, are all refused', async () => {
    const before = await openRoleKeys(m.target!.member.id);
    // A scope the actor does not hold is refused at assignability, whether it would be
    // primary or additional.
    const asPrimary = await command('admin', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'commercial.org.read' });
    assert.deepEqual([asPrimary.status, asPrimary.body], [403, { code: 'PERMISSION_DENIED' }]);
    const unheldAdmin = await command('admin', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'master_data.admin' });
    assert.deepEqual([unheldAdmin.status, unheldAdmin.body], [403, { code: 'PERMISSION_DENIED' }]);
    const byRep = await command('rep', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'sales_rep' });
    assert.deepEqual([byRep.status, byRep.body], [403, { code: 'PERMISSION_DENIED' }]);
    assert.deepEqual(await openRoleKeys(m.target!.member.id), before);
  });

  it('22:29 decision 4: the preview applies the command rules; each refusal matches the command and writes nothing', async () => {
    m.holder = m.holder ?? (await seedMember('holder', ['people.admin', 'commercial.team.read']));
    const before = await openRoleKeys(m.target!.member.id);
    const cases: Array<[string, string, string, number]> = [
      ['admin', 'commercial.org.read', 'scope_not_held', 403],
      ['admin', 'master_data.admin', 'scope_not_held', 403],
      ['holder', 'commercial.team.read', 'commercial_scope_not_primary', 400],
      ['admin', 'not a role!', 'role_invalid', 400],
    ];
    for (const [who, roleKey, refusal, status] of cases) {
      const shown = await preview(who, m.target!.member.id, roleKey);
      assert.equal(shown.status, 200, `${roleKey}: ${JSON.stringify(shown.body)}`);
      assert.deepEqual([shown.body.allowed, shown.body.refusal], [false, refusal], roleKey);
      const run = await command(who, 'ChangeRole', { memberId: m.target!.member.id, roleKey });
      assert.equal(run.status, status, `${roleKey}: ${JSON.stringify(run.body)}`);
    }
    assert.deepEqual(await openRoleKeys(m.target!.member.id), before);
  });

  it('22:29 decision 4: an allowed preview grants nothing; execution re-checks current authority', async () => {
    m.admin2 = await seedMember('admin2', ['people.admin']);
    const shown = await preview('admin2', m.rep!.member.id, 'account_manager');
    assert.equal(shown.status, 200);
    assert.equal(shown.body.allowed, true);
    await prisma().osRoleAssignment.updateMany({
      where: { memberId: m.admin2!.member.id, roleKey: 'people.admin', endedAt: null },
      data: { endedAt: new Date(Date.now() - 1000) },
    });
    const before = await openRoleKeys(m.rep!.member.id);
    const run = await command('admin2', 'ChangeRole', { memberId: m.rep!.member.id, roleKey: 'account_manager' });
    assert.deepEqual([run.status, run.body], [403, { code: 'PERMISSION_DENIED' }]);
    assert.deepEqual(await openRoleKeys(m.rep!.member.id), before);
  });

  it('the preview needs people.admin and stays inside the selected organization', async () => {
    const byRep = await preview('rep', m.target!.member.id, 'sales_rep');
    assert.equal(byRep.status, 403);
    const crossTenant = await preview('admin', outsider.member.id, 'sales_rep');
    assert.equal(crossTenant.status, 404);
    const missingRole = await fetch(`${baseUrl}/v1/members/${m.target!.member.id}/role-change-preview`, { headers: headers(m.admin!) });
    await missingRole.text();
    assert.equal(missingRole.status, 400);
  });
});
