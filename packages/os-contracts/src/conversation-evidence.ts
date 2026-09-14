/**
 * Provider-neutral conversation evidence.
 * A normalized message is not a webhook, a send, or a canonical write.
 * An extraction can propose a fact. It cannot change an order, quote, or location.
 * A customer message cannot confirm a payment.
 */

import {
  EXTRACTION_CONFIDENCE,
  TRUTH_LEVEL,
  applyEvidenceCorrection,
  extractionMayMutateCanonical,
  paymentClaimMayBeConfirmed,
  truthLevelForSource,
  type ConfirmationState,
  type EvidenceChannel,
  type EvidenceFact,
  type EvidenceSourceType,
  type ExtractionConfidence,
} from './evidence';

/** Employee words for extraction confidence. Never a percentage. */
export const CONFIDENCE_WORDS = {
  high: 'alta',
  medium: 'media',
  low: 'baja',
} as const;

export type ConfidenceWord = (typeof CONFIDENCE_WORDS)[ExtractionConfidence];

export const CONVERSATION_MESSAGE_DIRECTION = 'inbound' as const;

/**
 * Truth level 2. Channel is a product channel, not a vendor payload.
 * Recording this shape does not send, and does not call a provider.
 */
export type NormalizedConversationMessage = {
  id: string;
  organizationId: string;
  conversationId: string;
  channel: EvidenceChannel;
  direction: typeof CONVERSATION_MESSAGE_DIRECTION;
  occurredAt: string;
  /** Exact digits already in hand. Not a live WhatsApp identity. */
  phoneKey: string;
  text: string;
  truthLevel: typeof TRUTH_LEVEL.normalizedMessage;
  providerMessageId: string | null;
};

export function normalizedConversationMessage(
  input: Omit<NormalizedConversationMessage, 'direction' | 'truthLevel'>,
): NormalizedConversationMessage {
  return {
    ...input,
    direction: CONVERSATION_MESSAGE_DIRECTION,
    truthLevel: TRUTH_LEVEL.normalizedMessage,
  };
}

export const PHONE_MATCH_OUTCOMES = ['matched', 'ambiguous', 'unmatched'] as const;
export type PhoneMatchOutcome = (typeof PHONE_MATCH_OUTCOMES)[number];

export type SameTenantPhoneCandidate = {
  organizationId: string;
  partyId: string;
  phoneKey: string;
};

/**
 * Exact equality inside one organization.
 * Other tenants and other keys are ignored, never chosen.
 */
export type SameTenantPhoneMatch =
  | {
      outcome: 'matched';
      organizationId: string;
      phoneKey: string;
      partyId: string;
    }
  | {
      outcome: 'ambiguous';
      organizationId: string;
      phoneKey: string;
      partyIds: readonly [string, string, ...string[]];
    }
  | {
      outcome: 'unmatched';
      organizationId: string;
      phoneKey: string;
    }
  | {
      outcome: 'refused';
      reason: 'missing_tenant' | 'missing_phone';
    };

export function classifyExactSameTenantPhoneMatch(input: {
  organizationId: string;
  phoneKey: string;
  candidates: readonly SameTenantPhoneCandidate[];
}): SameTenantPhoneMatch {
  const organizationId = input.organizationId.trim();
  const phoneKey = input.phoneKey.trim();
  if (!organizationId) return { outcome: 'refused', reason: 'missing_tenant' };
  if (!phoneKey) return { outcome: 'refused', reason: 'missing_phone' };

  const partyIds = [
    ...new Set(
      input.candidates
        .filter(
          (candidate) =>
            candidate.organizationId === organizationId && candidate.phoneKey === phoneKey,
        )
        .map((candidate) => candidate.partyId)
        .filter((partyId) => partyId.trim().length > 0),
    ),
  ];

  if (partyIds.length === 0) {
    return { outcome: 'unmatched', organizationId, phoneKey };
  }
  if (partyIds.length === 1) {
    return { outcome: 'matched', organizationId, phoneKey, partyId: partyIds[0]! };
  }
  return {
    outcome: 'ambiguous',
    organizationId,
    phoneKey,
    partyIds: partyIds as [string, string, ...string[]],
  };
}

/**
 * A proposed reading of a message.
 * Source, confidence, and confirmation are required and stay separate.
 */
export type ExtractionCandidate = {
  id: string;
  organizationId: string;
  conversationId: string;
  messageId: string;
  kind: string;
  interpretation: string;
  sourceType: EvidenceSourceType;
  sourceChannel: EvidenceChannel;
  confidence: ExtractionConfidence;
  confirmationState: ConfirmationState;
  sourceExcerpt: string;
  why: string;
};

export function confidenceWord(confidence: ExtractionConfidence): ConfidenceWord {
  return CONFIDENCE_WORDS[confidence];
}

/** Percentages and other scores are not confidence. */
export function parseExtractionConfidence(value: unknown): ExtractionConfidence | null {
  if (value === 'alta') return 'high';
  if (value === 'media') return 'medium';
  if (value === 'baja') return 'low';
  if (typeof value !== 'string') return null;
  if ((EXTRACTION_CONFIDENCE as readonly string[]).includes(value)) {
    return value as ExtractionConfidence;
  }
  return null;
}

export type ExtractionAuthority = {
  canonicalMutation: 'refused';
  paymentConfirmation: 'refused' | 'allowed';
  customerPaymentAutoConfirmed: false;
};

/**
 * Refuses a canonical write in every case.
 * Refuses payment confirmation unless the source is an external system.
 * Never treats a customer, employee, or model reading as a collected payment.
 */
export function refuseUngovernedExtraction(sourceType: EvidenceSourceType): ExtractionAuthority {
  // Existing rule is false. This function still refuses if that rule is ever misread as permission.
  void extractionMayMutateCanonical();
  return {
    canonicalMutation: 'refused',
    paymentConfirmation: paymentClaimMayBeConfirmed(sourceType) ? 'allowed' : 'refused',
    customerPaymentAutoConfirmed: false,
  };
}

export type CandidateAdmission =
  | { admitted: false; reason: 'payment_confirmation_refused'; authority: ExtractionAuthority }
  | { admitted: true; fact: EvidenceFact; authority: ExtractionAuthority };

/** Turns a candidate into an unconfirmed fact. Does not write an order, quote, or location. */
export function admitExtractionCandidate(candidate: ExtractionCandidate): CandidateAdmission {
  const authority = refuseUngovernedExtraction(candidate.sourceType);
  const claimsConfirmedPayment =
    candidate.kind === 'payment_claim' && candidate.confirmationState === 'confirmed';
  if (claimsConfirmedPayment && authority.paymentConfirmation !== 'allowed') {
    return { admitted: false, reason: 'payment_confirmation_refused', authority };
  }

  return {
    admitted: true,
    authority,
    fact: {
      id: candidate.id,
      organizationId: candidate.organizationId,
      truthLevel: truthLevelForSource(candidate.sourceType),
      kind: candidate.kind,
      interpretation: candidate.interpretation,
      sourceType: candidate.sourceType,
      sourceChannel: candidate.sourceChannel,
      providerMessageId: null,
      conversationId: candidate.conversationId,
      sourceTimestamp: null,
      sourceActorLabel: null,
      extractedBy: candidate.sourceType === 'ai_inferred' ? 'ai' : 'deterministic',
      extractionTimestamp: null,
      confidence: candidate.confidence,
      confirmationState: candidate.confirmationState,
      confirmedByMemberId: null,
      confirmedAt: null,
      relatedRecordType: null,
      relatedRecordId: null,
      why: candidate.why,
      sourceExcerpt: candidate.sourceExcerpt,
      revisions: [],
    },
  };
}

/**
 * Correction appends history. It does not delete the previous reading,
 * and it cannot confirm a payment or mutate a canonical record.
 */
export function recordExtractionCorrection(
  fact: EvidenceFact,
  input: {
    at: string;
    actorMemberId: string;
    action: 'dismiss' | 'correct';
    reason: string | null;
    interpretation?: string;
  },
): EvidenceFact & { authority: ExtractionAuthority } {
  const corrected = applyEvidenceCorrection(fact, input);
  return {
    ...corrected,
    authority: refuseUngovernedExtraction(corrected.sourceType),
  };
}
