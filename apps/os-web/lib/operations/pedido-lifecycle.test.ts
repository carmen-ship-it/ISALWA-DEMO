import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PEDIDO_LIFECYCLE_LABELS,
  PEDIDO_LIFECYCLE_STEPS,
  buildPedidoLifecycle,
} from './pedido-lifecycle';

describe('buildPedidoLifecycle', () => {
  it('renders Cotización → Pedido → Preparación → Salida → Entrega in order', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: false,
      orderRecorded: true,
      hasPreparacionFact: false,
      hasSalidaFact: false,
      hasEntregaFact: false,
    });

    assert.deepEqual(
      steps.map((step) => step.id),
      [...PEDIDO_LIFECYCLE_STEPS],
    );
    assert.deepEqual(
      steps.map((step) => step.label),
      [
        PEDIDO_LIFECYCLE_LABELS.cotizacion,
        PEDIDO_LIFECYCLE_LABELS.pedido,
        PEDIDO_LIFECYCLE_LABELS.preparacion,
        PEDIDO_LIFECYCLE_LABELS.salida,
        PEDIDO_LIFECYCLE_LABELS.entrega,
      ],
    );
    assert.equal(steps[0].mark, 'pending');
    assert.equal(steps[1].mark, 'done');
    assert.equal(steps[2].mark, 'pending');
    assert.equal(steps[3].mark, 'pending');
    assert.equal(steps[4].mark, 'pending');
  });

  it('marks steps done only from recorded facts', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: true,
      orderRecorded: true,
      hasPreparacionFact: true,
      hasSalidaFact: true,
      hasEntregaFact: false,
    });

    assert.deepEqual(
      steps.map((step) => step.mark),
      ['done', 'done', 'done', 'done', 'pending'],
    );
  });

  it('does not invent salida or entrega without facts', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: true,
      orderRecorded: true,
      hasPreparacionFact: false,
      hasSalidaFact: false,
      hasEntregaFact: false,
    });
    assert.equal(steps.find((s) => s.id === 'salida')?.mark, 'pending');
    assert.equal(steps.find((s) => s.id === 'entrega')?.mark, 'pending');
  });
});
