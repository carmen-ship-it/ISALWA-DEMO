import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  ApprovalRequestRecord,
  IdempotencyRecord,
  MemberRecord,
  CommercialApprovalSubjectRecord,
  OwnershipHistoryRecord,
  RoleAssignmentRecord,
  DelegationRecord,
  WorkItemRecord,
} from './store-types';

export interface OsWorkStore {
  runInTransaction<T>(fn: (store: OsWorkStore) => Promise<T>): Promise<T>;

  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]>;

  partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean>;
  getQuoteApprovalSubject(
    organizationId: string,
    quoteId: string,
  ): Promise<CommercialApprovalSubjectRecord | null>;
  getOrderApprovalSubject(
    organizationId: string,
    orderId: string,
  ): Promise<CommercialApprovalSubjectRecord | null>;
  listApprovalsForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<ApprovalRequestRecord[]>;

  insertWorkItem(item: WorkItemRecord): Promise<void>;
  getWorkItemInOrg(organizationId: string, workItemId: string): Promise<WorkItemRecord | null>;
  updateWorkItem(
    workItemId: string,
    patch: Partial<
      Pick<
        WorkItemRecord,
        | 'ownerMemberId'
        | 'status'
        | 'completedAt'
        | 'cancelledAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;
  listOpenWorkItemsForMember(organizationId: string, memberId: string): Promise<WorkItemRecord[]>;

  insertOwnershipHistory(record: OwnershipHistoryRecord): Promise<void>;
  listOwnershipHistory(organizationId: string, workItemId: string): Promise<OwnershipHistoryRecord[]>;

  insertApprovalRequest(request: ApprovalRequestRecord): Promise<void>;
  getApprovalRequest(organizationId: string, approvalRequestId: string): Promise<ApprovalRequestRecord | null>;
  decidePendingApprovalRequest(
    organizationId: string,
    approvalRequestId: string,
    patch: Pick<
      ApprovalRequestRecord,
      'status' | 'decisionByMemberId' | 'decisionReason' | 'decidedAt'
    >,
  ): Promise<boolean>;
  /** Reassign pending approver (explicit escalate). Preserves request id + prior context. */
  reassignPendingApprover(
    organizationId: string,
    approvalRequestId: string,
    patch: {
      approverMemberId: string;
      contextSnapshotJson: Record<string, unknown>;
    },
  ): Promise<boolean>;

  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
}
