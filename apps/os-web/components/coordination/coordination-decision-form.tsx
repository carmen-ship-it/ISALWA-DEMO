'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@isalwa/ui';
import { OPS_STICKY_ACTION_CLASS } from '@/components/production/ops-desk-surface';
import { COORDINATION_RECORD_BUTTON } from '@/lib/coordination/page-model';
import {
  recordCoordinationDecisionAction,
  resolveCoordinationDecisionAction,
} from '@/lib/coordination/actions';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CoordinationDecisionFormProps = {
  linkedCaseId: string | null;
  mode: 'record' | 'resolve';
  resolvesDecisionId?: string;
};

export function CoordinationDecisionForm({
  linkedCaseId,
  mode,
  resolvesDecisionId,
}: CoordinationDecisionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReason(null);
    startTransition(async () => {
      const payload = {
        decision,
        ownerLabel: ownerLabel.trim() || null,
        dueAt: dueAt.trim() || null,
        notes: notes.trim() || null,
        linkedCaseId,
      };
      const result =
        mode === 'resolve' && resolvesDecisionId
          ? await resolveCoordinationDecisionAction({
              ...payload,
              resolvesDecisionId,
            })
          : await recordCoordinationDecisionAction(payload);
      if (!result.ok) {
        setReason(result.error);
        return;
      }
      setDecision('');
      setOwnerLabel('');
      setDueAt('');
      setNotes('');
      router.refresh();
    });
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
          disabled={pending}
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
            disabled={pending}
          />
        </div>
        <div>
          <label className="isalwa-section-label" htmlFor={`${mode}-due-${linkedCaseId ?? 'page'}`}>
            Fecha límite
          </label>
          <input
            id={`${mode}-due-${linkedCaseId ?? 'page'}`}
            type="date"
            className={fieldClass}
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={pending}
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
          disabled={pending}
        />
      </div>
      {reason ? (
        <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
          {reason}
        </p>
      ) : null}
      <div className={OPS_STICKY_ACTION_CLASS}>
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Guardando…'
            : mode === 'resolve'
              ? 'Registrar resolución'
              : COORDINATION_RECORD_BUTTON}
        </Button>
      </div>
    </form>
  );
}
