/**
 * Pedido lifecycle step strip — facts only.
 * Marks a step done only when a durable recorded fact exists.
 * Never invents prep, nota, salida, or entrega from status labels alone.
 * Vocabulary: Cotización → Pedido → Preparación → Nota de Entrega → Salida → Entrega.
 * Preparación ≠ Nota; Nota ≠ Salida.
 */

export const PEDIDO_LIFECYCLE_STEPS = [
  'cotizacion',
  'pedido',
  'preparacion',
  'nota',
  'salida',
  'entrega',
] as const;

export type PedidoLifecycleStepId = (typeof PEDIDO_LIFECYCLE_STEPS)[number];

export type PedidoLifecycleMark = 'done' | 'pending';

export type PedidoLifecycleStep = {
  id: PedidoLifecycleStepId;
  label: string;
  mark: PedidoLifecycleMark;
};

export const PEDIDO_LIFECYCLE_LABELS: Record<PedidoLifecycleStepId, string> = {
  cotizacion: 'Cotización',
  pedido: 'Pedido',
  preparacion: 'Preparación',
  nota: 'Nota de Entrega',
  salida: 'Salida',
  entrega: 'Entrega',
};

export type PedidoLifecycleFacts = {
  /** Source quote linked on the order. */
  hasSourceQuote: boolean;
  /** Order document exists (always true on detail). */
  orderRecorded: boolean;
  /**
   * Prep fact: open OrderPrep review Work, finished-goods receive, or explicit prep note.
   * Do not treat commercial "open" status as prep. Do not treat delivery note as prep.
   */
  hasPreparacionFact: boolean;
  /** Issued delivery note (Nota de Entrega) — distinct from prep and salida. */
  hasNotaFact: boolean;
  /** Warehouse exit / salida recorded for this order. */
  hasSalidaFact: boolean;
  /** Customer delivery recorded for this order. */
  hasEntregaFact: boolean;
};

/**
 * Deterministic Cotización → Pedido → Preparación → Nota de Entrega → Salida → Entrega.
 */
export function buildPedidoLifecycle(facts: PedidoLifecycleFacts): PedidoLifecycleStep[] {
  return PEDIDO_LIFECYCLE_STEPS.map((id) => ({
    id,
    label: PEDIDO_LIFECYCLE_LABELS[id],
    mark: markForStep(id, facts),
  }));
}

function markForStep(id: PedidoLifecycleStepId, facts: PedidoLifecycleFacts): PedidoLifecycleMark {
  switch (id) {
    case 'cotizacion':
      return facts.hasSourceQuote ? 'done' : 'pending';
    case 'pedido':
      return facts.orderRecorded ? 'done' : 'pending';
    case 'preparacion':
      return facts.hasPreparacionFact ? 'done' : 'pending';
    case 'nota':
      return facts.hasNotaFact ? 'done' : 'pending';
    case 'salida':
      return facts.hasSalidaFact ? 'done' : 'pending';
    case 'entrega':
      return facts.hasEntregaFact ? 'done' : 'pending';
  }
}
