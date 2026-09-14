import { z } from 'zod';

/**
 * Manufacturing trace. Product is the join key.
 *
 * Spine: Product → process records → Quema → classification → FinishedGoodsReceipt.
 * A quema mixes products. It is not a Pedido, and it is not one product.
 * Finished goods entering Almacén de Productos Terminados is Listo for the warehouse.
 * Assignment of that product to a customer order is another lane. There is no OrderAllocation here.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * CROSS_LANE: merge prisma/fragments/production-trace.prisma into schema.prisma.
 * Do not add an order id, a completion percent, a SKU catalog, a price, or a stock decrement.
 */

export const PRODUCTION_TRACE_SOURCE = 'manual' as const;

export const FINISHED_GOODS_WAREHOUSE_LABEL = 'Almacén de Productos Terminados' as const;

/** Listo means warehouse entry. It does not assign the product to a Pedido. */
export const LISTO_MEANING = 'finished_goods_entered_finished_goods_warehouse' as const;

export const PRODUCTION_STEPS = [
  { key: 'laboratorio', order: 1, label: 'Laboratorio — preparación de materia prima y esmalte' },
  { key: 'molienda', order: 2, label: 'Molienda' },
  { key: 'colaje', order: 3, label: 'Colaje' },
  { key: 'secado', order: 4, label: 'Secado' },
  { key: 'pulido', order: 5, label: 'Pulido' },
  { key: 'esmaltado', order: 6, label: 'Esmaltado' },
  { key: 'carga_y_limpieza', order: 7, label: 'Carga y Limpieza' },
  { key: 'horno', order: 8, label: 'Horno' },
  { key: 'resane', order: 9, label: 'Resane' },
  { key: 'clasificacion', order: 10, label: 'Clasificación' },
  { key: 'almacen_productos_terminados', order: 11, label: 'Almacén de Productos Terminados' },
] as const;

export const PRODUCTION_STEP_KEYS = PRODUCTION_STEPS.map((step) => step.key);

export type ProductionStepKey = (typeof PRODUCTION_STEPS)[number]['key'];

export const CONSUMPTION_CATEGORIES = [
  { key: 'raw_material', label: 'materia prima' },
  { key: 'supply', label: 'insumos' },
  { key: 'fuel', label: 'combustible' },
] as const;

export type ConsumptionCategory = (typeof CONSUMPTION_CATEGORIES)[number]['key'];

export const PRODUCTION_TRACE_KINDS = [
  'process_record',
  'loss',
  'consumption',
  'classification',
  'finished_goods_receipt',
] as const;

export type ProductionTraceKind = (typeof PRODUCTION_TRACE_KINDS)[number];

/** Columns a trace row may have. There is no order id and no completion percent. */
export const PRODUCTION_TRACE_ENTRY_COLUMNS = [
  'id',
  'organization_id',
  'kind',
  'product_id',
  'step_key',
  'quema_id',
  'actor_member_id',
  'actor_label',
  'source',
  'occurred_at',
  'recorded_at',
  'evidence_json',
  'quantity_lost',
  'percentage_lost',
  'loss_reason',
  'consumption_category',
  'consumption_description',
  'consumption_reference',
  'consumption_quantity',
  'consumption_unit',
  'inventory_effect',
  'good_count',
  'lost_count',
  'receipt_quantity',
  'note',
  'corrects_entry_id',
  'correction_reason',
  'idempotency_key',
] as const;

export const PRODUCTION_QUEMA_COLUMNS = [
  'id',
  'organization_id',
  'actor_member_id',
  'actor_label',
  'source',
  'evidence_json',
  'recorded_at',
  'idempotency_key',
] as const;

export const PRODUCTION_QUEMA_TIME_COLUMNS = [
  'id',
  'organization_id',
  'quema_id',
  'phase',
  'at',
  'actor_member_id',
  'actor_label',
  'source',
  'occurred_at',
  'recorded_at',
  'evidence_json',
  'corrects_time_id',
  'correction_reason',
] as const;

export const PRODUCTION_QUEMA_PRODUCT_COLUMNS = [
  'id',
  'organization_id',
  'quema_id',
  'product_id',
  'quantity',
  'unit',
  'actor_member_id',
  'actor_label',
  'source',
  'occurred_at',
  'recorded_at',
  'evidence_json',
  'corrects_link_id',
  'correction_reason',
] as const;

const FORBIDDEN_KEYS = [
  'orderId',
  'order_id',
  'pedidoId',
  'pedido_id',
  'orderLineId',
  'order_line_id',
  'completionPercent',
  'completion_percent',
  'percentComplete',
  'percent_complete',
  'progressPercent',
  'progress_percent',
  'goodPercent',
  'lostPercent',
  'sku',
  'price',
  'unitPrice',
  'unit_price',
  'priceCentavos',
  'orderAllocationId',
  'allocationId',
  'inventoryMovementId',
  'inventory_movement_id',
  'stockBalance',
  'stock_balance',
  'productName',
  'product_name',
] as const;

const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const productId = z.string().trim().min(1);

const decimal = z.string().trim().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);

const timestamp = z.string().datetime();

const evidenceSchema = z
  .object({
    reference: optionalText,
    note: optionalText,
  })
  .strict();

const provenanceSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    actorMemberId: optionalText,
    actorLabel: z.string().trim().min(1),
    source: z.literal(PRODUCTION_TRACE_SOURCE),
    occurredAt: timestamp,
    recordedAt: timestamp,
    evidence: evidenceSchema,
    correctsEntryId: optionalText,
    correctionReason: optionalText,
    idempotencyKey: optionalText,
  })
  .strict();

export type ProductionEvidence = { reference: string | null; note: string | null };

export type ProductionProvenance = {
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof PRODUCTION_TRACE_SOURCE;
  occurredAt: string;
  recordedAt: string;
  evidence: ProductionEvidence;
};

function rejectForbidden(value: unknown, path = 'input'): void {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new Error(`${path}.${key} is not a manufacturing field`);
    }
    rejectForbidden((value as Record<string, unknown>)[key], `${path}.${key}`);
  }
}

function assertCorrectionPair(correctsEntryId: string | null, correctionReason: string | null): void {
  if (correctsEntryId && !correctionReason) {
    throw new Error('A correction must say why. The prior record is not overwritten.');
  }
  if (!correctsEntryId && correctionReason) {
    throw new Error('A correction reason requires the prior record id');
  }
}

export function productionStepLabel(key: ProductionStepKey): string {
  const step = PRODUCTION_STEPS.find((item) => item.key === key);
  if (!step) throw new Error('Unknown production step');
  return step.label;
}

export function consumptionCategoryLabel(key: ConsumptionCategory): string {
  const category = CONSUMPTION_CATEGORIES.find((item) => item.key === key);
  if (!category) throw new Error('Unknown consumption category');
  return category.label;
}

/** A manufacturing record cannot be keyed to a Pedido. */
export function productionRecordMayReferenceOrder(): false {
  return false;
}

/** Consumption informs use. It does not decrement stock. Input stock is not reliable. */
export function consumptionMutatesStock(): false {
  return false;
}

export function inputStockIsReliable(): false {
  return false;
}

/** Warehouse Listo is not an order allocation. */
export function finishedGoodsReceiptAllocatesToOrder(): false {
  return false;
}

export type QualityRatio = {
  goodPercent: string;
  lostPercent: string;
  /** goodCount + lostCount. Never an order quantity or a planned yield. */
  denominator: number;
};

/**
 * % good and % lost exist only when both factual counts exist and their sum is not zero.
 * There is no completion percent and no invented denominator.
 */
export function deriveQualityRatios(
  goodCount: number | null,
  lostCount: number | null,
): QualityRatio | null {
  if (goodCount === null || lostCount === null) return null;
  if (!Number.isInteger(goodCount) || !Number.isInteger(lostCount)) return null;
  if (goodCount < 0 || lostCount < 0) return null;
  const denominator = goodCount + lostCount;
  if (denominator === 0) return null;
  return {
    goodPercent: formatRatioPercent(goodCount, denominator),
    lostPercent: formatRatioPercent(lostCount, denominator),
    denominator,
  };
}

function formatRatioPercent(count: number, denominator: number): string {
  const scaled = Math.floor((count * 10000) / denominator);
  const whole = Math.floor(scaled / 100);
  const fraction = scaled % 100;
  if (fraction === 0) return String(whole);
  const hundredths = String(fraction).padStart(2, '0').replace(/0$/, '');
  return `${whole}.${hundredths}`;
}

type BuiltBase = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof PRODUCTION_TRACE_SOURCE;
  occurredAt: string;
  recordedAt: string;
  evidence: ProductionEvidence;
  correctsEntryId: string | null;
  correctionReason: string | null;
  idempotencyKey: string | null;
};

export type ProcessRecord = BuiltBase & {
  kind: 'process_record';
  productId: string;
  stepKey: ProductionStepKey;
  quemaId: string | null;
  note: string | null;
};

const processSchema = provenanceSchema
  .extend({
    productId,
    stepKey: z.enum(PRODUCTION_STEP_KEYS as [ProductionStepKey, ...ProductionStepKey[]]),
    quemaId: optionalText,
    note: optionalText,
  })
  .strict();

export function buildProcessRecord(input: unknown): ProcessRecord {
  rejectForbidden(input);
  const parsed = processSchema.parse(input);
  assertCorrectionPair(parsed.correctsEntryId, parsed.correctionReason);
  const record: ProcessRecord = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    kind: 'process_record',
    productId: parsed.productId,
    stepKey: parsed.stepKey,
    quemaId: parsed.quemaId,
    note: parsed.note,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsEntryId: parsed.correctsEntryId,
    correctionReason: parsed.correctionReason,
    idempotencyKey: parsed.idempotencyKey,
  };
  assertNoOrderOrCompletion(record);
  return record;
}

export type LossRecord = BuiltBase & {
  kind: 'loss';
  productId: string | null;
  stepKey: ProductionStepKey;
  quantityLost: string;
  percentageLost: string;
  reason: string;
};

const lossSchema = provenanceSchema
  .extend({
    productId: optionalText,
    stepKey: z.enum(PRODUCTION_STEP_KEYS as [ProductionStepKey, ...ProductionStepKey[]]),
    quantityLost: decimal,
    percentageLost: decimal,
    reason: z.string().trim().min(1),
  })
  .strict();

export function buildLossRecord(input: unknown): LossRecord {
  rejectForbidden(input);
  const parsed = lossSchema.parse(input);
  assertCorrectionPair(parsed.correctsEntryId, parsed.correctionReason);
  const record: LossRecord = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    kind: 'loss',
    productId: parsed.productId,
    stepKey: parsed.stepKey,
    quantityLost: parsed.quantityLost,
    percentageLost: parsed.percentageLost,
    reason: parsed.reason,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsEntryId: parsed.correctsEntryId,
    correctionReason: parsed.correctionReason,
    idempotencyKey: parsed.idempotencyKey,
  };
  assertNoOrderOrCompletion(record);
  return record;
}

export type ConsumptionRecord = BuiltBase & {
  kind: 'consumption';
  stepKey: ProductionStepKey;
  category: ConsumptionCategory;
  categoryLabel: string;
  description: string;
  reference: string | null;
  quantity: string;
  unit: string;
  inventoryEffect: 'none';
};

const consumptionSchema = provenanceSchema
  .extend({
    stepKey: z.enum(PRODUCTION_STEP_KEYS as [ProductionStepKey, ...ProductionStepKey[]]),
    category: z.enum(['raw_material', 'supply', 'fuel']),
    description: z.string().trim().min(1),
    reference: optionalText,
    quantity: decimal,
    unit: z.string().trim().min(1),
  })
  .strict();

export function buildConsumptionRecord(input: unknown): ConsumptionRecord {
  rejectForbidden(input);
  const parsed = consumptionSchema.parse(input);
  assertCorrectionPair(parsed.correctsEntryId, parsed.correctionReason);
  const record: ConsumptionRecord = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    kind: 'consumption',
    stepKey: parsed.stepKey,
    category: parsed.category,
    categoryLabel: consumptionCategoryLabel(parsed.category),
    description: parsed.description,
    reference: parsed.reference,
    quantity: parsed.quantity,
    unit: parsed.unit,
    inventoryEffect: 'none',
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsEntryId: parsed.correctsEntryId,
    correctionReason: parsed.correctionReason,
    idempotencyKey: parsed.idempotencyKey,
  };
  assertNoOrderOrCompletion(record);
  if (record.inventoryEffect !== 'none' || consumptionMutatesStock()) {
    throw new Error('Consumption must not decrement stock');
  }
  return record;
}

export type ClassificationRecord = BuiltBase & {
  kind: 'classification';
  productId: string;
  stepKey: 'clasificacion';
  goodCount: number | null;
  lostCount: number | null;
};

const countSchema = z.number().int().nonnegative().nullable();

const classificationSchema = provenanceSchema
  .extend({
    productId,
    goodCount: countSchema,
    lostCount: countSchema,
  })
  .strict();

export function buildClassificationRecord(input: unknown): ClassificationRecord {
  rejectForbidden(input);
  const parsed = classificationSchema.parse(input);
  assertCorrectionPair(parsed.correctsEntryId, parsed.correctionReason);
  const record: ClassificationRecord = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    kind: 'classification',
    productId: parsed.productId,
    stepKey: 'clasificacion',
    goodCount: parsed.goodCount,
    lostCount: parsed.lostCount,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsEntryId: parsed.correctsEntryId,
    correctionReason: parsed.correctionReason,
    idempotencyKey: parsed.idempotencyKey,
  };
  assertNoOrderOrCompletion(record);
  return record;
}

export type FinishedGoodsReceipt = BuiltBase & {
  kind: 'finished_goods_receipt';
  productId: string;
  quantity: string;
  warehouseLabel: typeof FINISHED_GOODS_WAREHOUSE_LABEL;
  listoMeaning: typeof LISTO_MEANING;
  allocatesToOrder: false;
  postsStock: false;
};

const receiptSchema = provenanceSchema
  .extend({
    productId,
    quantity: decimal.refine((value) => value !== '0', 'A receipt needs a quantity'),
  })
  .strict();

export function buildFinishedGoodsReceipt(input: unknown): FinishedGoodsReceipt {
  rejectForbidden(input);
  const parsed = receiptSchema.parse(input);
  assertCorrectionPair(parsed.correctsEntryId, parsed.correctionReason);
  const record: FinishedGoodsReceipt = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    kind: 'finished_goods_receipt',
    productId: parsed.productId,
    quantity: parsed.quantity,
    warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
    listoMeaning: LISTO_MEANING,
    allocatesToOrder: false,
    postsStock: false,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsEntryId: parsed.correctsEntryId,
    correctionReason: parsed.correctionReason,
    idempotencyKey: parsed.idempotencyKey,
  };
  assertNoOrderOrCompletion(record);
  if (record.allocatesToOrder || finishedGoodsReceiptAllocatesToOrder()) {
    throw new Error('A finished-goods receipt does not allocate to an order');
  }
  return record;
}

export type Quema = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof PRODUCTION_TRACE_SOURCE;
  recordedAt: string;
  evidence: ProductionEvidence;
  idempotencyKey: string | null;
};

export type QuemaTimeFact = {
  id: string;
  organizationId: string;
  quemaId: string;
  phase: 'start' | 'end';
  at: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof PRODUCTION_TRACE_SOURCE;
  occurredAt: string;
  recordedAt: string;
  evidence: ProductionEvidence;
  correctsTimeId: string | null;
  correctionReason: string | null;
};

export type QuemaProductLink = {
  id: string;
  organizationId: string;
  quemaId: string;
  productId: string;
  quantity: string | null;
  unit: string | null;
  actorMemberId: string | null;
  actorLabel: string;
  source: typeof PRODUCTION_TRACE_SOURCE;
  occurredAt: string;
  recordedAt: string;
  evidence: ProductionEvidence;
  correctsLinkId: string | null;
  correctionReason: string | null;
};

const quemaSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    actorMemberId: optionalText,
    actorLabel: z.string().trim().min(1),
    source: z.literal(PRODUCTION_TRACE_SOURCE),
    recordedAt: timestamp,
    evidence: evidenceSchema,
    idempotencyKey: optionalText,
    startedAt: timestamp,
  })
  .strict();

export function buildQuema(input: unknown): { quema: Quema; start: QuemaTimeFact } {
  rejectForbidden(input);
  const parsed = quemaSchema.parse(input);
  const startId = `${parsed.id}:start`;
  const quema: Quema = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    idempotencyKey: parsed.idempotencyKey,
  };
  const start: QuemaTimeFact = {
    id: startId,
    organizationId: parsed.organizationId,
    quemaId: parsed.id,
    phase: 'start',
    at: parsed.startedAt,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.startedAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsTimeId: null,
    correctionReason: null,
  };
  assertNoOrderOrCompletion(quema);
  assertNoOrderOrCompletion(start);
  return { quema, start };
}

const quemaEndSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    quemaId: z.string().trim().min(1),
    endedAt: timestamp,
    actorMemberId: optionalText,
    actorLabel: z.string().trim().min(1),
    source: z.literal(PRODUCTION_TRACE_SOURCE),
    occurredAt: timestamp,
    recordedAt: timestamp,
    evidence: evidenceSchema,
    correctsTimeId: optionalText,
    correctionReason: optionalText,
  })
  .strict();

export function buildQuemaEnd(input: unknown): QuemaTimeFact {
  rejectForbidden(input);
  const parsed = quemaEndSchema.parse(input);
  assertCorrectionPair(parsed.correctsTimeId, parsed.correctionReason);
  const fact: QuemaTimeFact = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    quemaId: parsed.quemaId,
    phase: 'end',
    at: parsed.endedAt,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsTimeId: parsed.correctsTimeId,
    correctionReason: parsed.correctionReason,
  };
  assertNoOrderOrCompletion(fact);
  return fact;
}

const quemaProductSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    quemaId: z.string().trim().min(1),
    productId,
    quantity: decimal.nullable().optional().transform((value) => value ?? null),
    unit: optionalText,
    actorMemberId: optionalText,
    actorLabel: z.string().trim().min(1),
    source: z.literal(PRODUCTION_TRACE_SOURCE),
    occurredAt: timestamp,
    recordedAt: timestamp,
    evidence: evidenceSchema,
    correctsLinkId: optionalText,
    correctionReason: optionalText,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.quantity === null && value.unit !== null) {
      ctx.addIssue({ code: 'custom', message: 'A unit waits until a quantity is attached' });
    }
  });

export function buildQuemaProductLink(input: unknown): QuemaProductLink {
  rejectForbidden(input);
  const parsed = quemaProductSchema.parse(input);
  assertCorrectionPair(parsed.correctsLinkId, parsed.correctionReason);
  const link: QuemaProductLink = {
    id: parsed.id,
    organizationId: parsed.organizationId,
    quemaId: parsed.quemaId,
    productId: parsed.productId,
    quantity: parsed.quantity,
    unit: parsed.unit,
    actorMemberId: parsed.actorMemberId,
    actorLabel: parsed.actorLabel,
    source: PRODUCTION_TRACE_SOURCE,
    occurredAt: parsed.occurredAt,
    recordedAt: parsed.recordedAt,
    evidence: parsed.evidence,
    correctsLinkId: parsed.correctsLinkId,
    correctionReason: parsed.correctionReason,
  };
  assertNoOrderOrCompletion(link);
  return link;
}

export type QuemaView = {
  id: string;
  organizationId: string;
  startedAt: string | null;
  endedAt: string | null;
  products: Array<{ productId: string; quantity: string | null; unit: string | null }>;
};

export function projectQuema(input: {
  quema: Quema;
  times: readonly QuemaTimeFact[];
  products: readonly QuemaProductLink[];
}): QuemaView {
  const times = currentFacts(input.times);
  const start = times.find((fact) => fact.phase === 'start') ?? null;
  const end = times.find((fact) => fact.phase === 'end') ?? null;
  const latestByProduct = new Map<string, QuemaProductLink>();
  const links = input.products
    .filter((link) => link.organizationId === input.quema.organizationId && link.quemaId === input.quema.id)
    .slice()
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.id.localeCompare(right.id));
  for (const link of links) {
    latestByProduct.set(link.productId, link);
  }
  const view: QuemaView = {
    id: input.quema.id,
    organizationId: input.quema.organizationId,
    startedAt: start?.at ?? null,
    endedAt: end?.at ?? null,
    products: [...latestByProduct.values()].map((link) => ({
      productId: link.productId,
      quantity: link.quantity,
      unit: link.unit,
    })),
  };
  assertNoOrderOrCompletion(view);
  return view;
}

function currentFacts(facts: readonly QuemaTimeFact[]): QuemaTimeFact[] {
  const superseded = new Set(facts.map((fact) => fact.correctsTimeId).filter((id): id is string => id !== null));
  return facts.filter((fact) => !superseded.has(fact.id));
}

function assertNoOrderOrCompletion(value: object): void {
  const keys = collectKeys(value);
  for (const forbidden of FORBIDDEN_KEYS) {
    if (keys.has(forbidden)) {
      throw new Error(`${forbidden} is not a manufacturing field`);
    }
  }
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectKeys(child, keys);
  }
  return keys;
}

export type ProductionTraceEntry =
  | ProcessRecord
  | LossRecord
  | ConsumptionRecord
  | ClassificationRecord
  | FinishedGoodsReceipt;

export function isFinishedGoodsReceipt(entry: ProductionTraceEntry): entry is FinishedGoodsReceipt {
  return entry.kind === 'finished_goods_receipt';
}

/** Listo only when a current receipt exists for the product. Not an order assignment. */
export function isWarehouseListo(entries: readonly ProductionTraceEntry[], productId: string): boolean {
  const superseded = new Set(
    entries.map((entry) => entry.correctsEntryId).filter((id): id is string => id !== null),
  );
  return entries.some(
    (entry) =>
      entry.kind === 'finished_goods_receipt' &&
      entry.productId === productId &&
      !superseded.has(entry.id) &&
      entry.allocatesToOrder === false,
  );
}
