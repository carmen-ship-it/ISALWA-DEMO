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
};

function quantityLabel(lines: ReadonlyArray<{ quantity: number }>): string {
  if (lines.length === 0) return 'Sin cantidad copiada.';
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return `Cantidad registrada: ${total}. No declara el pedido como cumplido.`;
}

/** Chronology only. A warehouse exit is not a delivery and does not get an official number. */
export function buildEntregaChronology(input: EntregaChronologyInput): EntregaChronologyItem[] {
  const exits = input.warehouseExits.map((exit, index) => ({
    id: exit.id ?? `exit-${exit.exitedAt}-${index}`,
    occurredAt: exit.exitedAt,
    kind: 'warehouse_exit' as const,
    label: 'Nota de salida de almacén',
    detail: `Salió del almacén. No es la nota de entrega. ${quantityLabel(exit.lines)}`,
    recordedByLabel: exit.recordedByLabel,
    sourceLabel: exit.sourceLabel ?? 'Registro interno',
  }));
  const deliveries = input.deliveries.map((delivery, index) => ({
    id: delivery.id ?? `delivery-${delivery.deliveredAt}-${index}`,
    occurredAt: delivery.deliveredAt,
    kind: 'delivery' as const,
    label: 'Nota de entrega',
    detail: `Llegó al cliente. ${quantityLabel(delivery.lines)}`,
    recordedByLabel: delivery.recordedByLabel,
    sourceLabel: delivery.sourceLabel ?? 'Registro interno',
  }));
  return [...exits, ...deliveries].sort((left, right) => {
    const byTime = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
    if (byTime !== 0) return byTime;
    if (left.kind === right.kind) return left.id.localeCompare(right.id);
    return left.kind === 'warehouse_exit' ? -1 : 1;
  });
}
