'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import type { ManualCustomerConversation } from '@isalwa/os-contracts';
import { recordManualCustomerConversation } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { MANUAL_CONVERSATION_COPY, MANUAL_CONVERSATION_ERRORS } from './manual-conversation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { buildIgnoreSuggestionAdmissionInput } from './suggestion-decision';
import type { ConversationSuggestion } from './suggestion-types';

export type CreateCustomerConversationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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
    return { ok: true, id: created.item.id };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
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
