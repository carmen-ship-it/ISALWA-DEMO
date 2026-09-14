'use client';

import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Panel, SectionHeader, StatusPill } from '@isalwa/ui';

/**
 * Unmounted. Do not import this from a route, walkthrough, or command center in this lane.
 * A purchase request is not inventory and does not prove there is no stock.
 */

export const PURCHASE_REQUEST_PANEL_BOUNDARY =
  'Un pedido de compra no prueba que no haya stock. No es inventario, no es un faltante oficial y no genera una recompra automática.';

const STATUS_LABELS = {
  requested: 'Pedido de compra',
  in_progress: 'En curso',
  received: 'Recibido',
  cancelled: 'Cancelado',
} as const;

type PurchaseRequestPanelStatus = keyof typeof STATUS_LABELS;

const NEXT_STATUS: Record<PurchaseRequestPanelStatus, readonly PurchaseRequestPanelStatus[]> = {
  requested: ['in_progress', 'cancelled'],
  in_progress: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export type PurchaseRequestPanelNote = {
  id: string;
  body: string;
  at: string;
  actorLabel: string;
};

export type PurchaseRequestPanelHistory = {
  id: string;
  toStatus: PurchaseRequestPanelStatus;
  at: string;
  actorLabel: string;
};

export type PurchaseRequestPanelItem = {
  id: string;
  requestingArea: string;
  requestedByLabel: string;
  description: string;
  quantity: string | null;
  unit: string | null;
  productionContextId: string | null;
  orderId: string | null;
  reason: string;
  requestedAt: string;
  status: PurchaseRequestPanelStatus;
  buyerLabel: string | null;
  notes: PurchaseRequestPanelNote[];
  statusHistory: PurchaseRequestPanelHistory[];
};

export type PurchaseRequestDraft = {
  requestingArea: string;
  requestedByLabel: string;
  description: string;
  quantity: string;
  unit: string;
  reason: string;
  orderId: string;
  productionContextId: string;
};

type PurchaseRequestPanelProps = {
  requests: PurchaseRequestPanelItem[];
  actorLabel?: string;
  onCreate?: (draft: PurchaseRequestDraft) => void;
  onChangeStatus?: (id: string, status: PurchaseRequestPanelStatus) => void;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function statusTone(status: PurchaseRequestPanelStatus): 'info' | 'warning' | 'manual' | 'neutral' {
  if (status === 'in_progress') return 'warning';
  if (status === 'cancelled') return 'neutral';
  if (status === 'received') return 'manual';
  return 'info';
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function knownQuantity(item: PurchaseRequestPanelItem): string | null {
  if (item.quantity && item.unit) return `${item.quantity} ${item.unit}`;
  if (item.quantity) return item.quantity;
  if (item.unit) return item.unit;
  return null;
}

export function PurchaseRequestPanel({
  requests,
  actorLabel,
  onCreate,
  onChangeStatus,
}: PurchaseRequestPanelProps) {
  return (
    <Panel padded>
      <SectionHeader kicker="Compras" title="Pedidos de compra" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill tone="manual">No es inventario</StatusPill>
      </div>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {PURCHASE_REQUEST_PANEL_BOUNDARY} El área pide. La encargada de compras compra. Recibido no
        actualiza un inventario.
      </p>
      {requests.length === 0 ? (
        <EmptyState
          title="Todavía no hay pedidos de compra"
          description="El área responsable pide. La encargada de compras compra. Un pedido no prueba que no haya stock."
        />
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id}>
              <PurchaseRequestCard
                request={request}
                actorLabel={actorLabel}
                onChangeStatus={onChangeStatus}
              />
            </li>
          ))}
        </ul>
      )}
      {onCreate ? <PurchaseRequestForm onCreate={onCreate} /> : null}
    </Panel>
  );
}

function PurchaseRequestCard({
  request,
  actorLabel,
  onChangeStatus,
}: {
  request: PurchaseRequestPanelItem;
  actorLabel?: string;
  onChangeStatus?: (id: string, status: PurchaseRequestPanelStatus) => void;
}) {
  const quantity = knownQuantity(request);
  const next = NEXT_STATUS[request.status];
  return (
    <article className="space-y-3 border-t border-[var(--isalwa-mist)] py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{request.description}</h3>
        <StatusPill tone={statusTone(request.status)}>{STATUS_LABELS[request.status]}</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{request.reason}</p>
      <dl className="grid gap-2 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
        <div>
          <dt className="isalwa-section-label">Área</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{request.requestingArea}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Quién pide</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{request.requestedByLabel}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Pedido el</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatWhen(request.requestedAt)}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Compradora</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{request.buyerLabel ?? 'Todavía no asignada'}</dd>
        </div>
        {quantity ? (
          <div>
            <dt className="isalwa-section-label">Cantidad informada</dt>
            <dd className="mt-1 text-[var(--isalwa-kiln)]">{quantity}</dd>
          </div>
        ) : null}
        {request.orderId ? (
          <div>
            <dt className="isalwa-section-label">Pedido vinculado</dt>
            <dd className="mt-1 text-[var(--isalwa-kiln)]">{request.orderId}</dd>
          </div>
        ) : null}
        {request.productionContextId ? (
          <div>
            <dt className="isalwa-section-label">Contexto de producción</dt>
            <dd className="mt-1 text-[var(--isalwa-kiln)]">{request.productionContextId}</dd>
          </div>
        ) : null}
      </dl>
      {request.statusHistory.length > 0 ? (
        <ol className="space-y-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {request.statusHistory.map((entry) => (
            <li key={entry.id}>
              {STATUS_LABELS[entry.toStatus]} · {entry.actorLabel} · {formatWhen(entry.at)}
            </li>
          ))}
        </ol>
      ) : null}
      {request.notes.length > 0 ? (
        <ul className="space-y-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {request.notes.map((note) => (
            <li key={note.id}>
              {note.body} · {note.actorLabel}
            </li>
          ))}
        </ul>
      ) : null}
      {onChangeStatus && actorLabel && next.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {next.map((status) => (
            <Button
              key={status}
              type="button"
              variant={status === 'cancelled' ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => onChangeStatus(request.id, status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function PurchaseRequestForm({ onCreate }: { onCreate: (draft: PurchaseRequestDraft) => void }) {
  const [requestingArea, setRequestingArea] = useState('');
  const [requestedByLabel, setRequestedByLabel] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [reason, setReason] = useState('');
  const [orderId, setOrderId] = useState('');
  const [productionContextId, setProductionContextId] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      requestingArea,
      requestedByLabel,
      description,
      quantity,
      unit,
      reason,
      orderId,
      productionContextId,
    });
    setDescription('');
    setQuantity('');
    setUnit('');
    setReason('');
    setOrderId('');
    setProductionContextId('');
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
      <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">Nuevo pedido de compra</h3>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Cantidad, unidad y un vínculo a producción o a un pedido solo si ya se conocen. Esto no
        consulta stock.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="purchase-request-area" className="isalwa-section-label">
            Área solicitante
          </label>
          <input
            id="purchase-request-area"
            name="requestingArea"
            required
            value={requestingArea}
            onChange={(event) => setRequestingArea(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="purchase-request-by" className="isalwa-section-label">
            Quién pide
          </label>
          <input
            id="purchase-request-by"
            name="requestedByLabel"
            required
            value={requestedByLabel}
            onChange={(event) => setRequestedByLabel(event.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </div>
      </div>
      <div>
        <label htmlFor="purchase-request-item" className="isalwa-section-label">
          Qué se necesita
        </label>
        <input
          id="purchase-request-item"
          name="description"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={fieldClass}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="purchase-request-quantity" className="isalwa-section-label">
            Cantidad, si se conoce
          </label>
          <input
            id="purchase-request-quantity"
            name="quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="purchase-request-unit" className="isalwa-section-label">
            Unidad, si se conoce
          </label>
          <input
            id="purchase-request-unit"
            name="unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
      </div>
      <div>
        <label htmlFor="purchase-request-reason" className="isalwa-section-label">
          Motivo
        </label>
        <textarea
          id="purchase-request-reason"
          name="reason"
          required
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="purchase-request-order" className="isalwa-section-label">
            Pedido, solo si ya existe
          </label>
          <input
            id="purchase-request-order"
            name="orderId"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="purchase-request-production" className="isalwa-section-label">
            Producción, solo si ya existe
          </label>
          <input
            id="purchase-request-production"
            name="productionContextId"
            value={productionContextId}
            onChange={(event) => setProductionContextId(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
      </div>
      <Button type="submit">Registrar pedido de compra</Button>
    </form>
  );
}
