import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PEDIDO_LIFECYCLE_LABELS,
  PEDIDO_LIFECYCLE_STEPS,
  buildPedidoLifecycle,
} from './pedido-lifecycle';

describe('buildPedidoLifecycle', () => {
  it('renders Cotización → Pedido → Preparación → Nota de Entrega → Salida → Entrega', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: false,
      orderRecorded: true,
      hasPreparacionFact: false,
      hasNotaFact: false,
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
        PEDIDO_LIFECYCLE_LABELS.nota,
        PEDIDO_LIFECYCLE_LABELS.salida,
        PEDIDO_LIFECYCLE_LABELS.entrega,
      ],
    );
    assert.equal(PEDIDO_LIFECYCLE_LABELS.nota, 'Nota de Entrega');
    assert.notEqual(PEDIDO_LIFECYCLE_LABELS.preparacion, PEDIDO_LIFECYCLE_LABELS.nota);
    assert.notEqual(PEDIDO_LIFECYCLE_LABELS.nota, PEDIDO_LIFECYCLE_LABELS.salida);
    assert.equal(steps[0].mark, 'pending');
    assert.equal(steps[1].mark, 'done');
    assert.equal(steps[2].mark, 'pending');
    assert.equal(steps[3].mark, 'pending');
    assert.equal(steps[4].mark, 'pending');
    assert.equal(steps[5].mark, 'pending');
  });

  it('marks steps done only from recorded facts', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: true,
      orderRecorded: true,
      hasPreparacionFact: true,
      hasNotaFact: true,
      hasSalidaFact: true,
      hasEntregaFact: false,
    });

    assert.deepEqual(
      steps.map((step) => step.mark),
      ['done', 'done', 'done', 'done', 'done', 'pending'],
    );
  });

  it('does not treat Nota as Preparación or Salida', () => {
    const noteOnly = buildPedidoLifecycle({
      hasSourceQuote: true,
      orderRecorded: true,
      hasPreparacionFact: false,
      hasNotaFact: true,
      hasSalidaFact: false,
      hasEntregaFact: false,
    });
    assert.equal(noteOnly.find((s) => s.id === 'preparacion')?.mark, 'pending');
    assert.equal(noteOnly.find((s) => s.id === 'nota')?.mark, 'done');
    assert.equal(noteOnly.find((s) => s.id === 'salida')?.mark, 'pending');
  });

  it('does not invent salida or entrega without facts', () => {
    const steps = buildPedidoLifecycle({
      hasSourceQuote: true,
      orderRecorded: true,
      hasPreparacionFact: false,
      hasNotaFact: false,
      hasSalidaFact: false,
      hasEntregaFact: false,
    });
    assert.equal(steps.find((s) => s.id === 'salida')?.mark, 'pending');
    assert.equal(steps.find((s) => s.id === 'entrega')?.mark, 'pending');
  });
});
