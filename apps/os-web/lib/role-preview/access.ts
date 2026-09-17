import {
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  SYSTEM_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import { previewScopesForPersona } from '@/lib/role-preview/presets';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

/** Owner / people admin may open Vista de evaluación (UI preview only). */
export function canUseRolePreview(grantedScopes: readonly string[]): boolean {
  if (grantedScopes.includes(PEOPLE_ADMIN_SCOPE)) return true;
  if (
    grantedScopes.includes(MANAGEMENT_ORG_READ_SCOPE) &&
    grantedScopes.includes(SYSTEM_ADMIN_SCOPE)
  ) {
    return true;
  }
  return false;
}

export function effectiveNavScopes(
  actualScopes: readonly string[],
  persona: RolePreviewPersonaId | 'own' | null,
): readonly string[] {
  if (!persona || persona === 'own') return actualScopes;
  return previewScopesForPersona(persona);
}

export function rolePreviewBlocksMutations(persona: RolePreviewPersonaId | 'own' | null): boolean {
  return persona !== null && persona !== 'own';
}

/** @deprecated use canUseRolePreview */
export function viewerMayUseRolePreview(grantedScopes: readonly string[]): boolean {
  return canUseRolePreview(grantedScopes);
}
