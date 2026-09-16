import { hasExplicitScope } from './commercial-authority';
import { COMMERCIAL_ORDER_CONVERT_SCOPE, COMMERCIAL_TEAM_READ_SCOPE } from './scopes';

/**
 * Operational access scopes. Explicit assignment only.
 *
 * Cargo, title, and department never grant these scopes. This file does not
 * replace memberHasGrantedScope, memberHasScope, or assertTenantMatch.
 * Callers still use that engine. A held scope never implies another scope.
 *
 * commercial.team.read is the existing leadership read scope, not a second key.
 * system.admin stays separate: tenant-bound, and it cannot rewrite history.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts before
 * other packages import it from @isalwa/os-contracts. Do not register these
 * scopes on invite, GrantAdditionalRole, or COMMAND_REQUIRED_SCOPES here.
 */

export const MASTER_DATA_ADMIN_SCOPE = 'master_data.admin' as const;
export const PEOPLE_ADMIN_SCOPE = 'people.admin' as const;
export const INTEGRATION_ADMIN_SCOPE = 'integration.admin' as const;

export const COMMERCIAL_CUSTOMER_CREATE_SCOPE = 'commercial.customer.create' as const;
export const MANAGEMENT_ORG_READ_SCOPE = 'management.org.read' as const;
export const COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE = 'commercial.quote.convert.own' as const;
export const COMMERCIAL_PRICE_APPROVE_SCOPE = 'commercial.price.approve' as const;

/**
 * Authorize a payment exception. Jefe or Gerencia may do this only when this
 * scope is explicitly granted. Cargo and title never grant it. It is not a
 * production gate and it does not imply any other scope.
 */
export const COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE = 'commercial.exception.authorize' as const;
export const FINANCE_OPERATIONAL_RECORD_SCOPE = 'finance.operational.record' as const;
export const PRODUCTION_OPERATIONAL_RECORD_SCOPE = 'production.operational.record' as const;
export const WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE = 'warehouse.finished_goods.receive' as const;
/**
 * Record Nota de Salida de Almacén. Existing string warehouse.outbound.record.
 * Carmen-approved mutation authority. Cargo/title never grant it.
 * Does not imply receive, allocate, or delivery.record.
 */
export const WAREHOUSE_OUTBOUND_RECORD_SCOPE = 'warehouse.outbound.record' as const;
export const PURCHASING_OPERATIONAL_RECORD_SCOPE = 'purchasing.operational.record' as const;
export const OPERATIONS_COORDINATOR_RECORD_SCOPE = 'operations.coordinator.record' as const;
export const DELIVERY_RECORD_SCOPE = 'delivery.record' as const;

/**
 * Production entry for the encargado. Assigned to a Member only.
 * Cargo and title, including "encargado de producción", never grant this.
 */
export const PRODUCTION_ENTRY_MEMBER_SCOPE = 'production.entry.member' as const;

/**
 * Coordinator production review. Separate from coordinator record and from
 * production entry. Must be assigned to a Member. Does not confirm finance
 * or impersonate production.
 */
export const PRODUCTION_REVIEW_MEMBER_SCOPE = 'production.review.member' as const;

/**
 * Customer-specific coverage grant. Not a member role and not GrantDelegation.
 * GrantDelegation applies scopes to every resource. Account reassignment changes
 * the owner. Neither is safe for covering one customer.
 */
export const COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE = 'commercial.customer.coverage' as const;

/** Separate from operational scopes. Not implied by cargo, title, or any scope below. */
export const SYSTEM_ADMIN_SCOPE = 'system.admin' as const;

/** Matches current CreateOrder eligibility. Ownership alone is not enough. */
export const OWN_QUOTE_CONVERT_ELIGIBLE_STATUS = 'submitted' as const;

export const OPERATIONS_ACCESS_SCOPE_KEYS = [
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  DELIVERY_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
] as const;

export type OperationsAccessScopeKey = (typeof OPERATIONS_ACCESS_SCOPE_KEYS)[number];

export const TECHNICAL_ADMIN_SCOPE_KEYS = [SYSTEM_ADMIN_SCOPE, INTEGRATION_ADMIN_SCOPE] as const;

export function isOperationsAccessScope(value: string): value is OperationsAccessScopeKey {
  return (OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes(value);
}

/** Cargo and title never assign authority. The arguments are ignored on purpose. */
export function scopesGrantedByCargoOrTitle(
  _cargo: string | null | undefined,
  _title: string | null | undefined,
): readonly [] {
  return [];
}

export function hasAssignedOperationsScope(
  grantedScopes: readonly string[],
  scope: string,
): boolean {
  return hasExplicitScope(grantedScopes, scope);
}

/** A held scope satisfies only that same scope. No cargo, title, or sibling implication. */
export function scopeImplies(heldScope: string, requiredScope: string): boolean {
  const held = heldScope.trim();
  const required = requiredScope.trim();
  return held.length > 0 && held === required;
}

export const OWN_QUOTE_CONVERT_IS_NOT_ORDER_CONVERT =
  (COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE as string) !== (COMMERCIAL_ORDER_CONVERT_SCOPE as string);

export function canRegisterCustomer(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, COMMERCIAL_CUSTOMER_CREATE_SCOPE);
}

export function canReadTeamCommercialWork(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, COMMERCIAL_TEAM_READ_SCOPE);
}

export function canReadCompanyOperations(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, MANAGEMENT_ORG_READ_SCOPE);
}

export function canConvertOwnEligibleQuote(input: {
  actorMemberId: string;
  quoteOwnerMemberId: string;
  quoteStatus: string;
  grantedScopes: readonly string[];
}): boolean {
  if (!input.actorMemberId || input.actorMemberId !== input.quoteOwnerMemberId) return false;
  if (input.quoteStatus !== OWN_QUOTE_CONVERT_ELIGIBLE_STATUS) return false;
  return hasAssignedOperationsScope(input.grantedScopes, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE);
}

export function canApproveCommercialPrice(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, COMMERCIAL_PRICE_APPROVE_SCOPE);
}

/** Explicit grant only. A job title, including Jefe or Gerencia, is not enough. */
export function canAuthorizePaymentException(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
}

/** Operational finance record. Not a ledger posting and not a confirmation. */
export function canRecordOperationalFinance(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, FINANCE_OPERATIONAL_RECORD_SCOPE);
}

export function canPostFinanceLedger(_grantedScopes: readonly string[]): false {
  return false;
}

export function canConfirmFinance(_grantedScopes: readonly string[]): false {
  return false;
}

export function canRecordProduction(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, PRODUCTION_OPERATIONAL_RECORD_SCOPE);
}

/** Coordinator record never stands in for production. */
export function canImpersonateProduction(_grantedScopes: readonly string[]): false {
  return false;
}

export function canReceiveFinishedGoods(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE);
}

/** Nota de Salida. Not implied by receive, allocate, or delivery.record. */
export function canRecordWarehouseOutbound(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, WAREHOUSE_OUTBOUND_RECORD_SCOPE);
}

export function canRecordPurchasing(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, PURCHASING_OPERATIONAL_RECORD_SCOPE);
}

export function canRecordCoordinatorWork(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, OPERATIONS_COORDINATOR_RECORD_SCOPE);
}

export function canRecordDelivery(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, DELIVERY_RECORD_SCOPE);
}

export function canActAsSystemAdmin(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, SYSTEM_ADMIN_SCOPE);
}

/**
 * system.admin stays tenant-bound. A matching organization is required even
 * when the scope is explicitly assigned. Cross-tenant is always denied.
 */
export function systemAdminMayActInOrganization(input: {
  grantedScopes: readonly string[];
  actorOrganizationId: string;
  resourceOrganizationId: string;
}): boolean {
  if (!input.actorOrganizationId || !input.resourceOrganizationId) return false;
  if (input.actorOrganizationId !== input.resourceOrganizationId) return false;
  return canActAsSystemAdmin(input.grantedScopes);
}

export function mayRewriteHistory(_grantedScopes: readonly string[]): false {
  return false;
}

export function canEnterProduction(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, PRODUCTION_ENTRY_MEMBER_SCOPE);
}

export function canReviewProduction(grantedScopes: readonly string[]): boolean {
  return hasAssignedOperationsScope(grantedScopes, PRODUCTION_REVIEW_MEMBER_SCOPE);
}

/**
 * Payment confirmation is not a universal gate before production.
 * This catalog defines no scope that requires paymentConfirmed first.
 */
export function paymentConfirmedGatesProduction(
  _paymentConfirmed: boolean,
  _grantedScopes: readonly string[],
): false {
  return false;
}

export function mayEnterProduction(input: {
  grantedScopes: readonly string[];
  paymentConfirmed: boolean;
}): boolean {
  void input.paymentConfirmed;
  return canEnterProduction(input.grantedScopes);
}

export type CustomerCoverageGrant = {
  grantType: typeof COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE;
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
};

export type CoverageWorkflowAudit = {
  allowed: boolean;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  auditActorMemberId: string;
  sharedOwnership: false;
};

function trimmedId(value: string): string {
  return value.trim();
}

/** Cargo and title never create a coverage grant. */
export function coverageGrantFromCargoOrTitle(
  _cargo: string | null | undefined,
  _title: string | null | undefined,
): null {
  return null;
}

export function buildCustomerCoverageGrant(input: {
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  startsAt: Date;
  endsAt?: Date | null;
}): CustomerCoverageGrant | null {
  const organizationId = trimmedId(input.organizationId);
  const customerPartyId = trimmedId(input.customerPartyId);
  const primaryOwnerMemberId = trimmedId(input.primaryOwnerMemberId);
  const actingAdvisorMemberId = trimmedId(input.actingAdvisorMemberId);
  if (!organizationId || !customerPartyId || !primaryOwnerMemberId || !actingAdvisorMemberId) {
    return null;
  }
  if (actingAdvisorMemberId === primaryOwnerMemberId) return null;
  if (input.endsAt && input.endsAt <= input.startsAt) return null;
  return {
    grantType: COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
    organizationId,
    customerPartyId,
    primaryOwnerMemberId,
    actingAdvisorMemberId,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    revokedAt: null,
  };
}

function coverageGrantIsActive(grant: CustomerCoverageGrant, asOf: Date): boolean {
  if (grant.revokedAt) return false;
  if (grant.startsAt > asOf) return false;
  if (grant.endsAt !== null && grant.endsAt <= asOf) return false;
  return grant.grantType === COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE;
}

/** Public active-window check for termination preflight and commercial authority. */
export function customerCoverageGrantIsActive(
  grant: CustomerCoverageGrant,
  asOf: Date,
): boolean {
  return coverageGrantIsActive(grant, asOf);
}

/**
 * A covering advisor may continue commercial work for one granted customer.
 * The primary owner stays. The acting advisor is recorded. Audit keeps the actor.
 * A member role never covers every customer.
 */
export function continueCoveredCustomerWorkflow(input: {
  actorMemberId: string;
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  grants: readonly CustomerCoverageGrant[];
  asOf: Date;
}): CoverageWorkflowAudit {
  const actorMemberId = trimmedId(input.actorMemberId);
  const organizationId = trimmedId(input.organizationId);
  const customerPartyId = trimmedId(input.customerPartyId);
  const primaryOwnerMemberId = trimmedId(input.primaryOwnerMemberId);
  const denied: CoverageWorkflowAudit = {
    allowed: false,
    customerPartyId,
    primaryOwnerMemberId,
    actingAdvisorMemberId: actorMemberId,
    auditActorMemberId: actorMemberId,
    sharedOwnership: false,
  };
  if (!actorMemberId || !organizationId || !customerPartyId || !primaryOwnerMemberId) return denied;
  if (actorMemberId === primaryOwnerMemberId) return denied;

  const match = input.grants.find(
    (grant) =>
      coverageGrantIsActive(grant, input.asOf) &&
      grant.organizationId === organizationId &&
      grant.customerPartyId === customerPartyId &&
      grant.primaryOwnerMemberId === primaryOwnerMemberId &&
      grant.actingAdvisorMemberId === actorMemberId,
  );
  if (!match) return denied;

  return {
    allowed: true,
    customerPartyId,
    primaryOwnerMemberId,
    actingAdvisorMemberId: actorMemberId,
    auditActorMemberId: actorMemberId,
    sharedOwnership: false,
  };
}

/** A role key, including the coverage grant type, never opens every customer. */
export function memberScopesCoverAllCustomers(_grantedScopes: readonly string[]): false {
  return false;
}
