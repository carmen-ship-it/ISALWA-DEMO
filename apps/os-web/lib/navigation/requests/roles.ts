import {
  DEPARTMENT_LENSES,
  departmentLensAllowed,
  hasCommercialOwnWorkScope,
  hasCompanyCommercialRead,
  hasTeamCommercialRead,
  scopesFromAssignment,
  systemControlsAllowed,
} from '@/lib/roles/access';
import { SYSTEM_CONTROLS_HREF } from '@/lib/roles/system-controls';

export type RoleNavRequest = {
  id: string;
  href: string;
  label: string;
};

/**
 * Lenses to request. Omitted lenses are not returned.
 * This is not authorization: the home and search functions still deny a
 * direct call that lacks the session organization or the explicit scope.
 * Cargo and title are ignored.
 */
export function roleNavigationRequests(
  grantedScopes: readonly string[],
  cargo?: string | null,
  title?: string | null,
): RoleNavRequest[] {
  const scopes = scopesFromAssignment(grantedScopes, cargo, title);
  const requests: RoleNavRequest[] = [];
  if (hasCommercialOwnWorkScope(scopes)) {
    requests.push({ id: 'asesor', href: '/inicio', label: 'Su trabajo' });
  }
  if (hasTeamCommercialRead(scopes)) {
    requests.push({ id: 'jefe', href: '/inicio', label: 'Equipo comercial' });
  }
  if (hasCompanyCommercialRead(scopes)) {
    requests.push({ id: 'gerente', href: '/inicio', label: 'Excepciones de la empresa' });
  }
  for (const lens of DEPARTMENT_LENSES) {
    if (departmentLensAllowed(scopes, lens.scopes)) {
      requests.push({ id: lens.id, href: lens.href, label: lens.kicker });
    }
  }
  if (systemControlsAllowed(scopes)) {
    requests.push({
      id: 'system-controls',
      href: SYSTEM_CONTROLS_HREF,
      label: 'Controles del sistema',
    });
  }
  return requests;
}
