import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
} from './scopes';
import {
  continueCoveredCustomerWorkflow,
  type CoverageWorkflowAudit,
  type CustomerCoverageGrant,
} from './operations-scopes';

/**
 * Provisional V1 pilot predicates. Not final Isa/Álvaro policy.
 * Ownership, explicit coverage, and commercial.order.convert only.
 * people.admin, leadership read scopes, Cargo, and title never satisfy these checks.
 */
export function grantedScopeSet(grantedScopes: readonly string[]): Set<string> {
  return new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
}

export function hasExplicitScope(grantedScopes: readonly string[], scope: string): boolean {
  return grantedScopeSet(grantedScopes).has(scope);
}

/**
 * Live CreateOrder gate:
 * 1. actor is quote owner, OR
 * 2. actor has active customer coverage for the quote's customer (primary owner stays), OR
 * 3. actor holds commercial.order.convert
 *
 * commercial.quote.convert.own is NOT this gate (own-quote semantics only).
 */
export function canConvertQuoteToOrder(input: {
  actorMemberId: string;
  grantedScopes: readonly string[];
  quoteOwnerMemberId: string;
  /** Result of continueCoveredCustomerWorkflow for this customer/owner/actor. */
  coverage?: CoverageWorkflowAudit | null;
}): boolean {
  if (!input.actorMemberId || !input.quoteOwnerMemberId) return false;
  if (input.actorMemberId === input.quoteOwnerMemberId) return true;
  if (
    input.coverage?.allowed === true &&
    input.coverage.sharedOwnership === false &&
    input.coverage.actingAdvisorMemberId === input.actorMemberId &&
    input.coverage.auditActorMemberId === input.actorMemberId
  ) {
    return true;
  }
  return hasExplicitScope(input.grantedScopes, COMMERCIAL_ORDER_CONVERT_SCOPE);
}

/** Evaluate coverage for convert using persisted grant rows (never client-asserted alone). */
export function coverageAuditForConvert(input: {
  actorMemberId: string;
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  grants: readonly CustomerCoverageGrant[];
  asOf: Date;
}): CoverageWorkflowAudit {
  return continueCoveredCustomerWorkflow(input);
}

/**
 * commercial.quote.convert.own remains own-quote semantics only.
 * Not covering-advisor convert. Not wired into CreateOrder.
 */
export const QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = false as const;
export const QUOTE_CONVERT_OWN_DISPOSITION = 'DEPRECATE_LATER' as const;

export function canReassignCommercialAccountOwner(grantedScopes: readonly string[]): boolean {
  return hasExplicitScope(grantedScopes, COMMERCIAL_ACCOUNT_REASSIGN_SCOPE);
}

/** Quote/order approval requests are owner-initiated. No Cargo inference. */
export function canRequestCommercialSubjectApproval(input: {
  actorMemberId: string;
  subjectOwnerMemberId: string;
}): boolean {
  if (!input.actorMemberId || !input.subjectOwnerMemberId) return false;
  return input.actorMemberId === input.subjectOwnerMemberId;
}

export function isQuoteApprovalEligible(status: string): boolean {
  return status === 'submitted';
}

export function isOrderApprovalEligible(status: string): boolean {
  return status === 'open';
}
