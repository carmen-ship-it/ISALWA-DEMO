import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildOrderPrepReviewWork,
  canRequestOrderPrepReview,
  findOpenOrderPrepReviews,
  orderPrepMarker,
  parseOrderPrepMarker,
  ORDER_PREP_COPY,
} from '../../components/commercial/order-prep-work';

const here = dirname(fileURLToPath(import.meta.url));

describe('order prep copy contract', () => {
  it('uses Carmen-specified headings and department copy', () => {
    assert.equal(ORDER_PREP_COPY.cardTitle, 'Preparación operativa');
    assert.match(ORDER_PREP_COPY.cardIntro, /áreas deben estar preparadas/);
    assert.equal(ORDER_PREP_COPY.production.title, 'PRODUCCIÓN');
    assert.match(ORDER_PREP_COPY.production.body, /acción de producción/);
    assert.equal(ORDER_PREP_COPY.warehouse.title, 'ALMACÉN');
    assert.match(ORDER_PREP_COPY.warehouse.body, /disponibilidad o próximos ingresos/);
    assert.equal(ORDER_PREP_COPY.purchasing.title, 'COMPRAS');
    assert.match(ORDER_PREP_COPY.purchasing.body, /abastecimiento/);
    assert.doesNotMatch(ORDER_PREP_COPY.warehouse.body, /stock|hay stock|no hay stock/i);
  });
});

describe('order prep review work', () => {
  it('builds governed CreateWorkItem on party with pedido marker', () => {
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
    assert.equal(built.payload.ownerMemberId, 'mem-1');
    assert.match(String(built.payload.description), /Pedido/);
    assert.match(String(built.payload.description), /\[\[order-prep:warehouse:ord-1\]\]/);
    assert.match(String(built.payload.title), /O-000123/);
  });

  it('routes to canonical assignee when provided', () => {
    const built = buildOrderPrepReviewWork({
      department: 'production',
      orderId: 'ord-1',
      partyId: 'party-1',
      actorMemberId: 'mem-actor',
      assigneeMemberId: 'mem-prod',
      orderLabel: 'O-9',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.payload.ownerMemberId, 'mem-prod');
    assert.equal(built.needsAssignee, false);
  });

  it('blocks production review without assignee — does not invent owner', () => {
    assert.equal(canRequestOrderPrepReview('production', null), false);
    const built = buildOrderPrepReviewWork({
      department: 'production',
      orderId: 'ord-1',
      partyId: 'party-1',
      actorMemberId: 'mem-1',
    });
    assert.equal(built.ok, false);
    if (built.ok) return;
    assert.equal(built.reason, 'missing_assignee');
  });

  it('allows warehouse and purchasing without assignee (requester-owned coordination)', () => {
    assert.equal(canRequestOrderPrepReview('warehouse', null), true);
    assert.equal(canRequestOrderPrepReview('purchasing', null), true);
  });

  it('does not mutate pedido / inventory / approval command names', () => {
    const card = readFileSync(join(here, '../../components/commercial/order-prep-card.tsx'), 'utf8');
    const work = readFileSync(join(here, '../../components/commercial/order-prep-work.ts'), 'utf8');
    const actions = readFileSync(join(here, 'order-prep-actions.ts'), 'utf8');
    assert.doesNotMatch(card, /CompleteWork|Approve|ReceiveFinishedGoods|CreatePurchase/i);
    assert.doesNotMatch(work, /CompleteWork|markNotificationRead/i);
    assert.match(actions, /executeWorkCommand/);
    assert.match(actions, /alreadyOpen/);
    assert.doesNotMatch(actions, /Approve|Reject|ReceiveFinishedGoods/);
  });
});

describe('order prep idempotency markers', () => {
  it('parses and finds open reviews per department', () => {
    assert.deepEqual(parseOrderPrepMarker(orderPrepMarker('purchasing', 'ord-9')), {
      department: 'purchasing',
      orderId: 'ord-9',
    });
    const open = findOpenOrderPrepReviews(
      [
        {
          workItemId: 'w1',
          title: 'Revisión de almacén · O-1',
          description: `body\n${orderPrepMarker('warehouse', 'ord-1')}`,
          status: 'open',
          subjectType: 'party',
          subjectId: 'party-1',
        },
        {
          workItemId: 'w2',
          title: 'done',
          description: orderPrepMarker('warehouse', 'ord-1'),
          status: 'completed',
          subjectType: 'party',
          subjectId: 'party-1',
        },
        {
          workItemId: 'w3',
          title: 'other order',
          description: orderPrepMarker('warehouse', 'ord-2'),
          status: 'open',
          subjectType: 'party',
          subjectId: 'party-1',
        },
      ],
      'ord-1',
      'party-1',
    );
    assert.equal(open.warehouse?.workItemId, 'w1');
    assert.equal(open.production, undefined);
    assert.equal(open.purchasing, undefined);
  });
});

describe('order prep page mount', () => {
  it('mounts OrderPrepCard on pedido detail after commercial summary', () => {
    const page = readFileSync(
      join(here, '../../app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
      'utf8',
    );
    assert.match(page, /OrderPrepCard/);
    assert.match(page, /findOpenOrderPrepReviews/);
    assert.match(page, /Preparación operativa|OrderPrepCard/);
    const prepIdx = page.indexOf('<OrderPrepCard');
    const dossierIdx = page.indexOf('<DocumentDossierPanel');
    assert.ok(prepIdx > 0);
    assert.ok(dossierIdx > prepIdx);
  });
});
