/**
 * Allocation reader. Remaining quantity is returned only if a stored column
 * holds it. OsOrderAllocation stores quantity, not remaining and not on-hand.
 * Partial and multiple allocations are allowed. A read does not allocate.
 */

import { gateCompanyOperatingRead, type TrustedOperatingSession } from './capability';
import type { OperatingReadDb, OrderAllocationRow } from './db-port';
import { iso, sameTenant, storedText } from './rows';
import {
  availableFacts,
  missingFact,
  queryFailed,
  tenantPredicate,
  unproven,
  type ReadResult,
} from './source-state';

export type OrderAllocationFact = {
  id: string;
  organizationId: string;
  productId: string;
  goodsKind: string;
  /** Stored allocated quantity. Not on-hand stock and not a remainder. */
  quantity: string;
  orderLineId: string;
  allocatedAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  finishedGoodsReceiptId: string | null;
  receiptCitationProvesReceipt: false;
  remainingQuantity: null;
  remainingQuantityState: 'UNPROVEN';
  remainingQuantityReason: 'not_stored';
  onHandStock: null;
  officialStock: false;
  partialAllowed: true;
  multipleAllowed: true;
  isFulfillmentStatus: false;
  allocatePermitted: false;
};

export type AllocationReadResult = ReadResult<OrderAllocationFact> & {
  allocatePermitted: false;
  readDoesNotAuthorizeAllocate: true;
};

function noReader(organizationId: string): AllocationReadResult {
  return {
    ...unproven({
      organizationId,
      reasonCode: 'NO_LIVE_READER',
      reason: 'NO_LIVE_READER',
      detail: 'No database port for order allocation. This is not zero allocated quantity.',
    }),
    allocatePermitted: false,
    readDoesNotAuthorizeAllocate: true,
  };
}

function withAllocateFlag<T extends ReadResult<OrderAllocationFact>>(result: T): AllocationReadResult {
  return {
    ...result,
    allocatePermitted: false,
    readDoesNotAuthorizeAllocate: true,
  };
}

function fact(row: OrderAllocationRow): OrderAllocationFact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    productId: row.productId,
    goodsKind: row.goodsKind,
    quantity: row.quantity,
    orderLineId: row.orderLineId,
    allocatedAt: iso(row.allocatedAt),
    recordedAt: iso(row.recordedAt),
    actorMemberId: storedText(row.actorMemberId),
    actorLabel: row.actorLabel,
    source: row.source,
    finishedGoodsReceiptId: storedText(row.finishedGoodsReceiptId),
    receiptCitationProvesReceipt: false,
    remainingQuantity: null,
    remainingQuantityState: 'UNPROVEN',
    remainingQuantityReason: 'not_stored',
    onHandStock: null,
    officialStock: false,
    partialAllowed: true,
    multipleAllowed: true,
    isFulfillmentStatus: false,
    allocatePermitted: false,
  };
}

export async function readOrderAllocations(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  productId?: string;
  orderLineId?: string;
}): Promise<AllocationReadResult> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return { ...gate.result, allocatePermitted: false, readDoesNotAuthorizeAllocate: true };
  if (!input.db) return noReader(gate.organizationId);

  const productId = input.productId?.trim() ?? '';
  const orderLineId = input.orderLineId?.trim() ?? '';
  try {
    if (productId) {
      const proven = await input.db.productProvenInOrganization({
        ...tenantPredicate(gate.organizationId),
        productId,
      });
      if (!proven) return withAllocateFlag(missingFact(gate.organizationId));
    }
    const rows = sameTenant(
      gate.organizationId,
      await input.db.listOrderAllocations({
        ...tenantPredicate(gate.organizationId),
        ...(productId ? { productId } : {}),
        ...(orderLineId ? { orderLineId } : {}),
      }),
    ).filter((row) => {
      if (productId && row.productId !== productId) return false;
      if (orderLineId && row.orderLineId !== orderLineId) return false;
      return true;
    });
    return withAllocateFlag(availableFacts(gate.organizationId, rows.map(fact)));
  } catch {
    return withAllocateFlag(queryFailed(gate.organizationId));
  }
}

export async function readOrderAllocationById(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  id: string;
}): Promise<AllocationReadResult> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return { ...gate.result, allocatePermitted: false, readDoesNotAuthorizeAllocate: true };
  const id = input.id.trim();
  if (!id) return withAllocateFlag(missingFact(gate.organizationId));
  if (!input.db) return noReader(gate.organizationId);
  try {
    const row = await input.db.getOrderAllocation({
      ...tenantPredicate(gate.organizationId),
      id,
    });
    if (!row || row.organizationId !== gate.organizationId || row.id !== id) {
      return withAllocateFlag(missingFact(gate.organizationId));
    }
    return withAllocateFlag(availableFacts(gate.organizationId, [fact(row)]));
  } catch {
    return withAllocateFlag(queryFailed(gate.organizationId));
  }
}
