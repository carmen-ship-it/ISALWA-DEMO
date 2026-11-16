'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, EmptyState, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { fieldClass } from '@/components/operations/subject';
import { PAYMENT_DESK_COPY } from '@/lib/finance';
import {
  checkPaymentInstructionShareAction,
  createPaymentInstructionDraftAction,
  loadCurrentPaymentInstructionsAction,
  loadPaymentInstructionVersionsAction,
  publishPaymentInstructionAction,
  retirePaymentInstructionAction,
  uploadPaymentInstructionQrAction,
  type AdminInstruction,
  type CurrentInstructions,
} from '@/lib/finance/payments-actions';

const METHOD_LABEL = { qr: 'QR', transfer: 'Transferencia' } as const;

/**
 * Approved payment instructions (QR / bank transfer). Members only ever see versions that one
 * authorized person drafted and a different one published. With none, the honest empty state
 * is shown and no destination is offered. Copying is a human step: nothing is sent from here.
 */
export function PaymentInstructionsPanel({ canPublish }: { canPublish: boolean }) {
  const [current, setCurrent] = useState<CurrentInstructions | null>(null);
  const [versions, setVersions] = useState<AdminInstruction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await loadCurrentPaymentInstructionsAction();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrent(result.data);
    if (canPublish) {
      const all = await loadPaymentInstructionVersionsAction();
      if (all.ok) setVersions(all.data);
    }
  }, [canPublish]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyShare(id: string) {
    const checked = await checkPaymentInstructionShareAction(id);
    if (!checked.ok) {
      setSuccess(null);
      setError(checked.error);
      void load();
      return;
    }
    try {
      await navigator.clipboard.writeText(checked.shareText);
      setError(null);
      setSuccess(PAYMENT_DESK_COPY.copied);
    } catch {
      setSuccess(null);
      setError('No se pudo copiar. Seleccione el texto y cópielo a mano.');
    }
  }

  return (
    <section className="space-y-3" aria-label={PAYMENT_DESK_COPY.instructionsTitle} data-payment-instructions="">
      <div>
        <p className="isalwa-kicker">Cobro</p>
        <h2 className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">{PAYMENT_DESK_COPY.instructionsTitle}</h2>
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{PAYMENT_DESK_COPY.instructionsIntro}</p>
      </div>
      <FormFeedback error={error} success={success} />

      {current === null ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          Cargando instrucciones…
        </p>
      ) : current.absent ? (
        <EmptyState title={current.absentCopy ?? ''} description="Cuando dos personas autorizadas aprueben un QR o una cuenta, aparecerán aquí." />
      ) : (
        <ul className="space-y-3">
          {current.items.map(({ instruction, shareText }) => (
            <li
              key={instruction.id}
              className="space-y-2 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4"
              data-payment-instruction={instruction.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {METHOD_LABEL[instruction.method]} · versión {instruction.version}
                </p>
                <StatusPill tone="success">Aprobado</StatusPill>
              </div>
              <p className="text-sm text-[var(--isalwa-slate)]">Titular: {instruction.holderLabel}</p>
              {instruction.hasQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/payment-instructions/${encodeURIComponent(instruction.id)}/qr`}
                  alt={`QR aprobado de ${instruction.holderLabel}`}
                  className="h-48 w-48 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] object-contain"
                />
              ) : null}
              <pre className="whitespace-pre-wrap rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-porcelain)] p-3 text-sm text-[var(--isalwa-kiln)]">
                {shareText}
              </pre>
              <Button size="sm" variant="secondary" onClick={() => void copyShare(instruction.id)}>
                {PAYMENT_DESK_COPY.copyShare}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canPublish ? (
        <InstructionAdmin
          versions={versions}
          onChanged={() => void load()}
          setError={setError}
          setSuccess={setSuccess}
        />
      ) : null}
    </section>
  );
}

function InstructionAdmin(props: {
  versions: AdminInstruction[];
  onChanged: () => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
}) {
  const [method, setMethod] = useState<'qr' | 'transfer'>('transfer');
  const [holder, setHolder] = useState('');
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await createPaymentInstructionDraftAction({
      method,
      holderLabel: holder,
      bankName: method === 'transfer' ? bank : null,
      accountReference: method === 'transfer' ? account : null,
      publicNote: publicNote || null,
    });
    setBusy(false);
    if (!result.ok) {
      props.setSuccess(null);
      props.setError(result.error);
      return;
    }
    props.setError(null);
    props.setSuccess('Borrador guardado. Otra persona autorizada debe aprobarlo para publicarlo.');
    setHolder('');
    setBank('');
    setAccount('');
    setPublicNote('');
    props.onChanged();
  }

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      props.setSuccess(null);
      props.setError(result.error);
      return;
    }
    props.setError(null);
    props.setSuccess(message);
    props.onChanged();
  }

  async function uploadQr(id: string, file: File | null) {
    if (!file) return;
    const body = new FormData();
    body.set('instructionId', id);
    body.set('file', file);
    await run(() => uploadPaymentInstructionQrAction(body), 'QR cargado en el borrador.');
  }

  const open = props.versions.filter((item) => item.status !== 'retired');
  return (
    <div className="space-y-3 border-t border-[var(--isalwa-mist)] pt-3" data-payment-instructions-admin="">
      <p className="isalwa-section-label">{PAYMENT_DESK_COPY.draftTitle}</p>
      <form onSubmit={createDraft} className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="instruction-method" className="isalwa-section-label">
              Tipo
            </label>
            <select
              id="instruction-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as 'qr' | 'transfer')}
              className={fieldClass}
            >
              <option value="transfer">Transferencia</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div>
            <label htmlFor="instruction-holder" className="isalwa-section-label">
              Titular
            </label>
            <input id="instruction-holder" required value={holder} onChange={(event) => setHolder(event.target.value)} className={fieldClass} />
          </div>
        </div>
        {method === 'transfer' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="instruction-bank" className="isalwa-section-label">
                Banco
              </label>
              <input id="instruction-bank" required value={bank} onChange={(event) => setBank(event.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="instruction-account" className="isalwa-section-label">
                Cuenta
              </label>
              <input id="instruction-account" required value={account} onChange={(event) => setAccount(event.target.value)} className={fieldClass} />
            </div>
          </div>
        ) : null}
        <div>
          <label htmlFor="instruction-note" className="isalwa-section-label">
            Nota pública (opcional)
          </label>
          <input id="instruction-note" value={publicNote} onChange={(event) => setPublicNote(event.target.value)} className={fieldClass} />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          Guardar borrador
        </Button>
      </form>

      {open.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor="instruction-reason" className="isalwa-section-label">
            Motivo (para retirar)
          </label>
          <input id="instruction-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={fieldClass} autoComplete="off" />
          <ul className="space-y-2">
            {open.map((item) => (
              <li key={item.id} className="space-y-2 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--isalwa-kiln)]">
                    {METHOD_LABEL[item.method]} · versión {item.version} · {item.holderLabel}
                  </span>
                  <StatusPill tone={item.status === 'published' ? 'success' : 'draft'}>
                    {item.status === 'published' ? 'Publicado' : 'Borrador'}
                  </StatusPill>
                </div>
                {item.status === 'draft' && item.method === 'qr' ? (
                  <label className="block text-[var(--isalwa-slate)]">
                    {item.hasQr ? 'Reemplazar archivo del QR' : 'Archivo del QR aprobado'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-1 block w-full"
                      onChange={(event) => {
                        void uploadQr(item.id, event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {item.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(() => publishPaymentInstructionAction(item.id), 'Instrucciones aprobadas y publicadas.')
                      }
                    >
                      {PAYMENT_DESK_COPY.publish}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() =>
                      void run(
                        () => retirePaymentInstructionAction({ instructionId: item.id, reason }),
                        'Instrucciones retiradas. Ya no se pueden compartir.',
                      )
                    }
                  >
                    {PAYMENT_DESK_COPY.retire}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
