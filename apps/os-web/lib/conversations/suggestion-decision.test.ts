import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recordManualCustomerConversation } from '@isalwa/os-contracts';
import {
  buildIgnoreSuggestionAdmissionInput,
  ignoredSuggestionIdsFromRecords,
  isSuggestionDecisionRecord,
  parseSuggestionIgnoredDecision,
  suggestionDecisionNextAction,
} from './suggestion-decision';
import { suggestionPrimaryActionHref } from './suggestion-routing';
import type { Conversation } from './model';
import type { ConversationSuggestion } from './suggestion-types';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('durable suggestion ignore', () => {
  it('builds company evidence with actor, tenant, suggestion id, and ignored decision', () => {
    const { draft, decision } = buildIgnoreSuggestionAdmissionInput({
      id: 'dec-1',
      organizationId: 'org-1',
      customerId: 'pty-1',
      customerLabel: 'Cliente',
      sourceConversationId: 'conv-1',
      suggestion: {
        id: 'demo-opportunity-qty-20',
        type: 'possible_opportunity',
        explanation: 'posible oportunidad',
      },
      enteredByMemberId: 'mem-1',
      enteredByLabel: 'Carmen',
      occurredAt: '2026-09-17T18:00:00.000Z',
    });

    assert.equal(decision.decision, 'ignored');
    assert.equal(decision.sourceConversationId, 'conv-1');
    assert.equal(decision.suggestionId, 'demo-opportunity-qty-20');
    assert.equal(decision.actorMemberId, 'mem-1');
    assert.equal(decision.organizationId, 'org-1');
    assert.equal(decision.provenance, 'company_entered');
    assert.equal(
      draft.nextAction,
      suggestionDecisionNextAction('conv-1', 'demo-opportunity-qty-20'),
    );

    const admitted = recordManualCustomerConversation(draft);
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.canonicalMutation, 'refused');
    assert.equal(admitted.record.commitmentCreated, false);
    assert.equal(admitted.record.linkedRecordMutated, false);
    assert.equal(isSuggestionDecisionRecord(admitted.record), true);

    const parsed = parseSuggestionIgnoredDecision(admitted.record);
    assert.ok(parsed);
    assert.equal(parsed?.suggestionId, 'demo-opportunity-qty-20');
    assert.equal(parsed?.actorMemberId, 'mem-1');
    assert.equal(parsed?.decidedAt, '2026-09-17T18:00:00.000Z');

    const ignored = ignoredSuggestionIdsFromRecords([admitted.record], 'conv-1');
    assert.deepEqual([...ignored], ['demo-opportunity-qty-20']);
    assert.equal(ignoredSuggestionIdsFromRecords([admitted.record], 'other').size, 0);
  });

  it('ignore action and panel use durable server path (not session-only)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const actions = readFileSync(resolve(here, './actions.ts'), 'utf8');
    const panel = readFileSync(
      resolve(here, '../../components/conversations/conversation-context-panel.tsx'),
      'utf8',
    );
    assert.match(actions, /ignoreConversationSuggestionAction/);
    assert.match(actions, /buildIgnoreSuggestionAdmissionInput/);
    assert.match(actions, /assertRolePreviewAllowsMutation/);
    assert.match(panel, /ignoreConversationSuggestionAction/);
    assert.match(panel, /durableIgnoredSuggestionIds/);
    assert.match(panel, /Review navigates only/);
  });

  it('review routing never mutates domain — href only', () => {
    const conversation = {
      id: 'conv-1',
      partyId: 'pty_real_1',
      partyLabel: 'Cliente',
      contactLabel: null,
      channel: 'manual',
      preview: 'hola',
      messages: [],
      related: {},
      attention: {},
      isDemo: false,
      lastOccurredAt: '2026-09-17T12:00:00.000Z',
    } as unknown as Conversation;
    const suggestion = {
      id: 'sug-1',
      type: 'possible_opportunity',
      explanation: 'x',
      snippet: 'y',
      signal: 'possible',
      relatedLabel: null,
      detected: [],
      unknown: [],
      primaryActionLabel: 'Revisar',
      isDemo: false,
    } satisfies ConversationSuggestion;
    assert.equal(
      suggestionPrimaryActionHref(suggestion, conversation),
      '/clientes/pty_real_1/oportunidades/nueva',
    );
  });
});
