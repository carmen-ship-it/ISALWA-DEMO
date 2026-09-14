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
import { FormFeedback } from '@/components/commercial/form-feedback';

type QuoteEditorProps = {
  partyId: string;
  quote: QuoteDetailReadModel;
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

  return (
    <ListRow as="li" className="px-1 py-6">
      <FormFeedback error={state.error ?? removeState.error} success={state.success ?? removeState.success} />
      <form action={action} className="mt-3 space-y-4">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="isalwa-section-label" htmlFor={`desc-${line.quoteLineId}`}>
              Descripción
            </label>
            <input
              id={`desc-${line.quoteLineId}`}
              name="description"
              required
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
              Precio unitario (Bs.)
            </label>
            <input
              id={`price-${line.quoteLineId}`}
              name="unitPrice"
              required
              defaultValue={centavosToBobDisplay(line.unitPriceCentavos)}
              className={fieldClass}
            />
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

export function QuoteEditor({ partyId, quote }: QuoteEditorProps) {
  const router = useRouter();
  const isDraft = quote.status === 'draft';
  const [sent, setSent] = useState(false);

  const [addState, addAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await addQuoteLineAction(formData);
    if (result.ok) router.refresh();
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
      return { error: null, success: 'Cotización enviada.' };
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
        <form action={addAction} className="mt-8 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <div className="sm:col-span-2">
            <label htmlFor="new-desc" className="isalwa-section-label">
              Descripción
            </label>
            <input id="new-desc" name="description" required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="new-qty" className="isalwa-section-label">
              Cantidad
            </label>
            <input id="new-qty" name="quantity" required defaultValue="1" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="new-unit" className="isalwa-section-label">
              Unidad
            </label>
            <input id="new-unit" name="unitLabel" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="new-price" className="isalwa-section-label">
              Precio unitario (Bs.)
            </label>
            <input id="new-price" name="unitPrice" required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="new-disc" className="isalwa-section-label">
              Descuento (Bs.)
            </label>
            <input id="new-disc" name="discount" className={fieldClass} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <CommandSubmitButton label="Agregar línea" pendingLabel="Agregando…" />
          </div>
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

      <PageSection card className="bg-white p-8 md:p-10">
        <h2 className={documentTitleClass}>Enviar cotización</h2>
        <FormFeedback error={submitState.error} success={submitState.success} />
        <form action={submitAction} className="mt-8">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <CommandSubmitButton label="Enviar cotización" pendingLabel="Enviando…" />
        </form>
        <form action={cancelAction} className="mt-10 space-y-4 border-t border-[var(--isalwa-mist)] pt-8">
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
    </div>
  );
}
