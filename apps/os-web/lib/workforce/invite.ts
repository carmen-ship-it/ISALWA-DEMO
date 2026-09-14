import { InviteMemberPayloadSchema } from '@isalwa/os-contracts';

/** Fields the canonical InviteMember command actually persists. */
export const INVITE_FORM_FIELD_NAMES = [
  'email',
  'givenName',
  'familyName',
  'roleKey',
  'departmentId',
] as const;

export const INVITE_EMPLOYEE_ACTION_LABEL = 'Invitar empleado';

/**
 * Manager is in the payload schema but InviteMember does not persist it.
 * Do not collect it here — ChangeManager remains the assignment path.
 */
export const INVITE_OMITTED_COMMAND_FIELDS = ['managerMemberId'] as const;

export const INVITE_FORBIDDEN_FIELDS = [
  'password',
  'passwordReset',
  'cargo',
  'title',
  'jobTitle',
] as const;

export const INVITE_PROVIDER_NOTICE =
  'La invitación la acepta el proveedor de acceso. Esta pantalla no crea ni restablece contraseñas. La persona completa su acceso en ese proveedor. El acceso al sistema queda pendiente hasta que el proveedor vincule la identidad.';

export const INVITE_ROLE_NOTICE =
  'Elija un rol del sistema. No se infiere del cargo. Administración de personas no se asigna sola: solo queda si la elige.';

export const INVITE_MANAGER_NOTICE =
  'El responsable no forma parte de esta invitación. Se asigna después, en la ficha, cuando la persona está activa.';

export const INVITE_NO_ROLES_NOTICE =
  'No hay roles registrados en el equipo. La invitación exige un rol explícito. No se infiere del cargo ni se asigna administración de personas automáticamente.';

export function inviteEmployeeVisible(access: { peopleAdmin: boolean }): boolean {
  return access.peopleAdmin;
}

export type InviteMemberPayload = {
  email: string;
  givenName: string;
  familyName: string;
  roleKey: string;
  departmentId?: string;
};

export function buildInviteMemberPayload(input: {
  email: string;
  givenName: string;
  familyName: string;
  roleKey: string;
  departmentId?: string;
}): { ok: true; payload: InviteMemberPayload } | { ok: false; error: string } {
  const email = input.email.trim();
  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  const roleKey = input.roleKey.trim();
  const departmentId = input.departmentId?.trim() || undefined;

  const candidate: InviteMemberPayload = {
    email,
    givenName,
    familyName,
    roleKey,
    ...(departmentId ? { departmentId } : {}),
  };

  const parsed = InviteMemberPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: 'Revise correo, nombre, apellido y rol. El rol es obligatorio y no se infiere del cargo.' };
  }

  const payload = parsed.data as InviteMemberPayload;
  if (!payload.roleKey || payload.roleKey !== roleKey) {
    return { ok: false, error: 'Seleccione un rol. No se asigna administración de personas automáticamente.' };
  }

  return { ok: true, payload };
}
