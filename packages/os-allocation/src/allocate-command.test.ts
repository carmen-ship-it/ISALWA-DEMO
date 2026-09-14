import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { COMMERCIAL_TEAM_READ_SCOPE } from '../../os-contracts/src/scopes';
import { DELIVERY_RECORD_SCOPE, WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE } from '../../os-contracts/src/operations-scopes';
import { WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE } from '../../os-contracts/src/warehouse-task';
import {
  ALLOCATION_LIVE_WRITE,
  allocateFinishedGoodsForSession,
  type AllocationSession,
  type AllocationTenantTargets,
  type TenantOwnedId,
} from './allocate-command';
import { IN_MEMORY_ALLOCATION_IS_TENANT_PROOF, InMemoryOrderAllocationStore } from './store';

const allocatedAt = '2026-09-14T16:00:00.000Z';
const recordedAt = '2026-09-14T16:05:00.000Z';
const FOREIGN = 'org-b-secreto';

function session(scopes: readonly string[] | null, over: Partial<AllocationSession> = {}): AllocationSession {
  return {
    organizationId: 'org-a',
    actorMemberId: 'member-a',
    actorLabel: 'Almacén',
    accessStatus: 'active',
    grantedScopes: scopes,
    ...over,
  };
}

function body(over: Record<string, unknown> = {}) {
  return {
    id: 'alloc-1',
    organizationId: 'org-a',
    productId: 'prod-finished-1',
    quantity: '2',
    orderLineId: 'line-1',
    orderLineOrganizationId: 'org-a',
    allocatedAt,
    recordedAt,
    actorMemberId: 'member-a',
    actorLabel: 'Almacén',
    source: 'explicit_command',
    finishedGoodsReceiptId: null,
    knownAvailableQuantity: '10',
    ...over,
  };
}

function targets(over: Partial<{
  lines: TenantOwnedId[];
  receipts: TenantOwnedId[];
  calls: string[];
}> = {}): AllocationTenantTargets & { calls: string[] } {
  const lines = over.lines ?? [{ organizationId: 'org-a', id: 'line-1' }];
  const receipts = over.receipts ?? [{ organizationId: 'org-a', id: 'receipt-a' }];
  const calls = over.calls ?? [];
  return {
    calls,
    orderLineInOrg(organizationId, orderLineId) {
      calls.push(`line:${organizationId}:${orderLineId}`);
      return lines.find((row) => row.organizationId === organizationId && row.id === orderLineId) ?? null;
    },
    receiptInOrg(organizationId, receiptId) {
      calls.push(`receipt:${organizationId}:${receiptId}`);
      return receipts.find((row) => row.organizationId === organizationId && row.id === receiptId) ?? null;
    },
  };
}

describe('allocate finished goods for the trusted session', () => {
  it('does not treat the in-memory helper as tenant proof and marks the live write unproven', () => {
    assert.equal(IN_MEMORY_ALLOCATION_IS_TENANT_PROOF, false);
    assert.equal(ALLOCATION_LIVE_WRITE, 'UNPROVEN');
    const helper = new InMemoryOrderAllocationStore();
    const saved = helper.allocate(body({ id: 'alloc-helper', organizationId: 'org-b', orderLineOrganizationId: 'org-b' }));
    assert.equal(saved.ok, true);
    assert.equal(helper.get('org-a', 'alloc-helper'), null);
    const source = readFileSync(join(__dirname, 'allocate-command.ts'), 'utf8');
    assert.equal(source.includes('findUnique'), false);
    assert.equal(source.includes('prisma'), false);
  });

  it('allocates only after the session organization owns the order line, and still does not claim a live write', async () => {
    const store = new InMemoryOrderAllocationStore();
    const found = targets();
    const result = await allocateFinishedGoodsForSession(store, session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]), body(), found);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.liveWrite, 'UNPROVEN');
    assert.equal(result.tenantProof, 'in_memory_not_live');
    assert.equal(result.allocation.organizationId, 'org-a');
    assert.deepEqual(found.calls, ['line:org-a:line-1']);
    assert.equal(store.get('org-b', result.allocation.id), null);
  });

  it('refuses receive, delivery.record, and commercial.team.read without inserting', async () => {
    for (const scope of [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE, DELIVERY_RECORD_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]) {
      const store = new InMemoryOrderAllocationStore();
      const found = targets();
      const result = await allocateFinishedGoodsForSession(store, session([scope]), body(), found);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.reason, 'unauthorized_role');
      assert.equal(result.liveWrite, 'UNPROVEN');
      assert.equal(store.get('org-a', 'alloc-1'), null);
      assert.deepEqual(found.calls, []);
    }
  });

  it('does not allocate when the session organization is missing', async () => {
    const store = new InMemoryOrderAllocationStore();
    const found = targets();
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE], { organizationId: '  ' }),
      body(),
      found,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'no_session_org');
    assert.equal(store.get('org-a', 'alloc-1'), null);
    assert.deepEqual(found.calls, []);
  });

  it('treats a foreign order line the same as a missing one and does not insert', async () => {
    const store = new InMemoryOrderAllocationStore();
    const found = targets({ lines: [{ organizationId: 'org-b', id: 'line-b' }] });
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ orderLineId: 'line-b', orderLineOrganizationId: 'org-a' }),
      found,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'not_found');
    assert.equal(JSON.stringify(result).includes(FOREIGN), false);
    assert.equal(JSON.stringify(result).includes('org-b'), false);
    assert.equal(store.get('org-a', 'alloc-1'), null);
    assert.deepEqual(found.calls, ['line:org-a:line-b']);
  });

  it('does not insert when a cited receipt is not in the session organization', async () => {
    const store = new InMemoryOrderAllocationStore();
    const found = targets({ receipts: [{ organizationId: 'org-b', id: 'receipt-b' }] });
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ finishedGoodsReceiptId: 'receipt-b', finishedGoodsReceiptOrganizationId: 'org-a' }),
      found,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'not_found');
    assert.equal(store.get('org-a', 'alloc-1'), null);
    assert.equal(found.calls.includes('receipt:org-b:receipt-b'), false);
  });

  it('does not retarget the write when the body names another organization', async () => {
    const store = new InMemoryOrderAllocationStore();
    const found = targets({ lines: [{ organizationId: 'org-b', id: 'line-1' }] });
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ organizationId: 'org-b', orderLineOrganizationId: 'org-b' }),
      found,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'cross_tenant');
    assert.deepEqual(found.calls, []);
    assert.equal(store.get('org-a', 'alloc-1'), null);
    assert.equal(store.get('org-b', 'alloc-1'), null);
  });

  it('does not report a foreign allocation id as a conflict or return that row', async () => {
    const store = new InMemoryOrderAllocationStore();
    const foreign = store.allocate(body({ id: 'alloc-shared', organizationId: 'org-b', orderLineOrganizationId: 'org-b' }));
    assert.equal(foreign.ok, true);
    const sameId = store.allocate(body({ id: 'alloc-shared' }));
    assert.equal(sameId.ok, true);
    if (!sameId.ok) return;
    assert.equal(sameId.allocation.organizationId, 'org-a');
    assert.equal(store.get('org-a', 'alloc-shared')?.organizationId, 'org-a');
    assert.equal(store.get('org-b', 'alloc-shared')?.organizationId, 'org-b');
    assert.notEqual(store.get('org-a', 'alloc-shared'), store.get('org-b', 'alloc-shared'));
  });
});
