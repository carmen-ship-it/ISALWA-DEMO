import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { chapter, type TourStateLabel } from './customer';

const ALLOWED_TARGETS = new Set([
  'customer-row',
  'customer-quick-view',
  'location-state',
  'customer-360',
]);

const STATE_LABELS = new Set<TourStateLabel>([
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
]);

const LIVE_LABELS = new Set<TourStateLabel>(['disponible', 'manual', 'parcial']);

const FUTURE_MODULE = /compromisos|evidencia|escalamiento/i;

function text(step: { title: string; body: string }): string {
  return `${step.title} ${step.body}`;
}

describe('customer walkthrough chapter', () => {
  it('exports the customer chapter contract', () => {
    assert.equal(chapter.tourId, 'customer');
    assert.equal(chapter.title, 'Clientes');
    assert.ok(chapter.steps.length >= 8);
    const ids = chapter.steps.map((step) => step.stepId);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('uses only allowed targets and known state labels', () => {
    for (const step of chapter.steps) {
      assert.equal(step.title.trim().length > 0, true);
      assert.equal(step.body.trim().length > 0, true);
      assert.equal(STATE_LABELS.has(step.stateLabel), true);
      if (step.target !== undefined) {
        assert.equal(ALLOWED_TARGETS.has(step.target), true, step.target);
      }
    }
  });

  it('keeps coordinates distinct from a Maps provenance link', () => {
    const step = chapter.steps.find((item) => item.stepId === 'customer-location');
    assert.ok(step);
    assert.equal(step.target, 'location-state');
    assert.equal(step.stateLabel, 'disponible');
    assert.match(step.body, /coordenadas/i);
    assert.match(step.body, /Maps/);
    assert.match(step.body, /procedencia/i);
    assert.match(step.body, /No es lo mismo/);
    assert.doesNotMatch(step.body, /coordenadas son (un enlace|el enlace|Maps)/i);
    assert.doesNotMatch(step.body, /Maps es la ubicación/i);
    assert.doesNotMatch(step.body, /enlace de Maps es la ubicación/i);
  });

  it('does not call future modules live', () => {
    const source = readFileSync(new URL('./customer.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from ['"]@\/lib\/(commitments|evidence|escalation|ai)\//);
    assert.doesNotMatch(source, /from ['"]@isalwa\/os-contracts['"]/);

    const later = chapter.steps.find((step) => step.stepId === 'customer-later');
    assert.ok(later);
    assert.equal(later.stateLabel, 'proximamente');
    assert.match(later.title, /Más adelante/);
    assert.match(later.body, /Más adelante/);
    assert.match(later.body, /no están/i);
    assert.match(later.body, FUTURE_MODULE);

    for (const step of chapter.steps) {
      if (!LIVE_LABELS.has(step.stateLabel)) continue;
      assert.doesNotMatch(text(step), FUTURE_MODULE, step.stepId);
      assert.doesNotMatch(text(step), /ya puede|está disponible|disponible ahora/i);
    }
  });

  it('teaches the live customer path without counts, phones, or an invented mind', () => {
    const joined = chapter.steps.map(text).join('\n');
    assert.match(joined, /pulse Buscar/);
    assert.match(joined, /Filtre por relación/);
    assert.match(joined, /Activo, Inactivo o Fusionado/);
    assert.match(joined, /solo si hay uno asignado/);
    assert.match(joined, /Vista rápida/);
    assert.match(joined, /buscar primero/i);
    assert.match(joined, /no fusiona registros/i);
    assert.match(joined, /se reúne la relación/);
    assert.match(joined, /seguimiento guardado/);
    assert.match(joined, /registro principal por fusión/);
    assert.match(joined, /asignar responsable/);
    assert.match(joined, /no hay señal suficiente/i);

    assert.doesNotMatch(joined, /\+?\d[\d\s().-]{6,}\d/);
    assert.doesNotMatch(joined, /\b\d+\s+clientes?\b/i);
    assert.doesNotMatch(joined, /\b\d+\s*\/\s*\d+\b/);
    assert.doesNotMatch(joined, /\b(IA|inteligencia artificial|OpenAI|modelo|predice|adivina)\b/i);
  });
});
