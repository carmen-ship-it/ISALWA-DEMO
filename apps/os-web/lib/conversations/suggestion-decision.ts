/**
 * Durable conversation suggestion decisions — company evidence, not browser-only.
 * Reuses OsCustomerConversation (company-entered) without inventing confirmation columns.
 * Decision rows are filtered out of the Conversaciones thread list.
 */

import type { ManualCustomerConversation, RecordCustomerConversationInput } from '@isalwa/os-contracts';
import type { ConversationSuggestion } from './suggestion-types';

export const SUGGESTION_DECISION_KIND = 'suggestion_decision' as const;
export const SUGGESTION_DECISION_IGNORED = 'ignored' as const;

/** Prefix on nextAction for durable ignore rows (stable parse key). */
export const SUGGESTION_DECISION_NEXT_ACTION_PREFIX = 'suggestion_decision:ignored|' as const;

export type SuggestionIgnoredDecision = {
  kind: typeof SUGGESTION_DECISION_KIND;
  decision: typeof SUGGESTION_DECISION_IGNORED;
  sourceConversationId: string;
  suggestionId: string;
  suggestionType: string;
  actorMemberId: string | null;
  decidedAt: string;
  organizationId: string;
  provenance: 'company_entered';
  source: 'employee_entered';
};

export function suggestionDecisionNextAction(
  sourceConversationId: string,
  suggestionId: string,
): string {
  return `${SUGGESTION_DECISION_NEXT_ACTION_PREFIX}${sourceConversationId}|${suggestionId}`;
}

export function isSuggestionDecisionRecord(
  record: Pick<ManualCustomerConversation, 'nextAction' | 'summary'> | RecordCustomerConversationInput,
): boolean {
  const next = record.nextAction?.trim() ?? '';
  if (next.startsWith(SUGGESTION_DECISION_NEXT_ACTION_PREFIX)) return true;
  const summary = 'summary' in record ? String(record.summary ?? '').trim() : '';
  return summary.startsWith('Sugerencia ignorada');
}

export function parseSuggestionIgnoredDecision(
  record: ManualCustomerConversation,
): SuggestionIgnoredDecision | null {
  if (!isSuggestionDecisionRecord(record)) return null;
  const next = record.nextAction?.trim() ?? '';
  if (!next.startsWith(SUGGESTION_DECISION_NEXT_ACTION_PREFIX)) return null;
  const rest = next.slice(SUGGESTION_DECISION_NEXT_ACTION_PREFIX.length);
  const sep = rest.indexOf('|');
  if (sep <= 0) return null;
  const sourceConversationId = rest.slice(0, sep).trim();
  const suggestionId = rest.slice(sep + 1).trim();
  if (!sourceConversationId || !suggestionId) return null;

  let suggestionType = 'unknown';
  try {
    const raw = record.pastedEvidence?.trim();
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SuggestionIgnoredDecision>;
      if (typeof parsed.suggestionType === 'string' && parsed.suggestionType.trim()) {
        suggestionType = parsed.suggestionType.trim();
      }
    }
  } catch {
    /* evidence is best-effort; nextAction keys are authoritative */
  }

  return {
    kind: SUGGESTION_DECISION_KIND,
    decision: SUGGESTION_DECISION_IGNORED,
    sourceConversationId,
    suggestionId,
    suggestionType,
    actorMemberId: record.enteredByMemberId,
    decidedAt: record.occurredAt,
    organizationId: record.organizationId,
    provenance: 'company_entered',
    source: 'employee_entered',
  };
}

export function ignoredSuggestionIdsFromRecords(
  records: readonly ManualCustomerConversation[],
  sourceConversationId: string,
): Set<string> {
  const out = new Set<string>();
  for (const record of records) {
    const decision = parseSuggestionIgnoredDecision(record);
    if (!decision) continue;
    if (decision.sourceConversationId !== sourceConversationId) continue;
    out.add(decision.suggestionId);
  }
  return out;
}

/** Input for recordManualCustomerConversation — durable ignore, no domain business mutation. */
export function buildIgnoreSuggestionAdmissionInput(input: {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel?: string | null;
  sourceConversationId: string;
  suggestion: Pick<ConversationSuggestion, 'id' | 'type' | 'explanation'>;
  enteredByMemberId: string;
  enteredByLabel: string;
  occurredAt?: string;
}): { draft: RecordCustomerConversationInput; decision: SuggestionIgnoredDecision } {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const decision: SuggestionIgnoredDecision = {
    kind: SUGGESTION_DECISION_KIND,
    decision: SUGGESTION_DECISION_IGNORED,
    sourceConversationId: input.sourceConversationId,
    suggestionId: input.suggestion.id,
    suggestionType: input.suggestion.type,
    actorMemberId: input.enteredByMemberId,
    decidedAt: occurredAt,
    organizationId: input.organizationId,
    provenance: 'company_entered',
    source: 'employee_entered',
  };
  return {
    decision,
    draft: {
      id: input.id,
      organizationId: input.organizationId,
      customerId: input.customerId,
      customerLabel: input.customerLabel,
      contactLabel: input.contactLabel ?? null,
      channel: 'manual',
      occurredAt,
      enteredByMemberId: input.enteredByMemberId,
      enteredByLabel: input.enteredByLabel,
      summary: `Sugerencia ignorada: ${input.suggestion.type}`,
      pastedEvidence: JSON.stringify(decision),
      opportunityId: null,
      quoteId: null,
      orderId: null,
      customerQuestion: null,
      commitmentCandidate: null,
      possibleRequestedDate: null,
      nextAction: suggestionDecisionNextAction(input.sourceConversationId, input.suggestion.id),
    },
  };
}
