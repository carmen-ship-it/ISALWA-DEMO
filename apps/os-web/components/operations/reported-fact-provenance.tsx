'use client';

import { useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  CORRECTION_COPY,
  reportedFactCopy,
  reportedFactErrorCopy,
  reportedFactProvenance,
  reverseReportedFact,
  type ReportedOperationalFact,
} from '@/lib/operations/reported-fact';
import { fieldClass } from './subject';

type ReportedFactProvenanceProps = {
  fact: ReportedOperationalFact;
  /** Omit under View As / read-only — reverse is a mutation. */
  onReversed?: (fact: ReportedOperationalFact) => void;
};

/** Shows provenance and can reverse the report. Does not confirm or rewrite the value. */
export function ReportedFactProvenance({ fact, onReversed }: ReportedFactProvenanceProps) {
  const copy = reportedFactCopy(fact);
  const provenance = reportedFactProvenance(fact);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onReversed) return;
    try {
      const reversed = reverseReportedFact(fact, reason);
      reportedFactCopy(reversed);
      setReason('');
      setError(null);
      onReversed(reversed);
    } catch (caught) {
      setError(reportedFactErrorCopy(caught));
    }
  }

  return (
    <article className="space-y-3 border-t border-[var(--isalwa-mist)] py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{copy.title}</h3>
        <StatusPill tone="manual">{copy.manualLabel}</StatusPill>
        <StatusPill tone="warning">{copy.confirmation}</StatusPill>
        <StatusPill tone="neutral">No guardado</StatusPill>
      </div>
      <p className="text-sm text-[var(--isalwa-kiln)]">{copy.value}</p>
      <ul className="space-y-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {provenance.lines.map((line, index) => (
          <li key={`${index}:${line}`}>{line}</li>
        ))}
      </ul>
      <ul className="space-y-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {provenance.limits.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {fact.activity === 'active' && onReversed ? (
        <form onSubmit={reverse} className="space-y-3">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{CORRECTION_COPY.hint}</p>
          <FormFeedback error={error} />
          <div>
            <label htmlFor={`reverse-${fact.id}`} className="isalwa-section-label">
              {CORRECTION_COPY.reason}
            </label>
            <input
              id={`reverse-${fact.id}`}
              name="reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={fieldClass}
            />
          </div>
          <Button type="submit" variant="secondary">
            {CORRECTION_COPY.reverse}
          </Button>
        </form>
      ) : null}
    </article>
  );
}
