import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PURCHASE_REQUEST_HAPPY_PATH,
  PURCHASE_REQUEST_STATUS_LABELS,
  changePurchaseRequestStatus,
  countPurchaseRequests,
  createPurchaseRequest,
  purchaseRequestClaimsOfficialStock,
  purchaseRequestForwardStatus,
  purchaseRequestTriggersReorder,
  readPurchaseRequestQueue,
  searchPurchaseRequests,
  suggestPurchaseBuyers,
  type PurchaseRequest,
  type PurchaseRequestSession,
} from './purchase-request';

const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';

const buyer: PurchaseRequestSession = { organizationId: 'org-a', role: 'buyer' };
const requester: PurchaseRequestSession = { organizationId: 'org-a', role: 'requester' };

function ask(overrides: Partial<Parameters<typeof createPurchaseRequest>[0]> = {}) {
  return createPurchaseRequest({
    id: 'pr-1',
    organizationId: 'org-a',
    requestingArea: 'Producción',
    requestedByLabel: 'Ana',
    description: 'Tinta',
    reason: 'El área la pidió',
    requestedAt,
    statusEntryId: 'hist-1',
    createdAt,
    ...overrides,
  });
}

function mustRequest(id = 'pr-1', organizationId = 'org-a', requestedByLabel = 'Ana'): PurchaseRequest {
  const created = ask({ id, organizationId, requestedByLabel, statusEntryId: `hist-${id}` });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected request');
  return created.request;
}

describe('purchase request contract', () => {
  it('does not claim official stock and does not accept a reorder or a supplier party', () => {
    const created = ask();
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(purchaseRequestClaimsOfficialStock(created.request), false);
    assert.equal(purchaseRequestTriggersReorder(created.request), false);
    assert.equal(PURCHASE_REQUEST_STATUS_LABELS.solicitado, 'Solicitado');
    assert.equal(created.request.status, 'solicitado');
    assert.equal(created.request.quantity, null);
    assert.equal(created.request.orderId, null);
    assert.equal('shortage' in created.request, false);

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

  it('uses Isa’s labels and does not put Cancelado on the happy path', () => {
    assert.deepEqual(
      PURCHASE_REQUEST_HAPPY_PATH.map((status) => PURCHASE_REQUEST_STATUS_LABELS[status]),
      ['Solicitado', 'Cotizándose', 'Pedido y Preparándose', 'Entregado'],
    );
    assert.equal(PURCHASE_REQUEST_STATUS_LABELS.cancelled, 'Cancelado');
    assert.equal(
      PURCHASE_REQUEST_HAPPY_PATH.includes('cancelled' as (typeof PURCHASE_REQUEST_HAPPY_PATH)[number]),
      false,
    );
  });

  it('appends status history and cannot jump from Solicitado to Entregado', () => {
    const created = ask();
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const skipped = changePurchaseRequestStatus(created.request, {
      status: 'entregado',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
    });
    assert.equal(skipped.ok, false);
    if (!skipped.ok) assert.equal(skipped.reason, 'invalid_transition');
    assert.equal(created.request.statusHistory.length, 1);
    assert.equal(purchaseRequestForwardStatus('solicitado'), 'cotizandose');
    assert.notEqual(purchaseRequestForwardStatus('solicitado'), 'entregado');

    const quoted = changePurchaseRequestStatus(created.request, {
      status: 'cotizandose',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
      buyerLabel: 'Encargada de compras',
    });
    assert.equal(quoted.ok, true);
    if (!quoted.ok) return;
    assert.equal(quoted.request.statusHistory.length, 2);
    assert.equal(quoted.request.statusHistory[0]?.toStatus, 'solicitado');
    assert.equal(quoted.request.statusHistory[1]?.fromStatus, 'solicitado');
    assert.equal(created.request.status, 'solicitado');

    const jumped = changePurchaseRequestStatus(quoted.request, {
      status: 'entregado',
      at: '2026-09-14T17:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-3',
    });
    assert.equal(jumped.ok, false);
    if (!jumped.ok) assert.equal(jumped.reason, 'invalid_transition');
  });

  it('maps a stored requested key forward and still cannot skip to Entregado', () => {
    const created = ask();
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const legacy = { ...created.request, status: 'requested' as unknown as PurchaseRequest['status'] };
    const skipped = changePurchaseRequestStatus(legacy, {
      status: 'entregado',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
    });
    assert.equal(skipped.ok, false);
    if (!skipped.ok) assert.equal(skipped.reason, 'invalid_transition');

    const quoted = changePurchaseRequestStatus(legacy, {
      status: 'cotizandose',
      at: '2026-09-14T16:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
    });
    assert.equal(quoted.ok, true);
    if (!quoted.ok) return;
    assert.equal(quoted.request.status, 'cotizandose');
    assert.equal(quoted.request.statusHistory.at(-1)?.fromStatus, 'solicitado');
  });
});

describe('purchase request tenant and role access', () => {
  const own = mustRequest('pr-a', 'org-a', 'Ana del área');
  const other = mustRequest('pr-b', 'org-b', 'Beatriz de otra empresa');
  const records = [own, other];

  it('allows the same tenant when the role is buyer or requester', () => {
    const asBuyer = readPurchaseRequestQueue(buyer, records);
    assert.equal(asBuyer.ok, true);
    if (!asBuyer.ok) return;
    assert.equal(asBuyer.count, 1);
    assert.equal(asBuyer.requests[0]?.id, 'pr-a');
    assert.equal(asBuyer.requests.some((request) => request.organizationId === 'org-b'), false);

    const asRequester = readPurchaseRequestQueue(requester, records);
    assert.equal(asRequester.ok, true);
    if (!asRequester.ok) return;
    assert.equal(asRequester.count, 1);
    assert.equal(asRequester.requests[0]?.requestedByLabel, 'Ana del área');
  });

  it('denies the same tenant when the role is not assigned to compras', () => {
    const denied = readPurchaseRequestQueue(
      { organizationId: 'org-a', role: 'finance', grantedScopes: ['system.admin', 'people.admin'] },
      records,
    );
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'unauthorized_role');
    assert.equal('requests' in denied, false);
    assert.equal('count' in denied, false);

    const titled = readPurchaseRequestQueue(
      { organizationId: 'org-a', role: 'Encargada de Compras' },
      records,
    );
    assert.equal(titled.ok, false);
    if (!titled.ok) assert.equal(titled.reason, 'unauthorized_role');
  });

  it('denies a cross-tenant read', () => {
    const crossed = readPurchaseRequestQueue(buyer, records, 'org-b');
    assert.equal(crossed.ok, false);
    if (!crossed.ok) assert.equal(crossed.reason, 'cross_tenant');
    assert.equal('requests' in crossed, false);
    assert.equal('count' in crossed, false);
  });

  it('denies a direct call without a session organization', () => {
    const missing = readPurchaseRequestQueue(null, records);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, 'session_org_required');
    assert.equal('requests' in missing, false);

    const blank = countPurchaseRequests({ organizationId: '  ', role: 'buyer' }, records);
    assert.equal(blank.ok, false);
    if (!blank.ok) assert.equal(blank.reason, 'session_org_required');
    assert.equal('count' in blank, false);
  });

  it('does not leak another tenant through search', () => {
    const leaked = searchPurchaseRequests(buyer, records, 'Beatriz de otra empresa');
    assert.equal(leaked.ok, true);
    if (!leaked.ok) return;
    assert.equal(leaked.requests.length, 0);
    assert.equal(
      JSON.stringify(leaked).includes('Beatriz de otra empresa'),
      false,
    );

    const namedOtherOrg = searchPurchaseRequests(buyer, records, 'Tinta', 'org-b');
    assert.equal(namedOtherOrg.ok, false);
    if (!namedOtherOrg.ok) assert.equal(namedOtherOrg.reason, 'cross_tenant');
    assert.equal('requests' in namedOtherOrg, false);
  });

  it('does not include another tenant in the Compras queue count', () => {
    const count = countPurchaseRequests(buyer, records);
    assert.equal(count.ok, true);
    if (!count.ok) return;
    assert.equal(count.count, 1);
    assert.notEqual(count.count, records.length);

    const otherCount = countPurchaseRequests({ organizationId: 'org-b', role: 'buyer' }, records);
    assert.equal(otherCount.ok, true);
    if (!otherCount.ok) return;
    assert.equal(otherCount.count, 1);

    const denied = countPurchaseRequests({ organizationId: 'org-a', role: 'viewer' }, records);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'unauthorized_role');
    assert.equal('count' in denied, false);
  });

  it('does not name another tenant’s requester as a buyer suggestion', () => {
    const suggestions = suggestPurchaseBuyers(
      buyer,
      [
        { organizationId: 'org-a', label: 'Encargada de compras', role: 'buyer' },
        { organizationId: 'org-a', label: 'Ana del área', role: 'requester' },
        { organizationId: 'org-b', label: 'Beatriz de otra empresa', role: 'requester' },
        { organizationId: 'org-b', label: 'Compradora ajena', role: 'buyer' },
      ],
      'Beatriz',
    );
    assert.equal(suggestions.ok, true);
    if (!suggestions.ok) return;
    assert.deepEqual(suggestions.labels, []);
    assert.equal(
      suggestions.labels.some((label) => label === 'Beatriz de otra empresa'),
      false,
    );

    const named = suggestPurchaseBuyers(
      buyer,
      [
        { organizationId: 'org-a', label: 'Encargada de compras', role: 'buyer' },
        { organizationId: 'org-b', label: 'Beatriz de otra empresa', role: 'requester' },
      ],
      'Encargada',
    );
    assert.equal(named.ok, true);
    if (!named.ok) return;
    assert.deepEqual(named.labels, ['Encargada de compras']);
    assert.equal(JSON.stringify(named.labels).includes('Beatriz'), false);
  });
});
