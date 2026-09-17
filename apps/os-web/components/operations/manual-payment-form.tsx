'use client';

import { useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  MANUAL_PAYMENT_COPY,
  parseReportedAmountToCentavos,
  recordReportedOperationalFact,
  reportedFactCopy,
  reportedFactErrorCopy,
  type ReportedFactWriteResult,
} from '@/lib/operations/reported-fact';
import { fieldClass, subjectLine, type ManualOperationSubject } from './subject';

type ManualPaymentFormProps = ManualOperationSubject & {
  onRecorded: (result: ReportedFactWriteResult) => void;
};

function defaultReportedDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function reportedAtFromDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function ManualPaymentForm(props: ManualPaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reportedDate, setReportedDate] = useState(defaultReportedDate);
  const [note, setNote] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const recorded = recordReportedOperationalFact({
        id: crypto.randomUUID(),
        organizationId: props.organizationId,
        subjectType: props.subjectType,
        subjectId: props.subjectId,
        reportedAt: reportedAtFromDateInput(reportedDate),
        reportedByLabel: props.reportedByLabel,
        kind: 'payment',
        amountCentavos: parseReportedAmountToCentavos(amount),
        method,
        note,
      });
      reportedFactCopy(recorded.fact);
      setError(null);
      setAmount('');
      setMethod('');
      setReportedDate(defaultReportedDate());
      setNote('');
      props.onRecorded(recorded);
    } catch (caught) {
      setError(reportedFactErrorCopy(caught));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="manual">Dato manual</StatusPill>
        <StatusPill tone="warning">Pendiente de confirmar</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{subjectLine(props)}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_PAYMENT_COPY.intro}</p>
      <FormFeedback error={error} />
      <div>
        <label htmlFor="manual-payment-amount" className="isalwa-section-label">
          {MANUAL_PAYMENT_COPY.amount}
        </label>
        <input
          id="manual-payment-amount"
          name="amount"
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={fieldClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="manual-payment-method" className="isalwa-section-label">
          {MANUAL_PAYMENT_COPY.method}
        </label>
        <input
          id="manual-payment-method"
          name="method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          className={fieldClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="manual-payment-date" className="isalwa-section-label">
          {MANUAL_PAYMENT_COPY.date}
        </label>
        <input
          id="manual-payment-date"
          name="reportedDate"
          type="date"
          required
          value={reportedDate}
          onChange={(event) => setReportedDate(event.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="manual-payment-note" className="isalwa-section-label">
          {MANUAL_PAYMENT_COPY.note}
        </label>
        <textarea
          id="manual-payment-note"
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </div>
      <Button type="submit">{MANUAL_PAYMENT_COPY.submit}</Button>
    </form>
  );
}
