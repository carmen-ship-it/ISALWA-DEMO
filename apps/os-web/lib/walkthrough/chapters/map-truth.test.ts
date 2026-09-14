import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapter, type TourStateLabel } from './map-truth';

const STATE_LABELS: readonly TourStateLabel[] = [
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
];

const ALLOWED_TARGETS = ['map-coverage', 'location-state', 'manual-draft'] as const;

const copy = [chapter.title, ...chapter.steps.flatMap((step) => [step.title, step.body])].join('\n');

describe('map truth chapter', () => {
  it('exports the map chapter contract', () => {
    assert.equal(chapter.tourId, 'map');
    assert.equal(chapter.title, 'Mapa y verdad de los datos');
    assert.equal(chapter.steps.length, 5);

    const stepIds = new Set<string>();
    for (const step of chapter.steps) {
      assert.match(step.stepId, /^[a-z0-9-]+$/);
      assert.equal(stepIds.has(step.stepId), false);
      stepIds.add(step.stepId);
      assert.equal(STATE_LABELS.includes(step.stateLabel), true);
      if (step.target !== undefined) {
        assert.equal(
          (ALLOWED_TARGETS as readonly string[]).includes(step.target),
          true,
          step.target,
        );
      }
      assert.ok(step.title.trim().length > 0);
      assert.ok(step.title.length <= 40, step.title);
      const sentences = step.body.split(/(?<=[.!?])\s+/).filter(Boolean);
      assert.ok(sentences.length >= 1 && sentences.length <= 3, step.body);
    }

    for (const target of ALLOWED_TARGETS) {
      assert.equal(
        chapter.steps.some((step) => step.target === target),
        true,
        target,
      );
    }
  });

  it('does not present an interactive map as live', () => {
    assert.doesNotMatch(copy, /use el mapa para/i);
    assert.doesNotMatch(copy, /\b2\s*(?:\/|de)\s*7\b/i);
    assert.doesNotMatch(copy, /MICRISTAL|TORREZ/i);
    assert.equal(affirmative(copy, /mapa interactivo|mapa de calor|mapa en vivo/i).length, 0);
    assert.match(copy, /mapa interactivo no está conectado/i);
    assert.match(copy, /no es un mapa de calor/i);
    assert.match(copy, /cuando conectemos un proveedor/i);

    const liveEnough = chapter.steps.filter((step) =>
      step.stateLabel === 'disponible' || step.stateLabel === 'manual',
    );
    for (const step of liveEnough) {
      assert.doesNotMatch(`${step.title} ${step.body}`, /mapa interactivo está|mapa de calor muestra/i);
    }
  });

  it('does not treat a reported payment as collected money', () => {
    assert.match(copy, /Dato manual/);
    assert.match(copy, /Pendiente de confirmar/);
    assert.match(copy, /pago reportado no es dinero cobrado/i);
    assert.match(copy, /no se guarda en el sistema/i);
    assert.equal(
      affirmative(copy, /cobrado|pagado|pago confirmado|\bingreso\b|dinero cobrado/i).length,
      0,
    );

    const disponible = chapter.steps
      .filter((step) => step.stateLabel === 'disponible')
      .map((step) => `${step.title} ${step.body}`)
      .join('\n');
    assert.doesNotMatch(disponible, /pago confirmado|dinero cobrado|cobrado/i);
  });

  it('teaches review, provenance, and that Vista demo is not today', () => {
    assert.match(copy, /no se fusionan en silencio/i);
    assert.match(copy, /coordenadas/i);
    assert.match(copy, /procedencia/i);
    assert.match(copy, /enlace de Maps/i);
    assert.match(copy, /no coloca al cliente en el mapa/i);
    assert.match(copy, /Vista demo no está conectado/i);
    assert.match(copy, /no es una cifra ni un pendiente de hoy/i);
    assert.equal(affirmative(copy, /\bconectado\b/i).length, 0);
  });
});

function affirmative(text: string, pattern: RegExp): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    if (/\b(no|ni|sin)\b/i.test(sentence)) return false;
    return pattern.test(sentence);
  });
}
