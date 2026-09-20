/**
 * Permission-aware list CTA for approvals.
 * Uses the same decide authority as approval detail (canDecide), not member-id decoration alone.
 */

export type ApprovalListActionLabel = 'Decidir' | 'Ver solicitud' | 'Ver contexto' | 'Ver registro';

export function approvalListActionLabel(input: {
  status: string;
  /** Authoritative decide right from the same server truth as detail. */
  canDecide: boolean;
  evaluationMode?: boolean;
}): ApprovalListActionLabel {
  if (input.evaluationMode) return 'Ver contexto';
  if (input.status !== 'pending') return 'Ver registro';
  if (input.canDecide) return 'Decidir';
  return 'Ver solicitud';
}

/** List page subtitle — never claim "su decisión" unless every row is decidable by the actor. */
export function approvalListPageDescription(input: {
  evaluationMode: boolean;
  pendingCount: number;
  decidableCount: number;
}): string {
  if (input.evaluationMode) {
    return 'Solicitudes pendientes de aprobación. La decisión no crea un pedido.';
  }
  if (input.pendingCount === 0) {
    return 'Cuando alguien solicite su aprobación, la verá aquí para decidir.';
  }
  if (input.decidableCount === input.pendingCount && input.decidableCount > 0) {
    return 'Solicitudes pendientes de su decisión. La decisión no crea un pedido.';
  }
  return 'Solicitudes pendientes de aprobación. La decisión no crea un pedido.';
}
