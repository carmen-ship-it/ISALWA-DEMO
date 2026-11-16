'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@isalwa/ui';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';
import { COMMITMENT_COPY, commitmentErrorCopy } from '@/lib/commitments/copy';
import { buildCommitmentDraft } from '@/lib/commitments/draft';
import { saveCommitmentAction } from '@/lib/commitments/persistence';

type CommitmentRecordFormProps = {
  organizationId: string;
  ownerMemberId: string;
  partyId?: string | null;
  origin?: 'employee_entered' | 'customer_reported';
  onSaved?: () => void;
  /** Desk mode: pick the responsible active member (default: the signed-in member) and an optional customer. */
  chooseResponsible?: boolean;
  /** Display name of the signed-in member, used as the default responsible. */
  actorLabel?: string;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CommitmentRecordForm({
  organizationId,
  ownerMemberId,
  partyId,
  origin: initialOrigin = 'employee_entered',
  onSaved,
  chooseResponsible = false,
  actorLabel = '',
}: CommitmentRecordFormProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [responsible, setResponsible] = useState({ id: ownerMemberId, label: actorLabel, key: 0 });
  const [customer, setCustomer] = useState({ partyId: '', label: '' });
  const [origin, setOrigin] = useState<'employee_entered' | 'customer_reported'>(initialOrigin);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    let responsibleId = ownerMemberId;
    if (chooseResponsible) {
      responsibleId = String(new FormData(event.currentTarget).get('ownerMemberId') ?? '').trim();
      if (!responsibleId) {
        setError(COMMITMENT_COPY.responsibleRequired);
        return;
      }
    }
    if (dueTime && !dueDate) {
      setError(COMMITMENT_COPY.dueDateRequiredForTime);
      return;
    }

    const draft = buildCommitmentDraft({
      id: crypto.randomUUID(),
      organizationId,
      ownerMemberId: responsibleId,
      createdByMemberId: ownerMemberId,
      text,
      dueDate,
      dueTime,
      partyId: partyId ?? (customer.partyId || null),
      createdAt: new Date().toISOString(),
    });

    if (!draft.ok) {
      setError(commitmentErrorCopy(draft.reason));
      return;
    }

    setSubmitting(true);

    const result = await saveCommitmentAction({
      text: draft.commitment.text,
      ownerMemberId: draft.commitment.ownerMemberId,
      partyId: draft.commitment.partyId ?? undefined,
      dueAt: draft.commitment.dueAt ?? undefined,
      relatedSubjectType: draft.commitment.relatedSubjectType ?? undefined,
      relatedSubjectId: draft.commitment.relatedSubjectId ?? undefined,
      origin,
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.reason === 'session_expired') {
        setError(COMMITMENT_COPY.sessionExpired);
      } else {
        setError(result.message ?? COMMITMENT_COPY.saveFailed);
      }
      return;
    }

    setMessage(COMMITMENT_COPY.saved);
    setText('');
    setDueDate('');
    setDueTime('');
    setCustomer({ partyId: '', label: '' });
    onSaved?.();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4"
    >
      <div>
        <p className="font-medium text-[var(--isalwa-kiln)]">
          {chooseResponsible ? COMMITMENT_COPY.create : COMMITMENT_COPY.record}
        </p>
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
          {chooseResponsible ? COMMITMENT_COPY.createNote : COMMITMENT_COPY.ownerNote}
        </p>
      </div>
      {error ? (
        <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--isalwa-success)]" role="status">
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
      {chooseResponsible ? (
        <div>
          <label htmlFor="commitment-owner" className="isalwa-section-label">
            {COMMITMENT_COPY.responsible}
          </label>
          <ServerMemberTypeahead
            key={responsible.key}
            id="commitment-owner"
            name="ownerMemberId"
            required
            defaultMemberId={responsible.id}
            defaultLabel={responsible.label}
            placeholder={COMMITMENT_COPY.responsiblePlaceholder}
          />
          {responsible.id !== ownerMemberId ? (
            <button
              type="button"
              className="mt-1 text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              onClick={() =>
                setResponsible((current) => ({ id: ownerMemberId, label: actorLabel, key: current.key + 1 }))
              }
            >
              {COMMITMENT_COPY.assignToMe}
            </button>
          ) : null}
        </div>
      ) : null}
      {chooseResponsible && !partyId ? (
        <ServerPartyTypeahead
          id="commitment-customer"
          label={COMMITMENT_COPY.customer}
          value={customer.partyId}
          displayLabel={customer.label}
          onChange={setCustomer}
          hint={COMMITMENT_COPY.customerHint}
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        <div>
          <label htmlFor="commitment-due-time" className="isalwa-section-label">
            {COMMITMENT_COPY.dueTime}
          </label>
          <input
            id="commitment-due-time"
            name="dueTime"
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
            className={fieldClass}
          />
        </div>
        <p className="text-sm text-[var(--isalwa-slate)] sm:col-span-2">
          {COMMITMENT_COPY.dueHint} {COMMITMENT_COPY.dueTimeHint}
        </p>
      </div>
      <fieldset>
        <legend className="isalwa-section-label">{COMMITMENT_COPY.source}</legend>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
            <input
              type="radio"
              name="commitment-origin"
              checked={origin === 'employee_entered'}
              onChange={() => setOrigin('employee_entered')}
            />
            {COMMITMENT_COPY.originEmployee}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
            <input
              type="radio"
              name="commitment-origin"
              checked={origin === 'customer_reported'}
              onChange={() => setOrigin('customer_reported')}
            />
            {COMMITMENT_COPY.originCustomer}
          </label>
        </div>
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{COMMITMENT_COPY.originHint}</p>
      </fieldset>
      <Button type="submit" disabled={submitting}>
        {submitting ? COMMITMENT_COPY.working : chooseResponsible ? COMMITMENT_COPY.create : COMMITMENT_COPY.record}
      </Button>
    </form>
  );
}
