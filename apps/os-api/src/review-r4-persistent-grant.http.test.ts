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
 * Owner decision 2026-10-16 22:20 §2: an extra permission persists across
 * primary-role replacement only when it was granted explicitly by someone who
 * independently holds it. Real Nest app, real disposable Postgres.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('Review R4 persistent extra grants over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-os-organization-id': org.id,
        'x-os-member-id': m[who]!.member.id,
        'x-os-person-id': m[who]!.person.id,
        'x-os-auth-identity-id': m[who]!.auth.id,
        'idempotency-key': `r4g-${createId()}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4g.bo`, name, 'R4');
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

  const rows = (who: string) =>
    prisma().osRoleAssignment.findMany({ where: { organizationId: org.id, memberId: m[who]!.member.id }, orderBy: { id: 'asc' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R4G Org', `r4g-${createId()}`);
    m.holder = await seedMember('holder', ['people.admin', 'commercial.team.read', 'commercial.org.read']);
    m.delegate = await seedMember('delegate', ['sales_rep']);
    m.target = await seedMember('target', ['sales_rep']);
    m.peopleOnly = await seedMember('peopleOnly', ['people.admin']);
  });

  after(async () => {
    await app.close();
  });

  it('a role change to a commercial scope is refused, even by a holder; nothing is written', async () => {
    const before = await rows('target');
    const reply = await command('holder', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'commercial.team.read' });
    assert.deepEqual([reply.status, reply.body], [400, { code: 'VALIDATION_FAILED' }]);
    assert.deepEqual(await rows('target'), before);
  });

  it('a temporary (delegated) people.admin cannot create a persistent extra grant', async () => {
    const delegated = await command('holder', 'GrantDelegation', {
      delegateMemberId: m.delegate!.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
    assert.equal(delegated.status, 201, JSON.stringify(delegated.body));
    const before = await rows('target');
    const reply = await command('delegate', 'GrantAdditionalRole', { memberId: m.target!.member.id, roleKey: 'commercial.team.read' });
    assert.deepEqual([reply.status, reply.body], [403, { code: 'PERMISSION_DENIED' }]);
    assert.deepEqual(await rows('target'), before);
  });

  it('primary or delegable scopes are never persistent extra grants; people.admin alone cannot grant a scope it lacks', async () => {
    const before = await rows('target');
    const primary = await command('holder', 'GrantAdditionalRole', { memberId: m.target!.member.id, roleKey: 'people.admin' });
    assert.deepEqual([primary.status, primary.body], [400, { code: 'VALIDATION_FAILED' }]);
    const lacking = await command('peopleOnly', 'GrantAdditionalRole', { memberId: m.target!.member.id, roleKey: 'commercial.org.read' });
    assert.deepEqual([lacking.status, lacking.body], [403, { code: 'PERMISSION_DENIED' }]);
    assert.deepEqual(await rows('target'), before);
  });

  it('an explicit grant by a holder persists across primary-role replacement; a duplicate is a no-op', async () => {
    const granted = await command('holder', 'GrantAdditionalRole', { memberId: m.target!.member.id, roleKey: 'commercial.team.read' });
    assert.equal(granted.status, 201);
    const again = await command('holder', 'GrantAdditionalRole', { memberId: m.target!.member.id, roleKey: 'commercial.team.read' });
    assert.equal(again.status, 201);
    assert.equal((again.body.data as Record<string, unknown>).alreadyAssigned, true);
    const changed = await command('holder', 'ChangeRole', { memberId: m.target!.member.id, roleKey: 'people.admin' });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    const open = (await rows('target')).filter((row) => row.endedAt === null).map((row) => row.roleKey).sort();
    assert.deepEqual(open, ['commercial.team.read', 'people.admin']);
  });
});
