import { OsApiError } from '@/lib/api/os-api-errors';

export const TARGET_PREREQUISITE_MISSING_COPY =
  'La persona elegida todavía no puede atender a este cliente. Asígnele primero la cuenta o una cobertura que incluya el trabajo comercial, y vuelva a intentarlo.';

export function mapCommandError(err: unknown): string {
  if (err instanceof OsApiError) {
    if (err.code === 'TARGET_PREREQUISITE_MISSING') return TARGET_PREREQUISITE_MISSING_COPY;
    switch (err.kind) {
      case 'unauthorized':
        return 'Su sesión venció. Vuelva a iniciar sesión.';
      case 'forbidden':
        return 'No tiene permiso para realizar esta acción.';
      case 'not_found':
        return 'No se encontró el registro. Actualice la página e intente de nuevo.';
      case 'validation':
        return 'Revise los datos ingresados e intente de nuevo.';
      case 'conflict':
        return 'Esa acción ya se registró o la página quedó desactualizada. Actualice antes de intentar de nuevo. No se creó un duplicado.';
      case 'locked':
        return 'Esta función aún no está habilitada para su empresa.';
      case 'unavailable':
        return 'El servicio no está disponible temporalmente. Intente más tarde.';
      default:
        return 'No se pudo completar la acción. Intente de nuevo.';
    }
  }
  return 'No se pudo completar la acción. Intente de nuevo.';
}
