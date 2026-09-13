import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  getOsPrisma,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
} from './index';
import { WorkCommandService } from '@isalwa/os-work';
import { LocalAuthProviderPort, WorkforceCommandService } from '@isalwa/os-workforce';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

class TrackingAuthProvider extends LocalAuthProviderPort {
  sessionRevokeCalls: string[] = [];
  credentialRevokeCalls: string[] = [];

  override async revokeSessions(providerSubject: string): Promise<void> {
    this.sessionRevokeCalls.push(providerSubject);
    await super.revokeSessions(providerSubject);
  }

  override async revokeCredentials(providerSubject: string): Promise<void> {
    this.credentialRevokeCalls.push(providerSubject);
    await super.revokeCredentials(providerSubject);
  }
}

describePrisma('workforce admin mutation API readiness (Step 14.7)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let store: PrismaOsWorkforceStore;
  let workStore: PrismaOsWorkStore;
  let auth: TrackingAuthProvider;
  let svc: WorkforceCommandService;
  let workSvc: WorkCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    store = new PrismaOsWorkforceStore(prisma);
    workStore = new PrismaOsWorkStore(prisma);
    auth = new TrackingAuthProvider();
    svc = new WorkforceCommandService(store, auth);
    workSvc = new WorkCommandService(workStore);
    await store.truncateAll();
  });

  function ctx(
    orgId: string,
    memberId: string,
    personId: string,
    authId: string,
    effectiveAt = new Date('2026-08-24T12:00:00Z'),
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt,
    };
  }

  async function seedAdminOrg() {
    const org = await store.seedOrganization('Admin Mut', `adm-mut-${Date.now()}`);
    const admin = await store.seedScopedAdminMember(
      org.id,
      `adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const worker = await store.seedAdminMember(
      org.id,
      `wrk-${Date.now()}@o.bo`,
      'Wo',
      'Rker',
    );
    await prisma.osRoleAssignment.updateMany({
      where: { memberId: worker.member.id, organizationId: org.id },
      data: { roleKey: 'sales_rep' },
    });
    const subject = `subject:${worker.member.id}`;
    await store.updateAuthIdentity(worker.auth.id, {
      status: 'active',
      providerSubject: subject,
      activatedAt: new Date('2026-08-01T12:00:00Z'),
    });
    return { org, admin, worker, subject };
  }

  it('ChangeDepartment succeeds with event, audit, outbox', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const depts = await store.listDepartments(org.id);
    const deptId = depts[0]!.id;
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const before = await store.countBusinessEvents(org.id);

    await svc.execute('ChangeDepartment', session, {
      memberId: worker.member.id,
      departmentId: deptId,
    });

    assert.equal(await store.countBusinessEvents(org.id), before + 1);
    assert.equal(await store.countAuditLogs(org.id), before + 1);
    assert.equal(await store.countOutbox(org.id), before + 1);
    const active = await prisma.osDepartmentAssignment.findMany({
      where: { memberId: worker.member.id, endedAt: null },
    });
    assert.equal(active.length, 1);
    assert.equal(active[0]?.departmentId, deptId);
  });

  it('ChangeDepartment rejects cross-tenant target', async () => {
    const fx = await seedAdminOrg();
    const orgB = await store.seedOrganization('Other Dept', `dept-b-${Date.now()}`);
    const adminB = await store.seedScopedAdminMember(
      orgB.id,
      `b-${Date.now()}@o.bo`,
      'B',
      'Admin',
      'people.admin',
    );
    const deptId = (await store.listDepartments(fx.org.id))[0]!.id;
    await assert.rejects(
      () =>
        svc.execute(
          'ChangeDepartment',
          ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
          { memberId: fx.worker.member.id, departmentId: deptId },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('ChangeDepartment rejects nonexistent departmentId with VALIDATION_FAILED (no mutation)', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const eventsBefore = await store.countBusinessEvents(org.id);
    const auditsBefore = await store.countAuditLogs(org.id);
    const outboxBefore = await store.countOutbox(org.id);
    const assignmentsBefore = await prisma.osDepartmentAssignment.count({
      where: { memberId: worker.member.id },
    });

    await assert.rejects(
      () =>
        svc.execute('ChangeDepartment', session, {
          memberId: worker.member.id,
          departmentId: `dept-missing-${createId()}`,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    assert.equal(await store.countBusinessEvents(org.id), eventsBefore);
    assert.equal(await store.countAuditLogs(org.id), auditsBefore);
    assert.equal(await store.countOutbox(org.id), outboxBefore);
    assert.equal(
      await prisma.osDepartmentAssignment.count({ where: { memberId: worker.member.id } }),
      assignmentsBefore,
    );
  });

  it('ChangeDepartment rejects foreign-tenant departmentId as VALIDATION_FAILED (no leak)', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const orgB = await store.seedOrganization('Foreign Dept Org', `fdept-${Date.now()}`);
    const foreignDept = (await store.listDepartments(orgB.id))[0];
    assert.ok(foreignDept);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const eventsBefore = await store.countBusinessEvents(org.id);

    await assert.rejects(
      () =>
        svc.execute('ChangeDepartment', session, {
          memberId: worker.member.id,
          departmentId: foreignDept!.id,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    assert.equal(await store.countBusinessEvents(org.id), eventsBefore);
  });

  it('ChangeRole succeeds; non-admin denied', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('ChangeRole', session, { memberId: worker.member.id, roleKey: 'sales_manager' });
    const roles = await store.listRoleAssignmentsForMember(worker.member.id);
    assert.ok(roles.some((r) => r.roleKey === 'sales_manager' && r.endedAt === null));

    await assert.rejects(
      () =>
        svc.execute('ChangeRole', ctx(org.id, worker.member.id, worker.person.id, worker.auth.id), {
          memberId: admin.member.id,
          roleKey: 'people.admin',
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('ChangeManager succeeds for same-org manager', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('ChangeManager', session, {
      memberId: worker.member.id,
      managerMemberId: admin.member.id,
    });
    const mgr = await prisma.osManagerAssignment.findFirst({
      where: { memberId: worker.member.id, endedAt: null },
    });
    assert.equal(mgr?.managerMemberId, admin.member.id);
  });

  it('ChangeManager rejects cross-tenant manager target member', async () => {
    const fx = await seedAdminOrg();
    const orgB = await store.seedOrganization('Mgr B', `mgr-b-${Date.now()}`);
    const adminB = await store.seedScopedAdminMember(
      orgB.id,
      `b2-${Date.now()}@o.bo`,
      'B2',
      'Admin',
      'people.admin',
    );
    await assert.rejects(
      () =>
        svc.execute(
          'ChangeManager',
          ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
          { memberId: fx.worker.member.id, managerMemberId: adminB.member.id },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('SuspendMember revokes provider sessions; suspended actor blocked', async () => {
    const { org, admin, worker, subject } = await seedAdminOrg();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    assert.deepEqual(auth.sessionRevokeCalls, [subject]);
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'suspended');

    await assert.rejects(
      () =>
        svc.execute('ChangeRole', ctx(org.id, worker.member.id, worker.person.id, worker.auth.id), {
          memberId: worker.member.id,
          roleKey: 'sales_rep',
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('ActivateMember reactivates suspended member (admin only)', async () => {
    const { org, admin, worker, subject } = await seedAdminOrg();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await svc.execute('ActivateMember', cAdmin, {
      memberId: worker.member.id,
      providerSubject: subject,
    });
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'active');
  });

  it('ActivateMember rejects terminated/revoked member (J-13)', async () => {
    const { org, admin, worker, subject } = await seedAdminOrg();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('TerminateMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        svc.execute('ActivateMember', cAdmin, {
          memberId: worker.member.id,
          providerSubject: subject,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('ActivateMember rejects self-reactivation from suspended', async () => {
    const { org, admin, worker, subject } = await seedAdminOrg();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        svc.execute('ActivateMember', ctx(org.id, worker.member.id, worker.person.id, worker.auth.id), {
          memberId: worker.member.id,
          providerSubject: subject,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('TerminateMember blocked with open work; succeeds after reassignment', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const successor = await store.seedScopedAdminMember(
      org.id,
      `suc-${Date.now()}@o.bo`,
      'Suc',
      'Cessor',
      'member_active',
    );
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Open block terminate',
      ownerMemberId: worker.member.id,
    });
    const workItemId = String(created.data.workItemId);

    await assert.rejects(
      () => svc.execute('TerminateMember', cAdmin, { memberId: worker.member.id }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    await workSvc.execute('ReassignWork', cAdmin, {
      workItemId,
      newOwnerMemberId: successor.member.id,
    });
    const revokeBefore = auth.credentialRevokeCalls.length;
    await svc.execute('TerminateMember', cAdmin, { memberId: worker.member.id });
    assert.equal(auth.credentialRevokeCalls.length, revokeBefore + 1);
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'revoked');
    assert.equal(member?.employmentStatus, 'terminated');
  });

  it('GrantDelegation and RevokeDelegation are atomic with audit/outbox', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const granted = await svc.execute('GrantDelegation', session, {
      delegateMemberId: worker.member.id,
      scopes: ['approval.act'],
      expiresAt: new Date('2027-06-01T12:00:00Z').toISOString(),
    });
    const delegationId = String(granted.data.delegationId);
    const eventsBefore = await store.countBusinessEvents(org.id);
    await svc.execute('RevokeDelegation', session, { delegationId });
    assert.equal(await store.countBusinessEvents(org.id), eventsBefore + 1);
    const d = await store.findDelegation(org.id, delegationId);
    assert.ok(d?.revokedAt);
  });

  it('expired delegation cannot grant authority', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const grantCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('GrantDelegation', grantCtx, {
      delegateMemberId: worker.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date('2026-08-25T12:00:00Z').toISOString(),
    });
    const afterExpiry = {
      ...ctx(org.id, worker.member.id, worker.person.id, worker.auth.id),
      effectiveAt: new Date('2026-08-26T12:00:00Z'),
    };
    await assert.rejects(
      () =>
        svc.execute('InviteMember', afterExpiry, {
          email: `z-${createId()}@o.bo`,
          givenName: 'Z',
          familyName: 'Z',
          roleKey: 'sales_rep',
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('RequestMemberEmailChange records request without provider mutation', async () => {
    const { org, worker } = await seedAdminOrg();
    const emailBefore = worker.auth.email;
    const session = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    await svc.execute('RequestMemberEmailChange', session, {
      newEmail: `new-${createId()}@o.bo`,
    });
    const authRow = await store.findAuthIdentityByPersonAndStatus(worker.person.id, 'active');
    assert.equal(authRow?.email, emailBefore);
    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.email.change_requested' },
    });
    assert.ok(event);
  });

  it('RequestMemberEmailChange denied for suspended member', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        svc.execute(
          'RequestMemberEmailChange',
          ctx(org.id, worker.member.id, worker.person.id, worker.auth.id),
          { newEmail: 'new@o.bo' },
        ),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('admin mutation idempotency returns same commandId', async () => {
    const { org, admin, worker } = await seedAdminOrg();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `idem-suspend-${createId()}`;
    const first = await svc.execute(
      'SuspendMember',
      session,
      { memberId: worker.member.id },
      key,
    );
    const second = await svc.execute(
      'SuspendMember',
      session,
      { memberId: worker.member.id },
      key,
    );
    assert.equal(first.commandId, second.commandId);
  });
});
