import type {
  IssueStatus,
  IssueReferenceType,
  IssueJournalType,
  IssueRelationType,
} from '@isalwa/os-contracts';

export type IssueRecord = {
  id: string;
  organizationId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reportedByMemberId: string;
  ownerMemberId: string | null;
  confirmedCause: string | null;
  resolution: string | null;
  outcome: string | null;
  reportedAt: Date;
  triagedAt: Date | null;
  progressStartedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  version: number;
};

export type IssueReferenceRecord = {
  id: string;
  organizationId: string;
  issueId: string;
  referenceType: IssueReferenceType;
  referenceId: string;
  createdAt: Date;
};

export type IssueJournalEntryRecord = {
  id: string;
  organizationId: string;
  issueId: string;
  entryType: IssueJournalType;
  content: string;
  createdByMemberId: string;
  createdAt: Date;
};

export type IssueWorkLinkRecord = {
  id: string;
  organizationId: string;
  issueId: string;
  workItemId: string;
  linkedByMemberId: string;
  linkedAt: Date;
};

export type IssueRelationRecord = {
  id: string;
  organizationId: string;
  issueId: string;
  relatedIssueId: string;
  relationType: IssueRelationType;
  createdByMemberId: string;
  createdAt: Date;
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
