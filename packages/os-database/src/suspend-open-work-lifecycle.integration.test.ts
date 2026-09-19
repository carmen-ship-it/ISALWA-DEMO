import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOsPrisma,
  PrismaOsPartyStore,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
} from './index';
import { PartyCommandService } from '@isalwa/os-party';
import { WorkCommandService } from '@isalwa/os-work';
import { WorkforceCommandService, LocalAuthProviderPort } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('suspend member / open work lifecycle (Step 14.5)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let workStore: PrismaOsWorkStore;
  let partyStore: PrismaOsPartyStore;
  let workSvc: WorkCommandService;
  let partySvc: PartyCommandService;
  let workforceSvc: WorkforceCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    workStore = new PrismaOsWorkStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    workSvc = new WorkCommandService(workStore);
    partySvc = new PartyCommandService(partyStore);
    workforceSvc = new WorkforceCommandService(workforceStore, new LocalAuthProviderPort());
    await workforceStore.truncateAll();
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
      correlationId: `corr-${Date.now()}-${Math.random()}`,
      effectiveAt,
    };
  }

  async function seedFixture() {
    const org = await workforceStore.seedOrganization('Suspend Org', `susp-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const worker = await workforceStore.seedScopedAdminMember(
      org.id,
      `wrk-${Date.now()}@o.bo`,
      'Wo',
      'Rker',
      'member_active',
    );
    const successor = await workforceStore.seedScopedAdminMember(
      org.id,
      `suc-${Date.now()}@o.bo`,
      'Suc',
      'Cessor',
      'member_active',
    );
    const approver = await workforceStore.seedScopedAdminMember(
      org.id,
      `app-${Date.now()}@o.bo`,
      'App',
      'Rover',
      'people.admin',
    );
    const md = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const party = await partySvc.execute(
      'CreateParty',
      ctx(org.id, md.member.id, md.person.id, md.auth.id),
      { partyKind: 'organization', displayName: 'Suspend Subject Party' },
    );
    return {
      org,
      admin,
      worker,
      successor,
      approver,
      partyId: String(party.data.partyId),
    };
  }

  it('suspends member with no open work', async () => {
    const { org, admin, worker } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    const member = await workforceStore.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'suspended');
    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.suspended' },
    });
    assert.ok(event);
  });

  it('blocks suspend while open work remains owned', async () => {
    const { org, admin, worker } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Owned while suspended',
      ownerMemberId: worker.member.id,
    });
    const workItemId = String(created.data.workItemId);

    await assert.rejects(
      () => workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.status, 'open');
    assert.equal(work?.ownerMemberId, worker.member.id);
    const member = await workforceStore.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'active');
    const history = await prisma.osWorkItemOwnershipHistory.count({
      where: { workItemId },
    });
    assert.equal(history, 1);
  });

  it('blocks suspended member from completing owned work', async () => {
    const { org, admin, worker, successor } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const cWorker = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Cannot complete',
      ownerMemberId: worker.member.id,
    });
    await workSvc.execute('ReassignWork', cAdmin, {
      workItemId: String(created.data.workItemId),
      newOwnerMemberId: successor.member.id,
    });
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        workSvc.execute('CompleteWork', cWorker, {
          workItemId: String(created.data.workItemId),
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('blocks suspended member from reassigning work', async () => {
    const { org, admin, worker, successor } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const cWorker = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Cannot reassign',
      ownerMemberId: worker.member.id,
    });
    await workSvc.execute('ReassignWork', cAdmin, {
      workItemId: String(created.data.workItemId),
      newOwnerMemberId: successor.member.id,
    });
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        workSvc.execute('ReassignWork', cWorker, {
          workItemId: String(created.data.workItemId),
          newOwnerMemberId: successor.member.id,
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('blocks suspended member from approve and request approval', async () => {
    const { org, admin, worker, approver, partyId } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const cWorker = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    const requested = await workSvc.execute(
      'RequestApproval',
      cAdmin,
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        workSvc.execute('RequestApproval', cWorker, {
          approverMemberId: approver.member.id,
          subjectType: 'party',
          subjectId: partyId,
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
    await assert.rejects(
      () =>
        workSvc.execute('Approve', cWorker, {
          approvalRequestId: String(requested.data.approvalRequestId),
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('blocks suspended delegate from exercising delegation authority', async () => {
    const { org, admin, worker, approver, partyId } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const cWorker = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    const effectiveAt = new Date('2026-08-24T12:00:00Z');
    await workforceSvc.execute(
      'GrantDelegation',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id, effectiveAt),
      {
        delegateMemberId: worker.member.id,
        scopes: ['approval.act'],
        startsAt: effectiveAt.toISOString(),
        expiresAt: new Date('2026-12-31T12:00:00Z').toISOString(),
      },
    );
    const requested = await workSvc.execute(
      'RequestApproval',
      cAdmin,
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await assert.rejects(
      () =>
        workSvc.execute('Approve', cWorker, {
          approvalRequestId: String(requested.data.approvalRequestId),
          reason: 'Delegated',
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('admin can explicitly reassign work after suspend', async () => {
    const { org, admin, worker, successor } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Explicit reassignment',
      ownerMemberId: worker.member.id,
    });
    const workItemId = String(created.data.workItemId);
    await assert.rejects(
      () => workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
    await workSvc.execute('ReassignWork', cAdmin, {
      workItemId,
      newOwnerMemberId: successor.member.id,
    });
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.ownerMemberId, successor.member.id);
    assert.equal(
      await prisma.osWorkItemOwnershipHistory.count({ where: { workItemId } }),
      2,
    );
  });

  it('reactivation via ActivateMember restores work authority', async () => {
    const { org, admin, worker } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const cWorker = ctx(org.id, worker.member.id, worker.person.id, worker.auth.id);
    await workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id });
    await workforceSvc.execute('ActivateMember', cAdmin, {
      memberId: worker.member.id,
      providerSubject: worker.auth.providerSubject ?? `react-${worker.member.id}`,
    });
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Resume after suspend',
      ownerMemberId: worker.member.id,
    });
    const workItemId = String(created.data.workItemId);
    await workSvc.execute('CompleteWork', cWorker, { workItemId });
    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.status, 'completed');
  });

  it('duplicate SuspendMember is idempotent', async () => {
    const { org, admin, worker } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `suspend-idem-${Date.now()}`;
    const first = await workforceSvc.execute(
      'SuspendMember',
      cAdmin,
      { memberId: worker.member.id },
      key,
    );
    const second = await workforceSvc.execute(
      'SuspendMember',
      cAdmin,
      { memberId: worker.member.id },
      key,
    );
    assert.equal(first.commandId, second.commandId);
    assert.equal(
      await prisma.osBusinessEvent.count({
        where: { organizationId: org.id, eventType: 'member.suspended' },
      }),
      1,
    );
  });

  it('rolls back suspension when outbox append fails', async () => {
    const { org, admin, worker } = await seedFixture();
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    workforceStore.testFailNextAppend = true;
    await assert.rejects(
      () => workforceSvc.execute('SuspendMember', cAdmin, { memberId: worker.member.id }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    const member = await workforceStore.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'active');
  });

  it('rejects cross-tenant suspend target', async () => {
    const fx = await seedFixture();
    const orgB = await workforceStore.seedOrganization('Org B Sus', `orgbs-${Date.now()}`);
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `b-${Date.now()}@o.bo`,
      'B',
      'Admin',
      'people.admin',
    );
    await assert.rejects(
      () =>
        workforceSvc.execute(
          'SuspendMember',
          ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
          { memberId: fx.worker.member.id },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });
});
