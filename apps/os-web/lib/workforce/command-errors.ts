import { OsApiError } from '@/lib/api/os-api-errors';
import type { Ui2bWorkforceCommand } from '@/lib/workforce/command-types';

const OPEN_WORK_TERMINATE_MESSAGE =
  'No se puede finalizar todavía porque esta persona tiene trabajo abierto. Reasigna ese trabajo primero.';

export function mapWorkforceCommandError(
  command: Ui2bWorkforceCommand,
  err: unknown,
): string {
  if (err instanceof OsApiError) {
    switch (err.kind) {
      case 'unauthorized':
        return 'Su sesión venció. Vuelva a iniciar sesión.';
      case 'forbidden':
        if (err.code === 'ACCESS_REVOKED') {
          return 'Su cuenta está desactivada. Contacte a administración.';
        }
        return 'No tiene permiso para realizar esta acción.';
      case 'not_found':
        return 'No se encontró el registro. Actualice la página e intente de nuevo.';
      case 'validation':
        if (command === 'TerminateMember') {
          return OPEN_WORK_TERMINATE_MESSAGE;
        }
        if (command === 'ActivateMember') {
          return 'No se puede reactivar este acceso. Verifique el estado del empleado.';
        }
        return 'Revise los datos ingresados e intente de nuevo.';
      case 'conflict':
        return 'La acción no pudo completarse por un conflicto. Actualice e intente de nuevo.';
      case 'unavailable':
        return 'El servicio no está disponible temporalmente. Intente más tarde.';
      default:
        return err.message || 'Ocurrió un error. Intente de nuevo.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error. Intente de nuevo.';
}

export { OPEN_WORK_TERMINATE_MESSAGE };
