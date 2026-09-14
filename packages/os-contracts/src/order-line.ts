import { z } from 'zod';

/**
 * Order lines are snapshots copied from quote lines at conversion.
 * They are not a product-master join and must not be rebuilt from order totals.
 *
 * CROSS_LANE_CHANGE_REQUEST: export this file from
 * packages/os-contracts/src/index.ts. Do not backfill historical orders.
 */

export const ORDER_LINE_PROVENANCE = 'quote_conversion_snapshot' as const;

export const ORDER_LINE_PROVENANCE_VALUES = [ORDER_LINE_PROVENANCE] as const;

const centavosStringSchema = z.string().regex(/^\d+$/);

export const OrderLineSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    orderId: z.string().min(1),
    quoteId: z.string().min(1),
    quoteLineId: z.string().min(1),
    lineNumber: z.number().int().positive(),
    descriptionSnapshot: z.string().min(1),
    quantity: z.number().int().positive(),
    unitLabel: z.string().min(1).nullable(),
    unitPriceCentavosSnapshot: centavosStringSchema,
    discountCentavos: centavosStringSchema,
    lineTotalCentavos: centavosStringSchema,
    productRefSnapshot: z.string().min(1).nullable(),
    provenance: z.literal(ORDER_LINE_PROVENANCE),
    copiedAt: z.string().datetime(),
  })
  .strict();

export type OrderLine = z.infer<typeof OrderLineSchema>;

/** Header totals are not a line. Old orders stay without invented detail. */
export function orderLinesFromHeader(_header: {
  subtotalCentavos?: string | bigint | null;
  totalCentavos?: string | bigint | null;
  currency?: string | null;
}): null {
  return null;
}
