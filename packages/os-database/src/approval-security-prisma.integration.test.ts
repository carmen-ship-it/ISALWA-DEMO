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

describePrisma('approval security + integrity (Step 14.4)', () => {
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
    effectiveAt = new Date(),
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

  async function seedApprovalFixture() {
    const org = await workforceStore.seedOrganization('Appr Sec', `apsec-${Date.now()}`);
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
      { partyKind: 'organization', displayName: 'Approval Subject Party' },
    );
    return {
      org,
      requester,
      approver,
      md,
      partyId: String(party.data.partyId),
    };
  }

  async function latestEventPayload(orgId: string, eventType: string) {
    const row = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: orgId, eventType },
      orderBy: { recordedAt: 'desc' },
    });
    assert.ok(row);
    const outbox = await prisma.osOutboxMessage.findFirst({
      where: { organizationId: orgId, eventId: row.id },
    });
    assert.ok(outbox);
    return {
      eventPayload: row.payloadJson as Record<string, unknown>,
      outboxPayload: outbox.payloadJson as Record<string, unknown>,
    };
  }

  it('accepts allowed party subject', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const result = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    assert.ok(result.data.approvalRequestId);
  });

  it('rejects unknown subject type', async () => {
    const { org, requester, approver } = await seedApprovalFixture();
    await assert.rejects(
      () =>
        workSvc.execute(
          'RequestApproval',
          ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
          {
            approverMemberId: approver.member.id,
            subjectType: 'invoice',
            subjectId: 'fake-id',
          },
        ),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('rejects blocked commercial_account subject type', async () => {
    const { org, requester, approver } = await seedApprovalFixture();
    await assert.rejects(
      () =>
        workSvc.execute(
          'RequestApproval',
          ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
          {
            approverMemberId: approver.member.id,
            subjectType: 'commercial_account',
            subjectId: 'ca-fake',
          },
        ),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('rejects nonexistent party subject', async () => {
    const { org, requester, approver } = await seedApprovalFixture();
    await assert.rejects(
      () =>
        workSvc.execute(
          'RequestApproval',
          ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
          {
            approverMemberId: approver.member.id,
            subjectType: 'party',
            subjectId: '01NONEXISTENTPARTY000000000',
          },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('rejects cross-tenant party subject', async () => {
    const fx = await seedApprovalFixture();
    const orgB = await workforceStore.seedOrganization('Org B', `orgb-${Date.now()}`);
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `b-${Date.now()}@o.bo`,
      'B',
      'Admin',
      'people.admin',
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'RequestApproval',
          ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
          {
            approverMemberId: adminB.member.id,
            subjectType: 'party',
            subjectId: fx.partyId,
          },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('RequestApproval event payload is bounded and excludes malicious context', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
        context: { note: 'bounded note' },
      },
    );
    const { eventPayload, outboxPayload } = await latestEventPayload(org.id, 'approval.requested');
    assert.deepEqual(Object.keys(eventPayload).sort(), [
      'approvalRequestId',
      'approverMemberId',
      'subjectId',
      'subjectType',
      'workItemId',
    ]);
    assert.equal('contextSnapshot' in eventPayload, false);
    assert.equal('nit' in eventPayload, false);
    assert.equal('contextSnapshot' in outboxPayload, false);

    const row = await prisma.osApprovalRequest.findFirst({ where: { organizationId: org.id } });
    const snap = row?.contextSnapshotJson as Record<string, unknown>;
    assert.equal(snap.note, 'bounded note');
    assert.equal('password' in snap, false);
  });

  it('rejects free-form context keys at validation', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    await assert.rejects(
      () =>
        workSvc.execute(
          'RequestApproval',
          ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
          {
            approverMemberId: approver.member.id,
            subjectType: 'party',
            subjectId: partyId,
            context: { note: 'ok', nit: '123456789', token: 'secret' },
          },
        ),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('approve emits safe bounded decision payload', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
        context: { note: 'sensitive should not leak' },
      },
    );
    const approvalRequestId = String(requested.data.approvalRequestId);
    await workSvc.execute(
      'Approve',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
      { approvalRequestId, reason: 'Looks good' },
    );
    const { eventPayload } = await latestEventPayload(org.id, 'approval.approved');
    assert.equal(eventPayload.contextSnapshot, undefined);
    assert.equal(eventPayload.note, undefined);
    assert.ok(eventPayload.approvalRequestId);
    assert.equal(eventPayload.subjectType, 'party');
    assert.equal(eventPayload.subjectId, partyId);
    assert.equal(eventPayload.decision, 'approved');
    assert.equal(eventPayload.decisionByMemberId, approver.member.id);
    assert.equal(eventPayload.requestedByMemberId, requester.member.id);
  });

  it('reject succeeds on separate approval', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await workSvc.execute(
      'Reject',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
      { approvalRequestId: String(requested.data.approvalRequestId), reason: 'No' },
    );
    const row = await workStore.getApprovalRequest(org.id, String(requested.data.approvalRequestId));
    assert.equal(row?.status, 'rejected');
  });

  it('concurrent approve vs reject allows exactly one terminal decision', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    const approvalRequestId = String(requested.data.approvalRequestId);
    const approverCtx = ctx(org.id, approver.member.id, approver.person.id, approver.auth.id);
    const [approveResult, rejectResult] = await Promise.allSettled([
      workSvc.execute('Approve', approverCtx, { approvalRequestId, reason: 'Yes' }),
      workSvc.execute('Reject', approverCtx, {
        approvalRequestId,
        reason: 'No',
      }),
    ]);

    const outcomes = [approveResult, rejectResult];
    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal((rejected[0] as PromiseRejectedResult).reason.message, 'CONFLICT');

    const row = await workStore.getApprovalRequest(org.id, approvalRequestId);
    assert.ok(row?.status === 'approved' || row?.status === 'rejected');
    assert.notEqual(row?.status, 'pending');
  });

  it('second terminal decision returns CONFLICT', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    const approvalRequestId = String(requested.data.approvalRequestId);
    const approverCtx = ctx(org.id, approver.member.id, approver.person.id, approver.auth.id);
    await workSvc.execute('Approve', approverCtx, { approvalRequestId });
    await assert.rejects(
      () => workSvc.execute('Reject', approverCtx, { approvalRequestId, reason: 'Late' }),
      (err: Error) => err.message === 'CONFLICT',
    );
  });

  it('duplicate Approve command is idempotent', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    const approvalRequestId = String(requested.data.approvalRequestId);
    const approverCtx = ctx(org.id, approver.member.id, approver.person.id, approver.auth.id);
    const key = `approve-idem-${Date.now()}`;
    const first = await workSvc.execute('Approve', approverCtx, { approvalRequestId }, key);
    const second = await workSvc.execute('Approve', approverCtx, { approvalRequestId }, key);
    assert.equal(first.commandId, second.commandId);
    const events = await prisma.osBusinessEvent.count({
      where: { organizationId: org.id, eventType: 'approval.approved', primaryEntityId: approvalRequestId },
    });
    assert.equal(events, 1);
  });

  it('rejects expired delegation for approve', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const delegate = await workforceStore.seedScopedAdminMember(
      org.id,
      `del-${Date.now()}@o.bo`,
      'Del',
      'Gate',
      'sales_rep',
    );
    const grantAt = new Date('2026-08-24T12:00:00Z');
    await workforceSvc.execute(
      'GrantDelegation',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id, grantAt),
      {
        delegateMemberId: delegate.member.id,
        scopes: ['approval.act'],
        expiresAt: new Date('2026-08-24T13:00:00Z').toISOString(),
      },
    );
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id, grantAt),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'Approve',
          ctx(org.id, delegate.member.id, delegate.person.id, delegate.auth.id, new Date('2026-08-24T14:00:00Z')),
          { approvalRequestId: String(requested.data.approvalRequestId) },
        ),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('rejects unauthorized member for approve', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const outsider = await workforceStore.seedScopedAdminMember(
      org.id,
      `out-${Date.now()}@o.bo`,
      'Out',
      'Sider',
      'sales_rep',
    );
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'Approve',
          ctx(org.id, outsider.member.id, outsider.person.id, outsider.auth.id),
          { approvalRequestId: String(requested.data.approvalRequestId) },
        ),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('rejects suspended approver for approve', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    await workSvc.execute(
      'Reject',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
      {
        approvalRequestId: String(requested.data.approvalRequestId),
        reason: 'Cierre para suspender',
      },
    );
    await workforceSvc.execute(
      'SuspendMember',
      ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
      { memberId: approver.member.id },
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'Approve',
          ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
          { approvalRequestId: String(requested.data.approvalRequestId) },
        ),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('rejects cross-tenant approval decision', async () => {
    const fx = await seedApprovalFixture();
    const orgB = await workforceStore.seedOrganization('Org B2', `orgb2-${Date.now()}`);
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `b2-${Date.now()}@o.bo`,
      'B2',
      'Admin',
      'people.admin',
    );
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(fx.org.id, fx.requester.member.id, fx.requester.person.id, fx.requester.auth.id),
      {
        approverMemberId: fx.approver.member.id,
        subjectType: 'party',
        subjectId: fx.partyId,
      },
    );
    await assert.rejects(
      () =>
        workSvc.execute(
          'Approve',
          ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
          { approvalRequestId: String(requested.data.approvalRequestId) },
        ),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('rolls back approval decision when outbox append fails', async () => {
    const { org, requester, approver, partyId } = await seedApprovalFixture();
    const requested = await workSvc.execute(
      'RequestApproval',
      ctx(org.id, requester.member.id, requester.person.id, requester.auth.id),
      {
        approverMemberId: approver.member.id,
        subjectType: 'party',
        subjectId: partyId,
      },
    );
    const approvalRequestId = String(requested.data.approvalRequestId);
    workStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        workSvc.execute(
          'Approve',
          ctx(org.id, approver.member.id, approver.person.id, approver.auth.id),
          { approvalRequestId },
        ),
      (err: Error) => err.message === 'OUTBOX_APPEND_FAILED',
    );
    const row = await workStore.getApprovalRequest(org.id, approvalRequestId);
    assert.equal(row?.status, 'pending');
    assert.equal(row?.decisionByMemberId, null);
  });
});
