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
  questionRemainsOpen,
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

/**
 * A customer statement is not company-confirmed truth.
 * Confirmation cannot upgrade it.
 */
export function customerStatementIsCompanyConfirmed(_confirmationState: ConfirmationState): false {
  return false;
}

/** A customer message is not a confirmed payment. The text is ignored on purpose. */
export function customerMessageConfirmsPayment(_text: string): false {
  return false;
}

/**
 * Company acceptance is not source and not confidence.
 * A customer, employee, or model reading never qualifies.
 */
export function statementIsCompanyConfirmed(
  sourceType: EvidenceSourceType,
  confirmationState: ConfirmationState,
): boolean {
  if (
    sourceType === 'customer_message' ||
    sourceType === 'ai_inferred' ||
    sourceType === 'employee_entered'
  ) {
    return false;
  }
  return confirmationState === 'confirmed';
}

/** Confirming a payment from a message is refused for every source, including an external system. */
export function confirmPaymentFromMessage(_sourceType: EvidenceSourceType): {
  accepted: false;
  reason: 'payment_confirmation_refused';
  paymentConfirmed: false;
  canonicalMutation: 'refused';
} {
  return {
    accepted: false,
    reason: 'payment_confirmation_refused',
    paymentConfirmed: false,
    canonicalMutation: 'refused',
  };
}

const AUTHORITATIVE_SOURCE_TYPES = ['external_system', 'isalwa_confirmed'] as const;

function isAuthoritativeSource(sourceType: EvidenceSourceType): boolean {
  return (AUTHORITATIVE_SOURCE_TYPES as readonly string[]).includes(sourceType);
}

export const EVIDENCE_REVIEW_ACTIONS = ['register_as_reported', 'dismiss', 'link_existing'] as const;
export type EvidenceReviewAction = (typeof EVIDENCE_REVIEW_ACTIONS)[number];

export type EvidenceReviewRefusal =
  | 'already_dismissed'
  | 'missing_link'
  | 'missing_actor'
  | 'authoritative_override_refused';

export type EvidenceReviewInput =
  | { action: 'register_as_reported'; at: string; actorMemberId: string }
  | { action: 'dismiss'; at: string; actorMemberId: string; reason: string | null }
  | {
      action: 'link_existing';
      at: string;
      actorMemberId: string;
      relatedRecordType: string;
      relatedRecordId: string;
    };

export type EvidenceReviewResult =
  | {
      accepted: true;
      action: EvidenceReviewAction;
      fact: EvidenceFact;
      authority: ExtractionAuthority;
      paymentConfirmed: false;
      canonicalMutation: 'refused';
      companyConfirmed: false;
      relatedRecordMutated: false;
    }
  | {
      accepted: false;
      reason: EvidenceReviewRefusal;
      authority: ExtractionAuthority;
      paymentConfirmed: false;
      canonicalMutation: 'refused';
      companyConfirmed: false;
      relatedRecordMutated: false;
    };

const REPORTED_REVIEW_REASON =
  'Registrado como dato reportado. No confirma el cobro ni cambia un registro.';
const LINK_REVIEW_REASON = 'Vinculado a un registro existente. El registro no se modificó.';

function refusedReview(
  fact: EvidenceFact,
  reason: EvidenceReviewRefusal,
): EvidenceReviewResult {
  return {
    accepted: false,
    reason,
    authority: refuseUngovernedExtraction(fact.sourceType),
    paymentConfirmed: false,
    canonicalMutation: 'refused',
    companyConfirmed: false,
    relatedRecordMutated: false,
  };
}

function acceptedReview(
  action: EvidenceReviewAction,
  fact: EvidenceFact,
): EvidenceReviewResult {
  return {
    accepted: true,
    action,
    fact,
    authority: refuseUngovernedExtraction(fact.sourceType),
    paymentConfirmed: false,
    canonicalMutation: 'refused',
    companyConfirmed: false,
    relatedRecordMutated: false,
  };
}

function hasActor(input: { at: string; actorMemberId: string }): boolean {
  return input.at.trim().length > 0 && input.actorMemberId.trim().length > 0;
}

/**
 * Employee review of an extraction.
 * Registers a reported reading, dismisses it, or points at an existing record.
 * Does not confirm a payment and does not write the linked record.
 */
export function reviewEvidence(fact: EvidenceFact, input: EvidenceReviewInput): EvidenceReviewResult {
  if (!hasActor(input)) return refusedReview(fact, 'missing_actor');

  if (input.action === 'dismiss') {
    if (isAuthoritativeSource(fact.sourceType)) {
      return refusedReview(fact, 'authoritative_override_refused');
    }
    if (fact.confirmationState === 'dismissed') return refusedReview(fact, 'already_dismissed');
    const corrected = recordExtractionCorrection(fact, {
      at: input.at,
      actorMemberId: input.actorMemberId,
      action: 'dismiss',
      reason: input.reason,
    });
    return acceptedReview('dismiss', corrected);
  }

  if (input.action === 'register_as_reported') {
    if (isAuthoritativeSource(fact.sourceType)) {
      return refusedReview(fact, 'authoritative_override_refused');
    }
    if (fact.confirmationState === 'dismissed') return refusedReview(fact, 'already_dismissed');
    if (fact.confirmationState === 'reviewed') return acceptedReview('register_as_reported', fact);
    const reviewed: EvidenceFact = {
      ...fact,
      confirmationState: 'reviewed',
      revisions: [
        ...fact.revisions,
        {
          at: input.at,
          actorMemberId: input.actorMemberId,
          action: 'correct',
          reason: REPORTED_REVIEW_REASON,
          previousInterpretation: fact.interpretation,
          previousConfirmationState: fact.confirmationState,
        },
      ],
    };
    return acceptedReview('register_as_reported', reviewed);
  }

  const relatedRecordType = input.relatedRecordType.trim();
  const relatedRecordId = input.relatedRecordId.trim();
  if (!relatedRecordType || !relatedRecordId) return refusedReview(fact, 'missing_link');
  const linked: EvidenceFact = {
    ...fact,
    relatedRecordType,
    relatedRecordId,
    revisions: [
      ...fact.revisions,
      {
        at: input.at,
        actorMemberId: input.actorMemberId,
        action: 'correct',
        reason: LINK_REVIEW_REASON,
        previousInterpretation: fact.interpretation,
        previousConfirmationState: fact.confirmationState,
      },
    ],
  };
  return acceptedReview('link_existing', linked);
}

export const AI_READY_CONTEXT_BOUNDARY =
  'Un mensaje del cliente no es verdad confirmada por la empresa. Un mensaje no confirma un pago. Fuente, confianza y confirmación se conservan por separado. No cambies un pedido, un pago ni una ubicación.';

export type AiReadyProvenance = {
  sourceType: EvidenceSourceType;
  sourceChannel: EvidenceChannel | null;
  confidence: ExtractionConfidence | null;
  confirmationState: ConfirmationState;
  companyConfirmed: boolean;
  paymentConfirmed: false;
};

export type AiReadySourceMessage = AiReadyProvenance & {
  role: 'source_message';
  messageId: string;
  occurredAt: string;
  text: string;
  phoneKey: string;
  providerMessageId: string | null;
  sourceType: 'customer_message';
  companyConfirmed: false;
};

export type AiReadyInterpretation = AiReadyProvenance & {
  role: 'interpretation';
  id: string;
  messageId: string;
  kind: string;
  interpretation: string;
  why: string;
  sourceExcerpt: string;
};

export type AiReadyContext = {
  organizationId: string;
  conversationId: string;
  builtAt: string;
  modelCalled: false;
  providerCalled: false;
  boundary: typeof AI_READY_CONTEXT_BOUNDARY;
  messages: readonly AiReadySourceMessage[];
  interpretations: readonly AiReadyInterpretation[];
};

function sameConversation(
  item: { organizationId: string; conversationId: string },
  organizationId: string,
  conversationId: string,
): boolean {
  return item.organizationId === organizationId && item.conversationId === conversationId;
}

/**
 * Packet a future model may read. Does not call a model or a WhatsApp provider.
 * Other tenants are omitted. Customer statements stay unconfirmed company truth.
 */
export function buildAiReadyContext(input: {
  organizationId: string;
  conversationId: string;
  builtAt: string;
  messages: readonly NormalizedConversationMessage[];
  candidates: readonly ExtractionCandidate[];
}): AiReadyContext {
  const messages: AiReadySourceMessage[] = input.messages
    .filter((message) => sameConversation(message, input.organizationId, input.conversationId))
    .map((message) => ({
      role: 'source_message',
      messageId: message.id,
      occurredAt: message.occurredAt,
      text: message.text,
      phoneKey: message.phoneKey,
      providerMessageId: message.providerMessageId,
      sourceType: 'customer_message',
      sourceChannel: message.channel,
      confidence: null,
      confirmationState: 'unconfirmed',
      companyConfirmed: customerStatementIsCompanyConfirmed('unconfirmed'),
      paymentConfirmed: customerMessageConfirmsPayment(message.text),
    }));

  const interpretations: AiReadyInterpretation[] = input.candidates
    .filter((candidate) => sameConversation(candidate, input.organizationId, input.conversationId))
    .map((candidate) => ({
      role: 'interpretation',
      id: candidate.id,
      messageId: candidate.messageId,
      kind: candidate.kind,
      interpretation: candidate.interpretation,
      why: candidate.why,
      sourceExcerpt: candidate.sourceExcerpt,
      sourceType: candidate.sourceType,
      sourceChannel: candidate.sourceChannel,
      confidence: candidate.confidence,
      confirmationState: candidate.confirmationState,
      companyConfirmed:
        candidate.sourceType === 'customer_message'
          ? customerStatementIsCompanyConfirmed(candidate.confirmationState)
          : statementIsCompanyConfirmed(candidate.sourceType, candidate.confirmationState),
      paymentConfirmed: customerMessageConfirmsPayment(candidate.sourceExcerpt),
    }));

  return {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    builtAt: input.builtAt,
    modelCalled: false,
    providerCalled: false,
    boundary: AI_READY_CONTEXT_BOUNDARY,
    messages,
    interpretations,
  };
}

export const COMMITMENT_KINDS = [
  'promised_callback',
  'requested_callback',
  'delivery_expectation',
  'quantity_mention',
  'payment_claim',
  'document_request',
  'follow_up_request',
  'quote_promise',
  'stated_preference',
] as const;

export type CommitmentKind = (typeof COMMITMENT_KINDS)[number];

/**
 * Shape a future extractor may propose.
 * Sealing forces unconfirmed, not a payment, and no canonical write.
 */
export type FutureCommitmentCandidate = {
  kind: CommitmentKind;
  interpretation: string;
  sourceExcerpt: string;
  speaker: 'customer' | 'employee';
  sourceType: 'customer_message' | 'employee_entered';
  confidence: ExtractionConfidence;
  confirmationState: 'unconfirmed';
  companyConfirmed: false;
  paymentConfirmed: false;
  canonicalMutation: 'refused';
};

export function sealFutureCommitmentCandidate(
  candidate: Omit<
    FutureCommitmentCandidate,
    'confirmationState' | 'companyConfirmed' | 'paymentConfirmed' | 'canonicalMutation'
  >,
): FutureCommitmentCandidate {
  return {
    ...candidate,
    confirmationState: 'unconfirmed',
    companyConfirmed: false,
    paymentConfirmed: false,
    canonicalMutation: 'refused',
  };
}

export type CommitmentExtractionRequest = {
  organizationId: string;
  conversationId: string;
  messageId: string;
  text: string;
  speaker: 'customer' | 'employee';
};

export type CommitmentExtractionResult = {
  mode: 'not_live';
  live: false;
  extracted: false;
  modelCalled: false;
  providerCalled: false;
  candidates: readonly [];
  reason: 'extraction_not_live';
  companyConfirmed: false;
  paymentConfirmed: false;
  canonicalMutation: 'refused';
};

export type CommitmentExtractor = {
  readonly live: false;
  readonly mode: 'not_live';
  propose(request: CommitmentExtractionRequest): CommitmentExtractionResult;
};

const NOT_LIVE_COMMITMENT_EXTRACTION: CommitmentExtractionResult = {
  mode: 'not_live',
  live: false,
  extracted: false,
  modelCalled: false,
  providerCalled: false,
  candidates: [],
  reason: 'extraction_not_live',
  companyConfirmed: false,
  paymentConfirmed: false,
  canonicalMutation: 'refused',
};

/** Future commitment extraction. Does not read the text and does not call a model. */
export const futureCommitmentExtractor: CommitmentExtractor = {
  live: false,
  mode: 'not_live',
  propose(request) {
    void request;
    return NOT_LIVE_COMMITMENT_EXTRACTION;
  },
};

export function extractCommitments(request: CommitmentExtractionRequest): CommitmentExtractionResult {
  return futureCommitmentExtractor.propose(request);
}

export type OpenQuestionSignal = {
  messageId: string;
  text: string;
  sourceType: 'customer_message';
  confirmationState: 'unconfirmed';
  companyConfirmed: false;
  resolvedByOutbound: false;
  origin: 'deterministic';
};

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.customer_communication. */
export const UNCONFIRMED_QUESTION_SCOPE = 'commercial.team.read';

export type TrustedEvidenceSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type QuestionDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type UnconfirmedQuestionRead = {
  items: OpenQuestionSignal[];
  code: QuestionDenialCode | null;
  count: number;
};

function trustedEvidenceOrganization(
  session: TrustedEvidenceSession | null | undefined,
): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsQuestionScope(session: TrustedEvidenceSession | null | undefined): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === UNCONFIRMED_QUESTION_SCOPE);
}

/**
 * Bounded question detection. Not a model.
 * An outbound reply is not available here, and would not close the question.
 * Question text is copied only from messages whose organizationId is the
 * authenticated session tenant. Another tenant's text is never projected.
 */
export function readUnconfirmedCustomerQuestions(
  messages: readonly NormalizedConversationMessage[],
  session?: TrustedEvidenceSession | null,
): UnconfirmedQuestionRead {
  const organizationId = trustedEvidenceOrganization(session);
  if (!organizationId) return { items: [], code: 'AUTH_REQUIRED', count: 0 };
  if (!holdsQuestionScope(session)) return { items: [], code: 'ROLE_FORBIDDEN', count: 0 };

  const items: OpenQuestionSignal[] = [];
  for (const message of messages) {
    if (message.organizationId !== organizationId) continue;
    if (!questionRemainsOpen({ text: message.text, markedResolved: false })) continue;
    items.push({
      messageId: message.id,
      text: message.text,
      sourceType: 'customer_message',
      confirmationState: 'unconfirmed',
      companyConfirmed: false,
      resolvedByOutbound: false,
      origin: 'deterministic',
    });
  }
  return { items, code: null, count: items.length };
}

export function listUnconfirmedCustomerQuestions(
  messages: readonly NormalizedConversationMessage[],
  session?: TrustedEvidenceSession | null,
): OpenQuestionSignal[] {
  return readUnconfirmedCustomerQuestions(messages, session).items;
}

export type ConversationIntelligenceRequest = {
  organizationId: string;
  conversationId: string;
  messages: readonly NormalizedConversationMessage[];
};

export type ConversationIntelligenceBrief = {
  mode: 'not_live';
  live: false;
  modelCalled: false;
  providerCalled: false;
  whatCustomerAsked: readonly [];
  whatWasPromised: readonly [];
  whatIsMissing: readonly [];
  whatTheyAreWaitingFor: readonly [];
  whatChanged: readonly [];
  nextStep: null;
  companyConfirmed: false;
  canonicalMutation: 'refused';
};

export type ConversationIntelligence = {
  readonly live: false;
  readonly mode: 'not_live';
  summarize(request: ConversationIntelligenceRequest): ConversationIntelligenceBrief;
};

const NOT_LIVE_INTELLIGENCE: ConversationIntelligenceBrief = {
  mode: 'not_live',
  live: false,
  modelCalled: false,
  providerCalled: false,
  whatCustomerAsked: [],
  whatWasPromised: [],
  whatIsMissing: [],
  whatTheyAreWaitingFor: [],
  whatChanged: [],
  nextStep: null,
  companyConfirmed: false,
  canonicalMutation: 'refused',
};

/** Future conversation summary. Does not invent promises, gaps, or a next step. */
export const futureConversationIntelligence: ConversationIntelligence = {
  live: false,
  mode: 'not_live',
  summarize(request) {
    void request;
    return NOT_LIVE_INTELLIGENCE;
  },
};

export function summarizeConversation(
  request: ConversationIntelligenceRequest,
): ConversationIntelligenceBrief {
  return futureConversationIntelligence.summarize(request);
}

export const MEDIA_EVIDENCE_TYPES = ['image', 'pdf', 'audio', 'location', 'document'] as const;
export type MediaEvidenceType = (typeof MEDIA_EVIDENCE_TYPES)[number];

export type DeferredMediaCapture = {
  liveInterpretation: false;
  providerMediaId: string;
  filename: string | null;
  mediaType: MediaEvidenceType;
  occurredAt: string;
  conversationId: string;
  senderLabel: string | null;
};

/** Stores attachment metadata only. Does not OCR, transcribe, or confirm a receipt. */
export function captureMediaMetadata(
  input: Omit<DeferredMediaCapture, 'liveInterpretation'>,
): DeferredMediaCapture {
  return { ...input, liveInterpretation: false };
}

export type VoiceTranscriptionResult = {
  live: false;
  transcript: null;
  label: 'Transcripción automática';
  moreAuthoritativeThanAudio: false;
  modelCalled: false;
};

/** Future voice transcription. The original audio stays more authoritative. */
export function transcribeVoiceNote(_audioEvidenceId: string): VoiceTranscriptionResult {
  return {
    live: false,
    transcript: null,
    label: 'Transcripción automática',
    moreAuthoritativeThanAudio: false,
    modelCalled: false,
  };
}

export type SharedLocationEvidence = {
  latitude: number;
  longitude: number;
  occurredAt: string;
  conversationId: string;
  providerMessageId: string | null;
  replacesCanonicalLocation: false;
  companyConfirmed: false;
};

/** A shared pin is evidence. It does not replace the canonical location. */
export function recordSharedLocationEvidence(
  input: Omit<SharedLocationEvidence, 'replacesCanonicalLocation' | 'companyConfirmed'>,
): SharedLocationEvidence {
  return {
    ...input,
    replacesCanonicalLocation: false,
    companyConfirmed: false,
  };
}
