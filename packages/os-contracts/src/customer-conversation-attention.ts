import { z } from 'zod';

/**
 * Batch 5B: attention state and team-only notes for a stored conversation.
 *
 * Attention state answers "where is this conversation with the team". It is not an AI state
 * (AI is a separate, not yet configured concept), not an account owner, and not a commitment.
 * Nothing here sends a message, calls a provider, or claims a delivery.
 */

/** Approved mapping: Nueva · En atención · Esperando al cliente · Esperando al equipo · Resuelta. */
export const ATTENTION_STATES = [
  'new',
  'in_attention',
  'waiting_customer',
  'waiting_team',
  'resolved',
] as const;
export type AttentionState = (typeof ATTENTION_STATES)[number];

export const ATTENTION_STATE_LABELS: Record<AttentionState, string> = {
  new: 'Nueva',
  in_attention: 'En atención',
  waiting_customer: 'Esperando al cliente',
  waiting_team: 'Esperando al equipo',
  resolved: 'Resuelta',
};

export function isAttentionState(value: unknown): value is AttentionState {
  return typeof value === 'string' && (ATTENTION_STATES as readonly string[]).includes(value);
}

/**
 * AI state is separate from attention state. No AI reply engine is connected, so the value is
 * always null here. A future AI state must not be derived from, or written into, attention state.
 */
export type ConversationAiState = null;

/** Why a state changed. `take` and `manual` are people; `inbound` is reserved (see below). */
export const ATTENTION_STATE_CAUSES = ['take', 'manual', 'inbound'] as const;
export type AttentionStateCause = (typeof ATTENTION_STATE_CAUSES)[number];

/**
 * Manual transitions a team member may request. Rules:
 * - Nothing goes back to "Nueva" by hand: Nueva means "no human has handled it yet".
 * - "En atención" needs someone holding the conversation (Tomar conversación first), so a
 *   state never claims attention nobody is giving.
 * - Every other state can move to any other; "Resuelta" can only be reopened to "En atención".
 */
const MANUAL_TARGETS: Record<AttentionState, readonly AttentionState[]> = {
  new: ['in_attention', 'waiting_customer', 'waiting_team', 'resolved'],
  in_attention: ['waiting_customer', 'waiting_team', 'resolved'],
  waiting_customer: ['in_attention', 'waiting_team', 'resolved'],
  waiting_team: ['in_attention', 'waiting_customer', 'resolved'],
  resolved: ['in_attention'],
};

export type AttentionTransitionRefusal =
  | 'same_state'
  | 'transition_not_allowed'
  | 'holder_required';

/**
 * Whether a person may move `from` → `to`. `held` is whether the conversation has a holder.
 * The server calls this too, so the UI only offers what the command will accept.
 */
export function checkAttentionTransition(input: {
  from: AttentionState;
  to: AttentionState;
  held: boolean;
}): { ok: true } | { ok: false; reason: AttentionTransitionRefusal } {
  if (input.from === input.to) return { ok: false, reason: 'same_state' };
  if (!MANUAL_TARGETS[input.from].includes(input.to)) {
    return { ok: false, reason: 'transition_not_allowed' };
  }
  if (input.to === 'in_attention' && !input.held) return { ok: false, reason: 'holder_required' };
  return { ok: true };
}

/** States offered in the UI for the current state and holder. */
export function allowedAttentionTargets(input: {
  from: AttentionState;
  held: boolean;
}): AttentionState[] {
  return MANUAL_TARGETS[input.from].filter(
    (to) => checkAttentionTransition({ from: input.from, to, held: input.held }).ok,
  );
}

/**
 * Tomar conversación starts attention: a new conversation, or one that was waiting for the
 * team, becomes "En atención". A conversation waiting for the customer or already resolved
 * keeps its state; taking it only records who holds it.
 */
export function attentionStateAfterTake(state: AttentionState): AttentionState {
  return state === 'new' || state === 'waiting_team' ? 'in_attention' : state;
}

/**
 * Reopen contract for a NEW INBOUND customer message. The team now owes a reply:
 * - "Esperando al equipo" and "En atención" stay as they are (the team already owes / is on it).
 * - "Nueva" stays "Nueva".
 * - "Esperando al cliente" and "Resuelta" reopen to "En atención" when someone holds the
 *   conversation, and to "Nueva" when it is unassigned (it returns to the shared queue).
 *
 * No inbound path exists yet: WhatsApp is not connected and the manual "Registrar atención"
 * is a company-entered record, not a customer message. This function is the rule a future
 * inbound adapter must apply. It is deliberately not called from any route.
 */
export function attentionStateAfterInbound(input: { state: AttentionState; held: boolean }): {
  state: AttentionState;
  reopened: boolean;
} {
  if (input.state === 'waiting_customer' || input.state === 'resolved') {
    return { state: input.held ? 'in_attention' : 'new', reopened: true };
  }
  return { state: input.state, reopened: false };
}

/**
 * Human takeover pauses automated replies. Every human action on the state (taking, or a manual
 * transition) records the pause. It is never lifted by resolving or reopening: resuming
 * automation would be an explicit future command. No automation exists yet, so this only
 * records the fact that a human is in charge.
 */
export function humanActionPausesAutomation(cause: AttentionStateCause): boolean {
  return cause === 'take' || cause === 'manual';
}

export const TransitionAttentionStateSchema = z.object({
  to: z.enum(ATTENTION_STATES),
});
export type TransitionAttentionStateInput = z.infer<typeof TransitionAttentionStateSchema>;

// ---------------------------------------------------------------------------
// Internal notes ("Solo equipo")
// ---------------------------------------------------------------------------

/** The only visibility there is. A note is never an outbound message and has no provider id. */
export const INTERNAL_NOTE_VISIBILITY = 'team_only' as const;
export const INTERNAL_NOTE_MAX_LENGTH = 4000;
/** What the UI shows on every internal note. */
export const INTERNAL_NOTE_LABEL = 'Solo equipo';

/**
 * `requestKey` is generated by the browser for one draft. Repeating the same save (after a
 * timeout, for example) returns the same note instead of writing a second one.
 */
export const AddInternalNoteSchema = z.object({
  body: z.string().trim().min(1).max(INTERNAL_NOTE_MAX_LENGTH),
  requestKey: z.string().trim().min(8).max(100),
});
export type AddInternalNoteInput = z.infer<typeof AddInternalNoteSchema>;

export type ConversationInternalNote = {
  id: string;
  organizationId: string;
  conversationId: string;
  authorMemberId: string;
  authorLabel: string;
  body: string;
  visibility: typeof INTERNAL_NOTE_VISIBILITY;
  createdAt: string;
};

/** Keys that would turn a note into a message or a delivery. A note row never has them. */
const FORBIDDEN_NOTE_KEYS = [
  'provider_message_id',
  'external_message_id',
  'delivered',
  'delivered_at',
  'sent_at',
  'phone',
  'whatsapp_number',
  'channel',
  'direction',
] as const;

export function assertInternalNoteShape(row: Record<string, unknown>): void {
  const keys = Object.keys(row);
  for (const forbidden of FORBIDDEN_NOTE_KEYS) {
    if (keys.includes(forbidden)) {
      throw new Error('An internal note cannot carry a provider, channel or delivery field');
    }
  }
  if (row.visibility !== INTERNAL_NOTE_VISIBILITY) {
    throw new Error('An internal note stays team only');
  }
}
