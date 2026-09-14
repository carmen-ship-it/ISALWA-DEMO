/**
 * Finished-goods receipt reader.
 *
 * OsFinishedGoodsReceipt is a warehouse receipt into Almacén de Productos
 * Terminados. OsProductionTraceEntry.kind finished_goods_receipt remains a
 * manufacturing trace. OsOrderAllocation.finishedGoodsReceiptId remains an
 * optional citation, not a foreign key and not shared ownership.
 *
 * A port that does not implement listFinishedGoodsReceipts has no coverage.
 * That stays UNPROVEN. An authorized empty query is NO_FACT. Neither is zero stock.
 * warehouse.finished_goods.receive does not authorize this company read.
 */

import { gateCompanyOperatingRead, type TrustedOperatingSession } from './capability';
import type { FinishedGoodsReceiptRow, OperatingReadDb } from './db-port';
import { iso, storedText } from './rows';
import {
  availableFacts,
  queryFailed,
  unproven,
  type ReadResult,
} from './source-state';

export const FINISHED_GOODS_WAREHOUSE_LABEL = 'Almacén de Productos Terminados' as const;

export const FINISHED_GOODS_RECEIPT_MODEL = 'OsFinishedGoodsReceipt' as const;

export const FINISHED_GOODS_RECEIPT_TABLE = 'os_finished_goods_receipts' as const;

export const FINISHED_GOODS_RECEIPT_MIGRATION_APPLIED = false as const;

export const FINISHED_GOODS_LISTO_IS_ALLOCATION = false as const;

export type FinishedGoodsReceiptFact = {
  id: string;
  organizationId: string;
  productId: string;
  quantity: string;
  warehouseLabel: typeof FINISHED_GOODS_WAREHOUSE_LABEL;
  receivedAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  productionTraceEntryId: string | null;
  quemaId: string | null;
  correctsReceiptId: string | null;
  correctionReason: string | null;
  allocatesToOrder: false;
  postsStock: false;
  officialStock: false;
  listoMeansAllocated: false;
};

function toFact(row: FinishedGoodsReceiptRow, organizationId: string): FinishedGoodsReceiptFact | null {
  if (row.organizationId !== organizationId) return null;
  if (row.warehouseLabel !== FINISHED_GOODS_WAREHOUSE_LABEL) return null;
  const productId = storedText(row.productId);
  const quantity = storedText(row.quantity);
  const receivedAt = iso(row.receivedAt);
  const recordedAt = iso(row.recordedAt);
  if (!productId || !quantity || !receivedAt || !recordedAt) return null;
  return {
    id: row.id,
    organizationId,
    productId,
    quantity,
    warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
    receivedAt,
    recordedAt,
    actorMemberId: storedText(row.actorMemberId),
    actorLabel: storedText(row.actorLabel) ?? '',
    source: storedText(row.source) ?? 'explicit_command',
    productionTraceEntryId: storedText(row.productionTraceEntryId),
    quemaId: storedText(row.quemaId),
    correctsReceiptId: storedText(row.correctsReceiptId),
    correctionReason: storedText(row.correctionReason),
    allocatesToOrder: false,
    postsStock: false,
    officialStock: false,
    listoMeansAllocated: false,
  };
}

export async function readFinishedGoodsReceipts(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  productId?: string | null;
}): Promise<ReadResult<FinishedGoodsReceiptFact>> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return gate.result;
  const list = input.db?.listFinishedGoodsReceipts;
  if (!input.db || typeof list !== 'function') {
    return unproven({
      organizationId: gate.organizationId,
      reasonCode: 'NO_LIVE_READER',
      reason: 'missing_model',
      detail:
        'The receipt port is not connected. A missing port is not zero receipts and not zero stock. Allocation rows are not receipts.',
    });
  }
  try {
    const productId = input.productId?.trim() || undefined;
    const rows = await list.call(input.db, {
      organizationId: gate.organizationId,
      ...(productId ? { productId } : {}),
    });
    const facts = rows
      .map((row) => toFact(row, gate.organizationId))
      .filter((row): row is FinishedGoodsReceiptFact => row != null);
    return availableFacts(gate.organizationId, facts);
  } catch {
    return queryFailed(gate.organizationId);
  }
}
