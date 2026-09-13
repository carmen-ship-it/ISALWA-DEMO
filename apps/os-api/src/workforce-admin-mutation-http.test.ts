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
    'content-type': 'application/json',
    'x-os-organization-id': orgId,
    'x-os-member-id': member.id,
    'x-os-person-id': person.id,
    'x-os-auth-identity-id': auth.id,
  };
}

async function postCommand(
  baseUrl: string,
  headers: Record<string, string>,
  command: string,
  body: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const h = { ...headers };
  if (idempotencyKey) h['idempotency-key'] = idempotencyKey;
  return fetch(`${baseUrl}/v1/commands/${command}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  });
}

describeHttp('os-api workforce admin mutation HTTP (Step 14.7)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let org: { id: string };
  let orgB: { id: string };
  let admin: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let worker: { member: { id: string }; person: { id: string }; auth: { id: string; email: string } };
  let rep: { member: { id: string }; person: { id: string }; auth: { id: string } };

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    store = moduleRef.get(OS_STORE);

    org = await store.seedOrganization('HTTP Admin Mut', `http-adm-${Date.now()}`);
    orgB = await store.seedOrganization('HTTP Admin Mut B', `http-admb-${Date.now()}`);
    admin = await store.seedAdminMember(org.id, `adm-${Date.now()}@o.bo`, 'Ad', 'Min');
    await getOsPrisma()!.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: admin.member.id,
        roleKey: 'people.admin',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    worker = await store.seedAdminMember(org.id, `wrk-${Date.now()}@o.bo`, 'Wo', 'Rker');
    rep = await store.seedAdminMember(org.id, `rep-${Date.now()}@o.bo`, 'Rep', 'User');
    await getOsPrisma()!.osRoleAssignment.updateMany({
      where: { memberId: rep.member.id },
      data: { roleKey: 'sales_rep' },
    });
  });

  after(async () => {
    await app.close();
  });

  it('POST ChangeRole succeeds for people.admin', async () => {
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, admin.member, admin.person, admin.auth),
      'ChangeRole',
      { memberId: worker.member.id, roleKey: 'sales_manager' },
    );
    assert.equal(res.status, 201);
    const body = (await res.json()) as { commandId: string };
    assert.ok(body.commandId);
  });

  it('POST ChangeDepartment with nonexistent departmentId returns VALIDATION_FAILED 400', async () => {
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, admin.member, admin.person, admin.auth),
      'ChangeDepartment',
      { memberId: worker.member.id, departmentId: `dept-missing-${createId()}` },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'VALIDATION_FAILED');
  });

  it('POST ChangeDepartment with foreign-tenant departmentId returns VALIDATION_FAILED 400', async () => {
    const foreignDepts = await store.listDepartments(orgB.id);
    assert.ok(foreignDepts[0]);
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, admin.member, admin.person, admin.auth),
      'ChangeDepartment',
      { memberId: worker.member.id, departmentId: foreignDepts[0]!.id },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'VALIDATION_FAILED');
  });

  it('POST ChangeDepartment succeeds for valid same-tenant department', async () => {
    const depts = await store.listDepartments(org.id);
    assert.ok(depts[0]);
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, admin.member, admin.person, admin.auth),
      'ChangeDepartment',
      { memberId: worker.member.id, departmentId: depts[0]!.id },
    );
    assert.equal(res.status, 201);
  });

  it('POST ChangeRole forbidden for non-admin', async () => {
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, rep.member, rep.person, rep.auth),
      'ChangeRole',
      { memberId: worker.member.id, roleKey: 'people.admin' },
    );
    assert.equal(res.status, 403);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'PERMISSION_DENIED');
  });

  it('POST SuspendMember succeeds; suspended actor blocked on next command', async () => {
    const target = await store.seedAdminMember(
      org.id,
      `tgt-${Date.now()}@o.bo`,
      'Tg',
      'Et',
    );
    const adminH = sessionHeaders(org.id, admin.member, admin.person, admin.auth);
    const suspend = await postCommand(baseUrl, adminH, 'SuspendMember', {
      memberId: target.member.id,
    });
    assert.equal(suspend.status, 201);

    const blocked = await postCommand(
      baseUrl,
      sessionHeaders(org.id, target.member, target.person, target.auth),
      'RequestMemberEmailChange',
      { newEmail: `new-${createId()}@o.bo` },
    );
    assert.equal(blocked.status, 403);
    const err = (await blocked.json()) as { code: string };
    assert.equal(err.code, 'ACCESS_REVOKED');
  });

  it('POST TerminateMember blocked with open work returns VALIDATION_FAILED', async () => {
    const doomed = await store.seedAdminMember(
      org.id,
      `doom-${Date.now()}@o.bo`,
      'Do',
      'Omed',
    );
    const adminH = sessionHeaders(org.id, admin.member, admin.person, admin.auth);
    const work = await postCommand(baseUrl, adminH, 'CreateWorkItem', {
      title: 'HTTP open work block',
      ownerMemberId: doomed.member.id,
    });
    assert.equal(work.status, 201);

    const term = await postCommand(baseUrl, adminH, 'TerminateMember', {
      memberId: doomed.member.id,
    });
    assert.equal(term.status, 400);
    const body = (await term.json()) as { code: string };
    assert.equal(body.code, 'VALIDATION_FAILED');
  });

  it('POST ActivateMember on terminated member rejected (J-13)', async () => {
    const gone = await store.seedAdminMember(
      org.id,
      `gone-${Date.now()}@o.bo`,
      'Go',
      'Ne',
    );
    const adminH = sessionHeaders(org.id, admin.member, admin.person, admin.auth);
    const term = await postCommand(baseUrl, adminH, 'TerminateMember', {
      memberId: gone.member.id,
    });
    assert.equal(term.status, 201);

    const react = await postCommand(baseUrl, adminH, 'ActivateMember', {
      memberId: gone.member.id,
      providerSubject: `subject:${gone.member.id}`,
    });
    assert.equal(react.status, 400);
    const body = (await react.json()) as { code: string };
    assert.equal(body.code, 'VALIDATION_FAILED');
  });

  it('POST GrantDelegation and RevokeDelegation succeed', async () => {
    const adminH = sessionHeaders(org.id, admin.member, admin.person, admin.auth);
    const grant = await postCommand(baseUrl, adminH, 'GrantDelegation', {
      delegateMemberId: rep.member.id,
      scopes: ['approval.act'],
      expiresAt: new Date('2027-06-01T12:00:00Z').toISOString(),
    });
    assert.equal(grant.status, 201);
    const granted = (await grant.json()) as { data: { delegationId: string } };
    const revoke = await postCommand(baseUrl, adminH, 'RevokeDelegation', {
      delegationId: granted.data.delegationId,
    });
    assert.equal(revoke.status, 201);
  });

  it('POST RequestMemberEmailChange succeeds without provider side effect', async () => {
    const emailBefore = worker.auth.email;
    const res = await postCommand(
      baseUrl,
      sessionHeaders(org.id, worker.member, worker.person, worker.auth),
      'RequestMemberEmailChange',
      { newEmail: `req-${createId()}@o.bo` },
    );
    assert.equal(res.status, 201);
    const authRow = await getOsPrisma()!.osAuthIdentity.findUnique({
      where: { id: worker.auth.id },
    });
    assert.equal(authRow?.email, emailBefore);
  });

  it('cross-tenant SuspendMember returns NOT_FOUND', async () => {
    const adminB = await store.seedAdminMember(orgB.id, `b-${Date.now()}@o.bo`, 'B', 'Admin');
    await getOsPrisma()!.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgB.id,
        memberId: adminB.member.id,
        roleKey: 'people.admin',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    const res = await postCommand(
      baseUrl,
      sessionHeaders(orgB.id, adminB.member, adminB.person, adminB.auth),
      'SuspendMember',
      { memberId: worker.member.id },
    );
    assert.equal(res.status, 404);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'NOT_FOUND');
  });

  it('idempotent SuspendMember returns same commandId', async () => {
    const target = await store.seedAdminMember(
      org.id,
      `idem-${Date.now()}@o.bo`,
      'Id',
      'Em',
    );
    const adminH = sessionHeaders(org.id, admin.member, admin.person, admin.auth);
    const key = `http-idem-${createId()}`;
    const first = await postCommand(
      baseUrl,
      adminH,
      'SuspendMember',
      { memberId: target.member.id },
      key,
    );
    const second = await postCommand(
      baseUrl,
      adminH,
      'SuspendMember',
      { memberId: target.member.id },
      key,
    );
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const a = (await first.json()) as { commandId: string };
    const b = (await second.json()) as { commandId: string };
    assert.equal(a.commandId, b.commandId);
  });
});
