import type {
  CommitmentLifecycle,
  CommitmentOrigin,
  CommitmentSubjectType,
} from '@isalwa/os-contracts';

/**
 * Commitment record as stored in the database (OsCommitment table).
 * lifecycle is one of open, fulfilled, or cancelled.
 * State (pending, due_today, overdue) is derived at read time from dueAt and the Bolivia calendar day.
 */
export type CommitmentDatabaseRecord = {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: Date | null;
  origin: CommitmentOrigin;
  relatedSubjectType: CommitmentSubjectType | null;
  relatedSubjectId: string | null;
  lifecycle: CommitmentLifecycle;
  createdByMemberId: string;
  createdAt: Date;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  provenanceSuggestionId: string | null;
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
