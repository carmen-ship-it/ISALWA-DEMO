import { OsApiError } from '@/lib/api/os-api-errors';
import {
  actionFailureCopy,
  classifyActionFailure,
  type ActionFailureContext,
} from '@/lib/copy/action-failure';

export const TARGET_PREREQUISITE_MISSING_COPY =
  'La persona elegida todavía no puede atender a este cliente. Asígnele primero la cuenta o una cobertura que incluya el trabajo comercial, y vuelva a intentarlo.';

export const IDEMPOTENT_REPLAY_COPY =
  'Esa acción ya se registró. Actualiza la página antes de intentar de nuevo. No se creó un duplicado.';

/**
 * Staff-facing copy for a failed command. The wording that states an outcome
 * (saved / not saved / changed / access / session) lives in `lib/copy/action-failure`.
 */
export function mapCommandError(err: unknown, context: ActionFailureContext = {}): string {
  if (err instanceof OsApiError && err.code === 'TARGET_PREREQUISITE_MISSING') {
    return TARGET_PREREQUISITE_MISSING_COPY;
  }
  const key = classifyActionFailure(err, context);
  if (key) return actionFailureCopy(key);
  if (err instanceof OsApiError) {
    switch (err.kind) {
      case 'not_found':
        return 'No se encontró el registro. Actualice la página e intente de nuevo.';
      case 'validation':
        return 'Revise los datos ingresados e intente de nuevo.';
      case 'locked':
        return 'Esta función aún no está habilitada para su empresa.';
      case 'conflict':
        return IDEMPOTENT_REPLAY_COPY;
      default:
        break;
    }
  }
  return actionFailureCopy('SAVE_REFUSED');
}
