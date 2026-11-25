/**
 * Finished-goods receive and allocate command contracts.
 *
 * ReceiveFinishedGoods is physical receipt into Almacén de Productos Terminados.
 * AllocateFinishedGoods is a later explicit assignment to an OrderLine.
 * Neither is delivery, stock/FIFO/valuation, or a fulfillment status.
 * Optional contextOrderId / contextOrderLineId are Pedido operational citations only.
 *
 * Separate from DELIVERY_COMMAND_NAMES (Agent 3). Do not register delivery here.
 */

import { z } from 'zod';

export const FINISHED_GOODS_COMMAND_NAMES = ['ReceiveFinishedGoods', 'AllocateFinishedGoods'] as const;
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

/**
 * Client allocate payload. Organization, actor, timestamps, source and
 * availability projection are filled from the trusted session and durable
 * receipts — never invented client-side stock.
 */
export const AllocateFinishedGoodsPayloadSchema = z
  .object({
    productId: z.string().trim().min(1),
    quantity: z.string().trim().min(1),
    orderLineId: z.string().trim().min(1),
    finishedGoodsReceiptId: optionalTrimmed,
  })
  .strict();

export type AllocateFinishedGoodsPayload = z.output<typeof AllocateFinishedGoodsPayloadSchema>;

export const FINISHED_GOODS_COMMAND_PAYLOAD_SCHEMAS: Record<
  FinishedGoodsCommandName,
  z.ZodTypeAny
> = {
  ReceiveFinishedGoods: ReceiveFinishedGoodsPayloadSchema,
  AllocateFinishedGoods: AllocateFinishedGoodsPayloadSchema,
};
