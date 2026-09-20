'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
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
import { useQuoteLive } from '@/components/commercial/quote-live-frame';
import { formatCentavos } from '@/lib/commercial/money';
import { centavosToBobDisplay, parseBobInputToCentavos, parseQuantityInput } from '@/lib/commercial/parse-money-input';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { QuantityStepper } from '@/components/commercial/quantity-stepper';
import { QuoteProductPicker } from '@/components/commercial/quote-product-picker';
import { GuidanceCompactDisclosure } from '@/components/guidance/guidance-disclosure';
import { guidanceForSendQuote } from '@/lib/guidance/select';
import {
  QUOTED_PRICE_HINT,
  QUOTED_PRICE_LABEL,
  emptyProductSearchPort,
  lineProvenanceView,
  quoteLinesAreEditable,
  resolveAddQuoteLineDraft,
  type ProductSearchPort,
} from '@/lib/commercial/product-picker';

type QuoteEditorProps = {
  partyId: string;
  quote: QuoteDetailReadModel;
  productSearch?: ProductSearchPort;
  demoPrices?: boolean;
};

const feedbackInitial = { error: null as string | null, success: null as string | null };

const fieldClass =
  'mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const documentTitleClass =
  'font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]';

function newClientCommandId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function centavosField(value: unknown): string | null {
  return typeof value === 'string' && /^-?\d+$/.test(value) ? value : null;
}

function readLineNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed >= 1 ? parsed : null;
  }
  return null;
}

function displayLineTotal(quantity: number, unitPriceCentavos: string, discountCentavos: string): string {
  try {
    const total = BigInt(quantity) * BigInt(unitPriceCentavos) - BigInt(discountCentavos);
    return total < BigInt(0) ? '0' : total.toString();
  } catch {
    return '0';
  }
}

function overlayLineFromAdd(
  quoteId: string,
  nextLineNumber: number,
  formData: FormData,
  data: Record<string, unknown> | undefined,
): QuoteLineReadModel | null {
  const draft = resolveAddQuoteLineDraft({
    lineKind: String(formData.get('lineKind') ?? ''),
    productId: String(formData.get('productId') ?? ''),
    itemName: String(formData.get('itemName') ?? ''),
    itemDetail: String(formData.get('itemDetail') ?? ''),
    provenanceNote: String(formData.get('provenanceNote') ?? ''),
  });
  if (!draft.ok) return null;
  const quantity = parseQuantityInput(String(formData.get('quantity') ?? ''));
  const unitPriceCentavos = parseBobInputToCentavos(String(formData.get('unitPrice') ?? ''));
  if (!quantity || !unitPriceCentavos) return null;
  const discountInput = String(formData.get('discount') ?? '').trim();
  const discountCentavos = discountInput ? (parseBobInputToCentavos(discountInput) ?? '0') : '0';
  const unitLabel = String(formData.get('unitLabel') ?? '').trim();
  const rawId = data?.quoteLineId;
  const quoteLineId =
    typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : `local:${draft.draft.descriptionSnapshot}:${quantity}:${unitPriceCentavos}`;
  const reportedTotal = centavosField(data?.lineTotalCentavos);
  return {
    quoteLineId,
    quoteId,
    lineNumber: readLineNumber(data?.lineNumber) ?? nextLineNumber,
    description: draft.draft.descriptionSnapshot,
    quantity,
    unitLabel: unitLabel || null,
    unitPriceCentavos,
    discountCentavos,
    lineTotalCentavos: reportedTotal ?? displayLineTotal(quantity, unitPriceCentavos, discountCentavos),
    productRef: draft.draft.productRef,
  };
}

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
  const [quantity, setQuantity] = useState(String(line.quantity));
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
  const title = line.description.split('\n')[0]?.trim() || line.description;

  return (
    <ListRow
      as="li"
      className="bg-[color-mix(in_srgb,var(--isalwa-teal-100)_28%,white)] px-1 py-5 md:bg-transparent"
    >
      <FormFeedback error={state.error ?? removeState.error} success={state.success ?? removeState.success} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--isalwa-kiln)]">{title}</p>
        {provenance.caption ? (
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{provenance.caption}</p>
        ) : null}
        {provenance.note ? (
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{provenance.note}</p>
        ) : null}
      </div>
      <form action={action} className="mt-4 w-full space-y-4">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <div className="grid gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4">
            <label className="isalwa-section-label" htmlFor={`desc-${line.quoteLineId}`}>
              Producto / descripción
            </label>
            <textarea
              id={`desc-${line.quoteLineId}`}
              name="description"
              required
              rows={2}
              defaultValue={line.description}
              className={fieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="isalwa-section-label" htmlFor={`qty-${line.quoteLineId}`}>
              Cantidad
            </label>
            <div className="mt-2">
              <QuantityStepper
                id={`qty-${line.quoteLineId}`}
                name="quantity"
                value={quantity}
                onChange={setQuantity}
              />
            </div>
          </div>
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
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
          </div>
          <div className="md:col-span-2">
            <p className="isalwa-section-label">Subtotal</p>
            <p className="mt-2 text-sm font-semibold text-[var(--isalwa-kiln)]">
              {formatCentavos(line.lineTotalCentavos, currency)}
            </p>
          </div>
          <div className="hidden">
            <label htmlFor={`disc-${line.quoteLineId}`}>Descuento</label>
            <input
              id={`disc-${line.quoteLineId}`}
              name="discount"
              defaultValue={line.discountCentavos !== '0' ? centavosToBobDisplay(line.discountCentavos) : ''}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CommandSubmitButton label="Editar" pendingLabel="…" variant="secondary" className="h-8 px-3 text-sm" />
        </div>
        <p className="text-xs text-[var(--isalwa-slate)]">{QUOTED_PRICE_HINT}</p>
      </form>
      <form action={removeAction} className="mt-3">
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="quoteLineId" value={line.quoteLineId} />
        <CommandSubmitButton label="Quitar" pendingLabel="…" variant="danger" className="h-8 px-3 text-sm" />
      </form>
    </ListRow>
  );
}

export function QuoteEditor({
  partyId,
  quote: quoteFromServer,
  productSearch = emptyProductSearchPort,
  demoPrices = false,
}: QuoteEditorProps) {
  const router = useRouter();
  const live = useQuoteLive();
  const quote = live?.quote ?? quoteFromServer;
  const isDraft = quoteLinesAreEditable(quote.status);
  const [sent, setSent] = useState(false);
  const [addReady, setAddReady] = useState(false);
  const [addEpoch, setAddEpoch] = useState(0);
  const [addCommandId, setAddCommandId] = useState(newClientCommandId);
  const [presentCommandId, setPresentCommandId] = useState(newClientCommandId);

  const [addState, addAction] = useActionState(async (_prev: typeof feedbackInitial, formData: FormData) => {
    const result = await addQuoteLineAction(formData);
    if (result.ok) {
      const nextLineNumber = quote.lines.reduce((max, row) => Math.max(max, row.lineNumber), 0) + 1;
      const line = overlayLineFromAdd(
        String(formData.get('quoteId') ?? quote.quoteId),
        nextLineNumber,
        formData,
        result.data,
      );
      if (line) {
        const totalCentavos = centavosField(result.data?.totalCentavos) ?? undefined;
        live?.recordAddedLine(line, totalCentavos ? { totalCentavos } : undefined);
      }
      setAddEpoch((epoch) => epoch + 1);
      setAddReady(false);
      setAddCommandId(newClientCommandId());
    }
    return result.ok
      ? { error: null, success: 'Línea guardada.' }
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
      live?.recordSubmitted();
      setSent(true);
      setPresentCommandId(newClientCommandId());
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

  useEffect(() => {
    if (!addState.success) return;
    router.refresh();
  }, [addState, router]);

  useEffect(() => {
    if (!submitState.success) return;
    router.refresh();
  }, [submitState, router]);

  if (!isDraft || sent) {
    if (submitState.success || cancelState.success) {
      return (
        <div className="mt-12 space-y-3">
          <FormFeedback error={null} success={submitState.success ?? cancelState.success} />
          {submitState.success ? (
            <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Descargue la cotización y envíela por su canal habitual.
            </p>
          ) : null}
        </div>
      );
    }
    return null;
  }

  const ruleGuidance = guidanceForSendQuote({ lineCount: quote.lines.length }).filter(
    (note) => note.kind === 'regla',
  );

  return (
    <div className="mt-12 space-y-10">
      <PageSection id="cotizacion-workspace" card className="scroll-mt-32 bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={documentTitleClass}>Líneas de cotización</h2>
          <div className="text-right">
            <p className="isalwa-section-label">Total</p>
            <p className="font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
              {formatCentavos(quote.totalCentavos, quote.currency)}
            </p>
            {quote.headerDiscountCentavos !== '0' ? (
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                Incluye descuento general de{' '}
                {formatCentavos(quote.headerDiscountCentavos, quote.currency)}
              </p>
            ) : null}
          </div>
        </div>

        {quote.lines.length > 0 ? (
          <>
            <div className="mt-6 hidden grid-cols-12 gap-3 border-b border-[var(--isalwa-mist)] pb-2 text-[11px] font-medium tracking-[0.08em] text-[var(--isalwa-slate)] uppercase md:grid">
              <span className="col-span-4">Producto</span>
              <span className="col-span-2">Cantidad</span>
              <span className="col-span-2">Unidad</span>
              <span className="col-span-2">Precio unitario</span>
              <span className="col-span-2">Subtotal</span>
            </div>
            <ul className="mt-2 divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas guardadas">
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
          </>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Todavía no hay líneas guardadas.
          </p>
        )}

        <div id="agregar-producto" className="mt-10 scroll-mt-32 border-t border-[var(--isalwa-mist)] pt-8">
          <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
            Agregar producto
          </h3>
          <FormFeedback error={addState.error} success={addState.success} />
          <form key={addEpoch} id="quote-add-line-form" action={addAction} className="mt-6 space-y-6">
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="quoteId" value={quote.quoteId} />
            <input type="hidden" name="idempotencyKey" value={addCommandId} />
            <QuoteProductPicker
              organizationId={quote.organizationId}
              searchPort={productSearch}
              demoPrices={demoPrices}
              onReadyChange={setAddReady}
              currency={quote.currency}
            />
            <CommandSubmitButton
              label="Guardar línea"
              pendingLabel="Guardando…"
              disabled={!addReady}
            />
          </form>
        </div>
      </PageSection>

      <PageSection card className="bg-white p-6 md:p-8">
        <h2 className={documentTitleClass}>Notas y descuento</h2>
        <FormFeedback error={headerState.error} success={headerState.success} />
        <form id="quote-header-form" action={headerAction} className="mt-8 space-y-6">
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
          <CommandSubmitButton label="Guardar borrador" pendingLabel="Guardando…" variant="secondary" />
        </form>
      </PageSection>

      <PageSection id="presentar-cotizacion" card className="scroll-mt-32 bg-white p-6 md:p-8">
        <h2 className={documentTitleClass}>Presentar cotización</h2>
        {quote.lines.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Agregue productos a la cotización.
          </p>
        ) : (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Revise la cotización y preséntela. Presentar no envía el documento.
          </p>
        )}
        <FormFeedback error={submitState.error} success={submitState.success} />
        <form id="quote-submit-form" action={submitAction} className="mt-8 space-y-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quote.quoteId} />
          <input type="hidden" name="idempotencyKey" value={presentCommandId} />
          <CommandSubmitButton
            label="Presentar cotización"
            pendingLabel="Presentando…"
            disabled={quote.lines.length === 0}
          />
        </form>

        <div className="mt-10 border-t border-[var(--isalwa-mist)] pt-8">
          <GuidanceCompactDisclosure title="Reglas del flujo" notes={ruleGuidance} />
          <form
            id="cancelar-cotizacion"
            action={cancelAction}
            className="mt-8 scroll-mt-32 space-y-4"
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
        </div>
      </PageSection>
    </div>
  );
}
