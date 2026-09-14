import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_TARGETS,
  chapter,
  consejo,
  learningMode,
  regla,
  replay,
  type TourStateLabel,
} from './knowledge';

const STATE_LABELS: readonly TourStateLabel[] = [
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
];

const MAP_NAVIGATION = /\/mapa\b|abrir (el )?mapa|use el mapa/i;
const SUGERENCIA = /sugerencia/i;
const LIVE_PROVIDER_CLAIMS = /whatsapp|openai|inteligencia artificial|mapa interactivo/i;
const AI_SIGNAL = /predice|modelo|recomienda autom|inteligencia artificial|\bIA\b/i;

function step(stepId: string) {
  const found = chapter.steps.find((item) => item.stepId === stepId);
  assert.ok(found, `missing step ${stepId}`);
  return found;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

describe('knowledge chapter', () => {
  it('exports the knowledge tour and allowed targets only', () => {
    assert.equal(chapter.tourId, 'knowledge');
    assert.equal(chapter.title, 'Cómo trabajamos');
    assert.ok(chapter.steps.length >= 2);
    const ids = chapter.steps.map((item) => item.stepId);
    assert.equal(new Set(ids).size, ids.length);

    for (const item of chapter.steps) {
      assert.ok(item.stepId.length > 0);
      assert.ok(item.title.length > 0);
      assert.ok(item.body.length > 0);
      assert.ok(STATE_LABELS.includes(item.stateLabel));
      assert.ok(sentences(item.body).length <= 3, item.stepId);
      if (item.target !== undefined) {
        assert.ok(
          (ALLOWED_TARGETS as readonly string[]).includes(item.target),
          item.target,
        );
      }
    }

    assert.equal(step('ayuda').target, 'help');
    assert.equal(step('ayuda').nextRoute, '/ayuda');
    assert.equal(step('aprendizaje').target, 'learning-mode');
    assert.equal(
      chapter.steps.some((item) => item.nextRoute && item.nextRoute !== '/ayuda'),
      false,
    );
  });

  it('keeps Consejo as advice and Regla as system definition', () => {
    const consejoStep = step('consejo');
    const reglaStep = step('regla');
    const distinction = step('distincion');

    assert.equal(consejoStep.title, 'Consejo');
    assert.equal(reglaStep.title, 'Regla');
    assert.notEqual(consejoStep.body, reglaStep.body);
    assert.equal(consejo.label, 'Consejo');
    assert.equal(regla.label, 'Regla');
    assert.match(consejo.meaning, /recomendación/i);
    assert.match(regla.meaning, /definido/i);
    assert.doesNotMatch(consejo.meaning, /regla/i);
    assert.match(regla.meaning, /No es una recomendación/);
    assert.doesNotMatch(regla.meaning.replace(/No es una recomendación\.?/g, ''), /recomend/i);

    assert.match(consejoStep.body, /recomendación para trabajar mejor/);
    assert.match(consejoStep.body, /Conviene buscar/);
    assert.match(consejoStep.body, /Puede no seguirlo/);
    assert.doesNotMatch(consejoStep.body, /regla|obligaci|debe\b|no crea un pedido|no confirma un pago|no fusione/i);

    assert.match(reglaStep.body, /cómo está definido el sistema/);
    assert.match(reglaStep.body, /Aprobar registra la decisión y no crea un pedido/);
    assert.match(reglaStep.body, /Un mensaje del cliente no confirma un pago/);
    assert.doesNotMatch(reglaStep.body, /conviene|recomend|consejo|puede no seguir/i);

    assert.match(distinction.body, /es un consejo/);
    assert.match(distinction.body, /es una regla/);
    assert.match(distinction.body, /no se vuelve obligación/);
    assert.match(distinction.body, /ni la regla un tip/);
    assert.doesNotMatch([consejoStep.body, reglaStep.body, distinction.body].join('\n'), SUGERENCIA);
  });

  it('omits Sugerencia and does not own Mapa navigation', () => {
    const copy = [
      chapter.title,
      consejo.meaning,
      regla.meaning,
      learningMode.onTitle,
      learningMode.onBody,
      learningMode.offHint,
      replay.title,
      replay.pageHint,
      ...replay.tourNames,
      ...chapter.steps.flatMap((item) => [item.title, item.body, item.nextRoute ?? '']),
    ].join('\n');

    assert.doesNotMatch(copy, SUGERENCIA);
    assert.doesNotMatch(copy, MAP_NAVIGATION);
    assert.doesNotMatch(copy, LIVE_PROVIDER_CLAIMS);
    assert.equal(replay.tours.includes('map'), true);
    assert.equal(copy.includes('Mapa'), true);
  });

  it('teaches learning mode as hints that can be turned off', () => {
    assert.equal(learningMode.onTitle, 'Avisos extra');
    assert.match(learningMode.onBody, /se pueden apagar/);
    assert.match(learningMode.offHint, /reglas siguen vigentes/);
    assert.doesNotMatch(learningMode.offHint, /consejo extra se pueden apagar/);

    const mode = step('aprendizaje');
    assert.equal(mode.title, learningMode.onTitle);
    assert.match(mode.body, /se pueden apagar/);
    assert.match(mode.body, /reglas siguen vigentes/);
    assert.match(mode.body, /terminando su validación/);
    assert.equal(mode.stateLabel, 'validacion');
    assert.notEqual(mode.stateLabel, 'disponible');
  });

  it('lists replay tours as names and does not wire buttons', () => {
    assert.equal(replay.title, 'Volver a hacer el recorrido');
    assert.equal(replay.pageHint, 'Ver recorrido de esta página');
    assert.deepEqual(replay.tours, [
      'global',
      'customer',
      'commercial',
      'workforce',
      'knowledge',
      'map',
      'messages',
    ]);
    assert.equal(replay.tourNames.length, replay.tours.length);
    assert.equal('href' in replay, false);
    assert.equal('nextRoute' in replay, false);

    const again = step('volver');
    assert.equal(again.title, replay.title);
    assert.match(again.body, /Orientación, Clientes, Comercial, Equipo, Ayuda, Mapa y Mensajes/);
    assert.match(again.body, /solo están los nombres/);
    assert.match(again.body, /Ver recorrido de esta página/);
    assert.equal(again.stateLabel, 'validacion');
    assert.equal(again.nextRoute, undefined);
  });

  it('treats ¿Qué hago ahora? as a live signal, not intelligence', () => {
    const now = step('que-hago-ahora');
    assert.equal(now.title, '¿Qué hago ahora?');
    assert.equal(now.stateLabel, 'disponible');
    assert.match(now.body, /señal de lo que ya está registrado/);
    assert.match(now.body, /No es inteligencia/);
    assert.match(now.body, /no hay señal suficiente/);
    assert.match(now.body, /no inventa una llamada ni una visita/);
    assert.doesNotMatch(now.body, AI_SIGNAL);
    assert.doesNotMatch(now.body, /conviene|recomend/i);
  });

  it('keeps Vista demo from reading as a live figure', () => {
    const demo = step('vista-demo');
    assert.equal(demo.stateLabel, 'vista-demo');
    assert.match(demo.body, /no está conectado/);
    assert.match(demo.body, /No es una cifra ni un pendiente de hoy/);
    assert.doesNotMatch(demo.body, /disponible ahora/i);
  });
});
