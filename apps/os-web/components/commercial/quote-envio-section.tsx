'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Button } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { AppToast, AppToastRegion } from '@/components/states/app-toast';
import { recordQuoteManualSendAction } from '@/lib/commercial/actions';
import {
  QUOTE_MANUAL_SEND_COPY,
} from '@/lib/commercial/quote-manual-send';
import { quoteSendStatusLabel, type QuoteSendRecord } from '@/lib/commercial/quote-send-status';
import { formatTimestamp } from '@/lib/commercial/labels';

type QuoteEnvioSectionProps = {
  partyId: string;
  quoteId: string;
  quoteNumber: string;
  canRecordSend: boolean;
  sendRecord: QuoteSendRecord | null;
  actorLabel: string | null;
  /** When true, open the modal on mount (e.g. from header CTA). */
  openModalRequestKey?: number;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function QuoteEnvioSection({
  partyId,
  quoteId,
  quoteNumber,
  canRecordSend,
  sendRecord,
  actorLabel,
  openModalRequestKey = 0,
}: QuoteEnvioSectionProps) {
  const router = useRouter();
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(Boolean(sendRecord));

  const [state, formAction] = useActionState(
    async (
      _prev: { error?: string; success?: boolean } | null,
      formData: FormData,
    ) => {
      const result = await recordQuoteManualSendAction(formData);
      if (result.ok) {
        setFormKey((key) => key + 1);
        setToast(QUOTE_MANUAL_SEND_COPY.successToast);
        setShowFollowUp(true);
        dialogRef.current?.close();
        router.refresh();
        return { success: true };
      }
      return { error: result.error };
    },
    null,
  );

  useEffect(() => {
    if (openModalRequestKey > 0 && canRecordSend && !sendRecord) {
      dialogRef.current?.showModal();
    }
  }, [openModalRequestKey, canRecordSend, sendRecord]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const statusLabel = quoteSendStatusLabel(sendRecord);

  return (
    <section id="envio" className="scroll-mt-32" data-quote-envio="section">
      <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
        {QUOTE_MANUAL_SEND_COPY.section}
      </h2>

      <div className="mt-6 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-6 md:p-8">
        <p className="isalwa-section-label">Estado</p>
        <p className="mt-2 font-medium text-[var(--isalwa-kiln)]">{statusLabel}</p>
        {sendRecord ? (
          <dl className="mt-4 grid gap-3 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Fecha</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatTimestamp(sendRecord.occurredAt)}
              </dd>
            </div>
            {actorLabel ? (
              <div>
                <dt className="isalwa-section-label">Registrado por</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{actorLabel}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {QUOTE_MANUAL_SEND_COPY.disclaimer}
        </p>

        {canRecordSend && !sendRecord ? (
          <div className="mt-6">
            <Button type="button" variant="primary" onClick={() => dialogRef.current?.showModal()}>
              {QUOTE_MANUAL_SEND_COPY.action}
            </Button>
          </div>
        ) : null}

        {showFollowUp || sendRecord ? (
          <div
            id="seguimiento"
            className="mt-8 scroll-mt-32 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4 md:p-6"
          >
            <p className="isalwa-section-label">Próximo paso</p>
            <p className="mt-2 font-medium text-[var(--isalwa-kiln)]">
              {QUOTE_MANUAL_SEND_COPY.followUpPrompt}
            </p>
            <div className="mt-4">
              <RegisterFollowUpForm
                partyId={partyId}
                quoteId={quoteId}
                quoteNumber={quoteNumber}
                promptMode="after-send"
              />
            </div>
          </div>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-2rem,28rem)] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-0 shadow-[var(--isalwa-shadow-soft)] backdrop:bg-[color-mix(in_srgb,var(--isalwa-kiln)_35%,transparent)]"
        onClose={() => undefined}
      >
        <form method="dialog" className="flex items-center justify-between border-b border-[var(--isalwa-mist)] px-5 py-4">
          <h3 className="font-medium text-[var(--isalwa-kiln)]">{QUOTE_MANUAL_SEND_COPY.action}</h3>
          <button
            type="submit"
            className="isalwa-t-fast rounded-[var(--isalwa-radius-control)] px-2 py-1 text-sm text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)]"
          >
            Cerrar
          </button>
        </form>
        <div className="space-y-4 px-5 py-5">
          <FormFeedback error={state?.error} />
          <form key={formKey} action={formAction} className="space-y-4">
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <fieldset>
              <legend className="isalwa-section-label">{QUOTE_MANUAL_SEND_COPY.channel}</legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--isalwa-kiln)]">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="channel" value="whatsapp" defaultChecked required />
                  {QUOTE_MANUAL_SEND_COPY.channelWhatsapp}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="channel" value="email" required />
                  {QUOTE_MANUAL_SEND_COPY.channelEmail}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="channel" value="otro" required />
                  {QUOTE_MANUAL_SEND_COPY.channelOther}
                </label>
              </div>
            </fieldset>
            <div>
              <label htmlFor={`${formId}-note`} className="isalwa-section-label">
                {QUOTE_MANUAL_SEND_COPY.note}
              </label>
              <textarea
                id={`${formId}-note`}
                name="note"
                rows={2}
                className={fieldClass}
                placeholder={QUOTE_MANUAL_SEND_COPY.noteOptional}
              />
            </div>
            <CommandSubmitButton
              label={QUOTE_MANUAL_SEND_COPY.action}
              pendingLabel={QUOTE_MANUAL_SEND_COPY.pendingLabel}
            />
          </form>
        </div>
      </dialog>

      {toast ? (
        <AppToastRegion>
          <AppToast tone="success" title={toast} onDismiss={() => setToast(null)} />
        </AppToastRegion>
      ) : null}
    </section>
  );
}
