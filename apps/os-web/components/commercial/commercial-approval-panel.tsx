'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, StatusPill } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { OPS_STICKY_ACTION_CLASS } from '@/components/production/ops-desk-surface';
import {
  decideCommercialApprovalAction,
  requestCommercialApprovalAction,
} from '@/lib/commercial/actions';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { formatTimestamp } from '@/lib/commercial/labels';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';

type CommercialApprovalPanelProps = {
  partyId: string;
  subjectType: 'quote' | 'order';
  subjectId: string;
  canRequest: boolean;
  memberLabels?: ReadonlyMap<string, string>;
  approvals: SubjectApprovalItem[];
};

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function memberName(labels: ReadonlyMap<string, string> | undefined, memberId: string): string {
  return labels?.get(memberId) ?? 'Miembro del equipo';
}

export function CommercialApprovalPanel({
  partyId,
  subjectType,
  subjectId,
  canRequest,
  memberLabels,
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
    <div className="space-y-8" data-tour={TOUR_TARGET.approvalConsequence}>
      {approvals.length > 0 ? (
        <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Historial de aprobación">
          {approvals.map((approval) => {
            const decided = Boolean(decisionState?.success) || !approval.canDecide;
            return (
              <li key={approval.approvalRequestId} className="py-6 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--isalwa-kiln)]">
                    Aprobador: {memberName(memberLabels, approval.approverMemberId)}
                  </p>
                  <StatusPill tone={statusToneForApproval(approval.status)}>
                    {formatApprovalStatus(approval.status)}
                  </StatusPill>
                </div>
                {formatTimestamp(approval.decidedAt) ? (
                  <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
                    Decidida: {formatTimestamp(approval.decidedAt)}
                  </p>
                ) : null}
                {approval.status === 'pending' ? (
                  <div className="mt-3 space-y-1 text-sm leading-relaxed">
                    <p className="font-medium text-[var(--isalwa-kiln)]">Bloqueado por</p>
                    <p className="text-[var(--isalwa-slate)]">Aprobación pendiente. No crea un pedido.</p>
                    <p className="font-medium text-[var(--isalwa-kiln)]">A quién acudir</p>
                    <p className="text-[var(--isalwa-slate)]">
                      {memberName(memberLabels, approval.approverMemberId)} — aprobador actual
                    </p>
                  </div>
                ) : null}
                {approval.decisionReason ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{approval.decisionReason}</p>
                ) : null}
                {approval.canDecide || approval.status !== 'pending' ? (
                  <ApprovalDecisionFields
                    action={decisionAction}
                    partyId={partyId}
                    subjectType={subjectType}
                    subjectId={subjectId}
                    approvalRequestId={approval.approvalRequestId}
                    locked={decided}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">Sin solicitudes de aprobación.</p>
      )}
      <FormFeedback error={decisionState?.error} success={decisionState?.success} />

      {canRequest ? (
        <form action={requestAction} className="space-y-5 border-t border-[var(--isalwa-mist)] pt-8">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="subjectType" value={subjectType} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Aprobador
            <ServerMemberTypeahead
              id="approver-member"
              name="approverMemberId"
              required
              placeholder="Buscar aprobador"
            />
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Nota
            <input className={fieldClass} name="note" maxLength={500} />
          </label>
          <FormFeedback error={requestState?.error} success={requestState?.success} />
          <CommandSubmitButton label="Solicitar aprobación" pendingLabel="Solicitando…" variant="secondary" />
        </form>
      ) : null}
    </div>
  );
}

type ApprovalDecisionFormProps = {
  partyId?: string;
  subjectType: string;
  subjectId: string;
  approvalRequestId: string;
  locked: boolean;
};

export function ApprovalDecisionForm({
  partyId,
  subjectType,
  subjectId,
  approvalRequestId,
  locked,
}: ApprovalDecisionFormProps) {
  const router = useRouter();
  const [state, action] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await decideCommercialApprovalAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Decisión registrada. No se creó un pedido.' };
      }
      return { error: result.error };
    },
    null,
  );
  const settled = locked || Boolean(state?.success);

  return (
    <div className="mt-8 space-y-5">
      <FormFeedback error={state?.error} success={state?.success} />
      <ApprovalDecisionFields
        action={action}
        partyId={partyId}
        subjectType={subjectType}
        subjectId={subjectId}
        approvalRequestId={approvalRequestId}
        locked={settled}
      />
    </div>
  );
}

function ApprovalDecisionFields({
  action,
  partyId,
  subjectType,
  subjectId,
  approvalRequestId,
  locked,
}: ApprovalDecisionFormProps & { action: (formData: FormData) => void }) {
  if (locked) {
    return (
      <div className={`${OPS_STICKY_ACTION_CLASS} mt-6 flex flex-wrap gap-3 px-1 py-3`}>
        <Button type="button" variant="primary" disabled>
          Aprobar
        </Button>
        <Button type="button" variant="danger" disabled>
          Rechazar
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      {partyId ? <input type="hidden" name="partyId" value={partyId} /> : null}
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Aprobar registra la decisión. No crea un pedido. Rechazar cierra esta solicitud. No cambia el responsable.
      </p>
      <label className="block text-sm text-[var(--isalwa-slate)]">
        Motivo
        <input className={fieldClass} name="reason" maxLength={500} />
      </label>
      <div className={`${OPS_STICKY_ACTION_CLASS} -mx-1 flex flex-wrap gap-3 px-1 py-3`}>
        <DecisionButton label="Aprobar" decision="Approve" variant="primary" />
        <DecisionButton label="Rechazar" decision="Reject" variant="danger" />
      </div>
    </form>
  );
}

function DecisionButton({
  label,
  decision,
  variant,
}: {
  label: string;
  decision: 'Approve' | 'Reject';
  variant: 'primary' | 'danger';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="decision" value={decision} variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? 'Registrando…' : label}
    </Button>
  );
}
