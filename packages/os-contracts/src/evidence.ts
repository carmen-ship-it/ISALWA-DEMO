/**
 * Evidence is not truth.
 * Source says where a fact came from.
 * Confidence says how sure we are that we understood it.
 * Confirmation says whether the company accepts it.
 * These three must not be collapsed.
 */

export const EVIDENCE_SOURCE_TYPES = [
  'customer_message',
  'employee_entered',
  'ai_inferred',
  'isalwa_confirmed',
  'external_system',
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const EVIDENCE_CHANNELS = ['whatsapp', 'manual', 'isalwa', 'external'] as const;
export type EvidenceChannel = (typeof EVIDENCE_CHANNELS)[number];

/** How sure we are that we understood the source. Not operational confirmation. */
export const EXTRACTION_CONFIDENCE = ['high', 'medium', 'low'] as const;
export type ExtractionConfidence = (typeof EXTRACTION_CONFIDENCE)[number];

export const CONFIRMATION_STATES = ['unconfirmed', 'reviewed', 'confirmed', 'dismissed'] as const;
export type ConfirmationState = (typeof CONFIRMATION_STATES)[number];

/**
 * 1 raw provider evidence
 * 2 normalized message
 * 3 interpretation
 * 4 human-reviewed reported fact
 * 5 canonical governed record
 * 6 connected authoritative confirmation
 * Levels are never skipped by an extractor.
 */
export const TRUTH_LEVEL = {
  rawProviderEvidence: 1,
  normalizedMessage: 2,
  interpretation: 3,
  humanReviewedReport: 4,
  canonicalRecord: 5,
  connectedConfirmation: 6,
} as const;

export type TruthLevel = (typeof TRUTH_LEVEL)[keyof typeof TRUTH_LEVEL];

export type EvidenceProvenance = {
  sourceType: EvidenceSourceType;
  sourceChannel: EvidenceChannel | null;
  providerMessageId: string | null;
  conversationId: string | null;
  sourceTimestamp: string | null;
  sourceActorLabel: string | null;
  extractedBy: 'deterministic' | 'ai' | 'employee' | null;
  extractionTimestamp: string | null;
  confidence: ExtractionConfidence | null;
  confirmationState: ConfirmationState;
  confirmedByMemberId: string | null;
  confirmedAt: string | null;
  relatedRecordType: string | null;
  relatedRecordId: string | null;
  /** Why the employee is seeing this. Must quote or point at the source, not a new claim. */
  why: string | null;
  sourceExcerpt: string | null;
};

export type EvidenceRevision = {
  at: string;
  actorMemberId: string;
  action: 'dismiss' | 'correct';
  reason: string | null;
  previousInterpretation: string;
  previousConfirmationState: ConfirmationState;
};

export type EvidenceFact = EvidenceProvenance & {
  id: string;
  organizationId: string;
  truthLevel: TruthLevel;
  /** Stable kind. Not an employee-facing label. */
  kind: string;
  interpretation: string;
  revisions: EvidenceRevision[];
};

export function truthLevelForSource(sourceType: EvidenceSourceType): TruthLevel {
  switch (sourceType) {
    case 'customer_message':
      return TRUTH_LEVEL.rawProviderEvidence;
    case 'employee_entered':
      return TRUTH_LEVEL.humanReviewedReport;
    case 'ai_inferred':
      return TRUTH_LEVEL.interpretation;
    case 'isalwa_confirmed':
      return TRUTH_LEVEL.canonicalRecord;
    case 'external_system':
      return TRUTH_LEVEL.connectedConfirmation;
  }
}

/** An extraction never becomes a confirmed payment. Finance confirmation is a later, separate source. */
export function paymentClaimMayBeConfirmed(sourceType: EvidenceSourceType): boolean {
  return sourceType === 'external_system';
}

/** Evidence and interpretation do not mutate a canonical record. A governed command must do that separately. */
export function extractionMayMutateCanonical(): false {
  return false;
}

export function applyEvidenceCorrection(
  fact: EvidenceFact,
  input: { at: string; actorMemberId: string; action: 'dismiss' | 'correct'; reason: string | null; interpretation?: string },
): EvidenceFact {
  const revision: EvidenceRevision = {
    at: input.at,
    actorMemberId: input.actorMemberId,
    action: input.action,
    reason: input.reason,
    previousInterpretation: fact.interpretation,
    previousConfirmationState: fact.confirmationState,
  };
  return {
    ...fact,
    interpretation: input.interpretation?.trim() || fact.interpretation,
    confirmationState: input.action === 'dismiss' ? 'dismissed' : fact.confirmationState,
    revisions: [...fact.revisions, revision],
  };
}

export type EvidenceConflict = {
  kind: 'quantity' | 'payment' | 'amount' | 'location';
  customerSaid: string;
  currentTruth: string;
};

/** Surfaces a difference. Does not change the order, quote, payment, or location. */
export function detectEvidenceConflict(input: {
  customerQuantity: number | null;
  orderQuantity: number | null;
  customerClaimsPaid: boolean;
  hasConfirmedPayment: boolean;
  customerAmountLabel: string | null;
  canonicalAmountLabel: string | null;
  customerLocationLabel: string | null;
  currentLocationLabel: string | null;
}): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];
  if (
    input.customerQuantity !== null &&
    input.orderQuantity !== null &&
    input.customerQuantity !== input.orderQuantity
  ) {
    conflicts.push({
      kind: 'quantity',
      customerSaid: String(input.customerQuantity),
      currentTruth: String(input.orderQuantity),
    });
  }
  if (input.customerClaimsPaid && !input.hasConfirmedPayment) {
    conflicts.push({
      kind: 'payment',
      customerSaid: 'El cliente dice que pagó',
      currentTruth: 'No hay un pago confirmado',
    });
  }
  if (
    input.customerAmountLabel &&
    input.canonicalAmountLabel &&
    input.customerAmountLabel !== input.canonicalAmountLabel
  ) {
    conflicts.push({
      kind: 'amount',
      customerSaid: input.customerAmountLabel,
      currentTruth: input.canonicalAmountLabel,
    });
  }
  if (
    input.customerLocationLabel &&
    input.currentLocationLabel &&
    input.customerLocationLabel !== input.currentLocationLabel
  ) {
    conflicts.push({
      kind: 'location',
      customerSaid: input.customerLocationLabel,
      currentTruth: input.currentLocationLabel,
    });
  }
  return conflicts;
}

/** An outbound message does not close a customer question. */
export function questionRemainsOpen(input: { text: string; markedResolved: boolean }): boolean {
  if (input.markedResolved) return false;
  return input.text.includes('?') || input.text.includes('¿');
}
