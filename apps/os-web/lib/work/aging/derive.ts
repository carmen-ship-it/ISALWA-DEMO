import type { QuoteSummaryReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { quoteHref } from '@/lib/commercial/navigation';
import { approvalHref, workItemHref } from '@/lib/work/navigation';
import { isDueToday, isPastStoredInstant } from '@/lib/work/aging/clock';
import {
  approvalPendingAgeLabel,
  DUE_TODAY_LABEL,
  elapsedDueFactLabel,
  quoteSubmittedAgeLabel,
} from '@/lib/work/aging/labels';
import type {
  AgingFact,
  ApprovalAgingSource,
  CommitmentAgingAdapter,
  CommitmentAgingRecord,
  WorkAgingInput,
} from '@/lib/work/aging/types';

const KIND_ORDER = ['due_today', 'elapsed_due', 'approval_pending', 'quote_submitted'] as const;

export type AgingSources = {
  work?: readonly WorkAgingInput[];
  approvals?: readonly ApprovalAgingSource[];
  quotes?: readonly QuoteSummaryReadModel[];
  commitments?: CommitmentAgingAdapter | null;
  asOf?: Date;
};

export function workAgingInput(work: WorkSummaryReadModel): WorkAgingInput {
  return {
    workItemId: work.workItemId,
    title: work.title,
    status: work.status,
    dueAt: work.dueAt,
  };
}

/**
 * Due-today or elapsed fact for open work. A closed item produces nothing.
 * A past due date does not create a stored overdue row or change the work type.
 */
export function deriveWorkDueFact(work: WorkAgingInput, asOf: Date): AgingFact | null {
  if (work.status !== 'open') return null;
  const workItemId = work.workItemId.trim();
  if (!workItemId || !work.dueAt) return null;

  const subject = work.title.trim() || 'Trabajo pendiente';
  const href = workItemHref(workItemId);

  if (isDueToday(work.dueAt, asOf)) {
    return {
      key: `work:due-today:${workItemId}`,
      kind: 'due_today',
      issueId: `work:${workItemId}`,
      subject,
      label: DUE_TODAY_LABEL,
      href,
      sortAt: work.dueAt,
    };
  }

  if (!isPastStoredInstant(work.dueAt, asOf)) return null;
  const label = elapsedDueFactLabel(work.dueAt, asOf);
  if (!label) return null;
  return {
    key: `work:elapsed:${workItemId}`,
    kind: 'elapsed_due',
    issueId: `work:${workItemId}`,
    subject,
    label,
    href,
    sortAt: work.dueAt,
  };
}

/**
 * Elapsed fact while the approval is still pending and a request instant is stored.
 * A decided approval produces nothing. A missing instant is not invented.
 */
export function deriveApprovalAgingFact(
  approval: ApprovalAgingSource,
  asOf: Date,
): AgingFact | null {
  if (approval.status !== 'pending') return null;
  const approvalRequestId = approval.approvalRequestId.trim();
  if (!approvalRequestId) return null;
  const label = approvalPendingAgeLabel(approval.requestedAt, asOf);
  if (!label) return null;
  const subject = approval.subject.trim() || 'Aprobación pendiente';
  return {
    key: `approval:approver:${approvalRequestId}`,
    kind: 'approval_pending',
    issueId: `approval:${approvalRequestId}`,
    subject,
    label,
    href: approvalHref(approvalRequestId),
    sortAt: approval.requestedAt,
  };
}

/**
 * Elapsed fact for a submitted quote with a stored submission instant.
 * Draft, accepted, and cancelled quotes produce nothing. createdAt is not a submission.
 */
export function deriveQuoteElapsedFact(
  quote: QuoteSummaryReadModel,
  asOf: Date,
): AgingFact | null {
  if (quote.status !== 'submitted') return null;
  const quoteId = quote.quoteId.trim();
  if (!quoteId) return null;
  const label = quoteSubmittedAgeLabel(quote.submittedAt, asOf);
  if (!label) return null;
  const partyId = quote.partyId.trim();
  return {
    key: `quote:submitted:${quoteId}`,
    kind: 'quote_submitted',
    issueId: `quote:${quoteId}`,
    subject: quote.quoteNumber.trim() || 'Cotización',
    label,
    href: partyId ? quoteHref(partyId, quoteId) : null,
    sortAt: quote.submittedAt,
  };
}

export function deriveCommitmentFacts(
  adapter: CommitmentAgingAdapter | null | undefined,
  asOf: Date,
): AgingFact[] {
  if (!adapter) return [];
  return adapter
    .list()
    .map((record) => deriveCommitmentFact(record, asOf))
    .filter((fact): fact is AgingFact => fact !== null);
}

/**
 * Due-today or elapsed fact for an unresolved commitment with a stored due instant.
 * A resolved record produces nothing. No commitment store is read here.
 */
export function deriveCommitmentFact(
  record: CommitmentAgingRecord,
  asOf: Date,
): AgingFact | null {
  if (hasResolvedAt(record.resolvedAt)) return null;
  const commitmentId = record.commitmentId.trim();
  const subject = record.label.trim();
  if (!commitmentId || !subject || !record.dueAt) return null;

  const href = record.href?.trim() || null;
  if (isDueToday(record.dueAt, asOf)) {
    return {
      key: `commitment:due-today:${commitmentId}`,
      kind: 'due_today',
      issueId: `commitment:${commitmentId}`,
      subject,
      label: DUE_TODAY_LABEL,
      href,
      sortAt: record.dueAt,
    };
  }

  if (!isPastStoredInstant(record.dueAt, asOf)) return null;
  const label = elapsedDueFactLabel(record.dueAt, asOf);
  if (!label) return null;
  return {
    key: `commitment:elapsed:${commitmentId}`,
    kind: 'elapsed_due',
    issueId: `commitment:${commitmentId}`,
    subject,
    label,
    href,
    sortAt: record.dueAt,
  };
}

export function deriveAgingFacts(sources: AgingSources = {}): AgingFact[] {
  const asOf = sources.asOf ?? new Date();
  const facts = [
    ...(sources.work ?? []).map((work) => deriveWorkDueFact(work, asOf)),
    ...(sources.approvals ?? []).map((approval) => deriveApprovalAgingFact(approval, asOf)),
    ...(sources.quotes ?? []).map((quote) => deriveQuoteElapsedFact(quote, asOf)),
    ...deriveCommitmentFacts(sources.commitments, asOf),
  ].filter((fact): fact is AgingFact => fact !== null);
  return sortAgingFacts(facts);
}

export function sortAgingFacts(facts: readonly AgingFact[]): AgingFact[] {
  return [...facts].sort(compareAgingFacts);
}

/**
 * Keys present before and absent after. The missing key is the resolved condition.
 * Does not write a resolution, send a notice, or change a stored row.
 */
export function disappearedAgingKeys(
  before: readonly Pick<AgingFact, 'key'>[],
  after: readonly Pick<AgingFact, 'key'>[],
): string[] {
  const still = new Set(after.map((fact) => fact.key));
  return before
    .map((fact) => fact.key)
    .filter((key) => !still.has(key))
    .sort();
}

function hasResolvedAt(resolvedAt: string | null | undefined): boolean {
  return Boolean(resolvedAt && resolvedAt.trim() !== '');
}

function compareAgingFacts(left: AgingFact, right: AgingFact): number {
  const kind = KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
  if (kind !== 0) return kind;
  const leftAt = left.sortAt ? Date.parse(left.sortAt) : Number.NaN;
  const rightAt = right.sortAt ? Date.parse(right.sortAt) : Number.NaN;
  const leftKnown = !Number.isNaN(leftAt);
  const rightKnown = !Number.isNaN(rightAt);
  if (leftKnown && rightKnown && leftAt !== rightAt) return leftAt - rightAt;
  if (leftKnown && !rightKnown) return -1;
  if (!leftKnown && rightKnown) return 1;
  if (left.key < right.key) return -1;
  if (left.key > right.key) return 1;
  return 0;
}
