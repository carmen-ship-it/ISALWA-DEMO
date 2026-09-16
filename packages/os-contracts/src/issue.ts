/**
 * Issue domain contracts — Wave B Issue Memory Implementation.
 *
 * An Issue is a record of a reported problem requiring resolution.
 * Issue ≠ WorkItem. Issues track customer-reported or internally-observed problems;
 * WorkItems are internal follow-up tasks. An Issue may spawn WorkItems.
 *
 * Truth distinctions:
 * - Possible cause ≠ Confirmed cause (journaling vs confirmation)
 * - Work completed ≠ Issue resolved (completing a linked WorkItem does not auto-resolve)
 * - Issue resolved ≠ Issue closed (resolution is the fix; close is the lifecycle end)
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Status lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_STATUSES = [
  'reported',
  'triaged',
  'in_progress',
  'resolved',
  'closed',
  'reopened',
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/**
 * Allowed state transitions.
 * - reported → triaged
 * - triaged → in_progress
 * - in_progress → resolved
 * - resolved → closed
 * - resolved → reopened (issue recurred before close)
 * - closed → reopened
 * - reopened → in_progress
 */
export const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  reported: ['triaged'],
  triaged: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in_progress'],
} as const;

export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  const allowed = ISSUE_STATUS_TRANSITIONS[from];
  return allowed.includes(to);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference types — entities an issue can reference
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_REFERENCE_TYPES = [
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
] as const;

export type IssueReferenceType = (typeof ISSUE_REFERENCE_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Journal entry types — structured investigation log
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_JOURNAL_TYPES = [
  'observation',
  'attempt',
  'evidence_reference',
  'possible_cause',
] as const;

export type IssueJournalType = (typeof ISSUE_JOURNAL_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Issue relation types — linking related issues
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_RELATION_TYPES = ['related', 'previous_occurrence', 'recurrence_of'] as const;

export type IssueRelationType = (typeof ISSUE_RELATION_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_COMMAND_NAMES = [
  'ReportIssue',
  'TriageIssue',
  'AssignIssueOwner',
  'StartIssueProgress',
  'AddIssueJournalEntry',
  'ConfirmIssueCause',
  'LinkIssueWork',
  'ResolveIssue',
  'RecordIssueOutcome',
  'CloseIssue',
  'ReopenIssue',
  'RelateIssues',
] as const;

export type IssueCommandName = (typeof ISSUE_COMMAND_NAMES)[number];

/** Reference to another entity, stored on the issue */
const IssueReferenceSchema = z.object({
  referenceType: z.enum(ISSUE_REFERENCE_TYPES),
  referenceId: z.string().min(1),
});

export type IssueReference = z.infer<typeof IssueReferenceSchema>;

/**
 * ReportIssue — initial issue creation.
 * Requires member_active (any active member may report an issue).
 */
export const ReportIssuePayloadSchema = z.object({
  description: z.string().min(1),
  title: z.string().min(1).optional(),
  references: z.array(IssueReferenceSchema).optional(),
});

export type ReportIssuePayload = z.infer<typeof ReportIssuePayloadSchema>;

/** TriageIssue — mark issue as triaged after initial assessment */
export const TriageIssuePayloadSchema = z.object({
  issueId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type TriageIssuePayload = z.infer<typeof TriageIssuePayloadSchema>;

/** AssignIssueOwner — assign or change the issue owner */
export const AssignIssueOwnerPayloadSchema = z.object({
  issueId: z.string().min(1),
  ownerMemberId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type AssignIssueOwnerPayload = z.infer<typeof AssignIssueOwnerPayloadSchema>;

/** StartIssueProgress — transition issue to in_progress */
export const StartIssueProgressPayloadSchema = z.object({
  issueId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type StartIssueProgressPayload = z.infer<typeof StartIssueProgressPayloadSchema>;

/** AddIssueJournalEntry — add an investigation/progress note */
export const AddIssueJournalEntryPayloadSchema = z.object({
  issueId: z.string().min(1),
  entryType: z.enum(ISSUE_JOURNAL_TYPES),
  content: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type AddIssueJournalEntryPayload = z.infer<typeof AddIssueJournalEntryPayloadSchema>;

/** ConfirmIssueCause — confirm the root cause after investigation */
export const ConfirmIssueCausePayloadSchema = z.object({
  issueId: z.string().min(1),
  confirmedCause: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type ConfirmIssueCausePayload = z.infer<typeof ConfirmIssueCausePayloadSchema>;

/** LinkIssueWork — link a WorkItem to the issue */
export const LinkIssueWorkPayloadSchema = z.object({
  issueId: z.string().min(1),
  workItemId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type LinkIssueWorkPayload = z.infer<typeof LinkIssueWorkPayloadSchema>;

/** ResolveIssue — mark issue as resolved with resolution description */
export const ResolveIssuePayloadSchema = z.object({
  issueId: z.string().min(1),
  resolution: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type ResolveIssuePayload = z.infer<typeof ResolveIssuePayloadSchema>;

/** RecordIssueOutcome — record the final outcome (after resolution) */
export const RecordIssueOutcomePayloadSchema = z.object({
  issueId: z.string().min(1),
  outcome: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type RecordIssueOutcomePayload = z.infer<typeof RecordIssueOutcomePayloadSchema>;

/** CloseIssue — close the resolved issue */
export const CloseIssuePayloadSchema = z.object({
  issueId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type CloseIssuePayload = z.infer<typeof CloseIssuePayloadSchema>;

/** ReopenIssue — reopen a closed or resolved issue */
export const ReopenIssuePayloadSchema = z.object({
  issueId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
});

export type ReopenIssuePayload = z.infer<typeof ReopenIssuePayloadSchema>;

/** RelateIssues — link two issues together */
export const RelateIssuesPayloadSchema = z.object({
  issueId: z.string().min(1),
  relatedIssueId: z.string().min(1),
  relationType: z.enum(ISSUE_RELATION_TYPES),
  expectedVersion: z.number().int().nonnegative(),
});

export type RelateIssuesPayload = z.infer<typeof RelateIssuesPayloadSchema>;

export const ISSUE_COMMAND_PAYLOAD_SCHEMAS: Record<IssueCommandName, z.ZodTypeAny> = {
  ReportIssue: ReportIssuePayloadSchema,
  TriageIssue: TriageIssuePayloadSchema,
  AssignIssueOwner: AssignIssueOwnerPayloadSchema,
  StartIssueProgress: StartIssueProgressPayloadSchema,
  AddIssueJournalEntry: AddIssueJournalEntryPayloadSchema,
  ConfirmIssueCause: ConfirmIssueCausePayloadSchema,
  LinkIssueWork: LinkIssueWorkPayloadSchema,
  ResolveIssue: ResolveIssuePayloadSchema,
  RecordIssueOutcome: RecordIssueOutcomePayloadSchema,
  CloseIssue: CloseIssuePayloadSchema,
  ReopenIssue: ReopenIssuePayloadSchema,
  RelateIssues: RelateIssuesPayloadSchema,
};

// ─────────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_EVENT_TYPES = [
  'issue.reported',
  'issue.triaged',
  'issue.owner_changed',
  'issue.journal_added',
  'issue.cause_confirmed',
  'issue.work_linked',
  'issue.resolved',
  'issue.outcome_recorded',
  'issue.closed',
  'issue.reopened',
  'issue.related',
] as const;

export type IssueEventType = (typeof ISSUE_EVENT_TYPES)[number];

export function isIssueEventType(value: string): value is IssueEventType {
  return (ISSUE_EVENT_TYPES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scopes
// ─────────────────────────────────────────────────────────────────────────────

// ISSUE_MANAGE_SCOPE is exported from operations-scopes.ts to avoid duplication.
// Required for triage, assign owner, confirm cause, resolve, close, reopen, and relate.
// ReportIssue uses member_active (documented per command).

// ─────────────────────────────────────────────────────────────────────────────
// Truth distinctions — enforced invariants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An Issue is NOT a WorkItem.
 * Issues record reported problems. WorkItems are follow-up tasks.
 * This type-level distinction prevents accidental conflation.
 */
export function issueIsNotWorkItem(issueId: string, workItemId: string): boolean {
  // By convention, IDs are prefixed or distinct. This assertion documents the distinction.
  return issueId !== workItemId;
}

/**
 * A possible cause (journal entry) is NOT a confirmed cause.
 * Journal entries of type 'possible_cause' are hypotheses.
 * Only ConfirmIssueCause establishes operational truth.
 */
export function possibleCauseIsNotConfirmed(entryType: IssueJournalType): boolean {
  return entryType === 'possible_cause';
}

/**
 * Completing linked work does NOT automatically resolve the issue.
 * A WorkItem may be completed, but the Issue remains until explicitly resolved.
 */
export function workCompletedDoesNotResolveIssue(
  workItemStatus: 'open' | 'completed' | 'cancelled',
  issueStatus: IssueStatus,
): boolean {
  // Even if work is completed, the issue status is independent
  return workItemStatus === 'completed' && issueStatus !== 'resolved';
}

/**
 * Issue resolved does NOT mean Issue closed.
 * Resolved means the fix is applied. Closed means lifecycle end.
 */
export function resolvedIsNotClosed(status: IssueStatus): boolean {
  return status === 'resolved';
}
