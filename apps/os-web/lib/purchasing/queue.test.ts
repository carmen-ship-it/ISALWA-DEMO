import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  createPurchaseRequest,
  type PurchaseRequest,
} from '@isalwa/os-contracts';
import { buildComprasQueue } from './queue';

const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';

function request(id: string, organizationId: string, requestedByLabel: string, description: string): PurchaseRequest {
  const created = createPurchaseRequest({
    id,
    organizationId,
    requestingArea: 'Producción',
    requestedByLabel,
    description,
    reason: 'El área la pidió',
    requestedAt,
    statusEntryId: `hist-${id}`,
    createdAt,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected request');
  return created.request;
}

const buyer = { organizationId: 'org-a', role: 'buyer' as const };
const records = [
  request('pr-a', 'org-a', 'Ana del área', 'Tinta'),
  request('pr-b', 'org-b', 'Beatriz de otra empresa', 'Caja ajena'),
];

describe('Compras queue', () => {
  it('allows the same tenant and denies an unauthorized role, another tenant, and a missing session org', () => {
    const allowed = buildComprasQueue({ session: buyer, requests: records, candidates: [] });
    assert.equal(allowed.state, 'ready');
    if (allowed.state !== 'ready') return;
    assert.equal(allowed.count, 1);
    assert.equal(allowed.items[0]?.requestedByLabel, 'Ana del área');

    const role = buildComprasQueue({
      session: { organizationId: 'org-a', role: 'finance' },
      requests: records,
      candidates: [],
    });
    assert.equal(role.state, 'permission');
    assert.equal('count' in role, false);

    const crossed = buildComprasQueue({
      session: buyer,
      requests: records,
      candidates: [],
      targetOrganizationId: 'org-b',
    });
    assert.equal(crossed.state, 'permission');
    if (crossed.state === 'permission') assert.equal(crossed.reason, 'cross_tenant');

    const missing = buildComprasQueue({ session: null, requests: records, candidates: [] });
    assert.equal(missing.state, 'permission');
    if (missing.state === 'permission') assert.equal(missing.reason, 'session_org_required');
  });

  it('does not leak search, queue count, or another tenant’s requester as a buyer', () => {
    const searched = buildComprasQueue({
      session: buyer,
      requests: records,
      candidates: [
        { organizationId: 'org-a', label: 'Encargada de compras', role: 'buyer' },
        { organizationId: 'org-b', label: 'Beatriz de otra empresa', role: 'requester' },
      ],
      query: 'Beatriz de otra empresa',
      buyerQuery: 'Beatriz',
    });
    assert.equal(searched.state, 'ready');
    if (searched.state !== 'ready') return;
    assert.equal(searched.items.length, 0);
    assert.equal(searched.count, 1);
    assert.notEqual(searched.count, records.length);
    assert.deepEqual(searched.buyerSuggestions, []);
    assert.equal(JSON.stringify(searched).includes('Beatriz de otra empresa'), false);
  });

  it('mounts the queue on /compras and keeps Isa’s labels', () => {
    const page = readFileSync(join(__dirname, '../../app/(app)/compras/page.tsx'), 'utf8');
    const panel = readFileSync(join(__dirname, '../../components/purchasing/purchase-request-panel.tsx'), 'utf8');
    assert.match(page, /PurchaseRequestPanel/);
    assert.doesNotMatch(panel, /Unmounted/);
    assert.match(panel, /PURCHASE_REQUEST_STATUS_LABELS/);
    assert.match(panel, /solicitado/);
    assert.match(panel, /cotizandose/);
    assert.match(panel, /pedido_preparandose/);
    assert.match(panel, /entregado/);
    assert.match(panel, /cancelled/);
    assert.doesNotMatch(panel, /faltante|shortage|proveedor|punto de reorden/i);
  });

  it('filters the visible queue by estado without changing tenant count', () => {
    const allowed = buildComprasQueue({
      session: buyer,
      requests: records,
      candidates: [],
      statusFilter: 'solicitado',
    });
    assert.equal(allowed.state, 'ready');
    if (allowed.state !== 'ready') return;
    assert.equal(allowed.count, 1);
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.items[0]?.status, 'solicitado');

    const empty = buildComprasQueue({
      session: buyer,
      requests: records,
      candidates: [],
      statusFilter: 'entregado',
    });
    assert.equal(empty.state, 'ready');
    if (empty.state !== 'ready') return;
    assert.equal(empty.count, 1);
    assert.equal(empty.items.length, 0);
  });
});
