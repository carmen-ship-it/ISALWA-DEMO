import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsPartyStore, PrismaOsWorkforceStore, PrismaOsWorkStore } from './index';
import { PartyCommandService } from '@isalwa/os-party';
import { WorkCommandService } from '@isalwa/os-work';
import { WorkforceCommandService, LocalAuthProviderPort } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';

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

  async function workCounts(organizationId: string) {
    const [workItems, ownership, events, audits, outbox] = await Promise.all([
      prisma.osWorkItem.count({ where: { organizationId } }),
      prisma.osWorkItemOwnershipHistory.count({ where: { organizationId } }),
      prisma.osBusinessEvent.count({ where: { organizationId } }),
      prisma.osAuditLog.count({ where: { organizationId } }),
      prisma.osOutboxMessage.count({ where: { organizationId } }),
    ]);
    return { workItems, ownership, events, audits, outbox };
  }

  it('CreateWorkItem commits work ownership event audit outbox atomically', async () => {
    const org = await workforceStore.seedOrganization('Tx Hard Work', `txhw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txhw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const before = await workCounts(org.id);
    const result = await workSvc.execute(
      'CreateWorkItem',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { title: 'Tx Work Item', ownerMemberId: admin.member.id, priority: 'normal' },
    );
    const workItemId = String(result.data.workItemId);
    const after = await workCounts(org.id);
    assert.equal(after.workItems, before.workItems + 1);
    assert.equal(after.ownership, before.ownership + 1);
    assert.ok(after.events >= before.events + 1);
    assert.ok(after.audits >= before.audits + 1);
    assert.ok(after.outbox >= before.outbox + 1);
    const createdEvent = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, primaryEntityId: workItemId, eventType: 'work.created' },
    });
    assert.ok(createdEvent);
    const audit = await prisma.osAuditLog.findFirst({
      where: { organizationId: org.id, resourceId: workItemId },
    });
    assert.ok(audit);
    const outbox = await prisma.osOutboxMessage.findFirst({
      where: { organizationId: org.id, eventId: createdEvent!.id },
    });
    assert.ok(outbox);
  });

  it('rolls back work/ownership/event/audit/outbox when append fails', async () => {
    const org = await workforceStore.seedOrganization('Tx Fail Work', `txfw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txfw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const before = await workCounts(org.id);
    workStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        workSvc.execute(
          'CreateWorkItem',
          ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
          { title: 'Should Roll Back', ownerMemberId: admin.member.id },
        ),
      (err: Error) => err.message === 'OUTBOX_APPEND_FAILED',
    );
    assert.equal(workStore.testFailNextAppend, false);
    const after = await workCounts(org.id);
    assert.deepEqual(after, before);
  });

  it('latency regression: delay above old 5s default still succeeds with new timeout', async () => {
    const org = await workforceStore.seedOrganization('Tx Latency Work', `txlw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txlw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    // Controlled Prisma lifetime: delay exceeds historical 5s default; config keeps 8s budget.
    workStore.interactiveTxOptions = { maxWait: 2_000, timeout: 8_000 };
    workStore.testAppendDelayMs = 5_500;
    const before = await workCounts(org.id);
    const result = await workSvc.execute(
      'CreateWorkItem',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { title: 'Latency Ok', ownerMemberId: admin.member.id },
    );
    assert.ok(result.data.workItemId);
    const after = await workCounts(org.id);
    assert.equal(after.workItems, before.workItems + 1);
    assert.ok(after.events >= before.events + 1);
    assert.ok(after.audits >= before.audits + 1);
    assert.ok(after.outbox >= before.outbox + 1);
    workStore.interactiveTxOptions = undefined;
    workStore.testAppendDelayMs = 0;
  });

  it('latency regression: delay beyond configured timeout leaves no partial rows', async () => {
    const org = await workforceStore.seedOrganization('Tx Timeout Work', `txtw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txtw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    workStore.interactiveTxOptions = { maxWait: 2_000, timeout: 1_200 };
    workStore.testAppendDelayMs = 2_000;
    const before = await workCounts(org.id);
    await assert.rejects(() =>
      workSvc.execute(
        'CreateWorkItem',
        ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
        { title: 'Timeout Partial', ownerMemberId: admin.member.id },
      ),
    );
    const after = await workCounts(org.id);
    assert.deepEqual(after, before);
    workStore.interactiveTxOptions = undefined;
    workStore.testAppendDelayMs = 0;
  });

  it('after failed CreateWorkItem, same store instance succeeds without stale tx client', async () => {
    const org = await workforceStore.seedOrganization('Tx Reuse Work', `txrw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txrw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    workStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        workSvc.execute('CreateWorkItem', c, {
          title: 'Fail First',
          ownerMemberId: admin.member.id,
        }),
      (err: Error) => err.message === 'OUTBOX_APPEND_FAILED',
    );
    const result = await workSvc.execute('CreateWorkItem', c, {
      title: 'Succeed Second',
      ownerMemberId: admin.member.id,
    });
    assert.ok(result.data.workItemId);
    const work = await workStore.getWorkItemInOrg(org.id, String(result.data.workItemId));
    assert.ok(work);
    assert.equal(work?.title, 'Succeed Second');
  });

  it('ReassignWork still requires people.admin; non-admin scopes are denied', async () => {
    const org = await workforceStore.seedOrganization('Tx Auth Work', `txaw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txaw-adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `txaw-own-${Date.now()}@o.bo`,
      'Ow',
      'Ner',
      'member_active',
    );
    const next = await workforceStore.seedScopedAdminMember(
      org.id,
      `txaw-nxt-${Date.now()}@o.bo`,
      'Ne',
      'Xt',
      'member_active',
    );
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await workforceStore.insertPerson({
      id: personId,
      givenName: 'Plain',
      familyName: 'Member',
      version: 0,
    });
    await workforceStore.insertMember({
      id: memberId,
      organizationId: org.id,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date(),
      employmentEndedAt: null,
      version: 0,
    });
    await workforceStore.insertAuthIdentity({
      id: authId,
      personId,
      provider: 'local-dev',
      providerSubject: `subject:plain-${Date.now()}@o.bo`,
      email: `plain-${Date.now()}@o.bo`,
      status: 'active',
      invitedAt: null,
      activatedAt: new Date(),
      revokedAt: null,
    });
    await workforceStore.insertRoleAssignment({
      id: createId(),
      organizationId: org.id,
      memberId,
      roleKey: 'sales_rep',
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });

    const created = await workSvc.execute(
      'CreateWorkItem',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { title: 'Auth Guard', ownerMemberId: owner.member.id },
    );
    const workItemId = String(created.data.workItemId);
    await assert.rejects(
      () =>
        workSvc.execute(
          'ReassignWork',
          ctx(org.id, memberId, personId, authId),
          { workItemId, newOwnerMemberId: next.member.id, reason: 'denied' },
        ),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    const work = await workStore.getWorkItemInOrg(org.id, workItemId);
    assert.equal(work?.ownerMemberId, owner.member.id);
  });
});
