import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
} from './scopes';
import {
  continueCoveredCustomerWorkflow,
  type CoverageWorkflowAudit,
  type CustomerCoverageGrant,
} from './operations-scopes';

/**
 * V1 commercial convert / reassignment predicates (canonical consolidation).
 * Cargo and title never satisfy these checks.
 * Temporary coverage does NOT authorize Quote → Pedido (§9 / §37).
 */
export function grantedScopeSet(grantedScopes: readonly string[]): Set<string> {
  return new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
}

export function hasExplicitScope(grantedScopes: readonly string[], scope: string): boolean {
  return grantedScopeSet(grantedScopes).has(scope);
}

/**
 * Live CreateOrder gate (V1):
 * 1. actor is quote owner AND holds commercial.quote.convert.own, OR
 * 2. actor holds commercial.order.convert (explicit cross-owner / leadership convert)
 *
 * Temporary coverage alone does not authorize convert.
 * people.admin / leadership read scopes never authorize convert.
 */
export function canConvertQuoteToOrder(input: {
  actorMemberId: string;
  grantedScopes: readonly string[];
  quoteOwnerMemberId: string;
  /** Retained for callers; ignored for convert authorization (coverage ≠ convert). */
  coverage?: CoverageWorkflowAudit | null;
}): boolean {
  void input.coverage;
  if (!input.actorMemberId || !input.quoteOwnerMemberId) return false;
  if (hasExplicitScope(input.grantedScopes, COMMERCIAL_ORDER_CONVERT_SCOPE)) {
    return true;
  }
  if (
    input.actorMemberId === input.quoteOwnerMemberId &&
    hasExplicitScope(input.grantedScopes, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE)
  ) {
    return true;
  }
  return false;
}

/** Evaluate coverage for workflow continuation (not convert). */
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

/** commercial.quote.convert.own is wired into CreateOrder for the own-quote path. */
export const QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = true as const;
export const QUOTE_CONVERT_OWN_DISPOSITION = 'WIRED_OWN_PATH' as const;

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
