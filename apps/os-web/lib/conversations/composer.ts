/**
 * Composer modes and attention-state presentation for /conversaciones (Batch 5B).
 *
 * "Mensaje" and "Nota interna" are two different execution paths and never share one:
 * - Mensaje targets the outbound channel (WhatsApp). It is not connected, so it is blocked and
 *   says so. There is no handler, no action and no fake success behind it.
 * - Nota interna writes a team-only note through its own server action. It never goes to a channel.
 */

import { CONVERSATIONS_COPY } from './copy';
import {
  ATTENTION_STATE_LABELS,
  INTERNAL_NOTE_LABEL,
  INTERNAL_NOTE_MAX_LENGTH,
  conversationChannelIsConnected,
  type AttentionState,
} from '@isalwa/os-contracts';

export const COMPOSER_MODES = ['message', 'internal_note'] as const;
export type ComposerMode = (typeof COMPOSER_MODES)[number];

export const COMPOSER_MODE_LABELS: Record<ComposerMode, string> = {
  message: 'Mensaje',
  internal_note: 'Nota interna',
};

export type ComposerPath =
  | { kind: 'outbound_channel'; available: false; reason: 'whatsapp_not_connected' }
  | { kind: 'internal_note'; available: true };

/**
 * The single execution path of a mode. The two kinds never coincide, and the outbound one
 * is unavailable while the channel is not connected (no adapter exists).
 */
export function composerPath(mode: ComposerMode): ComposerPath {
  if (mode === 'internal_note') return { kind: 'internal_note', available: true };
  // conversationChannelIsConnected is the contract's `false`: nothing is connected.
  void conversationChannelIsConnected('whatsapp');
  return { kind: 'outbound_channel', available: false, reason: 'whatsapp_not_connected' };
}

export const COMPOSER_COPY = {
  label: 'Redactar',
  modesLabel: 'Tipo de entrada',
  messageBlockedPill: CONVERSATIONS_COPY.whatsappNotConnected,
  messageBlocked: CONVERSATIONS_COPY.composerNotice,
  messagePlaceholder: 'Enviar mensajes no está disponible: WhatsApp no está conectado.',
  messageSend: 'Enviar',
  noteTeamOnly: INTERNAL_NOTE_LABEL,
  noteHint: 'Solo equipo. La nota no se envía al cliente ni por WhatsApp.',
  notePlaceholder: 'Escriba una nota para el equipo…',
  noteFieldLabel: 'Nota interna',
  noteSave: 'Guardar nota',
  noteSaving: 'Guardando…',
  noteSaved: 'Nota guardada. Solo equipo.',
  noteDraftKept: 'Su texto sigue aquí; no se perdió. Puede volver a intentarlo.',
  noteUnavailable:
    'Las notas internas se guardan en conversaciones registradas, con la sesión de la empresa.',
  noteTooLong: `La nota puede tener hasta ${INTERNAL_NOTE_MAX_LENGTH} caracteres.`,
  noteEmpty: 'Escriba la nota antes de guardarla.',
  notesTitle: 'Notas internas',
  notesEmpty: 'Todavía no hay notas internas.',
  notesLoading: 'Cargando notas…',
  notesLoadError: 'No se pudieron cargar las notas internas.',
  notesRetry: 'Reintentar',
} as const;

export const ATTENTION_STATE_COPY = {
  label: 'Estado de atención',
  change: 'Cambiar estado a',
  changing: 'Guardando…',
  aiNotConfigured: 'IA: no configurada',
  automationPaused: 'Respuestas automáticas en pausa: una persona tomó la conversación.',
  automationNotPaused: 'Sin respuestas automáticas: no hay automatización conectada.',
  needsHolder: 'Para pasar a En atención, primero tome la conversación.',
} as const;

export type AttentionTone = 'amber' | 'sky' | 'soft-teal' | 'neutral';

/** Calm tones from the existing `StatusPill`; no new colors. */
export const ATTENTION_STATE_TONE: Record<AttentionState, AttentionTone> = {
  new: 'amber',
  in_attention: 'soft-teal',
  waiting_customer: 'sky',
  waiting_team: 'amber',
  resolved: 'neutral',
};

export function attentionStateLabel(state: AttentionState): string {
  return ATTENTION_STATE_LABELS[state];
}

/** Why a state change was refused, in words the person can act on. Never a success. */
export function stateChangeErrorMessage(code: string, holderLabel: string | null = null): string {
  switch (code) {
    case 'HOLDER_REQUIRED':
      return ATTENTION_STATE_COPY.needsHolder;
    case 'TRANSITION_NOT_ALLOWED':
      return 'Ese cambio de estado no está permitido desde el estado actual.';
    case 'STATE_CHANGED':
      return 'Otra persona cambió el estado al mismo tiempo. Se actualizó la conversación; revise e intente de nuevo.';
    case 'NOT_HOLDER':
      return holderLabel
        ? `${holderLabel} atiende esta conversación. Solo esa persona o quien la coordina puede cambiar el estado.`
        : 'Otra persona atiende esta conversación. Solo esa persona o quien la coordina puede cambiar el estado.';
    default:
      return '';
  }
}

export function noteSaveErrorMessage(code: string): string {
  if (code === 'REQUEST_KEY_REUSED') {
    return 'Esa nota ya se había guardado con otro texto. Revise las notas y guarde de nuevo.';
  }
  return '';
}

export type ComposerDraft = {
  mode: ComposerMode;
  note: string;
  /** Idempotency key of the current note text; reset whenever the text changes. */
  noteKey: string | null;
};

export const EMPTY_COMPOSER_DRAFT: ComposerDraft = { mode: 'message', note: '', noteKey: null };

/** Typing new text makes it a new note: the old key and outcome no longer apply. */
export function applyNoteEdit(draft: ComposerDraft, text: string): ComposerDraft {
  return { ...draft, note: text, noteKey: null };
}

/**
 * What the draft becomes after a save attempt. A failure keeps the text and the key exactly
 * as they were (so retrying the same text is the same note); only a success clears it.
 */
export function applyNoteSaveOutcome(draft: ComposerDraft, outcome: { ok: boolean }): ComposerDraft {
  return outcome.ok ? { ...draft, note: '', noteKey: null } : draft;
}

/** Browser-side key for one note draft (8+ characters, unique enough for a retry). */
export function newNoteRequestKey(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return `note-${cryptoApi.randomUUID()}`;
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type NoteValidation = { ok: true; body: string } | { ok: false; error: string };

export function validateNoteDraft(raw: string): NoteValidation {
  const body = raw.trim();
  if (!body) return { ok: false, error: COMPOSER_COPY.noteEmpty };
  if (body.length > INTERNAL_NOTE_MAX_LENGTH) return { ok: false, error: COMPOSER_COPY.noteTooLong };
  return { ok: true, body };
}
