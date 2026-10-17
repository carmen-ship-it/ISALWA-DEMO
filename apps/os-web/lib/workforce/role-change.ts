/** Response of `GET /members/:memberId/role-change-preview` (os-workforce planRoleChange). */
export type RoleChangePreview = {
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
