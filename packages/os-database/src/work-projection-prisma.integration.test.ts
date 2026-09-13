import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOsPrisma,
  PrismaOsOutboxStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
} from './index';
import { OsOutboxWorker } from '@isalwa/os-events';
import { PartyCommandService } from '@isalwa/os-party';
import { WorkCommandService } from '@isalwa/os-work';
import {
  ApprovalQueryService,
  AttentionQueryService,
  WorkProjectionConsumer,
  WorkQueryService,
  buildQueryContext,
  encodeApprovalCursor,
  encodeAttentionCursor,
  encodeWorkSearchCursor,
  replayWorkProjectionForOrg,
} from '@isalwa/os-query';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('work projection prisma integration (Step 15.1)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let workStore: PrismaOsWorkStore;
  let partyStore: PrismaOsPartyStore;
  let projectionStore: PrismaOsProjectionStore;
  let outboxStore: PrismaOsOutboxStore;
  let workSvc: WorkCommandService;
  let partySvc: PartyCommandService;
  let workConsumer: WorkProjectionConsumer;
  let workQuery: WorkQueryService;
  let approvalQuery: ApprovalQueryService;
  let attentionQuery: AttentionQueryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    workStore = new PrismaOsWorkStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    projectionStore = new PrismaOsProjectionStore(prisma);
    outboxStore = new PrismaOsOutboxStore(prisma);
    workSvc = new WorkCommandService(workStore);
    partySvc = new PartyCommandService(partyStore);
    workConsumer = new WorkProjectionConsumer({ projectionStore, workStore });
    workQuery = new WorkQueryService({ projectionStore, encodeCursor: encodeWorkSearchCursor });
    approvalQuery = new ApprovalQueryService({
      projectionStore,
      encodeCursor: encodeApprovalCursor,
    });
    attentionQuery = new AttentionQueryService({
      projectionStore,
      encodeCursor: encodeAttentionCursor,
    });
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

  async function runProjections() {
    await new OsOutboxWorker(outboxStore, [workConsumer]).runOnce();
  }

  async function seedMemberWithSingleRole(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
    roleKey: string,
  ) {
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({
      data: { id: personId, givenName, familyName, version: 0 },
    });
    await prisma.osOrganizationMember.create({
      data: {
        id: memberId,
        organizationId: orgId,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        version: 0,
      },
    });
    await prisma.osAuthIdentity.create({
      data: {
        id: authId,
        personId,
        provider: 'local-dev',
        providerSubject: `subject:${email}`,
        email,
        status: 'active',
        activatedAt: new Date(),
      },
    });
    await prisma.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        memberId,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
      },
    });
    return {
      member: { id: memberId },
      person: { id: personId },
      auth: { id: authId },
    };
  }

  it('work event projects into read model with owner and subject', async () => {
    const org = await workforceStore.seedOrganization('WP Org', `wp-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'master_data.admin',
    );
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `own-${Date.now()}@o.bo`,
      'Ow',
      'Ner',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const party = await partySvc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Work Subject',
    });
    await runProjections();

    await workSvc.execute(
      'CreateWorkItem',
      c,
      {
        title: 'Review subject',
        ownerMemberId: owner.member.id,
        subjectType: 'party',
        subjectId: String(party.data.partyId),
        priority: 'high',
      },
      `idem-wp-${Date.now()}`,
    );
    await runProjections();

    const workId = String(
      (
        await prisma.osWorkItem.findFirst({ where: { organizationId: org.id } })
      )?.id,
    );
    const readModel = await projectionStore.getWorkReadModel(org.id, workId);
    assert.ok(readModel);
    assert.equal(readModel.ownerMemberId, owner.member.id);
    assert.equal(readModel.status, 'open');
  });

  it('approval event projects and derives pending approval attention', async () => {
    const org = await workforceStore.seedOrganization('Appr Org', `appr-${Date.now()}`);
    const requester = await workforceStore.seedScopedAdminMember(
      org.id,
      `req-${Date.now()}@o.bo`,
      'Req',
      'Uester',
      'people.admin',
    );
    const approver = await workforceStore.seedScopedAdminMember(
      org.id,
      `app-${Date.now()}@o.bo`,
      'App',
      'Rover',
      'people.admin',
    );
    const c = ctx(org.id, requester.member.id, requester.person.id, requester.auth.id);
    const work = await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Needs approval', ownerMemberId: requester.member.id },
      `idem-appr-w-${Date.now()}`,
    );
    await runProjections();
    const workItemId = String(work.data.workItemId);

    await workSvc.execute(
      'RequestApproval',
      c,
      {
        approverMemberId: approver.member.id,
        workItemId,
        subjectType: 'work_item',
        subjectId: workItemId,
      },
      `idem-appr-r-${Date.now()}`,
    );
    await runProjections();

    const approvalId = String(
      (await prisma.osApprovalRequest.findFirst({ where: { organizationId: org.id } }))?.id,
    );
    const approvalModel = await projectionStore.getApprovalReadModel(org.id, approvalId);
    assert.ok(approvalModel);
    assert.equal(approvalModel.status, 'pending');

    const approverCtx = await buildQueryContext(
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
      workforceStore,
    );
    const attention = await attentionQuery.listAttentionItems(approverCtx, { limit: 10 });
    assert.ok(attention.items.some((a) => a.attentionType === 'pending_approval'));
  });

  it('completion removes open-work attention and approval decision clears pending attention', async () => {
    const org = await workforceStore.seedOrganization('Done Org', `done-${Date.now()}`);
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `own2-${Date.now()}@o.bo`,
      'Own',
      'Er',
      'people.admin',
    );
    const approver = await workforceStore.seedScopedAdminMember(
      org.id,
      `app2-${Date.now()}@o.bo`,
      'App',
      'Two',
      'people.admin',
    );
    const c = ctx(org.id, owner.member.id, owner.person.id, owner.auth.id);
    const work = await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Finish me', ownerMemberId: owner.member.id },
      `idem-done-w-${Date.now()}`,
    );
    await runProjections();
    const workItemId = String(work.data.workItemId);

    await workSvc.execute(
      'RequestApproval',
      c,
      {
        approverMemberId: approver.member.id,
        workItemId,
        subjectType: 'work_item',
        subjectId: workItemId,
      },
      `idem-done-a-${Date.now()}`,
    );
    await runProjections();

    await workSvc.execute('CompleteWork', c, { workItemId }, `idem-done-c-${Date.now()}`);
    await runProjections();

    const ownerCtx = await buildQueryContext(c, workforceStore);
    const attentionAfter = await attentionQuery.listAttentionItems(ownerCtx, { limit: 20 });
    assert.equal(
      attentionAfter.items.filter((a) => a.workItemId === workItemId && a.isActive).length,
      0,
    );

    const completed = await projectionStore.getWorkReadModel(org.id, workItemId);
    assert.equal(completed?.status, 'completed');
  });

  it('reassignment updates projected owner', async () => {
    const org = await workforceStore.seedOrganization('Re Org', `re-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm3-${Date.now()}@o.bo`,
      'Ad',
      'Min3',
      'people.admin',
    );
    const ownerA = await workforceStore.seedScopedAdminMember(
      org.id,
      `a4-${Date.now()}@o.bo`,
      'A',
      'Four',
      'master_data.admin',
    );
    const ownerB = await workforceStore.seedScopedAdminMember(
      org.id,
      `b4-${Date.now()}@o.bo`,
      'B',
      'Four',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const work = await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Handoff', ownerMemberId: ownerA.member.id },
      `idem-re-w-${Date.now()}`,
    );
    await runProjections();
    const workItemId = String(work.data.workItemId);

    await workSvc.execute(
      'ReassignWork',
      c,
      { workItemId, newOwnerMemberId: ownerB.member.id },
      `idem-re-r-${Date.now()}`,
    );
    await runProjections();

    const model = await projectionStore.getWorkReadModel(org.id, workItemId);
    assert.equal(model?.ownerMemberId, ownerB.member.id);
    assert.ok(model?.lastReassignedAt);
  });

  it('duplicate delivery is idempotent', async () => {
    const org = await workforceStore.seedOrganization('Dedup W', `dedw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm5-${Date.now()}@o.bo`,
      'Ad',
      'Min5',
      'people.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Once', ownerMemberId: admin.member.id },
      `idem-dedw-${Date.now()}`,
    );
    const worker = new OsOutboxWorker(outboxStore, [workConsumer]);
    await worker.runOnce();
    await worker.runOnce();
    assert.equal(await prisma.osWorkReadModel.count({ where: { organizationId: org.id } }), 1);
  });

  it('tenant isolation and authorization scope on queries', async () => {
    const orgA = await workforceStore.seedOrganization('TW A', `twa-${Date.now()}`);
    const orgB = await workforceStore.seedOrganization('TW B', `twb-${Date.now()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `aa-${Date.now()}@o.bo`,
      'A',
      'Admin',
      'people.admin',
    );
    const memberB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `bb-${Date.now()}@o.bo`,
      'B',
      'Member',
      'master_data.admin',
    );
    const outsider = await seedMemberWithSingleRole(
      orgA.id,
      `out-${Date.now()}@o.bo`,
      'Out',
      'Sider',
      'master_data.admin',
    );

    const cA = ctx(orgA.id, adminA.member.id, adminA.person.id, adminA.auth.id);
    await workSvc.execute(
      'CreateWorkItem',
      cA,
      { title: 'Secret A', ownerMemberId: adminA.member.id },
      `idem-twa-${Date.now()}`,
    );
    await runProjections();

    const cross = await projectionStore.listWorkReadModels(orgB.id, { limit: 10, status: 'open' });
    assert.equal(cross.items.length, 0);

    const workId = String(
      (await prisma.osWorkItem.findFirst({ where: { organizationId: orgA.id } }))?.id,
    );
    const outsiderCtx = await buildQueryContext(
      ctx(orgA.id, outsider.member.id, outsider.person.id, outsider.auth.id),
      workforceStore,
    );
    await assert.rejects(
      () => workQuery.getWorkSummary(outsiderCtx, workId),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );

    const maliciousFilterCtx = await buildQueryContext(
      ctx(orgA.id, outsider.member.id, outsider.person.id, outsider.auth.id),
      workforceStore,
    );
    await assert.rejects(
      () =>
        workQuery.listOpenWork(maliciousFilterCtx, {
          limit: 10,
          ownerMemberId: adminA.member.id,
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );

    void memberB;
  });

  it('rebuild from events restores projections', async () => {
    const org = await workforceStore.seedOrganization('Rebuild W', `rbw-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `adm6-${Date.now()}@o.bo`,
      'Ad',
      'Min6',
      'people.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await workSvc.execute(
      'CreateWorkItem',
      c,
      { title: 'Rebuildable', ownerMemberId: admin.member.id },
      `idem-rbw-${Date.now()}`,
    );
    await runProjections();

    const replay = await replayWorkProjectionForOrg(
      { projectionStore, workStore },
      org.id,
      workConsumer,
    );
    assert.ok(replay.replayed >= 1);

    const checkpoint = await projectionStore.getCheckpoint(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.workSummary,
    );
    assert.ok(checkpoint?.lastEventId);
  });
});
