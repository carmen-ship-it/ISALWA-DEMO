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

/**
 * T04 lifecycle (REUSE_MAP §13.5): draft → approval of exact terms → issuance
 * (SubmitQuote) → optional manual send → customer acceptance → CreateOrder.
 * Approval is requested before issue, so only a draft is eligible. An issued
 * (submitted) quote can no longer be approved: the legacy "submit then approve"
 * sequence is not kept under new labels.
 */
export function isQuoteApprovalEligible(status: string): boolean {
  return status === 'draft';
}

/** Approval request context key that binds an approval to one quote revision. */
export const QUOTE_APPROVAL_BOUND_REVISION_KEY = 'boundRevision' as const;

/** True only when the approval context was bound to exactly this revision (legacy rows bind none). */
export function quoteApprovalBindsRevision(
  contextSnapshot: Record<string, unknown> | null | undefined,
  revisionNumber: number,
): boolean {
  if (!contextSnapshot || typeof contextSnapshot !== 'object') return false;
  const bound = contextSnapshot[QUOTE_APPROVAL_BOUND_REVISION_KEY];
  return typeof bound === 'number' && Number.isInteger(bound) && bound === revisionNumber;
}

/**
 * An approval authorizes issue/convert only when it was approved and was bound
 * to exactly the quote's current revision. A material change bumps the revision
 * and therefore voids every earlier approval.
 */
export function isQuoteApprovalCurrent(
  approval: { status: string; contextSnapshotJson?: Record<string, unknown> | null } | null | undefined,
  revisionNumber: number,
): boolean {
  if (!approval || approval.status !== 'approved') return false;
  return quoteApprovalBindsRevision(approval.contextSnapshotJson, revisionNumber);
}

export function isOrderApprovalEligible(status: string): boolean {
  return status === 'open';
}
