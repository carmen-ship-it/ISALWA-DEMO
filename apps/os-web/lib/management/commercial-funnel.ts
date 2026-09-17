/**
 * Commercial funnel counts only — never a monetary revenue funnel.
 */

export type CommercialFunnelCounts = {
  opportunities: number;
  quotes: number;
  orders: number;
};

export type CommercialFunnelStep = {
  id: 'oportunidades' | 'cotizaciones' | 'pedidos';
  label: string;
  count: number;
  definition: string;
};

export function buildCommercialFunnelSteps(counts: CommercialFunnelCounts): CommercialFunnelStep[] {
  return [
    {
      id: 'oportunidades',
      label: 'Oportunidades',
      count: counts.opportunities,
      definition: 'Oportunidades abiertas en registros canónicos. No es valor monetario.',
    },
    {
      id: 'cotizaciones',
      label: 'Cotizaciones',
      count: counts.quotes,
      definition: 'Cotizaciones emitidas en el período. El valor cotizado se muestra aparte; no es ingreso.',
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      count: counts.orders,
      definition: 'Pedidos creados en el período. El valor de pedidos se muestra aparte; no es ingreso.',
    },
  ];
}
