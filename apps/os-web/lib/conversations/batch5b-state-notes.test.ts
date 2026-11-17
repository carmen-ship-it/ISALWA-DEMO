import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ATTENTION_STATES,
  type ManualCustomerConversation,
  recordManualCustomerConversation,
} from '@isalwa/os-contracts';
import {
  ATTENTION_STATE_COPY,
  ATTENTION_STATE_TONE,
  COMPOSER_COPY,
  COMPOSER_MODES,
  COMPOSER_MODE_LABELS,
  EMPTY_COMPOSER_DRAFT,
  applyNoteEdit,
  applyNoteSaveOutcome,
  attentionStateLabel,
  composerPath,
  newNoteRequestKey,
  noteSaveErrorMessage,
  stateChangeErrorMessage,
  validateNoteDraft,
} from './composer';
import { CONVERSATIONS_COPY } from './copy';
import { filterConversations, type Conversation } from './model';
import { projectManualConversation } from './project-manual';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function stored(overrides: Partial<ManualCustomerConversation> = {}): ManualCustomerConversation {
  const admitted = recordManualCustomerConversation({
    id: 'conv-1',
    organizationId: 'org-1',
    customerId: 'party-1',
    customerLabel: 'Fábrica Norte',
    channel: 'call',
    occurredAt: '2026-11-16T14:00:00.000Z',
    enteredByLabel: 'Ana',
    reason: 'Consulta',
    summary: 'Preguntó por el plazo.',
    customerQuestion: '¿Cuándo llega?',
  });
  assert.equal(admitted.ok, true);
  if (!admitted.ok) throw new Error('fixture');
  return { ...admitted.record, ...overrides };
}

const project = (overrides: Partial<ManualCustomerConversation> = {}): Conversation =>
  projectManualConversation(stored(overrides));

describe('composer modes never share a path', () => {
  it('offers exactly Mensaje and Nota interna', () => {
    assert.deepEqual(
      COMPOSER_MODES.map((mode) => COMPOSER_MODE_LABELS[mode]),
      ['Mensaje', 'Nota interna'],
    );
    assert.equal(EMPTY_COMPOSER_DRAFT.mode, 'message');
  });

  it('gives each mode its own execution path; the outbound one is unavailable', () => {
    const message = composerPath('message');
    const note = composerPath('internal_note');
    assert.notEqual(message.kind, note.kind);
    assert.equal(message.kind, 'outbound_channel');
    assert.equal(message.available, false);
    assert.equal(note.kind, 'internal_note');
    assert.equal(note.available, true);
  });

  const composer = read('components/conversations/conversation-composer.tsx');
  const messagePane = composer.slice(composer.indexOf('function MessagePane'), composer.indexOf('/** Nota interna'));
  const notePane = composer.slice(composer.indexOf('function NotePane'), composer.indexOf('export function ConversationComposer'));

  it('Mensaje is blocked and honest: pill, disabled field, disabled Enviar with no handler', () => {
    assert.match(messagePane, /messageBlockedPill/);
    assert.match(messagePane, /<textarea[\s\S]*?disabled[\s\S]*?\/>/);
    const send = messagePane.slice(messagePane.indexOf('<Button type="button" size="sm" disabled'));
    assert.match(send.slice(0, send.indexOf('</Button>')), /disabled/);
    assert.doesNotMatch(send.slice(0, send.indexOf('</Button>')), /onClick|onSubmit/);
    assert.doesNotMatch(messagePane, /<form|onSubmit|onSend|onSave|save|useState|await|fetch|Action\(/i);
    assert.equal(COMPOSER_COPY.messageBlockedPill, 'WhatsApp no conectado');
    assert.match(COMPOSER_COPY.messageBlocked, /No se puede enviar un mensaje/);
    // Nothing in the copy claims a send, a delivery or a read.
    assert.doesNotMatch(JSON.stringify(COMPOSER_COPY), /enviado|entregado|leído/i);
  });

  it('Nota interna shows Solo equipo and only ever calls the note path', () => {
    assert.match(notePane, /noteTeamOnly/);
    assert.equal(COMPOSER_COPY.noteTeamOnly, 'Solo equipo');
    assert.match(COMPOSER_COPY.noteHint, /no se envía al cliente ni por WhatsApp/);
    assert.doesNotMatch(notePane, /messageSend|Enviar/);
  });

  it('the composer component imports no server action: the workspace wires each path separately', () => {
    assert.doesNotMatch(composer, /lib\/conversations\/actions|'use server'/);
    const workspace = read('components/conversations/conversations-workspace.tsx');
    // The only write the composer can trigger is the internal note action.
    assert.match(workspace, /onSaveNote: \(\) => \{/);
    assert.match(workspace, /addConversationNoteAction\(/);
    assert.doesNotMatch(workspace, /createCustomerConversationAction|recordRecommendedReplySentAction|sendMessage|\.send\(/);
  });

  it('the note server action calls only the notes endpoint, never the conversation or a channel', () => {
    const actions = read('lib/conversations/actions.ts');
    const body = actions.slice(
      actions.indexOf('export async function addConversationNoteAction'),
      actions.indexOf('export async function searchConversationCustomerIdsAction'),
    );
    assert.match(body, /addCustomerConversationNote\(/);
    assert.doesNotMatch(body, /createCustomerConversation|recordManualCustomerConversation|take|transition|send/i);
  });
});

describe('drafts and context survive errors', () => {
  it('keeps the text and the idempotency key after a failed save, and clears only on success', () => {
    const typed = applyNoteEdit(EMPTY_COMPOSER_DRAFT, 'Cliente pide factura');
    const withKey = { ...typed, noteKey: 'note-abcdef12' };
    assert.deepEqual(applyNoteSaveOutcome(withKey, { ok: false }), withKey);
    assert.deepEqual(applyNoteSaveOutcome(withKey, { ok: true }), { ...withKey, note: '', noteKey: null });
  });

  it('an edit after a failure is a new note with a new key', () => {
    const failed = { ...EMPTY_COMPOSER_DRAFT, mode: 'internal_note' as const, note: 'Texto', noteKey: 'note-abcdef12' };
    const edited = applyNoteEdit(failed, 'Texto corregido');
    assert.equal(edited.noteKey, null);
    assert.equal(edited.note, 'Texto corregido');
    assert.equal(edited.mode, 'internal_note');
  });

  it('request keys are long enough for the server and differ per draft', () => {
    const a = newNoteRequestKey();
    const b = newNoteRequestKey();
    assert.ok(a.length >= 8);
    assert.notEqual(a, b);
  });

  it('refuses an empty or oversized note before any request', () => {
    assert.equal(validateNoteDraft('   ').ok, false);
    assert.equal(validateNoteDraft('x'.repeat(4001)).ok, false);
    assert.deepEqual(validateNoteDraft('  Hola  '), { ok: true, body: 'Hola' });
  });

  it('the workspace keeps drafts per conversation, so switching conversation or mode loses nothing', () => {
    const workspace = read('components/conversations/conversations-workspace.tsx');
    assert.match(workspace, /useState<Record<string, ComposerDraft>>/);
    assert.match(workspace, /applyNoteSaveOutcome\(current, result\)/);
    assert.match(workspace, /applyNoteEdit\(current, text\)/);
    // A failure shows the message and returns before anything is cleared.
    assert.match(workspace, /if \(!result\.ok\) \{\s*setNoteError/);
  });

  it('explains failures in actionable words', () => {
    assert.match(stateChangeErrorMessage('HOLDER_REQUIRED'), /tome la conversación/);
    assert.match(stateChangeErrorMessage('STATE_CHANGED'), /Otra persona cambió el estado/);
    assert.match(stateChangeErrorMessage('NOT_HOLDER', 'Ana'), /Ana atiende esta conversación/);
    assert.match(stateChangeErrorMessage('TRANSITION_NOT_ALLOWED'), /no está permitido/);
    assert.equal(stateChangeErrorMessage('SOMETHING_ELSE'), '');
    assert.match(noteSaveErrorMessage('REQUEST_KEY_REUSED'), /otro texto/);
    assert.equal(noteSaveErrorMessage('SOMETHING_ELSE'), '');
  });
});

describe('attention states in the inbox and thread', () => {
  it('shows the approved labels and a tone for every state', () => {
    assert.deepEqual(
      ATTENTION_STATES.map(attentionStateLabel),
      ['Nueva', 'En atención', 'Esperando al cliente', 'Esperando al equipo', 'Resuelta'],
    );
    for (const state of ATTENTION_STATES) assert.ok(ATTENTION_STATE_TONE[state]);
  });

  it('projects stored state and the automation pause; AI state stays separate and null', () => {
    const fresh = project();
    assert.equal(fresh.attentionState, 'new');
    assert.equal(fresh.automationPaused, false);
    assert.equal(fresh.aiState, null);
    const taken = project({
      attentionState: 'in_attention',
      automationPausedAt: '2026-11-16T15:00:00.000Z',
      assignedMemberId: 'member-1',
      assignedLabel: 'Ana',
      assignedAt: '2026-11-16T15:00:00.000Z',
    });
    assert.equal(taken.attentionState, 'in_attention');
    assert.equal(taken.automationPaused, true);
    assert.equal(taken.aiState, null);
    assert.match(ATTENTION_STATE_COPY.automationPaused, /Respuestas automáticas en pausa/);
    assert.match(ATTENTION_STATE_COPY.aiNotConfigured, /IA: no configurada/);
  });

  it('"Por responder" no longer lists a conversation waiting for the customer or resolved', () => {
    const rows = [
      project({ id: 'new' }),
      project({ id: 'waiting-team', attentionState: 'waiting_team' }),
      project({ id: 'waiting-customer', attentionState: 'waiting_customer' }),
      project({ id: 'resolved', attentionState: 'resolved' }),
    ];
    assert.deepEqual(
      filterConversations(rows, 'needs_response', 'member-1').map((row) => row.id),
      ['new', 'waiting-team'],
    );
  });

  it('the unassigned queue is independent of state: nobody is assigned by default', () => {
    const rows = [
      project({ id: 'new' }),
      project({ id: 'waiting-team', attentionState: 'waiting_team' }),
      project({ id: 'resolved', attentionState: 'resolved' }),
      project({
        id: 'held',
        attentionState: 'in_attention',
        assignedMemberId: 'member-2',
        assignedLabel: 'Luis',
        assignedAt: '2026-11-16T15:00:00.000Z',
      }),
    ];
    assert.deepEqual(
      filterConversations(rows, 'unassigned', 'member-1').map((row) => row.id),
      ['new', 'waiting-team', 'resolved'],
    );
    const workspace = read('components/conversations/conversations-workspace.tsx');
    assert.doesNotMatch(workspace, /useEffect\([^)]*takeConversationAction/);
    const actions = read('lib/conversations/actions.ts');
    const change = actions.slice(
      actions.indexOf('export async function changeConversationStateAction'),
      actions.indexOf('export async function listConversationNotesAction'),
    );
    // A state change never assigns anyone or touches the account owner.
    assert.doesNotMatch(change, /takeCustomerConversation|assignedMemberId|ownerMemberId|reassign/i);
  });

  it('the thread shows the state controls for stored conversations only, and the list shows the state pill', () => {
    const thread = read('components/conversations/conversation-thread.tsx');
    assert.match(thread, /attention && !conversation\.isDemo/);
    const list = read('components/conversations/conversation-list.tsx');
    assert.match(list, /if \(!conversation\.isDemo\)/);
    assert.match(list, /attentionStateLabel\(conversation\.attentionState\)/);
    const bar = read('components/conversations/conversation-attention-state.tsx');
    assert.match(bar, /allowedAttentionTargets/);
    assert.match(bar, /ATTENTION_STATE_COPY\.aiNotConfigured/);
    assert.match(bar, /role="alert"/);
  });

  it('notes are listed apart from the messages and marked Solo equipo', () => {
    const notes = read('components/conversations/conversation-notes.tsx');
    assert.match(notes, /COMPOSER_COPY\.noteTeamOnly/);
    assert.match(notes, /role="alert"/);
    const project_ = read('lib/conversations/project-manual.ts');
    assert.doesNotMatch(project_, /internalNote|InternalNote|nota interna/i, 'notes never become thread messages');
    assert.equal(CONVERSATIONS_COPY.reasonLabel, 'Motivo');
  });

  it('keeps one inbox: no /mensajes route was added', () => {
    assert.doesNotMatch(read('lib/conversations/actions.ts'), /\/mensajes/);
    assert.doesNotMatch(read('components/conversations/conversations-workspace.tsx'), /\/mensajes/);
  });
});
