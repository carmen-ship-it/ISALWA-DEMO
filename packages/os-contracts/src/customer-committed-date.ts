/**
 * Two recorded dates. Do not collapse them.
 *
 * Fecha con el cliente: the sales advisor coordinates it with the customer.
 * Production knows that date. Revisions keep the original date and reason,
 * and each change keeps actor, source, and timestamp.
 *
 * Fecha interna de producción: Production maintains its own target.
 * It has a separate history. It is never copied from the customer date.
 *
 * An explicit production issue may set mayAffectProductionCalendar and
 * mayAffectCustomerDate. Those flags are human facts, not a prediction.
 * "Conviene avisar al cliente" reaches the assigned comercial and authorized
 * gerencia only when a customer date exists, an issue says it may affect
 * that date, and the customer has not been informed about that issue.
 * Whether the customer was informed is a separate record.
 * A missed date alone does not warn. Divergence is visible to gerencia
 * only when both dates exist as recorded facts.
 *
 * CROSS_LANE_CHANGE_REQUEST: export this file from
 * packages/os-contracts/src/index.ts. Do not register it as a work
 * attention type, a notification kind, or a model trigger.
 */

import { z } from 'zod';
import { COMMERCIAL_ORG_READ_SCOPE } from './scopes';

export const CUSTOMER_COMMITTED_DATE_LABEL = 'Fecha con el cliente' as const;
export const PRODUCTION_INTERNAL_TARGET_LABEL = 'Fecha interna de producción' as const;
export const CUSTOMER_DATE_RISK_FLAG_LABEL = 'Puede afectar la fecha del cliente' as const;
export const PRODUCTION_CALENDAR_RISK_FLAG_LABEL = 'Puede afectar el calendario de producción' as const;
export const CUSTOMER_DATE_EARLY_WARNING_LABEL = 'Conviene avisar al cliente' as const;
export const CUSTOMER_INFORMED_LABEL = 'Cliente informado' as const;
export const CUSTOMER_NOT_INFORMED_LABEL = 'Cliente no informado' as const;

export const CUSTOMER_DATE_CALENDAR_ZONE = 'America/La_Paz' as const;
export const CUSTOMER_DATE_SOURCE = 'sales_customer_coordination' as const;
export const PRODUCTION_DATE_SOURCE = 'production_internal' as const;
export const PRODUCTION_ISSUE_SOURCE = 'human_explicit' as const;
export const CUSTOMER_DATE_MANAGEMENT_SCOPE = COMMERCIAL_ORG_READ_SCOPE;
export const CUSTOMER_DATE_SCHEMA_STATUS = 'composed' as const;

export const CUSTOMER_DATE_SUBJECT_TYPES = ['order', 'quote', 'opportunity'] as const;
export type CustomerDateSubjectType = (typeof CUSTOMER_DATE_SUBJECT_TYPES)[number];

export const CUSTOMER_NOTIFIED_STATES = ['informed', 'not_informed'] as const;
export type CustomerNotifiedState = (typeof CUSTOMER_NOTIFIED_STATES)[number];

export const CUSTOMER_DATE_ATTENTION_AUDIENCES = ['comercial', 'gerencia'] as const;
export type CustomerDateAttentionAudience = (typeof CUSTOMER_DATE_ATTENTION_AUDIENCES)[number];

const IsoDateTime = z.string().datetime();

const AI_SOURCES = new Set(['ai', 'model', 'llm', 'prediction', 'predicted']);

const COLLAPSE_ON_CUSTOMER = [
  'targetOn',
  'productionInternalTargetOn',
  'productionInternalTargetDate',
  'productionDate',
  'copiedFromProductionDate',
] as const;

const COLLAPSE_ON_PRODUCTION = [
  'committedOn',
  'customerCommittedOn',
  'customerCommittedDate',
  'originalCommittedOn',
  'copiedFromCustomerDate',
  'copiedFromCustomerCommittedDate',
  'fromCustomerDate',
] as const;

const PREDICTION_KEYS = ['predictedDelay', 'delayProbability', 'predictedAt'] as const;

export type CustomerDateError =
  | 'id_required'
  | 'organization_required'
  | 'owner_required'
  | 'actor_required'
  | 'subject_incomplete'
  | 'date_required'
  | 'invalid_date'
  | 'reason_required'
  | 'invalid_time'
  | 'not_owner'
  | 'not_maintainer'
  | 'date_unchanged'
  | 'note_required'
  | 'issue_required'
  | 'flags_required'
  | 'dates_are_independent'
  | 'do_not_copy_customer_date'
  | 'ai_not_a_trigger'
  | 'predicted_delay'
  | 'unrecognized_field';

export type CustomerCommittedDate = {
  id: string;
  organizationId: string;
  subjectType: CustomerDateSubjectType;
  subjectId: string;
  partyId: string | null;
  commercialOwnerMemberId: string;
  committedOn: string;
  originalCommittedOn: string;
  originalReason: string;
  source: typeof CUSTOMER_DATE_SOURCE;
  setByMemberId: string;
  setAt: string;
  canonical: true;
};

export type CustomerCommittedDateRevision = {
  id: string;
  committedDateId: string;
  organizationId: string;
  previousCommittedOn: string;
  nextCommittedOn: string;
  reason: string;
  actorMemberId: string;
  source: typeof CUSTOMER_DATE_SOURCE;
  revisedAt: string;
};

export type ProductionInternalTargetDate = {
  id: string;
  organizationId: string;
  subjectType: CustomerDateSubjectType;
  subjectId: string;
  maintainedByMemberId: string;
  targetOn: string;
  originalTargetOn: string;
  originalReason: string;
  source: typeof PRODUCTION_DATE_SOURCE;
  setByMemberId: string;
  setAt: string;
  canonical: true;
};

export type ProductionInternalTargetRevision = {
  id: string;
  targetDateId: string;
  organizationId: string;
  previousTargetOn: string;
  nextTargetOn: string;
  reason: string;
  actorMemberId: string;
  source: typeof PRODUCTION_DATE_SOURCE;
  revisedAt: string;
};

export type ProductionIssue = {
  id: string;
  organizationId: string;
  subjectType: CustomerDateSubjectType;
  subjectId: string;
  mayAffectProductionCalendar: boolean;
  mayAffectCustomerDate: boolean;
  source: typeof PRODUCTION_ISSUE_SOURCE;
  note: string | null;
  recordedByMemberId: string;
  recordedAt: string;
};

export type CustomerInformedRecord = {
  id: string;
  issueId: string;
  organizationId: string;
  subjectType: CustomerDateSubjectType;
  subjectId: string;
  note: string;
  recordedByMemberId: string;
  recordedAt: string;
  notified: true;
};

export type CustomerDateViewer = {
  memberId: string;
  organizationId: string;
  grantedScopes: readonly string[];
};

export type CustomerDateEarlyWarning = {
  label: typeof CUSTOMER_DATE_EARLY_WARNING_LABEL;
  committedDateId: string;
  organizationId: string;
  commercialOwnerMemberId: string;
  openIssueIds: string[];
  predictsDelay: false;
};

export type CustomerDateAttentionItem = {
  attentionKey: string;
  organizationId: string;
  memberId: string;
  audience: CustomerDateAttentionAudience;
  label: typeof CUSTOMER_DATE_EARLY_WARNING_LABEL;
  committedDateId: string;
  issueId: string;
  subjectType: CustomerDateSubjectType;
  subjectId: string;
  commercialOwnerMemberId: string;
  predictsDelay: false;
};

export type RecordedDateDivergence = {
  customerCommittedOn: string;
  productionInternalTargetOn: string;
  diverges: boolean;
  visibleBecause: 'both_dates_recorded';
};

export type CustomerDateResult<T> = { ok: true; value: T } | { ok: false; reason: CustomerDateError };

/** The two dates are recorded separately. Neither is derived from the other. */
export function customerDateHasSeparateProductionTarget(): true {
  return true;
}

export function customerDatePredictsDelay(): false {
  return false;
}

export function issueTriggerIsAi(): false {
  return false;
}

export function customerDateAttentionKey(committedDateId: string, issueId: string): string {
  return `customer-date:${committedDateId.trim()}:issue:${issueId.trim()}`;
}

function requiredText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function parseCalendarDate(value: string | null | undefined): string | null | 'invalid' {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return isRealCalendarDate(trimmed) ? trimmed : 'invalid';
}

function parseInstant(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const parsed = IsoDateTime.safeParse(trimmed);
  return parsed.success ? parsed.data : null;
}

function parseSubject(type: string | null | undefined, id: string | null | undefined): CustomerDateSubjectType | 'incomplete' {
  const subjectType = requiredText(type);
  const subjectId = requiredText(id);
  if (!subjectType || !subjectId) return 'incomplete';
  if (!(CUSTOMER_DATE_SUBJECT_TYPES as readonly string[]).includes(subjectType)) return 'incomplete';
  return subjectType as CustomerDateSubjectType;
}

function hasKey(input: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function collapseReason(input: object, keys: readonly string[], reason: CustomerDateError): CustomerDateError | null {
  for (const key of keys) {
    if (hasKey(input, key)) return reason;
  }
  return null;
}

function predictionReason(input: object): CustomerDateError | null {
  for (const key of PREDICTION_KEYS) {
    if (hasKey(input, key)) return 'predicted_delay';
  }
  if (hasKey(input, 'source')) {
    const source = (input as { source?: unknown }).source;
    if (typeof source === 'string' && AI_SOURCES.has(source.trim().toLowerCase())) return 'ai_not_a_trigger';
  }
  return null;
}

function extraKey(input: object, allowed: readonly string[]): CustomerDateError | null {
  const allowedSet = new Set<string>(allowed);
  for (const key of Object.keys(input)) {
    if (!allowedSet.has(key)) return 'unrecognized_field';
  }
  return null;
}

export function establishCustomerCommittedDate(input: {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  partyId?: string | null;
  commercialOwnerMemberId: string;
  committedOn: string;
  reason: string;
  setByMemberId: string;
  setAt: string;
  source?: string;
}): CustomerDateResult<CustomerCommittedDate> {
  const collapsed = collapseReason(input, COLLAPSE_ON_CUSTOMER, 'dates_are_independent');
  if (collapsed) return { ok: false, reason: collapsed };
  const predicted = predictionReason(input);
  if (predicted) return { ok: false, reason: predicted };
  const extra = extraKey(input, [
    'id',
    'organizationId',
    'subjectType',
    'subjectId',
    'partyId',
    'commercialOwnerMemberId',
    'committedOn',
    'reason',
    'setByMemberId',
    'setAt',
    'source',
  ]);
  if (extra) return { ok: false, reason: extra };
  if (input.source != null && input.source !== CUSTOMER_DATE_SOURCE) {
    return { ok: false, reason: 'unrecognized_field' };
  }

  const id = requiredText(input.id);
  const organizationId = requiredText(input.organizationId);
  const commercialOwnerMemberId = requiredText(input.commercialOwnerMemberId);
  const setByMemberId = requiredText(input.setByMemberId);
  const reason = requiredText(input.reason);
  const subjectType = parseSubject(input.subjectType, input.subjectId);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!commercialOwnerMemberId) return { ok: false, reason: 'owner_required' };
  if (!setByMemberId) return { ok: false, reason: 'actor_required' };
  if (subjectType === 'incomplete') return { ok: false, reason: 'subject_incomplete' };
  if (setByMemberId !== commercialOwnerMemberId) return { ok: false, reason: 'not_owner' };
  if (!reason) return { ok: false, reason: 'reason_required' };

  const committedOn = parseCalendarDate(input.committedOn);
  if (!committedOn) return { ok: false, reason: 'date_required' };
  if (committedOn === 'invalid') return { ok: false, reason: 'invalid_date' };
  const setAt = parseInstant(input.setAt);
  if (!setAt) return { ok: false, reason: 'invalid_time' };

  return {
    ok: true,
    value: {
      id,
      organizationId,
      subjectType,
      subjectId: requiredText(input.subjectId) ?? '',
      partyId: requiredText(input.partyId ?? null),
      commercialOwnerMemberId,
      committedOn,
      originalCommittedOn: committedOn,
      originalReason: reason,
      source: CUSTOMER_DATE_SOURCE,
      setByMemberId,
      setAt,
      canonical: true,
    },
  };
}

/**
 * Changes the current customer date only. Original date and reason stay.
 * The previous date, actor, source, and timestamp are appended.
 */
export function reviseCustomerCommittedDate(
  current: CustomerCommittedDate,
  history: readonly CustomerCommittedDateRevision[],
  input: {
    id: string;
    nextCommittedOn: string;
    reason: string;
    actorMemberId: string;
    revisedAt: string;
    source?: string;
  },
): CustomerDateResult<{ date: CustomerCommittedDate; revisions: CustomerCommittedDateRevision[] }> {
  const collapsed = collapseReason(input, COLLAPSE_ON_CUSTOMER, 'dates_are_independent');
  if (collapsed) return { ok: false, reason: collapsed };
  const predicted = predictionReason(input);
  if (predicted) return { ok: false, reason: predicted };
  const extra = extraKey(input, ['id', 'nextCommittedOn', 'reason', 'actorMemberId', 'revisedAt', 'source']);
  if (extra) return { ok: false, reason: extra };
  if (input.source != null && input.source !== CUSTOMER_DATE_SOURCE) {
    return { ok: false, reason: 'unrecognized_field' };
  }

  const id = requiredText(input.id);
  const actorMemberId = requiredText(input.actorMemberId);
  const reason = requiredText(input.reason);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!actorMemberId) return { ok: false, reason: 'actor_required' };
  if (actorMemberId !== current.commercialOwnerMemberId) return { ok: false, reason: 'not_owner' };
  if (!reason) return { ok: false, reason: 'reason_required' };

  const nextCommittedOn = parseCalendarDate(input.nextCommittedOn);
  if (!nextCommittedOn) return { ok: false, reason: 'date_required' };
  if (nextCommittedOn === 'invalid') return { ok: false, reason: 'invalid_date' };
  if (nextCommittedOn === current.committedOn) return { ok: false, reason: 'date_unchanged' };
  const revisedAt = parseInstant(input.revisedAt);
  if (!revisedAt) return { ok: false, reason: 'invalid_time' };

  const revision: CustomerCommittedDateRevision = {
    id,
    committedDateId: current.id,
    organizationId: current.organizationId,
    previousCommittedOn: current.committedOn,
    nextCommittedOn,
    reason,
    actorMemberId,
    source: CUSTOMER_DATE_SOURCE,
    revisedAt,
  };
  return {
    ok: true,
    value: {
      date: {
        ...current,
        committedOn: nextCommittedOn,
        originalCommittedOn: current.originalCommittedOn,
        originalReason: current.originalReason,
        source: CUSTOMER_DATE_SOURCE,
      },
      revisions: [...history, revision],
    },
  };
}

/** Production enters its own target. This does not read or copy the customer date. */
export function establishProductionInternalTargetDate(input: {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  maintainedByMemberId: string;
  targetOn: string;
  reason: string;
  setByMemberId: string;
  setAt: string;
  source?: string;
}): CustomerDateResult<ProductionInternalTargetDate> {
  const collapsed = collapseReason(input, COLLAPSE_ON_PRODUCTION, 'do_not_copy_customer_date');
  if (collapsed) return { ok: false, reason: collapsed };
  const predicted = predictionReason(input);
  if (predicted) return { ok: false, reason: predicted };
  const extra = extraKey(input, [
    'id',
    'organizationId',
    'subjectType',
    'subjectId',
    'maintainedByMemberId',
    'targetOn',
    'reason',
    'setByMemberId',
    'setAt',
    'source',
  ]);
  if (extra) return { ok: false, reason: extra };
  if (input.source != null && input.source !== PRODUCTION_DATE_SOURCE) {
    return { ok: false, reason: 'unrecognized_field' };
  }

  const id = requiredText(input.id);
  const organizationId = requiredText(input.organizationId);
  const maintainedByMemberId = requiredText(input.maintainedByMemberId);
  const setByMemberId = requiredText(input.setByMemberId);
  const reason = requiredText(input.reason);
  const subjectType = parseSubject(input.subjectType, input.subjectId);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!maintainedByMemberId) return { ok: false, reason: 'owner_required' };
  if (!setByMemberId) return { ok: false, reason: 'actor_required' };
  if (subjectType === 'incomplete') return { ok: false, reason: 'subject_incomplete' };
  if (setByMemberId !== maintainedByMemberId) return { ok: false, reason: 'not_maintainer' };
  if (!reason) return { ok: false, reason: 'reason_required' };

  const targetOn = parseCalendarDate(input.targetOn);
  if (!targetOn) return { ok: false, reason: 'date_required' };
  if (targetOn === 'invalid') return { ok: false, reason: 'invalid_date' };
  const setAt = parseInstant(input.setAt);
  if (!setAt) return { ok: false, reason: 'invalid_time' };

  return {
    ok: true,
    value: {
      id,
      organizationId,
      subjectType,
      subjectId: requiredText(input.subjectId) ?? '',
      maintainedByMemberId,
      targetOn,
      originalTargetOn: targetOn,
      originalReason: reason,
      source: PRODUCTION_DATE_SOURCE,
      setByMemberId,
      setAt,
      canonical: true,
    },
  };
}

export function reviseProductionInternalTargetDate(
  current: ProductionInternalTargetDate,
  history: readonly ProductionInternalTargetRevision[],
  input: {
    id: string;
    nextTargetOn: string;
    reason: string;
    actorMemberId: string;
    revisedAt: string;
    source?: string;
  },
): CustomerDateResult<{ date: ProductionInternalTargetDate; revisions: ProductionInternalTargetRevision[] }> {
  const collapsed = collapseReason(input, COLLAPSE_ON_PRODUCTION, 'do_not_copy_customer_date');
  if (collapsed) return { ok: false, reason: collapsed };
  const predicted = predictionReason(input);
  if (predicted) return { ok: false, reason: predicted };
  const extra = extraKey(input, ['id', 'nextTargetOn', 'reason', 'actorMemberId', 'revisedAt', 'source']);
  if (extra) return { ok: false, reason: extra };
  if (input.source != null && input.source !== PRODUCTION_DATE_SOURCE) {
    return { ok: false, reason: 'unrecognized_field' };
  }

  const id = requiredText(input.id);
  const actorMemberId = requiredText(input.actorMemberId);
  const reason = requiredText(input.reason);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!actorMemberId) return { ok: false, reason: 'actor_required' };
  if (actorMemberId !== current.maintainedByMemberId) return { ok: false, reason: 'not_maintainer' };
  if (!reason) return { ok: false, reason: 'reason_required' };

  const nextTargetOn = parseCalendarDate(input.nextTargetOn);
  if (!nextTargetOn) return { ok: false, reason: 'date_required' };
  if (nextTargetOn === 'invalid') return { ok: false, reason: 'invalid_date' };
  if (nextTargetOn === current.targetOn) return { ok: false, reason: 'date_unchanged' };
  const revisedAt = parseInstant(input.revisedAt);
  if (!revisedAt) return { ok: false, reason: 'invalid_time' };

  const revision: ProductionInternalTargetRevision = {
    id,
    targetDateId: current.id,
    organizationId: current.organizationId,
    previousTargetOn: current.targetOn,
    nextTargetOn,
    reason,
    actorMemberId,
    source: PRODUCTION_DATE_SOURCE,
    revisedAt,
  };
  return {
    ok: true,
    value: {
      date: {
        ...current,
        targetOn: nextTargetOn,
        originalTargetOn: current.originalTargetOn,
        originalReason: current.originalReason,
        source: PRODUCTION_DATE_SOURCE,
      },
      revisions: [...history, revision],
    },
  };
}

/** A person records the issue. Flags are explicit. The calendar does not set them. */
export function recordProductionIssue(input: {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  mayAffectProductionCalendar: boolean;
  mayAffectCustomerDate: boolean;
  note?: string | null;
  recordedByMemberId: string;
  recordedAt: string;
  source?: string;
}): CustomerDateResult<ProductionIssue> {
  const predicted = predictionReason(input);
  if (predicted) return { ok: false, reason: predicted };
  const extra = extraKey(input, [
    'id',
    'organizationId',
    'subjectType',
    'subjectId',
    'mayAffectProductionCalendar',
    'mayAffectCustomerDate',
    'note',
    'recordedByMemberId',
    'recordedAt',
    'source',
  ]);
  if (extra) return { ok: false, reason: extra };
  if (input.source != null && input.source !== PRODUCTION_ISSUE_SOURCE) {
    return { ok: false, reason: 'ai_not_a_trigger' };
  }
  if (
    typeof input.mayAffectProductionCalendar !== 'boolean' ||
    typeof input.mayAffectCustomerDate !== 'boolean'
  ) {
    return { ok: false, reason: 'flags_required' };
  }

  const id = requiredText(input.id);
  const organizationId = requiredText(input.organizationId);
  const recordedByMemberId = requiredText(input.recordedByMemberId);
  const subjectType = parseSubject(input.subjectType, input.subjectId);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!recordedByMemberId) return { ok: false, reason: 'actor_required' };
  if (subjectType === 'incomplete') return { ok: false, reason: 'subject_incomplete' };
  const recordedAt = parseInstant(input.recordedAt);
  if (!recordedAt) return { ok: false, reason: 'invalid_time' };

  return {
    ok: true,
    value: {
      id,
      organizationId,
      subjectType,
      subjectId: requiredText(input.subjectId) ?? '',
      mayAffectProductionCalendar: input.mayAffectProductionCalendar,
      mayAffectCustomerDate: input.mayAffectCustomerDate,
      source: PRODUCTION_ISSUE_SOURCE,
      note: requiredText(input.note ?? null),
      recordedByMemberId,
      recordedAt,
    },
  };
}

/**
 * Records that the assigned comercial informed the customer about one issue.
 * Does not change the issue flags and does not change either date.
 */
export function recordCustomerInformed(
  date: CustomerCommittedDate,
  issues: readonly ProductionIssue[],
  input: {
    id: string;
    issueId: string;
    note: string;
    recordedByMemberId: string;
    recordedAt: string;
  },
): CustomerDateResult<CustomerInformedRecord> {
  const extra = extraKey(input, ['id', 'issueId', 'note', 'recordedByMemberId', 'recordedAt']);
  if (extra) return { ok: false, reason: extra };

  const id = requiredText(input.id);
  const issueId = requiredText(input.issueId);
  const note = requiredText(input.note);
  const recordedByMemberId = requiredText(input.recordedByMemberId);
  if (!id) return { ok: false, reason: 'id_required' };
  if (!issueId) return { ok: false, reason: 'issue_required' };
  if (!recordedByMemberId) return { ok: false, reason: 'actor_required' };
  if (recordedByMemberId !== date.commercialOwnerMemberId) return { ok: false, reason: 'not_owner' };
  if (!note) return { ok: false, reason: 'note_required' };
  const recordedAt = parseInstant(input.recordedAt);
  if (!recordedAt) return { ok: false, reason: 'invalid_time' };

  const issue = issues.find(
    (item) =>
      item.id === issueId &&
      item.organizationId === date.organizationId &&
      item.subjectType === date.subjectType &&
      item.subjectId === date.subjectId &&
      item.source === PRODUCTION_ISSUE_SOURCE,
  );
  if (!issue) return { ok: false, reason: 'issue_required' };

  return {
    ok: true,
    value: {
      id,
      issueId: issue.id,
      organizationId: date.organizationId,
      subjectType: date.subjectType,
      subjectId: date.subjectId,
      note,
      recordedByMemberId,
      recordedAt,
      notified: true,
    },
  };
}

/** Separate from the issue flags. An issue does not store whether the customer was told. */
export function customerNotifiedState(
  issueId: string,
  organizationId: string,
  informed: readonly CustomerInformedRecord[],
): CustomerNotifiedState {
  const told = informed.some(
    (item) => item.issueId === issueId && item.organizationId === organizationId && item.notified === true,
  );
  return told ? 'informed' : 'not_informed';
}

export function openCustomerDateIssues(
  date: CustomerCommittedDate,
  issues: readonly ProductionIssue[],
  informed: readonly CustomerInformedRecord[],
): ProductionIssue[] {
  return issues.filter(
    (item) =>
      item.organizationId === date.organizationId &&
      item.subjectType === date.subjectType &&
      item.subjectId === date.subjectId &&
      item.source === PRODUCTION_ISSUE_SOURCE &&
      item.mayAffectCustomerDate === true &&
      customerNotifiedState(item.id, date.organizationId, informed) === 'not_informed',
  );
}

/**
 * Warning only from recorded facts. `observedOn` is not a trigger.
 * A past customer date does not warn. A different production target does not warn.
 * This function does not accept a production date.
 */
export function customerDateEarlyWarning(input: {
  date: CustomerCommittedDate | null;
  issues: readonly ProductionIssue[];
  informed: readonly CustomerInformedRecord[];
  observedOn?: string | null;
}): CustomerDateEarlyWarning | null {
  void input.observedOn;
  if (!input.date) return null;
  const open = openCustomerDateIssues(input.date, input.issues, input.informed);
  if (open.length === 0) return null;
  return {
    label: CUSTOMER_DATE_EARLY_WARNING_LABEL,
    committedDateId: input.date.id,
    organizationId: input.date.organizationId,
    commercialOwnerMemberId: input.date.commercialOwnerMemberId,
    openIssueIds: open.map((item) => item.id),
    predictsDelay: false,
  };
}

export function customerDateAttentionAudience(
  date: CustomerCommittedDate,
  viewer: CustomerDateViewer,
): CustomerDateAttentionAudience | null {
  const memberId = requiredText(viewer.memberId);
  const organizationId = requiredText(viewer.organizationId);
  if (!memberId || !organizationId) return null;
  if (organizationId !== date.organizationId) return null;
  if (memberId === date.commercialOwnerMemberId) return 'comercial';
  if (viewer.grantedScopes.includes(CUSTOMER_DATE_MANAGEMENT_SCOPE)) return 'gerencia';
  return null;
}

export function customerDateAttentionItems(input: {
  date: CustomerCommittedDate | null;
  issues: readonly ProductionIssue[];
  informed: readonly CustomerInformedRecord[];
  viewers: readonly CustomerDateViewer[];
  observedOn?: string | null;
}): CustomerDateAttentionItem[] {
  const warning = customerDateEarlyWarning(input);
  if (!warning || !input.date) return [];

  const items: CustomerDateAttentionItem[] = [];
  const seen = new Set<string>();
  for (const issueId of warning.openIssueIds) {
    for (const viewer of input.viewers) {
      const audience = customerDateAttentionAudience(input.date, viewer);
      if (!audience) continue;
      const memberId = viewer.memberId.trim();
      const key = `${memberId}:${issueId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        attentionKey: customerDateAttentionKey(input.date.id, issueId),
        organizationId: input.date.organizationId,
        memberId,
        audience,
        label: CUSTOMER_DATE_EARLY_WARNING_LABEL,
        committedDateId: input.date.id,
        issueId,
        subjectType: input.date.subjectType,
        subjectId: input.date.subjectId,
        commercialOwnerMemberId: input.date.commercialOwnerMemberId,
        predictsDelay: false,
      });
    }
  }
  return items.sort(
    (left, right) =>
      left.issueId.localeCompare(right.issueId) ||
      left.audience.localeCompare(right.audience) ||
      left.memberId.localeCompare(right.memberId),
  );
}

/** Null unless both dates were recorded for the same subject. A missing date is not a divergence. */
export function recordedDateDivergence(
  customerDate: CustomerCommittedDate | null,
  productionDate: ProductionInternalTargetDate | null,
): RecordedDateDivergence | null {
  if (!customerDate || !productionDate) return null;
  if (customerDate.organizationId !== productionDate.organizationId) return null;
  if (customerDate.subjectType !== productionDate.subjectType) return null;
  if (customerDate.subjectId !== productionDate.subjectId) return null;
  return {
    customerCommittedOn: customerDate.committedOn,
    productionInternalTargetOn: productionDate.targetOn,
    diverges: customerDate.committedOn !== productionDate.targetOn,
    visibleBecause: 'both_dates_recorded',
  };
}

export function managementDateDivergence(
  customerDate: CustomerCommittedDate | null,
  productionDate: ProductionInternalTargetDate | null,
  viewer: CustomerDateViewer,
): RecordedDateDivergence | null {
  const fact = recordedDateDivergence(customerDate, productionDate);
  if (!fact || !customerDate) return null;
  const memberId = requiredText(viewer.memberId);
  const organizationId = requiredText(viewer.organizationId);
  if (!memberId || organizationId !== customerDate.organizationId) return null;
  if (!viewer.grantedScopes.includes(CUSTOMER_DATE_MANAGEMENT_SCOPE)) return null;
  return fact;
}
