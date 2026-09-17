import { StatGroup } from '@isalwa/ui';
import {
  computeEntregaSummaryCounts,
  type EntregaSummaryCounts,
} from '@/lib/delivery/delivery-progress';
import { countDeliveriesToday } from '@/lib/delivery/count-deliveries-today';

export { countDeliveriesToday, computeEntregaSummaryCounts };
export type { EntregaSummaryCounts };

type EntregaSummaryStripProps = {
  /** Canonical issued delivery-note count when available; otherwise 0 (honest empty). */
  deliveryNotesCount: number;
  warehouseExits: readonly { orderId: string }[];
  deliveries: readonly { orderId: string; deliveredAt: string }[];
};

/**
 * Notas de entrega / Salidas sin entrega / Entregas hoy — only from canonical reads.
 * "Notas de entrega" is issued delivery notes — not Preparación and not Salida.
 */
export function EntregaSummaryStrip({
  deliveryNotesCount,
  warehouseExits,
  deliveries,
}: EntregaSummaryStripProps) {
  const counts = computeEntregaSummaryCounts({
    noteCount: deliveryNotesCount,
    exits: warehouseExits,
    deliveries,
  });

  return (
    <StatGroup
      className="mb-6"
      items={[
        { label: 'Notas de entrega', value: String(counts.notasDeEntrega) },
        { label: 'Salidas sin entrega', value: String(counts.salidasSinEntrega) },
        { label: 'Entregas hoy', value: String(counts.entregasHoy) },
      ]}
    />
  );
}
