import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveCommercialProcessSteps,
  resolveDeliveryProcessSteps,
} from './process-steps';

describe('resolveCommercialProcessSteps', () => {
  it('marks deepest reached as current without inventing percentages', () => {
    const steps = resolveCommercialProcessSteps({
      hasClient: true,
      hasOpportunity: true,
      hasQuote: true,
      hasOrder: false,
      hasDelivery: false,
    });
    assert.deepEqual(
      steps.map((step) => ({ id: step.id, state: step.state })),
      [
        { id: 'cliente', state: 'completed' },
        { id: 'oportunidad', state: 'completed' },
        { id: 'cotizacion', state: 'current' },
        { id: 'pedido', state: 'future' },
        { id: 'entrega', state: 'future' },
      ],
    );
    assert.equal(
      steps.every((step) => !/%/.test(step.label) && !/%/.test(step.state)),
      true,
    );
  });

  it('honors attention override on a known step', () => {
    const steps = resolveCommercialProcessSteps({
      hasClient: true,
      hasOpportunity: true,
      hasQuote: false,
      hasOrder: false,
      hasDelivery: false,
      attentionStepId: 'oportunidad',
    });
    assert.equal(steps.find((step) => step.id === 'oportunidad')?.state, 'attention');
  });
});

describe('resolveDeliveryProcessSteps', () => {
  it('completes the chain only when delivery is reached', () => {
    const mid = resolveDeliveryProcessSteps({
      hasOrder: true,
      hasDeliveryNote: true,
      hasWarehouseExit: false,
      hasDelivery: false,
    });
    assert.equal(mid.find((step) => step.id === 'nota')?.label, 'Nota de Entrega');
    assert.equal(mid.find((step) => step.id === 'nota')?.state, 'current');
    assert.equal(mid.find((step) => step.id === 'entrega')?.state, 'future');

    const done = resolveDeliveryProcessSteps({
      hasOrder: true,
      hasDeliveryNote: true,
      hasWarehouseExit: true,
      hasDelivery: true,
    });
    assert.equal(done.every((step) => step.state === 'completed'), true);
  });
});
