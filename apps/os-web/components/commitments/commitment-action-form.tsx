'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { COMMITMENT_REASON_MIN_LENGTH, commitmentDueLaPazParts } from '@isalwa/os-contracts';
import { Button } from '@isalwa/ui';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { commitmentDueInputToIso } from '@/lib/commitments/draft';
import {
  cancelCommitmentAction,
  reassignCommitmentAction,
  rescheduleCommitmentAction,
} from '@/lib/commitments/persistence';

export type CommitmentChangeMode = 'reschedule' | 'reassign' | 'cancel';

type CommitmentActionFormProps = {
  commitment: Pick<CommitmentSummary, 'id' | 'dueAt' | 'ownerMemberId'>;
  mode: CommitmentChangeMode;
  onClose: () => void;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/**
 * Reason form for the three changes that need one: new date, new responsible, cancel.
 * The server decides who may; this only collects the input and says what happened.
 */
export function CommitmentActionForm({ commitment, mode, onClose }: CommitmentActionFormProps) {
  const router = useRouter();
  const parts = commitment.dueAt ? commitmentDueLaPazParts(commitment.dueAt) : null;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const reason = String(data.get('reason') ?? '').trim();
    if (reason.length < COMMITMENT_REASON_MIN_LENGTH) {
      setError(COMMITMENT_COPY.reasonRequired);
      return;
    }

    setSubmitting(true);
    let result;
    if (mode === 'reschedule') {
      const dueAt = commitmentDueInputToIso(String(data.get('dueDate') ?? ''), String(data.get('dueTime') ?? ''));
      if (!dueAt || dueAt === 'invalid') {
        setSubmitting(false);
        setError('La fecha no es válida.');
        return;
      }
      result = await rescheduleCommitmentAction({ commitmentId: commitment.id, dueAt, reason });
    } else if (mode === 'reassign') {
      const newOwnerMemberId = String(data.get('newOwnerMemberId') ?? '').trim();
      if (!newOwnerMemberId) {
        setSubmitting(false);
        setError(COMMITMENT_COPY.responsibleRequired);
        return;
      }
      result = await reassignCommitmentAction({ commitmentId: commitment.id, newOwnerMemberId, reason });
    } else {
      result = await cancelCommitmentAction({ commitmentId: commitment.id, reason });
    }
    setSubmitting(false);

    if (!result.ok) {
      setError(result.reason === 'session_expired' ? COMMITMENT_COPY.sessionExpired : (result.message ?? COMMITMENT_COPY.actionFailed));
      return;
    }
    onClose();
    router.refresh();
  }

  const idBase = `commitment-${commitment.id}-${mode}`;
  const submitLabel =
    mode === 'reschedule'
      ? COMMITMENT_COPY.reschedule
      : mode === 'reassign'
        ? COMMITMENT_COPY.reassign
        : COMMITMENT_COPY.cancel;

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-3"
      aria-label={submitLabel}
    >
      {error ? (
        <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {mode === 'reschedule' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idBase}-date`} className="isalwa-section-label">
              {COMMITMENT_COPY.newDate}
            </label>
            <input
              id={`${idBase}-date`}
              name="dueDate"
              type="date"
              required
              defaultValue={parts?.date ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idBase}-time`} className="isalwa-section-label">
              {COMMITMENT_COPY.dueTime}
            </label>
            <input id={`${idBase}-time`} name="dueTime" type="time" defaultValue={parts?.time ?? ''} className={fieldClass} />
          </div>
          <p className="text-xs text-[var(--isalwa-slate)] sm:col-span-2">{COMMITMENT_COPY.dueTimeHint}</p>
        </div>
      ) : null}
      {mode === 'reassign' ? (
        <div>
          <label htmlFor={`${idBase}-owner`} className="isalwa-section-label">
            {COMMITMENT_COPY.newResponsible}
          </label>
          <ServerMemberTypeahead
            id={`${idBase}-owner`}
            name="newOwnerMemberId"
            required
            excludeMemberId={commitment.ownerMemberId}
            placeholder={COMMITMENT_COPY.responsiblePlaceholder}
          />
        </div>
      ) : null}
      <div>
        <label htmlFor={`${idBase}-reason`} className="isalwa-section-label">
          {COMMITMENT_COPY.reason}
        </label>
        <input id={`${idBase}-reason`} name="reason" required minLength={COMMITMENT_REASON_MIN_LENGTH} className={fieldClass} />
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{COMMITMENT_COPY.reasonHint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant={mode === 'cancel' ? 'danger' : 'primary'} disabled={submitting}>
          {submitting ? COMMITMENT_COPY.working : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
          {COMMITMENT_COPY.back}
        </Button>
      </div>
    </form>
  );
}
