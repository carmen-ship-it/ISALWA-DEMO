import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizedConversationMessage, type ExtractionCandidate } from '../../../../packages/os-contracts/src/conversation-evidence';
import {
  buildEvidenceReviewModel,
  dismissReading,
  linkExistingRecord,
  registerReported,
} from './review-model';

const candidate: ExtractionCandidate = {
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

const message = normalizedConversationMessage({
  id: 'msg-1',
  organizationId: 'org-a',
  conversationId: 'conv-1',
  channel: 'whatsapp',
  occurredAt: '2026-09-14T14:42:00.000Z',
  phoneKey: '59170011111',
  text: 'Ya hice la transferencia por 4.500. ¿Cuándo sale el pedido?',
  providerMessageId: null,
});

function employeeCopy(model: ReturnType<typeof buildEvidenceReviewModel>): string {
  return JSON.stringify({
    boundary: model.boundary,
    paymentRule: model.paymentRule,
    commitmentStatus: model.commitmentStatus,
    intelligenceStatus: model.intelligenceStatus,
    modelStatus: model.modelStatus,
    providerStatus: model.providerStatus,
    actorMissing: model.actorMissing,
    cards: model.cards.map((card) => ({
      interpretation: card.interpretation,
      source: card.source,
      confidence: card.confidence,
      confirmation: card.confirmation,
      why: card.why,
      excerpt: card.excerpt,
      paymentNotice: card.paymentNotice,
      blockedReason: card.blockedReason,
      historyNote: card.historyNote,
    })),
    openQuestions: model.openQuestions,
    conflicts: model.conflicts,
    contextItems: model.contextItems,
  });
}

describe('evidence review model', () => {
  it('shows source, confidence, and confirmation without treating a message as confirmed truth', () => {
    const model = buildEvidenceReviewModel({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      builtAt: '2026-09-14T15:20:00.000Z',
      actorMemberId: 'mem-1',
      messages: [
        message,
        normalizedConversationMessage({
          ...message,
          id: 'msg-b',
          organizationId: 'org-b',
          text: 'Secreto de otro tenant ¿cuándo?',
        }),
      ],
      candidates: [candidate, { ...candidate, id: 'other', organizationId: 'org-b', interpretation: 'Otro tenant' }],
      conflicts: [
        {
          kind: 'payment',
          customerSaid: 'El cliente dice que pagó',
          currentTruth: 'No hay un pago confirmado',
        },
      ],
      sourceHrefFor: (messageId) => `/mensajes/${messageId}`,
    });

    const copy = employeeCopy(model);
    assert.match(model.boundary, /no es verdad confirmada/);
    assert.match(model.paymentRule, /no confirma un pago/);
    assert.match(model.commitmentStatus, /no está en vivo/);
    assert.match(model.intelligenceStatus, /no está en vivo/);
    assert.match(model.modelStatus, /No se llamó a un modelo/);
    assert.match(model.providerStatus, /No se llamó a WhatsApp/);
    assert.equal(copy.includes('customer_message'), false);
    assert.equal(copy.includes('unconfirmed'), false);
    assert.equal(copy.includes('payment_claim'), false);
    assert.equal(copy.includes('Secreto de otro tenant'), false);
    assert.equal(copy.includes('Otro tenant'), false);
    assert.doesNotMatch(copy, /%|87\./);

    const card = model.cards[0];
    assert.ok(card);
    assert.equal(card.source, 'Dicho por el cliente');
    assert.equal(card.confidence, 'Alta');
    assert.equal(card.confirmation, 'No confirmado');
    assert.equal(card.companyConfirmed, false);
    assert.equal(card.paymentConfirmed, false);
    assert.equal(card.paymentNotice, 'Esto no confirma el cobro.');
    assert.equal(card.sourceHref, '/mensajes/msg-1');
    assert.equal(model.openQuestions.length, 1);
    assert.equal(model.openQuestions[0]?.confirmation, 'No confirmado');
    assert.match(model.openQuestions[0]?.note ?? '', /respuesta de salida/);
    assert.equal(model.conflicts[0]?.title, 'Posible discrepancia de pago');
    assert.match(model.conflicts[0]?.notice ?? '', /No cambia el pedido/);
    assert.equal(model.contextItems.every((item) => item.companyConfirmed === false), true);
    assert.equal(model.contextItems.every((item) => item.paymentConfirmed === false), true);
  });

  it('reviews a reported reading, dismisses it, and links without mutating a record', () => {
    const model = buildEvidenceReviewModel({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      builtAt: '2026-09-14T15:20:00.000Z',
      actorMemberId: 'mem-1',
      messages: [message],
      candidates: [candidate],
    });
    const card = model.cards[0];
    assert.ok(card);

    const reported = registerReported(card, { at: '2026-09-14T15:21:00.000Z', actorMemberId: 'mem-1' });
    assert.equal(reported.ok, true);
    assert.match(reported.text, /No confirma el cobro/);
    assert.equal(reported.card.confirmation, 'Revisado');
    assert.equal(reported.card.paymentConfirmed, false);
    assert.equal(reported.card.companyConfirmed, false);
    assert.equal(reported.card.fact?.relatedRecordId, null);

    const linked = linkExistingRecord(card, {
      at: '2026-09-14T15:22:00.000Z',
      actorMemberId: 'mem-1',
      relatedRecordType: 'quote',
      relatedRecordId: 'quo-1',
    });
    assert.equal(linked.ok, true);
    assert.match(linked.text, /no se modificó/);
    assert.equal(linked.card.confirmation, 'No confirmado');

    const missing = linkExistingRecord(card, {
      at: '2026-09-14T15:22:00.000Z',
      actorMemberId: 'mem-1',
      relatedRecordType: '',
      relatedRecordId: 'quo-1',
    });
    assert.equal(missing.ok, false);
    assert.match(missing.text, /Falta el registro/);

    const dismissed = dismissReading(card, {
      at: '2026-09-14T15:23:00.000Z',
      actorMemberId: 'mem-1',
      reason: 'Era una pregunta, no una confirmación.',
    });
    assert.equal(dismissed.ok, true);
    assert.equal(dismissed.card.confirmation, 'Descartado');
    assert.equal(dismissed.card.canRegister, false);
    assert.match(dismissed.card.historyNote ?? '', /lectura anterior/);
  });

  it('does not offer review actions without an actor, and refuses a confirmed customer payment', () => {
    const missingActor = buildEvidenceReviewModel({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      builtAt: '2026-09-14T15:20:00.000Z',
      actorMemberId: ' ',
      messages: [message],
      candidates: [candidate],
    });
    assert.match(missingActor.actorMissing ?? '', /quién revisa/);
    assert.equal(missingActor.cards[0]?.canRegister, false);
    assert.equal(missingActor.cards[0]?.canDismiss, false);

    const refused = buildEvidenceReviewModel({
      organizationId: 'org-a',
      conversationId: 'conv-1',
      builtAt: '2026-09-14T15:20:00.000Z',
      actorMemberId: 'mem-1',
      messages: [message],
      candidates: [{ ...candidate, confirmationState: 'confirmed' }],
    });
    assert.equal(refused.cards[0]?.fact, null);
    assert.equal(refused.cards[0]?.canRegister, false);
    assert.equal(refused.cards[0]?.paymentNotice, 'Esto no confirma el cobro.');
    assert.equal(refused.cards[0]?.companyConfirmed, false);
  });
});
