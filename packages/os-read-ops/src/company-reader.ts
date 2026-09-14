/**
 * Company operating reader. One trusted organization, one capability.
 * Finished-goods handoff stays UNPROVEN when the receipt model is missing.
 * Department role homes are not unlocked here.
 */

import { readOrderAllocations } from './allocation-reader';
import type { AllocationReadResult } from './allocation-reader';
import type { TrustedOperatingSession } from './capability';
import { CROSS_LANE_CHANGE_REQUESTS } from './cross-lane';
import type { OperatingReadDb } from './db-port';
import { readFinishedGoodsReceipts, FINISHED_GOODS_RECEIPT_UNPROVEN } from './finished-goods-reader';
import { readProductionFacts, type ProductionReadResult } from './production-reader';
import { readPurchaseRequests, type PurchaseRequestFact } from './purchase-reader';
import { COMPANY_OPERATING_READ_SCOPE, type ReadResult, type UnprovenRead } from './source-state';

export const UNPROVEN_OPERATING_READS = [
  {
    reader: 'finished_goods_receipt',
    ...FINISHED_GOODS_RECEIPT_UNPROVEN,
  },
  {
    reader: 'allocation_remaining_quantity',
    state: 'UNPROVEN' as const,
    reasonCode: 'not_stored' as const,
    reason: 'not_stored' as const,
    detail:
      'OsOrderAllocation stores quantity. It has no remaining-quantity column and no on-hand stock. Remaining is not computed.',
    stockQuantity: null,
    representAsZeroStock: false as const,
  },
  {
    reader: 'department_role_home',
    state: 'UNPROVEN' as const,
    reasonCode: 'CROSS_LANE_CHANGE_REQUEST' as const,
    reason: 'CROSS_LANE_CHANGE_REQUEST' as const,
    detail: CROSS_LANE_CHANGE_REQUESTS[0].detail,
    changeRequestId: CROSS_LANE_CHANGE_REQUESTS[0].id,
    stockQuantity: null,
    representAsZeroStock: false as const,
  },
] as const;

export async function readCompanyOperatingStores(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  productionProductId?: string;
}): Promise<{
  capability: typeof COMPANY_OPERATING_READ_SCOPE;
  purchase: ReadResult<PurchaseRequestFact>;
  production: ProductionReadResult;
  finishedGoodsReceipts: UnprovenRead;
  allocations: AllocationReadResult;
  crossLaneChangeRequests: typeof CROSS_LANE_CHANGE_REQUESTS;
  unproven: typeof UNPROVEN_OPERATING_READS;
}> {
  const [purchase, production, finishedGoodsReceipts, allocations] = await Promise.all([
    readPurchaseRequests({ session: input.session, db: input.db }),
    readProductionFacts({
      session: input.session,
      db: input.db,
      productId: input.productionProductId,
    }),
    readFinishedGoodsReceipts({ session: input.session, db: input.db }),
    readOrderAllocations({ session: input.session, db: input.db }),
  ]);
  return {
    capability: COMPANY_OPERATING_READ_SCOPE,
    purchase,
    production,
    finishedGoodsReceipts,
    allocations,
    crossLaneChangeRequests: CROSS_LANE_CHANGE_REQUESTS,
    unproven: UNPROVEN_OPERATING_READS,
  };
}
