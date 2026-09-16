/**
 * Issue domain types for os-web.
 * Consuming contracts from os-contracts via HTTP, not modifying the domain.
 */

import type {
  IssueStatus,
  IssueReferenceType,
  IssueJournalType,
  IssueRelationType,
} from '@isalwa/os-contracts';

export type { IssueStatus, IssueReferenceType, IssueJournalType, IssueRelationType };

// ─────────────────────────────────────────────────────────────────────────────
// Read models
// ─────────────────────────────────────────────────────────────────────────────

export type IssueReference = {
  referenceType: IssueReferenceType;
  referenceId: string;
  /** Resolved display label, may be null if unresolvable */
  label?: string | null;
};

export type IssueJournalEntry = {
  entryId: string;
  entryType: IssueJournalType;
  content: string;
  createdAt: string;
  createdByMemberId: string;
};

export type IssueRelation = {
  relationType: IssueRelationType;
  relatedIssueId: string;
};

export type IssueListItem = {
  issueId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reporterMemberId: string;
  ownerMemberId: string | null;
  createdAt: string;
  references: IssueReference[];
};

export type IssueDetail = {
  issueId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reporterMemberId: string;
  ownerMemberId: string | null;
  confirmedCause: string | null;
  resolution: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  triagedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  references: IssueReference[];
  journal: IssueJournalEntry[];
  linkedWorkItems: string[];
  relations: IssueRelation[];
  version: number;
};

export type IssueListResponse = {
  items: IssueListItem[];
  meta: {
    total?: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  freshness?: string;
};

export type IssueDetailResponse = {
  issue: IssueDetail;
  freshness?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Command results
// ─────────────────────────────────────────────────────────────────────────────

export type IssueCommandResult = {
  ok: boolean;
  data: {
    issueId?: string;
    version?: number;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Context for reporting
// ─────────────────────────────────────────────────────────────────────────────

export type ReportIssueContext = {
  referenceType?: IssueReferenceType;
  referenceId?: string;
  referenceLabel?: string;
};

export function buildIssueContext(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): ReportIssueContext | null {
  const params = searchParams instanceof URLSearchParams
    ? Object.fromEntries(searchParams.entries())
    : searchParams;

  const referenceType = typeof params.issueRefType === 'string' ? params.issueRefType : null;
  const referenceId = typeof params.issueRefId === 'string' ? params.issueRefId : null;
  const referenceLabel = typeof params.issueRefLabel === 'string' ? params.issueRefLabel : null;

  if (!referenceType || !referenceId) return null;

  const validTypes: IssueReferenceType[] = [
    'party',
    'commercial_account',
    'opportunity',
    'quote',
    'order',
    'product',
    'delivery',
    'work_item',
    'approval_request',
    'commitment',
  ];

  if (!validTypes.includes(referenceType as IssueReferenceType)) return null;

  return {
    referenceType: referenceType as IssueReferenceType,
    referenceId,
    referenceLabel: referenceLabel || undefined,
  };
}
