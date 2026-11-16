import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ATTENTION_CHANNELS } from '@isalwa/os-contracts';
import { CONVERSATIONS_COPY } from './copy';
import {
  ATTENTION_CHANNEL_LABELS,
  MANUAL_CONVERSATION_COPY,
  MANUAL_CONVERSATION_ERRORS,
  admitManualConversation,
  nextStepFailureMessage,
  type ManualConversationDraft,
} from './manual-conversation';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function draft(overrides: Partial<ManualConversationDraft> = {}): ManualConversationDraft {
  return {
    id: 'conv-b5-1',
    organizationId: 'org-1',
    customerId: 'party-1',
    customerLabel: 'Fábrica Norte',
    contactLabel: 'Luis',
    channel: 'call',
    occurredAt: '2026-11-16T14:00:00.000Z',
    enteredByMemberId: 'member-1',
    enteredByLabel: 'Ana',
    summary: 'Preguntó por el plazo.',
    reason: 'Consulta de plazo',
    pastedEvidence: '',
    opportunityId: '',
    quoteId: '',
    orderId: '',
    customerQuestion: '',
    commitmentCandidate: '',
    possibleRequestedDate: '',
    nextAction: '',
    ...overrides,
  };
}

describe('Registrar atención form model', () => {
  it('offers Llamada, Visita, Atención presencial and Registro manual de WhatsApp', () => {
    assert.deepEqual(
      ATTENTION_CHANNELS.map((channel) => ATTENTION_CHANNEL_LABELS[channel]),
      ['Llamada', 'Visita', 'Atención presencial', 'Registro manual de WhatsApp'],
    );
    assert.equal(MANUAL_CONVERSATION_COPY.title, 'Registrar atención');
    assert.equal(CONVERSATIONS_COPY.register, 'Registrar atención');
    assert.equal(MANUAL_CONVERSATION_COPY.submit, 'Guardar atención');
    assert.match(MANUAL_CONVERSATION_COPY.recorded, /^Atención guardada/);
  });

  it('stores each channel under its own value and never connects WhatsApp', () => {
    for (const channel of ATTENTION_CHANNELS) {
      const admitted = admitManualConversation(draft({ channel }));
      assert.equal(admitted.ok, true, channel);
      if (!admitted.ok) continue;
      assert.equal(admitted.record.channel, channel);
      assert.equal(admitted.record.providerConnected, false);
      assert.equal(admitted.record.providerCalled, false);
    }
  });

  it('refuses a missing reason or note, on every channel', () => {
    for (const channel of ATTENTION_CHANNELS) {
      assert.deepEqual(admitManualConversation(draft({ channel, reason: '  ' })), {
        ok: false,
        reason: 'missing_reason',
      });
      assert.deepEqual(admitManualConversation(draft({ channel, summary: '' })), {
        ok: false,
        reason: 'missing_summary',
      });
    }
    assert.match(MANUAL_CONVERSATION_ERRORS.missing_reason, /motivo/i);
    assert.match(MANUAL_CONVERSATION_ERRORS.missing_summary, /nota/i);
  });

  it('carries the optional next step (what, who, when) and never assigns anyone by default', () => {
    const step = { description: 'Enviar plazos', ownerMemberId: 'member-9', dueDate: '2026-11-20' };
    const withStep = admitManualConversation(draft({ nextStep: step }));
    assert.equal(withStep.ok, true);
    if (!withStep.ok) return;
    assert.deepEqual(withStep.record.nextStep, step);
    assert.equal(withStep.record.nextAction, 'Enviar plazos');
    assert.equal(withStep.record.assignedMemberId, null);
    assert.equal(withStep.record.nextStepCommitmentId, null);

    const without = admitManualConversation(draft());
    assert.equal(without.ok && without.record.nextStep, null);
    // A step missing its owner or date is refused rather than half-saved.
    const half = admitManualConversation(
      draft({ nextStep: { description: 'Enviar plazos', ownerMemberId: '', dueDate: '2026-11-20' } }),
    );
    assert.deepEqual(half, { ok: false, reason: 'invalid_next_step' });
  });

  it('says honestly why a next step failed, never as a success', () => {
    assert.match(nextStepFailureMessage('VALIDATION_FAILED'), /responsable no está activa/);
    assert.match(nextStepFailureMessage('PERMISSION_DENIED'), /permiso/);
    assert.match(nextStepFailureMessage('anything-else'), /No se pudo crear el compromiso/);
    assert.match(MANUAL_CONVERSATION_COPY.partialTitle, /guardada, pero el siguiente paso no se creó/);
  });
});

describe('Registrar atención panel', () => {
  const panel = read('components/conversations/manual-conversation-panel.tsx');

  it('collects customer, contact, channel, date/time, reason, note and an optional next step', () => {
    assert.match(panel, /ServerPartyTypeahead/);
    assert.match(panel, /ATTENTION_CHANNELS\.map/);
    assert.match(panel, /name="occurredAt"[\s\S]*type="datetime-local"|type="datetime-local"[\s\S]*name="occurredAt"/);
    assert.match(panel, /id="conversation-reason"[\s\S]*required/);
    assert.match(panel, /id="conversation-summary"[\s\S]*required|name="summary"[\s\S]*required/);
    assert.match(panel, /ServerMemberTypeahead[\s\S]*name="nextStepOwner"/);
    assert.match(panel, /name="nextStepDate"/);
  });

  it('does not preselect a responsible member, including the signed-in one', () => {
    assert.doesNotMatch(panel, /defaultMemberId/);
    assert.doesNotMatch(panel, /actor\.memberId[^\n]*nextStep|nextStepOwner[^\n]*actor/);
  });

  it('clears the form after any save so the attention cannot be saved twice, and keeps the retry', () => {
    assert.match(panel, /retryConversationNextStepAction/);
    assert.match(panel, /partialRetry/);
    assert.match(panel, /pendingStep/);
    assert.match(panel, /role="alert"/);
    assert.match(panel, /outcome|partial: persisted\.nextStep\.status === 'failed'/);
  });
});

describe('Conversaciones composer honesty', () => {
  const thread = read('components/conversations/conversation-thread.tsx');

  it('renders no Enviar and keeps "WhatsApp no conectado" with manual attention available', () => {
    assert.equal(CONVERSATIONS_COPY.whatsappNotConnected, 'WhatsApp no conectado');
    assert.match(thread, /whatsappNotConnected/);
    assert.match(thread, /onRegister/);
    assert.doesNotMatch(thread, /Enviar|<textarea|onSend|send\(/);
    assert.doesNotMatch(JSON.stringify(CONVERSATIONS_COPY), /Enviar/);
  });

  it('offers Tomar conversación only while unassigned and surfaces a lost claim', () => {
    assert.match(thread, /canTake && onTake/);
    assert.match(thread, /conversation\.assignedMemberId \?/);
    assert.match(thread, /takeError/);
    assert.equal(CONVERSATIONS_COPY.take, 'Tomar conversación');
    assert.match(MANUAL_CONVERSATION_COPY.alreadyTaken, /Otra persona ya tomó/);
  });
});

describe('Inbox search and take wiring', () => {
  const list = read('components/conversations/conversation-list.tsx');
  const workspace = read('components/conversations/conversations-workspace.tsx');
  const actions = read('lib/conversations/actions.ts');

  it('uses the shared SearchField with the approved placeholder, wired to the list', () => {
    assert.equal(CONVERSATIONS_COPY.searchPlaceholder, 'Buscar cliente, teléfono o conversación');
    assert.match(list, /SearchField/);
    assert.match(list, /searchPlaceholder/);
    assert.match(workspace, /searchInbox\(/);
    assert.match(workspace, /params\.set\('q'/);
    assert.match(workspace, /filterConversations\(searched, filter, actor\?\.memberId/);
  });

  it('keeps selection in the URL and scroll per filter', () => {
    assert.match(workspace, /params\.set\('c'/);
    assert.match(workspace, /scrollMemory/);
    assert.match(list, /scrollMemory\.current\[filter\]/);
  });

  it('resolves a phone through the authorized customer search, not from conversation rows', () => {
    assert.match(actions, /searchConversationCustomerIdsAction/);
    assert.match(actions, /searchParties/);
    assert.doesNotMatch(read('lib/conversations/project-manual.ts'), /phone/i);
  });

  it('takes through the server command only, and never reassigns the account', () => {
    assert.match(actions, /takeCustomerConversation/);
    assert.doesNotMatch(actions, /ownerMemberId|reassign|ReassignCustomer/i);
    assert.match(workspace, /!item\.assignedMemberId/);
  });
});
