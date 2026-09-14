import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  changePurchaseRequestStatus,
  createPurchaseRequest,
  purchaseRequestClaimsOfficialStock,
  purchaseRequestTriggersReorder,
} from './purchase-request';

const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';

describe('purchase request contract', () => {
  it('does not claim official stock and does not accept a reorder or a supplier party', () => {
    const created = createPurchaseRequest({
      id: 'pr-1',
      organizationId: 'org-a',
      requestingArea: 'Producción',
      requestedByLabel: 'Ana',
      description: 'Tinta',
      reason: 'El área la pidió',
      requestedAt,
      statusEntryId: 'hist-1',
      createdAt,
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(purchaseRequestClaimsOfficialStock(created.request), false);
    assert.equal(purchaseRequestTriggersReorder(created.request), false);
    assert.equal(PURCHASE_REQUEST_STATUS_LABELS.requested, 'Pedido de compra');
    assert.equal(created.request.quantity, null);
    assert.equal(created.request.orderId, null);

    const shortage = createPurchaseRequest({
      id: 'pr-2',
      organizationId: 'org-a',
      requestingArea: 'Producción',
      requestedByLabel: 'Ana',
      description: 'Tinta',
      reason: 'El área la pidió',
      requestedAt,
      statusEntryId: 'hist-2',
      createdAt,
      stockShortage: true,
    } as unknown as Parameters<typeof createPurchaseRequest>[0]);
    assert.equal(shortage.ok, false);
    if (!shortage.ok) assert.equal(shortage.reason, 'forbidden_stock_claim');

    const reorder = createPurchaseRequest({
      id: 'pr-3',
      organizationId: 'org-a',
      requestingArea: 'Producción',
      requestedByLabel: 'Ana',
      description: 'Tinta',
      reason: 'El área la pidió',
      requestedAt,
      statusEntryId: 'hist-3',
      createdAt,
      source: 'reorder',
    });
    assert.equal(reorder.ok, false);
    if (!reorder.ok) assert.equal(reorder.reason, 'forbidden_reorder');
  });

  it('appends status history and does not jump to received', () => {
    const created = createPurchaseRequest({
      id: 'pr-1',
      organizationId: 'org-a',
      requestingArea: 'Producción',
      requestedByLabel: 'Ana',
      description: 'Tinta',
      reason: 'El área la pidió',
      requestedAt,
      statusEntryId: 'hist-1',
      createdAt,
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const skipped = changePurchaseRequestStatus(created.request, {
      status: 'received',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
    });
    assert.equal(skipped.ok, false);
    if (!skipped.ok) assert.equal(skipped.reason, 'invalid_transition');
    assert.equal(created.request.statusHistory.length, 1);

    const opened = changePurchaseRequestStatus(created.request, {
      status: 'in_progress',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
      buyerLabel: 'Encargada de compras',
    });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.request.statusHistory.length, 2);
    assert.equal(opened.request.statusHistory[0]?.toStatus, 'requested');
    assert.equal(created.request.status, 'requested');
  });
});
