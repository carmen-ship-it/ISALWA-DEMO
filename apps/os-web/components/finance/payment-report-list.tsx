'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, StatusPill, type StatusPillTone } from '@isalwa/ui';
import {
  PAYMENT_REPORT_STATE_LABELS,
  PAYMENT_TENDER_METHOD_LABELS,
  PAYMENT_TENDER_VERIFICATION_LABELS,
  type PaymentReportState,
  type PaymentReportView,
  type PaymentTenderVerification,
  type PaymentTenderView,
} from '@isalwa/os-contracts';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { fieldClass } from '@/components/operations/subject';
import { PAYMENT_DESK_COPY, formatBs, parseBsToCentavos } from '@/lib/finance';
import {
  allocatePaymentAction,
  decidePaymentTenderAction,
  loadCustomerOrdersAction,
  loadPaymentReportsAction,
  releasePaymentAllocationAction,
  resolvePaymentRecipientAction,
  reversePaymentTenderAction,
  uploadPaymentEvidenceAction,
  type PaymentReportListView,
} from '@/lib/finance/payments-actions';

const STATE_TONE: Record<PaymentReportState, StatusPillTone> = {
  pending: 'warning',
  partially_verified: 'warning',
  confirmed: 'success',
  partially_confirmed: 'info',
  rejected: 'danger',
  reversed: 'neutral',
  not_confirmed: 'neutral',
};

const VERIFICATION_TONE: Record<PaymentTenderVerification, StatusPillTone> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  reversed: 'neutral',
};

type PaymentReportListProps = {
  canVerify: boolean;
  /** Bumped by the form when a report was just recorded, so the list reloads from the server. */
  reloadToken: number;
  initialCustomerId?: string;
};

/**
 * Reported payments as the API returns them. Accounting sees "Por verificar" first; everyone
 * else sees their own reports and those of customers they may read. Every outcome shown here
 * was recorded by a person; the aggregate is derived from the tenders, never a single flag.
 */
export function PaymentReportList({ canVerify, reloadToken, initialCustomerId }: PaymentReportListProps) {
  const [view, setView] = useState<PaymentReportListView>(canVerify ? 'queue' : 'visible');
  const [reports, setReports] = useState<PaymentReportView[]>([]);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadPaymentReportsAction({ view, partyId: view === 'visible' ? initialCustomerId : undefined });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setReports(result.data.items);
    setQueueCount(result.data.queueCount);
  }, [view, initialCustomerId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  function replace(report: PaymentReportView, extra?: PaymentReportView | null) {
    setReports((current) => {
      const next = current.map((item) => (item.id === report.id ? report : item));
      return extra && !next.some((item) => item.id === extra.id) ? [extra, ...next] : next;
    });
    if (view === 'queue') void load();
  }

  const title =
    view === 'queue' ? PAYMENT_DESK_COPY.queueTitle : view === 'all' ? PAYMENT_DESK_COPY.allTitle : PAYMENT_DESK_COPY.mineTitle;

  return (
    <div className="space-y-3" data-payment-report-list={view}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="isalwa-section-label">{title}</p>
          {view === 'queue' && queueCount !== null ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              {queueCount === 1 ? '1 reporte por verificar' : `${queueCount} reportes por verificar`}
            </p>
          ) : null}
        </div>
        {canVerify ? (
          <div className="flex gap-2" role="group" aria-label="Lista de pagos">
            {(['queue', 'all'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={
                  view === option
                    ? 'isalwa-t-fast inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-kiln)] bg-white px-3 text-sm font-medium text-[var(--isalwa-kiln)]'
                    : 'isalwa-t-fast inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]'
                }
              >
                {option === 'queue' ? PAYMENT_DESK_COPY.queueTitle : PAYMENT_DESK_COPY.allTitle}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <FormFeedback error={error} />

      {loading && reports.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          Cargando pagos…
        </p>
      ) : reports.length === 0 ? (
        <EmptyState
          title={view === 'queue' ? PAYMENT_DESK_COPY.queueEmpty : PAYMENT_DESK_COPY.mineEmpty}
          description={PAYMENT_DESK_COPY.registeredNote}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <PaymentReportCard key={report.id} report={report} canVerify={canVerify} onChanged={replace} />
          ))}
        </div>
      )}
    </div>
  );
}

function tenderLine(tender: PaymentTenderView): string {
  const reference = tender.reference ? ` · ref. ${tender.reference}` : '';
  return `${PAYMENT_TENDER_METHOD_LABELS[tender.method]} ${formatBs(tender.amountCentavos)}${reference}`;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PaymentReportCard(props: {
  report: PaymentReportView;
  canVerify: boolean;
  onChanged: (report: PaymentReportView, extra?: PaymentReportView | null) => void;
}) {
  const { report, canVerify } = props;
  const totals = report.totals;
  const hasConfirmed = totals.counts.confirmed > 0;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function attach(tenderId: string | null, file: File | null) {
    if (!file) return;
    const body = new FormData();
    body.set('reportId', report.id);
    if (tenderId) body.set('tenderId', tenderId);
    body.set('file', file);
    const result = await uploadPaymentEvidenceAction(body);
    if (!result.ok) {
      setSuccess(null);
      setError(result.error);
      return;
    }
    setError(null);
    setSuccess('Comprobante adjuntado. Sigue pendiente de verificación.');
    props.onChanged(result.data.report);
  }

  return (
    <article
      className="space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4"
      data-payment-report={report.id}
      data-payment-state={totals.state}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{report.customerLabel || 'Cliente'}</p>
          <p className="text-sm text-[var(--isalwa-slate)]">
            {formatBs(totals.reportedCentavos)} · pagó el {report.paidOn} · reportó {report.reportedByLabel}
            {report.orderNumber ? ` · para ${report.orderNumber}` : ''}
          </p>
        </div>
        <StatusPill tone={STATE_TONE[totals.state]}>{PAYMENT_REPORT_STATE_LABELS[totals.state]}</StatusPill>
      </header>

      {report.possibleDuplicate ? (
        <p className="text-sm text-[var(--isalwa-danger)]" role="status">
          {PAYMENT_DESK_COPY.possibleDuplicate}
        </p>
      ) : null}
      {report.correctsReportId ? (
        <p className="text-sm text-[var(--isalwa-slate)]">Reemplaza a un reporte revertido; el original sigue en el historial.</p>
      ) : null}
      {report.note ? <p className="text-sm text-[var(--isalwa-slate)]">{report.note}</p> : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4" data-payment-totals="">
        <TotalItem label={PAYMENT_DESK_COPY.confirmed} value={totals.confirmedCentavos} />
        <TotalItem label={PAYMENT_DESK_COPY.pending} value={totals.pendingCentavos} />
        <TotalItem label={PAYMENT_DESK_COPY.allocated} value={totals.allocatedCentavos} />
        <TotalItem label={PAYMENT_DESK_COPY.unassigned} value={totals.unassignedCentavos} />
      </dl>

      <ul className="divide-y divide-[var(--isalwa-mist)]">
        {report.tenders.map((tender) => (
          <TenderRow
            key={tender.id}
            report={report}
            tender={tender}
            canVerify={canVerify}
            canAttach={report.can.addEvidence}
            onAttach={(file) => attach(tender.id, file)}
            onChanged={props.onChanged}
            setNotice={(message) => {
              setError(null);
              setSuccess(message);
            }}
            setError={(message) => {
              setSuccess(null);
              setError(message);
            }}
          />
        ))}
      </ul>

      {report.evidence.some((item) => item.tenderId === null) ? (
        <ul className="text-sm">
          {report.evidence
            .filter((item) => item.tenderId === null)
            .map((item) => (
              <li key={item.id}>
                <EvidenceLink reportId={report.id} id={item.id} fileName={item.fileName} />
              </li>
            ))}
        </ul>
      ) : null}

      {report.can.addEvidence ? (
        <label className="block text-sm text-[var(--isalwa-slate)]">
          {PAYMENT_DESK_COPY.attach}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              void attach(null, event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>
      ) : null}

      <FormFeedback error={error} success={success} />

      {canVerify && report.can.allocate && (hasConfirmed || report.allocations.length > 0) ? (
        <AllocationSection report={report} onChanged={props.onChanged} setError={setError} setNotice={setSuccess} />
      ) : null}
      {report.allocations.length > 0 && !canVerify ? (
        <ul className="text-sm text-[var(--isalwa-slate)]">
          {report.allocations
            .filter((item) => item.status === 'active')
            .map((item) => (
              <li key={item.id}>
                {formatBs(item.amountCentavos)} asignado a {item.orderNumber ?? 'un pedido'}
              </li>
            ))}
        </ul>
      ) : null}
    </article>
  );
}

function TotalItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="isalwa-section-label">{label}</dt>
      <dd className="text-[var(--isalwa-kiln)]">{formatBs(value)}</dd>
    </div>
  );
}

function EvidenceLink({ reportId, id, fileName }: { reportId: string; id: string; fileName: string }) {
  return (
    <a
      href={`/api/payment-reports/${encodeURIComponent(reportId)}/evidence/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-[var(--isalwa-glaze)] underline"
    >
      {fileName}
    </a>
  );
}

function TenderRow(props: {
  report: PaymentReportView;
  tender: PaymentTenderView;
  canVerify: boolean;
  canAttach: boolean;
  onAttach: (file: File | null) => void;
  onChanged: (report: PaymentReportView, extra?: PaymentReportView | null) => void;
  setNotice: (message: string) => void;
  setError: (message: string) => void;
}) {
  const { report, tender, canVerify } = props;
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [replaceAmount, setReplaceAmount] = useState('');
  const [replaceReference, setReplaceReference] = useState('');
  const evidence = report.evidence.filter((item) => item.tenderId === tender.id);
  const unresolved = tender.method === 'cash' && !tender.cashRecipientMemberId;

  async function decide(action: 'confirm' | 'reject') {
    if (reason.trim().length < 3) {
      props.setError(PAYMENT_DESK_COPY.reasonRequired);
      return;
    }
    setBusy(true);
    const result = await decidePaymentTenderAction({ reportId: report.id, tenderId: tender.id, action, reason });
    setBusy(false);
    if (!result.ok) {
      props.setError(result.error);
      return;
    }
    setReason('');
    props.setNotice(action === 'confirm' ? 'Recepción confirmada para este medio.' : 'Quedó registrado que no se confirmó.');
    props.onChanged(result.data.report);
  }

  async function resolveRecipient(form: HTMLFormElement) {
    const recipientMemberId = String(new FormData(form).get(`resolve-${tender.id}`) ?? '').trim();
    if (!recipientMemberId) {
      props.setError('Elija quién recibió el efectivo.');
      return;
    }
    setBusy(true);
    const result = await resolvePaymentRecipientAction({ reportId: report.id, tenderId: tender.id, recipientMemberId });
    setBusy(false);
    if (!result.ok) {
      props.setError(result.error);
      return;
    }
    props.setNotice('Receptor registrado. Ahora se puede verificar el efectivo.');
    props.onChanged(result.data.report);
  }

  async function reverse() {
    if (reason.trim().length < 3) {
      props.setError(PAYMENT_DESK_COPY.reasonRequired);
      return;
    }
    let replacement:
      | { paidOn: string; tenders: Array<{ method: PaymentTenderView['method']; amountCentavos: string; reference: string | null; cashRecipientMemberId: string | null; cashRecipientUnresolvedReason: string | null }> }
      | undefined;
    if (replaceAmount.trim()) {
      const amount = parseBsToCentavos(replaceAmount);
      if (!amount) {
        props.setError('El monto del reemplazo debe ser mayor que cero.');
        return;
      }
      replacement = {
        paidOn: report.paidOn,
        tenders: [
          {
            method: tender.method,
            amountCentavos: amount,
            reference: replaceReference.trim() || null,
            cashRecipientMemberId: tender.method === 'cash' ? tender.cashRecipientMemberId : null,
            cashRecipientUnresolvedReason:
              tender.method === 'cash' && !tender.cashRecipientMemberId ? 'Reemplazo: receptor por confirmar' : null,
          },
        ],
      };
    }
    setBusy(true);
    const result = await reversePaymentTenderAction({ reportId: report.id, tenderId: tender.id, reason, replacement });
    setBusy(false);
    if (!result.ok) {
      props.setError(result.error);
      return;
    }
    setReason('');
    setReversing(false);
    props.setNotice(
      result.data.replacement
        ? 'Medio revertido. El reemplazo quedó por verificar y apunta al original.'
        : 'Medio revertido. El original queda en el historial.',
    );
    props.onChanged(result.data.report, result.data.replacement);
  }

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0" data-payment-tender={tender.id} data-tender-verification={tender.verification}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{tenderLine(tender)}</p>
        <StatusPill tone={VERIFICATION_TONE[tender.verification]}>
          {PAYMENT_TENDER_VERIFICATION_LABELS[tender.verification]}
        </StatusPill>
      </div>
      {tender.method === 'cash' ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          {tender.cashRecipientMemberId
            ? `Recibió: ${tender.cashRecipientLabel ?? 'miembro del equipo'}`
            : `${PAYMENT_DESK_COPY.cashRecipientUnknown}${
                tender.cashRecipientUnresolvedReason ? `: ${tender.cashRecipientUnresolvedReason}` : ''
              }`}
        </p>
      ) : null}
      {tender.outcomes.length > 0 ? (
        <ol className="space-y-0.5 text-sm text-[var(--isalwa-slate)]">
          {tender.outcomes.map((outcome) => (
            <li key={`${outcome.action}:${outcome.at}`}>
              {PAYMENT_TENDER_VERIFICATION_LABELS[outcome.action]} por {outcome.actorLabel} el {dayLabel(outcome.at)}: {outcome.reason}
            </li>
          ))}
        </ol>
      ) : null}
      {evidence.length > 0 ? (
        <ul className="text-sm">
          {evidence.map((item) => (
            <li key={item.id}>
              <EvidenceLink reportId={report.id} id={item.id} fileName={item.fileName} />
            </li>
          ))}
        </ul>
      ) : null}

      {canVerify && tender.verification === 'pending' ? (
        <div className="space-y-2">
          {unresolved ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void resolveRecipient(event.currentTarget);
              }}
            >
              <ServerMemberTypeahead id={`resolve-${tender.id}`} name={`resolve-${tender.id}`} />
              <Button type="submit" variant="secondary" size="sm" disabled={busy}>
                {PAYMENT_DESK_COPY.resolveRecipient}
              </Button>
            </form>
          ) : null}
          <label htmlFor={`reason-${tender.id}`} className="isalwa-section-label">
            {PAYMENT_DESK_COPY.reasonLabel}
          </label>
          <input
            id={`reason-${tender.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || unresolved} onClick={() => void decide('confirm')}>
              {PAYMENT_DESK_COPY.confirm}
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => void decide('reject')}>
              {PAYMENT_DESK_COPY.reject}
            </Button>
          </div>
        </div>
      ) : null}

      {canVerify && tender.verification === 'confirmed' ? (
        reversing ? (
          <div className="space-y-2">
            <label htmlFor={`reverse-reason-${tender.id}`} className="isalwa-section-label">
              {PAYMENT_DESK_COPY.reasonLabel}
            </label>
            <input
              id={`reverse-reason-${tender.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
            <p className="text-sm text-[var(--isalwa-slate)]">
              {PAYMENT_DESK_COPY.replacementTitle}. {PAYMENT_DESK_COPY.replacementHint}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                aria-label="Monto del reemplazo (Bs)"
                inputMode="decimal"
                value={replaceAmount}
                onChange={(event) => setReplaceAmount(event.target.value)}
                className={fieldClass}
                placeholder="Monto del reemplazo (Bs)"
                autoComplete="off"
              />
              <input
                aria-label="Referencia del reemplazo"
                value={replaceReference}
                onChange={(event) => setReplaceReference(event.target.value)}
                className={fieldClass}
                placeholder="Referencia (opcional)"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" disabled={busy} onClick={() => void reverse()}>
                {PAYMENT_DESK_COPY.reverse}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReversing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setReversing(true)}>
            {PAYMENT_DESK_COPY.reverse}
          </Button>
        )
      ) : null}

      {props.canAttach && tender.verification === 'pending' ? (
        <label className="block text-sm text-[var(--isalwa-slate)]">
          {PAYMENT_DESK_COPY.attach}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              props.onAttach(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>
      ) : null}
    </li>
  );
}

function AllocationSection(props: {
  report: PaymentReportView;
  onChanged: (report: PaymentReportView) => void;
  setError: (message: string | null) => void;
  setNotice: (message: string | null) => void;
}) {
  const { report } = props;
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string }>>([]);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [releaseReason, setReleaseReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    void loadCustomerOrdersAction(report.customerId).then((result) => {
      if (!cancelled && result.ok) setOrders(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [report.customerId]);

  async function allocate() {
    const centavos = parseBsToCentavos(amount);
    if (!orderId || !centavos) {
      props.setError('Elija el pedido y un monto mayor que cero.');
      return;
    }
    setBusy(true);
    const result = await allocatePaymentAction({ reportId: report.id, orderId, amountCentavos: centavos, idempotencyKey: attemptKey });
    setBusy(false);
    if (!result.ok) {
      props.setError(result.error);
      return;
    }
    props.setError(null);
    props.setNotice('Fondos asignados al pedido. Lo restante queda sin asignar.');
    setAmount('');
    setAttemptKey(crypto.randomUUID());
    props.onChanged(result.data.report);
  }

  async function release(allocationId: string) {
    if (releaseReason.trim().length < 3) {
      props.setError(PAYMENT_DESK_COPY.reasonRequired);
      return;
    }
    setBusy(true);
    const result = await releasePaymentAllocationAction({ reportId: report.id, allocationId, reason: releaseReason });
    setBusy(false);
    if (!result.ok) {
      props.setError(result.error);
      return;
    }
    props.setError(null);
    props.setNotice('Asignación liberada. Los fondos vuelven a quedar sin asignar.');
    setReleaseReason('');
    props.onChanged(result.data.report);
  }

  const active = report.allocations.filter((item) => item.status === 'active');
  return (
    <section className="space-y-2 border-t border-[var(--isalwa-mist)] pt-3" data-payment-allocations="">
      <p className="isalwa-section-label">{PAYMENT_DESK_COPY.allocate}</p>
      <p className="text-sm text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.allocateIntro}</p>
      {active.length > 0 ? (
        <>
          <ul className="space-y-1 text-sm text-[var(--isalwa-kiln)]">
            {active.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {formatBs(item.amountCentavos)} → {item.orderNumber ?? 'pedido'} · {item.allocatedByLabel}
                </span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void release(item.id)}>
                  {PAYMENT_DESK_COPY.release}
                </Button>
              </li>
            ))}
          </ul>
          <input
            aria-label="Motivo para liberar la asignación"
            value={releaseReason}
            onChange={(event) => setReleaseReason(event.target.value)}
            className={fieldClass}
            placeholder="Motivo para liberar"
            autoComplete="off"
          />
        </>
      ) : null}
      {report.totals.unassignedCentavos !== '0' ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor={`allocate-order-${report.id}`} className="isalwa-section-label">
              {PAYMENT_DESK_COPY.allocateOrder}
            </label>
            <select
              id={`allocate-order-${report.id}`}
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Elegir pedido</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`allocate-amount-${report.id}`} className="isalwa-section-label">
              {PAYMENT_DESK_COPY.allocateAmount}
            </label>
            <input
              id={`allocate-amount-${report.id}`}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void allocate()}>
            {PAYMENT_DESK_COPY.allocate}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
