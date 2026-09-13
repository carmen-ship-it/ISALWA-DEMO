import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { WorkCommandService } from '@isalwa/os-work';
import {
  PartyTimelineProjectionConsumer,
  PartyTimelineQueryService,
  buildQueryContext,
  encodePartyTimelineCursor,
  replayPartyTimelineForOrg,
} from '@isalwa/os-query';
import {
  getOsPrisma,
  PrismaOsCommercialStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
} from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('party timeline work + approval prisma integration (Step 16.1B)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let workStore: PrismaOsWorkStore;
  let commercialStore: PrismaOsCommercialStore;
  let projectionStore: PrismaOsProjectionStore;
  let partySvc: PartyCommandService;
  let workSvc: WorkCommandService;
  let consumer: PartyTimelineProjectionConsumer;
  let querySvc: PartyTimelineQueryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    workStore = new PrismaOsWorkStore(prisma);
    commercialStore = new PrismaOsCommercialStore(prisma);
    projectionStore = new PrismaOsProjectionStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    workSvc = new WorkCommandService(workStore);
    consumer = new PartyTimelineProjectionConsumer({ projectionStore, commercialStore, workStore });
    querySvc = new PartyTimelineQueryService({
      projectionStore,
      encodeCursor: encodePartyTimelineCursor,
      partyExists: async (organizationId, partyId) => {
        const party = await partyStore.getPartyInOrg(organizationId, partyId);
        return party != null;
      },
    });
    await workforceStore.truncateAll();
  });

  function ctx(orgId: string, memberId: string, personId: string, authId: string): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt: new Date('2026-08-24T16:00:00Z'),
    };
  }

  async function drainTimelineOutbox(orgId: string) {
    const pending = await prisma.osOutboxMessage.findMany({
      where: { organizationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    for (const msg of pending) {
      const event = await prisma.osBusinessEvent.findUnique({ where: { id: msg.eventId } });
      if (!event) continue;
      await consumer.deliver({
        id: event.id,
        organizationId: event.organizationId,
        eventType: event.eventType,
        schemaVersion: 1,
        occurredAt: event.occurredAt.toISOString(),
        recordedAt: event.recordedAt.toISOString(),
        actorMemberId: event.actorMemberId,
        primaryEntityType: event.primaryEntityType,
        primaryEntityId: event.primaryEntityId,
        correlationId: event.correlationId ?? createId(),
        provenance: 'command',
        dataOrigin: 'production',
        payload: (event.payloadJson as Record<string, unknown> | undefined) ?? undefined,
      });
      await prisma.osOutboxMessage.update({
        where: { id: msg.id },
        data: { status: 'published', publishedAt: new Date() },
      });
    }
  }

  async function seedFixture() {
    const org = await workforceStore.seedOrganization('WA TL Org', `watl-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@watl.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const owner = await workforceStore.seedScopedAdminMember(
      org.id,
      `own-${createId()}@watl.bo`,
      'Work',
      'Owner',
      'people.admin',
    );
    const approver = await workforceStore.seedScopedAdminMember(
      org.id,
      `app-${createId()}@watl.bo`,
      'App',
      'Rover',
      'people.admin',
    );
    const requester = await workforceStore.seedScopedAdminMember(
      org.id,
      `req-${createId()}@watl.bo`,
      'Req',
      'Uester',
      'people.admin',
    );
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const ownerCtx = ctx(org.id, owner.member.id, owner.person.id, owner.auth.id);
    const approverCtx = ctx(org.id, approver.member.id, approver.person.id, approver.auth.id);
    const requesterCtx = ctx(org.id, requester.member.id, requester.person.id, requester.auth.id);

    const partyId = String(
      (
        await partySvc.execute('CreateParty', adminCtx, {
          partyKind: 'organization',
          displayName: 'Timeline Work Client',
          initialRoleKey: 'customer',
        })
      ).data.partyId,
    );
    await drainTimelineOutbox(org.id);

    const commercialAccount = await commercialStore.getCommercialAccountForParty(org.id, partyId);
    assert.ok(commercialAccount);

    return {
      org,
      partyId,
      commercialAccountId: commercialAccount.id,
      adminCtx,
      ownerCtx,
      approverCtx,
      requesterCtx,
      owner,
      approver,
      requester,
    };
  }

  it('projects work lifecycle events for party-subject work', async () => {
    const { org, partyId, ownerCtx, owner, requesterCtx } = await seedFixture();

    const created = await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Party-linked work',
      ownerMemberId: owner.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    const workItemId = String(created.data.workItemId);
    await drainTimelineOutbox(org.id);

    await workSvc.execute('ReassignWork', ownerCtx, {
      workItemId,
      newOwnerMemberId: owner.member.id,
      reason: 'stay',
    });
    await workSvc.execute('CompleteWork', ownerCtx, { workItemId });
    await drainTimelineOutbox(org.id);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 50 });
    const types = page.items.map((item) => item.eventType);

    assert.ok(types.includes('work.created'));
    assert.ok(types.includes('task.reassigned'));
    assert.ok(types.includes('work.completed'));

    const workCreated = page.items.find((item) => item.eventType === 'work.created');
    assert.ok(workCreated);
    assert.equal(workCreated.facts.workItemId, workItemId);
    assert.equal(workCreated.facts.subjectType, 'party');
    assert.equal(workCreated.facts.subjectId, partyId);
    assert.equal('contextSnapshot' in workCreated.facts, false);
    assert.equal('payload' in workCreated, false);
  });

  it('projects work for commercial_account subject via canonical lookup', async () => {
    const { org, partyId, commercialAccountId, ownerCtx, owner, requesterCtx } =
      await seedFixture();

    await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Commercial account work',
      ownerMemberId: owner.member.id,
      subjectType: 'commercial_account',
      subjectId: commercialAccountId,
    });
    await drainTimelineOutbox(org.id);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 25 });
    assert.ok(page.items.some((item) => item.eventType === 'work.created'));
  });

  it('excludes work without party association', async () => {
    const { org, partyId, ownerCtx, owner, requesterCtx } = await seedFixture();

    await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Unlinked work',
      ownerMemberId: owner.member.id,
      subjectType: 'organization_member',
      subjectId: owner.member.id,
    });
    await drainTimelineOutbox(org.id);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 25 });
    assert.ok(!page.items.some((item) => item.eventType === 'work.created'));
  });

  it('projects approval events for party subject and work_item chain', async () => {
    const { org, partyId, ownerCtx, owner, approver, requesterCtx, approverCtx } =
      await seedFixture();

    await workSvc.execute('RequestApproval', requesterCtx, {
      approverMemberId: approver.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    const approvalId = String(
      (await prisma.osApprovalRequest.findFirst({ where: { organizationId: org.id } }))!.id,
    );
    await drainTimelineOutbox(org.id);

    await workSvc.execute('Approve', approverCtx, { approvalRequestId: approvalId });
    await drainTimelineOutbox(org.id);

    const workCreated = await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Approval chain work',
      ownerMemberId: owner.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    const workItemId = String(workCreated.data.workItemId);
    await drainTimelineOutbox(org.id);

    await workSvc.execute('RequestApproval', requesterCtx, {
      approverMemberId: approver.member.id,
      subjectType: 'work_item',
      subjectId: workItemId,
    });
    const workApprovalId = (
      await prisma.osApprovalRequest.findFirst({
        where: { organizationId: org.id, subjectType: 'work_item' },
        orderBy: { id: 'desc' },
      })
    )!.id;
    await drainTimelineOutbox(org.id);

    await workSvc.execute('Reject', approverCtx, {
      approvalRequestId: workApprovalId,
      reason: 'Not now',
    });
    await drainTimelineOutbox(org.id);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 50 });
    const types = page.items.map((item) => item.eventType);

    assert.ok(types.includes('approval.requested'));
    assert.ok(types.includes('approval.approved'));
    assert.ok(types.includes('approval.rejected'));

    for (const item of page.items) {
      if (item.eventType.startsWith('approval.')) {
        assert.equal('contextSnapshot' in item.facts, false);
        assert.ok(typeof item.facts.approvalRequestId === 'string');
      }
    }
  });

  it('excludes organization_member approval from party timeline', async () => {
    const { org, partyId, approver, requesterCtx } = await seedFixture();

    await workSvc.execute('RequestApproval', requesterCtx, {
      approverMemberId: approver.member.id,
      subjectType: 'organization_member',
      subjectId: approver.member.id,
    });
    await drainTimelineOutbox(org.id);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 25 });
    assert.ok(!page.items.some((item) => item.eventType.startsWith('approval.')));
  });

  it('duplicate work event does not duplicate timeline entry', async () => {
    const { org, partyId, ownerCtx, owner, requesterCtx } = await seedFixture();

    await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Dup work',
      ownerMemberId: owner.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    await drainTimelineOutbox(org.id);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'work.created' },
    });
    assert.ok(event);
    await consumer.deliver({
      id: event.id,
      organizationId: event.organizationId,
      eventType: event.eventType,
      schemaVersion: 1,
      occurredAt: event.occurredAt.toISOString(),
      recordedAt: event.recordedAt.toISOString(),
      actorMemberId: event.actorMemberId,
      primaryEntityType: event.primaryEntityType,
      primaryEntityId: event.primaryEntityId,
      correlationId: event.correlationId ?? createId(),
      provenance: 'command',
      dataOrigin: 'production',
      payload: (event.payloadJson as Record<string, unknown> | undefined) ?? undefined,
    });

    const count = await prisma.osPartyTimelineEntry.count({
      where: { organizationId: org.id, entryId: event.id },
    });
    assert.equal(count, 1);

    const queryCtx = await buildQueryContext(requesterCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 25 });
    assert.equal(page.items.filter((item) => item.eventType === 'work.created').length, 1);
  });

  it('replay rebuild includes work and approval entries', async () => {
    const { org, partyId, ownerCtx, owner, approver, requesterCtx } = await seedFixture();

    await workSvc.execute('CreateWorkItem', ownerCtx, {
      title: 'Replay work',
      ownerMemberId: owner.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    await workSvc.execute('RequestApproval', requesterCtx, {
      approverMemberId: approver.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    await drainTimelineOutbox(org.id);

    await projectionStore.deletePartyTimelineEntriesForOrg(org.id);
    const { replayed } = await replayPartyTimelineForOrg(
      { projectionStore, commercialStore, workStore },
      org.id,
      consumer,
    );
    assert.ok(replayed >= 3);

    const count = await projectionStore.countPartyTimelineEntries(org.id, partyId);
    assert.ok(count >= 3);
  });
});
