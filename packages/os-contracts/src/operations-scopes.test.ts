import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMMERCIAL_ORDER_CONVERT_SCOPE, COMMERCIAL_TEAM_READ_SCOPE } from './scopes';
import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  OPERATIONS_ACCESS_SCOPE_KEYS,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  OWN_QUOTE_CONVERT_IS_NOT_ORDER_CONVERT,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  TECHNICAL_ADMIN_SCOPE_KEYS,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
  canActAsSystemAdmin,
  canApproveCommercialPrice,
  canAuthorizePaymentException,
  canConfirmFinance,
  canConvertOwnEligibleQuote,
  canImpersonateProduction,
  canPostFinanceLedger,
  canReadTeamCommercialWork,
  canReceiveFinishedGoods,
  canRecordWarehouseOutbound,
  canRecordPurchasing,
  canRecordCoordinatorWork,
  canRecordDelivery,
  canRecordOperationalFinance,
  canEnterProduction,
  canRecordProduction,
  canRegisterCustomer,
  canReviewProduction,
  continueCoveredCustomerWorkflow,
  buildCustomerCoverageGrant,
  coverageGrantFromCargoOrTitle,
  hasAssignedOperationsScope,
  isOperationsAccessScope,
  mayEnterProduction,
  mayRewriteHistory,
  memberScopesCoverAllCustomers,
  paymentConfirmedGatesProduction,
  scopeImplies,
  scopesGrantedByCargoOrTitle,
  systemAdminMayActInOrganization,
} from './operations-scopes';

const OWNER = 'mem-owner';
const OTHER = 'mem-other';
const ORG = 'org-a';
const OTHER_ORG = 'org-b';

const CARGO_AND_TITLES = [
  ['asesor', 'Asesor comercial'],
  ['JEFE COMERCIAL', 'Jefe'],
  ['gerencia', 'Gerente'],
  ['gerente general', 'super admin'],
  ['super admin', 'Super Admin'],
  ['encargado de producción', 'El encargado de producción'],
  ['coordinador', 'Coordinador de operaciones'],
] as const;

describe('operational access scopes', () => {
  it('lists explicit operational scopes and keeps system.admin separate', () => {
    assert.deepEqual(OPERATIONS_ACCESS_SCOPE_KEYS, [
      'commercial.customer.create',
      COMMERCIAL_TEAM_READ_SCOPE,
      'management.org.read',
      'commercial.quote.convert.own',
      'commercial.price.approve',
      'commercial.exception.authorize',
      'finance.operational.record',
      'production.operational.record',
      'warehouse.finished_goods.receive',
      'warehouse.outbound.record',
      'purchasing.operational.record',
      'operations.coordinator.record',
      'delivery.record',
      'production.entry.member',
      'production.review.member',
      'issue.manage',
      'product.feedback.review',
      'qa.access',
    ]);
    assert.equal(isOperationsAccessScope(COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE), false);
    assert.equal(OPERATIONS_ACCESS_SCOPE_KEYS.includes(COMMERCIAL_TEAM_READ_SCOPE), true);
    assert.equal(isOperationsAccessScope(SYSTEM_ADMIN_SCOPE), false);
    assert.deepEqual(TECHNICAL_ADMIN_SCOPE_KEYS, ['system.admin', 'integration.admin']);
    assert.equal(OWN_QUOTE_CONVERT_IS_NOT_ORDER_CONVERT, true);
    assert.notEqual(COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE, COMMERCIAL_ORDER_CONVERT_SCOPE);
  });

  it('does not assign any scope from cargo or title', () => {
    for (const [cargo, title] of CARGO_AND_TITLES) {
      assert.deepEqual(scopesGrantedByCargoOrTitle(cargo, title), []);
      assert.equal(canRegisterCustomer(scopesGrantedByCargoOrTitle(cargo, title)), false);
      assert.equal(canApproveCommercialPrice(scopesGrantedByCargoOrTitle(cargo, title)), false);
      assert.equal(canAuthorizePaymentException(scopesGrantedByCargoOrTitle(cargo, title)), false);
      assert.equal(canActAsSystemAdmin(scopesGrantedByCargoOrTitle(cargo, title)), false);
    }
  });

  it('does not let advisor customer create imply master_data.admin', () => {
    const granted = [COMMERCIAL_CUSTOMER_CREATE_SCOPE];
    assert.equal(canRegisterCustomer(granted), true);
    assert.equal(scopeImplies(COMMERCIAL_CUSTOMER_CREATE_SCOPE, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(hasAssignedOperationsScope(granted, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(hasAssignedOperationsScope(granted, PEOPLE_ADMIN_SCOPE), false);
    assert.equal(hasAssignedOperationsScope(granted, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canRegisterCustomer([MASTER_DATA_ADMIN_SCOPE]), false);
    assert.equal(canRegisterCustomer(['asesor', 'sales_rep']), false);
  });

  it('does not let team read imply system admin or technical admin', () => {
    const granted = [COMMERCIAL_TEAM_READ_SCOPE];
    assert.equal(canReadTeamCommercialWork(granted), true);
    assert.equal(scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canActAsSystemAdmin(granted), false);
    for (const technical of TECHNICAL_ADMIN_SCOPE_KEYS) {
      assert.equal(hasAssignedOperationsScope(granted, technical), false, technical);
    }
    assert.equal(hasAssignedOperationsScope(granted, PEOPLE_ADMIN_SCOPE), false);
    assert.equal(hasAssignedOperationsScope(granted, MASTER_DATA_ADMIN_SCOPE), false);
    assert.equal(canApproveCommercialPrice(granted), false);
  });

  it('does not let finance record production or post a ledger', () => {
    const granted = [FINANCE_OPERATIONAL_RECORD_SCOPE];
    assert.equal(canRecordOperationalFinance(granted), true);
    assert.equal(canRecordProduction(granted), false);
    assert.equal(canPostFinanceLedger(granted), false);
    assert.equal(canConfirmFinance(granted), false);
    assert.equal(
      scopeImplies(FINANCE_OPERATIONAL_RECORD_SCOPE, PRODUCTION_OPERATIONAL_RECORD_SCOPE),
      false,
    );
  });

  it('does not let a coordinator confirm finance or impersonate production', () => {
    const granted = [OPERATIONS_COORDINATOR_RECORD_SCOPE];
    assert.equal(canRecordCoordinatorWork(granted), true);
    assert.equal(canConfirmFinance(granted), false);
    assert.equal(canConfirmFinance([...granted, FINANCE_OPERATIONAL_RECORD_SCOPE]), false);
    assert.equal(canPostFinanceLedger(granted), false);
    assert.equal(canRecordOperationalFinance(granted), false);
    assert.equal(canImpersonateProduction(granted), false);
    assert.equal(canRecordProduction(granted), false);
    assert.equal(canImpersonateProduction([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), false);
    assert.equal(canActAsSystemAdmin(granted), false);
  });

  it('does not let production act as system admin', () => {
    const granted = [PRODUCTION_OPERATIONAL_RECORD_SCOPE];
    assert.equal(canRecordProduction(granted), true);
    assert.equal(canActAsSystemAdmin(granted), false);
    assert.equal(scopeImplies(PRODUCTION_OPERATIONAL_RECORD_SCOPE, SYSTEM_ADMIN_SCOPE), false);
    assert.equal(canConfirmFinance(granted), false);
    assert.equal(canRecordOperationalFinance(granted), false);
    assert.equal(mayRewriteHistory(granted), false);
  });

  it('keeps system.admin tenant-bound and unable to rewrite history', () => {
    const granted = [SYSTEM_ADMIN_SCOPE];
    assert.equal(
      systemAdminMayActInOrganization({
        grantedScopes: granted,
        actorOrganizationId: ORG,
        resourceOrganizationId: ORG,
      }),
      true,
    );
    assert.equal(
      systemAdminMayActInOrganization({
        grantedScopes: granted,
        actorOrganizationId: ORG,
        resourceOrganizationId: OTHER_ORG,
      }),
      false,
    );
    assert.equal(
      systemAdminMayActInOrganization({
        grantedScopes: ['super admin', 'org.admin', PEOPLE_ADMIN_SCOPE],
        actorOrganizationId: ORG,
        resourceOrganizationId: ORG,
      }),
      false,
    );
    assert.equal(mayRewriteHistory(granted), false);
    assert.equal(mayRewriteHistory([...granted, ...OPERATIONS_ACCESS_SCOPE_KEYS]), false);
    assert.equal(canRegisterCustomer(granted), false);
    assert.equal(canRecordProduction(granted), false);
    assert.equal(canConfirmFinance(granted), false);
  });

  it('lets an assigned advisor convert only an own submitted quote', () => {
    assert.equal(
      canConvertOwnEligibleQuote({
        actorMemberId: OWNER,
        quoteOwnerMemberId: OWNER,
        quoteStatus: 'submitted',
        grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
      }),
      true,
    );
    assert.equal(
      canConvertOwnEligibleQuote({
        actorMemberId: OWNER,
        quoteOwnerMemberId: OWNER,
        quoteStatus: 'submitted',
        grantedScopes: ['asesor', COMMERCIAL_ORDER_CONVERT_SCOPE],
      }),
      false,
    );
    assert.equal(
      canConvertOwnEligibleQuote({
        actorMemberId: OTHER,
        quoteOwnerMemberId: OWNER,
        quoteStatus: 'submitted',
        grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
      }),
      false,
    );
    for (const quoteStatus of ['draft', 'cancelled', 'accepted', 'open']) {
      assert.equal(
        canConvertOwnEligibleQuote({
          actorMemberId: OWNER,
          quoteOwnerMemberId: OWNER,
          quoteStatus,
          grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
        }),
        false,
        quoteStatus,
      );
    }
  });

  it('authorizes a payment exception only from the explicit scope, never from cargo or title', () => {
    assert.equal(canAuthorizePaymentException([COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE]), true);
    assert.equal(canAuthorizePaymentException([COMMERCIAL_TEAM_READ_SCOPE]), false);
    assert.equal(canAuthorizePaymentException([MANAGEMENT_ORG_READ_SCOPE]), false);
    assert.equal(
      canAuthorizePaymentException(['Jefe', 'JEFE COMERCIAL', 'Gerente', 'Gerencia', 'asesor']),
      false,
    );
    assert.equal(
      scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE),
      false,
    );
    assert.equal(
      scopeImplies(MANAGEMENT_ORG_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE),
      false,
    );
    assert.equal(
      (scopesGrantedByCargoOrTitle('jefe', 'Gerencia') as readonly string[]).includes(
        COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
      ),
      false,
    );
    assert.equal(COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE.includes('payment'), false);
  });

  it('requires an explicit price-approval assignment, not a title', () => {
    assert.equal(canApproveCommercialPrice([COMMERCIAL_PRICE_APPROVE_SCOPE]), true);
    assert.equal(canApproveCommercialPrice([COMMERCIAL_TEAM_READ_SCOPE]), false);
    assert.equal(canApproveCommercialPrice([MANAGEMENT_ORG_READ_SCOPE]), false);
    assert.equal(
      canApproveCommercialPrice([PEOPLE_ADMIN_SCOPE, 'JEFE COMERCIAL', 'Gerente']),
      false,
    );
    assert.equal(
      (scopesGrantedByCargoOrTitle('jefe', 'gerencia') as readonly string[]).includes(
        COMMERCIAL_PRICE_APPROVE_SCOPE,
      ),
      false,
    );
  });

  it('keeps record scopes from confirming finance or standing in for each other', () => {
    assert.equal(canReceiveFinishedGoods([WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE]), true);
    assert.equal(canRecordWarehouseOutbound([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), true);
    assert.equal(canRecordPurchasing([PURCHASING_OPERATIONAL_RECORD_SCOPE]), true);
    assert.equal(canRecordDelivery([DELIVERY_RECORD_SCOPE]), true);
    assert.equal(canRecordProduction([WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE]), false);
    assert.equal(
      canConfirmFinance([DELIVERY_RECORD_SCOPE, PURCHASING_OPERATIONAL_RECORD_SCOPE]),
      false,
    );
    assert.equal(canReadTeamCommercialWork([MANAGEMENT_ORG_READ_SCOPE]), false);
    assert.equal(canReadTeamCommercialWork([COMMERCIAL_TEAM_READ_SCOPE]), true);
  });

  it('does not let receive, allocate, delivery, commercial read, or people.admin imply warehouse outbound', () => {
    const siblings = [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      'warehouse.finished_goods.allocate',
      DELIVERY_RECORD_SCOPE,
      COMMERCIAL_TEAM_READ_SCOPE,
      PEOPLE_ADMIN_SCOPE,
      SYSTEM_ADMIN_SCOPE,
    ] as const;
    for (const held of siblings) {
      assert.equal(scopeImplies(held, WAREHOUSE_OUTBOUND_RECORD_SCOPE), false);
      assert.equal(canRecordWarehouseOutbound([held]), false);
    }
    assert.equal(canRecordWarehouseOutbound([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), true);
    assert.equal(canReceiveFinishedGoods([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), false);
    assert.equal(canRecordDelivery([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), false);
    assert.deepEqual(scopesGrantedByCargoOrTitle('encargado de almacén', 'Encargado de Almacén'), []);
  });

  it('covers one customer for one acting advisor without shared ownership', () => {
    const asOf = new Date('2026-06-15T12:00:00.000Z');
    const grant = buildCustomerCoverageGrant({
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      actingAdvisorMemberId: OTHER,
      startsAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    assert.ok(grant);
    assert.equal(coverageGrantFromCargoOrTitle('asesor', 'Asesor comercial'), null);
    assert.equal(
      buildCustomerCoverageGrant({
        organizationId: 'org-a',
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        actingAdvisorMemberId: OWNER,
        startsAt: asOf,
      }),
      null,
    );

    const allowed = continueCoveredCustomerWorkflow({
      actorMemberId: OTHER,
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      grants: [grant],
      asOf,
    });
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.primaryOwnerMemberId, OWNER);
    assert.equal(allowed.actingAdvisorMemberId, OTHER);
    assert.equal(allowed.auditActorMemberId, OTHER);
    assert.equal(allowed.sharedOwnership, false);

    assert.equal(
      continueCoveredCustomerWorkflow({
        actorMemberId: 'mem-third',
        organizationId: 'org-a',
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        grants: [grant],
        asOf,
      }).allowed,
      false,
    );
    assert.equal(
      continueCoveredCustomerWorkflow({
        actorMemberId: OTHER,
        organizationId: 'org-a',
        customerPartyId: 'party-2',
        primaryOwnerMemberId: OWNER,
        grants: [grant],
        asOf,
      }).allowed,
      false,
    );
    assert.equal(
      continueCoveredCustomerWorkflow({
        actorMemberId: OTHER,
        organizationId: 'org-b',
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        grants: [grant],
        asOf,
      }).allowed,
      false,
    );
    const revoked = continueCoveredCustomerWorkflow({
      actorMemberId: OTHER,
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      grants: [{ ...grant, revokedAt: asOf }],
      asOf,
    });
    assert.equal(revoked.allowed, false);
    assert.equal(revoked.auditActorMemberId, OTHER);
    assert.equal(revoked.primaryOwnerMemberId, OWNER);
    assert.equal(
      memberScopesCoverAllCustomers([COMMERCIAL_CUSTOMER_COVERAGE_GRANT_TYPE, 'sales_rep']),
      false,
    );
    assert.equal(
      continueCoveredCustomerWorkflow({
        actorMemberId: OTHER,
        organizationId: 'org-a',
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        grants: [],
        asOf,
      }).allowed,
      false,
    );
  });

  it('requires a member assignment for production entry and a separate review capability', () => {
    assert.equal(canEnterProduction([PRODUCTION_ENTRY_MEMBER_SCOPE]), true);
    assert.equal(
      canEnterProduction(
        scopesGrantedByCargoOrTitle('encargado de producción', 'El encargado de producción'),
      ),
      false,
    );
    assert.equal(canEnterProduction([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), false);
    assert.equal(canEnterProduction([OPERATIONS_COORDINATOR_RECORD_SCOPE]), false);
    assert.equal(canReviewProduction([OPERATIONS_COORDINATOR_RECORD_SCOPE]), false);
    assert.equal(canReviewProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), true);
    assert.equal(canEnterProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canReviewProduction([PRODUCTION_ENTRY_MEMBER_SCOPE]), false);
    assert.equal(
      canConfirmFinance([PRODUCTION_REVIEW_MEMBER_SCOPE, OPERATIONS_COORDINATOR_RECORD_SCOPE]),
      false,
    );
    assert.equal(canImpersonateProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canRecordProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canActAsSystemAdmin([PRODUCTION_ENTRY_MEMBER_SCOPE]), false);
  });

  it('does not treat payment confirmation as a production gate', () => {
    assert.equal(paymentConfirmedGatesProduction(false, [PRODUCTION_ENTRY_MEMBER_SCOPE]), false);
    assert.equal(paymentConfirmedGatesProduction(true, [PRODUCTION_ENTRY_MEMBER_SCOPE]), false);
    assert.equal(
      mayEnterProduction({
        grantedScopes: [PRODUCTION_ENTRY_MEMBER_SCOPE],
        paymentConfirmed: false,
      }),
      true,
    );
    assert.equal(
      mayEnterProduction({ grantedScopes: ['payment.confirmed.required'], paymentConfirmed: true }),
      false,
    );
    assert.equal(
      OPERATIONS_ACCESS_SCOPE_KEYS.some((scope) => scope.toLowerCase().includes('payment')),
      false,
    );
    assert.equal(isOperationsAccessScope('payment.confirmed.required'), false);
  });
});
