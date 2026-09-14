/**
 * Prisma port for OsOrderAllocation. Migration exists and is not applied here.
 * Follows the finished-goods receive store shape: structural delegates, org-keyed
 * finds, insert only after decideAllocation. A denied allocate does not write a
 * success event.
 */

import {
  decideAllocation,
  observeFinishedGoodsReceipt,
  projectFinishedGoodsAvailability,
  quantityAllocatedToOrderLine,
  type AllocateFinishedGoodsResult,
  type AvailabilityProjection,
  type FinishedGoodsReceiptQuantity,
  type OrderAllocation,
} from '../../os-contracts/src/order-allocation';
import { WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE } from '../../os-contracts/src/warehouse-task';

export const ALLOCATION_PRISMA_LIVE_WRITE = 'prisma_port' as const;
export const ORDER_ALLOCATION_ALLOCATED_EVENT = 'finished_goods.allocated' as const;
export const ALLOCATION_MIGRATION_APPLIED = false as const;

type AllocationRow = {
  id: string;
  organizationId: string;
  productId: string;
  goodsKind: string;
  quantity: string;
  orderLineId: string;
  allocatedAt: Date | string;
  recordedAt: Date | string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  finishedGoodsReceiptId: string | null;
  idempotencyKey: string | null;
};

type PrismaAllocationDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<AllocationRow | null>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<AllocationRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

type PrismaEventDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

export type AllocationPrismaPort = {
  osOrderAllocation: PrismaAllocationDelegate;
  osBusinessEvent: PrismaEventDelegate;
};

export type AllocationSuccessEvent = {
  id: string;
  organizationId: string;
  eventType: typeof ORDER_ALLOCATION_ALLOCATED_EVENT;
  occurredAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  primaryEntityType: 'order_allocation';
  primaryEntityId: string;
  capabilityKey: typeof WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE;
  correlationId: string;
  idempotencyKey: string | null;
  provenance: 'command';
};

function asIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function toAllocation(row: AllocationRow): OrderAllocation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    finishedProductId: row.productId,
    productId: row.productId,
    goodsKind: 'finished',
    quantity: row.quantity,
    orderLineId: row.orderLineId,
    allocatedAt: asIso(row.allocatedAt),
    recordedAt: asIso(row.recordedAt),
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'explicit_command',
    finishedGoodsReceiptId: row.finishedGoodsReceiptId,
    idempotencyKey: row.idempotencyKey,
    createdByReceipt: false,
    officialStock: false,
    wholeOrderFulfilled: false,
    isPartialDeliveryWorkflow: false,
  };
}

function persistData(allocation: OrderAllocation): Record<string, unknown> {
  return {
    id: allocation.id,
    organizationId: allocation.organizationId,
    productId: allocation.productId,
    goodsKind: allocation.goodsKind,
    quantity: allocation.quantity,
    orderLineId: allocation.orderLineId,
    allocatedAt: new Date(allocation.allocatedAt),
    recordedAt: new Date(allocation.recordedAt),
    actorMemberId: allocation.actorMemberId,
    actorLabel: allocation.actorLabel,
    source: allocation.source,
    finishedGoodsReceiptId: allocation.finishedGoodsReceiptId,
    idempotencyKey: allocation.idempotencyKey,
  };
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown>;
}

function sameCommand(prior: OrderAllocation, draft: Record<string, unknown> | null): boolean {
  if (!draft) return false;
  return (
    draft.productId === prior.productId &&
    draft.quantity === prior.quantity &&
    draft.orderLineId === prior.orderLineId &&
    draft.source === prior.source
  );
}

/**
 * Tenant-keyed Prisma writer. Filtering without organizationId is not accepted.
 * liveWrite is prisma_port; migration is not applied by this port.
 */
export function createPrismaOrderAllocationStore(prisma: AllocationPrismaPort) {
  const events: AllocationSuccessEvent[] = [];

  async function listOrg(organizationId: string): Promise<OrderAllocation[]> {
    if (!organizationId.trim()) return [];
    const rows = await prisma.osOrderAllocation.findMany({
      where: { organizationId },
      orderBy: { allocatedAt: 'asc' },
    });
    return rows.map(toAllocation);
  }

  return {
    liveWrite: ALLOCATION_PRISMA_LIVE_WRITE,
    migrationApplied: ALLOCATION_MIGRATION_APPLIED,
    /** Test/inspection surface. Production callers use append through allocate. */
    get recordedEvents() {
      return events.slice();
    },

    observeFinishedGoodsReceipt(input: unknown) {
      return observeFinishedGoodsReceipt(input);
    },

    async get(organizationId: string, id: string): Promise<OrderAllocation | null> {
      if (!organizationId.trim() || !id.trim()) return null;
      const row = await prisma.osOrderAllocation.findFirst({
        where: { organizationId, id },
      });
      return row ? toAllocation(row) : null;
    },

    async allocate(input: unknown): Promise<AllocateFinishedGoodsResult> {
      const draft = asRecord(input);
      const organizationId = typeof draft?.organizationId === 'string' ? draft.organizationId : '';
      const id = typeof draft?.id === 'string' ? draft.id : '';
      const idempotencyKey = typeof draft?.idempotencyKey === 'string' ? draft.idempotencyKey : null;

      if (id && organizationId) {
        const existing = await prisma.osOrderAllocation.findFirst({
          where: { organizationId, id },
        });
        if (existing) {
          return { ok: false, reason: 'conflict', conflict: 'id_exists', officialStock: false };
        }
      }

      if (idempotencyKey && organizationId) {
        const priorRow = await prisma.osOrderAllocation.findFirst({
          where: { organizationId, idempotencyKey },
        });
        if (priorRow) {
          const prior = toAllocation(priorRow);
          if (!sameCommand(prior, draft)) {
            return { ok: false, reason: 'conflict', conflict: 'idempotency_mismatch', officialStock: false };
          }
          return { ok: true, allocation: prior };
        }
      }

      const existing = organizationId ? await listOrg(organizationId) : [];
      const decision = decideAllocation(input, existing);
      if (!decision.ok) return decision;

      await prisma.osOrderAllocation.create({ data: persistData(decision.allocation) });

      const event: AllocationSuccessEvent = {
        id: `evt-${decision.allocation.id}`,
        organizationId: decision.allocation.organizationId,
        eventType: ORDER_ALLOCATION_ALLOCATED_EVENT,
        occurredAt: decision.allocation.allocatedAt,
        recordedAt: decision.allocation.recordedAt,
        actorMemberId: decision.allocation.actorMemberId,
        primaryEntityType: 'order_allocation',
        primaryEntityId: decision.allocation.id,
        capabilityKey: WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
        correlationId: decision.allocation.id,
        idempotencyKey: decision.allocation.idempotencyKey,
        provenance: 'command',
      };
      await prisma.osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: new Date(event.occurredAt),
          recordedAt: new Date(event.recordedAt),
          actorMemberId: event.actorMemberId,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          capabilityKey: event.capabilityKey,
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          provenance: event.provenance,
        },
      });
      events.push(event);
      return { ok: true, allocation: decision.allocation };
    },

    async listForProduct(organizationId: string, productId: string): Promise<OrderAllocation[]> {
      if (!organizationId.trim()) return [];
      const rows = await prisma.osOrderAllocation.findMany({
        where: { organizationId, productId },
        orderBy: { allocatedAt: 'asc' },
      });
      return rows.map(toAllocation);
    },

    async listForOrderLine(organizationId: string, orderLineId: string): Promise<OrderAllocation[]> {
      if (!organizationId.trim()) return [];
      const rows = await prisma.osOrderAllocation.findMany({
        where: { organizationId, orderLineId },
        orderBy: { allocatedAt: 'asc' },
      });
      return rows.map(toAllocation);
    },

    async projectAvailability(input: {
      organizationId: string;
      productId: string;
      receipts: readonly FinishedGoodsReceiptQuantity[] | null;
    }): Promise<AvailabilityProjection> {
      const allocations = await listOrg(input.organizationId);
      return projectFinishedGoodsAvailability({
        ...input,
        allocations,
      });
    },

    async quantityAllocatedToOrderLine(organizationId: string, orderLineId: string): Promise<string> {
      const allocations = await listOrg(organizationId);
      return quantityAllocatedToOrderLine(allocations, organizationId, orderLineId);
    },
  };
}

export type PrismaOrderAllocationStore = ReturnType<typeof createPrismaOrderAllocationStore>;
