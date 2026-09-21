'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import {
  Button,
  FeedbackNote,
  PageSection,
  SectionHeader,
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
  idempotencyKey: string;
};

type WarehousePostSaleDeskProps = {
  status: 'loading' | 'error' | 'denied' | 'ready';
  denial?: WarehouseDenialReason | null;
  view?: WarehouseTaskView | null;
  canAllocate?: boolean;
  canReceive?: boolean;
  pedidos: readonly PostSalePedidoOption[];
  initialOrderId?: string | null;
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
  initialOrderId = null,
  onReceive,
}: WarehousePostSaleDeskProps) {
  const [orderId, setOrderId] = useState<string | null>(initialOrderId?.trim() || null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; title: string; detail?: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const attemptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const target = initialOrderId?.trim();
    if (!target) return;
    if (pedidos.some((row) => row.orderId === target)) {
      setOrderId(target);
    }
  }, [initialOrderId, pedidos]);

  const pedido = useMemo(
    () => pedidos.find((row) => row.orderId === orderId) ?? null,
    [pedidos, orderId],
  );
  const line = resolveLineProduct(pedido, orderLineId);

  function submitReceive(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (!onReceive || !canReceive || !pedido || !line || !quantity.trim() || pending) {
      if (!pending) {
        setFeedback({
          tone: 'error',
          title: 'Seleccione pedido, producto y una cantidad válida.',
        });
      }
      return;
    }
    if (!attemptKeyRef.current) {
      attemptKeyRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `fg-${Date.now()}`;
    }
    const idempotencyKey = attemptKeyRef.current;
    startTransition(async () => {
      const result = await onReceive({
        productId: line.productId,
        quantity: quantity.trim(),
        contextOrderId: pedido.orderId,
        contextOrderLineId: line.orderLineId,
        note: note.trim(),
        idempotencyKey,
      });
      if (!result.ok) {
        setFeedback({ tone: 'error', title: result.error ?? 'No se pudo registrar el ingreso.' });
        return;
      }
      attemptKeyRef.current = null;
      setFeedback({
        tone: 'success',
        title: 'Ingreso registrado.',
      });
      setQuantity('');
      setNote('');
    });
  }

  return (
    <div className="space-y-6" data-postsale-spine="warehouse">
      <PedidoHandoffPanel
        density="field"
        pedidos={pedidos}
        selectedOrderId={orderId}
        selectedOrderLineId={orderLineId}
        onSelectPedido={setOrderId}
        onSelectLine={setOrderLineId}
      />

      <PageSection card className="p-6 md:p-8" aria-label="Registrar ingreso de producto terminado">
        <SectionHeader
          kicker="Almacén"
          title="Registrar ingreso de producto terminado"
        />
        {canReceive && onReceive && orderId && orderLineId ? (
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
              <Button type="submit" variant="contextual" disabled={pending || !quantity.trim()}>
                {pending ? 'Registrando…' : 'Registrar ingreso'}
              </Button>
            </div>
          </form>
        ) : canReceive && onReceive ? (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
            Seleccione un pedido y una línea. Registrar ingreso permanece deshabilitado hasta entonces.
          </p>
        ) : canReceive ? (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" data-owner-review-state="v1-validate">
            Seleccione pedido, producto y cantidad para registrar el ingreso.
          </p>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" data-owner-review-state="not-authorized">
            Hace falta el permiso de ingreso a producto terminado.
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
