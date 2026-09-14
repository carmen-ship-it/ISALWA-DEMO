/**
 * Existing catalog strings only. This package does not register a new capability.
 *
 * Company fulfillment stores (warehouse exit, delivery, operational release)
 * use management.org.read. Write scopes do not authorize those reads.
 * commercial.team.read does not unlock those company stores.
 *
 * warehouse.outbound.record is a CROSS_LANE string in delivery.ts. It is not
 * a granted read in the shared scope catalog. Do not infer it, and do not
 * invent a second string.
 *
 * Coordination has no dedicated read capability. coordination.decision.record
 * is write. operations.coordinator.record does not imply it and does not
 * unlock a read. The coordination reader returns CROSS_LANE_CHANGE_REQUEST
 * and source UNPROVEN until a real read capability exists.
 */

/** Existing company read. See operations-scopes.ts MANAGEMENT_ORG_READ_SCOPE. */
export const COMPANY_READ_SCOPE = 'management.org.read' as const;

/**
 * Existing commercial read. Unlocks commercial work and attention only when
 * the query can prove the row is commercial. Does not unlock the org-wide
 * work queue, and does not unlock warehouse, delivery, or release.
 */
export const COMMERCIAL_WORK_READ_SCOPE = 'commercial.team.read' as const;

/**
 * Work subject that the work catalog already names as commercial.
 * party, organization_member, and work_item are not exclusively commercial.
 * Quote and order are approval subjects, not a stored work discriminator
 * this reader can prove without a fetch-then-filter.
 */
export const COMMERCIAL_WORK_SUBJECT_TYPES = ['commercial_account'] as const;

export type CommercialWorkSubjectType = (typeof COMMERCIAL_WORK_SUBJECT_TYPES)[number];

export const CROSS_LANE_CHANGE_REQUEST = 'CROSS_LANE_CHANGE_REQUEST' as const;

export const COORDINATION_DECISION_READ_CHANGE_REQUEST = {
  code: CROSS_LANE_CHANGE_REQUEST,
  blocker: 'SHARED_CONTRACT_BLOCKED',
  lane: 'coordination-decision-read',
  evidence:
    'No dedicated coordination decision read capability is in the shared scope catalog. coordination.decision.record is write. operations.coordinator.record does not imply it and does not unlock a read.',
  unblock:
    'Register a coordination decision read capability on the shared scope catalog before this reader may return rows. Do not reuse the write capability as the read gate.',
} as const;

/**
 * Held strings that must not unlock warehouse exit, delivery, or release.
 * commercial.team.read is included here because it does not unlock those
 * company stores. It may still read commercial work via a subjectType
 * predicate. warehouse.outbound.record is the existing CROSS_LANE write
 * string, not a second invented key.
 */
export const NON_READ_SCOPES = [
  'delivery.record',
  'warehouse.finished_goods.allocate',
  'warehouse.outbound.record',
  'commercial.exception.authorize',
  'coordination.decision.record',
  'operations.coordinator.record',
  'people.admin',
  'commercial.team.read',
] as const;

/** Exact match. A sibling scope, cargo, or title never satisfies the required scope. */
export function holdsExactScope(grantedScopes: readonly string[] | null | undefined, required: string): boolean {
  if (!grantedScopes || !required) return false;
  return grantedScopes.some((scope) => scope.trim() === required);
}

export function holdsCompanyRead(grantedScopes: readonly string[] | null | undefined): boolean {
  return holdsExactScope(grantedScopes, COMPANY_READ_SCOPE);
}

export function holdsCommercialWorkRead(grantedScopes: readonly string[] | null | undefined): boolean {
  return holdsExactScope(grantedScopes, COMMERCIAL_WORK_READ_SCOPE);
}
