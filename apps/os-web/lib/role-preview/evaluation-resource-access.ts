/**
 * Resource-universe filters for Vista de evaluación.
 * Never elevates; empty when Asesor subject missing.
 */
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

export type EvaluationOpsDesk =
  | 'commercial'
  | 'produccion'
  | 'almacen'
  | 'compras'
  | 'entregas'
  | 'finanzas'
  | 'gerencia'
  | 'map'
  | 'conversations'
  | 'trabajo'
  | 'aprobaciones'
  | 'compromisos'
  | 'incidencias';

const OPS_PERSONAS: readonly RolePreviewPersonaId[] = [
  'produccion',
  'almacen',
  'compras',
  'entregas',
  'finanzas',
];

const DESK_PERSONAS: Record<EvaluationOpsDesk, readonly RolePreviewPersonaId[]> = {
  commercial: ['asesor', 'jefe-comercial', 'gerencia'],
  produccion: ['produccion', 'gerencia'],
  almacen: ['almacen', 'gerencia'],
  compras: ['compras', 'gerencia'],
  entregas: ['entregas', 'gerencia'],
  finanzas: ['finanzas', 'gerencia'],
  gerencia: ['gerencia'],
  map: ['asesor', 'jefe-comercial', 'gerencia', 'entregas'],
  conversations: ['asesor', 'jefe-comercial', 'gerencia'],
  trabajo: ['asesor', 'jefe-comercial', 'gerencia', 'produccion', 'almacen', 'compras', 'entregas', 'finanzas'],
  /** Approval authority projection — Asesor/ops never elevated into this desk. */
  aprobaciones: ['jefe-comercial', 'gerencia'],
  compromisos: ['asesor', 'jefe-comercial', 'gerencia', 'produccion', 'almacen', 'compras', 'entregas', 'finanzas'],
  incidencias: ['asesor', 'jefe-comercial', 'gerencia', 'produccion', 'almacen', 'compras', 'entregas', 'finanzas'],
};

export function evaluationIsOpsPersona(
  persona: RolePreviewPersonaId | null | undefined,
): boolean {
  return Boolean(persona && OPS_PERSONAS.includes(persona));
}

/** True when View As persona may see the Aprobaciones desk (never elevates real auth). */
export function evaluationAllowsApprovalAuthority(projection: EvaluationProjection): boolean {
  return evaluationAllowsDesk(projection, 'aprobaciones');
}

/** Owner-eval (inactive) sees all desks. Active preview must match persona. */
export function evaluationAllowsDesk(
  projection: EvaluationProjection,
  desk: EvaluationOpsDesk,
): boolean {
  if (!projection.active || !projection.persona) return true;
  return DESK_PERSONAS[desk].includes(projection.persona);
}

/** Shell nav ids that stay visible under Vista de evaluación regardless of desk. */
const EVALUATION_ALWAYS_VISIBLE_NAV_IDS = new Set([
  'inicio',
  'excepciones',
  'trabajo',
  'compromisos',
  'incidencias',
  'ayuda',
]);

/** Maps primary shell nav ids to evaluation desk gates (null = not desk-gated). */
export function navItemEvaluationDesk(navId: string): EvaluationOpsDesk | null {
  switch (navId) {
    case 'clientes':
    case 'oportunidades':
    case 'cotizaciones':
    case 'pedidos':
      return 'commercial';
    case 'mapa':
      return 'map';
    case 'conversaciones':
      return 'conversations';
    case 'aprobaciones':
      return 'aprobaciones';
    case 'produccion':
      return 'produccion';
    case 'almacen':
      return 'almacen';
    case 'compras':
      return 'compras';
    case 'entregas':
      return 'entregas';
    case 'finanzas':
      return 'finanzas';
    case 'auditoria':
      return 'gerencia';
    default:
      return null;
  }
}

export function evaluationNavItemVisible(
  projection: EvaluationProjection,
  navId: string,
): boolean {
  if (!projection.active) return true;
  if (EVALUATION_ALWAYS_VISIBLE_NAV_IDS.has(navId)) return true;
  const desk = navItemEvaluationDesk(navId);
  if (!desk) return true;
  return evaluationAllowsDesk(projection, desk);
}

export function evaluationAllowsCommercialOwner(
  projection: EvaluationProjection,
  ownerMemberId: string | null | undefined,
): boolean {
  if (!projection.active) return true;
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) return false;
    return Boolean(ownerMemberId) && ownerMemberId === projection.subjectMemberId;
  }
  // Jefe/Gerencia and ops personas: commercial ownership not person-sliced here
  // (list APIs apply team/org visibility separately).
  return true;
}

export function filterByCommercialOwner<T>(
  projection: EvaluationProjection,
  items: readonly T[],
  ownerOf: (item: T) => string | null | undefined,
): T[] {
  if (!projection.active || projection.persona !== 'asesor') return [...items];
  if (!projection.subjectMemberId) return [];
  return items.filter((item) => ownerOf(item) === projection.subjectMemberId);
}

export function evaluationBlocksDirectParty(
  projection: EvaluationProjection,
  commercialOwnerMemberId: string | null | undefined,
): boolean {
  return !evaluationAllowsCommercialOwner(projection, commercialOwnerMemberId);
}
