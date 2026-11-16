/**
 * One vocabulary for "the action did not complete". Each line is used only when it is
 * true for the response we actually have:
 *
 * - SAVE_REFUSED     the server definitively refused; nothing was written; the form keeps its values.
 * - RECORD_CHANGED   a concurrent change won (optimistic version / one-winner conflict).
 * - ACCESS_CHANGED   the actor lost the authority between page load and submit.
 * - SESSION_ENDED    no valid session; nothing was replayed.
 * - OUTCOME_UNKNOWN  timeout, network failure or 5xx: the write may have happened, so we ask the
 *                    person to reconcile instead of claiming "not saved".
 * - SEND_UNCONFIRMED same, for an outbound send: never invite a blind re-send.
 */
import { OsApiError } from '@/lib/api/os-api-errors';

export const ACTION_FAILURE_COPY = {
  SAVE_REFUSED: 'No pudimos guardar los cambios. Tus datos siguen aquí.',
  RECORD_CHANGED:
    'Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar.',
  ACCESS_CHANGED:
    'Tu acceso cambió. Esta acción no se realizó. Solicita ayuda a tu responsable.',
  SESSION_ENDED: 'Tu sesión terminó. Inicia sesión para continuar.',
  OUTCOME_UNKNOWN:
    'No pudimos confirmar si se guardó. Actualiza la página y revisa el registro antes de intentar de nuevo.',
  SEND_UNCONFIRMED: 'No pudimos confirmar el envío. Revisa el estado antes de reenviar.',
} as const;

export type ActionFailureKey = keyof typeof ACTION_FAILURE_COPY;

export type ActionFailureContext = {
  /** An outbound send: an unknown outcome must never invite a blind re-send. */
  send?: boolean;
};

/**
 * Classify a thrown command failure. Returns null when a more specific, equally true
 * message (validation, missing record, locked capability) should be used by the caller.
 */
export function classifyActionFailure(
  err: unknown,
  context: ActionFailureContext = {},
): ActionFailureKey | null {
  const unknownOutcome: ActionFailureKey = context.send ? 'SEND_UNCONFIRMED' : 'OUTCOME_UNKNOWN';
  if (!(err instanceof OsApiError)) return unknownOutcome;

  if (err.kind === 'unauthorized') return 'SESSION_ENDED';
  if (err.kind === 'forbidden') return 'ACCESS_CHANGED';
  if (err.kind === 'conflict' || err.status === 409) {
    return err.code === 'IDEMPOTENCY_REPLAY' ? null : 'RECORD_CHANGED';
  }
  if (err.kind === 'validation' || err.kind === 'not_found' || err.kind === 'locked') return null;
  if (err.kind === 'unavailable' || err.status >= 500) return unknownOutcome;
  // Any other 4xx is a definite refusal.
  return 'SAVE_REFUSED';
}

export function actionFailureCopy(key: ActionFailureKey): string {
  return ACTION_FAILURE_COPY[key];
}
