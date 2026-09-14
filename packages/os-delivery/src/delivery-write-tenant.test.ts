import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { COMMERCIAL_TEAM_READ_SCOPE } from '../../os-contracts/src/scopes';
import { WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE } from '../../os-contracts/src/operations-scopes';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
} from '../../os-contracts/src/delivery';
import { DeliveryCommandService, DELIVERY_LIVE_WRITE } from './delivery-command-service';
import { MEMORY_DELIVERY_STORE_IS_TENANT_PROOF, MemoryDeliveryStore } from './memory-store';
import type { OrderSnapshot, WarehouseExitRecord } from './store-types';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const FOREIGN_SECRET = 'cliente-org-b-secreto';

class CountingStore extends MemoryDeliveryStore {
  inserts = { exit: 0, note: 0, lines: 0, delivery: 0, evidence: 0 };

  override async insertWarehouseExit(row: Parameters<MemoryDeliveryStore['insertWarehouseExit']>[0]) {
    this.inserts.exit += 1;
    return super.insertWarehouseExit(row);
  }

  override async insertOutboundNote(row: Parameters<MemoryDeliveryStore['insertOutboundNote']>[0]) {
    this.inserts.note += 1;
    return super.insertOutboundNote(row);
  }

  override async insertOutboundLines(rows: Parameters<MemoryDeliveryStore['insertOutboundLines']>[0]) {
    this.inserts.lines += 1;
    return super.insertOutboundLines(rows);
  }

  override async insertDelivery(row: Parameters<MemoryDeliveryStore['insertDelivery']>[0]) {
    this.inserts.delivery += 1;
    return super.insertDelivery(row);
  }

  override async insertDeliveryNote(row: Parameters<MemoryDeliveryStore['insertDeliveryNote']>[0]) {
    this.inserts.note += 1;
    return super.insertDeliveryNote(row);
  }

  override async insertEvidence(row: Parameters<MemoryDeliveryStore['insertEvidence']>[0]) {
    this.inserts.evidence += 1;
    return super.insertEvidence(row);
  }
}

class LeakyOrderStore extends CountingStore {
  override async getOrderInOrg(_organizationId: string, orderId: string) {
    if (orderId === 'order-b') {
      return {
        id: 'order-b',
        organizationId: 'org-b',
        status: 'open',
        lines: null,
        notes: FOREIGN_SECRET,
      } as OrderSnapshot & { notes: string };
    }
    return super.getOrderInOrg(_organizationId, orderId);
  }

  override async getDelivery(_organizationId: string, deliveryId: string) {
    if (deliveryId === 'delivery-b') {
      return {
        id: 'delivery-b',
        organizationId: 'org-b',
        orderId: 'order-b',
        deliveredAt: '2026-09-14T14:00:00.000Z',
        deliveredTo: FOREIGN_SECRET,
        recordedByMemberId: 'member-b',
        source: 'employee_recorded' as const,
        notes: FOREIGN_SECRET,
        createdAt: NOW.toISOString(),
      };
    }
    return super.getDelivery(_organizationId, deliveryId);
  }

  override async getWarehouseExit(_organizationId: string, warehouseExitId: string) {
    if (warehouseExitId === 'exit-b') {
      return {
        id: 'exit-b',
        organizationId: 'org-b',
        orderId: 'order-b',
        exitedAt: '2026-09-14T13:00:00.000Z',
        recordedByMemberId: 'member-b',
        source: 'employee_recorded',
        notes: FOREIGN_SECRET,
        createdAt: NOW.toISOString(),
      } satisfies WarehouseExitRecord;
    }
    return super.getWarehouseExit(_organizationId, warehouseExitId);
  }
}

function seed(store: MemoryDeliveryStore, scopes: readonly string[]) {
  store.putMember({
    id: 'member-a',
    organizationId: 'org-a',
    accessStatus: 'active',
    grantedScopes: scopes,
  });
  store.putOrder({ id: 'order-a', organizationId: 'org-a', status: 'open', lines: null });
  store.putOrder({ id: 'order-b', organizationId: 'org-b', status: 'open', lines: null });
}

function ctx(actorMemberId = 'member-a') {
  return { organizationId: 'org-a', actorMemberId, effectiveAt: NOW };
}

function assertQuiet(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  assert.equal(message, 'NOT_FOUND');
  assert.equal(message.includes(FOREIGN_SECRET), false);
  assert.equal(message.includes('org-b'), false);
  return true;
}

describe('delivery writes prove the session organization before insert', () => {
  it('does not treat the memory store as tenant proof and marks the live write unproven', async () => {
    assert.equal(MEMORY_DELIVERY_STORE_IS_TENANT_PROOF, false);
    assert.equal(DELIVERY_LIVE_WRITE, 'UNPROVEN');
    const store = new MemoryDeliveryStore();
    await store.insertWarehouseExit({
      id: 'exit-foreign',
      organizationId: 'org-b',
      orderId: 'order-b',
      exitedAt: '2026-09-14T13:00:00.000Z',
      recordedByMemberId: 'member-b',
      source: 'employee_recorded',
      notes: FOREIGN_SECRET,
      createdAt: NOW.toISOString(),
    });
    assert.equal((await store.listAllWarehouseExits('org-a')).some((row) => row.id === 'exit-foreign'), false);
    const source = readFileSync(join(__dirname, 'delivery-command-service.ts'), 'utf8');
    assert.equal(source.includes('findUnique'), false);
    assert.equal(source.includes('prisma'), false);
  });

  it('does not insert a warehouse exit or delivery for a foreign order id', async () => {
    const store = new CountingStore();
    seed(store, [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE]);
    const service = new DeliveryCommandService(store);

    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx(), {
          orderId: 'order-b',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      assertQuiet,
    );
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(ctx(), {
          orderId: 'order-b',
          deliveredAt: '2026-09-14T14:00:00.000Z',
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      assertQuiet,
    );
    assert.deepEqual(store.inserts, { exit: 0, note: 0, lines: 0, delivery: 0, evidence: 0 });
    assert.equal((await store.listAllWarehouseExits('org-a')).length, 0);
    assert.equal((await store.listAllDeliveries('org-b')).length, 0);
  });

  it('does not mutate when an id-only lookup returns another organization', async () => {
    const store = new LeakyOrderStore();
    seed(store, [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE]);
    const service = new DeliveryCommandService(store);

    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx(), {
          orderId: 'order-b',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      assertQuiet,
    );
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'delivery',
          subjectId: 'delivery-b',
          role: 'commercial_coordination',
          recordedBy: 'member-a',
        }),
      assertQuiet,
    );
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'warehouse_exit',
          subjectId: 'exit-b',
          role: 'warehouse_outbound',
          recordedBy: 'member-a',
        }),
      assertQuiet,
    );
    assert.equal(store.inserts.exit, 0);
    assert.equal(store.inserts.delivery, 0);
    assert.equal(store.inserts.evidence, 0);
  });

  it('does not let receive or commercial.team.read record an exit, a delivery, or evidence', async () => {
    for (const scope of [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]) {
      const store = new CountingStore();
      seed(store, [scope]);
      const service = new DeliveryCommandService(store);
      await assert.rejects(
        () =>
          service.recordWarehouseExit(ctx(), {
            orderId: 'order-a',
            exitedAt: '2026-09-14T13:00:00.000Z',
            recordedBy: 'member-a',
            source: 'employee_recorded',
          }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        () =>
          service.recordCustomerDelivery(ctx(), {
            orderId: 'order-a',
            deliveredAt: '2026-09-14T14:00:00.000Z',
            recordedBy: 'member-a',
            source: 'employee_recorded',
          }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        () =>
          service.recordEvidence(ctx(), {
            subjectType: 'delivery',
            subjectId: 'delivery-a',
            role: 'commercial_coordination',
            recordedBy: 'member-a',
          }),
        /PERMISSION_DENIED/,
      );
      assert.equal(store.inserts.exit, 0);
      assert.equal(store.inserts.delivery, 0);
      assert.equal(store.inserts.evidence, 0);
    }
  });

  it('does not let delivery.record authorize a warehouse exit or allocate finished goods', async () => {
    const store = new CountingStore();
    seed(store, [CUSTOMER_DELIVERY_RECORD_SCOPE]);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx(), {
          orderId: 'order-a',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () =>
        service.recordEvidence(ctx(), {
          subjectType: 'warehouse_exit',
          subjectId: 'exit-a',
          role: 'warehouse_outbound',
          recordedBy: 'member-a',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.inserts.exit, 0);
    assert.equal(store.inserts.evidence, 0);
    const { canAllocateFinishedGoods } = await import('../../os-contracts/src/warehouse-task');
    assert.equal(canAllocateFinishedGoods({ grantedScopes: [CUSTOMER_DELIVERY_RECORD_SCOPE] }), false);
    assert.equal(canAllocateFinishedGoods({ grantedScopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE] }), false);
    assert.equal(canAllocateFinishedGoods({ grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE] }), false);
  });
});
