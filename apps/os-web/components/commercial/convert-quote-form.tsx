'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { AppToast, AppToastRegion } from '@/components/states/app-toast';
import { createOrderAction } from '@/lib/commercial/actions';
import { hrefWithClientDataMode } from '@/lib/demo/preserve-data-mode';
import { guidanceForConvertQuote } from '@/lib/guidance/select';

type ConvertQuoteFormProps = {
  partyId: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  totalLabel: string;
  /** Stored quote status only. Used for guidance copy — not to invent authority. */
  quoteStatus?: string;
};

export function ConvertQuoteForm({
  partyId,
  quoteId,
  quoteNumber,
  customerName,
  totalLabel,
  quoteStatus = 'accepted',
}: ConvertQuoteFormProps) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [toastHref, setToastHref] = useState<string | null>(null);

  const [state, action] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createOrderAction(formData);
      if (result.ok) {
        dialogRef.current?.close();
        setToastHref(hrefWithClientDataMode(result.redirectTo));
        window.setTimeout(() => {
          router.push(hrefWithClientDataMode(result.redirectTo));
          router.refresh();
        }, 900);
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  useEffect(() => {
    if (!toastHref) return;
    const timer = window.setTimeout(() => setToastHref(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toastHref]);

  return (
    <div className="space-y-6">
      <GuidanceNotes notes={guidanceForConvertQuote({ quoteStatus })} />
      <FormFeedback error={state?.error} />
      <Button type="button" variant="primary" onClick={() => dialogRef.current?.showModal()}>
        {quoteStatus === 'accepted' ? 'Cliente aceptó · Convertir a Pedido' : 'Convertir a Pedido'}
      </Button>

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-2rem,28rem)] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-0 shadow-[var(--isalwa-shadow-soft)] backdrop:bg-[color-mix(in_srgb,var(--isalwa-kiln)_35%,transparent)]"
        aria-labelledby={titleId}
      >
        <div className="border-b border-[var(--isalwa-mist)] px-5 py-4">
          <h3 id={titleId} className="font-medium text-[var(--isalwa-kiln)]">
            Confirmar pedido
          </h3>
        </div>
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Se creará un Pedido con las líneas y precios de esta cotización.
          </p>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="isalwa-section-label">Cotización</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{quoteNumber}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Cliente</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{customerName}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{totalLabel}</dd>
            </div>
          </dl>
          <FormFeedback error={state?.error} />
          <form action={action} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <CommandSubmitButton
              label={
                quoteStatus === 'accepted'
                  ? 'Cliente aceptó · Convertir a Pedido'
                  : 'Convertir a Pedido'
              }
              pendingLabel="Registrando pedido…"
            />
            <Button type="button" variant="tertiary" onClick={() => dialogRef.current?.close()}>
              Cancelar
            </Button>
          </form>
        </div>
      </dialog>

      {toastHref ? (
        <AppToastRegion>
          <div className="space-y-2">
            <AppToast
              tone="success"
              title="Pedido creado."
              detail="Puede abrir el pedido desde el enlace."
              onDismiss={() => setToastHref(null)}
            />
            <Link
              href={toastHref}
              className="isalwa-t-fast inline-flex text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
            >
              Ver pedido
            </Link>
          </div>
        </AppToastRegion>
      ) : null}
    </div>
  );
}
