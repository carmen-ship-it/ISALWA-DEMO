import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
} from './scopes';

/**
 * Provisional V1 pilot predicates. Not final Isa/Álvaro policy.
 * Ownership and explicit capability only. people.admin, leadership read
 * scopes, Cargo, and title never satisfy these checks.
 */
export function grantedScopeSet(grantedScopes: readonly string[]): Set<string> {
  return new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
}

export function hasExplicitScope(grantedScopes: readonly string[], scope: string): boolean {
  return grantedScopeSet(grantedScopes).has(scope);
}

export function canConvertQuoteToOrder(input: {
  actorMemberId: string;
  grantedScopes: readonly string[];
  quoteOwnerMemberId: string;
}): boolean {
  if (!input.actorMemberId || !input.quoteOwnerMemberId) return false;
  if (input.actorMemberId === input.quoteOwnerMemberId) return true;
  return hasExplicitScope(input.grantedScopes, COMMERCIAL_ORDER_CONVERT_SCOPE);
}

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
