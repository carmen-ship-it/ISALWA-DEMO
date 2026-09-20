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
import { actionSecondaryClass } from '@/lib/ui/action-hierarchy';
import { timelineEventLabel } from '@/lib/commercial/timeline-labels';

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
  quotedProducts?: import('@/lib/commercial/quoted-product-context').QuotedProductLine[];
  quoteUnavailable?: boolean;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
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
  quotedProducts = [],
  quoteUnavailable = false,
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
  const [selectedNoteId, setSelectedNoteId] = useState(notes.find((n) => n.status === 'issued')?.id ?? '');
  const [receivedBy, setReceivedBy] = useState('');
  const gate = entregaGate({ hasSalida, receivedBy });
  const canSubmitEntrega =
    allowEntrega && entregaEnabled({ hasSalida, receivedBy }) && Boolean(actorMemberId);

  const issuedNotes = useMemo(() => notes.filter((note) => note.status === 'issued'), [notes]);

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
      setNotice('Quedó registrado. Esta página muestra ese documento. No cree otro por el mismo intento.');
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
      className="mt-6 scroll-mt-[calc(var(--isalwa-shell-header-offset,3.5rem)+2.5rem)] bg-white p-6 md:p-8"
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

      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{presentEntregaAuditLabel(customerName)}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Pedido</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{presentEntregaAuditLabel(orderNumber)}</dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6" data-frozen-quote-context="">
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Productos de la cotización
        </h3>
        {quoteUnavailable ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{QUOTED_PRODUCTS_UNAVAILABLE}</p>
        ) : quotedProducts.length > 0 ? (
          <>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{QUOTED_PRODUCTS_NOTE}</p>
            <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas congeladas de cotización">
              {quotedProducts.map((line) => (
                <li key={line.quoteLineId} className="py-4">
                  <p className="whitespace-pre-line font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                  {line.specialItem ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{SPECIAL_ITEM_LABEL}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    <span className="isalwa-section-label">{QUOTED_QUANTITY_LABEL}</span>
                    <span className="mt-1 block text-[var(--isalwa-kiln)]">
                      {line.quantity}
                      {line.unitLabel ? ` ${line.unitLabel}` : ''}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Sin productos guardados en la cotización.
          </p>
        )}
      </div>

      {orderLines.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.noLines}</p>
      ) : (
        <div className="mt-6">
          <h3 className="isalwa-section-label">Cantidades a registrar</h3>
          <ul className="mt-2 divide-y divide-[var(--isalwa-mist)]" aria-label="Cantidades del pedido">
          {orderLines.map((line) => (
            <li key={line.orderLineId} className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
              <span className="text-[var(--isalwa-kiln)]">{line.description}</span>
              <label className="flex items-center gap-2 text-[var(--isalwa-slate)]">
                Cantidad
                <input
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
                  className="w-20 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-2 py-1"
                  disabled={!allowAnyWrite || pending}
                />
                <span>de {line.quantity}{line.unitLabel ? ` ${line.unitLabel}` : ''}</span>
              </label>
            </li>
          ))}
          </ul>
        </div>
      )}

      {allowNote && actorMemberId ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <label className="text-sm text-[var(--isalwa-slate)]">
            Destinatario
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)]"
              disabled={pending}
            />
          </label>
          <label className="text-sm text-[var(--isalwa-slate)]">
            Entregado por
            <input
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)]"
              disabled={pending}
            />
          </label>
          <label className="md:col-span-2 text-sm text-[var(--isalwa-slate)]">
            Observaciones (opcional)
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)]"
              rows={2}
              disabled={pending}
            />
          </label>
        </div>
      ) : null}

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
        className="mt-8 scroll-mt-[calc(var(--isalwa-shell-header-offset,3.5rem)+2.5rem)] space-y-3 border-t border-[var(--isalwa-mist)] pt-6"
        data-entrega-pendientes=""
      >
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Pendientes
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
            variant="secondary"
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
            {notes.map((note) => (
              <li key={note.id} className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4">
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
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`/api/delivery-notes/${encodeURIComponent(note.id)}/pdf`}
                    className={actionSecondaryClass}
                    data-delivery-pdf-action=""
                  >
                    {ENTREGA_PANEL_COPY.downloadPdf}
                  </a>
                  {note.status === 'issued' && canMutate ? (
                    <Button
                      type="button"
                      variant="ghost"
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
                      Corregir / anular
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        id="entregas-historial"
        className="mt-10 scroll-mt-[calc(var(--isalwa-shell-header-offset,3.5rem)+2.5rem)]"
        data-entrega-historial=""
      >
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Historial
        </h3>
        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.chronologyEmpty}</p>
        ) : (
          <div className="mt-4">
            <Timeline
              items={timeline.map((item) => {
                const canonical = timelineEventLabel(item.eventType);
                const label =
                  canonical !== 'Actividad registrada' ? canonical : item.label;
                const detail = scrubPilotDeliveryNoteRefs(item.detail, orderNumber);
                return {
                  id: item.id,
                  label,
                  meta: <span className="text-sm text-[var(--isalwa-slate)]">{formatWhen(item.occurredAt)}</span>,
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
          </div>
        )}
      </div>
    </PageSection>
  );
}
