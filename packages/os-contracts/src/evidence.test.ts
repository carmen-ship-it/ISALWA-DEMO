import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyEvidenceCorrection,
  detectEvidenceConflict,
  extractionMayMutateCanonical,
  paymentClaimMayBeConfirmed,
  questionRemainsOpen,
  TRUTH_LEVEL,
  type EvidenceFact,
} from './evidence';

const paymentClaim: EvidenceFact = {
  id: 'ev1',
  organizationId: 'org',
  truthLevel: TRUTH_LEVEL.interpretation,
  kind: 'payment_claim',
  interpretation: 'Posible pago reportado · Bs 4.500',
  sourceType: 'customer_message',
  sourceChannel: 'whatsapp',
  providerMessageId: 'msg-1',
  conversationId: 'conv-1',
  sourceTimestamp: '2026-09-14T14:42:00.000Z',
  sourceActorLabel: 'Cliente',
  extractedBy: 'ai',
  extractionTimestamp: '2026-09-14T14:43:00.000Z',
  confidence: 'high',
  confirmationState: 'unconfirmed',
  confirmedByMemberId: null,
  confirmedAt: null,
  relatedRecordType: null,
  relatedRecordId: null,
  why: 'El cliente escribió: Ya hice la transferencia por 4.500.',
  sourceExcerpt: 'Ya hice la transferencia por 4.500, te mando el comprobante.',
  revisions: [],
};

describe('whatsapp evidence is not truth', () => {
  it('does not confirm a customer payment claim', () => {
    assert.equal(paymentClaimMayBeConfirmed('customer_message'), false);
    assert.equal(paymentClaimMayBeConfirmed('ai_inferred'), false);
    assert.equal(paymentClaimMayBeConfirmed('employee_entered'), false);
    assert.equal(paymentClaimMayBeConfirmed('isalwa_confirmed'), false);
    assert.equal(paymentClaimMayBeConfirmed('external_system'), true);
    assert.equal(extractionMayMutateCanonical(), false);
  });

  it('keeps a dismissed interpretation and does not delete the original', () => {
    const corrected = applyEvidenceCorrection(paymentClaim, {
      at: '2026-09-14T15:00:00.000Z',
      actorMemberId: 'mem-1',
      action: 'dismiss',
      reason: 'Era una pregunta, no una confirmación.',
    });
    assert.equal(corrected.confirmationState, 'dismissed');
    assert.equal(corrected.revisions.length, 1);
    assert.equal(corrected.revisions[0]?.previousInterpretation, paymentClaim.interpretation);
    assert.equal(corrected.revisions[0]?.reason, 'Era una pregunta, no una confirmación.');
    assert.equal(paymentClaim.confirmationState, 'unconfirmed');
  });

  it('shows a quantity conflict without changing the order', () => {
    const conflicts = detectEvidenceConflict({
      customerQuantity: 40,
      orderQuantity: 30,
      customerClaimsPaid: true,
      hasConfirmedPayment: false,
      customerAmountLabel: null,
      canonicalAmountLabel: null,
      customerLocationLabel: null,
      currentLocationLabel: null,
    });
    assert.equal(conflicts.some((item) => item.kind === 'quantity' && item.currentTruth === '30'), true);
    assert.equal(conflicts.some((item) => item.kind === 'payment'), true);
    assert.equal(extractionMayMutateCanonical(), false);
  });

  it('does not close a question only because someone replied', () => {
    assert.equal(questionRemainsOpen({ text: '¿Cuándo llega?', markedResolved: false }), true);
    assert.equal(questionRemainsOpen({ text: '¿Cuándo llega?', markedResolved: true }), false);
  });
});
