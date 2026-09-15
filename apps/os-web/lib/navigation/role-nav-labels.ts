/**
 * Role-aware *labeling* for the primary shell nav.
 * Does not hide, lock, or authorize destinations — pages still fail closed.
 */

import { roleNavigationRequests } from '@/lib/navigation/requests/roles';
import { DEPARTMENT_LENSES } from '@/lib/roles/access';

export type RoleNavPresentation = {
  /** Override label for Inicio when a commercial lens applies. */
  inicioLabel: string | null;
  /** Short sidebar focus line; employee language only. */
  focusLabel: string | null;
  /** Nav item ids that match the actor's operating lens (visual emphasis only). */
  emphasizedIds: readonly string[];
};

const INICIO_PRIORITY = ['gerente', 'jefe', 'asesor'] as const;

const LENS_TO_NAV_ID: Record<string, string> = {
  produccion: 'produccion',
  almacen: 'almacen',
  compras: 'compras',
  contabilidad: 'finanzas',
  auxiliar: 'coordinacion',
};

/**
 * Derive display-only role presentation from trusted scopes.
 * Cargo and title are ignored (same contract as roleNavigationRequests).
 */
export function roleNavPresentation(grantedScopes: readonly string[]): RoleNavPresentation {
  const requests = roleNavigationRequests(grantedScopes);
  const byId = new Map(requests.map((item) => [item.id, item]));

  let inicioLabel: string | null = null;
  for (const id of INICIO_PRIORITY) {
    const hit = byId.get(id);
    if (hit) {
      inicioLabel = hit.label;
      break;
    }
  }

  const emphasized = new Set<string>();
  if (inicioLabel) {
    emphasized.add('inicio');
    emphasized.add('clientes');
    emphasized.add('oportunidades');
    emphasized.add('cotizaciones');
    emphasized.add('trabajo');
  }

  const departmentLabels: string[] = [];
  for (const lens of DEPARTMENT_LENSES) {
    if (!byId.has(lens.id)) continue;
    departmentLabels.push(lens.kicker);
    const navId = LENS_TO_NAV_ID[lens.id];
    if (navId) emphasized.add(navId);
  }

  if (byId.has('system-controls')) {
    // Controles del sistema is not a primary-nav item; no emphasis id.
  }

  const focusLabel =
    departmentLabels[0] ??
    (inicioLabel === 'Excepciones de la empresa'
      ? 'Vista de la empresa'
      : inicioLabel === 'Equipo comercial'
        ? 'Equipo comercial'
        : inicioLabel === 'Su trabajo'
          ? 'Su trabajo diario'
          : null);

  return {
    inicioLabel,
    focusLabel,
    emphasizedIds: [...emphasized],
  };
}

export function labelForNavItem(
  itemId: string,
  defaultLabel: string,
  presentation: RoleNavPresentation,
): string {
  if (itemId === 'inicio' && presentation.inicioLabel) {
    return presentation.inicioLabel;
  }
  return defaultLabel;
}
