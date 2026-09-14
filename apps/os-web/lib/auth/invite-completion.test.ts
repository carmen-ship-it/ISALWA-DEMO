import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inviteCompletionMessage,
  inviteCompletionView,
  mapInviteCallbackFailure,
  readInviteCompletionCode,
} from './invite-completion';

describe('invite completion UX', () => {
  it('maps provider expiry and hides raw codes from people', () => {
    assert.equal(mapInviteCallbackFailure({ error: 'access_denied', errorCode: 'otp_expired' }), 'expired');
    assert.equal(inviteCompletionMessage('expired'), 'Esta invitación ya no es válida. Solicite una nueva invitación.');
    assert.equal(inviteCompletionMessage('already_completed'), 'Este acceso ya fue activado. Inicie sesión.');
    assert.equal(inviteCompletionMessage('wrong_account'), 'Esta invitación corresponde a otra cuenta.');
    assert.equal(inviteCompletionMessage('not_invited'), 'No encontramos una invitación válida para esta cuenta.');
    assert.equal(inviteCompletionMessage('ready'), 'Su acceso a ISALWA está listo.');
  });

  it('does not accept unknown codes or surface secrets', () => {
    assert.equal(readInviteCompletionCode({ code: 'activated' }), 'activated');
    assert.equal(readInviteCompletionCode({ code: 'token_hash=abc', password: 'secret' }), 'INTERNAL_ERROR');
    assert.equal(inviteCompletionView('suspended'), 'expired');
    const copy = inviteCompletionMessage(inviteCompletionView('INTERNAL_ERROR'));
    assert.equal(/token|password|stack|providerSubject/i.test(copy), false);
  });
});
