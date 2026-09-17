import type { WorkCommandName, RequestContext } from '@isalwa/os-contracts';
import {
  ApprovalRequestContextSchema,
  COMMAND_REQUIRED_SCOPES,
  canRequestCommercialSubjectApproval,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasScope,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import type { OsWorkStore } from './os-work-store';
import type { WorkItemRecord } from './store-types';
import {
  buildApprovalDecisionEventPayload,
  validateApprovalSubject,
} from './approval-subjects';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class WorkCommandService {
  private activeIdempotencyKey?: string;

  constructor(private readonly store: OsWorkStore) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.store.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    command: WorkCommandName,
    targetOrgId: string,
  ): Promise<MemberAccessSnapshot> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    const required = COMMAND_REQUIRED_SCOPES[command];
    if (required && required !== 'member_active' && !memberHasScope(snap, required)) {
      throw new Error('PERMISSION_DENIED');
    }
    return snap;
  }

  private memberHasAdminScope(snap: MemberAccessSnapshot): boolean {
    return memberHasScope(snap, 'people.admin');
  }

  async execute(
    command: WorkCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    const actor = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor || actor.organizationId !== ctx.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }

    if (idempotencyKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) {
        return existing.resultJson as unknown as CommandResult;
      }
    }

    return this.store.runInTransaction(async (store) => {
      this.activeIdempotencyKey = idempotencyKey;
      let result: CommandResult;
      switch (command) {
      case 'CreateWorkItem':
        result = await this.createWorkItem(ctx, payload, store);
        break;
      case 'ReassignWork':
        result = await this.reassignWork(ctx, payload, store);
        break;
      case 'CompleteWork':
        result = await this.completeWork(ctx, payload, store);
        break;
      case 'CancelWorkItem':
        result = await this.cancelWorkItem(ctx, payload, store);
        break;
      case 'RequestApproval':
        result = await this.requestApproval(ctx, payload, store);
        break;
      case 'Approve':
        result = await this.approve(ctx, payload, store);
        break;
      case 'Reject':
        result = await this.reject(ctx, payload, store);
        break;
      case 'EscalateApproval':
        result = await this.escalateApproval(ctx, payload, store);
        break;
      default:
        throw new Error('VALIDATION_FAILED');
      }

      if (idempotencyKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: idempotencyKey,
          commandName: command,
          resultJson: result as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    });
  }

  private async emit(
    ctx: RequestContext,
    store: OsWorkStore,
    eventType: string,
    primaryType: string,
    primaryId: string,
    payload?: Record<string, unknown>,
    auditAction?: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): Promise<CommandResult> {
    const event = buildBusinessEvent({
      organizationId: ctx.organizationId,
      eventType,
      occurredAt: ctx.effectiveAt,
      actorMemberId: ctx.actorMemberId,
      authorizationContext: { memberId: ctx.actorMemberId },
      primaryEntityType: primaryType,
      primaryEntityId: primaryId,
      payload,
      correlationId: ctx.correlationId,
      idempotencyKey: this.activeIdempotencyKey,
      capabilityKey: 'work',
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      ctx.organizationId,
      ctx.actorMemberId,
      auditAction ?? eventType,
      primaryType,
      primaryId,
      ctx.correlationId,
      before,
      after,
    );
    await store.appendEventAndAudit(event, outbox, audit);
    return {
      commandId: event.id,
      correlationId: ctx.correlationId,
      data: { eventId: event.id, ...(payload ?? {}) },
    };
  }

  private async requireOpenWork(
    store: OsWorkStore,
    orgId: string,
    workItemId: string,
  ): Promise<WorkItemRecord> {
    const work = await store.getWorkItemInOrg(orgId, workItemId);
    if (!work) throw new Error('NOT_FOUND');
    if (work.status !== 'open') throw new Error('VALIDATION_FAILED');
    return work;
  }

  private async validateSubject(
    store: OsWorkStore,
    orgId: string,
    subjectType?: string,
    subjectId?: string,
  ): Promise<void> {
    if (!subjectType || !subjectId) return;
    if (subjectType === 'party') {
      const ok = await store.partyExistsInOrg(orgId, subjectId);
      if (!ok) throw new Error('NOT_FOUND');
    }
  }

  private async createWorkItem(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'CreateWorkItem', ctx.organizationId);
    const ownerMemberId = String(payload.ownerMemberId);
    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!owner || owner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const subjectType = payload.subjectType ? String(payload.subjectType) : undefined;
    const subjectId = payload.subjectId ? String(payload.subjectId) : undefined;
    await this.validateSubject(store, ctx.organizationId, subjectType, subjectId);

    const workItemId = createId();
    const item: WorkItemRecord = {
      id: workItemId,
      organizationId: ctx.organizationId,
      ownerMemberId,
      createdByMemberId: ctx.actorMemberId,
      title: String(payload.title),
      description: payload.description ? String(payload.description) : null,
      status: 'open',
      priority: (payload.priority as WorkItemRecord['priority']) ?? 'normal',
      dueAt: payload.dueAt ? new Date(String(payload.dueAt)) : null,
      subjectType: (subjectType as WorkItemRecord['subjectType']) ?? null,
      subjectId: subjectId ?? null,
      completedAt: null,
      cancelledAt: null,
      version: 0,
    };
    await store.insertWorkItem(item);
    await store.insertOwnershipHistory({
      id: createId(),
      organizationId: ctx.organizationId,
      workItemId,
      fromMemberId: null,
      toMemberId: ownerMemberId,
      changedByMemberId: ctx.actorMemberId,
      reason: 'created',
      changedAt: ctx.effectiveAt,
    });

    return this.emit(ctx, store, 'work.created', 'work_item', workItemId, {
      workItemId,
      ownerMemberId,
      title: item.title,
      subjectType: item.subjectType,
      subjectId: item.subjectId,
    });
  }

  private async reassignWork(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ReassignWork', ctx.organizationId);
    const workItemId = String(payload.workItemId);
    const newOwnerMemberId = String(payload.newOwnerMemberId);
    const work = await this.requireOpenWork(store, ctx.organizationId, workItemId);
    const newOwner = await store.getMemberInOrg(ctx.organizationId, newOwnerMemberId);
    if (!newOwner || newOwner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const before = { ownerMemberId: work.ownerMemberId };
    await store.updateWorkItem(
      workItemId,
      { ownerMemberId: newOwnerMemberId, version: work.version + 1 },
      work.version,
    );
    await store.insertOwnershipHistory({
      id: createId(),
      organizationId: ctx.organizationId,
      workItemId,
      fromMemberId: work.ownerMemberId,
      toMemberId: newOwnerMemberId,
      changedByMemberId: ctx.actorMemberId,
      reason: payload.reason ? String(payload.reason) : 'reassigned',
      changedAt: ctx.effectiveAt,
    });

    return this.emit(
      ctx,
      store,
      'task.reassigned',
      'work_item',
      workItemId,
      { workItemId, newOwnerMemberId, previousOwnerMemberId: work.ownerMemberId },
      'task.reassigned',
      before,
      { ownerMemberId: newOwnerMemberId },
    );
  }

  private async completeWork(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CompleteWork', ctx.organizationId);
    const workItemId = String(payload.workItemId);
    const work = await this.requireOpenWork(store, ctx.organizationId, workItemId);
    if (work.ownerMemberId !== ctx.actorMemberId && !this.memberHasAdminScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    await store.updateWorkItem(
      workItemId,
      { status: 'completed', completedAt: ctx.effectiveAt, version: work.version + 1 },
      work.version,
    );
    await store.insertOwnershipHistory({
      id: createId(),
      organizationId: ctx.organizationId,
      workItemId,
      fromMemberId: work.ownerMemberId,
      toMemberId: work.ownerMemberId,
      changedByMemberId: ctx.actorMemberId,
      reason: 'completed',
      changedAt: ctx.effectiveAt,
    });

    return this.emit(ctx, store, 'work.completed', 'work_item', workItemId, { workItemId });
  }

  private async cancelWorkItem(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CancelWorkItem', ctx.organizationId);
    const workItemId = String(payload.workItemId);
    const work = await this.requireOpenWork(store, ctx.organizationId, workItemId);
    if (work.ownerMemberId !== ctx.actorMemberId && !this.memberHasAdminScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    await store.updateWorkItem(
      workItemId,
      { status: 'cancelled', cancelledAt: ctx.effectiveAt, version: work.version + 1 },
      work.version,
    );
    await store.insertOwnershipHistory({
      id: createId(),
      organizationId: ctx.organizationId,
      workItemId,
      fromMemberId: work.ownerMemberId,
      toMemberId: work.ownerMemberId,
      changedByMemberId: ctx.actorMemberId,
      reason: payload.reason ? `cancelled:${String(payload.reason)}` : 'cancelled',
      changedAt: ctx.effectiveAt,
    });

    return this.emit(ctx, store, 'work.cancelled', 'work_item', workItemId, {
      workItemId,
      reason: payload.reason ? String(payload.reason) : undefined,
    });
  }

  private async requestApproval(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RequestApproval', ctx.organizationId);
    const approverMemberId = String(payload.approverMemberId);
    const approver = await store.getMemberInOrg(ctx.organizationId, approverMemberId);
    if (!approver || approver.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const workItemId = payload.workItemId ? String(payload.workItemId) : null;
    if (workItemId) {
      await this.requireOpenWork(store, ctx.organizationId, workItemId);
    }

    const subjectType = String(payload.subjectType);
    const subjectId = String(payload.subjectId);
    await validateApprovalSubject(store, ctx.organizationId, subjectType, subjectId);
    const commercialSubject =
      subjectType === 'quote'
        ? await store.getQuoteApprovalSubject(ctx.organizationId, subjectId)
        : subjectType === 'order'
          ? await store.getOrderApprovalSubject(ctx.organizationId, subjectId)
          : null;
    if (subjectType === 'quote' || subjectType === 'order') {
      if (
        !commercialSubject ||
        !canRequestCommercialSubjectApproval({
          actorMemberId: ctx.actorMemberId,
          subjectOwnerMemberId: commercialSubject.ownerMemberId,
        })
      ) {
        throw new Error('PERMISSION_DENIED');
      }
    }

    const parsedContext = payload.context
      ? ApprovalRequestContextSchema.safeParse(payload.context)
      : { success: true as const, data: undefined };
    if (!parsedContext.success) throw new Error('VALIDATION_FAILED');

    const approvalRequestId = createId();
    const note = parsedContext.data?.note;
    const contextSnapshot = {
      ...(note ? { note } : {}),
      requestedAt: ctx.effectiveAt.toISOString(),
      requestedByMemberId: ctx.actorMemberId,
      approverMemberId,
      workItemId,
      subjectType,
      subjectId,
    };

    await store.insertApprovalRequest({
      id: approvalRequestId,
      organizationId: ctx.organizationId,
      workItemId,
      subjectType,
      subjectId,
      requestedByMemberId: ctx.actorMemberId,
      approverMemberId,
      status: 'pending',
      contextSnapshotJson: contextSnapshot,
      decisionByMemberId: null,
      decisionReason: null,
      decidedAt: null,
    });

    return this.emit(ctx, store, 'approval.requested', 'approval_request', approvalRequestId, {
      approvalRequestId,
      approverMemberId,
      workItemId,
      subjectType,
      subjectId,
      ...(commercialSubject?.partyId ? { partyId: commercialSubject.partyId } : {}),
    });
  }

  private async canDecideApproval(
    ctx: RequestContext,
    store: OsWorkStore,
    approverMemberId: string,
  ): Promise<boolean> {
    if (ctx.actorMemberId === approverMemberId) return true;
    const delegations = await store.listDelegationsForDelegate(ctx.actorMemberId, ctx.organizationId);
    for (const d of delegations) {
      if (d.revokedAt) continue;
      if (d.startsAt > ctx.effectiveAt || d.expiresAt <= ctx.effectiveAt) continue;
      if (d.delegatorMemberId === approverMemberId && d.scopes.includes('approval.act')) {
        return true;
      }
    }
    return false;
  }

  private async decideApproval(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
    decision: 'approved' | 'rejected',
    command: 'Approve' | 'Reject',
    reason: string | null,
  ): Promise<CommandResult> {
    await this.authorize(ctx, command, ctx.organizationId);
    const approvalRequestId = String(payload.approvalRequestId);
    const approval = await store.getApprovalRequest(ctx.organizationId, approvalRequestId);
    if (!approval) throw new Error('NOT_FOUND');
    if (approval.status !== 'pending') throw new Error('CONFLICT');

    if (!(await this.canDecideApproval(ctx, store, approval.approverMemberId))) {
      throw new Error('PERMISSION_DENIED');
    }

    const decided = await store.decidePendingApprovalRequest(ctx.organizationId, approvalRequestId, {
      status: decision,
      decisionByMemberId: ctx.actorMemberId,
      decisionReason: reason,
      decidedAt: ctx.effectiveAt,
    });
    if (!decided) throw new Error('CONFLICT');

    const eventType = decision === 'approved' ? 'approval.approved' : 'approval.rejected';
    const eventPayload = buildApprovalDecisionEventPayload({
      approvalRequestId,
      subjectType: approval.subjectType,
      subjectId: approval.subjectId,
      requestedByMemberId: approval.requestedByMemberId,
      approverMemberId: approval.approverMemberId,
      decision,
      decisionByMemberId: ctx.actorMemberId,
      decidedAt: ctx.effectiveAt,
      reason,
    });

    return this.emit(
      ctx,
      store,
      eventType,
      'approval_request',
      approvalRequestId,
      eventPayload,
      eventType,
      { status: approval.status },
      { status: decision, decisionByMemberId: ctx.actorMemberId },
    );
  }

  private async approve(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    return this.decideApproval(
      ctx,
      payload,
      store,
      'approved',
      'Approve',
      payload.reason ? String(payload.reason).slice(0, 500) : null,
    );
  }

  private async reject(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    return this.decideApproval(
      ctx,
      payload,
      store,
      'rejected',
      'Reject',
      String(payload.reason).slice(0, 500),
    );
  }

  /**
   * Explicit human escalate: current approver (or approval.act delegate) reassigns
   * pending responsibility to a chosen Gerencia member. No auto-pick.
   * Preserves prior approver + note in contextSnapshot.escalationHistory.
   */
  private async escalateApproval(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'EscalateApproval', ctx.organizationId);
    const approvalRequestId = String(payload.approvalRequestId);
    const newApproverMemberId = String(payload.newApproverMemberId);
    const reason = payload.reason ? String(payload.reason).slice(0, 500) : null;

    const approval = await store.getApprovalRequest(ctx.organizationId, approvalRequestId);
    if (!approval) throw new Error('NOT_FOUND');
    if (approval.status !== 'pending') throw new Error('CONFLICT');

    if (!(await this.canDecideApproval(ctx, store, approval.approverMemberId))) {
      throw new Error('PERMISSION_DENIED');
    }

    if (newApproverMemberId === approval.approverMemberId) {
      throw new Error('VALIDATION_FAILED');
    }

    const newApprover = await store.getMemberInOrg(ctx.organizationId, newApproverMemberId);
    if (!newApprover || newApprover.accessStatus !== 'active') {
      throw new Error('VALIDATION_FAILED');
    }

    const priorApproverMemberId = approval.approverMemberId;
    const priorSnapshot =
      approval.contextSnapshotJson && typeof approval.contextSnapshotJson === 'object'
        ? { ...approval.contextSnapshotJson }
        : {};
    const priorHistory = Array.isArray(priorSnapshot.escalationHistory)
      ? [...(priorSnapshot.escalationHistory as unknown[])]
      : [];
    priorHistory.push({
      escalatedAt: ctx.effectiveAt.toISOString(),
      escalatedByMemberId: ctx.actorMemberId,
      fromApproverMemberId: priorApproverMemberId,
      toApproverMemberId: newApproverMemberId,
      ...(reason ? { reason } : {}),
    });
    const nextSnapshot = {
      ...priorSnapshot,
      approverMemberId: newApproverMemberId,
      escalationHistory: priorHistory,
      lastEscalatedAt: ctx.effectiveAt.toISOString(),
      lastEscalatedByMemberId: ctx.actorMemberId,
    };

    const updated = await store.reassignPendingApprover(ctx.organizationId, approvalRequestId, {
      approverMemberId: newApproverMemberId,
      contextSnapshotJson: nextSnapshot,
    });
    if (!updated) throw new Error('CONFLICT');

    return this.emit(
      ctx,
      store,
      'approval.escalated',
      'approval_request',
      approvalRequestId,
      {
        approvalRequestId,
        subjectType: approval.subjectType,
        subjectId: approval.subjectId,
        fromApproverMemberId: priorApproverMemberId,
        toApproverMemberId: newApproverMemberId,
        escalatedByMemberId: ctx.actorMemberId,
        ...(reason ? { reason } : {}),
      },
      'approval.escalated',
      { approverMemberId: priorApproverMemberId, status: 'pending' },
      { approverMemberId: newApproverMemberId, status: 'pending' },
    );
  }
}
