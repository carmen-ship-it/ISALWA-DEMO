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
  classifyExactSameTenantPhoneMatch,
  confidenceWord,
  normalizedConversationMessage,
  parseExtractionConfidence,
  recordExtractionCorrection,
  refuseUngovernedExtraction,
  type ExtractionCandidate,
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
