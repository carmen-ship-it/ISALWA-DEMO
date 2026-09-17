import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCommercialFunnelSteps } from './commercial-funnel';

describe('buildCommercialFunnelSteps', () => {
  it('builds count-only funnel steps and never claims revenue', () => {
    const steps = buildCommercialFunnelSteps({
      opportunities: 5,
      quotes: 3,
      orders: 1,
    });
    assert.deepEqual(
      steps.map((step) => ({ id: step.id, label: step.label, count: step.count })),
      [
        { id: 'oportunidades', label: 'Oportunidades', count: 5 },
        { id: 'cotizaciones', label: 'Cotizaciones', count: 3 },
        { id: 'pedidos', label: 'Pedidos', count: 1 },
      ],
    );
    const copy = steps.map((step) => step.definition).join(' ');
    assert.match(copy, /No es valor monetario|no es ingreso/i);
    assert.doesNotMatch(copy, /revenue|facturaci[oó]n|cobranza confirmada/i);
  });
});
