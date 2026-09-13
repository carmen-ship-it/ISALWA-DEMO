import { OsApiError } from '@/lib/api/os-api-errors';

export function mapCommandError(err: unknown): string {
  if (err instanceof OsApiError) {
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
