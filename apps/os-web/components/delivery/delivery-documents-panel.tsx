'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button, EmptyState, PageSection, SectionHeader, StatusPill, Timeline } from '@isalwa/ui';
import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import {
  correctDeliveryDocumentAction,
  createNotaDeEntregaAction,
  recordEntregaAction,
  recordSalidaAction,
} from '@/lib/delivery/actions';

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
}: DeliveryDocumentsPanelProps) {
  const allowNote = canCreateNote ?? canMutate;
  const allowSalida = canRecordSalida ?? canMutate;
  const allowEntrega = canRecordEntrega ?? canMutate;
  const allowAnyWrite = allowNote || allowSalida || allowEntrega;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(orderLines.map((line) => [line.orderLineId, line.quantity])),
  );
  const [recipient, setRecipient] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [observations, setObservations] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(notes.find((n) => n.status === 'issued')?.id ?? '');
  const [receivedBy, setReceivedBy] = useState('');

  const issuedNotes = useMemo(() => notes.filter((note) => note.status === 'issued'), [notes]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? 'No se pudo completar la acción.');
    });
  }

  const quantityPayload = orderLines
    .map((line) => ({
      orderLineId: line.orderLineId,
      quantity: quantities[line.orderLineId] ?? line.quantity,
    }))
    .filter((row) => row.quantity >= 1);

  return (
    <PageSection card className="mt-10 bg-white p-8 md:p-10" data-delivery-documents="pedido">
      <SectionHeader
        kicker="Documentos de entrega"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Nota de entrega · salida · entrega
          </h2>
        }
      />
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {ENTREGA_PANEL_COPY.beforeDelivery} {ENTREGA_PANEL_COPY.warehouseDistinct}{' '}
        {ENTREGA_PANEL_COPY.provisionalDisclaimer}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone="neutral">Numeración provisional</StatusPill>
        <StatusPill tone="neutral">No es factura</StatusPill>
        <StatusPill tone="info">Almacén ≠ entrega al cliente</StatusPill>
      </div>

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{customerName}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Pedido</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{orderNumber}</dd>
        </div>
      </dl>

      {orderLines.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.noLines}</p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas del pedido">
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

      {error ? (
        <p className="mt-6 text-sm text-[var(--isalwa-ember)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {allowNote ? (
          <Button
            type="button"
            disabled={!allowNote || pending || !actorMemberId}
            onClick={() =>
              run(() =>
                createNotaDeEntregaAction({
                  partyId,
                  orderId,
                  recipient,
                  deliveredBy,
                  observations: observations || null,
                  quantities: quantityPayload,
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
            variant="secondary"
            disabled={!allowSalida || pending || !actorMemberId}
            onClick={() =>
              run(() =>
                recordSalidaAction({
                  partyId,
                  orderId,
                  deliveryNoteId: selectedNoteId || null,
                  quantities: quantityPayload,
                  notes: observations || null,
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
            disabled={!allowEntrega || pending || !actorMemberId || !receivedBy.trim()}
            onClick={() =>
              run(() =>
                recordEntregaAction({
                  partyId,
                  orderId,
                  receivedBy,
                  deliveryNoteId: selectedNoteId || null,
                  quantities: quantityPayload,
                  notes: observations || null,
                }),
              )
            }
          >
            {ENTREGA_PANEL_COPY.recordEntrega}
          </Button>
        ) : null}
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
                    {note.internalDocumentRef}
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
          Notas emitidas
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
                  <StatusPill tone="neutral">{note.internalDocumentRef}</StatusPill>
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
                    className="isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
                  >
                    {ENTREGA_PANEL_COPY.downloadPdf}
                  </a>
                  {note.status === 'issued' && canMutate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
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

      <div className="mt-10">
        <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          {ENTREGA_PANEL_COPY.chronology}
        </h3>
        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.chronologyEmpty}</p>
        ) : (
          <div className="mt-4">
            <Timeline
              items={timeline.map((item) => ({
                id: item.id,
                label: item.label,
                meta: <span className="text-sm text-[var(--isalwa-slate)]">{formatWhen(item.occurredAt)}</span>,
                body: (
                  <span>
                    {item.detail}
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
              }))}
            />
          </div>
        )}
      </div>
    </PageSection>
  );
}
