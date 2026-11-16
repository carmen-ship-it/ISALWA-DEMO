'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { SearchableSelect } from '@/components/experience/searchable-select';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import {
  createCustomerConversationAction,
  retryConversationNextStepAction,
  type ConversationNextStepResult,
} from '@/lib/conversations/actions';
import {
  ATTENTION_CHANNELS,
  ATTENTION_CHANNEL_LABELS,
  MANUAL_CONVERSATION_COPY,
  MANUAL_CONVERSATION_ERRORS,
  admitManualConversation,
  type AttentionChannel,
} from '@/lib/conversations/manual-conversation';
import {
  listPartyCommercialLinks,
  type PartyCommercialLinkOption,
} from '@/lib/productivity/actions';
import type { ConversationNextStep, ManualCustomerConversation } from '@isalwa/os-contracts';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export type ManualConversationActor = {
  organizationId: string;
  memberId: string;
  enteredByLabel: string;
};

/** What the host learns when an attention is saved. `partial` = saved, next step not created. */
export type ManualConversationSaveOutcome = { partial: boolean };

type ManualConversationPanelProps = {
  actor: ManualConversationActor | null;
  /** Optional host callback after a company-entered record is admitted. */
  onRecorded?: (record: ManualCustomerConversation, outcome: ManualConversationSaveOutcome) => void;
};

/** `datetime-local` value for "now" in the browser's time zone. */
function nowLocalValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

type SavedAttention = {
  conversationId: string;
  customerId: string;
  customerLabel: string;
  nextStep: ConversationNextStepResult;
  /** Kept so a failed next step can be retried without retyping or re-saving the attention. */
  pendingStep: ConversationNextStep | null;
};

function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toSearchable(options: readonly PartyCommercialLinkOption[]) {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    hint: option.hint,
  }));
}

export function ManualConversationPanel({ actor, onRecorded }: ManualConversationPanelProps) {
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [contactLabel, setContactLabel] = useState('');
  const [channel, setChannel] = useState<AttentionChannel>('call');
  const [occurredAt, setOccurredAt] = useState('');
  const [reason, setReason] = useState('');
  const [summary, setSummary] = useState('');
  const [pastedEvidence, setPastedEvidence] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [opportunityOptions, setOpportunityOptions] = useState<PartyCommercialLinkOption[]>([]);
  const [quoteOptions, setQuoteOptions] = useState<PartyCommercialLinkOption[]>([]);
  const [orderOptions, setOrderOptions] = useState<PartyCommercialLinkOption[]>([]);
  const [linksStatus, setLinksStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [customerQuestion, setCustomerQuestion] = useState('');
  const [commitmentCandidate, setCommitmentCandidate] = useState('');
  const [possibleRequestedDate, setPossibleRequestedDate] = useState('');
  const [withNextStep, setWithNextStep] = useState(false);
  const [nextStepDescription, setNextStepDescription] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAttention[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    setOccurredAt((current) => current || nowLocalValue());
  }, []);

  useEffect(() => {
    setOpportunityId('');
    setQuoteId('');
    setOrderId('');
    setOpportunityOptions([]);
    setQuoteOptions([]);
    setOrderOptions([]);
    if (!customerId.trim()) {
      setLinksStatus('idle');
      return;
    }
    let cancelled = false;
    setLinksStatus('loading');
    void listPartyCommercialLinks(customerId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setOpportunityOptions([]);
        setQuoteOptions([]);
        setOrderOptions([]);
        setLinksStatus('unavailable');
        return;
      }
      setOpportunityOptions(result.opportunities);
      setQuoteOptions(result.quotes);
      setOrderOptions(result.orders);
      setLinksStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor) {
      setError(MANUAL_CONVERSATION_COPY.sessionNeeded);
      return;
    }
    if (!customerId.trim() || !customerLabel.trim()) {
      setError(MANUAL_CONVERSATION_ERRORS.missing_customer);
      return;
    }
    const occurredIso = toIso(occurredAt);
    if (!occurredIso) {
      setError(MANUAL_CONVERSATION_ERRORS.invalid_occurred_at);
      return;
    }
    let nextStep: ConversationNextStep | null = null;
    if (withNextStep) {
      const ownerMemberId = String(new FormData(event.currentTarget).get('nextStepOwner') ?? '').trim();
      if (!nextStepDescription.trim() || !ownerMemberId || !nextStepDate.trim()) {
        setError(MANUAL_CONVERSATION_COPY.nextStepIncomplete);
        return;
      }
      nextStep = {
        description: nextStepDescription.trim(),
        ownerMemberId,
        dueDate: nextStepDate.trim(),
      };
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
      reason,
      pastedEvidence,
      opportunityId,
      quoteId,
      orderId,
      customerQuestion,
      commitmentCandidate,
      possibleRequestedDate,
      nextAction: '',
      nextStep,
    });
    if (!admitted.ok) {
      setError(MANUAL_CONVERSATION_ERRORS[admitted.reason]);
      return;
    }
    setSubmitting(true);
    setError(null);
    const persisted = await createCustomerConversationAction(admitted.record);
    setSubmitting(false);
    if (!persisted.ok) {
      // Nothing was saved: every field stays as typed so the person can fix and resend.
      setError(persisted.error);
      return;
    }
    setSaved((current) => [
      {
        conversationId: persisted.id,
        customerId: admitted.record.customerId,
        customerLabel: admitted.record.customerLabel,
        nextStep: persisted.nextStep,
        pendingStep: persisted.nextStep.status === 'failed' ? nextStep : null,
      },
      ...current,
    ]);
    onRecorded?.(admitted.record, { partial: persisted.nextStep.status === 'failed' });
    // The attention is saved either way, so the form clears to avoid saving it twice.
    setReason('');
    setSummary('');
    setPastedEvidence('');
    setCustomerQuestion('');
    setCommitmentCandidate('');
    setPossibleRequestedDate('');
    setWithNextStep(false);
    setNextStepDescription('');
    setNextStepDate('');
    setOccurredAt(nowLocalValue());
  }

  async function onRetryNextStep(item: SavedAttention) {
    if (!item.pendingStep) return;
    setRetryingId(item.conversationId);
    const result = await retryConversationNextStepAction({
      conversationId: item.conversationId,
      customerId: item.customerId,
      step: item.pendingStep,
    });
    setRetryingId(null);
    setSaved((current) =>
      current.map((entry) => {
        if (entry.conversationId !== item.conversationId) return entry;
        if (!result.ok) {
          return {
            ...entry,
            nextStep: { status: 'failed', code: 'RETRY_FAILED', message: result.error },
          };
        }
        return {
          ...entry,
          nextStep: result.nextStep,
          pendingStep: result.nextStep.status === 'failed' ? entry.pendingStep : null,
        };
      }),
    );
  }

  const partySelected = Boolean(customerId.trim());

  return (
    <section aria-label={MANUAL_CONVERSATION_COPY.title} className="w-full max-w-xl space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">{MANUAL_CONVERSATION_COPY.title}</h2>
        <StatusPill tone="manual">{MANUAL_CONVERSATION_COPY.numberPending}</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.channelClosed}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.companyEntered}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.boundary}</p>
      {saved.map((item) =>
        item.nextStep.status === 'failed' ? (
          <div
            key={item.conversationId}
            role="alert"
            className="space-y-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-amber,var(--isalwa-mist))] bg-white p-3"
          >
            <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
              {MANUAL_CONVERSATION_COPY.partialTitle} {item.customerLabel}.
            </p>
            <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.partialBody}</p>
            <p className="text-sm text-[var(--isalwa-slate)]">{item.nextStep.message}</p>
            {item.pendingStep ? (
              <Button
                type="button"
                variant="secondary"
                disabled={retryingId === item.conversationId}
                onClick={() => void onRetryNextStep(item)}
              >
                {retryingId === item.conversationId
                  ? MANUAL_CONVERSATION_COPY.partialRetrying
                  : MANUAL_CONVERSATION_COPY.partialRetry}
              </Button>
            ) : null}
          </div>
        ) : (
          <p
            key={item.conversationId}
            className="text-sm leading-relaxed text-[var(--isalwa-kiln)]"
            role="status"
          >
            {item.nextStep.status === 'created'
              ? MANUAL_CONVERSATION_COPY.recordedWithNextStep
              : MANUAL_CONVERSATION_COPY.recorded}{' '}
            {item.customerLabel}.
          </p>
        ),
      )}
      <form onSubmit={onSubmit} className="space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
        <FormFeedback error={error} />
        {actor ? (
          <p className="text-sm text-[var(--isalwa-slate)]">
            {MANUAL_CONVERSATION_COPY.enteredBy}: {actor.enteredByLabel}
          </p>
        ) : (
          <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.sessionNeeded}</p>
        )}
        <ServerPartyTypeahead
          id="conversation-customer"
          label={MANUAL_CONVERSATION_COPY.customer}
          required
          value={customerId}
          displayLabel={customerLabel}
          hint={MANUAL_CONVERSATION_COPY.customerHint}
          onChange={({ partyId, label }) => {
            setCustomerId(partyId);
            setCustomerLabel(label);
          }}
        />
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
          {ATTENTION_CHANNELS.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
              <input
                type="radio"
                name="channel"
                value={value}
                checked={channel === value}
                onChange={() => setChannel(value)}
              />
              {ATTENTION_CHANNEL_LABELS[value]}
            </label>
          ))}
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
          <label htmlFor="conversation-reason" className="isalwa-section-label">
            {MANUAL_CONVERSATION_COPY.reason}
          </label>
          <input
            id="conversation-reason"
            name="reason"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.reasonHint}</p>
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
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.summaryHint}</p>
        </div>
        <div className="space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--isalwa-kiln)]">
            <input
              type="checkbox"
              name="withNextStep"
              checked={withNextStep}
              onChange={(event) => setWithNextStep(event.target.checked)}
            />
            {MANUAL_CONVERSATION_COPY.nextStepToggle}
          </label>
          {withNextStep ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="conversation-next-step" className="isalwa-section-label">
                  {MANUAL_CONVERSATION_COPY.nextStepDescription}
                </label>
                <input
                  id="conversation-next-step"
                  name="nextStepDescription"
                  value={nextStepDescription}
                  onChange={(event) => setNextStepDescription(event.target.value)}
                  className={fieldClass}
                  autoComplete="off"
                />
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {MANUAL_CONVERSATION_COPY.nextStepDescriptionHint}
                </p>
              </div>
              <div>
                <p className="isalwa-section-label">{MANUAL_CONVERSATION_COPY.nextStepOwner}</p>
                <ServerMemberTypeahead id="conversation-next-step-owner" name="nextStepOwner" required />
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {MANUAL_CONVERSATION_COPY.nextStepOwnerHint}
                </p>
              </div>
              <div>
                <label htmlFor="conversation-next-step-date" className="isalwa-section-label">
                  {MANUAL_CONVERSATION_COPY.nextStepDate}
                </label>
                <input
                  id="conversation-next-step-date"
                  name="nextStepDate"
                  type="date"
                  value={nextStepDate}
                  onChange={(event) => setNextStepDate(event.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="text-sm text-[var(--isalwa-slate)]">{MANUAL_CONVERSATION_COPY.linksHint}</p>
          {!partySelected ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              {MANUAL_CONVERSATION_COPY.linksNeedParty}
            </p>
          ) : linksStatus === 'loading' ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              Cargando vínculos…
            </p>
          ) : linksStatus === 'unavailable' ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              No se pudieron cargar los vínculos de este cliente.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <SearchableSelect
                id="conversation-opportunity"
                label={MANUAL_CONVERSATION_COPY.opportunity}
                options={toSearchable(opportunityOptions)}
                value={opportunityId || null}
                onChange={(id) => setOpportunityId(id ?? '')}
                placeholder="Buscar oportunidad"
                noMatchLabel="Sin oportunidades"
                disabled={opportunityOptions.length === 0}
              />
              <SearchableSelect
                id="conversation-quote"
                label={MANUAL_CONVERSATION_COPY.quote}
                options={toSearchable(quoteOptions)}
                value={quoteId || null}
                onChange={(id) => setQuoteId(id ?? '')}
                placeholder="Buscar cotización"
                noMatchLabel="Sin cotizaciones"
                disabled={quoteOptions.length === 0}
              />
              <SearchableSelect
                id="conversation-order"
                label={MANUAL_CONVERSATION_COPY.order}
                options={toSearchable(orderOptions)}
                value={orderId || null}
                onChange={(id) => setOrderId(id ?? '')}
                placeholder="Buscar pedido"
                noMatchLabel="Sin pedidos"
                disabled={orderOptions.length === 0}
              />
            </div>
          )}
        </div>
        <details className="space-y-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
            {MANUAL_CONVERSATION_COPY.moreDetails}
          </summary>
          <div className="space-y-4 pt-3">
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
          </div>
        </details>
        <Button type="submit" disabled={!actor || !customerId.trim() || submitting}>
          {submitting ? 'Guardando…' : MANUAL_CONVERSATION_COPY.submit}
        </Button>
      </form>
    </section>
  );
}
