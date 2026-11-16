'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import {
  PAYMENT_MAX_TENDERS,
  PAYMENT_TENDER_METHODS,
  PAYMENT_TENDER_METHOD_LABELS,
  type PaymentReportView,
  type PaymentTenderMethod,
} from '@isalwa/os-contracts';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';
import { fieldClass } from '@/components/operations/subject';
import {
  PAYMENT_DESK_COPY,
  PAYMENT_FORM_PROBLEM_COPY,
  buildPaymentReportRequest,
  formatBs,
  tenderSumDifference,
  type TenderDraft,
} from '@/lib/finance';
import {
  loadCustomerOrdersAction,
  recordPaymentReportAction,
  uploadPaymentEvidenceAction,
} from '@/lib/finance/payments-actions';

type PaymentReportFormProps = {
  initialCustomerId?: string;
  initialCustomerLabel?: string;
  initialOrderId?: string;
  onRecorded: (report: PaymentReportView) => void;
};

type OrderChoice = { id: string; orderNumber: string };

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function newTender(method: PaymentTenderMethod = 'qr'): TenderDraft {
  return {
    key: crypto.randomUUID(),
    method,
    amount: '',
    reference: '',
    cashRecipientMemberId: '',
    cashRecipientUnresolvedReason: '',
  };
}

/**
 * "Registrar pago reportado": customer, optional intended order, total, date and one or more
 * payment tenders with their own references, receiver (cash) and private evidence.
 * Saving only records the report. Nothing is confirmed here; Contabilidad verifies each tender.
 */
export function PaymentReportForm(props: PaymentReportFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [customerId, setCustomerId] = useState(props.initialCustomerId ?? '');
  const [customerLabel, setCustomerLabel] = useState(props.initialCustomerLabel ?? '');
  const [orders, setOrders] = useState<OrderChoice[]>([]);
  const [orderId, setOrderId] = useState(props.initialOrderId ?? '');
  const [total, setTotal] = useState('');
  const [paidOn, setPaidOn] = useState(todayLocal);
  const [note, setNote] = useState('');
  const [tenders, setTenders] = useState<TenderDraft[]>(() => [newTender('qr')]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrders([]);
    if (!customerId) {
      setOrderId('');
      return;
    }
    void loadCustomerOrdersAction(customerId).then((result) => {
      if (cancelled || !result.ok) return;
      setOrders(result.data);
      setOrderId((current) => (result.data.some((order) => order.id === current) ? current : ''));
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const difference = useMemo(() => tenderSumDifference({ total, tenders }), [total, tenders]);

  function updateTender(key: string, patch: Partial<TenderDraft>) {
    setTenders((current) => current.map((tender) => (tender.key === key ? { ...tender, ...patch } : tender)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const withRecipients = tenders.map((tender) => ({
      ...tender,
      cashRecipientMemberId:
        tender.method === 'cash' ? String(data.get(`cash-recipient-${tender.key}`) ?? '').trim() : '',
    }));
    const built = buildPaymentReportRequest({ customerId, orderId, total, paidOn, note, tenders: withRecipients });
    if (!built.ok) {
      setSuccess(null);
      setError(PAYMENT_FORM_PROBLEM_COPY[built.problem]);
      return;
    }
    setPending(true);
    setError(null);
    const saved = await recordPaymentReportAction(built.body, attemptKey);
    if (!saved.ok) {
      setPending(false);
      setSuccess(null);
      setError(saved.error);
      return;
    }
    let report = saved.data.report;
    let uploadProblem: string | null = null;
    for (const [index, tender] of tenders.entries()) {
      const file = files[tender.key];
      const created = report.tenders[index];
      if (!file || !created) continue;
      const body = new FormData();
      body.set('reportId', report.id);
      body.set('tenderId', created.id);
      body.set('file', file);
      const uploaded = await uploadPaymentEvidenceAction(body);
      if (uploaded.ok) report = uploaded.data.report;
      else uploadProblem = uploaded.error;
    }
    setPending(false);
    setError(null);
    setSuccess(
      uploadProblem
        ? `${saved.data.copy} El comprobante no se pudo adjuntar: ${uploadProblem} Puede adjuntarlo desde el reporte.`
        : saved.data.verifierConfigured
          ? saved.data.copy
          : `${saved.data.copy} Todavía no hay una persona con permiso para verificar pagos: avise a administración.`,
    );
    setAttemptKey(crypto.randomUUID());
    setTotal('');
    setNote('');
    setTenders([newTender('qr')]);
    setFiles({});
    formRef.current?.reset();
    props.onRecorded(report);
  }

  const mismatch = difference !== null && difference !== BigInt(0);

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" data-payment-report-form="">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="manual">Dato manual</StatusPill>
        <StatusPill tone="warning">Pendiente de verificación</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.formIntro}</p>
      <FormFeedback error={error} success={success} />

      <ServerPartyTypeahead
        id="payment-report-customer"
        label={PAYMENT_DESK_COPY.customer}
        required
        value={customerId}
        displayLabel={customerLabel}
        onChange={({ partyId, label }) => {
          setCustomerId(partyId);
          setCustomerLabel(label);
        }}
      />

      <div>
        <label htmlFor="payment-report-order" className="isalwa-section-label">
          {PAYMENT_DESK_COPY.order}
        </label>
        <select
          id="payment-report-order"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          className={fieldClass}
          disabled={!customerId || orders.length === 0}
        >
          <option value="">Sin pedido previsto</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNumber}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.orderHint}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="payment-report-total" className="isalwa-section-label">
            {PAYMENT_DESK_COPY.total}
          </label>
          <input
            id="payment-report-total"
            inputMode="decimal"
            required
            autoComplete="off"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="payment-report-date" className="isalwa-section-label">
            {PAYMENT_DESK_COPY.paidOn}
          </label>
          <input
            id="payment-report-date"
            type="date"
            required
            max={todayLocal()}
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="isalwa-section-label">{PAYMENT_DESK_COPY.tendersTitle}</legend>
        {tenders.map((tender, index) => (
          <div
            key={tender.key}
            className="space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] p-3"
            data-payment-tender-row=""
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`tender-method-${tender.key}`} className="isalwa-section-label">
                  {PAYMENT_DESK_COPY.method}
                </label>
                <select
                  id={`tender-method-${tender.key}`}
                  value={tender.method}
                  onChange={(event) => updateTender(tender.key, { method: event.target.value as PaymentTenderMethod })}
                  className={fieldClass}
                >
                  {PAYMENT_TENDER_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_TENDER_METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`tender-amount-${tender.key}`} className="isalwa-section-label">
                  {PAYMENT_DESK_COPY.amount}
                </label>
                <input
                  id={`tender-amount-${tender.key}`}
                  inputMode="decimal"
                  required
                  autoComplete="off"
                  value={tender.amount}
                  onChange={(event) => updateTender(tender.key, { amount: event.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={`tender-reference-${tender.key}`} className="isalwa-section-label">
                  {PAYMENT_DESK_COPY.reference}
                </label>
                <input
                  id={`tender-reference-${tender.key}`}
                  autoComplete="off"
                  value={tender.reference}
                  onChange={(event) => updateTender(tender.key, { reference: event.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>

            {tender.method === 'cash' ? (
              <div className="space-y-2">
                <p className="isalwa-section-label">{PAYMENT_DESK_COPY.cashRecipient}</p>
                <ServerMemberTypeahead
                  id={`cash-recipient-${tender.key}`}
                  name={`cash-recipient-${tender.key}`}
                />
                <p className="text-sm text-[var(--isalwa-slate)]">
                  Si todavía no se sabe, deje vacío: queda como «{PAYMENT_DESK_COPY.cashRecipientUnknown}» y no se
                  podrá confirmar hasta indicarlo.
                </p>
                <label htmlFor={`tender-reason-${tender.key}`} className="isalwa-section-label">
                  {PAYMENT_DESK_COPY.cashRecipientReason}
                </label>
                <input
                  id={`tender-reason-${tender.key}`}
                  autoComplete="off"
                  value={tender.cashRecipientUnresolvedReason}
                  onChange={(event) => updateTender(tender.key, { cashRecipientUnresolvedReason: event.target.value })}
                  className={fieldClass}
                />
              </div>
            ) : null}

            <div>
              <label htmlFor={`tender-file-${tender.key}`} className="isalwa-section-label">
                {PAYMENT_DESK_COPY.evidence}
              </label>
              <input
                id={`tender-file-${tender.key}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setFiles((current) => ({ ...current, [tender.key]: event.target.files?.[0] ?? null }))}
                className="mt-1.5 block w-full text-sm text-[var(--isalwa-slate)]"
              />
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.evidenceHint}</p>
            </div>

            {tenders.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setTenders((current) => current.filter((item) => item.key !== tender.key));
                  setFiles((current) => ({ ...current, [tender.key]: null }));
                }}
                aria-label={`${PAYMENT_DESK_COPY.removeTender} medio ${index + 1}`}
              >
                {PAYMENT_DESK_COPY.removeTender}
              </Button>
            ) : null}
          </div>
        ))}

        {tenders.length < PAYMENT_MAX_TENDERS ? (
          <Button type="button" variant="secondary" onClick={() => setTenders((current) => [...current, newTender('cash')])}>
            {PAYMENT_DESK_COPY.addTender}
          </Button>
        ) : null}

        {difference !== null ? (
          <p
            className={mismatch ? 'text-sm text-[var(--isalwa-danger)]' : 'text-sm text-[var(--isalwa-slate)]'}
            role="status"
            data-payment-sum-status={mismatch ? 'mismatch' : 'ok'}
          >
            {mismatch
              ? difference > BigInt(0)
                ? `Faltan ${formatBs(difference)} para llegar al total.`
                : `Los medios superan el total por ${formatBs(-difference)}.`
              : PAYMENT_DESK_COPY.sumOk}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor="payment-report-note" className="isalwa-section-label">
          {PAYMENT_DESK_COPY.note}
        </label>
        <textarea
          id="payment-report-note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? PAYMENT_DESK_COPY.saving : PAYMENT_DESK_COPY.submit}
      </Button>
    </form>
  );
}
