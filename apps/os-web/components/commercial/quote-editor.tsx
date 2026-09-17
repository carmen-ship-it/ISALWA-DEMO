'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { PageSection, ListRow } from '@isalwa/ui';
import type { QuoteDetailReadModel, QuoteLineReadModel } from '@isalwa/os-contracts';
import {
  addQuoteLineAction,
  cancelQuoteAction,
  removeQuoteLineAction,
  submitQuoteAction,
  updateQuoteAction,
  updateQuoteLineAction,
} from '@/lib/commercial/actions';
import { formatCentavos } from '@/lib/commercial/money';
import { centavosToBobDisplay } from '@/lib/commercial/parse-money-input';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { CommercialStickyBar } from '@/components/commercial/commercial-sticky-bar';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { QuoteProductPicker } from '@/components/commercial/quote-product-picker';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForSendQuote } from '@/lib/guidance/select';
import {
  QUOTED_PRICE_HINT,
  QUOTED_PRICE_LABEL,
  emptyProductSearchPort,
  lineProvenanceView,
  quoteLinesAreEditable,
  type ProductSearchPort,
} from '@/lib/commercial/product-picker';

type QuoteEditorProps = {
  partyId: string;
  quote: QuoteDetailReadModel;
  productSearch?: ProductSearchPort;
};

const feedbackInitial = { error: null as string | null, success: null as string | null };

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const documentTitleClass =
  'font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]';

function LineEditForm({
  partyId,
  quoteId,
  line,
  currency,
}: {
  partyId: string;
  quoteId: string;
  line: QuoteLineReadModel;
  currency: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await updateQuoteLineAction(formData);
    if (result.ok) router.refresh();
    return result.ok
      ? { error: null, success: 'Línea actualizada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [removeState, removeAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await removeQuoteLineAction(formData);
    if (result.ok) router.refresh();
    return result.ok
      ? { error: null, success: 'Línea eliminada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const provenance = lineProvenanceView(line.productRef);

  return (
    <ListRow as="li" className="px-1 py-6">
      <FormFeedback error={state.error ?? removeState.error} success={state.success ?? removeState.success} />
      {provenance.caption ? (
        <p className="mt-3 text-sm text-[var(--isalwa-slate)]">{provenance.caption}</p>
      ) : null}
      {provenance.note ? (
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{provenance.note}</p>
      ) : null}
      <form action={action} className="mt-3 space-y-4">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="isalwa-section-label" htmlFor={`desc-${line.quoteLineId}`}>
              Descripción
            </label>
            <textarea
              id={`desc-${line.quoteLineId}`}
              name="description"
              required
              rows={3}
              defaultValue={line.description}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="isalwa-section-label" htmlFor={`qty-${line.quoteLineId}`}>
              Cantidad
            </label>
            <input
              id={`qty-${line.quoteLineId}`}
              name="quantity"
              required
              defaultValue={String(line.quantity)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="isalwa-section-label" htmlFor={`unit-${line.quoteLineId}`}>
              Unidad
            </label>
            <input
              id={`unit-${line.quoteLineId}`}
              name="unitLabel"
              defaultValue={line.unitLabel ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="isalwa-section-label" htmlFor={`price-${line.quoteLineId}`}>
              {QUOTED_PRICE_LABEL}
            </label>
            <input
              id={`price-${line.quoteLineId}`}
              name="unitPrice"
              required
              defaultValue={centavosToBobDisplay(line.unitPriceCentavos)}
              className={fieldClass}
            />
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{QUOTED_PRICE_HINT}</p>
          </div>
          <div>
            <label className="isalwa-section-label" htmlFor={`disc-${line.quoteLineId}`}>
              Descuento (Bs.)
            </label>
            <input
              id={`disc-${line.quoteLineId}`}
              name="discount"
              defaultValue={line.discountCentavos !== '0' ? centavosToBobDisplay(line.discountCentavos) : ''}
              className={fieldClass}
            />
          </div>
        </div>
        <p className="text-sm text-[var(--isalwa-slate)]">
          Total línea: {formatCentavos(line.lineTotalCentavos, currency)}
        </p>
        <div className="flex flex-wrap gap-3">
          <CommandSubmitButton label="Guardar línea" pendingLabel="Guardando…" variant="primary" />
          </div>
      </form>
      <form action={removeAction} className="mt-4">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <CommandSubmitButton label="Eliminar línea" pendingLabel="Eliminando…" variant="danger" />
      </form>
    </ListRow>
  );
}

export function QuoteEditor({
  partyId,
  quote,
  productSearch = emptyProductSearchPort,
}: QuoteEditorProps) {
  const router = useRouter();
  const isDraft = quoteLinesAreEditable(quote.status);
  const [sent, setSent] = useState(false);
  const [addReady, setAddReady] = useState(false);
  const [addEpoch, setAddEpoch] = useState(0);

  const [addState, addAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await addQuoteLineAction(formData);
    if (result.ok) {
      setAddEpoch((epoch) => epoch + 1);
      setAddReady(false);
      router.refresh();
    }
    return result.ok
      ? { error: null, success: 'Línea agregada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [headerState, headerAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await updateQuoteAction(formData);
    if (result.ok) router.refresh();
    return result.ok
      ? { error: null, success: 'Cotización guardada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [submitState, submitAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await submitQuoteAction(formData);
    if (result.ok) {
      setSent(true);
      router.refresh();
      return { error: null, success: 'Cotización presentada.' };
    }
    return { error: result.error, success: null };
  }, feedbackInitial);

  const [cancelState, cancelAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await cancelQuoteAction(formData);
    if (result.ok) {
      setSent(true);
      router.refresh();
      return { error: null, success: 'Cotización cancelada.' };
    }
    return { error: result.error, success: null };
  }, feedbackInitial);

  if (!isDraft || sent) {
    if (submitState.success || cancelState.success) {
      return (
        <div className="mt-12">
          <FormFeedback error={null} success={submitState.success ?? cancelState.success} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-12 space-y-10">
      <PageSection card className="bg-white p-8 md:p-10">
        <h2 className={documentTitleClass}>Agregar línea</h2>
        <FormFeedback error={addState.error} success={addState.success} />
        <form key={addEpoch} action={addAction} className="mt-8 space-y-6">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <QuoteProductPicker
            organizationId={quote.organizationId}
            searchPort={productSearch}
            onReadyChange={setAddReady}
          />
          <CommandSubmitButton
            label="Agregar a la cotización"
            pendingLabel="Agregando…"
            disabled={!addReady}
          />
        </form>
      </PageSection>

      {quote.lines.length > 0 ? (
        <PageSection card className="bg-white p-8 md:p-10">
          <h2 className={documentTitleClass}>Ajustar líneas</h2>
          <ul className="mt-6 divide-y divide-[var(--isalwa-mist)]" aria-label="Editar líneas de cotización">
            {quote.lines.map((line) => (
              <LineEditForm
                key={line.quoteLineId}
                partyId={partyId}
                quoteId={quote.quoteId}
                line={line}
                currency={quote.currency}
              />
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection card className="bg-white p-8 md:p-10">
        <h2 className={documentTitleClass}>Notas y descuento</h2>
        <FormFeedback error={headerState.error} success={headerState.success} />
        <form action={headerAction} className="mt-8 space-y-6">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <div>
            <label htmlFor="quote-notes-edit" className="isalwa-section-label">
              Notas
            </label>
            <textarea
              id="quote-notes-edit"
              name="notes"
              rows={4}
              defaultValue={quote.notes ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="header-disc" className="isalwa-section-label">
              Descuento general (Bs.)
            </label>
            <input
              id="header-disc"
              name="headerDiscount"
              defaultValue={
                quote.headerDiscountCentavos !== '0'
                  ? centavosToBobDisplay(quote.headerDiscountCentavos)
                  : ''
              }
              className={fieldClass}
            />
          </div>
          <p className="text-sm text-[var(--isalwa-slate)]">
            Total: {formatCentavos(quote.totalCentavos, quote.currency)}
          </p>
          <CommandSubmitButton label="Guardar cambios" pendingLabel="Guardando…" />
        </form>
      </PageSection>

      <PageSection id="enviar-cotizacion" card className="scroll-mt-32 bg-white p-8 md:p-10">
        <h2 className={documentTitleClass}>Enviar cotización</h2>
        <FormFeedback error={submitState.error} success={submitState.success} />
        <form action={submitAction} className="mt-8 space-y-4">
          <GuidanceNotes notes={guidanceForSendQuote({ lineCount: quote.lines.length })} />
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <CommandSubmitButton label="Enviar cotización" pendingLabel="Enviando…" />
        </form>
        <form
          id="cancelar-cotizacion"
          action={cancelAction}
          className="mt-10 scroll-mt-32 space-y-4 border-t border-[var(--isalwa-mist)] pt-8"
        >
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <FormFeedback error={cancelState.error} success={cancelState.success} />
          <div>
            <label htmlFor="cancel-reason" className="isalwa-section-label">
              Motivo de cancelación
            </label>
            <input id="cancel-reason" name="reason" className={fieldClass} />
          </div>
          <CommandSubmitButton label="Cancelar cotización" pendingLabel="Cancelando…" variant="danger" />
        </form>
      </PageSection>

      <CommercialStickyBar className="mt-2">
        <p className="text-sm text-[var(--isalwa-slate)]">
          Total: {formatCentavos(quote.totalCentavos, quote.currency)}
        </p>
        <a
          href="#enviar-cotizacion"
          className="isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
        >
          Ir a enviar
        </a>
      </CommercialStickyBar>
    </div>
  );
}
