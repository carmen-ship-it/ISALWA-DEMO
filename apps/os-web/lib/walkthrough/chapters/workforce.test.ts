import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chapter, type TourStateLabel } from './workforce';

const ALLOWED_TARGETS = new Set(['work-list', 'team', 'invite-employee']);
const ALLOWED_LABELS = new Set<TourStateLabel>([
  'disponible',
  'manual',
  'parcial',
  'preparacion',
  'proximamente',
  'vista-demo',
  'validacion',
]);

const copy = chapter.steps.map((step) => `${step.title}. ${step.body}`).join(' ');

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

describe('workforce walkthrough chapter', () => {
  it('uses the workforce contract', () => {
    assert.equal(chapter.tourId, 'workforce');
    assert.equal(chapter.title.length > 0, true);
    assert.equal(chapter.steps.length > 0, true);

    const ids = chapter.steps.map((step) => step.stepId);
    assert.equal(new Set(ids).size, ids.length);

    for (const step of chapter.steps) {
      assert.match(step.stepId, /^[a-z0-9-]+$/);
      assert.equal(step.title.trim().length > 0, true);
      assert.equal(step.body.trim().length > 0, true);
      assert.equal(ALLOWED_LABELS.has(step.stateLabel), true);
      if (step.target) assert.equal(ALLOWED_TARGETS.has(step.target), true);
      if (step.nextRoute) assert.match(step.nextRoute, /^\//);
      const sentenceCount = sentences(step.body).length;
      assert.equal(sentenceCount >= 1 && sentenceCount <= 3, true, step.stepId);
    }
  });

  it('teaches only the Trabajo views this screen has', () => {
    assert.match(copy, /Míos/);
    assert.match(copy, /Equipo/);
    assert.match(copy, /Empresa/);
    assert.match(copy, /solo lectura/);
    assert.match(copy, /Vencidos/);
    assert.match(copy, /No manda recordatorios ni escala el tema/);
    assert.match(copy, /la escalación no está activa/);
    assert.doesNotMatch(copy, /escalación está activa|escala automáticamente|motor de escalaci|recordatorio automático/i);

    for (const sentence of sentences(copy)) {
      if (/recordatorio/i.test(sentence)) {
        assert.match(sentence, /\bno\b/i, sentence);
      }
      if (/escala/i.test(sentence) && !/escalación no está activa/i.test(sentence)) {
        assert.match(sentence, /\bno\b/i, sentence);
      }
    }
  });

  it('does not say cargo grants access or that accounts should be shared', () => {
    assert.match(copy, /El cargo no abre pantallas ni acciones/);
    assert.match(copy, /no se deduce del cargo/);
    assert.match(copy, /No compartan una cuenta/);
    assert.match(copy, /queda a nombre de quien lo hizo/);
    assert.match(copy, /Ver una lista no es poder editarla/);
    assert.match(copy, /no le deja cambiarlo/);

    for (const sentence of sentences(copy)) {
      if (/cargo/i.test(sentence) && /(otorga|concede|autoriza|abre|da acceso)/i.test(sentence)) {
        assert.match(sentence, /\bno\b/i, sentence);
      }
      if (/compart/i.test(sentence) && /cuenta/i.test(sentence)) {
        assert.match(sentence, /\bno\b/i, sentence);
      }
    }

    assert.doesNotMatch(copy, /el cargo (sí )?(otorga|concede|da|abre) el acceso/i);
    assert.doesNotMatch(copy, /deben compartir|compartan la misma cuenta|una sola cuenta para/i);
  });

  it('teaches invite lifecycle and a password Carmen must not know', () => {
    assert.match(copy, /Invitar empleado/);
    assert.match(copy, /Invitación enviada/);
    assert.match(copy, /Activo/);
    assert.match(copy, /Suspender acceso/);
    assert.match(copy, /Reactivar acceso/);
    assert.match(copy, /Finalizar relación/);
    assert.match(copy, /no es un recontrato/);
    assert.match(copy, /ISALWA no la guarda/);
    assert.match(copy, /Carmen no debe conocerla/);
    assert.match(copy, /crea su contraseña en el correo de acceso/);
    assert.doesNotMatch(copy, /proveedor de acceso|supabase|workos|authidentity|jwt/i);
    assert.doesNotMatch(copy, /invente una contraseña|contraseña compartida|Carmen (debe |puede )?conocer la contraseña/i);
  });
});
