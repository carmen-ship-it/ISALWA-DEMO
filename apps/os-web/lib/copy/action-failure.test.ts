import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError, type OsApiFailureKind } from '@/lib/api/os-api-errors';
import { ACTION_FAILURE_COPY, actionFailureCopy, classifyActionFailure } from './action-failure';
import { mapCommandError } from '@/lib/commercial/command-errors';

const apiError = (kind: OsApiFailureKind, status: number, code = 'X') =>
  new OsApiError({ kind, status, code, message: 'm' });

describe('consistent action-failure copy (CONTINUATION §13)', () => {
  it('uses the four exact lines Carmen specified', () => {
    assert.equal(ACTION_FAILURE_COPY.SAVE_REFUSED, 'No pudimos guardar los cambios. Tus datos siguen aquí.');
    assert.equal(
      ACTION_FAILURE_COPY.RECORD_CHANGED,
      'Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar.',
    );
    assert.equal(
      ACTION_FAILURE_COPY.ACCESS_CHANGED,
      'Tu acceso cambió. Esta acción no se realizó. Solicita ayuda a tu responsable.',
    );
    assert.equal(ACTION_FAILURE_COPY.SESSION_ENDED, 'Tu sesión terminó. Inicia sesión para continuar.');
  });

  it('states an outcome only when it is true', () => {
    assert.equal(classifyActionFailure(apiError('unauthorized', 401)), 'SESSION_ENDED');
    assert.equal(classifyActionFailure(apiError('forbidden', 403)), 'ACCESS_CHANGED');
    assert.equal(classifyActionFailure(apiError('conflict', 409, 'VERSION_CONFLICT')), 'RECORD_CHANGED');
    assert.equal(classifyActionFailure(apiError('unknown', 400)), 'SAVE_REFUSED');
  });

  it('an unknown outcome (5xx, network, non-API error) never claims "not saved"', () => {
    for (const err of [apiError('unavailable', 503), apiError('unknown', 500), new TypeError('fetch failed')]) {
      const key = classifyActionFailure(err);
      assert.equal(key, 'OUTCOME_UNKNOWN');
      assert.doesNotMatch(actionFailureCopy(key!), /no se guard|Tus datos siguen/i);
      assert.match(actionFailureCopy(key!), /No pudimos confirmar si se guardó/);
    }
  });

  it('an unconfirmed send never invites a blind re-send', () => {
    const key = classifyActionFailure(apiError('unavailable', 503), { send: true });
    assert.equal(key, 'SEND_UNCONFIRMED');
    assert.match(actionFailureCopy(key!), /Revisa el estado antes de reenviar/);
  });

  it('idempotent replay and specific errors keep their own, more precise message', () => {
    assert.equal(classifyActionFailure(apiError('conflict', 409, 'IDEMPOTENCY_REPLAY')), null);
    assert.equal(classifyActionFailure(apiError('validation', 422)), null);
    assert.equal(classifyActionFailure(apiError('not_found', 404)), null);
  });

  it('the central command mapper uses this vocabulary for every form', () => {
    assert.equal(mapCommandError(apiError('conflict', 409, 'VERSION_CONFLICT')), ACTION_FAILURE_COPY.RECORD_CHANGED);
    assert.equal(mapCommandError(apiError('forbidden', 403)), ACTION_FAILURE_COPY.ACCESS_CHANGED);
    assert.equal(mapCommandError(apiError('unauthorized', 401)), ACTION_FAILURE_COPY.SESSION_ENDED);
    assert.equal(mapCommandError(apiError('unavailable', 503)), ACTION_FAILURE_COPY.OUTCOME_UNKNOWN);
  });
});
