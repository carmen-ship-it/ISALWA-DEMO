import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

function sessionHeaders(
  orgId: string,
  member: { id: string },
  person: { id: string },
  auth: { id: string },
) {
  return {
    'x-os-organization-id': orgId,
    'x-os-member-id': member.id,
    'x-os-person-id': person.id,
    'x-os-auth-identity-id': auth.id,
  };
}

describeHttp('os-api member + capability runtime (Step 15.2)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let org: { id: string };
  let orgB: { id: string };
  let admin: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let rep: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let adminB: { member: { id: string }; person: { id: string }; auth: { id: string } };

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    store = moduleRef.get(OS_STORE);

    org = await store.seedOrganization('HTTP Members Org', `http-mem-${Date.now()}`);
    orgB = await store.seedOrganization('HTTP Members Org B', `http-memb-${Date.now()}`);
    admin = await store.seedAdminMember(org.id, `admin-${Date.now()}@mem.bo`, 'Admin', 'User');
    await getOsPrisma()!.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: admin.member.id,
        roleKey: 'people.admin',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    rep = await store.seedAdminMember(org.id, `rep-${Date.now()}@mem.bo`, 'Sales', 'Rep');
    await getOsPrisma()!.osRoleAssignment.updateMany({
      where: { memberId: rep.member.id, organizationId: org.id },
      data: { roleKey: 'sales_rep' },
    });
    adminB = await store.seedAdminMember(orgB.id, `b-${Date.now()}@memb.bo`, 'B', 'Admin');
  });

  after(async () => {
    await app.close();
  });

  it('GET /v1/members lists directory for people.admin', async () => {
    const res = await fetch(`${baseUrl}/v1/members`, {
      headers: sessionHeaders(org.id, admin.member, admin.person, admin.auth),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items: Array<{ memberId: string; email: string | null }> };
    assert.ok(body.items.length >= 2);
    assert.ok(body.items.some((m) => m.memberId === admin.member.id));
  });

  it('GET /v1/members denied for non-admin', async () => {
    const res = await fetch(`${baseUrl}/v1/members`, {
      headers: sessionHeaders(org.id, rep.member, rep.person, rep.auth),
    });
    assert.equal(res.status, 403);
  });

  it('cross-tenant GET /v1/members cannot see other org', async () => {
    const res = await fetch(`${baseUrl}/v1/members`, {
      headers: sessionHeaders(orgB.id, admin.member, admin.person, admin.auth),
    });
    assert.equal(res.status, 403);
  });

  it('GET /v1/capabilities returns factual states', async () => {
    const res = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: sessionHeaders(org.id, rep.member, rep.person, rep.auth),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      capabilities: Array<{ capabilityKey: string; state: string; implemented: boolean }>;
    };
    const map = new Map(body.capabilities.map((c) => [c.capabilityKey, c]));
    assert.equal(map.get('commercial')?.state, 'ACTIVE');
    assert.equal(map.get('finance')?.state, 'LOCKED');
    assert.equal(map.get('messaging')?.state, 'NOT_CONFIGURED');
    assert.equal(map.get('finance')?.implemented, false);
  });

  it('capability state does not grant commercial list without owner records', async () => {
    const caps = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: sessionHeaders(org.id, rep.member, rep.person, rep.auth),
    });
    assert.equal(caps.status, 200);

    const opps = await fetch(`${baseUrl}/v1/opportunities`, {
      headers: sessionHeaders(org.id, rep.member, rep.person, rep.auth),
    });
    assert.equal(opps.status, 200);
    const body = (await opps.json()) as { items: unknown[] };
    assert.ok(Array.isArray(body.items));
  });

  it('canonical terminated member denied on HTTP queries', async () => {
    const prisma = getOsPrisma()!;
    const terminated = await store.seedAdminMember(
      org.id,
      `term-${Date.now()}@mem.bo`,
      'Term',
      'User',
    );
    await prisma.osOrganizationMember.update({
      where: { id: terminated.member.id },
      data: { accessStatus: 'revoked', employmentStatus: 'terminated' },
    });
    await prisma.osAuthIdentity.update({
      where: { id: terminated.auth.id },
      data: { status: 'revoked' },
    });
    const headers = sessionHeaders(
      org.id,
      terminated.member,
      terminated.person,
      terminated.auth,
    );
    const res = await fetch(`${baseUrl}/v1/capabilities`, { headers });
    assert.equal(res.status, 403);
  });

  it('suspended member denied on HTTP queries', async () => {
    const prisma = getOsPrisma()!;
    const suspended = await store.seedAdminMember(
      org.id,
      `susp-${Date.now()}@mem.bo`,
      'Susp',
      'User',
    );
    await prisma.osOrganizationMember.update({
      where: { id: suspended.member.id },
      data: { accessStatus: 'suspended' },
    });
    const res = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: sessionHeaders(org.id, suspended.member, suspended.person, suspended.auth),
    });
    assert.equal(res.status, 403);
  });

  it('cross-tenant capabilities remain org-scoped via session', async () => {
    const resA = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: sessionHeaders(org.id, admin.member, admin.person, admin.auth),
    });
    const resB = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: sessionHeaders(orgB.id, adminB.member, adminB.person, adminB.auth),
    });
    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);
    const bodyA = (await resA.json()) as { capabilities: Array<{ organizationId: string }> };
    const bodyB = (await resB.json()) as { capabilities: Array<{ organizationId: string }> };
    assert.ok(bodyA.capabilities.every((c) => c.organizationId === org.id));
    assert.ok(bodyB.capabilities.every((c) => c.organizationId === orgB.id));
  });
});
