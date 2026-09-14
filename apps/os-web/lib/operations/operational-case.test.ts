import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ORDER_CASE_ACCOUNTING,
  ORDER_CASE_PAYMENT_NOT_REQUIRED,
  ORDER_CASE_PENDING,
  ORDER_CASE_UNAVAILABLE,
  orderCasePanelModel,
} from './operational-case';

const FORBIDDEN = [/\bpagado\b/i, /\bcobrado\b/i, /\bentregado\b/i, /pago confirmado/i, /paymentConfirmed/i];

describe('order case panel', () => {
  it('lists one order in Spanish and does not confirm payment or delivery', () => {
    const model = orderCasePanelModel({
      organizationId: 'org-a',
      orderId: 'order-1',
      facts: [
        {
          id: 'fact-1',
          organizationId: 'org-a',
          orderId: 'order-1',
          kind: 'payment_report',
          source: 'customer_message',
          actorLabel: 'Ana',
          occurredAt: '2026-09-14T14:30:00.000Z',
          recordedAt: '2026-09-14T15:00:00.000Z',
          evidenceText: 'El cliente dice que ya pagó',
          confirmation: 'confirmed',
        },
        {
          id: 'fact-other',
          organizationId: 'org-b',
          orderId: 'order-1',
          kind: 'delivery_report',
          source: 'manual',
          actorLabel: 'Otro',
          occurredAt: '2026-09-14T14:30:00.000Z',
          recordedAt: '2026-09-14T15:00:00.000Z',
          evidenceText: 'Otro local',
        },
        {
          id: 'fact-2',
          organizationId: 'org-a',
          orderId: 'order-1',
          kind: 'delivery_report',
          source: 'customer_message',
          actorLabel: 'Ana',
          occurredAt: '2026-09-14T14:40:00.000Z',
          recordedAt: '2026-09-14T15:01:00.000Z',
          evidenceText: 'El cliente dice que ya llegó',
        },
      ],
      releases: [
        {
          id: 'release-1',
          organizationId: 'org-a',
          orderId: 'order-1',
          state: 'released',
          basis: 'commercial_agreement',
          reason: 'Distribuidor con acuerdo',
          actorLabel: 'Ana',
          decidedAt: '2026-09-14T15:05:00.000Z',
          evidenceText: 'Acuerdo visto',
          evidenceReference: 'agreement-opaque',
        },
      ],
    });

    assert.deepEqual(
      model.facts.map((item) => item.id),
      ['fact-1', 'fact-2'],
    );
    assert.equal(model.facts[0]?.confirmation, ORDER_CASE_PENDING);
    assert.equal(model.facts[0]?.boundary, 'Esto no confirma el pago.');
    assert.equal(model.facts[1]?.boundary, 'Esto no confirma la entrega.');
    assert.equal(model.releases[0]?.title, 'Se puede seguir con el pedido');
    assert.match(model.releases[0]?.boundary ?? '', /no confirma el pago/i);
    assert.match(model.releases[0]?.boundary ?? '', /acuerdo comercial/i);
    assert.equal(model.accounting, ORDER_CASE_ACCOUNTING);
    assert.match(model.paymentNotRequired, /no es siempre requisito|no solo por un pago/i);
    assert.equal(model.paymentNotRequired, ORDER_CASE_PAYMENT_NOT_REQUIRED);
    assert.match(ORDER_CASE_UNAVAILABLE, /no se inventan/i);
    assert.equal(/pago confirmado/i.test(ORDER_CASE_UNAVAILABLE), false);

    const copy = JSON.stringify(model);
    for (const pattern of FORBIDDEN) {
      assert.equal(pattern.test(copy), false, pattern.source);
    }
  });
});
