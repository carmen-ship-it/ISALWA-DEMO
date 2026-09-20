/**
 * Permission-aware list CTA + detail chrome for approvals.
 * Presentation only — does not broaden decide authority.
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

export type ApprovalDetailDecisionChrome = {
  kicker: string;
  title: string;
  body: string;
};

/**
 * Detail decision panel copy. Own-decision chrome only when the actor may decide.
 * Evaluation and non-approver never imply the decision belongs to the viewer.
 */
export function approvalDetailDecisionChrome(input: {
  status: string;
  canDecide: boolean;
  evaluationMode?: boolean;
}): ApprovalDetailDecisionChrome {
  const pending = input.status === 'pending';
  const ownDecision = pending && input.canDecide && !input.evaluationMode;

  if (ownDecision) {
    return {
      kicker: 'Su decisión',
      title: 'Aprobar o rechazar',
      body: 'La decisión no crea un pedido. Solo confirma o rechaza esta solicitud.',
    };
  }

  if (pending) {
    return {
      kicker: 'Contexto de la decisión',
      title: 'Revisión',
      body: 'Esta solicitud está pendiente de decisión por la persona asignada.',
    };
  }

  return {
    kicker: 'Contexto de la decisión',
    title: 'Decisión registrada',
    body: 'La decisión no crea un pedido.',
  };
}
