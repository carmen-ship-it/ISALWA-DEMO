'use client';

import { useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  MANUAL_CONVERSATION_COPY,
  MANUAL_CONVERSATION_ERRORS,
  admitManualConversation,
} from '@/lib/conversations/manual-conversation';
import type { ManualCustomerConversation } from '../../../../packages/os-contracts/src/customer-conversation';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export type ManualConversationActor = {
  organizationId: string;
  memberId: string;
  enteredByLabel: string;
};

type ManualConversationPanelProps = {
  actor: ManualConversationActor | null;
};

function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function ManualConversationPanel({ actor }: ManualConversationPanelProps) {
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [contactLabel, setContactLabel] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'manual'>('whatsapp');
  const [occurredAt, setOccurredAt] = useState('');
  const [summary, setSummary] = useState('');
  const [pastedEvidence, setPastedEvidence] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [customerQuestion, setCustomerQuestion] = useState('');
  const [commitmentCandidate, setCommitmentCandidate] = useState('');
  const [possibleRequestedDate, setPossibleRequestedDate] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ManualCustomerConversation[]>([]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor) {
      setError(MANUAL_CONVERSATION_COPY.sessionNeeded);
      return;
    }
    const occurredIso = toIso(occurredAt);
    if (!occurredIso) {
      setError(MANUAL_CONVERSATION_ERRORS.invalid_occurred_at);
      return;
    }
    const admitted = admitManualConversation({
      id: crypto.randomUUID(),
      organizationId: actor.organizationId,
      customerId,
      customerLabel,
      contactLabel,
      channel,
      occurredAt: occurredIso,
      enteredByMemberId: actor.memberId,
      enteredByLabel: actor.enteredByLabel,
      summary,
      pastedEvidence,
      opportunityId,
      quoteId,
      orderId,
      customerQuestion,
      commitmentCandidate,
      possibleRequestedDate,
      nextAction,
    });
    if (!admitted.ok) {
      setError(MANUAL_CONVERSATION_ERRORS[admitted.reason]);
      return;
    }
    setError(null);
    setRecords((current) => [admitted.record, ...current]);
    setSummary('');
    setPastedEvidence('');
    setCustomerQuestion('');
    setCommitmentCandidate('');
    setNextAction('');
  }

  return (
    <section aria-label={MANUAL_CONVERSATION_COPY.title} className="w-full max-w-xl space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">{MANUAL_CONVERSATION_COPY.title}</h2>
        <StatusPill tone="demo">Canal no conectado</StatusPill>
        <StatusPill tone="manual">{MANUAL_CONVERSATION_COPY.numberPending}</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.channelClosed}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.companyEntered}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.boundary}</p>
      {records.map((record) => (
        <p key={record.id} className="text-sm leading-relaxed text-[var(--isalwa-kiln)]" role="status">
          {MANUAL_CONVERSATION_COPY.recorded} {record.customerLabel}. {record.summary}
        </p>
      ))}
      <form onSubmit={onSubmit} className="space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
        <FormFeedback error={error} />
        {actor ? (
          <p className="text-sm text-[var(--isalwa-slate)]">
            {MANUAL_CONVERSATION_COPY.enteredBy}: {actor.enteredByLabel}
          </p>
        ) : (
          <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.sessionNeeded}</p>
        )}
        <div>
          <label htmlFor="conversation-customer" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.customer}
          </label>
          <input
            id="conversation-customer"
            name="customerId"
            required
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.customerHint}</p>
        </div>
        <div>
          <label htmlFor="conversation-customer-name" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.customerName}
          </label>
          <input
            id="conversation-customer-name"
            name="customerLabel"
            required
            value={customerLabel}
            onChange={(event) => setCustomerLabel(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="conversation-contact" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.contact}
          </label>
          <input
            id="conversation-contact"
            name="contactLabel"
            value={contactLabel}
            onChange={(event) => setContactLabel(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="isalwa-section-label">{MANUAL_CONVERSATION_COPY.channel}</legend>
          <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
            <input
              type="radio"
              name="channel"
              value="whatsapp"
              checked={channel === 'whatsapp'}
              onChange={() => setChannel('whatsapp')}
            />
            {MANUAL_CONVERSATION_COPY.channelWhatsapp}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
            <input
              type="radio"
              name="channel"
              value="manual"
              checked={channel === 'manual'}
              onChange={() => setChannel('manual')}
            />
            {MANUAL_CONVERSATION_COPY.channelManual}
          </label>
          <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.channelHint}</p>
        </fieldset>
        <div>
          <label htmlFor="conversation-occurred" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.occurredAt}
          </label>
          <input
            id="conversation-occurred"
            name="occurredAt"
            type="datetime-local"
            required
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="conversation-summary" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.summary}
          </label>
          <textarea
            id="conversation-summary"
            name="summary"
            required
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="conversation-pasted" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.pasted}
          </label>
          <textarea
            id="conversation-pasted"
            name="pastedEvidence"
            rows={3}
            value={pastedEvidence}
            onChange={(event) => setPastedEvidence(event.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.pastedHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="conversation-opportunity" className="isalwa-section-label">
              {MANUAL_CONVERSATION_COPY.opportunity}
            </label>
            <input
              id="conversation-opportunity"
              name="opportunityId"
              value={opportunityId}
              onChange={(event) => setOpportunityId(event.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="conversation-quote" className="isalwa-section-label">
              {MANUAL_CONVERSATION_COPY.quote}
            </label>
            <input
              id="conversation-quote"
              name="quoteId"
              value={quoteId}
              onChange={(event) => setQuoteId(event.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="conversation-order" className="isalwa-section-label">
              {MANUAL_CONVERSATION_COPY.order}
            </label>
            <input
              id="conversation-order"
              name="orderId"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
        </div>
        <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.linksHint}</p>
        <div>
          <label htmlFor="conversation-question" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.question}
          </label>
          <input
            id="conversation-question"
            name="customerQuestion"
            value={customerQuestion}
            onChange={(event) => setCustomerQuestion(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="conversation-commitment" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.commitment}
          </label>
          <input
            id="conversation-commitment"
            name="commitmentCandidate"
            value={commitmentCandidate}
            onChange={(event) => setCommitmentCandidate(event.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.commitmentHint}</p>
        </div>
        <div>
          <label htmlFor="conversation-requested-date" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.requestedDate}
          </label>
          <input
            id="conversation-requested-date"
            name="possibleRequestedDate"
            type="date"
            value={possibleRequestedDate}
            onChange={(event) => setPossibleRequestedDate(event.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.requestedDateHint}</p>
        </div>
        <div>
          <label htmlFor="conversation-next" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.nextAction}
          </label>
          <input
            id="conversation-next"
            name="nextAction"
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            className={fieldClass}
          />
        </div>
        <Button type="submit" disabled={!actor}>
          {MANUAL_CONVERSATION_COPY.submit}
        </Button>
      </form>
    </section>
  );
}
