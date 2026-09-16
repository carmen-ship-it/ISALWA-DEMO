import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AI_ASSIST_SURFACES,
  AI_FREE_TEXT_MAX_CHARS,
  AI_SUGGESTED_PROMPTS,
  isAiAssistSurface,
  normalizeAiFreeTextQuestion,
  suggestedPromptsForSurface,
} from './suggested-prompts';

describe('AI suggested prompts', () => {
  it('exposes fixed catalogs per surface', () => {
    assert.deepEqual(AI_ASSIST_SURFACES, ['issue', 'cliente360', 'commitment']);
    assert.deepEqual(suggestedPromptsForSurface('issue'), [
      'Resumir esta incidencia',
      '¿Qué se intentó?',
      'Mostrar antecedentes relacionados',
      'Sugerir próximos pasos',
    ]);
    assert.deepEqual(suggestedPromptsForSurface('cliente360'), [
      'Resumir este cliente',
      '¿Qué está pendiente?',
      '¿Qué compromisos existen?',
      '¿Qué cambió recientemente?',
    ]);
    assert.deepEqual(suggestedPromptsForSurface('commitment'), [
      'Resumir compromisos',
      '¿Qué está vencido?',
      '¿Quién debe dar seguimiento?',
    ]);
  });

  it('keeps catalogs disjoint by surface identity', () => {
    assert.equal(isAiAssistSurface('issue'), true);
    assert.equal(isAiAssistSurface('party'), false);
    assert.notDeepEqual(AI_SUGGESTED_PROMPTS.issue, AI_SUGGESTED_PROMPTS.cliente360);
    assert.notDeepEqual(AI_SUGGESTED_PROMPTS.cliente360, AI_SUGGESTED_PROMPTS.commitment);
  });

  it('bounds free-text phrasing without inventing selectors', () => {
    assert.equal(normalizeAiFreeTextQuestion('  hola  '), 'hola');
    assert.equal(normalizeAiFreeTextQuestion(''), undefined);
    assert.equal(normalizeAiFreeTextQuestion('   '), undefined);
    assert.equal(normalizeAiFreeTextQuestion(null), undefined);
    const long = 'x'.repeat(AI_FREE_TEXT_MAX_CHARS + 40);
    assert.equal(normalizeAiFreeTextQuestion(long)?.length, AI_FREE_TEXT_MAX_CHARS);
  });
});
