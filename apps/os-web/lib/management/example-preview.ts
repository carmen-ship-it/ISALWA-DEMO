export const EXAMPLE_WATERMARK = 'EJEMPLO · DATOS FICTICIOS';

export type ExampleOrgMetricCard = {
  label: string;
  value: string;
  hint?: string;
};

export function exampleOrgMetricsPreview(): { cards: ExampleOrgMetricCard[] } {
  return {
    cards: [
      { label: 'Oportunidades abiertas', value: '12' },
      { label: 'Valor de oportunidades', value: 'Bs. 48.500,00', hint: 'No es ingreso.' },
      { label: 'Cotizaciones emitidas', value: '9' },
      { label: 'Valor cotizado', value: 'Bs. 31.200,00', hint: 'No es ingreso.' },
      {
        label: 'Cotización → Pedido',
        value: '44%',
        hint: 'Porcentaje de cotizaciones del período que terminaron convertidas en pedido.',
      },
      { label: 'Pedidos', value: '4' },
      { label: 'Valor de pedidos', value: 'Bs. 28.900,00', hint: 'No es ingreso ni cobranza.' },
      { label: 'Pedidos entregados', value: '2' },
      { label: 'Seguimientos vencidos', value: '1' },
      { label: 'Incidencias abiertas', value: '0' },
      { label: 'Aprobaciones pendientes', value: '1' },
    ],
  };
}

export type ExampleTeamRow = {
  advisor: string;
  clients: number;
  opportunities: number;
  issued: number;
  converted: number;
  rate: string;
  overdue: number;
  issues: number;
};

export function exampleTeamTablePreview(): ExampleTeamRow[] {
  return [
    {
      advisor: 'Ana Rojas',
      clients: 8,
      opportunities: 3,
      issued: 4,
      converted: 2,
      rate: '50%',
      overdue: 1,
      issues: 0,
    },
    {
      advisor: 'Luz Vargas',
      clients: 6,
      opportunities: 2,
      issued: 3,
      converted: 1,
      rate: '33%',
      overdue: 0,
      issues: 1,
    },
  ];
}

/** Example payloads must never be merged into live metric composers. */
export function examplePreviewIsolatedFromLive(liveJson: string): boolean {
  return !liveJson.includes('EJEMPLO') && !liveJson.includes('Ana Rojas');
}
