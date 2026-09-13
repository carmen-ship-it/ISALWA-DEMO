import type { WorkItemStatus, WorkPriority, WorkSubjectType } from '@isalwa/os-contracts';

export type WorkItemRecord = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkPriority;
  dueAt: Date | null;
  subjectType: WorkSubjectType | null;
  subjectId: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
};

export type OwnershipHistoryRecord = {
  id: string;
  organizationId: string;
  workItemId: string;
  fromMemberId: string | null;
  toMemberId: string;
  changedByMemberId: string;
  reason: string | null;
  changedAt: Date;
};

export type ApprovalRequestRecord = {
  id: string;
  organizationId: string;
  workItemId: string | null;
  subjectType: string;
  subjectId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  status: string;
  contextSnapshotJson: Record<string, unknown>;
  decisionByMemberId: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
};

export type MemberRecord = {
  id: string;
  organizationId: string;
  accessStatus: string;
};

export type RoleAssignmentRecord = {
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type DelegationRecord = {
  delegatorMemberId: string;
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};
