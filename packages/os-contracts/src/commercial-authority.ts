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
 * Coverage alone never grants conversion permission. A covering advisor converts
 * only through canConvertCoveredQuote (T03 2026-10-16 19:30, superseding BR-CNV-02).
 */
export function grantedScopeSet(grantedScopes: readonly string[]): Set<string> {
  return new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
}

export function hasExplicitScope(grantedScopes: readonly string[], scope: string): boolean {
  return grantedScopeSet(grantedScopes).has(scope);
}

/**
 * Conversion permission for the own and range paths:
 * 1. actor is quote owner AND holds commercial.quote.convert.own, OR
 * 2. actor holds commercial.order.convert (explicit cross-owner / leadership convert)
 * CreateOrder also requires account access for either path. The covering-advisor
 * path is canConvertCoveredQuote. people.admin / read scopes never authorize convert.
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

/** Audit facts for a conversion under coverage that explicitly covers quote.convert. */
export function coverageAuditForConvert(input: {
  actorMemberId: string;
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  grants: readonly CustomerCoverageGrant[];
  asOf: Date;
}): CoverageWorkflowAudit {
  return continueCoveredCustomerWorkflow({ ...input, action: 'quote.convert' });
}

/** commercial.quote.convert.own is wired into CreateOrder for the own-quote path. */
export const QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = true as const;
export const QUOTE_CONVERT_OWN_DISPOSITION = 'WIRED_OWN_PATH' as const;

export function canReassignCommercialAccountOwner(grantedScopes: readonly string[]): boolean {
  return hasExplicitScope(grantedScopes, COMMERCIAL_ACCOUNT_REASSIGN_SCOPE);
}

/**
 * Action permission for coverage grant/revoke (same as reassignment). Commands also
 * need assignment scope over the account (resolveAccountAssignmentAuthority).
 * Cargo alone never qualifies.
 */
export function canGrantCustomerCoverage(grantedScopes: readonly string[]): boolean {
  return canReassignCommercialAccountOwner(grantedScopes);
}

export function canRevokeCustomerCoverage(grantedScopes: readonly string[]): boolean {
  return canReassignCommercialAccountOwner(grantedScopes);
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
