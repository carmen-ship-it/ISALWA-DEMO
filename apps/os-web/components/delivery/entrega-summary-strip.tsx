import { StatGroup } from '@isalwa/ui';
import {
  computeEntregaSummaryCounts,
  type EntregaSummaryCounts,
} from '@/lib/delivery/delivery-progress';
import { countDeliveriesToday } from '@/lib/delivery/count-deliveries-today';

export { countDeliveriesToday, computeEntregaSummaryCounts };
export type { EntregaSummaryCounts };

type EntregaSummaryStripProps = {
  /** Canonical delivery-note count when available; otherwise 0 (honest empty). */
  notesPreparedCount: number;
  warehouseExits: readonly { orderId: string }[];
  deliveries: readonly { orderId: string; deliveredAt: string }[];
};

/**
 * Notas preparadas / Salidas sin entrega / Entregas hoy — only from canonical reads.
 */
export function EntregaSummaryStrip({
  notesPreparedCount,
  warehouseExits,
  deliveries,
}: EntregaSummaryStripProps) {
  const counts = computeEntregaSummaryCounts({
    noteCount: notesPreparedCount,
    exits: warehouseExits,
    deliveries,
  });

  return (
    <StatGroup
      className="mb-6"
      items={[
        { label: 'Notas preparadas', value: String(counts.notasPreparadas) },
        { label: 'Salidas sin entrega', value: String(counts.salidasSinEntrega) },
        { label: 'Entregas hoy', value: String(counts.entregasHoy) },
      ]}
    />
  );
}
