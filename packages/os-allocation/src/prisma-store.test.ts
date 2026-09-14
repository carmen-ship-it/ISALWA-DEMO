import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMMERCIAL_TEAM_READ_SCOPE } from '../../os-contracts/src/scopes';
import {
  DELIVERY_RECORD_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
} from '../../os-contracts/src/operations-scopes';
import { WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE } from '../../os-contracts/src/warehouse-task';
import {
  ALLOCATION_LIVE_WRITE,
  allocateFinishedGoodsForSession,
  type AllocationSession,
  type AllocationTenantTargets,
  type TenantOwnedId,
} from './allocate-command';
import {
  ALLOCATION_MIGRATION_APPLIED,
  ALLOCATION_PRISMA_LIVE_WRITE,
  ORDER_ALLOCATION_ALLOCATED_EVENT,
  createPrismaOrderAllocationStore,
  type AllocationPrismaPort,
} from './prisma-store';
import { IN_MEMORY_ALLOCATION_IS_TENANT_PROOF } from './store';

const allocatedAt = '2026-09-14T16:00:00.000Z';
const recordedAt = '2026-09-14T16:05:00.000Z';
const FOREIGN = 'org-b-secreto';

type Row = {
  id: string;
  organizationId: string;
  productId: string;
  goodsKind: string;
  quantity: string;
  orderLineId: string;
  allocatedAt: Date;
  recordedAt: Date;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  finishedGoodsReceiptId: string | null;
  idempotencyKey: string | null;
};

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

function targets(
  over: Partial<{
    lines: TenantOwnedId[];
    receipts: TenantOwnedId[];
    calls: string[];
  }> = {},
): AllocationTenantTargets & { calls: string[] } {
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

function fakePrisma(seed: Row[] = []): AllocationPrismaPort & {
  rows: Row[];
  events: Record<string, unknown>[];
} {
  const rows = seed.slice();
  const events: Record<string, unknown>[] = [];
  return {
    rows,
    events,
    osOrderAllocation: {
      async findFirst(args) {
        const where = args.where as Record<string, string>;
        return (
          rows.find((row) =>
            Object.entries(where).every(([key, value]) => (row as Record<string, unknown>)[key] === value),
          ) ?? null
        );
      },
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return rows.filter((row) =>
          Object.entries(where).every(([key, value]) => (row as Record<string, unknown>)[key] === value),
        );
      },
      async create(args) {
        const data = args.data as Row;
        rows.push({
          ...data,
          allocatedAt: data.allocatedAt instanceof Date ? data.allocatedAt : new Date(String(data.allocatedAt)),
          recordedAt: data.recordedAt instanceof Date ? data.recordedAt : new Date(String(data.recordedAt)),
        });
        return data;
      },
    },
    osBusinessEvent: {
      async create(args) {
        events.push(args.data);
        return args.data;
      },
    },
  };
}

describe('createPrismaOrderAllocationStore', () => {
  it('marks the prisma port liveWrite and keeps the migration unapplied', () => {
    assert.equal(IN_MEMORY_ALLOCATION_IS_TENANT_PROOF, false);
    assert.equal(ALLOCATION_LIVE_WRITE, 'UNPROVEN');
    assert.equal(ALLOCATION_PRISMA_LIVE_WRITE, 'prisma_port');
    assert.equal(ALLOCATION_MIGRATION_APPLIED, false);
    const store = createPrismaOrderAllocationStore(fakePrisma());
    assert.equal(store.liveWrite, 'prisma_port');
    assert.equal(store.migrationApplied, false);
  });

  it('persists a partial allocation and records a success event only for allocate', async () => {
    const prisma = fakePrisma();
    const store = createPrismaOrderAllocationStore(prisma);
    const found = targets();
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ quantity: '1.5', knownAvailableQuantity: '4' }),
      found,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.liveWrite, 'prisma_port');
    assert.equal(result.tenantProof, 'prisma_port');
    assert.equal(result.migrationApplied, false);
    assert.equal(result.allocation.quantity, '1.5');
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.events.length, 1);
    assert.equal(prisma.events[0]?.eventType, ORDER_ALLOCATION_ALLOCATED_EVENT);
    assert.equal(prisma.events[0]?.capabilityKey, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE);
    assert.equal(prisma.events[0]?.organizationId, 'org-a');

    const second = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ id: 'alloc-2', quantity: '1', knownAvailableQuantity: '2.5' }),
      found,
    );
    assert.equal(second.ok, true);
    assert.equal(prisma.rows.length, 2);
    assert.equal(prisma.events.length, 2);
  });

  it('prevents over-allocation against prior same-tenant rows', async () => {
    const prisma = fakePrisma();
    const store = createPrismaOrderAllocationStore(prisma);
    const found = targets();
    const first = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ quantity: '8', knownAvailableQuantity: '10' }),
      found,
    );
    assert.equal(first.ok, true);
    const over = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ id: 'alloc-over', quantity: '3', knownAvailableQuantity: '2' }),
      found,
    );
    assert.equal(over.ok, false);
    if (over.ok) return;
    assert.equal(over.reason, 'exceeds_available');
    assert.equal(over.liveWrite, 'prisma_port');
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.events.length, 1);
  });

  it('does not write a success event when receive, delivery, commercial read, or people.admin is used', async () => {
    for (const scope of [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      DELIVERY_RECORD_SCOPE,
      COMMERCIAL_TEAM_READ_SCOPE,
      'people.admin',
    ]) {
      const prisma = fakePrisma();
      const store = createPrismaOrderAllocationStore(prisma);
      const found = targets();
      const result = await allocateFinishedGoodsForSession(store, session([scope]), body(), found);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.reason, 'unauthorized_role');
      assert.equal(result.liveWrite, 'prisma_port');
      assert.equal(prisma.rows.length, 0);
      assert.equal(prisma.events.length, 0);
      assert.deepEqual(found.calls, []);
    }
  });

  it('treats a foreign order line and foreign receipt as not_found without leaking org-b', async () => {
    const prisma = fakePrisma();
    const store = createPrismaOrderAllocationStore(prisma);
    const foreignLine = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ orderLineId: 'line-b' }),
      targets({ lines: [{ organizationId: 'org-b', id: 'line-b' }] }),
    );
    assert.equal(foreignLine.ok, false);
    if (foreignLine.ok) return;
    assert.equal(foreignLine.reason, 'not_found');
    assert.equal(JSON.stringify(foreignLine).includes(FOREIGN), false);
    assert.equal(JSON.stringify(foreignLine).includes('org-b'), false);
    assert.equal(prisma.rows.length, 0);
    assert.equal(prisma.events.length, 0);

    const foreignReceipt = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ finishedGoodsReceiptId: 'receipt-b' }),
      targets({ receipts: [{ organizationId: 'org-b', id: 'receipt-b' }] }),
    );
    assert.equal(foreignReceipt.ok, false);
    if (foreignReceipt.ok) return;
    assert.equal(foreignReceipt.reason, 'not_found');
    assert.equal(prisma.rows.length, 0);
    assert.equal(prisma.events.length, 0);
  });

  it('does not retarget when the body names another organization and does not insert cross-tenant', async () => {
    const prisma = fakePrisma();
    const store = createPrismaOrderAllocationStore(prisma);
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ organizationId: 'org-b', orderLineOrganizationId: 'org-b' }),
      targets(),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'cross_tenant');
    assert.equal(prisma.rows.length, 0);
    assert.equal(prisma.events.length, 0);
    assert.equal(await store.get('org-b', 'alloc-1'), null);
  });

  it('keeps same-id allocations in different organizations separate', async () => {
    const prisma = fakePrisma([
      {
        id: 'alloc-shared',
        organizationId: 'org-b',
        productId: 'prod-finished-1',
        goodsKind: 'finished',
        quantity: '1',
        orderLineId: 'line-b',
        allocatedAt: new Date(allocatedAt),
        recordedAt: new Date(recordedAt),
        actorMemberId: 'member-b',
        actorLabel: 'Otro',
        source: 'explicit_command',
        finishedGoodsReceiptId: null,
        idempotencyKey: null,
      },
    ]);
    const store = createPrismaOrderAllocationStore(prisma);
    const result = await allocateFinishedGoodsForSession(
      store,
      session([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]),
      body({ id: 'alloc-shared' }),
      targets(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.allocation.organizationId, 'org-a');
    assert.equal((await store.get('org-a', 'alloc-shared'))?.organizationId, 'org-a');
    assert.equal((await store.get('org-b', 'alloc-shared'))?.organizationId, 'org-b');
    assert.equal(prisma.events.length, 1);
    assert.equal(prisma.events[0]?.organizationId, 'org-a');
  });
});
