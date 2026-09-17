/**
 * "Who has the ball" — factual responsibility / waiting display.
 * Never invents owners, helpers, escalations, or department triggers.
 */

import { formatPersonWithCargo } from '@/lib/work/staff-display';
import {
  APPROVAL_RESPONSIBILITY_COPY,
  approvalResponsibilityView,
  type ApprovalResponsibilityPerson,
} from '@/lib/work/approval-responsibility';

export const WHO_HAS_THE_BALL_COPY = {
  principal: 'Responsable principal',
  commercial: 'Responsable comercial',
  actingNow: 'Quién está actuando ahora',
  waiting: 'Qué está esperando',
  waitingOn: 'De quién está esperando',
  nextSafe: 'Siguiente paso',
  temporarySupport: 'Apoyo temporal',
  noOwner: 'Responsable comercial pendiente de asignar',
  productionReviewNotRequested: 'Revisión de Producción: no solicitada',
  warehouseReviewNotRequested: 'Revisión de Almacén: no solicitada',
  purchasingReviewNotRequested: 'Revisión de Compras: no solicitada',
  overdueSincePrefix: 'Vencido desde',
} as const;

export const WAITING_STATE_TEMPLATES = {
  approval: 'Esperando aprobación de',
  customerReply: 'Esperando respuesta del cliente',
  followUpScheduled: 'Seguimiento programado para',
  productionReview: 'Esperando revisión de Producción',
  warehouseReview: 'Esperando revisión de Almacén',
  purchasingReview: 'Esperando revisión de Compras',
  ownerPending: 'Responsable pendiente de asignar',
  pendingConfirm: 'Pendiente de confirmar',
  notRegistered: 'No registrado',
} as const;

export type WhoHasTheBallInput = {
  commercialOwner: ApprovalResponsibilityPerson | null;
  /** Explicit temporary coverage helper — only when a grant/assignment exists. */
  temporarySupport: ApprovalResponsibilityPerson | null;
  pendingApproval: {
    approvalRequestId: string | null;
    status: string;
    approver: ApprovalResponsibilityPerson | null;
    requesterDisplayName?: string | null;
  } | null;
  nextStepStatement: string | null;
  nextStepHrefLabel: string | null;
};

export type WhoHasTheBallView = {
  principalLine: string;
  temporarySupportLine: string | null;
  waitingLine: string | null;
  waitingOnLine: string | null;
  nextSafeLine: string | null;
  requestHref: string | null;
  requestLabel: string | null;
};

export function whoHasTheBallView(input: WhoHasTheBallInput): WhoHasTheBallView {
  const ownerFormatted = formatPersonWithCargo(
    input.commercialOwner?.displayName,
    input.commercialOwner?.businessRoleLabel,
  );
  const principalLine = ownerFormatted
    ? `${WHO_HAS_THE_BALL_COPY.commercial}: ${ownerFormatted}`
    : WHO_HAS_THE_BALL_COPY.noOwner;

  const supportFormatted = formatPersonWithCargo(
    input.temporarySupport?.displayName,
    input.temporarySupport?.businessRoleLabel,
  );
  const temporarySupportLine = supportFormatted
    ? `${WHO_HAS_THE_BALL_COPY.temporarySupport}: ${supportFormatted}`
    : null;

  if (input.pendingApproval && input.pendingApproval.status === 'pending') {
    const approval = approvalResponsibilityView({
      status: 'pending',
      approvalRequestId: input.pendingApproval.approvalRequestId,
      approver: input.pendingApproval.approver,
      requesterDisplayName: input.pendingApproval.requesterDisplayName,
    });
    return {
      principalLine,
      temporarySupportLine,
      waitingLine: `${WAITING_STATE_TEMPLATES.approval} ${
        formatPersonWithCargo(
          input.pendingApproval.approver?.displayName,
          input.pendingApproval.approver?.businessRoleLabel,
        ) ?? APPROVAL_RESPONSIBILITY_COPY.responsibilityUndefined
      }`,
      waitingOnLine: approval.headline,
      nextSafeLine: 'Esperar decisión',
      requestHref: approval.requestHref,
      requestLabel: approval.requestLabel,
    };
  }

  return {
    principalLine,
    temporarySupportLine,
    waitingLine: null,
    waitingOnLine: null,
    nextSafeLine: input.nextStepStatement
      ? input.nextStepHrefLabel
        ? `${input.nextStepStatement} · ${input.nextStepHrefLabel}`
        : input.nextStepStatement
      : null,
    requestHref: null,
    requestLabel: null,
  };
}
