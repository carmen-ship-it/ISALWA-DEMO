import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsPartyStore, PrismaOsWorkforceStore, PrismaOsWorkStore } from './index';
import { PartyCommandService } from '@isalwa/os-party';
import { WorkCommandService } from '@isalwa/os-work';
import { WorkforceCommandService, LocalAuthProviderPort } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('work prisma integration', () => {
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
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: `corr-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date(),
    };
  }

  it('creates work item with party subject and atomic event/outbox', async () => {
    const org = await workforceStore.seedOrganization('Work Org', `work-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const employee = await workforceStore.seedScopedAdminMember(
      org.id,
      `emp-${Date.now()}@o.bo`,
      'Emp',
      'Loyee',
      'people.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const party = await partySvc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Work Subject Party',
    });
    const partyId = String(party.data.partyId);

    const result = await workSvc.execute(
      'CreateWorkItem',
      c,
      {
        title: 'Review party master data',
        ownerMemberId: employee.member.id,
        subjectType: 'party',
        subjectId: partyId,
        priority: 'high',
      },
      `idem-work-${Date.now()}`,
    );
    const workItemId = String(result.data.workItemId);
    assert.ok(workItemId);

    const events = await prisma.osBusinessEvent.count({
      where: { organizationId: org.id, eventType: 'work.created' },
    });
    const outbox = await prisma.osOutboxMessage.count({ where: { organizationId: org.id } });
    assert.ok(events >= 1);
    assert.ok(outbox >= 1);

    const history = await workStore.listOwnershipHistory(org.id, workItemId);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.reason, 'created');
  });

  it('reassigns work with ownership history', async () => {
    const org = await workforceStore.seedOrganization('Reassign Org', `reas-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `own-${Date.now()}@o.bo`,
      'Ow',
      'Ner',
      'member_active',
    );
    const next = await workforceStore.seedScopedAdminMember(
      org.id,
      `nxt-${Date.now()}@o.bo`,
      'Ne',
      'Xt',
      'member_active',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await workSvc.execute('CreateWorkItem', c, {
      title: 'Handoff task',
      ownerMemberId: owner.member.id,
    });
    const workItemId = String(created.data.workItemId);

    await workSvc.execute('ReassignWork', c, {
      workItemId,
      newOwnerMemberId: next.member.id,
      reason: 'coverage',
    });

    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.ownerMemberId, next.member.id);
    const history = await workStore.listOwnershipHistory(org.id, workItemId);
    assert.equal(history.length, 2);
  });

  it('completes work when owner acts', async () => {
    const org = await workforceStore.seedOrganization('Complete Org', `comp-${Date.now()}`);
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `own2-${Date.now()}@o.bo`,
      'Ow',
      'Ner',
      'member_active',
    );
    const c = ctx(org.id, owner.member.id, owner.person.id, owner.auth.id);
    const created = await workSvc.execute('CreateWorkItem', c, {
      title: 'Finish me',
      ownerMemberId: owner.member.id,
    });
    const workItemId = String(created.data.workItemId);
    await workSvc.execute('CompleteWork', c, { workItemId });
    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.status, 'completed');
  });

  it('approval flow with delegation authority', async () => {
    const org = await workforceStore.seedOrganization('Approval Org', `appr-${Date.now()}`);
    const requester = await workforceStore.seedScopedAdminMember(
      org.id,
      `req-${Date.now()}@o.bo`,
      'Req',
      'Uester',
      'member_active',
    );
    const approver = await workforceStore.seedScopedAdminMember(
      org.id,
      `app-${Date.now()}@o.bo`,
      'App',
      'Rover',
      'people.admin',
    );
    const delegate = await workforceStore.seedScopedAdminMember(
      org.id,
      `del-${Date.now()}@o.bo`,
      'Del',
      'Gate',
      'sales_rep',
    );

    const cApprover = ctx(org.id, approver.member.id, approver.person.id, approver.auth.id);
    await workforceSvc.execute('GrantDelegation', cApprover, {
      delegateMemberId: delegate.member.id,
      scopes: ['approval.act'],
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    });

    const cReq = ctx(org.id, requester.member.id, requester.person.id, requester.auth.id);
    const requested = await workSvc.execute('RequestApproval', cReq, {
      approverMemberId: approver.member.id,
      subjectType: 'organization_member',
      subjectId: requester.member.id,
      context: { note: 'Needs sign-off' },
    });
    const approvalRequestId = String(requested.data.approvalRequestId);

    const cDel = ctx(org.id, delegate.member.id, delegate.person.id, delegate.auth.id);
    await workSvc.execute('Approve', cDel, { approvalRequestId, reason: 'Delegated OK' });

    const approval = await workStore.getApprovalRequest(org.id, approvalRequestId);
    assert.equal(approval?.status, 'approved');
    assert.equal(approval?.decisionByMemberId, delegate.member.id);
  });

  it('blocks termination when open work remains; succeeds after reassignment', async () => {
    const org = await workforceStore.seedOrganization('Term Org', `term-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm3-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const doomed = await workforceStore.seedScopedAdminMember(
      org.id,
      `doom-${Date.now()}@o.bo`,
      'Do',
      'Omed',
      'member_active',
    );
    const successor = await workforceStore.seedScopedAdminMember(
      org.id,
      `succ-${Date.now()}@o.bo`,
      'Suc',
      'Cessor',
      'member_active',
    );
    const cAdmin = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await workSvc.execute('CreateWorkItem', cAdmin, {
      title: 'Open obligation',
      ownerMemberId: doomed.member.id,
    });
    const workItemId = String(created.data.workItemId);

    await assert.rejects(
      () =>
        workforceSvc.execute('TerminateMember', cAdmin, { memberId: doomed.member.id }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    await workSvc.execute('ReassignWork', cAdmin, {
      workItemId,
      newOwnerMemberId: successor.member.id,
    });

    await workforceSvc.execute('TerminateMember', cAdmin, { memberId: doomed.member.id });
    const open = await workStore.listOpenWorkItemsForMember(org.id, doomed.member.id);
    assert.equal(open.length, 0);
  });

  it('idempotent create does not duplicate work item', async () => {
    const org = await workforceStore.seedOrganization('Idem W', `idemw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm4-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `idem-w-${Date.now()}`;
    const first = await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Once', ownerMemberId: admin.member.id },
      key,
    );
    const second = await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Once', ownerMemberId: admin.member.id },
      key,
    );
    assert.equal(first.commandId, second.commandId);
    assert.equal(await prisma.osWorkItem.count({ where: { organizationId: org.id } }), 1);
  });

  it('rejects cross-tenant work command', async () => {
    const orgA = await workforceStore.seedOrganization('WA', `wa-${Date.now()}`);
    const orgB = await workforceStore.seedOrganization('WB', `wb-${Date.now()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `wa-${Date.now()}@o.bo`,
      'A',
      'Admin',
      'people.admin',
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'CreateWorkItem',
          ctx(orgB.id, adminA.member.id, adminA.person.id, adminA.auth.id),
          { title: 'Evil', ownerMemberId: adminA.member.id },
        ),
      (err: Error) => err.message === 'TENANT_FORBIDDEN',
    );
  });
});
