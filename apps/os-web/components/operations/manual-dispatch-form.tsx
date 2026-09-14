'use client';

import { useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  MANUAL_DISPATCH_COPY,
  recordReportedOperationalFact,
  reportedFactCopy,
  reportedFactErrorCopy,
  type ReportedFactWriteResult,
} from '@/lib/operations/reported-fact';
import { fieldClass, subjectLine, type ManualOperationSubject } from './subject';

type ManualDispatchFormProps = ManualOperationSubject & {
  onRecorded: (result: ReportedFactWriteResult) => void;
};

export function ManualDispatchForm(props: ManualDispatchFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [reportedState, setReportedState] = useState('');
  const [note, setNote] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const recorded = recordReportedOperationalFact({
        id: crypto.randomUUID(),
        organizationId: props.organizationId,
        subjectType: props.subjectType,
        subjectId: props.subjectId,
        reportedAt: new Date().toISOString(),
        reportedByLabel: props.reportedByLabel,
        kind: 'dispatch',
        reportedState,
        note,
      });
      reportedFactCopy(recorded.fact);
      setError(null);
      setReportedState('');
      setNote('');
      props.onRecorded(recorded);
    } catch (caught) {
      setError(reportedFactErrorCopy(caught));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{MANUAL_DISPATCH_COPY.title}</h3>
        <StatusPill tone="manual">Dato manual</StatusPill>
        <StatusPill tone="warning">Pendiente de confirmar</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{subjectLine(props)}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_DISPATCH_COPY.intro}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_DISPATCH_COPY.boundary}</p>
      <FormFeedback error={error} />
      <div>
        <label htmlFor="manual-dispatch-state" className="isalwa-section-label">
          {MANUAL_DISPATCH_COPY.state}
        </label>
        <input
          id="manual-dispatch-state"
          name="reportedState"
          required
          value={reportedState}
          onChange={(event) => setReportedState(event.target.value)}
          placeholder={MANUAL_DISPATCH_COPY.placeholder}
          className={fieldClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="manual-dispatch-note" className="isalwa-section-label">
          {MANUAL_DISPATCH_COPY.note}
        </label>
        <textarea
          id="manual-dispatch-note"
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </div>
      <Button type="submit">{MANUAL_DISPATCH_COPY.submit}</Button>
    </form>
  );
}
