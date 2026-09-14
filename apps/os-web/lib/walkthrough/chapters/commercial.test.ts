import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapter } from './commercial';

const ALLOWED_TARGETS = new Set([
  'opportunity-list',
  'quote-list',
  'quote-status',
  'quote-pdf',
  'order-list',
  'approval-consequence',
]);

const copy = [chapter.title, ...chapter.steps.flatMap((step) => [step.title, step.body])].join('\n');

describe('commercial walkthrough', () => {
  it('exports the commercial chapter', () => {
    assert.equal(chapter.tourId, 'commercial');
    assert.ok(chapter.title.trim().length > 0);
    assert.ok(chapter.steps.length >= 1);
  });

  it('uses unique steps and only allowed targets', () => {
    const ids = chapter.steps.map((step) => step.stepId);
    assert.equal(new Set(ids).size, ids.length);
    for (const step of chapter.steps) {
      assert.ok(step.title.trim().length > 0);
      assert.ok(step.body.trim().length > 0);
      if (step.target) assert.ok(ALLOWED_TARGETS.has(step.target));
    }
  });

  it('teaches that approving records the decision and does not create an order', () => {
    assert.match(copy, /Aprobar registra la decisión/);
    assert.match(copy, /no crea un pedido/i);
    assert.match(copy, /Aprobar registra la decisión y no crea un pedido/);
  });

  it('does not claim dispatch, collections, or inventory as live', () => {
    assert.match(copy, /Despacho, cobranzas e inventario no están conectados/);
    assert.doesNotMatch(
      copy,
      /despacho (ya )?está (disponible|conectado|activo|en vivo)|puedes despachar|despachar ahora|cobranza en vivo|cobranzas conectadas|inventario conectado|inventario en vivo/i,
    );
  });

  it('does not call convert-to-order available today', () => {
    const status = chapter.steps.find((step) => step.stepId === 'quote-status');
    assert.ok(status);
    assert.equal(status.stateLabel, 'validacion');
    assert.match(status.body, /cotización enviada y elegible/);
    assert.match(status.body, /está terminando su validación/);
    assert.match(status.body, /hoy no la des por disponible/);
    assert.doesNotMatch(status.body, /disponible ahora|ya puedes convertir|convertir ahora/i);
  });
});
