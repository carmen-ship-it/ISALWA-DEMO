'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  Button,
  FeedbackNote,
  PageSection,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { PedidoHandoffPanel } from '@/components/postsale/pedido-handoff-panel';
import { WarehouseDesk } from '@/components/warehouse/warehouse-desk';
import { OPS_STICKY_ACTION_CLASS } from '@/components/production/ops-desk-surface';
import {
  POSTSALE_HANDOFF_COPY,
  resolveLineProduct,
  type PostSalePedidoOption,
} from '@/lib/postsale/pedido-context';
import type { WarehouseDenialReason, WarehouseTaskView } from '@/lib/warehouse';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type ReceiveDraft = {
  productId: string;
  quantity: string;
  contextOrderId: string;
  contextOrderLineId: string;
  note: string;
};

type WarehousePostSaleDeskProps = {
  status: 'loading' | 'error' | 'denied' | 'ready';
  denial?: WarehouseDenialReason | null;
  view?: WarehouseTaskView | null;
  canAllocate?: boolean;
  canReceive?: boolean;
  pedidos: readonly PostSalePedidoOption[];
  onReceive?: (draft: ReceiveDraft) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Almacén desk with Pedido handoff + physical FG receive foundation.
 * Allocation remains a separate policy surface (V1 validate when not mounted).
 */
export function WarehousePostSaleDesk({
  status,
  denial = null,
  view = null,
  canAllocate = false,
  canReceive = false,
  pedidos,
  onReceive,
}: WarehousePostSaleDeskProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; title: string; detail?: string } | null>(
    null,
  );

  const pedido = useMemo(
    () => pedidos.find((row) => row.orderId === orderId) ?? null,
    [pedidos, orderId],
  );
  const line = resolveLineProduct(pedido, orderLineId);

  async function submitReceive(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (!onReceive || !canReceive || !pedido || !line || !quantity.trim()) {
      setFeedback({
        tone: 'error',
        title: 'Seleccione pedido, producto y una cantidad válida.',
      });
      return;
    }
    const result = await onReceive({
      productId: line.productId,
      quantity: quantity.trim(),
      contextOrderId: pedido.orderId,
      contextOrderLineId: line.orderLineId,
      note: note.trim(),
    });
    if (!result.ok) {
      setFeedback({ tone: 'error', title: result.error ?? 'No se pudo registrar el ingreso.' });
      return;
    }
    setFeedback({
      tone: 'success',
      title: 'Ingreso físico registrado. No asigna el pedido ni publica stock oficial.',
    });
    setQuantity('');
    setNote('');
  }

  return (
    <div className="space-y-6" data-postsale-spine="warehouse">
      <PedidoHandoffPanel
        pedidos={pedidos}
        selectedOrderId={orderId}
        selectedOrderLineId={orderLineId}
        onSelectPedido={setOrderId}
        onSelectLine={setOrderLineId}
      />

      <PageSection card className="p-6 md:p-8" aria-label="Ingreso de producto terminado">
        <SectionHeader
          kicker="Almacén"
          title="Ingreso físico confirmado"
          action={<StatusPill tone="manual">No es asignación</StatusPill>}
        />
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Registre el ingreso a Almacén de Productos Terminados vinculado al pedido y la línea.
          La asignación / reserva sigue siendo una decisión de política aparte.
        </p>
        {canReceive && onReceive ? (
          <form className="mt-6 space-y-4" onSubmit={submitReceive}>
            <label className="block text-sm text-[var(--isalwa-slate)]">
              Cantidad
              <input
                className={fieldClass}
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm text-[var(--isalwa-slate)]">
              {POSTSALE_HANDOFF_COPY.note}
              <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <div className={`${OPS_STICKY_ACTION_CLASS} -mx-2 px-2 py-3`}>
              <Button type="submit">Registrar ingreso físico</Button>
            </div>
          </form>
        ) : canReceive ? (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" data-owner-review-state="v1-validate">
            El contexto de pedido y la cantidad se muestran para validar el flujo. La persistencia
            hospedada del ingreso físico queda para integración (Control Tower). No es asignación.
          </p>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" data-owner-review-state="not-authorized">
            Hace falta el permiso de ingreso a producto terminado. La asignación es un permiso distinto.
          </p>
        )}
        {feedback ? (
          <div className="mt-4">
            <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
          </div>
        ) : null}
      </PageSection>

      <WarehouseDesk
        status={status}
        denial={denial}
        view={view}
        canAllocate={canAllocate}
      />
    </div>
  );
}
