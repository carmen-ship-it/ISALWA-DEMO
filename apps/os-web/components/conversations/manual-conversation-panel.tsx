'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { SearchableSelect } from '@/components/experience/searchable-select';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';
import { createCustomerConversationAction } from '@/lib/conversations/actions';
import {
  MANUAL_CONVERSATION_COPY,
  MANUAL_CONVERSATION_ERRORS,
  admitManualConversation,
} from '@/lib/conversations/manual-conversation';
import {
  listPartyCommercialLinks,
  type PartyCommercialLinkOption,
} from '@/lib/productivity/actions';
import type { ManualCustomerConversation } from '@isalwa/os-contracts';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export type ManualConversationActor = {
  organizationId: string;
  memberId: string;
  enteredByLabel: string;
};

type ManualConversationPanelProps = {
  actor: ManualConversationActor | null;
  /** Optional host callback after a company-entered record is admitted. */
  onRecorded?: (record: ManualCustomerConversation) => void;
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
  const [channel, setChannel] = useState<'whatsapp' | 'manual'>('whatsapp');
  const [occurredAt, setOccurredAt] = useState('');
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
  const [nextAction, setNextAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ManualCustomerConversation[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    setError(null);
    const persisted = await createCustomerConversationAction(admitted.record);
    setSubmitting(false);
    if (!persisted.ok) {
      setError(persisted.error);
      return;
    }
    setRecords((current) => [admitted.record, ...current]);
    onRecorded?.(admitted.record);
    setSummary('');
    setPastedEvidence('');
    setCustomerQuestion('');
    setCommitmentCandidate('');
    setNextAction('');
  }

  const partySelected = Boolean(customerId.trim());

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
        <Button type="submit" disabled={!actor || !customerId.trim() || submitting}>
          {submitting ? 'Registrando…' : MANUAL_CONVERSATION_COPY.submit}
        </Button>
      </form>
    </section>
  );
}
