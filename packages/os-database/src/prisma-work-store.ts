import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsWorkStore } from '@isalwa/os-work';
import type {
  ApprovalRequestRecord,
  DelegationRecord,
  IdempotencyRecord,
  MemberRecord,
  OwnershipHistoryRecord,
  RoleAssignmentRecord,
  WorkItemRecord,
} from '@isalwa/os-work';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';

export class PrismaOsWorkStore implements OsWorkStore {
  private tx?: Prisma.TransactionClient;
  testFailNextAppend = false;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  async runInTransaction<T>(fn: (store: OsWorkStore) => Promise<T>): Promise<T> {
    const failNextAppend = this.testFailNextAppend;
    return this.prisma.$transaction(async (tx) => {
      const scoped = new PrismaOsWorkStore(this.prisma);
      scoped.tx = tx;
      scoped.testFailNextAppend = failNextAppend;
      try {
        return await fn(scoped);
      } finally {
        if (scoped.testFailNextAppend !== failNextAppend) {
          this.testFailNextAppend = scoped.testFailNextAppend;
        }
      }
    });
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const row = await this.db().osOrganizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    return row ? { id: row.id, organizationId: row.organizationId, accessStatus: row.accessStatus } : null;
  }

  async listRoleAssignmentsForMember(memberId: string): Promise<RoleAssignmentRecord[]> {
    const rows = await this.db().osRoleAssignment.findMany({ where: { memberId } });
    return rows.map((r) => ({
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(memberId: string): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({ where: { delegateMemberId: memberId } });
    return rows.map((d) => ({
      delegatorMemberId: d.delegatorMemberId,
      scopes: d.scopesJson as string[],
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
    }));
  }

  async partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean> {
    const row = await this.db().osParty.findFirst({
      where: { id: partyId, organizationId, status: { not: 'merged' } },
    });
    return Boolean(row);
  }

  async insertWorkItem(item: WorkItemRecord): Promise<void> {
    await this.db().osWorkItem.create({
      data: {
        id: item.id,
        organizationId: item.organizationId,
        ownerMemberId: item.ownerMemberId,
        createdByMemberId: item.createdByMemberId,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        dueAt: item.dueAt,
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        completedAt: item.completedAt,
        cancelledAt: item.cancelledAt,
        version: item.version,
      },
    });
  }

  async getWorkItemInOrg(organizationId: string, workItemId: string): Promise<WorkItemRecord | null> {
    const row = await this.db().osWorkItem.findFirst({
      where: { id: workItemId, organizationId },
    });
    return row ? mapWorkItem(row) : null;
  }

  async updateWorkItem(
    workItemId: string,
    patch: Partial<
      Pick<WorkItemRecord, 'ownerMemberId' | 'status' | 'completedAt' | 'cancelledAt' | 'version'>
    >,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osWorkItem.updateMany({
      where: { id: workItemId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async listOpenWorkItemsForMember(organizationId: string, memberId: string): Promise<WorkItemRecord[]> {
    const rows = await this.db().osWorkItem.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'open' },
    });
    return rows.map(mapWorkItem);
  }

  async insertOwnershipHistory(record: OwnershipHistoryRecord): Promise<void> {
    await this.db().osWorkItemOwnershipHistory.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        workItemId: record.workItemId,
        fromMemberId: record.fromMemberId,
        toMemberId: record.toMemberId,
        changedByMemberId: record.changedByMemberId,
        reason: record.reason,
        changedAt: record.changedAt,
      },
    });
  }

  async listOwnershipHistory(organizationId: string, workItemId: string): Promise<OwnershipHistoryRecord[]> {
    const rows = await this.db().osWorkItemOwnershipHistory.findMany({
      where: { organizationId, workItemId },
      orderBy: { changedAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      workItemId: r.workItemId,
      fromMemberId: r.fromMemberId,
      toMemberId: r.toMemberId,
      changedByMemberId: r.changedByMemberId,
      reason: r.reason,
      changedAt: r.changedAt,
    }));
  }

  async insertApprovalRequest(request: ApprovalRequestRecord): Promise<void> {
    await this.db().osApprovalRequest.create({
      data: {
        id: request.id,
        organizationId: request.organizationId,
        workItemId: request.workItemId,
        subjectType: request.subjectType,
        subjectId: request.subjectId,
        requestedByMemberId: request.requestedByMemberId,
        approverMemberId: request.approverMemberId,
        status: request.status,
        contextSnapshotJson: request.contextSnapshotJson as Prisma.InputJsonValue,
        decisionByMemberId: request.decisionByMemberId,
        decisionReason: request.decisionReason,
        decidedAt: request.decidedAt,
      },
    });
  }

  async getApprovalRequest(
    organizationId: string,
    approvalRequestId: string,
  ): Promise<ApprovalRequestRecord | null> {
    const row = await this.db().osApprovalRequest.findFirst({
      where: { id: approvalRequestId, organizationId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          workItemId: row.workItemId,
          subjectType: row.subjectType,
          subjectId: row.subjectId,
          requestedByMemberId: row.requestedByMemberId,
          approverMemberId: row.approverMemberId,
          status: row.status,
          contextSnapshotJson: row.contextSnapshotJson as Record<string, unknown>,
          decisionByMemberId: row.decisionByMemberId,
          decisionReason: row.decisionReason,
          decidedAt: row.decidedAt,
        }
      : null;
  }

  async decidePendingApprovalRequest(
    organizationId: string,
    approvalRequestId: string,
    patch: Pick<
      ApprovalRequestRecord,
      'status' | 'decisionByMemberId' | 'decisionReason' | 'decidedAt'
    >,
  ): Promise<boolean> {
    const result = await this.db().osApprovalRequest.updateMany({
      where: { id: approvalRequestId, organizationId, status: 'pending' },
      data: patch,
    });
    return result.count === 1;
  }

  private async runBatch(ops: Array<Prisma.PrismaPromise<unknown>>): Promise<void> {
    if (this.tx) {
      for (const op of ops) await op;
      return;
    }
    await this.prisma.$transaction(ops);
  }

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    if (this.testFailNextAppend) {
      this.testFailNextAppend = false;
      throw new Error('OUTBOX_APPEND_FAILED');
    }
    await this.runBatch([
      this.db().osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          actorMemberId: event.actorMemberId,
          authorizationContext: event.authorizationContext as Prisma.InputJsonValue | undefined,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          payloadJson: (event.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          provenance: event.provenance ?? 'command',
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          dataOrigin: event.dataOrigin ?? 'production',
          capabilityKey: event.capabilityKey,
        },
      }),
      this.db().osOutboxMessage.create({
        data: {
          id: outbox.id,
          organizationId: outbox.organizationId,
          eventId: outbox.eventId,
          payloadJson: outbox.payloadJson as Prisma.InputJsonValue,
          status: outbox.status,
          attemptCount: outbox.attemptCount,
          nextAttemptAt: outbox.nextAttemptAt,
          lastError: outbox.lastError,
          createdAt: outbox.createdAt,
          publishedAt: outbox.publishedAt,
        },
      }),
      this.db().osAuditLog.create({
        data: {
          id: audit.id,
          organizationId: audit.organizationId,
          actorMemberId: audit.actorMemberId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          beforeJson: (audit.beforeJson ?? undefined) as Prisma.InputJsonValue | undefined,
          afterJson: (audit.afterJson ?? undefined) as Prisma.InputJsonValue | undefined,
          correlationId: audit.correlationId,
          createdAt: audit.createdAt,
        },
      }),
    ]);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.db().osIdempotencyKey.findFirst({
      where: { organizationId, key, expiresAt: { gt: new Date() } },
    });
    return row
      ? {
          organizationId: row.organizationId,
          key: row.key,
          commandName: row.commandName,
          resultJson: row.resultJson as Record<string, unknown>,
          expiresAt: row.expiresAt,
        }
      : null;
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    await this.db().osIdempotencyKey.create({
      data: {
        id: record.id ?? createId(),
        organizationId: record.organizationId,
        key: record.key,
        commandName: record.commandName,
        resultJson: record.resultJson as Prisma.InputJsonValue,
        expiresAt: record.expiresAt,
      },
    });
  }
}

function mapWorkItem(row: {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  subjectType: string | null;
  subjectId: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
}): WorkItemRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ownerMemberId: row.ownerMemberId,
    createdByMemberId: row.createdByMemberId,
    title: row.title,
    description: row.description,
    status: row.status as WorkItemRecord['status'],
    priority: row.priority as WorkItemRecord['priority'],
    dueAt: row.dueAt,
    subjectType: row.subjectType as WorkItemRecord['subjectType'],
    subjectId: row.subjectId,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    version: row.version,
  };
}
