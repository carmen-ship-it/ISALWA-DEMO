import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';

/** Awareness only. These flags are constants, not permissions to act. */
export type EscalationLimits = {
  reassignsOwner: false;
  changesApprover: false;
  grantsAuthority: false;
  transfersAccount: false;
  sendsNotification: false;
  callsProvider: false;
};

export type EscalationStage = 'suggested' | 'overdue' | 'needs_attention' | 'recorded';

export type EscalationRole =
  | 'approver'
  | 'owner'
  | 'attention'
  | 'requester'
  | 'creator'
  | 'manager'
  | 'executive';

export type EscalationMember = {
  memberId: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  managerMemberId?: string | null;
  accessStatus?: string | null;
};

/** Subset of an approval row. No extra fields are required from the contract. */
export type EscalationApprovalFact = {
  approvalRequestId: string;
  subjectType: string;
  subjectId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  status: string;
  workItemId?: string | null;
};

/**
 * Already-loaded commercial links. Omit a field that was not loaded.
 * `ordersLoaded` must be true before this module will mention an order.
 */
export type EscalationChain = {
  quoteId?: string | null;
  quoteStatus?: string | null;
  orderId?: string | null;
  ordersLoaded?: boolean;
  partyId?: string | null;
};

/**
 * Caller-supplied policy. Ignored unless `approved` is true and `source` is non-empty.
 * Hour fields are not part of this type and are not read.
 */
export type EscalationPolicyInput = {
  approved?: boolean;
  source?: string;
  informManagerWhen?: 'already_overdue' | 'pending_approval';
  informExecutiveWhen?: 'caller_marked_prolonged';
  prolongedMarked?: boolean;
  executiveMemberId?: string | null;
};

export type EscalationInput = {
  attention?: AttentionItemReadModel | null;
  work?: WorkSummaryReadModel | null;
  approval?: EscalationApprovalFact | null;
  members?: readonly EscalationMember[];
  chain?: EscalationChain | null;
  /** Explicit stored waiting fact. Absence is not waiting. */
  customerWaiting?: boolean;
  /** Explicit stored awareness fact. Absence is not Escalado. */
  recordedEscalation?: { recorded: true } | null;
  policy?: EscalationPolicyInput | null;
  /** Used only by the existing open-work overdue rule when no attention row is present. */
  asOf?: Date;
};

export type EscalationBlocker = {
  code: 'pending_approval' | 'overdue_work';
  label: string;
  detail: string;
};

export type EscalationImpact = {
  code: 'order_creation' | 'customer_reply';
  label: string;
};

export type RelatedPerson = {
  memberId: string;
  displayName: string;
  role: EscalationRole;
  roleLabel: string;
};

export type EscalationContact = {
  memberId: string;
  displayName: string;
  role: 'approver' | 'owner';
  roleLabel: string;
  line: string;
};

export type AwarenessRung = {
  order: 1 | 2 | 3;
  audience: 'holder' | 'manager' | 'executive';
  title: string;
  detail: string;
  active: boolean;
};

export type InformTarget = {
  memberId: string;
  displayName: string;
  audience: 'manager' | 'executive';
  line: string;
  detail: string;
};

export type EscalationGuidance = {
  issueId: string | null;
  listKey: string;
  stage: EscalationStage | null;
  stageLabel: string | null;
  blockers: EscalationBlocker[];
  mayAffect: EscalationImpact[];
  relatedPeople: RelatedPerson[];
  contact: EscalationContact | null;
  rungs: AwarenessRung[];
  alsoInform: InformTarget[];
  notes: string[];
  awarenessNote: string | null;
  limits: EscalationLimits;
};

export type EscalationLookup = {
  works?: readonly WorkSummaryReadModel[];
  approvals?: readonly EscalationApprovalFact[];
  members?: readonly EscalationMember[];
  chains?: readonly (EscalationChain & { subjectType?: string | null; subjectId?: string | null })[];
  customerWaitingPartyIds?: readonly string[];
  recordedIssueIds?: readonly string[];
  policy?: EscalationPolicyInput | null;
  asOf?: Date;
};
