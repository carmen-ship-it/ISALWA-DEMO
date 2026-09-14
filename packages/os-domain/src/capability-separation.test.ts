import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADDITIONAL_ASSIGNABLE_SCOPE_KEYS,
  ADMIN_SCOPE_KEYS,
  COMMAND_REQUIRED_SCOPES,
  COMMERCIAL_AUTHORITY_SCOPE_KEYS,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  DELIVERY_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_ACCESS_SCOPE_KEYS,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  canAllocateFinishedGoods,
  canAuthorizePaymentException,
  canConvertOwnEligibleQuote,
  canConvertQuoteToOrder,
  canEnterProduction,
  canReceiveFinishedGoods,
  canRecordCoordinatorWork,
  canRecordDelivery,
  canRecordProduction,
  canReviewProduction,
  coordinationCapabilityFromCargoOrTitle,
  finishedGoodsReceiptAllocatesToOrder,
  hasCoordinationDecisionCapability,
  receiptAllocatesToOrder,
  scopeImplies,
  scopesGrantedByCargoOrTitle,
} from '@isalwa/os-contracts';
import * as contracts from '@isalwa/os-contracts';

const TEAM_READ = [COMMERCIAL_TEAM_READ_SCOPE] as const;
const ORG_READ = [MANAGEMENT_ORG_READ_SCOPE] as const;
const PEOPLE_ADMIN = [PEOPLE_ADMIN_SCOPE] as const;

const QUOTE_MUTATION_COMMANDS = [
  'CreateQuote',
  'AddQuoteLine',
  'UpdateQuoteLine',
  'RemoveQuoteLine',
  'UpdateQuote',
  'SubmitQuote',
  'CancelQuote',
] as const;

const CARGO_AND_TITLE = ['Encargado', 'Jefe', 'Auxiliar'] as const;

function contractFunction(name: string): ((...args: unknown[]) => unknown) | null {
  const value = (contracts as Record<string, unknown>)[name];
  return typeof value === 'function' ? (value as (...args: unknown[]) => unknown) : null;
}

function registeredScopeKeys(): readonly string[] {
  return [
    ...OPERATIONS_ACCESS_SCOPE_KEYS,
    ...ADMIN_SCOPE_KEYS,
    ...COMMERCIAL_AUTHORITY_SCOPE_KEYS,
    ...ADDITIONAL_ASSIGNABLE_SCOPE_KEYS,
    ...Object.keys(COMMAND_REQUIRED_SCOPES),
    ...Object.values(COMMAND_REQUIRED_SCOPES),
  ];
}

describe('capability separation', () => {
  it('does not let commercial.team.read authorize visit mutation, quote mutation, or a payment exception', () => {
    assert.equal(COMMERCIAL_TEAM_READ_SCOPE.endsWith('.write'), false);
    assert.equal(COMMERCIAL_TEAM_READ_SCOPE.includes('write'), false);
    assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE);
    assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_ORDER_CONVERT_SCOPE);
    assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
    assert.equal(canAuthorizePaymentException(TEAM_READ), false);
    assert.equal(
      scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE),
      false,
    );
    assert.equal(
      scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE),
      false,
    );
    assert.equal(
      scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_ORDER_CONVERT_SCOPE),
      false,
    );
    assert.equal(
      canConvertOwnEligibleQuote({
        actorMemberId: 'mem-owner',
        quoteOwnerMemberId: 'mem-owner',
        quoteStatus: 'submitted',
        grantedScopes: TEAM_READ,
      }),
      false,
    );
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: 'mem-other',
        quoteOwnerMemberId: 'mem-owner',
        grantedScopes: TEAM_READ,
      }),
      false,
    );

    for (const command of QUOTE_MUTATION_COMMANDS) {
      const required = COMMAND_REQUIRED_SCOPES[command];
      assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, required);
      assert.equal(scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, required), false);
    }

    const quoteMutation = contractFunction('canMutateQuote') ?? contractFunction('canUpdateQuote');
    if (quoteMutation) {
      assert.notEqual(quoteMutation(TEAM_READ), true);
    } else {
      assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE);
      assert.deepEqual(scopesGrantedByCargoOrTitle('Encargado', 'Jefe'), []);
    }

    const visitMutation =
      contractFunction('canMutateVisit') ??
      contractFunction('canRecordVisit') ??
      contractFunction('canWriteVisit');
    const visitWriteKeys = registeredScopeKeys().filter((key) => /visit/i.test(key));
    assert.deepEqual(visitWriteKeys, []);
    if (visitMutation) {
      assert.notEqual(visitMutation(TEAM_READ), true);
    } else {
      assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE);
      assert.notEqual(COMMERCIAL_TEAM_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
      assert.deepEqual(scopesGrantedByCargoOrTitle('Auxiliar', 'Encargado'), []);
    }
  });

  it('does not let management.org.read authorize operational mutation', () => {
    assert.equal(canRecordProduction(ORG_READ), false);
    assert.equal(canReceiveFinishedGoods(ORG_READ), false);
    assert.equal(canRecordDelivery(ORG_READ), false);
    assert.equal(canAuthorizePaymentException(ORG_READ), false);
    assert.equal(scopeImplies(MANAGEMENT_ORG_READ_SCOPE, PRODUCTION_OPERATIONAL_RECORD_SCOPE), false);
    assert.equal(
      scopeImplies(MANAGEMENT_ORG_READ_SCOPE, WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE),
      false,
    );
    assert.equal(scopeImplies(MANAGEMENT_ORG_READ_SCOPE, DELIVERY_RECORD_SCOPE), false);
    assert.equal(
      scopeImplies(MANAGEMENT_ORG_READ_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE),
      false,
    );
  });

  it('does not let warehouse.finished_goods.receive imply warehouse.finished_goods.allocate', () => {
    assert.notEqual(WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE);
    assert.equal(
      scopeImplies(WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE),
      false,
    );
    assert.equal(
      canAllocateFinishedGoods({
        grantedScopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
        cargo: 'Encargado',
        title: 'Auxiliar',
      }),
      false,
    );
    assert.equal(canReceiveFinishedGoods([WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE]), true);
    assert.equal(canReceiveFinishedGoods([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]), false);
    assert.equal(
      canAllocateFinishedGoods({ grantedScopes: [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE] }),
      true,
    );
    assert.equal(receiptAllocatesToOrder(), false);
    assert.equal(finishedGoodsReceiptAllocatesToOrder(), false);
  });

  it('does not let operations.coordinator.record imply coordination.decision.record', () => {
    assert.notEqual(OPERATIONS_COORDINATOR_RECORD_SCOPE, COORDINATION_DECISION_CAPABILITY);
    assert.equal(
      scopeImplies(OPERATIONS_COORDINATOR_RECORD_SCOPE, COORDINATION_DECISION_CAPABILITY),
      false,
    );
    assert.equal(canRecordCoordinatorWork([OPERATIONS_COORDINATOR_RECORD_SCOPE]), true);
    assert.equal(hasCoordinationDecisionCapability([OPERATIONS_COORDINATOR_RECORD_SCOPE]), false);
    assert.equal(canRecordCoordinatorWork([COORDINATION_DECISION_CAPABILITY]), false);
    assert.equal(hasCoordinationDecisionCapability([COORDINATION_DECISION_CAPABILITY]), true);
    assert.deepEqual(coordinationCapabilityFromCargoOrTitle('Encargado', 'Jefe'), []);
  });

  it('does not let production.review.member imply production.entry.member', () => {
    assert.notEqual(PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE);
    assert.equal(scopeImplies(PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE), false);
    assert.equal(canReviewProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), true);
    assert.equal(canEnterProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]), false);
    assert.equal(canEnterProduction([PRODUCTION_ENTRY_MEMBER_SCOPE]), true);
    assert.equal(canReviewProduction([PRODUCTION_ENTRY_MEMBER_SCOPE]), false);
  });

  it('does not let people.admin authorize a payment exception, allocation, or production entry', () => {
    assert.notEqual(PEOPLE_ADMIN_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
    assert.notEqual(PEOPLE_ADMIN_SCOPE, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE);
    assert.notEqual(PEOPLE_ADMIN_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE);
    assert.equal(canAuthorizePaymentException(PEOPLE_ADMIN), false);
    assert.equal(canAllocateFinishedGoods({ grantedScopes: PEOPLE_ADMIN }), false);
    assert.equal(canEnterProduction(PEOPLE_ADMIN), false);
    assert.equal(scopeImplies(PEOPLE_ADMIN_SCOPE, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE), false);
    assert.equal(scopeImplies(PEOPLE_ADMIN_SCOPE, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE), false);
    assert.equal(scopeImplies(PEOPLE_ADMIN_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE), false);
    assert.equal(canAuthorizePaymentException([COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE]), true);
  });

  it('grants Encargado, Jefe, and Auxiliar cargo and title zero scopes', () => {
    for (const cargo of CARGO_AND_TITLE) {
      for (const title of CARGO_AND_TITLE) {
        const granted = scopesGrantedByCargoOrTitle(cargo, title);
        assert.deepEqual(granted, []);
        assert.deepEqual(coordinationCapabilityFromCargoOrTitle(cargo, title), []);
        assert.equal(canAuthorizePaymentException(granted), false);
        assert.equal(canReceiveFinishedGoods(granted), false);
        assert.equal(canRecordCoordinatorWork(granted), false);
        assert.equal(canRecordProduction(granted), false);
        assert.equal(canRecordDelivery(granted), false);
        assert.equal(canEnterProduction(granted), false);
        assert.equal(canReviewProduction(granted), false);
        assert.equal(hasCoordinationDecisionCapability(granted), false);
        assert.equal(
          canAllocateFinishedGoods({ grantedScopes: granted, cargo, title }),
          false,
        );
      }
      assert.deepEqual(scopesGrantedByCargoOrTitle(cargo, null), []);
      assert.deepEqual(scopesGrantedByCargoOrTitle(null, cargo), []);
    }
  });
});
