/**
 * Internal commitment. Not a payment, a work item, or an attention row.
 * Open commitments show pending, due today, or overdue from the Bolivia calendar day.
 * Fulfilled and cancelled stay as they were recorded. A suggestion is not a commitment.
 */

import { z } from 'zod';

/** Existing company calendar. Not an SLA and not a new deadline rule. */
export const COMMITMENT_CALENDAR_ZONE = 'America/La_Paz';

export const COMMITMENT_LIFECYCLES = ['open', 'fulfilled', 'cancelled'] as const;
export type CommitmentLifecycle = (typeof COMMITMENT_LIFECYCLES)[number];

export const COMMITMENT_STATES = ['pending', 'due_today', 'overdue', 'fulfilled', 'cancelled'] as const;
export type CommitmentState = (typeof COMMITMENT_STATES)[number];

export const COMMITMENT_ORIGINS = [
  'employee_entered',
  'human_confirmed_suggestion',
  'customer_reported',
] as const;
export type CommitmentOrigin = (typeof COMMITMENT_ORIGINS)[number];

/** Records that already exist. Not a new subject vocabulary. */
export const COMMITMENT_SUBJECT_TYPES = [
  'party',
  'work_item',
  'quote',
  'order',
  'opportunity',
  'commercial_account',
  'approval_request',
  'issue',
] as const;
export type CommitmentSubjectType = (typeof COMMITMENT_SUBJECT_TYPES)[number];

export const COMMITMENT_PERSISTENCE_BLOCKER = 'schema_not_available' as const;

const IsoDateTime = z.string().datetime();

export const CommitmentRecordSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    partyId: z.string().min(1).nullable(),
    ownerMemberId: z.string().min(1),
    text: z.string().min(1),
    dueAt: IsoDateTime.nullable(),
    origin: z.enum(COMMITMENT_ORIGINS),
    relatedSubjectType: z.enum(COMMITMENT_SUBJECT_TYPES).nullable(),
    relatedSubjectId: z.string().min(1).nullable(),
    lifecycle: z.enum(COMMITMENT_LIFECYCLES),
    createdByMemberId: z.string().min(1),
    createdAt: IsoDateTime,
    fulfilledAt: IsoDateTime.nullable(),
    cancelledAt: IsoDateTime.nullable(),
    provenanceSuggestionId: z.string().min(1).nullable(),
    canonical: z.literal(true),
  })
  .strict();

export type CommitmentRecord = z.infer<typeof CommitmentRecordSchema>;

export const CommitmentSuggestionSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    proposedText: z.string().min(1),
    proposedDueAt: IsoDateTime.nullable(),
    partyId: z.string().min(1).nullable(),
    sourceExcerpt: z.string().min(1).nullable(),
    canonical: z.literal(false),
  })
  .strict();

export type CommitmentSuggestion = z.infer<typeof CommitmentSuggestionSchema>;

export type CommitmentError =
  | 'id_required'
  | 'organization_required'
  | 'owner_required'
  | 'actor_required'
  | 'text_required'
  | 'invalid_due'
  | 'invalid_time'
  | 'subject_incomplete'
  | 'already_fulfilled'
  | 'already_cancelled';

export type CommitmentResult =
  | { ok: true; commitment: CommitmentRecord }
  | { ok: false; reason: CommitmentError };

function calendarDay(value: string | Date, timeZone = COMMITMENT_CALENDAR_ZONE): string | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isCanonicalCommitment(
  value: CommitmentRecord | CommitmentSuggestion,
): value is CommitmentRecord {
  return value.canonical === true;
}

/** A detected suggestion is not operational truth until a person confirms it. */
export function suggestionIsCommitment(suggestion: CommitmentSuggestion): false {
  return suggestion.canonical;
}

export function deriveCommitmentState(record: CommitmentRecord, asOf: Date): CommitmentState {
  if (record.lifecycle === 'fulfilled') return 'fulfilled';
  if (record.lifecycle === 'cancelled') return 'cancelled';
  if (!record.dueAt) return 'pending';
  const dueDay = calendarDay(record.dueAt);
  const today = calendarDay(asOf);
  if (!dueDay || !today) return 'pending';
  if (dueDay === today) return 'due_today';
  if (dueDay < today) return 'overdue';
  return 'pending';
}

export function commitmentsInOrganization(
  items: readonly CommitmentRecord[],
  organizationId: string,
): CommitmentRecord[] {
  return items.filter((item) => item.organizationId === organizationId);
}

function requiredId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function parseDueAt(value: string | null | undefined): string | null | 'invalid' {
  if (value == null || value.trim() === '') return null;
  const parsed = IsoDateTime.safeParse(value);
  return parsed.success ? parsed.data : 'invalid';
}

function parseSubject(
  type: string | null | undefined,
  id: string | null | undefined,
): { type: CommitmentSubjectType; id: string } | null | 'incomplete' {
  const subjectType = type?.trim() ?? '';
  const subjectId = id?.trim() ?? '';
  if (!subjectType && !subjectId) return null;
  if (!subjectType || !subjectId) return 'incomplete';
  if (!(COMMITMENT_SUBJECT_TYPES as readonly string[]).includes(subjectType)) return 'incomplete';
  return { type: subjectType as CommitmentSubjectType, id: subjectId };
}

export function createEmployeeCommitment(input: {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  text: string;
  dueAt?: string | null;
  partyId?: string | null;
  relatedSubjectType?: string | null;
  relatedSubjectId?: string | null;
  createdAt: string;
}): CommitmentResult {
  return buildCommitment({
    ...input,
    origin: 'employee_entered',
    provenanceSuggestionId: null,
  });
}

export function createCommitmentSuggestion(input: {
  id: string;
  organizationId: string;
  proposedText: string;
  proposedDueAt?: string | null;
  partyId?: string | null;
  sourceExcerpt?: string | null;
}): { ok: true; suggestion: CommitmentSuggestion } | { ok: false; reason: CommitmentError } {
  const id = requiredId(input.id);
  const organizationId = requiredId(input.organizationId);
  const proposedText = input.proposedText.trim();
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!proposedText) return { ok: false, reason: 'text_required' };
  const proposedDueAt = parseDueAt(input.proposedDueAt);
  if (proposedDueAt === 'invalid') return { ok: false, reason: 'invalid_due' };
  const suggestion: CommitmentSuggestion = {
    id,
    organizationId,
    proposedText,
    proposedDueAt,
    partyId: requiredId(input.partyId),
    sourceExcerpt: requiredId(input.sourceExcerpt),
    canonical: false,
  };
  return { ok: true, suggestion };
}

/**
 * Human confirmation is the only path from a suggestion to a commitment.
 * Does not call a model and does not mutate the suggestion.
 */
export function confirmCommitmentSuggestion(
  suggestion: CommitmentSuggestion,
  input: {
    id: string;
    ownerMemberId: string;
    createdByMemberId: string;
    text?: string | null;
    dueAt?: string | null;
    partyId?: string | null;
    relatedSubjectType?: string | null;
    relatedSubjectId?: string | null;
    createdAt: string;
  },
): CommitmentResult {
  if (suggestion.canonical !== false) {
    return { ok: false, reason: 'text_required' };
  }
  return buildCommitment({
    id: input.id,
    organizationId: suggestion.organizationId,
    ownerMemberId: input.ownerMemberId,
    createdByMemberId: input.createdByMemberId,
    text: input.text?.trim() ? input.text : suggestion.proposedText,
    dueAt: input.dueAt === undefined ? suggestion.proposedDueAt : input.dueAt,
    partyId: input.partyId === undefined ? suggestion.partyId : input.partyId,
    relatedSubjectType: input.relatedSubjectType,
    relatedSubjectId: input.relatedSubjectId,
    createdAt: input.createdAt,
    origin: 'human_confirmed_suggestion',
    provenanceSuggestionId: suggestion.id,
  });
}

export function fulfillCommitment(
  record: CommitmentRecord,
  at: string,
): CommitmentResult {
  if (record.lifecycle === 'fulfilled') return { ok: false, reason: 'already_fulfilled' };
  if (record.lifecycle === 'cancelled') return { ok: false, reason: 'already_cancelled' };
  const fulfilledAt = parseDueAt(at);
  if (!fulfilledAt) return { ok: false, reason: 'invalid_time' };
  return {
    ok: true,
    commitment: { ...record, lifecycle: 'fulfilled', fulfilledAt, cancelledAt: null },
  };
}

export function cancelCommitment(record: CommitmentRecord, at: string): CommitmentResult {
  if (record.lifecycle === 'cancelled') return { ok: false, reason: 'already_cancelled' };
  if (record.lifecycle === 'fulfilled') return { ok: false, reason: 'already_fulfilled' };
  const cancelledAt = parseDueAt(at);
  if (!cancelledAt) return { ok: false, reason: 'invalid_time' };
  return {
    ok: true,
    commitment: { ...record, lifecycle: 'cancelled', cancelledAt, fulfilledAt: null },
  };
}

function buildCommitment(input: {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  text: string;
  dueAt?: string | null;
  partyId?: string | null;
  relatedSubjectType?: string | null;
  relatedSubjectId?: string | null;
  createdAt: string;
  origin: CommitmentOrigin;
  provenanceSuggestionId: string | null;
}): CommitmentResult {
  const id = requiredId(input.id);
  const organizationId = requiredId(input.organizationId);
  const ownerMemberId = requiredId(input.ownerMemberId);
  const createdByMemberId = requiredId(input.createdByMemberId);
  const text = input.text.trim();
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!ownerMemberId) return { ok: false, reason: 'owner_required' };
  if (!createdByMemberId) return { ok: false, reason: 'actor_required' };
  if (!text) return { ok: false, reason: 'text_required' };

  const dueAt = parseDueAt(input.dueAt);
  if (dueAt === 'invalid') return { ok: false, reason: 'invalid_due' };
  const createdAt = parseDueAt(input.createdAt);
  if (!createdAt) return { ok: false, reason: 'invalid_time' };

  const subject = parseSubject(input.relatedSubjectType, input.relatedSubjectId);
  if (subject === 'incomplete') return { ok: false, reason: 'subject_incomplete' };

  const commitment: CommitmentRecord = {
    id,
    organizationId,
    partyId: requiredId(input.partyId),
    ownerMemberId,
    text,
    dueAt,
    origin: input.origin,
    relatedSubjectType: subject?.type ?? null,
    relatedSubjectId: subject?.id ?? null,
    lifecycle: 'open',
    createdByMemberId,
    createdAt,
    fulfilledAt: null,
    cancelledAt: null,
    provenanceSuggestionId: input.provenanceSuggestionId,
    canonical: true,
  };
  return { ok: true, commitment };
}

/**
 * Create a commitment from a customer-reported issue or request.
 * Origin is 'customer_reported'. Not employee-entered and not suggestion-confirmed.
 */
export function createCustomerReportedCommitment(input: {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  text: string;
  dueAt?: string | null;
  partyId?: string | null;
  relatedSubjectType?: string | null;
  relatedSubjectId?: string | null;
  createdAt: string;
}): CommitmentResult {
  return buildCommitment({
    ...input,
    origin: 'customer_reported',
    provenanceSuggestionId: null,
  });
}
