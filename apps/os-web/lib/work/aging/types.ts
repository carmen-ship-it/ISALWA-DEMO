/**
 * Derived facts. Not stored attention rows and not attention types.
 * A fact exists only while its condition holds.
 */
export const AGING_FACT_KINDS = [
  'due_today',
  'elapsed_due',
  'approval_pending',
  'quote_submitted',
] as const;

export type AgingFactKind = (typeof AGING_FACT_KINDS)[number];

export type AgingFact = {
  /** Stable while the condition holds. Not a stored attention key and not a work command. */
  key: string;
  kind: AgingFactKind;
  /** Same issue across places, when the source is already a known resource. */
  issueId: string | null;
  subject: string;
  /** Spanish factual line. No score and no reminder threshold. */
  label: string;
  href: string | null;
  /** Stored instant used only for display order. */
  sortAt: string | null;
};

export type WorkAgingInput = {
  workItemId: string;
  title: string;
  status: string;
  dueAt: string | null;
};

export type ApprovalAgingSource = {
  approvalRequestId: string;
  status: string;
  /** Stored request instant. Absent means no age can be stated. */
  requestedAt: string | null;
  subject: string;
};

/**
 * Already-loaded commitment facts from another lane.
 * This module does not own a commitment store and does not create one.
 * A set resolvedAt means the condition has ended.
 */
export type CommitmentAgingRecord = {
  commitmentId: string;
  label: string;
  dueAt: string | null;
  resolvedAt: string | null;
  href?: string | null;
};

export interface CommitmentAgingAdapter {
  list(): readonly CommitmentAgingRecord[];
}
