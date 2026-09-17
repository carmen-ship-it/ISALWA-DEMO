/**
 * Human-readable approval responsibility — display only.
 * Never grants authority from Cargo/title. Never invents thresholds.
 */

import { approvalHref } from '@/lib/work/navigation';

export const APPROVAL_RESPONSIBILITY_COPY = {
  pendingPrefix: 'Pendiente de aprobación de',
  personPendingAssign: 'Persona pendiente de asignar',
  responsibilityUndefined: 'Responsable pendiente de definir',
  missingApproverConfig: 'Falta asignar quién aprueba este tipo de solicitud',
  approvedByPrefix: 'Aprobado por',
  rejectedByPrefix: 'Rechazado por',
  seeRequest: 'Ver solicitud',
  noAutoPedido: 'La aprobación no crea un pedido.',
  /** Internal classification when eligible approver queue is empty. */
  businessConfigurationRequired: 'BUSINESS_CONFIGURATION_REQUIRED',
} as const;

export type ApprovalResponsibilityPerson = {
  memberId: string | null;
  displayName: string | null;
  /** Evidenced department / team label — never authority from Cargo alone. */
  businessRoleLabel: string | null;
};

export type PendingApprovalResponsibilityInput = {
  status: 'pending' | 'approved' | 'rejected' | string;
  approvalRequestId: string | null;
  approver: ApprovalResponsibilityPerson | null;
  requesterDisplayName?: string | null;
  decidedByDisplayName?: string | null;
};

export type PendingApprovalResponsibilityView = {
  headline: string;
  detailLines: string[];
  requestHref: string | null;
  requestLabel: string | null;
  /** True when no person was assigned — config gap, not invented assignee. */
  missingApprover: boolean;
};

function formatPersonRole(person: ApprovalResponsibilityPerson | null): string | null {
  if (!person) return null;
  const name = person.displayName?.trim() || null;
  const role = person.businessRoleLabel?.trim() || null;
  if (name && role) return `${name} · ${role}`;
  if (name) return name;
  if (role) return `${role} · ${APPROVAL_RESPONSIBILITY_COPY.personPendingAssign}`;
  return null;
}

/**
 * Build pending / decided approval copy from evidenced assignees only.
 */
export function approvalResponsibilityView(
  input: PendingApprovalResponsibilityInput,
): PendingApprovalResponsibilityView {
  const requestHref = input.approvalRequestId ? approvalHref(input.approvalRequestId) : null;
  const requestLabel = requestHref ? APPROVAL_RESPONSIBILITY_COPY.seeRequest : null;
  const personLabel = formatPersonRole(input.approver);

  if (input.status === 'pending') {
    if (personLabel) {
      return {
        headline: `${APPROVAL_RESPONSIBILITY_COPY.pendingPrefix} ${personLabel}`,
        detailLines: [
          APPROVAL_RESPONSIBILITY_COPY.noAutoPedido,
          ...(input.requesterDisplayName?.trim()
            ? [`Solicitado por ${input.requesterDisplayName.trim()}`]
            : []),
        ],
        requestHref,
        requestLabel,
        missingApprover: false,
      };
    }
    return {
      headline: APPROVAL_RESPONSIBILITY_COPY.missingApproverConfig,
      detailLines: [
        APPROVAL_RESPONSIBILITY_COPY.responsibilityUndefined,
        APPROVAL_RESPONSIBILITY_COPY.noAutoPedido,
      ],
      requestHref,
      requestLabel,
      missingApprover: true,
    };
  }

  if (input.status === 'approved') {
    const by = input.decidedByDisplayName?.trim() || personLabel;
    return {
      headline: by
        ? `${APPROVAL_RESPONSIBILITY_COPY.approvedByPrefix} ${by}`
        : APPROVAL_RESPONSIBILITY_COPY.approvedByPrefix,
      detailLines: [APPROVAL_RESPONSIBILITY_COPY.noAutoPedido],
      requestHref,
      requestLabel,
      missingApprover: false,
    };
  }

  if (input.status === 'rejected') {
    const by = input.decidedByDisplayName?.trim() || personLabel;
    return {
      headline: by
        ? `${APPROVAL_RESPONSIBILITY_COPY.rejectedByPrefix} ${by}`
        : APPROVAL_RESPONSIBILITY_COPY.rejectedByPrefix,
      detailLines: [APPROVAL_RESPONSIBILITY_COPY.noAutoPedido],
      requestHref,
      requestLabel,
      missingApprover: false,
    };
  }

  return {
    headline: APPROVAL_RESPONSIBILITY_COPY.responsibilityUndefined,
    detailLines: [],
    requestHref,
    requestLabel,
    missingApprover: true,
  };
}
