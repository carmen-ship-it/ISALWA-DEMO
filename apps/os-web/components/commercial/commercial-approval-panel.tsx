'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { StatusPill } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  decideCommercialApprovalAction,
  requestCommercialApprovalAction,
} from '@/lib/commercial/actions';
import type { ActiveMemberOption, SubjectApprovalItem } from '@/lib/commercial/types';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';

type CommercialApprovalPanelProps = {
  partyId: string;
  subjectType: 'quote' | 'order';
  subjectId: string;
  canRequest: boolean;
  members: ActiveMemberOption[];
  approvals: SubjectApprovalItem[];
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function memberName(members: ActiveMemberOption[], memberId: string): string {
  return members.find((member) => member.memberId === memberId)?.displayName ?? 'Miembro del equipo';
}

export function CommercialApprovalPanel({
  partyId,
  subjectType,
  subjectId,
  canRequest,
  members,
  approvals,
}: CommercialApprovalPanelProps) {
  const router = useRouter();
  const [requestState, requestAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await requestCommercialApprovalAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Solicitud registrada. La decisión no convierte la cotización ni cambia el pedido.' };
      }
      return { error: result.error };
    },
    null,
  );
  const [decisionState, decisionAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await decideCommercialApprovalAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Decisión registrada. No se creó un pedido ni se modificó el precio.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <div className="space-y-6">
      {approvals.length > 0 ? (
        <ul className="space-y-3" aria-label="Historial de aprobación">
          {approvals.map((approval) => (
            <li key={approval.approvalRequestId} className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--isalwa-kiln)]">
                  Aprobador: {memberName(members, approval.approverMemberId)}
                </p>
                <StatusPill tone={statusToneForApproval(approval.status)}>
                  {formatApprovalStatus(approval.status)}
                </StatusPill>
              </div>
              {approval.decisionReason ? (
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{approval.decisionReason}</p>
              ) : null}
              {approval.canDecide ? (
                <form action={decisionAction} className="mt-3 space-y-3">
                  <input type="hidden" name="partyId" value={partyId} />
                  <input type="hidden" name="subjectType" value={subjectType} />
                  <input type="hidden" name="subjectId" value={subjectId} />
                  <input type="hidden" name="approvalRequestId" value={approval.approvalRequestId} />
                  <label className="block text-sm text-[var(--isalwa-slate)]">
                    Motivo
                    <input className={fieldClass} name="reason" maxLength={500} />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <DecisionButton label="Aprobar" decision="Approve" />
                    <DecisionButton label="Rechazar" decision="Reject" />
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--isalwa-slate)]">Sin solicitudes de aprobación.</p>
      )}
      <FormFeedback error={decisionState?.error} success={decisionState?.success} />

      {canRequest ? (
        <form action={requestAction} className="space-y-3 border-t border-[var(--isalwa-mist)] pt-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="subjectType" value={subjectType} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Aprobador
            <select className={fieldClass} name="approverMemberId" required defaultValue="">
              <option value="" disabled>
                Seleccione un miembro activo
              </option>
              {members.map((member) => (
                <option key={member.memberId} value={member.memberId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Nota
            <input className={fieldClass} name="note" maxLength={500} />
          </label>
          <FormFeedback error={requestState?.error} success={requestState?.success} />
          <CommandSubmitButton label="Solicitar aprobación" variant="secondary" />
        </form>
      ) : null}
    </div>
  );
}

function DecisionButton({ label, decision }: { label: string; decision: 'Approve' | 'Reject' }) {
  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)]"
    >
      {label}
    </button>
  );
}
