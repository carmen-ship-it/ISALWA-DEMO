'use client';

import { useActionState } from 'react';
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
  const [state, action] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await updateQuoteLineAction(formData);
    return result.ok
      ? { error: null, success: 'Línea actualizada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [removeState, removeAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await removeQuoteLineAction(formData);
    return result.ok
      ? { error: null, success: 'Línea eliminada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  return (
    <ListRow as="li" className="px-1 py-3">
      <FormFeedback error={state.error ?? removeState.error} success={state.success ?? removeState.success} />
      <form action={action} className="space-y-3">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="isalwa-section-label" htmlFor={`desc-${line.quoteLineId}`}>
              Descripción
            </label>
            <input
              id={`desc-${line.quoteLineId}`}
              name="description"
              required
              defaultValue={line.description}
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
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
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
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
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
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
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
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
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            />
          </div>
        </div>
        <p className="text-sm text-[var(--isalwa-slate)]">
          Total línea: {formatCentavos(line.lineTotalCentavos, currency)}
        </p>
        <div className="flex flex-wrap gap-2">
          <CommandSubmitButton label="Guardar línea" variant="secondary" />
        </div>
      </form>
      <form action={removeAction} className="mt-2">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <CommandSubmitButton label="Eliminar línea" variant="danger" />
      </form>
    </ListRow>
  );
}

export function QuoteEditor({ partyId, quote }: QuoteEditorProps) {
  const isDraft = quote.status === 'draft';

  const [addState, addAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await addQuoteLineAction(formData);
    return result.ok
      ? { error: null, success: 'Línea agregada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [headerState, headerAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await updateQuoteAction(formData);
    return result.ok
      ? { error: null, success: 'Cotización guardada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [submitState, submitAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await submitQuoteAction(formData);
    return result.ok
      ? { error: null, success: 'Cotización enviada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  const [cancelState, cancelAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await cancelQuoteAction(formData);
    return result.ok
      ? { error: null, success: 'Cotización cancelada.' }
      : { error: result.error, success: null };
  }, feedbackInitial);

  if (!isDraft) {
    return (
      <div className="mt-6 space-y-6">
        {quote.lines.length > 0 ? (
          <PageSection card className="p-6">
            <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Líneas</h2>
            <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas de cotización">
              {quote.lines.map((line) => (
                <ListRow as="li" key={line.quoteLineId} className="px-1 py-3">
                  <p className="font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                  <dl className="mt-2 grid gap-2 text-sm text-[var(--isalwa-slate)] sm:grid-cols-3">
                    <div>
                      <dt className="isalwa-section-label">Cantidad</dt>
                      <dd>
                        {line.quantity}
                        {line.unitLabel ? ` ${line.unitLabel}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Precio unitario</dt>
                      <dd>{formatCentavos(line.unitPriceCentavos, quote.currency)}</dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Total línea</dt>
                      <dd>{formatCentavos(line.lineTotalCentavos, quote.currency)}</dd>
                    </div>
                  </dl>
                </ListRow>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 border-t border-[var(--isalwa-mist)] pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="isalwa-section-label">Subtotal</dt>
                <dd className="text-[var(--isalwa-kiln)]">
                  {formatCentavos(quote.subtotalCentavos, quote.currency)}
                </dd>
              </div>
              {quote.headerDiscountCentavos !== '0' ? (
                <div>
                  <dt className="isalwa-section-label">Descuento</dt>
                  <dd className="text-[var(--isalwa-kiln)]">
                    {formatCentavos(quote.headerDiscountCentavos, quote.currency)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="isalwa-section-label">Total</dt>
                <dd className="font-medium text-[var(--isalwa-kiln)]">
                  {formatCentavos(quote.totalCentavos, quote.currency)}
                </dd>
              </div>
            </dl>
          </PageSection>
        ) : null}
        {quote.status === 'submitted' ? (
          <PageSection card className="p-6">
            <p className="text-sm text-[var(--isalwa-slate)]">
              Conversión a pedido pendiente de política comercial.
            </p>
          </PageSection>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Agregar línea</h2>
        <FormFeedback error={addState.error} success={addState.success} />
        <form action={addAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <div className="sm:col-span-2">
            <label htmlFor="new-desc" className="isalwa-section-label">
              Descripción
            </label>
            <input id="new-desc" name="description" required className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
          </div>
          <div>
            <label htmlFor="new-qty" className="isalwa-section-label">
              Cantidad
            </label>
            <input id="new-qty" name="quantity" required defaultValue="1" className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
          </div>
          <div>
            <label htmlFor="new-unit" className="isalwa-section-label">
              Unidad
            </label>
            <input id="new-unit" name="unitLabel" className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
          </div>
          <div>
            <label htmlFor="new-price" className="isalwa-section-label">
              Precio unitario (Bs.)
            </label>
            <input id="new-price" name="unitPrice" required className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
          </div>
          <div>
            <label htmlFor="new-disc" className="isalwa-section-label">
              Descuento (Bs.)
            </label>
            <input id="new-disc" name="discount" className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <CommandSubmitButton label="Agregar línea" />
          </div>
        </form>
      </PageSection>

      {quote.lines.length > 0 ? (
        <PageSection card className="p-6">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Líneas</h2>
          <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]" aria-label="Editar líneas de cotización">
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

      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Encabezado</h2>
        <FormFeedback error={headerState.error} success={headerState.success} />
        <form action={headerAction} className="mt-4 space-y-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <div>
            <label htmlFor="quote-notes-edit" className="isalwa-section-label">
              Notas
            </label>
            <textarea
              id="quote-notes-edit"
              name="notes"
              rows={3}
              defaultValue={quote.notes ?? ''}
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
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
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            />
          </div>
          <p className="text-sm text-[var(--isalwa-slate)]">
            Total: {formatCentavos(quote.totalCentavos, quote.currency)}
          </p>
          <CommandSubmitButton label="Guardar cambios" variant="secondary" />
        </form>
      </PageSection>

      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Enviar o cancelar</h2>
        <FormFeedback error={submitState.error ?? cancelState.error} success={submitState.success ?? cancelState.success} />
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={submitAction}>
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="quoteId" value={quote.quoteId} />
            <CommandSubmitButton label="Enviar cotización" />
          </form>
          <form action={cancelAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="quoteId" value={quote.quoteId} />
            <div>
              <label htmlFor="cancel-reason" className="isalwa-section-label">
                Motivo de cancelación
              </label>
              <input id="cancel-reason" name="reason" className="mt-1 w-full min-w-[16rem] rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2" />
            </div>
            <CommandSubmitButton label="Cancelar cotización" variant="danger" />
          </form>
        </div>
      </PageSection>
    </div>
  );
}
