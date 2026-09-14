import { z } from 'zod';

/**
 * Finished-goods allocation. A receipt into Almacén de Productos Terminados is not an allocation.
 * Allocation is a later explicit command. It does not rebuild production and does not create a receipt.
 *
 * An OrderAllocation answers: which finished product, which Product ID, quantity, which OrderLine,
 * allocatedAt, actor, and source. Quantity may be partial. Several allocations may later satisfy
 * one OrderLine. This is not a delivery workflow and not an inventory ledger.
 *
 * Availability is a projection of same-tenant receipts minus same-tenant allocations.
 * It is not official stock. If that figure is unknown, do not invent one.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * CROSS_LANE: merge prisma/fragments/order-allocation.prisma into schema.prisma
 *   and add OsOrganization.orderAllocations OsOrderAllocation[].
 * Do not foreign-key os_order_lines, product master, or production receipts.
 * Do not register a delivery status or a stock balance.
 */

export const ORDER_ALLOCATION_SOURCE = 'explicit_command' as const;
export const ORDER_ALLOCATION_COMMAND = 'AllocateFinishedGoods' as const;
export const ORDER_ALLOCATION_GOODS_KIND = 'finished' as const;

/** Unmounted label. Not a screen, not a delivery status, and not rendered here. */
export const ORDER_ALLOCATION_LABEL = 'Asignación a pedido';

export const ORDER_ALLOCATION_COLUMNS = [
  'id',
  'organization_id',
  'product_id',
  'goods_kind',
  'quantity',
  'order_line_id',
  'allocated_at',
  'recorded_at',
  'actor_member_id',
  'actor_label',
  'source',
  'finished_goods_receipt_id',
  'idempotency_key',
] as const;

const DECIMAL_SCALE = 6;
const positiveDecimal = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .refine((value) => parseQuantity(value) > 0n, 'Quantity must be greater than zero');
const signedDecimal = z.string().trim().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);
const timestamp = z.string().datetime();
const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export type FinishedGoodsReceiptQuantity = {
  organizationId: string;
  productId: string;
  quantity: string;
  receiptId: string | null;
};

export type OrderAllocation = {
  id: string;
  organizationId: string;
  /** Finished product, identified by Product ID. Not a name and not a SKU catalog. */
  finishedProductId: string;
  productId: string;
  goodsKind: typeof ORDER_ALLOCATION_GOODS_KIND;
  quantity: string;
  orderLineId: string;
  allocatedAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof ORDER_ALLOCATION_SOURCE;
  /** Optional citation. Naming a receipt does not create it and does not allocate by itself. */
  finishedGoodsReceiptId: string | null;
  idempotencyKey: string | null;
  createdByReceipt: false;
  officialStock: false;
  wholeOrderFulfilled: false;
  isPartialDeliveryWorkflow: false;
};

export type AvailabilityProjection = {
  organizationId: string;
  productId: string;
  /** False when receipts were not provided. Do not read availableQuantity as zero in that case. */
  known: boolean;
  receiptQuantity: string | null;
  allocatedQuantity: string;
  availableQuantity: string | null;
  officialStock: false;
  isLedger: false;
};

export type MissingAvailability = {
  ok: false;
  reason: 'missing_availability';
  availableQuantity: null;
  officialStock: false;
};

export type ExceedsAvailable = {
  ok: false;
  reason: 'exceeds_available';
  requestedQuantity: string;
  availableQuantity: string;
  officialStock: false;
};

export type CrossTenantAllocation = {
  ok: false;
  reason: 'cross_tenant';
  officialStock: false;
};

export type AllocationConflict = {
  ok: false;
  reason: 'conflict';
  conflict: 'id_exists' | 'idempotency_mismatch';
  officialStock: false;
};

export type AllocateFinishedGoodsResult =
  | { ok: true; allocation: OrderAllocation }
  | MissingAvailability
  | ExceedsAvailable
  | CrossTenantAllocation
  | AllocationConflict;

const receiptFactSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    productId: z.string().trim().min(1),
    quantity: positiveDecimal,
    receiptId: optionalText,
  })
  .strict();

const allocateSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    productId: z.string().trim().min(1),
    quantity: positiveDecimal,
    orderLineId: z.string().trim().min(1),
    orderLineOrganizationId: z.string().trim().min(1),
    allocatedAt: timestamp,
    recordedAt: timestamp,
    actorMemberId: optionalText,
    actorLabel: z.string().trim().min(1),
    source: z.literal(ORDER_ALLOCATION_SOURCE),
    finishedGoodsReceiptId: optionalText,
    finishedGoodsReceiptOrganizationId: optionalText,
    knownAvailableQuantity: signedDecimal.nullable().optional(),
    receipts: z.array(receiptFactSchema).nullable().optional(),
    idempotencyKey: optionalText,
  })
  .strict();

export type AllocateFinishedGoodsInput = z.input<typeof allocateSchema>;

/** A finished-goods receipt is warehouse entry. It does not allocate to a Pedido. */
export function receiptAllocatesToOrder(): false {
  return false;
}

/** Allocation never assumes the whole order is fulfilled by this quantity. */
export function allocationFulfillsWholeOrder(): false {
  return false;
}

export function allocationIsOfficialStock(): false {
  return false;
}

/**
 * Observing a receipt writes nothing. This lane does not create the receipt.
 * Allocation requires AllocateFinishedGoods.
 */
export function observeFinishedGoodsReceipt(_input: unknown): {
  allocated: false;
  allocation: null;
  receiptCreated: false;
} {
  return { allocated: false, allocation: null, receiptCreated: false };
}

export function projectFinishedGoodsAvailability(input: {
  organizationId: string;
  productId: string;
  receipts: readonly FinishedGoodsReceiptQuantity[] | null;
  allocations: readonly OrderAllocation[];
}): AvailabilityProjection {
  const allocated = sumSameTenantProduct(input.allocations, input.organizationId, input.productId);
  if (input.receipts === null) {
    return {
      organizationId: input.organizationId,
      productId: input.productId,
      known: false,
      receiptQuantity: null,
      allocatedQuantity: formatQuantity(allocated),
      availableQuantity: null,
      officialStock: false,
      isLedger: false,
    };
  }

  const received = input.receipts.reduce((total, receipt) => {
    if (receipt.organizationId !== input.organizationId || receipt.productId !== input.productId) {
      return total;
    }
    return total + parseQuantity(receipt.quantity);
  }, 0n);

  return {
    organizationId: input.organizationId,
    productId: input.productId,
    known: true,
    receiptQuantity: formatQuantity(received),
    allocatedQuantity: formatQuantity(allocated),
    availableQuantity: formatQuantity(received - allocated),
    officialStock: false,
    isLedger: false,
  };
}

export function quantityAllocatedToOrderLine(
  allocations: readonly OrderAllocation[],
  organizationId: string,
  orderLineId: string,
): string {
  const total = allocations.reduce((sum, allocation) => {
    if (allocation.organizationId !== organizationId || allocation.orderLineId !== orderLineId) return sum;
    return sum + parseQuantity(allocation.quantity);
  }, 0n);
  return formatQuantity(total);
}

export function decideAllocation(
  input: unknown,
  existingAllocations: readonly OrderAllocation[],
): AllocateFinishedGoodsResult {
  const parsed = allocateSchema.parse(input);
  if (
    parsed.orderLineOrganizationId !== parsed.organizationId ||
    (parsed.finishedGoodsReceiptOrganizationId !== null &&
      parsed.finishedGoodsReceiptOrganizationId !== parsed.organizationId)
  ) {
    return { ok: false, reason: 'cross_tenant', officialStock: false };
  }

  const receipts = parsed.receipts === undefined ? null : parsed.receipts;
  const projection = projectFinishedGoodsAvailability({
    organizationId: parsed.organizationId,
    productId: parsed.productId,
    receipts,
    allocations: existingAllocations,
  });
  const available = resolveAvailable(parsed.knownAvailableQuantity ?? null, projection);
  if (available.kind === 'missing') {
    return {
      ok: false,
      reason: 'missing_availability',
      availableQuantity: null,
      officialStock: false,
    };
  }

  const requested = parseQuantity(parsed.quantity);
  const remaining = parseQuantity(available.availableQuantity);
  if (requested > remaining) {
    return {
      ok: false,
      reason: 'exceeds_available',
      requestedQuantity: parsed.quantity,
      availableQuantity: available.availableQuantity,
      officialStock: false,
    };
  }

  const allocation: OrderAllocation = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    finishedProductId: parsed.productId,
    productId: parsed.productId,
    goodsKind: ORDER_ALLOCATION_GOODS_KIND,
    quantity: parsed.quantity,
    orderLineId: parsed.orderLineId,
    allocatedAt: parsed.allocatedAt,
    recordedAt: parsed.recordedAt,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: ORDER_ALLOCATION_SOURCE,
    finishedGoodsReceiptId: parsed.finishedGoodsReceiptId,
    idempotencyKey: parsed.idempotencyKey,
    createdByReceipt: false,
    officialStock: false,
    wholeOrderFulfilled: false,
    isPartialDeliveryWorkflow: false,
  };
  return { ok: true, allocation };
}

function resolveAvailable(
  told: string | null,
  projection: AvailabilityProjection,
): { kind: 'missing' } | { kind: 'known'; availableQuantity: string } {
  const projected = projection.known ? projection.availableQuantity : null;
  if (told !== null && projected !== null) {
    const toldScaled = parseQuantity(told);
    const projectedScaled = parseQuantity(projected);
    const tighter = toldScaled < projectedScaled ? toldScaled : projectedScaled;
    return { kind: 'known', availableQuantity: formatQuantity(tighter) };
  }
  if (told !== null) return { kind: 'known', availableQuantity: formatQuantity(parseQuantity(told)) };
  if (projected !== null) return { kind: 'known', availableQuantity: projected };
  return { kind: 'missing' };
}

function sumSameTenantProduct(
  allocations: readonly OrderAllocation[],
  organizationId: string,
  productId: string,
): bigint {
  return allocations.reduce((sum, allocation) => {
    if (allocation.organizationId !== organizationId || allocation.productId !== productId) return sum;
    return sum + parseQuantity(allocation.quantity);
  }, 0n);
}

export function parseQuantity(value: string): bigint {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(body)) {
    throw new Error('Invalid quantity');
  }
  const [whole, fraction = ''] = body.split('.');
  if (whole === undefined) throw new Error('Invalid quantity');
  if (fraction.length > DECIMAL_SCALE) {
    throw new Error('Quantity has more than 6 decimal places');
  }
  const padded = fraction.padEnd(DECIMAL_SCALE, '0');
  const scaled = BigInt(whole) * 1_000_000n + BigInt(padded);
  if (trimmed === '-0' || (negative && scaled === 0n)) return 0n;
  return negative ? -scaled : scaled;
}

export function formatQuantity(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 1_000_000n;
  const fraction = (abs % 1_000_000n).toString().padStart(DECIMAL_SCALE, '0').replace(/0+$/, '');
  const body = fraction.length > 0 ? `${whole}.${fraction}` : `${whole}`;
  return negative ? `-${body}` : body;
}
