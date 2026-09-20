export type EntregaChronologyInput = {
  warehouseExits: ReadonlyArray<{
    id?: string;
    exitedAt: string;
    recordedByLabel: string;
    sourceLabel?: string;
    notes: string | null;
    lines: ReadonlyArray<{ quantity: number }>;
  }>;
  deliveries: ReadonlyArray<{
    id?: string;
    deliveredAt: string;
    deliveredTo?: string | null;
    recordedByLabel: string;
    sourceLabel?: string;
    notes: string | null;
    lines: ReadonlyArray<{ quantity: number }>;
  }>;
};

export type EntregaChronologyItem = {
  id: string;
  occurredAt: string;
  kind: 'warehouse_exit' | 'delivery';
  label: string;
  detail: string;
  recordedByLabel: string;
  sourceLabel: string;
  /** Secondary provenance — UI may hide behind disclosure. */
  provenance?: string | null;
};

function quantityLabel(lines: ReadonlyArray<{ quantity: number }>): string {
  if (lines.length === 0) return 'Sin cantidad registrada.';
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return `Cantidad registrada: ${total}.`;
}

/**
 * Chronology only.
 * warehouse_exit → Salida registrada (never "Nota de entrega" / never delivery wording).
 * delivery → Entrega registrada (arrival language only for genuine Entrega).
 */
export function buildEntregaChronology(input: EntregaChronologyInput): EntregaChronologyItem[] {
  const exits = input.warehouseExits.map((exit, index) => ({
    id: exit.id ?? `exit-${exit.exitedAt}-${index}`,
    occurredAt: exit.exitedAt,
    kind: 'warehouse_exit' as const,
    label: 'Salida registrada',
    detail: quantityLabel(exit.lines),
    recordedByLabel: exit.recordedByLabel,
    sourceLabel: exit.sourceLabel ?? 'Registro interno',
    provenance: exit.notes?.trim() || null,
  }));
  const deliveries = input.deliveries.map((delivery, index) => {
    const received = delivery.deliveredTo?.trim() || null;
    const facts = [
      received ? `Recibido por: ${received}` : null,
      quantityLabel(delivery.lines),
    ].filter(Boolean);
    return {
      id: delivery.id ?? `delivery-${delivery.deliveredAt}-${index}`,
      occurredAt: delivery.deliveredAt,
      kind: 'delivery' as const,
      label: 'Entrega registrada',
      detail: facts.join(' · '),
      recordedByLabel: delivery.recordedByLabel,
      sourceLabel: delivery.sourceLabel ?? 'Registro interno',
      provenance: delivery.notes?.trim() || null,
    };
  });
  return [...exits, ...deliveries].sort((left, right) => {
    const byTime = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
    if (byTime !== 0) return byTime;
    if (left.kind === right.kind) return left.id.localeCompare(right.id);
    return left.kind === 'warehouse_exit' ? -1 : 1;
  });
}
