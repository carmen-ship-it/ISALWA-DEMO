import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TRUTH_LEVEL } from './evidence';
import {
  CONVERSATION_MESSAGE_DIRECTION,
  listUnconfirmedCustomerQuestions,
  readUnconfirmedCustomerQuestions,
  UNCONFIRMED_QUESTION_SCOPE,
  type NormalizedConversationMessage,
  type TrustedEvidenceSession,
} from './conversation-evidence';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_TEXT = 'ZetaOtherName?';
const SESSION_TEXT = 'AlphaSessionName?';
const OTHER_COUNT = 7;

function message(id: string, organizationId: string, text: string): NormalizedConversationMessage {
  return {
    id,
    organizationId,
    conversationId: 'conv-fixture',
    channel: 'whatsapp',
    direction: CONVERSATION_MESSAGE_DIRECTION,
    occurredAt: '2026-01-02T00:00:00.000Z',
    phoneKey: '',
    text,
    truthLevel: TRUTH_LEVEL.normalizedMessage,
    providerMessageId: null,
  };
}

function session(scopes: readonly string[]): TrustedEvidenceSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function mixed(): NormalizedConversationMessage[] {
  return [
    message('q-alpha', SESSION, SESSION_TEXT),
    message('q-zeta', OTHER, OTHER_TEXT),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      message(`q-zeta-${String.fromCharCode(97 + index)}`, OTHER, OTHER_TEXT),
    ),
  ];
}

function assertNoOtherText(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_TEXT), false);
  assert.equal(serialized.includes('Zeta'), false);
  assert.equal(serialized.includes('q-zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('listUnconfirmedCustomerQuestions tenant scope', () => {
  it('listUnconfirmedCustomerQuestions same-tenant question text is allowed', () => {
    const questions = listUnconfirmedCustomerQuestions(mixed(), session([UNCONFIRMED_QUESTION_SCOPE]));
    assert.equal(questions.length, 1);
    assert.equal(questions[0]?.text, SESSION_TEXT);
    assert.equal(questions[0]?.messageId, 'q-alpha');
    assertNoOtherText(JSON.stringify(questions));
  });

  it('listUnconfirmedCustomerQuestions same-tenant wrong role returns no question text', () => {
    const read = readUnconfirmedCustomerQuestions(mixed(), session(['people.admin']));
    const questions = listUnconfirmedCustomerQuestions(mixed(), session(['people.admin']));
    assert.equal(read.code, 'ROLE_FORBIDDEN');
    assert.deepEqual(questions, []);
    assert.equal(read.count, 0);
    assertNoOtherText(JSON.stringify(questions));
    assertNoOtherText(JSON.stringify(read));
  });

  it('listUnconfirmedCustomerQuestions does not return another tenant question text', () => {
    const questions = listUnconfirmedCustomerQuestions(
      [message('q-zeta', OTHER, OTHER_TEXT)],
      session([UNCONFIRMED_QUESTION_SCOPE]),
    );
    assert.deepEqual(questions, []);
    assertNoOtherText(JSON.stringify(questions));
  });

  it('listUnconfirmedCustomerQuestions missing session returns no question text', () => {
    const read = readUnconfirmedCustomerQuestions(mixed(), null);
    const questions = listUnconfirmedCustomerQuestions(mixed());
    assert.equal(read.code, 'AUTH_REQUIRED');
    assert.deepEqual(questions, []);
    assert.equal(read.count, 0);
    assertNoOtherText(JSON.stringify(questions));
    assertNoOtherText(JSON.stringify(read));
  });

  it('listUnconfirmedCustomerQuestions prefix of another tenant question is absent', () => {
    const questions = listUnconfirmedCustomerQuestions(mixed(), session([UNCONFIRMED_QUESTION_SCOPE]));
    const serialized = JSON.stringify(questions);
    assert.equal(serialized.includes('Zeta'), false);
    assert.equal(serialized.includes(OTHER_TEXT.slice(0, 4)), false);
    assertNoOtherText(serialized);
  });

  it('listUnconfirmedCustomerQuestions count of another tenant questions is not returned', () => {
    const read = readUnconfirmedCustomerQuestions(
      Array.from({ length: OTHER_COUNT }, (_, index) =>
        message(`q-zeta-${String.fromCharCode(97 + index)}`, OTHER, OTHER_TEXT),
      ),
      session([UNCONFIRMED_QUESTION_SCOPE]),
    );
    const questions = listUnconfirmedCustomerQuestions(
      Array.from({ length: OTHER_COUNT }, (_, index) =>
        message(`q-zeta-${String.fromCharCode(97 + index)}`, OTHER, OTHER_TEXT),
      ),
      session([UNCONFIRMED_QUESTION_SCOPE]),
    );
    assert.equal(questions.length, 0);
    assert.equal(read.count, 0);
    assert.notEqual(read.count, OTHER_COUNT);
    assert.notEqual(questions.length, OTHER_COUNT);
    assertNoOtherText(JSON.stringify(read));
  });
});
