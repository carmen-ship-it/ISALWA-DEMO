import { createId } from '@isalwa/ts-utils';
import type { QuoteLineRecord } from './store-types';
import type { OrderLineRecord } from './store-types';

/** Must match packages/os-contracts/src/order-line.ts. Not a live product join. */
export const ORDER_LINE_PROVENANCE = 'quote_conversion_snapshot' as const;

export type CopyQuoteLinesInput = {
  organizationId: string;
  orderId: string;
  quoteId: string;
  lines: readonly QuoteLineRecord[];
  copiedAt: Date;
  createLineId?: () => string;
};

/**
 * Copies quote lines onto an order. Values are snapshots taken now.
 * Does not read a product master and does not derive lines from order totals.
 * An empty quote is not filled in. A later catalog change cannot see these rows.
 */
export function copyQuoteLinesToOrderLines(input: CopyQuoteLinesInput): OrderLineRecord[] {
  const createLineId = input.createLineId ?? createId;
  const sorted = [...input.lines].sort((left, right) => left.lineNumber - right.lineNumber);
  return sorted.map((line) => {
    if (line.organizationId !== input.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }
    if (line.quoteId !== input.quoteId) {
      throw new Error('VALIDATION_FAILED');
    }
    return {
      id: createLineId(),
      organizationId: input.organizationId,
      orderId: input.orderId,
      quoteId: input.quoteId,
      quoteLineId: line.id,
      lineNumber: line.lineNumber,
      descriptionSnapshot: line.description,
      quantity: line.quantity,
      unitLabel: line.unitLabel,
      unitPriceCentavosSnapshot: line.unitPriceCentavos,
      discountCentavos: line.discountCentavos,
      lineTotalCentavos: line.lineTotalCentavos,
      productRefSnapshot: line.productRef,
      provenance: ORDER_LINE_PROVENANCE,
      copiedAt: input.copiedAt,
      createdAt: input.copiedAt,
    };
  });
}

export type OrderLineReadModel = {
  orderLineId: string;
  organizationId: string;
  orderId: string;
  quoteId: string;
  quoteLineId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: string;
  discountCentavos: string;
  lineTotalCentavos: string;
  productRef: string | null;
  provenance: typeof ORDER_LINE_PROVENANCE;
  copiedAt: string;
};

export function toOrderLineReadModel(record: OrderLineRecord): OrderLineReadModel {
  return {
    orderLineId: record.id,
    organizationId: record.organizationId,
    orderId: record.orderId,
    quoteId: record.quoteId,
    quoteLineId: record.quoteLineId,
    lineNumber: record.lineNumber,
    description: record.descriptionSnapshot,
    quantity: record.quantity,
    unitLabel: record.unitLabel,
    unitPriceCentavos: record.unitPriceCentavosSnapshot.toString(),
    discountCentavos: record.discountCentavos.toString(),
    lineTotalCentavos: record.lineTotalCentavos.toString(),
    productRef: record.productRefSnapshot,
    provenance: record.provenance,
    copiedAt: record.copiedAt.toISOString(),
  };
}

/** Header totals are not a line. Callers must not use this to fill a missing list. */
export function orderLinesFromHeader(_header: {
  subtotalCentavos?: bigint | null;
  totalCentavos?: bigint | null;
}): null {
  return null;
}
