import { StatGroup } from '@isalwa/ui';
import { countDeliveriesToday } from '@/lib/delivery/count-deliveries-today';

export { countDeliveriesToday };

type EntregaSummaryStripProps = {
  warehouseExitCount: number;
  deliveryCount: number;
  deliveriesToday: number;
};

/**
 * Counts from mounted fulfillment reads only — no invented operational state.
 */
export function EntregaSummaryStrip({
  warehouseExitCount,
  deliveryCount,
  deliveriesToday,
}: EntregaSummaryStripProps) {
  return (
    <StatGroup
      className="mb-6"
      items={[
        { label: 'Salidas registradas', value: String(warehouseExitCount) },
        { label: 'Entregas registradas', value: String(deliveryCount) },
        { label: 'Entregas hoy', value: String(deliveriesToday) },
      ]}
    />
  );
}
