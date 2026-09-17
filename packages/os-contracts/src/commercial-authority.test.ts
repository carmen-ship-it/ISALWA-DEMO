import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER,
  canConvertOwnEligibleQuote,
  canConvertQuoteToOrder,
  canReassignCommercialAccountOwner,
  canRequestCommercialSubjectApproval,
  isOrderApprovalEligible,
  isQuoteApprovalEligible,
} from './index';

const OWNER = 'mem-owner';
const OTHER = 'mem-other';

describe('provisional commercial authority', () => {
  it('lets the quote owner convert only with commercial.quote.convert.own', () => {
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OWNER,
        grantedScopes: ['sales_rep'],
        quoteOwnerMemberId: OWNER,
      }),
      false,
    );
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OWNER,
        grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
        quoteOwnerMemberId: OWNER,
      }),
      true,
    );
  });

  it('lets an explicit conversion capability convert someone else quote', () => {
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OTHER,
        grantedScopes: [COMMERCIAL_ORDER_CONVERT_SCOPE],
        quoteOwnerMemberId: OWNER,
      }),
      true,
    );
  });

  it('denies an unrelated active member', () => {
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OTHER,
        grantedScopes: ['sales_rep'],
        quoteOwnerMemberId: OWNER,
      }),
      false,
    );
  });

  it('does not treat read-only leadership or people.admin as conversion authority', () => {
    for (const scope of ['commercial.team.read', 'commercial.org.read', 'people.admin']) {
      assert.equal(
        canConvertQuoteToOrder({
          actorMemberId: OTHER,
          grantedScopes: [scope],
          quoteOwnerMemberId: OWNER,
        }),
        false,
        scope,
      );
    }
  });

  it('wires commercial.quote.convert.own into CreateOrder for the own-quote path only', () => {
    assert.equal(QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER, true);
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OTHER,
        grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
        quoteOwnerMemberId: OWNER,
      }),
      false,
    );
    assert.equal(
      canConvertOwnEligibleQuote({
        actorMemberId: OWNER,
        quoteOwnerMemberId: OWNER,
        quoteStatus: 'submitted',
        grantedScopes: [COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
      }),
      true,
    );
  });

  it('does not let temporary coverage authorize convert', () => {
    const coverage = {
      allowed: true as const,
      customerPartyId: 'party-1',
      primaryOwnerMemberId: OWNER,
      actingAdvisorMemberId: OTHER,
      auditActorMemberId: OTHER,
      sharedOwnership: false as const,
    };
    assert.equal(
      canConvertQuoteToOrder({
        actorMemberId: OTHER,
        grantedScopes: [],
        quoteOwnerMemberId: OWNER,
        coverage,
      }),
      false,
    );
  });

  it('does not treat read-only leadership, ownership, or people.admin as reassignment authority', () => {
    assert.equal(canReassignCommercialAccountOwner(['people.admin']), false);
    assert.equal(canReassignCommercialAccountOwner(['commercial.team.read']), false);
    assert.equal(canReassignCommercialAccountOwner(['commercial.org.read']), false);
    assert.equal(canReassignCommercialAccountOwner([]), false);
    assert.equal(canReassignCommercialAccountOwner([COMMERCIAL_ACCOUNT_REASSIGN_SCOPE]), true);
  });

  it('allows commercial approval requests only from the subject owner', () => {
    assert.equal(
      canRequestCommercialSubjectApproval({
        actorMemberId: OWNER,
        subjectOwnerMemberId: OWNER,
      }),
      true,
    );
    assert.equal(
      canRequestCommercialSubjectApproval({
        actorMemberId: OTHER,
        subjectOwnerMemberId: OWNER,
      }),
      false,
    );
  });

  it('keeps approval subjects to submitted quotes and open orders', () => {
    assert.equal(isQuoteApprovalEligible('submitted'), true);
    assert.equal(isQuoteApprovalEligible('draft'), false);
    assert.equal(isQuoteApprovalEligible('cancelled'), false);
    assert.equal(isQuoteApprovalEligible('accepted'), false);
    assert.equal(isOrderApprovalEligible('open'), true);
    assert.equal(isOrderApprovalEligible('cancelled'), false);
  });
});
