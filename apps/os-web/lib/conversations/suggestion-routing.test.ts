import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Conversation } from './model';
import { suggestionPrimaryActionHref } from './suggestion-routing';
import type { ConversationSuggestion } from './suggestion-types';

function baseConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    partyId: 'pty_real_1',
    partyLabel: 'Cliente Demo',
    contactLabel: 'Ana',
    channel: 'manual',
    preview: 'Hola',
    messages: [],
    related: {},
    attention: {},
    isDemo: false,
    lastOccurredAt: '2026-09-16T12:00:00.000Z',
    ...overrides,
  } as Conversation;
}

function suggestion(
  type: ConversationSuggestion['type'],
  overrides: Partial<ConversationSuggestion> = {},
): ConversationSuggestion {
  return {
    id: 'sug-1',
    type,
    explanation: 'test',
    snippet: 'snippet',
    signal: 'possible',
    relatedLabel: null,
    detected: [],
    unknown: [],
    primaryActionLabel: 'Revisar',
    isDemo: false,
    ...overrides,
  };
}

describe('suggestionPrimaryActionHref', () => {
  it('routes possible_opportunity to nueva oportunidad', () => {
    const href = suggestionPrimaryActionHref(
      suggestion('possible_opportunity'),
      baseConversation(),
    );
    assert.equal(href, '/clientes/pty_real_1/oportunidades/nueva');
  });

  it('routes possible_issue to reportar incidencia with party context', () => {
    const href = suggestionPrimaryActionHref(suggestion('possible_issue'), baseConversation());
    assert.match(href, /\/incidencias\/reportar\?/);
    assert.match(href, /issueRefType=party/);
    assert.match(href, /issueRefId=pty_real_1/);
  });
});
