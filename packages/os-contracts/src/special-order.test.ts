import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NORMAL_ORDER_LABEL,
  SPECIAL_ORDER_LABEL,
  SPECIAL_ORDER_NUMERIC_THRESHOLD,
  automaticSpecialOrderRule,
  classifyPedidoFromQuantity,
  classifySpecialOrder,
  specialImpliesProductionPlanning,
  specialOrderHasNumericThreshold,
} from './special-order';

const recordedAt = '2026-09-14T15:00:00.000Z';

function explicit(overrides: Record<string, unknown> = {}) {
  return classifySpecialOrder({
    id: 'class-1',
    organizationId: 'org-a',
    orderId: 'order-1',
    classification: 'special',
    requiresProductionPlanning: false,
    actorMemberId: 'member-1',
    actorLabel: 'Ana',
    source: 'human_explicit',
    recordedAt,
    ...overrides,
  });
}

describe('special order classification', () => {
  it('is special only when a person classifies it, with actor, source, timestamp, and audit', () => {
    const result = explicit();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.pedidoEspecial, true);
    assert.equal(result.value.classification, 'special');
    assert.equal(result.value.source, 'human_explicit');
    assert.equal(result.value.actorLabel, 'Ana');
    assert.equal(result.value.recordedAt, recordedAt);
    assert.equal(result.value.audit.actorLabel, 'Ana');
    assert.equal(result.value.audit.source, 'human_explicit');
    assert.equal(result.value.audit.recordedAt, recordedAt);
    assert.equal(result.value.numericThreshold, null);
    assert.equal(result.value.attachedToOsOrder, false);
    assert.equal(SPECIAL_ORDER_LABEL, 'Pedido especial');
  });

  it('stays normal when the classification is explicitly normal', () => {
    const result = explicit({ classification: 'normal', requiresProductionPlanning: true });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.pedidoEspecial, false);
    assert.equal(result.value.requiresProductionPlanning, true);
    assert.equal(NORMAL_ORDER_LABEL, 'Pedido normal');
  });

  it('does not become special from quantity, amount, or any numeric threshold', () => {
    assert.equal(specialOrderHasNumericThreshold(), false);
    assert.equal(SPECIAL_ORDER_NUMERIC_THRESHOLD, null);
    assert.equal(automaticSpecialOrderRule(), null);
    assert.equal(classifyPedidoFromQuantity(1), null);
    assert.equal(classifyPedidoFromQuantity(999999), null);
    assert.equal(classifyPedidoFromQuantity('100'), null);

    const fromSize = classifySpecialOrder({
      id: 'class-2',
      organizationId: 'org-a',
      orderId: 'order-1',
      classification: 'special',
      requiresProductionPlanning: false,
      actorLabel: 'Ana',
      source: 'human_explicit',
      recordedAt,
      quantity: 999999,
      threshold: 10,
    });
    assert.deepEqual(fromSize, { ok: false, reason: 'automatic_rule_refused' });

    const missing = classifySpecialOrder({
      id: 'class-3',
      organizationId: 'org-a',
      orderId: 'order-1',
      requiresProductionPlanning: false,
      actorLabel: 'Ana',
      source: 'human_explicit',
      recordedAt,
    });
    assert.deepEqual(missing, { ok: false, reason: 'explicit_required' });
  });

  it('does not infer production planning from a special classification', () => {
    assert.equal(specialImpliesProductionPlanning(), false);
    const result = explicit({ requiresProductionPlanning: false });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.pedidoEspecial, true);
    assert.equal(result.value.requiresProductionPlanning, false);
  });

  it('refuses an automatic source', () => {
    const result = classifySpecialOrder({
      id: 'class-4',
      organizationId: 'org-a',
      orderId: 'order-1',
      classification: 'special',
      requiresProductionPlanning: true,
      actorLabel: 'Regla',
      source: 'rule',
      recordedAt,
    });
    assert.deepEqual(result, { ok: false, reason: 'automatic_rule_refused' });
  });
});
