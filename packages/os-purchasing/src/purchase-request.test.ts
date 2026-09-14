import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { InMemoryPurchaseRequestStore } from './in-memory-store';
import {
  PURCHASE_REQUEST_BOUNDARY,
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_REQUEST_TABLES,
  purchaseRequestClaimsOfficialStock,
  purchaseRequestMayPostInventory,
  purchaseRequestTriggersReorder,
} from '../../os-contracts/src/purchase-request';

const requestedAt = '2026-09-14T14:00:00.000Z';
const createdAt = '2026-09-14T14:05:00.000Z';
const later = '2026-09-14T16:00:00.000Z';
const receivedAt = '2026-09-14T18:00:00.000Z';

function openStore() {
  return new InMemoryPurchaseRequestStore();
}

function ask(
  store: InMemoryPurchaseRequestStore,
  overrides: Partial<Parameters<InMemoryPurchaseRequestStore['create']>[0]> = {},
) {
  return store.create({
    id: 'pr-1',
    organizationId: 'org-a',
    requestingArea: 'Producción',
    requestedByLabel: 'Ana del área',
    description: 'Tinta negra para etiquetas',
    quantity: '4',
    unit: 'botellas',
    reason: 'El área la pidió para el trabajo de la semana',
    requestedAt,
    statusEntryId: 'hist-1',
    actorLabel: 'Ana del área',
    createdAt,
    ...overrides,
  });
}

describe('purchase request does not claim official stock truth', () => {
  it('stores a request without shortage, stock, or a supplier party', () => {
    const created = ask(openStore());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    assert.equal(created.request.claimsOfficialStock, false);
    assert.equal(created.request.stockAuthority, 'not_official');
    assert.equal(purchaseRequestClaimsOfficialStock(created.request), false);
    assert.equal(purchaseRequestMayPostInventory(), false);
    assert.equal(created.request.status, 'solicitado');
    assert.equal(PURCHASE_REQUEST_STATUS_LABELS[created.request.status], 'Solicitado');
    assert.match(PURCHASE_REQUEST_BOUNDARY, /no prueba que no haya stock/i);
    assert.equal('shortage' in created.request, false);
    assert.equal('stockOnHand' in created.request, false);
    assert.equal('reorderPoint' in created.request, false);
    assert.equal('supplierPartyId' in created.request, false);
    assert.equal(created.request.productionContextId, null);
    assert.equal(created.request.orderId, null);

    const denied = ask(openStore(), {
      id: 'pr-denied',
      shortage: true,
    } as unknown as Parameters<InMemoryPurchaseRequestStore['create']>[0]);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'forbidden_stock_claim');
  });

  it('keeps quantity and links only when the area provided them', () => {
    const created = ask(openStore(), {
      id: 'pr-linked',
      quantity: null,
      unit: null,
      productionContextId: 'prod-ctx-1',
      orderId: 'order-1',
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.request.quantity, null);
    assert.equal(created.request.unit, null);
    assert.equal(created.request.productionContextId, 'prod-ctx-1');
    assert.equal(created.request.orderId, 'order-1');
    assert.equal(created.request.claimsOfficialStock, false);
  });
});

describe('purchase request tenant isolation', () => {
  it('does not show or mutate another organization', () => {
    const store = openStore();
    const created = ask(store);
    assert.equal(created.ok, true);
    if (!created.ok) return;

    ask(store, {
      id: 'pr-b',
      organizationId: 'org-b',
      description: 'Otro pedido',
      statusEntryId: 'hist-b',
    });

    assert.equal(store.get('org-b', created.request.id), null);
    assert.equal(
      store.list('org-b').some((request) => request.id === created.request.id),
      false,
    );
    assert.equal(store.list('org-a').length, 1);
    assert.equal(store.list('org-b').length, 1);

    const crossed = store.changeStatus('org-b', created.request.id, {
      status: 'cancelled',
      at: later,
      actorLabel: 'Otra empresa',
      statusEntryId: 'hist-cross',
    });
    assert.equal(crossed.ok, false);
    if (!crossed.ok) assert.equal(crossed.reason, 'not_found');
    assert.equal(store.get('org-a', created.request.id)?.status, 'solicitado');
    assert.equal(store.get('org-a', created.request.id)?.description, 'Tinta negra para etiquetas');
  });
});

describe('purchase request status history', () => {
  it('keeps earlier status entries when the buyer advances the request', () => {
    const store = openStore();
    const created = ask(store);
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const before = store.get('org-a', created.request.id);
    assert.ok(before);
    const opened = store.changeStatus('org-a', created.request.id, {
      status: 'cotizandose',
      at: later,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
      buyerLabel: 'Encargada de compras',
      note: 'Lo compra esta tarde',
    });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;

    const preparing = store.changeStatus('org-a', created.request.id, {
      status: 'pedido_preparandose',
      at: '2026-09-14T17:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2b',
    });
    assert.equal(preparing.ok, true);
    if (!preparing.ok) return;

    const done = store.changeStatus('org-a', created.request.id, {
      status: 'entregado',
      at: receivedAt,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-3',
    });
    assert.equal(done.ok, true);
    if (!done.ok) return;

    assert.ok(before);
    assert.equal(before.status, 'solicitado');
    assert.equal(before.statusHistory.length, 1);
    assert.equal(done.request.status, 'entregado');
    assert.equal(done.request.statusHistory.length, 4);
    assert.deepEqual(done.request.statusHistory[0], before.statusHistory[0]);
    assert.equal(done.request.statusHistory[1]?.fromStatus, 'solicitado');
    assert.equal(done.request.statusHistory[1]?.toStatus, 'cotizandose');
    assert.equal(done.request.statusHistory[2]?.fromStatus, 'cotizandose');
    assert.equal(done.request.statusHistory[2]?.toStatus, 'pedido_preparandose');
    assert.equal(done.request.statusHistory[3]?.fromStatus, 'pedido_preparandose');
    assert.equal(done.request.statusHistory[3]?.toStatus, 'entregado');
    assert.equal(done.request.buyerLabel, 'Encargada de compras');
    assert.equal(PURCHASE_REQUEST_STATUS_LABELS.entregado, 'Entregado');

    const skipped = store.changeStatus('org-a', 'missing', {
      status: 'entregado',
      at: receivedAt,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-skip',
    });
    assert.equal(skipped.ok, false);

    const replay = ask(openStore(), { status: 'received' } as unknown as Parameters<
      InMemoryPurchaseRequestStore['create']
    >[0]);
    assert.equal(replay.ok, false);
    if (!replay.ok) assert.equal(replay.reason, 'invalid_status');
  });
});

describe('purchase request does not reorder', () => {
  it('does not create another request when the first one is received', () => {
    const store = openStore();
    const created = ask(store);
    assert.equal(created.ok, true);
    if (!created.ok) return;

    store.changeStatus('org-a', created.request.id, {
      status: 'cotizandose',
      at: later,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2',
      buyerLabel: 'Encargada de compras',
    });
    store.changeStatus('org-a', created.request.id, {
      status: 'pedido_preparandose',
      at: '2026-09-14T17:00:00.000Z',
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-2b',
    });
    const received = store.changeStatus('org-a', created.request.id, {
      status: 'entregado',
      at: receivedAt,
      actorLabel: 'Encargada de compras',
      statusEntryId: 'hist-3',
    });
    assert.equal(received.ok, true);
    if (!received.ok) return;

    assert.equal(store.list('org-a').length, 1);
    assert.equal(received.request.triggersReorder, false);
    assert.equal(received.request.reorderPolicy, 'none');
    assert.equal(purchaseRequestTriggersReorder(received.request), false);
    assert.equal(
      Object.getOwnPropertyNames(InMemoryPurchaseRequestStore.prototype).some((name) =>
        /reorder|shortage|inventory|supplier/i.test(name),
      ),
      false,
    );

    const keyed = ask(store, {
      id: 'pr-key',
      idempotencyKey: 'same-ask',
      statusEntryId: 'hist-key',
    });
    assert.equal(keyed.ok, true);
    const replay = ask(store, {
      id: 'pr-key-2',
      idempotencyKey: 'same-ask',
      description: 'No es una recompra',
      statusEntryId: 'hist-key-2',
    });
    assert.equal(replay.ok, true);
    if (!replay.ok) return;
    assert.equal(replay.request.id, 'pr-key');
    assert.equal(replay.request.description, 'Tinta negra para etiquetas');
    assert.equal(store.list('org-a').filter((request) => request.idempotencyKey === 'same-ask').length, 1);
    assert.equal(store.list('org-a').length, 2);
  });
});

describe('purchase request files stay outside stock and ERP', () => {
  it('keeps the old migration and mounts the queue without a stock claim', () => {
    const root = join(__dirname, '../../..');
    const sql = readFileSync(
      join(root, 'packages/os-database/prisma/migrations/20260915180000_os_purchase_request/migration.sql'),
      'utf8',
    );
    const fragment = readFileSync(
      join(root, 'packages/os-database/prisma/fragments/purchase-request.prisma'),
      'utf8',
    );
    const panel = readFileSync(
      join(root, 'apps/os-web/components/purchasing/purchase-request-panel.tsx'),
      'utf8',
    );
    const page = readFileSync(join(root, 'apps/os-web/app/(app)/compras/page.tsx'), 'utf8');
    const contractIndex = readFileSync(join(root, 'packages/os-contracts/src/index.ts'), 'utf8');

    for (const table of PURCHASE_REQUEST_TABLES) {
      assert.match(sql, new RegExp(`CREATE TABLE ${table}`));
    }
    assert.match(sql, /status IN \('requested', 'in_progress', 'received', 'cancelled'\)/);
    const workflow = readFileSync(
      join(
        root,
        'packages/os-database/prisma/migrations/20260916140000_os_purchase_status_workflow/migration.sql',
      ),
      'utf8',
    );
    assert.match(workflow, /requested.*solicitado/s);
    assert.match(workflow, /in_progress.*cotizandose/s);
    assert.match(workflow, /received.*entregado/s);
    assert.match(workflow, /cancelled stays cancelled|cancelled' THEN 'cancelled'|ELSE status/i);
    assert.match(
      workflow,
      /status IN \('solicitado', 'cotizandose', 'pedido_preparandose', 'entregado', 'cancelled'\)/,
    );
    assert.doesNotMatch(workflow, /shortage|reorder_point|supplier_party|approval_threshold/i);
    assert.match(sql, /stock_authority = 'not_official'/);
    assert.match(sql, /reorder_policy = 'none'/);
    assert.match(sql, /source = 'manual'/);
    assert.match(sql, /append-only/i);
    const sqlCode = sql.replace(/--.*$/gm, '');
    assert.doesNotMatch(sqlCode, /ALTER TABLE/i);
    assert.doesNotMatch(sqlCode, /reorder_point|supplier_party|shortage|stock_on_hand|approval_threshold/i);
    assert.doesNotMatch(sqlCode, /REFERENCES os_orders|REFERENCES os_parties/i);
    const fragmentCode = fragment.replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(fragmentCode, /reorderPoint|supplierPartyId|shortage/);
    assert.match(fragment, /stockAuthority/);
    assert.match(panel, new RegExp(PURCHASE_REQUEST_BOUNDARY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const label of Object.values(PURCHASE_REQUEST_STATUS_LABELS)) {
      assert.match(panel, new RegExp(label));
    }
    assert.doesNotMatch(panel, /Unmounted/);
    assert.match(page, /PurchaseRequestPanel/);
    assert.doesNotMatch(panel, /punto de reorden|sin stock|proveedor|supplierPartyId|reorderPoint|faltante|shortage/i);
    assert.doesNotMatch(page, /punto de reorden|sin stock|proveedor|faltante|shortage/i);
    assert.match(contractIndex, /export \* from '\.\/purchase-request'/);
  });
});

describe('purchase request queue access', () => {
  const buyer = { organizationId: 'org-a', role: 'buyer' as const };

  function seed() {
    const store = openStore();
    ask(store, { id: 'pr-a', requestedByLabel: 'Ana del área', statusEntryId: 'hist-a' });
    ask(store, {
      id: 'pr-b',
      organizationId: 'org-b',
      requestedByLabel: 'Beatriz de otra empresa',
      description: 'Caja ajena',
      statusEntryId: 'hist-b',
    });
    store.assignBuyer('org-a', 'pr-a', {
      buyerLabel: 'Encargada de compras',
      at: later,
      actorLabel: 'Encargada de compras',
    });
    store.assignBuyer('org-b', 'pr-b', {
      buyerLabel: 'Compradora ajena',
      at: later,
      actorLabel: 'Compradora ajena',
    });
    return store;
  }

  it('allows the same tenant and denies an unauthorized role', () => {
    const store = seed();
    const allowed = store.readQueue(buyer);
    assert.equal(allowed.ok, true);
    if (!allowed.ok) return;
    assert.equal(allowed.count, 1);
    assert.equal(allowed.requests[0]?.id, 'pr-a');

    const denied = store.readQueue({ organizationId: 'org-a', role: 'finance' });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'unauthorized_role');
    assert.equal('count' in denied, false);
    assert.equal('requests' in denied, false);
  });

  it('denies cross-tenant reads and a direct call without a session organization', () => {
    const store = seed();
    const crossed = store.readQueue(buyer, 'org-b');
    assert.equal(crossed.ok, false);
    if (!crossed.ok) assert.equal(crossed.reason, 'cross_tenant');
    assert.equal('requests' in crossed, false);

    const missing = store.countQueue(null);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, 'session_org_required');
    assert.equal('count' in missing, false);
  });

  it('does not leak another tenant through search or the Compras queue count', () => {
    const store = seed();
    const search = store.searchQueue(buyer, 'Beatriz de otra empresa');
    assert.equal(search.ok, true);
    if (!search.ok) return;
    assert.equal(search.requests.length, 0);
    assert.equal(JSON.stringify(search).includes('Beatriz'), false);

    const count = store.countQueue(buyer);
    assert.equal(count.ok, true);
    if (!count.ok) return;
    assert.equal(count.count, 1);
    assert.notEqual(count.count, store.list('org-a').length + store.list('org-b').length);
  });

  it('does not name another tenant’s requester as a buyer suggestion', () => {
    const store = seed();
    const suggestions = store.suggestBuyers(buyer, 'Beatriz');
    assert.equal(suggestions.ok, true);
    if (!suggestions.ok) return;
    assert.deepEqual(suggestions.labels, []);
    assert.equal(suggestions.labels.includes('Beatriz de otra empresa'), false);

    const own = store.suggestBuyers(buyer, 'Encargada');
    assert.equal(own.ok, true);
    if (!own.ok) return;
    assert.deepEqual(own.labels, ['Encargada de compras']);
  });
});
