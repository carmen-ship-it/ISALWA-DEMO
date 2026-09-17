import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { buildOrderPrepReviewWork } from '../../components/commercial/order-prep-work';

const here = dirname(fileURLToPath(import.meta.url));

describe('order prep review work', () => {
  it('builds governed CreateWorkItem on party with pedido context', () => {
    const built = buildOrderPrepReviewWork({
      department: 'warehouse',
      orderId: 'ord-1',
      partyId: 'party-1',
      actorMemberId: 'mem-1',
      orderLabel: 'O-000123',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.command, 'CreateWorkItem');
    assert.equal(built.payload.subjectType, 'party');
    assert.equal(built.payload.subjectId, 'party-1');
    assert.match(String(built.payload.description), /Pedido/);
  });

  it('does not auto-complete work when read', () => {
    const card = readFileSync(join(here, '../../components/commercial/order-prep-card.tsx'), 'utf8');
    assert.doesNotMatch(card, /CompleteWork|markNotificationRead/i);
  });
});
