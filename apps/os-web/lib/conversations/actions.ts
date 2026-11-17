'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import type {
  AttentionState,
  ConversationInternalNote,
  ConversationNextStep,
  ManualCustomerConversation,
} from '@isalwa/os-contracts';
import { recordManualCustomerConversation } from '@isalwa/os-contracts';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient, type CustomerConversationNextStepOutcome } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import {
  MANUAL_CONVERSATION_COPY,
  MANUAL_CONVERSATION_ERRORS,
  nextStepFailureMessage,
} from './manual-conversation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { noteSaveErrorMessage, stateChangeErrorMessage, validateNoteDraft } from './composer';
import { buildIgnoreSuggestionAdmissionInput } from './suggestion-decision';
import type { ConversationSuggestion } from './suggestion-types';

/**
 * What happened to the optional next step. `failed` means the attention is saved and the
 * next step is not: the caller must say so and offer a retry, never a plain success.
 */
export type ConversationNextStepResult =
  | { status: 'none' }
  | { status: 'created'; commitmentId: string }
  | { status: 'failed'; code: string; message: string };

export type CreateCustomerConversationResult =
  | { ok: true; id: string; nextStep: ConversationNextStepResult }
  | { ok: false; error: string };

export type RetryConversationNextStepResult =
  | { ok: true; nextStep: ConversationNextStepResult }
  | { ok: false; error: string };

export type TakeConversationResult =
  | {
      ok: true;
      assignedMemberId: string;
      assignedLabel: string;
      attentionState: AttentionState;
      automationPaused: boolean;
    }
  | { ok: false; error: string; alreadyAssigned: boolean };

export type ChangeConversationStateResult =
  | { ok: true; attentionState: AttentionState; automationPaused: boolean }
  /** `stale` means the stored state is not what the screen showed: refresh before trying again. */
  | { ok: false; error: string; stale: boolean };

export type ListConversationNotesResult =
  | { ok: true; notes: ConversationInternalNote[] }
  | { ok: false; error: string };

export type AddConversationNoteResult =
  | { ok: true; note: ConversationInternalNote }
  | { ok: false; error: string };

function toNextStepResult(
  outcome: CustomerConversationNextStepOutcome | null | undefined,
): ConversationNextStepResult {
  if (!outcome) return { status: 'none' };
  if (outcome.status === 'created') return { status: 'created', commitmentId: outcome.commitmentId };
  return { status: 'failed', code: outcome.code, message: nextStepFailureMessage(outcome.code) };
}

export type RecordRecommendedReplySentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type IgnoreConversationSuggestionResult =
  | { ok: true; id: string; suggestionId: string }
  | { ok: false; error: string };

function mapAdmissionReason(reason: string): string {
  if (reason in MANUAL_CONVERSATION_ERRORS) {
    return MANUAL_CONVERSATION_ERRORS[reason as keyof typeof MANUAL_CONVERSATION_ERRORS];
  }
  return MANUAL_CONVERSATION_ERRORS.invalid_record;
}

function revalidateConversationPaths(customerId: string): void {
  revalidatePath('/conversaciones');
  if (customerId.trim()) {
    revalidatePath(`/clientes/${customerId}`);
  }
}

export async function createCustomerConversationAction(
  record: ManualCustomerConversation,
): Promise<CreateCustomerConversationResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded };
  }

  const admitted = recordManualCustomerConversation(record);
  if (!admitted.ok) {
    return { ok: false, error: mapAdmissionReason(admitted.reason) };
  }

  const client = createOsApiClient(auth);
  try {
    const created = await client.createCustomerConversation(admitted.record);
    revalidateConversationPaths(admitted.record.customerId);
    revalidatePath('/compromisos');
    return { ok: true, id: created.item.id, nextStep: toNextStepResult(created.nextStep) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

/** Retry the next step of an attention that is already saved. Idempotent on the server. */
export async function retryConversationNextStepAction(input: {
  conversationId: string;
  customerId: string;
  step: ConversationNextStep;
}): Promise<RetryConversationNextStepResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded };
  try {
    const saved = await createOsApiClient(auth).saveCustomerConversationNextStep(
      input.conversationId,
      input.step,
    );
    revalidateConversationPaths(input.customerId);
    revalidatePath('/compromisos');
    return { ok: true, nextStep: toNextStepResult(saved.nextStep) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

/**
 * Tomar conversación. Only assigns the conversation to the signed-in member.
 * It does not change the account owner and cannot take a conversation someone else holds.
 */
export async function takeConversationAction(input: {
  conversationId: string;
  customerId: string;
}): Promise<TakeConversationResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error, alreadyAssigned: false };
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded, alreadyAssigned: false };
  }
  try {
    const taken = await createOsApiClient(auth).takeCustomerConversation(input.conversationId);
    revalidateConversationPaths(input.customerId);
    return {
      ok: true,
      assignedMemberId: taken.item.assignedMemberId ?? '',
      assignedLabel: taken.item.assignedLabel ?? '',
      attentionState: taken.item.attentionState,
      automationPaused: Boolean(taken.item.automationPausedAt),
    };
  } catch (err) {
    if (err instanceof OsApiError && err.code === 'ALREADY_ASSIGNED') {
      return { ok: false, error: MANUAL_CONVERSATION_COPY.alreadyTaken, alreadyAssigned: true };
    }
    return { ok: false, error: mapCommandError(err), alreadyAssigned: false };
  }
}

/**
 * Change the attention state. Server-enforced: a held conversation changes only by its holder or
 * a manager, "En atención" needs a holder, and two simultaneous changes have one winner.
 * Never assigns, never sends anything, never touches the account owner.
 */
export async function changeConversationStateAction(input: {
  conversationId: string;
  customerId: string;
  to: AttentionState;
}): Promise<ChangeConversationStateResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error, stale: false };
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded, stale: false };
  try {
    const changed = await createOsApiClient(auth).transitionCustomerConversationState(
      input.conversationId,
      input.to,
    );
    revalidateConversationPaths(input.customerId);
    return {
      ok: true,
      attentionState: changed.item.attentionState,
      automationPaused: Boolean(changed.item.automationPausedAt),
    };
  } catch (err) {
    if (err instanceof OsApiError) {
      const message = stateChangeErrorMessage(
        err.code,
        typeof err.details?.assignedLabel === 'string' ? err.details.assignedLabel : null,
      );
      if (message) return { ok: false, error: message, stale: err.code === 'STATE_CHANGED' };
    }
    return { ok: false, error: mapCommandError(err), stale: false };
  }
}

/** Team-only notes of a stored conversation. Needs the company session; nothing is public. */
export async function listConversationNotesAction(
  conversationId: string,
): Promise<ListConversationNotesResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded };
  try {
    const listed = await createOsApiClient(auth).listCustomerConversationNotes(conversationId);
    return { ok: true, notes: listed.items ?? [] };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

/**
 * Nota interna ("Solo equipo"). Its own server path: it calls only the notes endpoint, never a
 * channel or a send. `requestKey` makes a retry of the same draft the same note.
 */
export async function addConversationNoteAction(input: {
  conversationId: string;
  body: string;
  requestKey: string;
}): Promise<AddConversationNoteResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const checked = validateNoteDraft(input.body);
  if (!checked.ok) return { ok: false, error: checked.error };
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: MANUAL_CONVERSATION_COPY.sessionNeeded };
  try {
    const saved = await createOsApiClient(auth).addCustomerConversationNote(input.conversationId, {
      body: checked.body,
      requestKey: input.requestKey,
    });
    return { ok: true, note: saved.item };
  } catch (err) {
    if (err instanceof OsApiError) {
      const message = noteSaveErrorMessage(err.code);
      if (message) return { ok: false, error: message };
    }
    return { ok: false, error: mapCommandError(err) };
  }
}

/**
 * Customers whose name or phone matches the inbox search. The authorized customer search
 * does the matching, so a phone never travels in a conversation row and an unreadable
 * customer never appears.
 */
export async function searchConversationCustomerIdsAction(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const auth = await getServerOsAuthContext();
  if (!auth) return [];
  try {
    const page = await createOsApiClient(auth).searchParties({ q, status: 'active', limit: 25 });
    return (page.items ?? []).map((item) => item.partyId);
  } catch {
    return [];
  }
}

/** Company-entered note that a human sent the draft outside ISALWA — not live WhatsApp. */
export async function recordRecommendedReplySentAction(input: {
  customerId: string;
  customerLabel: string;
  contactLabel?: string | null;
  conversationId: string;
  body: string;
  enteredByLabel: string;
  enteredByMemberId: string;
  organizationId: string;
}): Promise<RecordRecommendedReplySentResult> {
  const text = input.body.trim();
  if (!text) {
    return { ok: false, error: 'Escriba o confirme el texto antes de registrar el envío.' };
  }

  const id = createId();
  const occurredAt = new Date().toISOString();
  const admitted = recordManualCustomerConversation({
    id,
    organizationId: input.organizationId,
    customerId: input.customerId,
    customerLabel: input.customerLabel,
    contactLabel: input.contactLabel ?? null,
    channel: 'manual',
    occurredAt,
    enteredByMemberId: input.enteredByMemberId,
    enteredByLabel: input.enteredByLabel,
    summary: 'Respuesta registrada como enviada fuera de ISALWA.',
    pastedEvidence: text,
    opportunityId: null,
    quoteId: null,
    orderId: null,
    customerQuestion: null,
    commitmentCandidate: null,
    possibleRequestedDate: null,
    nextAction: `Origen: conversación ${input.conversationId}`,
  });
  if (!admitted.ok) {
    return { ok: false, error: mapAdmissionReason(admitted.reason) };
  }
  return createCustomerConversationAction(admitted.record);
}

/**
 * Durable Ignore for a conversation suggestion.
 * Persists company evidence only — does not create the suggested business record.
 */
export async function ignoreConversationSuggestionAction(input: {
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel?: string | null;
  sourceConversationId: string;
  suggestion: Pick<ConversationSuggestion, 'id' | 'type' | 'explanation'>;
  enteredByMemberId: string;
  enteredByLabel: string;
}): Promise<IgnoreConversationSuggestionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  if (!input.sourceConversationId.trim() || !input.suggestion.id.trim()) {
    return { ok: false, error: 'Sugerencia no válida.' };
  }

  const { draft } = buildIgnoreSuggestionAdmissionInput({
    id: createId(),
    organizationId: input.organizationId,
    customerId: input.customerId,
    customerLabel: input.customerLabel,
    contactLabel: input.contactLabel,
    sourceConversationId: input.sourceConversationId,
    suggestion: input.suggestion,
    enteredByMemberId: input.enteredByMemberId,
    enteredByLabel: input.enteredByLabel,
  });

  const admitted = recordManualCustomerConversation(draft);
  if (!admitted.ok) {
    return { ok: false, error: mapAdmissionReason(admitted.reason) };
  }

  const created = await createCustomerConversationAction(admitted.record);
  if (!created.ok) return created;
  return { ok: true, id: created.id, suggestionId: input.suggestion.id };
}
