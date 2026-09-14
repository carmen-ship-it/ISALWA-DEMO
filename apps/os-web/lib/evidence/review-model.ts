/**
 * Evidence review view model.
 * Imports conversation evidence by private path. packages/os-contracts/src/index.ts
 * must not barrel-export that module.
 */
import type { EvidenceConflict, EvidenceFact } from '@isalwa/os-contracts';
import {
  admitExtractionCandidate,
  buildAiReadyContext,
  customerMessageConfirmsPayment,
  customerStatementIsCompanyConfirmed,
  extractCommitments,
  listUnconfirmedCustomerQuestions,
  reviewEvidence,
  summarizeConversation,
  type ExtractionCandidate,
  type NormalizedConversationMessage,
} from '../../../../packages/os-contracts/src/conversation-evidence';
import {
  confidenceExplainsUnderstandingOnly,
  confidenceLabel,
  confirmationLabel,
  sourceLabel,
} from './labels';
import {
  COMMITMENT_NOT_LIVE,
  CONFIDENCE_ABSENT,
  CONFLICT_TITLES,
  CUSTOMER_NOT_COMPANY_TRUTH,
  DISMISS_SUCCESS,
  HISTORY_KEPT,
  INTELLIGENCE_NOT_LIVE,
  LINK_SUCCESS,
  MESSAGE_NOT_CONFIRMED_PAYMENT,
  MODEL_NOT_CALLED,
  NO_CANONICAL_CHANGE,
  PAYMENT_NOTICE,
  PROVIDER_NOT_CALLED,
  QUESTION_OUTBOUND_NOTE,
  REPORTED_SUCCESS,
  REVIEW_REFUSAL_COPY,
} from './review-copy';

export type EvidenceReviewCardModel = {
  id: string;
  interpretation: string;
  source: string;
  confidence: string | null;
  confirmation: string;
  confidenceNote: string | null;
  why: string | null;
  excerpt: string | null;
  sourceHref: string | null;
  paymentNotice: string | null;
  companyConfirmed: false;
  paymentConfirmed: false;
  canRegister: boolean;
  canDismiss: boolean;
  canLink: boolean;
  historyNote: string | null;
  blockedReason: string | null;
  fact: EvidenceFact | null;
};

export type EvidenceContextRow = {
  id: string;
  text: string;
  source: string;
  confidence: string;
  confirmation: string;
  companyConfirmed: false;
  paymentConfirmed: false;
};

export type EvidenceReviewPanelModel = {
  boundary: string;
  paymentRule: string;
  commitmentStatus: string;
  intelligenceStatus: string;
  modelStatus: string;
  providerStatus: string;
  actorMissing: string | null;
  cards: EvidenceReviewCardModel[];
  openQuestions: readonly { messageId: string; text: string; confirmation: string; note: string }[];
  conflicts: readonly { id: string; title: string; customerSaid: string; currentTruth: string; notice: string }[];
  contextItems: readonly EvidenceContextRow[];
};

function authoritative(fact: EvidenceFact): boolean {
  return fact.sourceType === 'external_system' || fact.sourceType === 'isalwa_confirmed';
}

function cardFromFact(
  fact: EvidenceFact,
  sourceHref: string | null,
  actorPresent: boolean,
): EvidenceReviewCardModel {
  const blocked = authoritative(fact);
  const dismissed = fact.confirmationState === 'dismissed';
  return {
    id: fact.id,
    interpretation: fact.interpretation,
    source: sourceLabel(fact.sourceType),
    confidence: fact.confidence ? confidenceLabel(fact.confidence) : null,
    confirmation: confirmationLabel(fact.confirmationState),
    confidenceNote: fact.confidence ? confidenceExplainsUnderstandingOnly() : null,
    why: fact.why,
    excerpt: fact.sourceExcerpt,
    sourceHref,
    paymentNotice: fact.kind === 'payment_claim' ? PAYMENT_NOTICE : null,
    companyConfirmed: false,
    paymentConfirmed: false,
    canRegister: actorPresent && !blocked && !dismissed && fact.confirmationState !== 'reviewed',
    canDismiss: actorPresent && !blocked && !dismissed,
    canLink: actorPresent,
    historyNote: fact.revisions.length > 0 ? HISTORY_KEPT : null,
    blockedReason: blocked ? REVIEW_REFUSAL_COPY.authoritative_override_refused : null,
    fact,
  };
}

export function buildEvidenceReviewModel(input: {
  organizationId: string;
  conversationId: string;
  builtAt: string;
  actorMemberId: string;
  messages: readonly NormalizedConversationMessage[];
  candidates: readonly ExtractionCandidate[];
  conflicts?: readonly EvidenceConflict[];
  sourceHrefFor?: (messageId: string) => string | null;
}): EvidenceReviewPanelModel {
  const actorPresent = input.actorMemberId.trim().length > 0;
  const sameTenantCandidates = input.candidates.filter(
    (candidate) =>
      candidate.organizationId === input.organizationId && candidate.conversationId === input.conversationId,
  );
  const cards: EvidenceReviewCardModel[] = sameTenantCandidates.map((candidate) => {
    const href = input.sourceHrefFor?.(candidate.messageId) ?? null;
    const admitted = admitExtractionCandidate(candidate);
    if (!admitted.admitted) {
      return {
        id: candidate.id,
        interpretation: candidate.interpretation,
        source: sourceLabel(candidate.sourceType),
        confidence: confidenceLabel(candidate.confidence),
        confirmation: confirmationLabel(candidate.confirmationState),
        confidenceNote: confidenceExplainsUnderstandingOnly(),
        why: candidate.why,
        excerpt: candidate.sourceExcerpt,
        sourceHref: href,
        paymentNotice: PAYMENT_NOTICE,
        companyConfirmed: false,
        paymentConfirmed: false,
        canRegister: false,
        canDismiss: false,
        canLink: false,
        historyNote: null,
        blockedReason: REVIEW_REFUSAL_COPY.payment_confirmation_refused,
        fact: null,
      };
    }
    return cardFromFact(admitted.fact, href, actorPresent);
  });

  const sameConversation = input.messages.filter(
    (message) =>
      message.organizationId === input.organizationId && message.conversationId === input.conversationId,
  );
  const context = buildAiReadyContext({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    builtAt: input.builtAt,
    messages: sameConversation,
    candidates: sameTenantCandidates,
  });
  const extraction = extractCommitments({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    messageId: sameConversation[0]?.id ?? 'none',
    text: sameConversation[0]?.text ?? '',
    speaker: 'customer',
  });
  const brief = summarizeConversation({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    messages: sameConversation,
  });
  void extraction.candidates;
  void brief.whatWasPromised;

  return {
    boundary: CUSTOMER_NOT_COMPANY_TRUTH,
    paymentRule: MESSAGE_NOT_CONFIRMED_PAYMENT,
    commitmentStatus: extraction.live ? '' : COMMITMENT_NOT_LIVE,
    intelligenceStatus: brief.live ? '' : INTELLIGENCE_NOT_LIVE,
    modelStatus: context.modelCalled ? '' : MODEL_NOT_CALLED,
    providerStatus: context.providerCalled ? '' : PROVIDER_NOT_CALLED,
    actorMissing: actorPresent ? null : REVIEW_REFUSAL_COPY.missing_actor,
    cards,
    openQuestions: listUnconfirmedCustomerQuestions(sameConversation).map((question) => ({
      messageId: question.messageId,
      text: question.text,
      confirmation: confirmationLabel(question.confirmationState),
      note: QUESTION_OUTBOUND_NOTE,
    })),
    conflicts: (input.conflicts ?? []).map((conflict, index) => ({
      id: `${conflict.kind}-${index}`,
      title: CONFLICT_TITLES[conflict.kind],
      customerSaid: conflict.customerSaid,
      currentTruth: conflict.currentTruth,
      notice: NO_CANONICAL_CHANGE,
    })),
    contextItems: [
      ...context.messages.map((message) => ({
        id: message.messageId,
        text: message.text,
        source: sourceLabel(message.sourceType),
        confidence: CONFIDENCE_ABSENT,
        confirmation: confirmationLabel(message.confirmationState),
        companyConfirmed: customerStatementIsCompanyConfirmed(message.confirmationState),
        paymentConfirmed: customerMessageConfirmsPayment(message.text),
      })),
      ...context.interpretations.map((item) => ({
        id: item.id,
        text: item.interpretation,
        source: sourceLabel(item.sourceType),
        confidence: item.confidence ? confidenceLabel(item.confidence) : CONFIDENCE_ABSENT,
        confirmation: confirmationLabel(item.confirmationState),
        companyConfirmed: false as const,
        paymentConfirmed: customerMessageConfirmsPayment(item.sourceExcerpt),
      })),
    ],
  };
}

export type ReviewNotice = { ok: boolean; text: string; card: EvidenceReviewCardModel };

function unchanged(card: EvidenceReviewCardModel, text: string): ReviewNotice {
  return { ok: false, text, card };
}

export function registerReported(
  card: EvidenceReviewCardModel,
  input: { at: string; actorMemberId: string },
): ReviewNotice {
  if (!card.fact) return unchanged(card, card.blockedReason ?? REVIEW_REFUSAL_COPY.payment_confirmation_refused);
  const result = reviewEvidence(card.fact, { action: 'register_as_reported', ...input });
  if (!result.accepted) return unchanged(card, REVIEW_REFUSAL_COPY[result.reason]);
  return {
    ok: true,
    text: REPORTED_SUCCESS,
    card: cardFromFact(result.fact, card.sourceHref, true),
  };
}

export function dismissReading(
  card: EvidenceReviewCardModel,
  input: { at: string; actorMemberId: string; reason: string | null },
): ReviewNotice {
  if (!card.fact) return unchanged(card, card.blockedReason ?? REVIEW_REFUSAL_COPY.payment_confirmation_refused);
  const result = reviewEvidence(card.fact, { action: 'dismiss', ...input });
  if (!result.accepted) return unchanged(card, REVIEW_REFUSAL_COPY[result.reason]);
  return {
    ok: true,
    text: DISMISS_SUCCESS,
    card: cardFromFact(result.fact, card.sourceHref, true),
  };
}

export function linkExistingRecord(
  card: EvidenceReviewCardModel,
  input: { at: string; actorMemberId: string; relatedRecordType: string; relatedRecordId: string },
): ReviewNotice {
  if (!card.fact) return unchanged(card, card.blockedReason ?? REVIEW_REFUSAL_COPY.payment_confirmation_refused);
  const result = reviewEvidence(card.fact, { action: 'link_existing', ...input });
  if (!result.accepted) return unchanged(card, REVIEW_REFUSAL_COPY[result.reason]);
  return {
    ok: true,
    text: LINK_SUCCESS,
    card: cardFromFact(result.fact, card.sourceHref, true),
  };
}
