'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@isalwa/ui';
import { COMMITMENT_COPY, commitmentErrorCopy } from '@/lib/commitments/copy';
import { buildCommitmentDraft } from '@/lib/commitments/draft';
import { commitmentPersistence } from '@/lib/commitments/persistence';

type CommitmentRecordFormProps = {
  organizationId: string;
  ownerMemberId: string;
  partyId?: string | null;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CommitmentRecordForm({ organizationId, ownerMemberId, partyId }: CommitmentRecordFormProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const draft = buildCommitmentDraft({
      id: crypto.randomUUID(),
      organizationId,
      ownerMemberId,
      createdByMemberId: ownerMemberId,
      text,
      dueDate,
      partyId,
      createdAt: new Date().toISOString(),
    });
    if (!draft.ok) {
      setError(commitmentErrorCopy(draft.reason));
      return;
    }
    setError(null);
    const saved = await commitmentPersistence().save(draft.commitment);
    if (!saved.persisted) {
      setMessage(COMMITMENT_COPY.notSaved);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4"
      data-persistence="not_persisted"
    >
      <div>
        <p className="font-medium text-[var(--isalwa-kiln)]">{COMMITMENT_COPY.record}</p>
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{COMMITMENT_COPY.ownerNote}</p>
      </div>
      {error ? (
        <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {message}
        </p>
      ) : null}
      <div>
        <label htmlFor="commitment-text" className="isalwa-section-label">
          {COMMITMENT_COPY.text}
        </label>
        <input
          id="commitment-text"
          name="text"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={fieldClass}
          placeholder={COMMITMENT_COPY.placeholder}
        />
      </div>
      <div>
        <label htmlFor="commitment-due" className="isalwa-section-label">
          {COMMITMENT_COPY.due}
        </label>
        <input
          id="commitment-due"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{COMMITMENT_COPY.dueHint}</p>
      </div>
      <Button type="submit">{COMMITMENT_COPY.record}</Button>
    </form>
  );
}
