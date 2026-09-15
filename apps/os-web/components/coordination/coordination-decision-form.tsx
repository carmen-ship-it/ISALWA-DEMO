'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@isalwa/ui';
import { OPS_STICKY_ACTION_CLASS } from '@/components/production/ops-desk-surface';
import { COORDINATION_RECORD_BUTTON } from '@/lib/coordination/page-model';
import {
  recordCoordinationDecision,
  resolveCoordinationDecision,
  type CoordinationLedger,
  type CoordinationResult,
  type CoordinationSession,
  type RecordedCoordinationDecision,
} from '@isalwa/os-contracts';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CoordinationDecisionFormProps = {
  session: CoordinationSession;
  ledger: CoordinationLedger;
  linkedCaseId: string | null;
  mode: 'record' | 'resolve';
  resolvesDecisionId?: string;
  onRecorded: (result: RecordedCoordinationDecision) => void;
};

export function CoordinationDecisionForm({
  session,
  ledger,
  linkedCaseId,
  mode,
  resolvesDecisionId,
  onRecorded,
}: CoordinationDecisionFormProps) {
  const [decision, setDecision] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const occurredAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const shared = {
      session,
      ledger,
      id,
      decision,
      ownerLabel,
      dueAt,
      occurredAt,
      linkedCaseId,
      notes,
    };
    const result: CoordinationResult<RecordedCoordinationDecision> =
      mode === 'resolve' && resolvesDecisionId
        ? resolveCoordinationDecision({ ...shared, resolvesDecisionId })
        : recordCoordinationDecision(shared);
    if (!result.ok) {
      setReason(denialCopy(result.reason));
      return;
    }
    setDecision('');
    setOwnerLabel('');
    setDueAt('');
    setNotes('');
    setReason(null);
    onRecorded(result.value);
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-[var(--isalwa-mist)] pt-4">
      <div>
        <label className="isalwa-section-label" htmlFor={`${mode}-decision-${linkedCaseId ?? 'page'}`}>
          Decisión
        </label>
        <input
          id={`${mode}-decision-${linkedCaseId ?? 'page'}`}
          className={fieldClass}
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="isalwa-section-label" htmlFor={`${mode}-owner-${linkedCaseId ?? 'page'}`}>
            Responsable
          </label>
          <input
            id={`${mode}-owner-${linkedCaseId ?? 'page'}`}
            className={fieldClass}
            value={ownerLabel}
            onChange={(event) => setOwnerLabel(event.target.value)}
          />
        </div>
        <div>
          <label className="isalwa-section-label" htmlFor={`${mode}-due-${linkedCaseId ?? 'page'}`}>
            Fecha límite
          </label>
          <input
            id={`${mode}-due-${linkedCaseId ?? 'page'}`}
            className={fieldClass}
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="isalwa-section-label" htmlFor={`${mode}-notes-${linkedCaseId ?? 'page'}`}>
          Notas
        </label>
        <textarea
          id={`${mode}-notes-${linkedCaseId ?? 'page'}`}
          className={fieldClass}
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      {linkedCaseId ? (
        <p className="text-xs text-[var(--isalwa-slate)]">Caso vinculado: {linkedCaseId}</p>
      ) : null}
      {reason ? <p className="text-sm text-[var(--isalwa-danger)]">{reason}</p> : null}
      <div className={`${OPS_STICKY_ACTION_CLASS} -mx-1 px-1 py-3`}>
        <Button type="submit">{mode === 'resolve' ? 'Registrar resolución' : COORDINATION_RECORD_BUTTON}</Button>
      </div>
    </form>
  );
}

function denialCopy(reason: string): string {
  if (reason === 'unauthorized_role') return 'El cargo no otorga este permiso.';
  if (reason === 'missing_session_org') return 'Falta la organización de la sesión.';
  if (reason === 'cross_tenant') return 'Esa decisión es de otra organización.';
  if (reason === 'decision_required') return 'Escriba la decisión.';
  if (reason === 'actor_required') return 'Falta quién registra.';
  return 'No se pudo registrar.';
}
