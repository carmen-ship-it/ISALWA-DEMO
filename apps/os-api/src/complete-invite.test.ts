import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CROSS_LANE_CHANGE_REQUEST } from '@isalwa/os-workforce';
import { decideInviteCompletionHttp, inviteCompletionHttpBody, inviteCompletionHttpStatus } from './complete-invite';

const verified = {
  id: 'provider-user-1',
  email: 'ana@isalwa.bo',
  emailConfirmedAt: '2026-09-14T12:00:00Z',
};

describe('complete-invite HTTP authority', () => {
  it('denies a missing provider session', () => {
    const decision = decideInviteCompletionHttp(null, {});
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 401);
      assert.equal(decision.code, 'unauthenticated');
    }
  });

  it('ignores browser member, organization, and subject, and rejects a conflicting email', () => {
    const accepted = decideInviteCompletionHttp(verified, {
      memberId: 'browser-member',
      organizationId: 'browser-org',
      providerSubject: 'browser-subject',
      email: 'ana@isalwa.bo',
    });
    assert.equal(accepted.ok, true);
    if (accepted.ok) {
      assert.equal(accepted.providerSubject, 'provider-user-1');
      assert.equal(accepted.verifiedEmail, 'ana@isalwa.bo');
    }

    const wrong = decideInviteCompletionHttp(verified, { email: 'other@isalwa.bo', memberId: 'm-b' });
    assert.equal(wrong.ok, false);
    if (!wrong.ok) assert.equal(wrong.code, 'wrong_account');
  });

  it('does not treat an unconfirmed email as proof of control', () => {
    const decision = decideInviteCompletionHttp({ ...verified, emailConfirmedAt: null }, {});
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'email_unverified');
  });

  it('keeps denial status fail-closed', () => {
    assert.equal(inviteCompletionHttpStatus('not_invited'), 403);
    assert.equal(inviteCompletionHttpStatus('activated'), 200);
    assert.equal(inviteCompletionHttpStatus('already_completed'), 200);
  });

  it('returns CROSS_LANE_CHANGE_REQUEST without member rows when the invite is unbound', () => {
    assert.equal(CROSS_LANE_CHANGE_REQUEST, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(inviteCompletionHttpStatus(CROSS_LANE_CHANGE_REQUEST), 403);
    const body = inviteCompletionHttpBody(CROSS_LANE_CHANGE_REQUEST);
    assert.deepEqual(body, { code: 'CROSS_LANE_CHANGE_REQUEST' });
    assert.equal('memberId' in body, false);
    assert.equal('organizationId' in body, false);
  });
});
