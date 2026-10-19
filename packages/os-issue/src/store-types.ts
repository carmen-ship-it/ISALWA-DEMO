import type { DelegatorStanding } from '@isalwa/os-domain';
import type {
  IssueStatus,
  IssueReferenceType,
  IssueJournalType,
  IssueRelationType,
  CorrectionDecision,
  CorrectionField,
  CorrectionSource,
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
  createdByMemberId: string;
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
  organizationId?: string;
  /** Delegator's current standing; without it the delegation confers nothing (F10). */
  delegator?: DelegatorStanding;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};

/** T03 L4: restricted correction record carried by a correction-request issue. */
export type IssueCorrectionRequestRecord = {
  issueId: string;
  organizationId: string;
  partyId: string;
  contactId: string | null;
  locationId: string | null;
  field: CorrectionField;
  proposedValue: string;
  source: CorrectionSource;
  decision: CorrectionDecision | null;
  appliedEventId: string | null;
  decisionReason: string | null;
  decidedByMemberId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
};

export type IssueCorrectionDecisionPatch = Pick<
  IssueCorrectionRequestRecord,
  'decision' | 'appliedEventId' | 'decisionReason' | 'decidedByMemberId' | 'decidedAt'
>;

