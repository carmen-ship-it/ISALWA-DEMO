/**
 * Finished-goods receive command contracts.
 *
 * ReceiveFinishedGoods is physical receipt into Almacén de Productos Terminados.
 * It is not AllocateFinishedGoods, not delivery, and not stock/FIFO/valuation.
 * Optional contextOrderId / contextOrderLineId are Pedido operational citations only.
 *
 * Separate from DELIVERY_COMMAND_NAMES (Agent 3). Do not register delivery here.
 */

import { z } from 'zod';

export const FINISHED_GOODS_COMMAND_NAMES = ['ReceiveFinishedGoods'] as const;
export type FinishedGoodsCommandName = (typeof FINISHED_GOODS_COMMAND_NAMES)[number];

const optionalTrimmed = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

/**
 * Physical receive payload. Bare orderId / orderLineId / sku are rejected by the
 * domain writer as allocation-shaped. Use context* fields for Pedido citation.
 */
export const ReceiveFinishedGoodsPayloadSchema = z
  .object({
    productId: z.string().trim().min(1),
    quantity: z.string().trim().min(1),
    receivedAt: z.string().datetime().optional(),
    productionTraceEntryId: optionalTrimmed,
    quemaId: optionalTrimmed,
    contextOrderId: optionalTrimmed,
    contextOrderLineId: optionalTrimmed,
    note: optionalTrimmed,
    correctsReceiptId: optionalTrimmed,
    correctionReason: optionalTrimmed,
    /** Rejected at the writer — kept out of the contract surface. */
  })
  .strict();

export type ReceiveFinishedGoodsPayload = z.output<typeof ReceiveFinishedGoodsPayloadSchema>;

export const FINISHED_GOODS_COMMAND_PAYLOAD_SCHEMAS: Record<
  FinishedGoodsCommandName,
  z.ZodTypeAny
> = {
  ReceiveFinishedGoods: ReceiveFinishedGoodsPayloadSchema,
};
