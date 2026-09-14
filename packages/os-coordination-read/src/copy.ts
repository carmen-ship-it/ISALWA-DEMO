/**
 * Empty copy is a coverage statement, not a company conclusion.
 * The strong sentence is forbidden while any required source is unproven or in error.
 */

export const COORDINATION_BOARD_SCOPE = 'management.org.read' as const;
export const COORDINATION_REGISTER_SCOPE = 'coordination.decision.record' as const;

/** Used whenever any required source is UNPROVEN or ERROR, including an omitted source. */
export const COORDINATION_INCOMPLETE_EMPTY_COPY =
  'No hay asuntos detectados en las fuentes conectadas.' as const;

/**
 * Allowed only when every required source category is connected
 * and the projection returns zero actionable facts.
 */
export const COORDINATION_COMPLETE_EMPTY_COPY =
  'No hay asuntos que requieren decisión conjunta.' as const;

/**
 * This projection does not know whether the Tuesday status meeting can be skipped.
 * Do not render a claim that the meeting is unnecessary.
 */
export const MEETING_REPLACEMENT = 'UNPROVEN' as const;

export const REQUIRED_SOURCE_CATEGORIES = [
  'date-risk',
  'production',
  'purchase',
  'release',
  'finished-goods',
  'allocation',
  'warehouse-exit',
  'delivery',
  'customer-informed',
  'prior-decisions',
] as const;

export type CoordinationSourceCategory = (typeof REQUIRED_SOURCE_CATEGORIES)[number];

export const COORDINATION_EXCEPTION_KINDS = [
  'customer_date_risk',
  'production_issue',
  'purchase_pending',
  'commercial_release_exception',
  'finished_goods_awaiting_allocation',
  'allocation_awaiting_warehouse_exit',
  'warehouse_exit_awaiting_delivery',
  'customer_not_informed',
  'overdue_prior_decision',
] as const;

export type CoordinationExceptionKind = (typeof COORDINATION_EXCEPTION_KINDS)[number];

export const EXCEPTION_KIND_FOR_SOURCE = {
  'date-risk': 'customer_date_risk',
  production: 'production_issue',
  purchase: 'purchase_pending',
  release: 'commercial_release_exception',
  'finished-goods': 'finished_goods_awaiting_allocation',
  allocation: 'allocation_awaiting_warehouse_exit',
  'warehouse-exit': 'warehouse_exit_awaiting_delivery',
  delivery: null,
  'customer-informed': 'customer_not_informed',
  'prior-decisions': 'overdue_prior_decision',
} as const satisfies Record<CoordinationSourceCategory, CoordinationExceptionKind | null>;

/**
 * Prior decisions have no read capability in this lane.
 * Do not invent coordination.decision.read.
 * Do not treat coordination.decision.record, operations.coordinator.record,
 * or the Auxiliar title as a read of prior decisions.
 */
export const CROSS_LANE_CHANGE_REQUEST = {
  id: 'coordination-prior-decisions-read',
  lane: 'wave2/coordination-projection',
  classification: 'SHARED_CONTRACT_BLOCKED',
  target: 'prior-decisions reader',
  required: false,
  request:
    'No coordination read capability exists. Do not invent coordination.decision.read. Do not use coordination.decision.record, operations.coordinator.record, or the Auxiliar title as a read of prior decisions. A prior-decisions reader stays denied until an approved read capability is assigned explicitly. Injected decision rows the caller already holds may be composed; they are not a reader this lane authorizes.',
  unblock:
    'An approved shared-contract read capability, owned outside this lane, assigned explicitly to a Member. This lane will not register coordination.decision.read.',
} as const;

export type CoordinationCrossLaneChangeRequest = typeof CROSS_LANE_CHANGE_REQUEST;

const LA_PAZ = 'America/La_Paz';

export function blank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function calendarDateInLaPaz(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LA_PAZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

/** A missing clock cannot mark a decision overdue. */
export function isPastDue(dueAt: string, asOf: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) {
    const today = calendarDateInLaPaz(asOf);
    return today != null && today > dueAt;
  }
  const due = Date.parse(dueAt);
  const now = Date.parse(asOf);
  if (Number.isNaN(due) || Number.isNaN(now)) return false;
  return now > due;
}
