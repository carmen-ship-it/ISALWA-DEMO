'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { useQuoteLive } from '@/components/commercial/quote-live-frame';
import { recordQuoteCustomerAcceptanceAction } from '@/lib/commercial/actions';
import { formatTimestamp } from '@/lib/commercial/labels';
import {
  QUOTE_ACCEPTANCE_CHANNEL_OPTIONS,
  QUOTE_LIFECYCLE_COPY,
  QUOTE_LIFECYCLE_LABELS,
  canRecordQuoteAcceptance,
  localIsoDate,
} from '@/lib/commercial/quote-lifecycle';
import type { QuoteDetailReadModel } from '@isalwa/os-contracts';

type QuoteAcceptanceSectionProps = {
  partyId: string;
  quote: QuoteDetailReadModel;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function newClientCommandId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Registrar aceptación: a person records how and when the customer accepted the issued
 * revision. Visible for an issued, not-yet-accepted quote. The revision sent is the one this
 * page shows; a stale page is refused by the command (CONFLICT).
 */
export function QuoteAcceptanceSection({ partyId, quote: quoteFromServer }: QuoteAcceptanceSectionProps) {
  const router = useRouter();
  const live = useQuoteLive();
  const quote = live?.quote ?? quoteFromServer;
  const formId = useId();
  const [commandId, setCommandId] = useState(newClientCommandId);
  const [today, setToday] = useState('');
  const [state, action] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await recordQuoteCustomerAcceptanceAction(formData);
      if (result.ok) {
        setCommandId(newClientCommandId());
        router.refresh();
        return { success: QUOTE_LIFECYCLE_COPY.acceptanceDone };
      }
      return { error: result.error };
    },
    null,
  );

  useEffect(() => {
    setToday(localIsoDate());
  }, []);

  if (quote.status === 'accepted') {
    return (
      <div data-quote-acceptance="accepted">
        <p className="font-medium text-[var(--isalwa-kiln)]">
          {quote.customerAcceptedAt
            ? `Aceptación registrada · ${formatTimestamp(quote.customerAcceptedAt)}`
            : 'Aceptación registrada'}
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {QUOTE_LIFECYCLE_COPY.acceptedNextStep}
        </p>
        <FormFeedback error={null} success={state?.success} />
      </div>
    );
  }

  if (!canRecordQuoteAcceptance(quote)) {
    const syncing = Boolean(live) && live?.quote !== live?.serverQuote;
    if (syncing) {
      return (
        <p
          className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]"
          role="status"
          data-quote-acceptance="syncing"
        >
          {QUOTE_LIFECYCLE_COPY.issuanceSyncing}
        </p>
      );
    }
    return (
      <p
        className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]"
        data-quote-acceptance="not-issued"
      >
        {QUOTE_LIFECYCLE_COPY.acceptanceNotIssued}
      </p>
    );
  }

  return (
    <div data-quote-acceptance="form">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {QUOTE_LIFECYCLE_COPY.acceptanceIntro}
      </p>
      <FormFeedback error={state?.error} success={state?.success} />
      <form action={action} className="mt-6 max-w-xl space-y-4">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quote.quoteId} />
        <input type="hidden" name="expectedRevision" value={quote.revisionNumber} />
        <input type="hidden" name="idempotencyKey" value={commandId} />
        <div>
          <label htmlFor={`${formId}-channel`} className="isalwa-section-label">
            {QUOTE_LIFECYCLE_COPY.channel}
          </label>
          <select
            id={`${formId}-channel`}
            name="channel"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Seleccione el canal
            </option>
            {QUOTE_ACCEPTANCE_CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-date`} className="isalwa-section-label">
            {QUOTE_LIFECYCLE_COPY.acceptedOn}
          </label>
          <input
            id={`${formId}-date`}
            name="acceptedOn"
            type="date"
            required
            max={today || undefined}
            defaultValue={today}
            key={today}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-evidence`} className="isalwa-section-label">
            {QUOTE_LIFECYCLE_COPY.evidence}
          </label>
          <textarea
            id={`${formId}-evidence`}
            name="evidence"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            aria-describedby={`${formId}-evidence-hint`}
            className={fieldClass}
          />
          <p id={`${formId}-evidence-hint`} className="mt-1 text-xs text-[var(--isalwa-slate)]">
            {QUOTE_LIFECYCLE_COPY.evidenceHint}
          </p>
        </div>
        <CommandSubmitButton
          label={QUOTE_LIFECYCLE_LABELS.recordAcceptance}
          pendingLabel={QUOTE_LIFECYCLE_LABELS.recordAcceptancePending}
        />
      </form>
    </div>
  );
}
