/** Plan ChangeRole would apply (os-workforce planRoleChange). */
export type RoleChangePlan = {
  memberId: string;
  newPrimaryRoleKey: string;
  endedPrimaryRoleKeys: string[];
  preservedAdditionalRoleKeys: string[];
  revokedAdditionalRoleKeys: string[];
  effectiveScopesBefore: string[];
  effectiveScopesAfter: string[];
  scopesGained: string[];
  scopesLost: string[];
};

export type RoleChangeRefusal =
  | 'not_authorized'
  | 'role_reserved'
  | 'role_invalid'
  | 'scope_not_held'
  | 'commercial_scope_not_primary'
  | 'revoke_not_held'
  | 'cannot_end_additional'
  | 'reach_beyond_grantor';

/**
 * Response of `GET /members/:memberId/role-change-preview`, evaluated with the
 * same rules as ChangeRole. A refused change carries no plan.
 */
export type RoleChangePreview =
  | ({ allowed: true } & RoleChangePlan)
  | { allowed: false; memberId: string; newPrimaryRoleKey: string; refusal: RoleChangeRefusal };

const REFUSAL_COPY: Record<RoleChangeRefusal, string> = {
  not_authorized: 'No tiene permiso para cambiar el rol principal.',
  role_reserved: 'Este rol está reservado y no se asigna desde aquí.',
  role_invalid: 'Este rol no es válido.',
  scope_not_held: 'Solo puede asignar un permiso que usted tiene por su propio rol.',
  commercial_scope_not_primary:
    'Los permisos comerciales se otorgan como permiso adicional, no como rol principal.',
  revoke_not_held: 'Solo puede retirar permisos adicionales que la persona tiene.',
  cannot_end_additional: 'No tiene permiso para retirar permisos adicionales.',
  reach_beyond_grantor: 'El cambio daría a la persona un alcance comercial mayor que el suyo.',
};

/** Spanish reason shown in place of the plan; unknown codes get a neutral message. */
export function roleChangeRefusalMessage(refusal: string): string {
  return REFUSAL_COPY[refusal as RoleChangeRefusal] ?? 'Este cambio no está permitido.';
}

export function readRevokeAdditionalRoleKeys(formData: FormData): string[] {
  return [
    ...new Set(
      formData
        .getAll('revokeAdditionalRoleKeys')
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ].sort();
}
