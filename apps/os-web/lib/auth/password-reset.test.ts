import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSWORD_RESET_COPY,
  buildPasswordResetRedirectUrl,
  isValidResetEmail,
  mapPasswordResetCallbackFailure,
  passwordResetCallbackMessage,
  validateNewPassword,
} from './password-reset';

describe('password reset helpers', () => {
  it('maps provider expiry without surfacing secrets', () => {
    assert.equal(
      mapPasswordResetCallbackFailure({ error: 'access_denied', errorCode: 'otp_expired' }),
      'expired',
    );
    const copy = passwordResetCallbackMessage('expired');
    assert.equal(copy, PASSWORD_RESET_COPY.resetExpired);
    assert.equal(/token|password|stack|provider/i.test(copy), false);
  });

  it('validates email and new password fail-closed', () => {
    assert.equal(isValidResetEmail(''), false);
    assert.equal(isValidResetEmail('not-an-email'), false);
    assert.equal(isValidResetEmail('w2.asesor@isalwa.demo'), true);
    assert.equal(validateNewPassword('short', 'short'), PASSWORD_RESET_COPY.resetTooShort);
    assert.equal(validateNewPassword('longenough', 'different1'), PASSWORD_RESET_COPY.resetMismatch);
    assert.equal(validateNewPassword('longenough', 'longenough'), null);
  });

  it('builds redirect URLs only for allowed origins', () => {
    assert.equal(
      buildPasswordResetRedirectUrl({ configuredOrigin: 'https://os-web-staging.onrender.com' }),
      'https://os-web-staging.onrender.com/auth/reset-password',
    );
    assert.equal(
      buildPasswordResetRedirectUrl({ host: 'os-web-staging.onrender.com', proto: 'https' }),
      'https://os-web-staging.onrender.com/auth/reset-password',
    );
    assert.equal(
      buildPasswordResetRedirectUrl({ host: 'localhost:3200', proto: 'http' }),
      'http://localhost:3200/auth/reset-password',
    );
    assert.equal(buildPasswordResetRedirectUrl({ host: 'evil.example', proto: 'https' }), null);
    assert.equal(
      buildPasswordResetRedirectUrl({ configuredOrigin: 'https://user:pass@evil.example' }),
      null,
    );
  });

  it('exposes Spanish login link copy without English defaults', () => {
    assert.match(PASSWORD_RESET_COPY.loginForgotLink, /contraseña/i);
    assert.match(PASSWORD_RESET_COPY.forgotSuccess, /enlace/i);
  });
});
