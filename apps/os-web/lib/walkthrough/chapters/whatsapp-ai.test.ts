import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapter } from './whatsapp-ai';

const PAYMENT_SENTENCE = 'El cliente dijo que pagó no es un pago confirmado.';
const FUTURE_PREFIX = /Próximamente|Cuando conectemos/;
const LIVE_PROVIDER_OR_REVIEW = /whatsapp|openai|evidence review|revisi[oó]n de evidencia/i;
const STATE_LABELS = [
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
] as const;

const FUTURE_CAPABILITIES = [
  'conversaciones con clientes',
  'tiempo de espera',
  'preguntas sin responder',
  'frustración',
  'urgencia',
  'borradores de respuesta',
  'resúmenes',
  'preparación de una llamada',
  'qué cambió',
  'próximos pasos sugeridos',
  'guardar un compromiso',
  'escalamiento',
  'inteligencia para la dirección',
  'revisión de evidencia',
] as const;

describe('whatsapp-ai walkthrough chapter', () => {
  it('exports the messages chapter contract', () => {
    assert.equal(chapter.tourId, 'messages');
    assert.equal(chapter.title, 'Mensajes, todavía no');
    assert.ok(chapter.steps.length >= 4);

    const stepIds = chapter.steps.map((step) => step.stepId);
    assert.equal(new Set(stepIds).size, stepIds.length);

    for (const step of chapter.steps) {
      assert.match(step.stepId, /^[a-z0-9-]+$/);
      assert.ok(step.title.trim().length > 0);
      assert.ok(step.body.trim().length > 0);
      assert.ok(STATE_LABELS.includes(step.stateLabel));
      if (step.target !== undefined) {
        assert.equal(step.target, 'messages-future');
      }
    }
  });

  it('keeps the payment sentence as a present truth', () => {
    const matches = chapter.steps.filter((step) => step.body.includes(PAYMENT_SENTENCE));
    assert.equal(matches.length, 1);
    const step = matches[0];
    assert.equal(step.stateLabel, 'disponible');
    assert.equal(FUTURE_PREFIX.test(`${step.title}\n${step.body}`), false);
    assert.match(step.body, /Origen = de dónde salió/);
    assert.match(step.body, /Confianza = qué tan bien lo entendimos/);
    assert.match(step.body, /Confirmación = si la empresa lo acepta/);
  });

  it('does not describe WhatsApp, OpenAI, or evidence review as disponible', () => {
    const disponible = chapter.steps.filter((step) => step.stateLabel === 'disponible');
    assert.ok(disponible.length >= 1);

    for (const step of disponible) {
      const copy = `${step.title}\n${step.body}`;
      assert.equal(LIVE_PROVIDER_OR_REVIEW.test(copy), false, step.stepId);
    }
  });

  it('prefixes future capabilities so they cannot be read as live', () => {
    const joined = chapter.steps.map((step) => `${step.title}\n${step.body}`).join('\n');
    assert.match(joined, /dice Próximamente/);
    assert.match(joined, /WhatsApp no está conectado/);
    assert.match(joined, /OpenAI no está conectado/);
    assert.match(joined, /esa revisión no está en una página/);
    assert.match(joined, /ayudar a entender y preparar/);
    assert.match(joined, /No podrá aprobar, confirmar pagos, cambiar precios ni tomar decisiones delicadas/);
    assert.match(joined, /El escalamiento no cambia al responsable automáticamente/);

    for (const phrase of FUTURE_CAPABILITIES) {
      const step = chapter.steps.find((item) => `${item.title}\n${item.body}`.includes(phrase));
      assert.ok(step, phrase);
      assert.notEqual(step.stateLabel, 'disponible', phrase);
      assert.match(`${step.title}\n${step.body}`, FUTURE_PREFIX, phrase);
    }

    for (const step of chapter.steps.filter((item) => item.stateLabel === 'proximamente')) {
      assert.match(`${step.title}\n${step.body}`, FUTURE_PREFIX, step.stepId);
    }
  });
});
