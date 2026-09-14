/**
 * Finished-goods handoff reader.
 *
 * Schema inspection on this SHA: there is no FinishedGoodsReceipt model and no
 * os_finished_goods_receipts table. OsProductionTraceEntry.kind may be
 * finished_goods_receipt. That is a manufacturing trace, not a warehouse receipt
 * table. OsOrderAllocation.finishedGoodsReceiptId is an optional citation, not a
 * receipt and not a foreign key.
 *
 * Listo means a receipt into Almacén de Productos Terminados. It is not allocation.
 * This reader does not invent a table, a migration, or zero stock.
 */

import { gateCompanyOperatingRead, type TrustedOperatingSession } from './capability';
import type { OperatingReadDb } from './db-port';
import { unproven, type UnprovenRead } from './source-state';

export const FINISHED_GOODS_WAREHOUSE_LABEL = 'Almacén de Productos Terminados' as const;

export const FINISHED_GOODS_RECEIPT_MODEL = null;

export const FINISHED_GOODS_RECEIPT_UNPROVEN = {
  state: 'UNPROVEN' as const,
  reasonCode: 'NO_LIVE_READER' as const,
  reason: 'missing_model' as const,
  warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
  model: FINISHED_GOODS_RECEIPT_MODEL,
  listoIsAllocation: false as const,
  stockQuantity: null,
  representAsZeroStock: false as const,
  inspected: [
    'No FinishedGoodsReceipt Prisma model',
    'No os_finished_goods_receipts table',
    'OsProductionTraceEntry.kind finished_goods_receipt is a manufacturing trace, not a receipt table',
    'OsOrderAllocation.finishedGoodsReceiptId is an optional citation, not a foreign key and not a receipt',
  ] as const,
};

export async function readFinishedGoodsReceipts(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
}): Promise<UnprovenRead> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return gate.result;
  void input.db;
  return unproven({
    organizationId: gate.organizationId,
    reasonCode: 'NO_LIVE_READER',
    reason: 'missing_model',
    detail:
      'No FinishedGoodsReceipt model. Listo is a receipt into Almacén de Productos Terminados, not an allocation and not zero stock. Allocation rows are not receipts.',
  });
}
