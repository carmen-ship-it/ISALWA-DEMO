import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMMERCIAL_TEAM_READ_SCOPE } from '@isalwa/os-contracts';
import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  canActAsSystemAdmin,
  canConfirmFinance,
  canEnterProduction,
  canImpersonateProduction,
  canRecordProduction,
  canReviewProduction,
  continueCoveredCustomerWorkflow,
  buildCustomerCoverageGrant,
  mayEnterProduction,
  mayRewriteHistory,
  memberScopesCoverAllCustomers,
  paymentConfirmedGatesProduction,
  scopeImplies,
  systemAdminMayActInOrganization,
} from '@isalwa/os-contracts';
import {
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  canAuthorizePaymentException,
} from '../../os-contracts/src/operations-scopes.ts';
import {
  assertTenantMatch,
  memberHasGrantedScope,
  memberHasScope,
  type MemberAccessSnapshot,
} from './authorization';

function snap(
  roleKeys: string[],
  organizationId = 'org-a',
  accessStatus = 'active',
): MemberAccessSnapshot {
  return {
    memberId: 'mem-1',
    organizationId,
    accessStatus,
    roleKeys,
    delegatedScopes: [],
  };
}

describe('operational scopes through the existing authorization engine', () => {
  it('does not let advisor customer create imply master_data.admin', () => {
    const advisor = snap([COMMERCIAL_CUSTOMER_CREATE_SCOPE]);
    assert.equal(memberHasGrantedScope(advisor, COMMERCIAL_CUSTOMER_CREATE_SCOPE), true);
    assert.equal(memberHasScope(advisor, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(memberHasGrantedScope(advisor, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(memberHasScope(advisor, PEOPLE_ADMIN_SCOPE), false);
    assert.equal(scopeImplies(COMMERCIAL_CUSTOMER_CREATE_SCOPE, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(memberHasScope(snap(['asesor', 'sales_rep']), MASTER_DATA_ADMIN_SCOPE), false);
  });

  it('does not let team read imply system admin', () => {
    const jefe = snap([COMMERCIAL_TEAM_READ_SCOPE]);
    assert.equal(memberHasGrantedScope(jefe, COMMERCIAL_TEAM_READ_SCOPE), true);
    assert.equal(memberHasGrantedScope(jefe, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canActAsSystemAdmin(jefe.roleKeys), false);
    assert.equal(memberHasScope(jefe, PEOPLE_ADMIN_SCOPE), false);
    assert.equal(memberHasScope(jefe, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(memberHasGrantedScope(jefe, 'integration.admin'), false);
    assert.equal(scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, SYSTEM_ADMIN_SCOPE), false);
  });

  it('does not let finance record production', () => {
    const finance = snap([FINANCE_OPERATIONAL_RECORD_SCOPE]);
    assert.equal(memberHasGrantedScope(finance, FINANCE_OPERATIONAL_RECORD_SCOPE), true);
    assert.equal(memberHasGrantedScope(finance, PRODUCTION_OPERATIONAL_RECORD_SCOPE), false);
    assert.equal(canRecordProduction(finance.roleKeys), false);
    assert.equal(
      scopeImplies(FINANCE_OPERATIONAL_RECORD_SCOPE, PRODUCTION_OPERATIONAL_RECORD_SCOPE),
      false,
    );
  });

  it('does not let a coordinator confirm finance or impersonate production', () => {
    const coordinator = snap([OPERATIONS_COORDINATOR_RECORD_SCOPE]);
    assert.equal(memberHasGrantedScope(coordinator, OPERATIONS_COORDINATOR_RECORD_SCOPE), true);
    assert.equal(memberHasGrantedScope(coordinator, FINANCE_OPERATIONAL_RECORD_SCOPE), false);
    assert.equal(memberHasGrantedScope(coordinator, PRODUCTION_OPERATIONAL_RECORD_SCOPE), false);
    assert.equal(canConfirmFinance(coordinator.roleKeys), false);
    assert.equal(
      canConfirmFinance([...coordinator.roleKeys, FINANCE_OPERATIONAL_RECORD_SCOPE]),
      false,
    );
    assert.equal(canImpersonateProduction(coordinator.roleKeys), false);
    assert.equal(canRecordProduction(coordinator.roleKeys), false);
  });

  it('does not let production act as system admin', () => {
    const production = snap([PRODUCTION_OPERATIONAL_RECORD_SCOPE]);
    assert.equal(canRecordProduction(production.roleKeys), true);
    assert.equal(memberHasGrantedScope(production, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canActAsSystemAdmin(production.roleKeys), false);
    assert.equal(memberHasScope(production, PEOPLE_ADMIN_SCOPE), false);
    assert.equal(memberHasScope(production, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(mayRewriteHistory(production.roleKeys), false);
  });

  it('keeps super admin tenant-bound and unable to rewrite history', () => {
    const admin = snap([SYSTEM_ADMIN_SCOPE], 'org-a');
    assert.equal(memberHasGrantedScope(admin, SYSTEM_ADMIN_SCOPE), true);
    assert.doesNotThrow(() => assertTenantMatch(admin.organizationId, 'org-a'));
    assert.throws(() => assertTenantMatch(admin.organizationId, 'org-b'), /TENANT_FORBIDDEN/);
    assert.equal(
      systemAdminMayActInOrganization({
        grantedScopes: admin.roleKeys,
        actorOrganizationId: admin.organizationId,
        resourceOrganizationId: 'org-b',
      }),
      false,
    );
    assert.equal(
      systemAdminMayActInOrganization({
        grantedScopes: ['super admin'],
        actorOrganizationId: 'org-a',
        resourceOrganizationId: 'org-a',
      }),
      false,
    );
    assert.equal(mayRewriteHistory(admin.roleKeys), false);
    assert.equal(
      memberHasGrantedScope({ ...admin, accessStatus: 'suspended' }, SYSTEM_ADMIN_SCOPE),
      false,
    );
  });

  it('does not let a coverage grant type cover every customer or change the owner', () => {
    const asOf = new Date('2026-06-15T12:00:00.000Z');
    const grant = buildCustomerCoverageGrant({
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: 'mem-owner',
      actingAdvisorMemberId: 'mem-cover',
      startsAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    assert.ok(grant);
    const covered = continueCoveredCustomerWorkflow({
      actorMemberId: 'mem-cover',
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: 'mem-owner',
      grants: [grant],
      asOf,
    });
    assert.equal(covered.allowed, true);
    assert.equal(covered.primaryOwnerMemberId, 'mem-owner');
    assert.equal(covered.auditActorMemberId, 'mem-cover');
    assert.equal(covered.sharedOwnership, false);
    const blanket = snap([COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE, 'sales_rep']);
    assert.equal(memberScopesCoverAllCustomers(blanket.roleKeys), false);
    assert.equal(memberHasScope(blanket, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(
      continueCoveredCustomerWorkflow({
        actorMemberId: 'mem-cover',
        organizationId: 'org-a',
        customerPartyId: 'party-2',
        primaryOwnerMemberId: 'mem-owner',
        grants: [grant],
        asOf,
      }).allowed,
      false,
    );
  });

  it('requires an assigned production-entry member scope and a separate review scope', () => {
    const entry = snap([PRODUCTION_ENTRY_MEMBER_SCOPE]);
    const coordinator = snap([OPERATIONS_COORDINATOR_RECORD_SCOPE]);
    assert.equal(memberHasGrantedScope(entry, PRODUCTION_ENTRY_MEMBER_SCOPE), true);
    assert.equal(canEnterProduction(entry.roleKeys), true);
    assert.equal(memberHasGrantedScope(entry, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canActAsSystemAdmin(entry.roleKeys), false);
    assert.equal(memberHasGrantedScope(coordinator, PRODUCTION_REVIEW_MEMBER_SCOPE), false);
    assert.equal(canReviewProduction(coordinator.roleKeys), false);
    assert.equal(canReviewProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), true);
    assert.equal(canEnterProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canConfirmFinance([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canImpersonateProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canRecordProduction(coordinator.roleKeys), false);
  });

  it('does not grant payment-exception authorization from cargo, title, or a sibling scope', () => {
    const titled = snap(['Jefe', 'JEFE COMERCIAL', 'Gerente', 'Gerencia', 'asesor']);
    assert.equal(memberHasGrantedScope(titled, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), false);
    assert.equal(memberHasScope(titled, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), false);
    assert.equal(canAuthorizePaymentException(titled.roleKeys), false);
    assert.equal(canAuthorizePaymentException([COMMERCIAL_TEAM_READ_SCOPE]), false);
    assert.equal(
      memberHasGrantedScope(snap([COMMERCIAL_TEAM_READ_SCOPE]), COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE),
      false,
    );
    const granted = snap([COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE]);
    assert.equal(memberHasGrantedScope(granted, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), true);
    assert.equal(canAuthorizePaymentException(granted.roleKeys), true);
    assert.equal(memberHasScope(granted, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(memberHasScope(granted, PEOPLE_ADMIN_SCOPE), false);
  });

  it('does not require payment confirmation before production entry', () => {
    const entry = snap([PRODUCTION_ENTRY_MEMBER_SCOPE]);
    assert.equal(paymentConfirmedGatesProduction(false, entry.roleKeys), false);
    assert.equal(
      mayEnterProduction({ grantedScopes: entry.roleKeys, paymentConfirmed: false }),
      true,
    );
    assert.equal(memberHasGrantedScope(entry, 'payment.confirmed.required'), false);
    assert.equal(scopeImplies(PRODUCTION_ENTRY_MEMBER_SCOPE, 'payment.confirmed.required'), false);
  });
});
