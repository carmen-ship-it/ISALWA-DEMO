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
 * Review R3 (F09): organization context comes from proven active membership.
 * The selector header only chooses among those memberships; it never widens
 * them. Real Nest app, real disposable Postgres, synthetic people and orgs.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('Review R3 tenant selection over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  const orgs: Record<'a' | 'b' | 'c', { id: string; legalName: string }> = {} as never;
  let single: Seeded;
  let multi: Seeded;
  let multiMemberB = '';

  async function get(path: string, who: Seeded, selector?: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      headers: {
        'x-os-person-id': who.person.id,
        'x-os-auth-identity-id': who.auth.id,
        ...(selector ? { 'x-os-organization-id': selector } : {}),
      },
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    const suffix = createId().slice(-8);
    for (const key of ['a', 'b', 'c'] as const) {
      const legalName = `R3 Org ${key.toUpperCase()} ${suffix}`;
      const org = await store.seedOrganization(legalName, `r3-${key}-${suffix}`);
      orgs[key] = { id: org.id, legalName };
    }
    single = await store.seedAdminMember(orgs.a.id, `single-${suffix}@r3.bo`, 'Single', 'R3');
    multi = await store.seedAdminMember(orgs.a.id, `multi-${suffix}@r3.bo`, 'Multi', 'R3');
    multiMemberB = createId();
    await prisma().osOrganizationMember.create({
      data: {
        id: multiMemberB,
        organizationId: orgs.b.id,
        personId: multi.person.id,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date('2020-01-01'),
      },
    });
    await store.seedAdminMember(orgs.c.id, `other-${suffix}@r3.bo`, 'Other', 'R3');
  });

  after(async () => {
    await app.close();
  });

  it('one membership: the list has exactly that org and the session uses it without a selector', async () => {
    const list = await get('/session/organizations', single);
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, { organizations: [{ organizationId: orgs.a.id, legalName: orgs.a.legalName }] });
    const me = await get('/session/me', single);
    assert.equal(me.status, 200);
    assert.equal(me.body.organizationId, orgs.a.id);
  });

  it('several memberships: both are listed, and the session requires a selection', async () => {
    const list = await get('/session/organizations', multi);
    assert.equal(list.status, 200);
    const rows = (list.body.organizations as Array<Record<string, unknown>>).map((row) => row.organizationId);
    assert.deepEqual(rows, [orgs.a.id, orgs.b.id].sort());
    for (const row of list.body.organizations as Array<Record<string, unknown>>) {
      assert.deepEqual(Object.keys(row).sort(), ['legalName', 'organizationId'], 'no member ids, roles or scopes');
    }
    assert.deepEqual(await get('/session/me', multi), { status: 403, body: { code: 'TENANT_FORBIDDEN' } });
    const inA = await get('/session/me', multi, orgs.a.id);
    assert.deepEqual([inA.status, inA.body.organizationId, inA.body.memberId], [200, orgs.a.id, multi.member.id]);
    const inB = await get('/session/me', multi, orgs.b.id);
    assert.deepEqual([inB.status, inB.body.organizationId, inB.body.memberId], [200, orgs.b.id, multiMemberB]);
  });

  it('a tampered selector naming a foreign org is refused and never widens the list', async () => {
    assert.deepEqual(await get('/session/me', multi, orgs.c.id), { status: 403, body: { code: 'TENANT_FORBIDDEN' } });
    assert.deepEqual(await get('/session/me', single, orgs.b.id), { status: 403, body: { code: 'TENANT_FORBIDDEN' } });
    assert.deepEqual(await get('/session/me', multi, 'not-an-org'), { status: 403, body: { code: 'TENANT_FORBIDDEN' } });
    const list = await get('/session/organizations', multi, orgs.c.id);
    const rows = (list.body.organizations as Array<Record<string, unknown>>).map((row) => row.organizationId);
    assert.ok(!rows.includes(orgs.c.id));
    const members = await fetch(`${baseUrl}/v1/members`, {
      headers: { 'x-os-person-id': multi.person.id, 'x-os-auth-identity-id': multi.auth.id, 'x-os-organization-id': orgs.c.id },
    });
    await members.text();
    assert.equal(members.status, 403, 'tenant data read with a foreign selector is refused');
  });

  it('a stale selection (membership suspended) is refused, and the list drops that org', async () => {
    await prisma().osOrganizationMember.update({ where: { id: multiMemberB }, data: { accessStatus: 'suspended' } });
    const stale = await get('/session/me', multi, orgs.b.id);
    assert.equal(stale.status, 403);
    const list = await get('/session/organizations', multi);
    assert.deepEqual(list.body, { organizations: [{ organizationId: orgs.a.id, legalName: orgs.a.legalName }] });
    const fallback = await get('/session/me', multi);
    assert.deepEqual([fallback.status, fallback.body.organizationId], [200, orgs.a.id], 'one remaining membership is used');
  });

  it('no eligible membership: the list refuses honestly instead of choosing an org', async () => {
    await prisma().osOrganizationMember.update({ where: { id: multi.member.id }, data: { accessStatus: 'suspended' } });
    assert.deepEqual(await get('/session/organizations', multi), { status: 403, body: { code: 'ACCESS_REVOKED' } });
    assert.equal((await get('/session/me', multi)).status, 403);
  });

  it('an unauthenticated caller gets no list', async () => {
    const res = await fetch(`${baseUrl}/v1/session/organizations`);
    await res.text();
    assert.equal(res.status, 401);
  });
});
