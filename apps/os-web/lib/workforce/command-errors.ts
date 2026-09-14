import { OsApiError } from '@/lib/api/os-api-errors';
import type { PeopleV1InviteCommand, Ui2bWorkforceCommand } from '@/lib/workforce/command-types';

const OPEN_WORK_TERMINATE_MESSAGE =
  'No se puede finalizar todavía porque esta persona tiene trabajo abierto. Reasigne ese trabajo primero.';

const GENERIC_ERROR = 'Ocurrió un error. Intente de nuevo.';

function isInternalStaffMessage(text: string): boolean {
  if (/[a-z]+_[a-z0-9]+/i.test(text)) return true;
  if (/\b(providerSubject|organizationId|capabilityKey|stack|undefined)\b/i.test(text)) return true;
  const spanish = /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(text);
  if (
    !spanish &&
    /\b(error|failed|invalid|unauthorized|forbidden|not found|required|internal|provider)\b/i.test(text)
  ) {
    return true;
  }
  return false;
}

function staffFacingMessage(message: string | undefined, fallback: string): string {
  const text = message?.trim() ?? '';
  if (!text || isInternalStaffMessage(text)) return fallback;
  return text;
}

export const INVITE_PROVIDER_NOT_CONFIGURED_MESSAGE =
  'El proveedor de acceso no está configurado. La invitación no se envió y no se creó una contraseña.';

export const INVITE_PROVIDER_FAILED_MESSAGE =
  'El proveedor de acceso no pudo enviar la invitación. No se creó una contraseña. El alta no se completó.';

type MappedWorkforceCommand = Ui2bWorkforceCommand | PeopleV1InviteCommand;

export function mapWorkforceCommandError(
  command: MappedWorkforceCommand,
  err: unknown,
): string {
  if (err instanceof OsApiError) {
    if (command === 'InviteMember' && err.code === 'PROVIDER_NOT_CONFIGURED') {
      return INVITE_PROVIDER_NOT_CONFIGURED_MESSAGE;
    }
    if (command === 'InviteMember' && err.code === 'PROVIDER_INVITE_FAILED') {
      return INVITE_PROVIDER_FAILED_MESSAGE;
    }
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
        return 'Esa acción ya se registró o la página quedó desactualizada. Actualice antes de intentar de nuevo.';
      case 'unavailable':
        return 'El servicio no está disponible temporalmente. Intente más tarde.';
      default:
        return staffFacingMessage(err.message, GENERIC_ERROR);
    }
  }
  if (err instanceof Error) return staffFacingMessage(err.message, GENERIC_ERROR);
  return GENERIC_ERROR;
}

export { OPEN_WORK_TERMINATE_MESSAGE };
