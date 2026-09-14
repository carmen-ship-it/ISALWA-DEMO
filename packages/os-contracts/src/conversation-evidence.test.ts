import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EXTRACTION_CONFIDENCE,
  TRUTH_LEVEL,
  applyEvidenceCorrection,
  type EvidenceFact,
} from './evidence';
import {
  admitExtractionCandidate,
  buildAiReadyContext,
  captureMediaMetadata,
  classifyExactSameTenantPhoneMatch,
  confirmPaymentFromMessage,
  confidenceWord,
  customerMessageConfirmsPayment,
  customerStatementIsCompanyConfirmed,
  extractCommitments,
  futureCommitmentExtractor,
  listUnconfirmedCustomerQuestions,
  normalizedConversationMessage,
  parseExtractionConfidence,
  recordExtractionCorrection,
  recordSharedLocationEvidence,
  refuseUngovernedExtraction,
  reviewEvidence,
  sealFutureCommitmentCandidate,
  summarizeConversation,
  transcribeVoiceNote,
  type ExtractionCandidate,
  type NormalizedConversationMessage,
} from './conversation-evidence';

const paymentCandidate: ExtractionCandidate = {
  id: 'cand-1',
  organizationId: 'org-a',
  conversationId: 'conv-1',
  messageId: 'msg-1',
  kind: 'payment_claim',
  interpretation: 'Posible pago reportado · Bs 4.500',
  sourceType: 'customer_message',
  sourceChannel: 'whatsapp',
  confidence: 'high',
  confirmationState: 'unconfirmed',
  sourceExcerpt: 'Ya hice la transferencia por 4.500, te mando el comprobante.',
  why: 'El cliente escribió: Ya hice la transferencia por 4.500.',
};

describe('normalized conversation evidence', () => {
  it('keeps a message at the normalized level without a provider payload', () => {
    const message = normalizedConversationMessage({
      id: 'msg-1',
      organizationId: 'org-a',
      conversationId: 'conv-1',
      channel: 'whatsapp',
      occurredAt: '2026-09-14T14:42:00.000Z',
      phoneKey: '59170011111',
      text: 'Ya hice la transferencia por 4.500.',
      providerMessageId: 'provider-1',
    });
    assert.equal(message.truthLevel, TRUTH_LEVEL.normalizedMessage);
    assert.equal(message.direction, 'inbound');
    assert.equal('webhook' in message, false);
    assert.equal('accessToken' in message, false);
  });

  it('matches a phone only when one party in the same tenant has the exact key', () => {
    const matched = classifyExactSameTenantPhoneMatch({
      organizationId: 'org-a',
      phoneKey: '59170011111',
      candidates: [
        { organizationId: 'org-b', partyId: 'other-tenant', phoneKey: '59170011111' },
        { organizationId: 'org-a', partyId: 'party-1', phoneKey: '59170011111' },
        { organizationId: 'org-a', partyId: 'party-1', phoneKey: '59170011111' },
        { organizationId: 'org-a', partyId: 'party-2', phoneKey: '59170022222' },
      ],
    });
    assert.equal(matched.outcome, 'matched');
    if (matched.outcome === 'matched') {
      assert.equal(matched.partyId, 'party-1');
      assert.equal(matched.organizationId, 'org-a');
    }

    const ambiguous = classifyExactSameTenantPhoneMatch({
      organizationId: 'org-a',
      phoneKey: '59170011111',
      candidates: [
        { organizationId: 'org-a', partyId: 'party-1', phoneKey: '59170011111' },
        { organizationId: 'org-a', partyId: 'party-3', phoneKey: '59170011111' },
      ],
    });
    assert.equal(ambiguous.outcome, 'ambiguous');
    if (ambiguous.outcome === 'ambiguous') {
      assert.deepEqual(ambiguous.partyIds, ['party-1', 'party-3']);
      assert.equal('partyId' in ambiguous, false);
    }

    const unmatched = classifyExactSameTenantPhoneMatch({
      organizationId: 'org-a',
      phoneKey: '59170011111',
      candidates: [{ organizationId: 'org-a', partyId: 'party-2', phoneKey: '5917001111' }],
    });
    assert.equal(unmatched.outcome, 'unmatched');
    assert.equal(
      classifyExactSameTenantPhoneMatch({ organizationId: '', phoneKey: '1', candidates: [] })
        .outcome,
      'refused',
    );
    assert.equal(
      classifyExactSameTenantPhoneMatch({ organizationId: 'org-a', phoneKey: '  ', candidates: [] })
        .outcome,
      'refused',
    );
  });

  it('requires source, ordinal confidence, and confirmation, never a percentage', () => {
    assert.equal(confidenceWord(paymentCandidate.confidence), 'alta');
    assert.equal(confidenceWord('medium'), 'media');
    assert.equal(confidenceWord('low'), 'baja');
    assert.deepEqual(
      EXTRACTION_CONFIDENCE.map((value) => confidenceWord(value)),
      ['alta', 'media', 'baja'],
    );
    assert.equal(parseExtractionConfidence('alta'), 'high');
    assert.equal(parseExtractionConfidence('87%'), null);
    assert.equal(parseExtractionConfidence(0.87), null);
    assert.equal(parseExtractionConfidence(87), null);
    assert.equal(typeof paymentCandidate.confidence, 'string');
    assert.equal(paymentCandidate.confirmationState, 'unconfirmed');
    assert.equal(paymentCandidate.sourceType, 'customer_message');
  });

  it('refuses canonical mutation and refuses payment confirmation unless the source is an external system', () => {
    for (const sourceType of [
      'customer_message',
      'employee_entered',
      'ai_inferred',
      'isalwa_confirmed',
    ] as const) {
      const decision = refuseUngovernedExtraction(sourceType);
      assert.equal(decision.canonicalMutation, 'refused');
      assert.equal(decision.paymentConfirmation, 'refused');
      assert.equal(decision.customerPaymentAutoConfirmed, false);
    }
    const external = refuseUngovernedExtraction('external_system');
    assert.equal(external.canonicalMutation, 'refused');
    assert.equal(external.paymentConfirmation, 'allowed');
    assert.equal(external.customerPaymentAutoConfirmed, false);

    const admitted = admitExtractionCandidate(paymentCandidate);
    assert.equal(admitted.admitted, true);
    if (admitted.admitted) {
      assert.equal(admitted.fact.confirmationState, 'unconfirmed');
      assert.equal(admitted.fact.relatedRecordId, null);
      assert.equal(admitted.authority.canonicalMutation, 'refused');
    }

    const refused = admitExtractionCandidate({
      ...paymentCandidate,
      confirmationState: 'confirmed',
    });
    assert.equal(refused.admitted, false);
    if (!refused.admitted) {
      assert.equal(refused.reason, 'payment_confirmation_refused');
    }

    const externalPayment = admitExtractionCandidate({
      ...paymentCandidate,
      sourceType: 'external_system',
      sourceChannel: 'external',
      confirmationState: 'confirmed',
    });
    assert.equal(externalPayment.admitted, true);
    if (externalPayment.admitted) {
      assert.equal(externalPayment.fact.confirmationState, 'confirmed');
      assert.equal(externalPayment.authority.canonicalMutation, 'refused');
      assert.equal(externalPayment.fact.relatedRecordType, null);
    }
  });

  it('keeps correction history and still refuses a canonical write', () => {
    const admitted = admitExtractionCandidate(paymentCandidate);
    assert.equal(admitted.admitted, true);
    if (!admitted.admitted) return;

    const corrected = recordExtractionCorrection(admitted.fact, {
      at: '2026-09-14T15:00:00.000Z',
      actorMemberId: 'mem-1',
      action: 'dismiss',
      reason: 'Era una pregunta, no una confirmación.',
    });
    const expected = applyEvidenceCorrection(admitted.fact, {
      at: '2026-09-14T15:00:00.000Z',
      actorMemberId: 'mem-1',
      action: 'dismiss',
      reason: 'Era una pregunta, no una confirmación.',
    });
    assert.equal(corrected.confirmationState, 'dismissed');
    assert.equal(corrected.revisions[0]?.previousInterpretation, paymentCandidate.interpretation);
    assert.equal(corrected.interpretation, paymentCandidate.interpretation);
    assert.deepEqual(corrected.revisions, expected.revisions);
    assert.equal(admitted.fact.revisions.length, 0);
    assert.equal(corrected.authority.canonicalMutation, 'refused');
    assert.equal(corrected.authority.paymentConfirmation, 'refused');
    const stillAFact: EvidenceFact = corrected;
    assert.equal(stillAFact.kind, 'payment_claim');
  });
});

const inbound = (overrides: Partial<NormalizedConversationMessage> = {}): NormalizedConversationMessage =>
  normalizedConversationMessage({
    id: 'msg-1',
    organizationId: 'org-a',
    conversationId: 'conv-1',
    channel: 'whatsapp',
    occurredAt: '2026-09-14T14:42:00.000Z',
    phoneKey: '59170011111',
    text: 'Ya hice la transferencia por 4.500. ¿Cuándo sale el pedido?',
    providerMessageId: 'provider-1',
    ...overrides,
  });

describe('evidence review and AI-ready context', () => {
  it('keeps a customer statement from becoming company truth or a confirmed payment', () => {
    assert.equal(customerStatementIsCompanyConfirmed('confirmed'), false);
    assert.equal(customerStatementIsCompanyConfirmed('reviewed'), false);
    assert.equal(customerMessageConfirmsPayment('Ya pagué'), false);
    assert.equal(customerMessageConfirmsPayment(paymentCandidate.sourceExcerpt), false);
    const refused = confirmPaymentFromMessage('customer_message');
    assert.equal(refused.accepted, false);
    assert.equal(refused.paymentConfirmed, false);
    assert.equal(refused.canonicalMutation, 'refused');
    assert.equal(confirmPaymentFromMessage('external_system').accepted, false);
  });

  it('registers a reported reading without confirming payment or mutating a record', () => {
    const admitted = admitExtractionCandidate(paymentCandidate);
    assert.equal(admitted.admitted, true);
    if (!admitted.admitted) return;

    const reviewed = reviewEvidence(admitted.fact, {
      action: 'register_as_reported',
      at: '2026-09-14T15:10:00.000Z',
      actorMemberId: 'mem-1',
    });
    assert.equal(reviewed.accepted, true);
    assert.equal(reviewed.paymentConfirmed, false);
    assert.equal(reviewed.companyConfirmed, false);
    assert.equal(reviewed.canonicalMutation, 'refused');
    assert.equal(reviewed.relatedRecordMutated, false);
    if (!reviewed.accepted) return;
    assert.equal(reviewed.fact.confirmationState, 'reviewed');
    assert.equal(reviewed.fact.confidence, 'high');
    assert.equal(reviewed.fact.sourceType, 'customer_message');
    assert.equal(reviewed.fact.relatedRecordId, null);
    assert.equal(reviewed.fact.revisions[0]?.previousConfirmationState, 'unconfirmed');
    assert.match(reviewed.fact.revisions[0]?.reason ?? '', /No confirma el cobro/);
    assert.equal(admitted.fact.confirmationState, 'unconfirmed');

    const again = reviewEvidence(reviewed.fact, {
      action: 'register_as_reported',
      at: '2026-09-14T15:11:00.000Z',
      actorMemberId: 'mem-1',
    });
    assert.equal(again.accepted, true);
    if (again.accepted) assert.equal(again.fact.revisions.length, 1);
  });

  it('dismisses and links without writing the linked record or overriding an authoritative source', () => {
    const admitted = admitExtractionCandidate(paymentCandidate);
    assert.equal(admitted.admitted, true);
    if (!admitted.admitted) return;

    const linked = reviewEvidence(admitted.fact, {
      action: 'link_existing',
      at: '2026-09-14T15:12:00.000Z',
      actorMemberId: 'mem-1',
      relatedRecordType: 'quote',
      relatedRecordId: 'quo-1',
    });
    assert.equal(linked.accepted, true);
    assert.equal(linked.relatedRecordMutated, false);
    assert.equal(linked.canonicalMutation, 'refused');
    if (linked.accepted) {
      assert.equal(linked.fact.relatedRecordType, 'quote');
      assert.equal(linked.fact.relatedRecordId, 'quo-1');
      assert.equal(linked.fact.confirmationState, 'unconfirmed');
    }

    const missing = reviewEvidence(admitted.fact, {
      action: 'link_existing',
      at: '2026-09-14T15:12:00.000Z',
      actorMemberId: 'mem-1',
      relatedRecordType: '  ',
      relatedRecordId: 'quo-1',
    });
    assert.equal(missing.accepted, false);
    if (!missing.accepted) assert.equal(missing.reason, 'missing_link');

    const dismissed = reviewEvidence(admitted.fact, {
      action: 'dismiss',
      at: '2026-09-14T15:13:00.000Z',
      actorMemberId: 'mem-1',
      reason: 'Era una pregunta, no una confirmación.',
    });
    assert.equal(dismissed.accepted, true);
    if (dismissed.accepted) {
      assert.equal(dismissed.fact.confirmationState, 'dismissed');
      assert.equal(dismissed.fact.revisions[0]?.previousInterpretation, paymentCandidate.interpretation);
    }

    const external = admitExtractionCandidate({
      ...paymentCandidate,
      sourceType: 'external_system',
      sourceChannel: 'external',
    });
    assert.equal(external.admitted, true);
    if (!external.admitted) return;
    const blocked = reviewEvidence(external.fact, {
      action: 'dismiss',
      at: '2026-09-14T15:14:00.000Z',
      actorMemberId: 'mem-1',
      reason: null,
    });
    assert.equal(blocked.accepted, false);
    if (!blocked.accepted) assert.equal(blocked.reason, 'authoritative_override_refused');
    assert.equal(
      reviewEvidence(admitted.fact, { action: 'register_as_reported', at: ' ', actorMemberId: 'mem-1' })
        .accepted,
      false,
    );
  });

  it('builds AI-ready context without a model, a provider, or another tenant', () => {
    const context = buildAiReadyContext({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      builtAt: '2026-09-14T15:20:00.000Z',
      messages: [
        inbound(),
        inbound({
          id: 'msg-other',
          organizationId: 'org-b',
          text: 'Secreto de otro tenant',
        }),
      ],
      candidates: [
        paymentCandidate,
        { ...paymentCandidate, id: 'cand-other', organizationId: 'org-b', interpretation: 'Otro tenant' },
        { ...paymentCandidate, id: 'cand-confirmed', confirmationState: 'confirmed' },
      ],
    });
    assert.equal(context.modelCalled, false);
    assert.equal(context.providerCalled, false);
    assert.match(context.boundary, /no es verdad confirmada/);
    assert.match(context.boundary, /no confirma un pago/);
    assert.equal(context.messages.length, 1);
    assert.equal(context.messages[0]?.companyConfirmed, false);
    assert.equal(context.messages[0]?.paymentConfirmed, false);
    assert.equal(context.messages[0]?.confirmationState, 'unconfirmed');
    assert.equal(context.messages[0]?.confidence, null);
    assert.equal(context.messages[0]?.sourceType, 'customer_message');
    assert.equal(context.interpretations.length, 2);
    assert.equal(context.interpretations[0]?.confidence, 'high');
    assert.equal(context.interpretations[0]?.confirmationState, 'unconfirmed');
    assert.equal(context.interpretations[0]?.companyConfirmed, false);
    assert.equal(context.interpretations[1]?.confirmationState, 'confirmed');
    assert.equal(context.interpretations[1]?.companyConfirmed, false);
    assert.equal(context.interpretations[1]?.paymentConfirmed, false);
    const serialized = JSON.stringify(context);
    assert.equal(serialized.includes('Secreto de otro tenant'), false);
    assert.equal(serialized.includes('accessToken'), false);
    assert.equal(serialized.includes('webhook'), false);
    assert.equal(serialized.includes('openai'), false);
  });

  it('does not extract commitments or summarize a conversation live', () => {
    const extraction = extractCommitments({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      text: 'Te confirmo mañana. Ya pagué.',
      speaker: 'employee',
    });
    assert.equal(extraction.live, false);
    assert.equal(extraction.extracted, false);
    assert.equal(extraction.modelCalled, false);
    assert.equal(extraction.providerCalled, false);
    assert.equal(extraction.candidates.length, 0);
    assert.equal(extraction.companyConfirmed, false);
    assert.equal(extraction.paymentConfirmed, false);
    assert.equal(extraction.canonicalMutation, 'refused');
    assert.equal(futureCommitmentExtractor.live, false);
    assert.equal(
      futureCommitmentExtractor.propose({
        organizationId: 'org-a',
        conversationId: 'conv-1',
        messageId: 'msg-1',
        text: 'Ya pagué',
        speaker: 'customer',
      }).candidates.length,
      0,
    );

    const sealed = sealFutureCommitmentCandidate({
      kind: 'payment_claim',
      interpretation: 'Posible pago reportado',
      sourceExcerpt: 'Ya pagué',
      speaker: 'customer',
      sourceType: 'customer_message',
      confidence: 'high',
    });
    assert.equal(sealed.confirmationState, 'unconfirmed');
    assert.equal(sealed.companyConfirmed, false);
    assert.equal(sealed.paymentConfirmed, false);
    assert.equal(sealed.canonicalMutation, 'refused');

    const brief = summarizeConversation({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      messages: [inbound({ text: 'Te mando la cotización hoy. ¿Cuándo llega?' })],
    });
    assert.equal(brief.live, false);
    assert.equal(brief.modelCalled, false);
    assert.equal(brief.whatWasPromised.length, 0);
    assert.equal(brief.whatCustomerAsked.length, 0);
    assert.equal(brief.nextStep, null);
    assert.equal(brief.canonicalMutation, 'refused');

    const questions = listUnconfirmedCustomerQuestions([
      inbound({ id: 'q-1', text: '¿Cuándo llega?' }),
      inbound({ id: 'plain', text: 'Ya pagué' }),
    ]);
    assert.equal(questions.length, 1);
    assert.equal(questions[0]?.messageId, 'q-1');
    assert.equal(questions[0]?.confirmationState, 'unconfirmed');
    assert.equal(questions[0]?.companyConfirmed, false);
    assert.equal(questions[0]?.resolvedByOutbound, false);
    assert.equal(questions[0]?.origin, 'deterministic');
  });

  it('keeps media, voice, and a shared pin from becoming canonical truth', () => {
    const media = captureMediaMetadata({
      providerMediaId: 'media-1',
      filename: 'comprobante.pdf',
      mediaType: 'pdf',
      occurredAt: '2026-09-14T14:42:00.000Z',
      conversationId: 'conv-1',
      senderLabel: 'Cliente',
    });
    assert.equal(media.liveInterpretation, false);
    const voice = transcribeVoiceNote('audio-1');
    assert.equal(voice.live, false);
    assert.equal(voice.transcript, null);
    assert.equal(voice.moreAuthoritativeThanAudio, false);
    assert.equal(voice.modelCalled, false);
    const pin = recordSharedLocationEvidence({
      latitude: -17.78,
      longitude: -63.18,
      occurredAt: '2026-09-14T14:42:00.000Z',
      conversationId: 'conv-1',
      providerMessageId: 'provider-1',
    });
    assert.equal(pin.replacesCanonicalLocation, false);
    assert.equal(pin.companyConfirmed, false);
  });
});
