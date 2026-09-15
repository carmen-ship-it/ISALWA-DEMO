import { SYSTEM_ADMIN_SCOPE } from '@isalwa/os-contracts';
import { systemControlsAllowed } from '@/lib/roles/access';

/**
 * Own destination for system.admin Controles del sistema.
 * Not /administracion (people.admin). system.admin does not imply people.admin.
 */
export const SYSTEM_CONTROLS_HREF = '/sistema' as const;

export function systemControlsHref(): string {
  return SYSTEM_CONTROLS_HREF;
}

export function mayOpenSystemControls(grantedScopes: readonly string[]): boolean {
  return systemControlsAllowed(grantedScopes);
}

/** Exact contract meaning used by Controles del sistema (technical layer). */
export const SYSTEM_ADMIN_MEANING = {
  scope: SYSTEM_ADMIN_SCOPE,
  tenantBound: true,
  rewritesHistory: false,
  impliesPeopleAdmin: false,
  includesIntegrationHealth: false,
  separateFromBusinessHome: true,
} as const;
