/**
 * Delivery progress visual per order: Pedido / Nota / Salida / Entrega.
 * Deterministic from recorded facts only.
 */

export type DeliveryProgressMark = 'done' | 'pending';

export type DeliveryProgressStep = {
  id: 'pedido' | 'nota' | 'salida' | 'entrega';
  label: string;
  mark: DeliveryProgressMark;
};

export type DeliveryProgressFacts = {
  orderRecorded: boolean;
  hasNote: boolean;
  hasSalida: boolean;
  hasEntrega: boolean;
};

export function buildDeliveryProgress(facts: DeliveryProgressFacts): DeliveryProgressStep[] {
  return [
    { id: 'pedido', label: 'Pedido', mark: facts.orderRecorded ? 'done' : 'pending' },
    { id: 'nota', label: 'Nota', mark: facts.hasNote ? 'done' : 'pending' },
    { id: 'salida', label: 'Salida', mark: facts.hasSalida ? 'done' : 'pending' },
    { id: 'entrega', label: 'Entrega', mark: facts.hasEntrega ? 'done' : 'pending' },
  ];
}

export type EntregaSummaryCounts = {
  notasPreparadas: number;
  salidasSinEntrega: number;
  entregasHoy: number;
};

/**
 * Summary counts from canonical fulfillment reads.
 * Salidas sin entrega = exits whose orderId has no matching delivery.
 */
export function computeEntregaSummaryCounts(input: {
  noteCount: number;
  exits: readonly { orderId: string }[];
  deliveries: readonly { orderId: string; deliveredAt: string }[];
  asOf?: Date;
}): EntregaSummaryCounts {
  const deliveredOrders = new Set(
    input.deliveries.map((row) => row.orderId.trim()).filter(Boolean),
  );
  const salidasSinEntrega = input.exits.filter(
    (exit) => exit.orderId.trim() && !deliveredOrders.has(exit.orderId.trim()),
  ).length;

  const asOf = input.asOf ?? new Date();
  const dayKey = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const today = dayKey(asOf.toISOString());
  const entregasHoy = input.deliveries.filter((row) => dayKey(row.deliveredAt) === today).length;

  return {
    notasPreparadas: input.noteCount,
    salidasSinEntrega,
    entregasHoy,
  };
}
