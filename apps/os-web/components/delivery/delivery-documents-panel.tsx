'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, EmptyState, PageSection, SectionHeader, StatusPill, Timeline } from '@isalwa/ui';
import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import {
  correctDeliveryDocumentAction,
  createNotaDeEntregaAction,
  recordEntregaAction,
  recordSalidaAction,
} from '@/lib/delivery/actions';
import { ENTREGA_GATE_COPY, entregaEnabled, entregaGate } from '@/lib/delivery/entrega-gate';
import { presentEntregaAuditLabel } from '@/lib/delivery/display-labels';
import {
  presentDeliveryNoteLabel,
  scrubPilotDeliveryNoteRefs,
} from '@/lib/commercial/human-facing';
import {
  QUOTED_CONTEXT_HEADING,
  QUOTED_PRODUCTS_NOTE,
  QUOTED_PRODUCTS_UNAVAILABLE,
  QUOTED_QUANTITY_LABEL,
} from '@/lib/commercial/quoted-product-context';
import { SPECIAL_ITEM_LABEL } from '@/lib/commercial/product-picker';
import { actionPrimaryClass } from '@/lib/ui/action-hierarchy';
import { quantityWithUnit, unitWord } from '@/lib/delivery/quantity-unit';
import { timelineEventLabel } from '@/lib/commercial/timeline-labels';
import { boundHistoryItems } from '@/lib/lists/ops-collection';

export type DeliveryDocumentLineView = {
  orderLineId: string;
  description: string;
  quantity: number;
  unitLabel: string | null;
  productRef: string | null;
};

export type DeliveryNoteView = {
  id: string;
  internalDocumentRef: string;
  status: 'issued' | 'reversed';
  recipient: string;
  deliveredBy: string;
  receivedBy: string | null;
  observations: string | null;
  bornAt: string;
  lines: DeliveryDocumentLineView[];
};

export type DeliveryTimelineItemView = {
  id: string;
  eventType: string;
  occurredAt: string;
  label: string;
  detail: string;
  href?: string | null;
};

export type DeliveryDocumentsPanelProps = {
  partyId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  actorMemberId: string | null;
  orderLines: DeliveryDocumentLineView[];
  notes: DeliveryNoteView[];
  timeline: DeliveryTimelineItemView[];
  canMutate: boolean;
  /** Defaults to canMutate when omitted. */
  canCreateNote?: boolean;
  canRecordSalida?: boolean;
  canRecordEntrega?: boolean;
  /** True only when a warehouse exit is already recorded for this pedido. */
  hasSalida?: boolean;
  /** delivery.record only. Order status does not hide an existing note PDF. */
  canDownloadNotePdf?: boolean;
  quotedProducts?: import('@/lib/commercial/quoted-product-context').QuotedProductLine[];
  quoteUnavailable?: boolean;
  /** How frozen quote lines were resolved — drives empty copy truthfully. */
  quoteLoadState?: 'lines' | 'empty' | 'unavailable' | 'not_loaded';
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function DeliveryDocumentsPanel({
  partyId,
  orderId,
  orderNumber,
  customerName,
  actorMemberId,
  orderLines,
  notes,
  timeline,
  canMutate,
  canCreateNote,
  canRecordSalida,
  canRecordEntrega,
  hasSalida = false,
  canDownloadNotePdf = false,
  quotedProducts = [],
  quoteUnavailable = false,
  quoteLoadState,
}: DeliveryDocumentsPanelProps) {
  const allowNote = canCreateNote ?? canMutate;
  const allowSalida = canRecordSalida ?? canMutate;
  const allowEntrega = canRecordEntrega ?? canMutate;
  const allowAnyWrite = allowNote || allowSalida || allowEntrega;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const attemptKeys = useRef({ nota: '', salida: '', entrega: '' });
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(orderLines.map((line) => [line.orderLineId, line.quantity])),
  );
  const [recipient, setRecipient] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [observations, setObservations] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(
    notes.find((n) => n.status === 'issued')?.id ?? '',
  );
  const [receivedBy, setReceivedBy] = useState('');
  const [confirmingNoteId, setConfirmingNoteId] = useState<string | null>(null);
  const gate = entregaGate({ hasSalida, receivedBy });
  const canSubmitEntrega =
    allowEntrega && entregaEnabled({ hasSalida, receivedBy }) && Boolean(actorMemberId);

  const issuedNotes = useMemo(() => notes.filter((note) => note.status === 'issued'), [notes]);
  const noteWindow = boundHistoryItems(
    [...notes].sort((left, right) => right.bornAt.localeCompare(left.bornAt)),
  );
  const timelineWindow = boundHistoryItems(
    [...timeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
  );
  const frozenState =
    quoteLoadState ??
    (quoteUnavailable ? 'unavailable' : quotedProducts.length > 0 ? 'lines' : 'empty');

  function attemptKey(kind: 'nota' | 'salida' | 'entrega'): string {
    if (!attemptKeys.current[kind]) attemptKeys.current[kind] = createId();
    return attemptKeys.current[kind];
  }

  function run(
    kind: 'nota' | 'salida' | 'entrega' | 'correct',
    action: () => Promise<{ ok: boolean; error?: string; documentId?: string }>,
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'No se pudo completar la acción.');
        return;
      }
      if (kind !== 'correct') attemptKeys.current[kind] = '';
      setNotice(
        'Quedó registrado. Esta página muestra ese documento. No cree otro por el mismo intento.',
      );
      router.refresh();
    });
  }

  const quantityPayload = orderLines
    .map((line) => ({
      orderLineId: line.orderLineId,
      quantity: quantities[line.orderLineId] ?? line.quantity,
    }))
    .filter((row) => row.quantity >= 1);

  return (
    <PageSection
      id="entregas-notas"
      card
      className="mt-6 scroll-mt-[calc(var(--isalwa-entrega-sticky-nav-offset,2.75rem)+0.5rem)] bg-white p-6 md:p-8" data-section-tone="navy"
      data-delivery-documents="pedido"
    >
      <SectionHeader
        kicker="Pedido seleccionado"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Nota · salida · entrega
          </h2>
        }
      />
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Tres hechos distintos. Use las acciones de abajo según lo que ya ocurrió.
      </p>

      <div
        className="mt-8 border-t border-[var(--isalwa-mist)] pt-6"
        data-frozen-quote-context=""
        data-quote-load-state={frozenState}
      >
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Productos de la cotización
        </h3>
        {frozenState === 'lines' ? (
          <>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {QUOTED_PRODUCTS_NOTE}
            </p>
            <ul
              className="mt-4 divide-y divide-[var(--isalwa-mist)]"
              aria-label="Líneas congeladas de cotización"
            >
              {quotedProducts.map((line) => (
                <li
                  key={line.quoteLineId}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)] line-clamp-2 break-words">
                      {line.description}
                    </p>
                    {line.specialItem ? (
                      <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{SPECIAL_ITEM_LABEL}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm text-[var(--isalwa-slate)]">
                    {QUOTED_QUANTITY_LABEL}: {line.quantity}
                    {line.unitLabel ? ` ${line.unitLabel}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : frozenState === 'empty' ? (
          <p
            className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]"
            data-quote-empty=""
          >
            Sin productos guardados en la cotización.
          </p>
        ) : frozenState === 'unavailable' ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {QUOTED_PRODUCTS_UNAVAILABLE}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Cotización origen no cargada en esta vista.
          </p>
        )}
      </div>

      <div
        className="mt-6 space-y-6 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white p-4 md:p-5"
        data-entrega-form-group=""
      >
      {orderLines.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.noLines}</p>
      ) : (
        <div data-order-quantity-rows="">
          <h3 className="font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-kiln)]">
            Cantidades a registrar
          </h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Líneas del pedido (copia al crear el pedido). No son stock ni cantidades entregadas.
          </p>
          <ul
            className="mt-3 divide-y divide-[var(--isalwa-mist)]"
            aria-label="Cantidades del pedido"
          >
            {orderLines.map((line) => {
              const inputId = `cantidad-${line.orderLineId}`;
              const quoted = quantityWithUnit(line.quantity, line.unitLabel);
              const unit = unitWord(line.unitLabel, line.quantity);
              return (
              <li
                key={line.orderLineId}
                className="grid gap-3 py-3 md:grid-cols-[minmax(0,1.6fr)_8rem_9rem_6rem] md:items-end"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">Producto</p>
                  <p className="mt-1 break-words text-sm font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">Cantidad del pedido</p>
                  <p className="mt-1 text-right text-sm tabular-nums text-[var(--isalwa-kiln)]">{quoted}</p>
                </div>
                <div>
                  <label htmlFor={inputId} className="text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">
                    Cantidad a registrar
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    min={1}
                    max={line.quantity}
                    value={quantities[line.orderLineId] ?? line.quantity}
                    onChange={(event) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [line.orderLineId]: Number(event.target.value),
                      }))
                    }
                    className="isalwa-field mt-1 w-full text-right tabular-nums"
                    disabled={!allowAnyWrite || pending}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">Unidad</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{unit ?? '—'}</p>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {allowNote && actorMemberId ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <label className="text-sm text-[var(--isalwa-slate)]">
            Destinatario
            <input
              id="entrega-destinatario"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="isalwa-field mt-2"
              disabled={pending}
            />
          </label>
          <label className="text-sm text-[var(--isalwa-slate)]">
            Entregado por
            <input
              id="entrega-entregado-por"
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              className="isalwa-field mt-2"
              disabled={pending}
            />
          </label>
          <label className="md:col-span-2 text-sm text-[var(--isalwa-slate)]">
            Observaciones (opcional)
            <textarea
              id="entrega-observaciones"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="isalwa-field mt-2 h-auto min-h-[4.5rem] py-2"
              rows={2}
              disabled={pending}
            />
          </label>
        </div>
      ) : null}
      </div>

      {notice ? (
        <p className="mt-4 text-sm text-[var(--isalwa-kiln)]" data-delivery-retry-notice="open">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 text-sm text-[var(--isalwa-ember)]" role="alert">
          {error}
        </p>
      ) : null}

      <div
        id="entregas-pendientes"
        className="mt-8 scroll-mt-[calc(var(--isalwa-entrega-sticky-nav-offset,2.75rem)+0.5rem)] space-y-3 border-t border-[var(--isalwa-mist)] pt-6"
        data-entrega-pendientes=""
      >
        <p className="isalwa-section-label">Próxima acción</p>
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          {gate === 'needs-salida' ? 'Registrar salida' : canSubmitEntrega ? 'Registrar entrega' : 'Pendientes'}
        </h3>
        <p className="text-sm text-[var(--isalwa-slate)]">Qué puede hacer ahora con este pedido.</p>
        <div className="flex flex-wrap gap-3">
          {allowEntrega && gate === 'needs-salida' ? (
            <p className="w-full text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {ENTREGA_GATE_COPY.needsSalida}
            </p>
          ) : null}
          {allowEntrega && gate === 'needs-received-by' ? (
            <p className="w-full text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {ENTREGA_GATE_COPY.needsReceivedBy}
            </p>
          ) : null}
          {allowNote ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!allowNote || pending || !actorMemberId}
              onClick={() =>
                run('nota', () =>
                  createNotaDeEntregaAction({
                    partyId,
                    orderId,
                    recipient,
                    deliveredBy,
                    observations: observations || null,
                    quantities: quantityPayload,
                    idempotencyKey: attemptKey('nota'),
                  }),
                )
              }
            >
              {ENTREGA_PANEL_COPY.createNota}
            </Button>
          ) : null}
          {allowSalida ? (
            <Button
              type="button"
              variant={gate === 'needs-salida' ? 'primary' : 'secondary'}
              disabled={!allowSalida || pending || !actorMemberId}
              onClick={() =>
                run('salida', () =>
                  recordSalidaAction({
                    partyId,
                    orderId,
                    deliveryNoteId: selectedNoteId || null,
                    quantities: quantityPayload,
                    notes: observations || null,
                    idempotencyKey: attemptKey('salida'),
                  }),
                )
              }
            >
              {ENTREGA_PANEL_COPY.recordSalida}
            </Button>
          ) : null}
          {allowEntrega ? (
            <Button
              type="button"
              variant={canSubmitEntrega ? 'contextual' : 'secondary'}
              disabled={!canSubmitEntrega || pending}
              onClick={() =>
                run('entrega', () =>
                  recordEntregaAction({
                    partyId,
                    orderId,
                    receivedBy,
                    deliveryNoteId: selectedNoteId || null,
                    quantities: quantityPayload,
                    notes: observations || null,
                    idempotencyKey: attemptKey('entrega'),
                  }),
                )
              }
            >
              {ENTREGA_PANEL_COPY.recordEntrega}
            </Button>
          ) : null}
        </div>
      </div>

      {allowEntrega || issuedNotes.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {issuedNotes.length > 0 ? (
            <label className="text-sm text-[var(--isalwa-slate)]">
              Nota de entrega vinculada (opcional)
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                disabled={pending}
              >
                <option value="">Sin nota de entrega</option>
                {issuedNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {presentDeliveryNoteLabel({
                      internalDocumentRef: note.internalDocumentRef,
                      orderNumber,
                    })}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {allowEntrega ? (
            <label className="text-sm text-[var(--isalwa-slate)]">
              Recibido por (para registrar entrega)
              <input
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                disabled={pending}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 space-y-6">
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Notas de entrega
        </h3>
        {notes.length === 0 ? (
          <EmptyState
            title="Todavía no hay nota de entrega"
            description="Cree una nota desde este pedido. La numeración es provisional interna."
          />
        ) : (
          <ul className="space-y-6">
            {noteWindow.items.map((note) => (
              <li
                key={note.id}
                className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={note.status === 'issued' ? 'success' : 'warning'}>
                    {note.status === 'issued' ? 'Emitida' : 'Anulada'}
                  </StatusPill>
                  <StatusPill tone="neutral">
                    {presentDeliveryNoteLabel({
                      internalDocumentRef: note.internalDocumentRef,
                      orderNumber,
                    })}
                  </StatusPill>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="isalwa-section-label">Destinatario</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">{note.recipient}</dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Entregado por</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">{note.deliveredBy}</dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Recibido por</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">{note.receivedBy ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Creada</dt>
                    <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatWhen(note.bornAt)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {canDownloadNotePdf ? (
                    <a
                      href={`/api/delivery-notes/${encodeURIComponent(note.id)}/pdf`}
                      className={actionPrimaryClass}
                      data-delivery-pdf-action=""
                    >
                      {ENTREGA_PANEL_COPY.downloadPdf}
                    </a>
                  ) : null}
                  {note.status === 'issued' && allowNote ? (
                    confirmingNoteId === note.id ? (
                      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar anulación">
                        <Button
                          type="button"
                          variant="danger"
                          disabled={pending}
                          onClick={() =>
                            run('correct', () =>
                              correctDeliveryDocumentAction({
                                partyId,
                                orderId,
                                deliveryNoteId: note.id,
                                reason: 'Corrección operativa registrada desde el pedido',
                              }),
                            )
                          }
                        >
                          {pending ? 'Registrando…' : 'Anular nota'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => setConfirmingNoteId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => setConfirmingNoteId(note.id)}
                      >
                        Corregir o anular
                      </Button>
                    )
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {noteWindow.truncated ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
            Mostrando las 25 notas de entrega más recientes.
          </p>
        ) : null}
      </div>

      <div
        id="entregas-historial"
        className="mt-10 scroll-mt-[calc(var(--isalwa-entrega-sticky-nav-offset,2.75rem)+0.5rem)]"
        data-entrega-historial=""
      >
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Historial
        </h3>
        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
            {ENTREGA_PANEL_COPY.chronologyEmpty}
          </p>
        ) : (
          <div className="mt-4">
            <Timeline
              items={timelineWindow.items.map((item) => {
                const canonical = timelineEventLabel(item.eventType);
                const label = canonical !== 'Actividad registrada' ? canonical : item.label;
                const detail = scrubPilotDeliveryNoteRefs(item.detail, orderNumber);
                return {
                  id: item.id,
                  label,
                  meta: (
                    <span className="text-sm text-[var(--isalwa-slate)]">
                      {formatWhen(item.occurredAt)}
                    </span>
                  ),
                  body: (
                    <span>
                      {detail}
                      {item.href ? (
                        <>
                          {' · '}
                          <a
                            href={item.href}
                            className="isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
                          >
                            Abrir
                          </a>
                        </>
                      ) : null}
                    </span>
                  ),
                };
              })}
            />
            {timelineWindow.truncated ? (
              <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
                Mostrando los 25 eventos más recientes.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </PageSection>
  );
}
