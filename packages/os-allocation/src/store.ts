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

/**
 * In-memory finished-goods allocation.
 * Receipts are not stored and do not allocate. There is no inventory ledger.
 */
/**
 * Process-local helper. Filtering this array is not tenant proof and is not a
 * live write. Callers must not treat a successful allocate() as hosted isolation.
 */
export const IN_MEMORY_ALLOCATION_IS_TENANT_PROOF = false;

export class InMemoryOrderAllocationStore {
  private readonly allocations: OrderAllocation[] = [];

  observeFinishedGoodsReceipt(input: unknown): {
    allocated: false;
    allocation: null;
    receiptCreated: false;
  } {
    return observeFinishedGoodsReceipt(input);
  }

  allocate(input: unknown): AllocateFinishedGoodsResult {
    const draft = asRecord(input);
    const organizationId = typeof draft?.organizationId === 'string' ? draft.organizationId : '';
    const id = typeof draft?.id === 'string' ? draft.id : '';
    const idempotencyKey = typeof draft?.idempotencyKey === 'string' ? draft.idempotencyKey : null;

    // Same-tenant id only. A foreign allocation id is not a conflict and is not returned.
    if (
      id &&
      organizationId &&
      this.allocations.some((item) => item.id === id && item.organizationId === organizationId)
    ) {
      return { ok: false, reason: 'conflict', conflict: 'id_exists', officialStock: false };
    }
    if (idempotencyKey && organizationId) {
      const prior = this.allocations.find(
        (item) => item.organizationId === organizationId && item.idempotencyKey === idempotencyKey,
      );
      if (prior) {
        if (!sameCommand(prior, draft)) {
          return { ok: false, reason: 'conflict', conflict: 'idempotency_mismatch', officialStock: false };
        }
        return { ok: true, allocation: structuredClone(prior) };
      }
    }

    const decision = decideAllocation(input, this.allocations);
    if (!decision.ok) return decision;
    this.allocations.push(structuredClone(decision.allocation));
    return { ok: true, allocation: structuredClone(decision.allocation) };
  }

  get(organizationId: string, id: string): OrderAllocation | null {
    const found = this.allocations.find((item) => item.id === id && item.organizationId === organizationId);
    return found ? structuredClone(found) : null;
  }

  listForProduct(organizationId: string, productId: string): OrderAllocation[] {
    return this.allocations
      .filter((item) => item.organizationId === organizationId && item.productId === productId)
      .slice()
      .sort(byTimeThenId)
      .map((item) => structuredClone(item));
  }

  listForOrderLine(organizationId: string, orderLineId: string): OrderAllocation[] {
    return this.allocations
      .filter((item) => item.organizationId === organizationId && item.orderLineId === orderLineId)
      .slice()
      .sort(byTimeThenId)
      .map((item) => structuredClone(item));
  }

  projectAvailability(input: {
    organizationId: string;
    productId: string;
    receipts: readonly FinishedGoodsReceiptQuantity[] | null;
  }): AvailabilityProjection {
    return projectFinishedGoodsAvailability({
      ...input,
      allocations: this.allocations,
    });
  }

  quantityAllocatedToOrderLine(organizationId: string, orderLineId: string): string {
    return quantityAllocatedToOrderLine(this.allocations, organizationId, orderLineId);
  }
}

function byTimeThenId(left: OrderAllocation, right: OrderAllocation): number {
  return left.allocatedAt.localeCompare(right.allocatedAt) || left.id.localeCompare(right.id);
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
