/**
 * Prisma port for manufacturing trace writes.
 * Structural client only — does not import a generated PrismaClient.
 * Migration 20260915130000_os_production_trace exists and is not applied here.
 * Product is the join key. There is no Order → ProductionRun.
 */

import {
  FINISHED_GOODS_WAREHOUSE_LABEL,
  LISTO_MEANING,
  buildClassificationRecord,
  buildConsumptionRecord,
  buildFinishedGoodsReceipt,
  buildLossRecord,
  buildProcessRecord,
  buildQuema,
  buildQuemaEnd,
  buildQuemaProductLink,
  consumptionCategoryLabel,
  consumptionMutatesStock,
  inputStockIsReliable,
  projectQuema,
  type ClassificationRecord,
  type ConsumptionCategory,
  type ConsumptionRecord,
  type FinishedGoodsReceipt,
  type LossRecord,
  type ProcessRecord,
  type ProductionEvidence,
  type ProductionStepKey,
  type ProductionTraceEntry,
  type Quema,
  type QuemaProductLink,
  type QuemaTimeFact,
  type QuemaView,
} from '../../os-contracts/src/production-trace';
import { ProductionTraceError, type ProductionTraceWriteStore } from './store';

export const PRODUCTION_MIGRATION_APPLIED = false as const;

type EvidenceJson = { reference: string | null; note: string | null };

type TraceEntryRow = {
  id: string;
  organizationId: string;
  kind: string;
  productId: string | null;
  stepKey: string | null;
  quemaId: string | null;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  occurredAt: Date | string;
  recordedAt: Date | string;
  evidenceJson: EvidenceJson;
  quantityLost: string | null;
  percentageLost: string | null;
  lossReason: string | null;
  consumptionCategory: string | null;
  consumptionDescription: string | null;
  consumptionReference: string | null;
  consumptionQuantity: string | null;
  consumptionUnit: string | null;
  inventoryEffect: string | null;
  goodCount: number | null;
  lostCount: number | null;
  receiptQuantity: string | null;
  note: string | null;
  correctsEntryId: string | null;
  correctionReason: string | null;
  idempotencyKey: string | null;
};

type QuemaRow = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  evidenceJson: EvidenceJson;
  recordedAt: Date | string;
  idempotencyKey: string | null;
};

type QuemaTimeRow = {
  id: string;
  organizationId: string;
  quemaId: string;
  phase: string;
  at: Date | string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  occurredAt: Date | string;
  recordedAt: Date | string;
  evidenceJson: EvidenceJson;
  correctsTimeId: string | null;
  correctionReason: string | null;
};

type QuemaProductRow = {
  id: string;
  organizationId: string;
  quemaId: string;
  productId: string;
  quantity: string | null;
  unit: string | null;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  occurredAt: Date | string;
  recordedAt: Date | string;
  evidenceJson: EvidenceJson;
  correctsLinkId: string | null;
  correctionReason: string | null;
};

type IdRow = { id: string };

type TraceEntryDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<TraceEntryRow | null>;
  findMany(args: { where: Record<string, unknown> }): Promise<TraceEntryRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

type QuemaDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<QuemaRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

type QuemaTimeDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<QuemaTimeRow | null>;
  findMany(args: { where: Record<string, unknown> }): Promise<QuemaTimeRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

type QuemaProductDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<QuemaProductRow | null>;
  findMany(args: { where: Record<string, unknown> }): Promise<QuemaProductRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

/** Structural Prisma client for production trace writes. */
export type ProductionTracePrismaPort = {
  osProductionTraceEntry: TraceEntryDelegate;
  osProductionQuema: QuemaDelegate;
  osProductionQuemaTime: QuemaTimeDelegate;
  osProductionQuemaProduct: QuemaProductDelegate;
};

export function createPrismaProductionTraceStore(prisma: ProductionTracePrismaPort): ProductionTraceWriteStore {
  return {
    async recordProcess(trustedOrganizationId, input) {
      const record = buildProcessRecord(bindOrganization(trustedOrganizationId, input));
      await assertReferencedQuema(prisma, record.organizationId, record.quemaId);
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async recordLoss(trustedOrganizationId, input) {
      const record = buildLossRecord(bindOrganization(trustedOrganizationId, input));
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async correctLoss(trustedOrganizationId, input) {
      const organizationId = resolveOrganization(trustedOrganizationId);
      const priorId = textField(input, 'correctsEntryId');
      await assertVisibleEntry(prisma, organizationId, priorId, 'loss');
      const record = buildLossRecord(bindOrganization(organizationId, input));
      await assertCorrection(prisma, record, 'loss');
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async recordConsumption(trustedOrganizationId, input) {
      const record = buildConsumptionRecord(bindOrganization(trustedOrganizationId, input));
      if (record.inventoryEffect !== 'none' || consumptionMutatesStock()) {
        throw new ProductionTraceError('conflict', 'Consumption must not decrement stock');
      }
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async recordClassification(trustedOrganizationId, input) {
      const record = buildClassificationRecord(bindOrganization(trustedOrganizationId, input));
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async recordFinishedGoodsReceipt(trustedOrganizationId, input) {
      const record = buildFinishedGoodsReceipt(bindOrganization(trustedOrganizationId, input));
      await insertEntry(prisma, record);
      return structuredClone(record);
    },

    async openQuema(trustedOrganizationId, input) {
      const { quema, start } = buildQuema(bindOrganization(trustedOrganizationId, input));
      const existing = await prisma.osProductionQuema.findFirst({
        where: { id: quema.id, organizationId: quema.organizationId },
      });
      if (existing) throw new ProductionTraceError('conflict', 'Production record id already exists');
      await assertIdFree(prisma, quema.organizationId, start.id);
      await assertIdFree(prisma, quema.organizationId, quema.id);
      await prisma.osProductionQuema.create({ data: toQuemaRow(quema) });
      await prisma.osProductionQuemaTime.create({ data: toQuemaTimeRow(start) });
      return getQuema(prisma, quema.organizationId, quema.id);
    },

    async endQuema(trustedOrganizationId, input) {
      const organizationId = resolveOrganization(trustedOrganizationId);
      const quemaId = textField(input, 'quemaId');
      if (!(await findQuema(prisma, organizationId, quemaId))) {
        throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
      }
      const fact = buildQuemaEnd(bindOrganization(organizationId, input));
      await assertIdFree(prisma, fact.organizationId, fact.id);
      if (fact.correctsTimeId) {
        await assertTimeCorrection(prisma, fact);
      } else {
        const current = await currentTimes(prisma, fact.organizationId, fact.quemaId);
        if (current.some((item) => item.phase === 'end')) {
          throw new ProductionTraceError('conflict', 'Correct the latest end. The prior fact is not overwritten.');
        }
      }
      await prisma.osProductionQuemaTime.create({ data: toQuemaTimeRow(fact) });
      return getQuema(prisma, fact.organizationId, fact.quemaId);
    },

    async attachQuemaProduct(trustedOrganizationId, input) {
      const organizationId = resolveOrganization(trustedOrganizationId);
      const quemaId = textField(input, 'quemaId');
      if (!(await findQuema(prisma, organizationId, quemaId))) {
        throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
      }
      const correctsLinkId = textField(input, 'correctsLinkId');
      if (correctsLinkId && !(await findQuemaProduct(prisma, organizationId, quemaId, correctsLinkId))) {
        throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
      }
      const link = buildQuemaProductLink(bindOrganization(organizationId, input));
      await assertIdFree(prisma, link.organizationId, link.id);
      await prisma.osProductionQuemaProduct.create({ data: toQuemaProductRow(link) });
      return structuredClone(link);
    },

    async get(organizationId, id) {
      const row = await prisma.osProductionTraceEntry.findFirst({
        where: { id, organizationId },
      });
      return row ? fromEntryRow(row) : null;
    },

    async getQuema(organizationId, quemaId) {
      return getQuema(prisma, organizationId, quemaId);
    },

    inputStockBalance(_organizationId, _reference) {
      return inputStockIsReliable() ? null : null;
    },
  };
}

function bindOrganization(trustedOrganizationId: string, input: unknown): unknown {
  const organizationId = resolveOrganization(trustedOrganizationId);
  const body = input && typeof input === 'object' ? { ...(input as Record<string, unknown>) } : {};
  return { ...body, organizationId };
}

function resolveOrganization(trustedOrganizationId: string): string {
  const trusted = trustedOrganizationId.trim();
  if (!trusted) {
    throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
  }
  return trusted;
}

function textField(input: unknown, key: string): string {
  if (!input || typeof input !== 'object') return '';
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asDate(value: string): Date {
  return new Date(value);
}

function evidenceOf(value: ProductionEvidence): EvidenceJson {
  return { reference: value.reference, note: value.note };
}

async function findQuema(prisma: ProductionTracePrismaPort, organizationId: string, quemaId: string): Promise<Quema | null> {
  if (!organizationId || !quemaId) return null;
  const row = await prisma.osProductionQuema.findFirst({ where: { id: quemaId, organizationId } });
  return row ? fromQuemaRow(row) : null;
}

async function findQuemaProduct(
  prisma: ProductionTracePrismaPort,
  organizationId: string,
  quemaId: string,
  linkId: string,
): Promise<QuemaProductLink | null> {
  if (!organizationId || !quemaId || !linkId) return null;
  const row = await prisma.osProductionQuemaProduct.findFirst({
    where: { id: linkId, organizationId, quemaId },
  });
  return row ? fromQuemaProductRow(row) : null;
}

async function assertReferencedQuema(
  prisma: ProductionTracePrismaPort,
  organizationId: string,
  quemaId: string | null,
): Promise<void> {
  if (!quemaId) return;
  if (!(await findQuema(prisma, organizationId, quemaId))) {
    throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
  }
}

async function assertVisibleEntry(
  prisma: ProductionTracePrismaPort,
  organizationId: string,
  entryId: string,
  kind: ProductionTraceEntry['kind'],
): Promise<void> {
  const row = await prisma.osProductionTraceEntry.findFirst({ where: { id: entryId, organizationId } });
  if (!row || row.kind !== kind) {
    throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
  }
}

async function insertEntry(prisma: ProductionTracePrismaPort, entry: ProductionTraceEntry): Promise<void> {
  await assertIdFree(prisma, entry.organizationId, entry.id);
  if (entry.correctsEntryId && entry.kind !== 'loss') {
    await assertCorrection(prisma, entry, entry.kind);
  }
  if (entry.kind === 'loss' && entry.correctsEntryId) {
    await assertCorrection(prisma, entry, 'loss');
  }
  if (entry.idempotencyKey) {
    const clash = await prisma.osProductionTraceEntry.findFirst({
      where: { organizationId: entry.organizationId, idempotencyKey: entry.idempotencyKey },
    });
    if (clash) throw new ProductionTraceError('conflict', 'Idempotency key already used in this organization');
  }
  await prisma.osProductionTraceEntry.create({ data: toEntryRow(entry) });
}

async function assertCorrection(
  prisma: ProductionTracePrismaPort,
  entry: ProductionTraceEntry,
  kind: ProductionTraceEntry['kind'],
): Promise<void> {
  if (!entry.correctsEntryId) return;
  const prior = await prisma.osProductionTraceEntry.findFirst({
    where: { id: entry.correctsEntryId, organizationId: entry.organizationId },
  });
  if (!prior) {
    throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
  }
  if (prior.kind !== kind || entry.kind !== kind) {
    throw new ProductionTraceError('conflict', 'A correction keeps the same kind. The prior record is not overwritten.');
  }
  const already = await prisma.osProductionTraceEntry.findFirst({
    where: { organizationId: entry.organizationId, correctsEntryId: prior.id },
  });
  if (already) {
    throw new ProductionTraceError('conflict', 'Correct the latest record. The prior record is not overwritten.');
  }
}

async function assertTimeCorrection(prisma: ProductionTracePrismaPort, fact: QuemaTimeFact): Promise<void> {
  const prior = await prisma.osProductionQuemaTime.findFirst({
    where: { id: fact.correctsTimeId, organizationId: fact.organizationId },
  });
  if (!prior || prior.quemaId !== fact.quemaId) {
    throw new ProductionTraceError('not_found', 'Quema time was not found in this organization');
  }
}

async function currentTimes(
  prisma: ProductionTracePrismaPort,
  organizationId: string,
  quemaId: string,
): Promise<QuemaTimeFact[]> {
  const rows = await prisma.osProductionQuemaTime.findMany({ where: { organizationId, quemaId } });
  const facts = rows.map(fromQuemaTimeRow);
  const superseded = new Set(facts.map((item) => item.correctsTimeId).filter((id): id is string => id !== null));
  return facts.filter((item) => !superseded.has(item.id));
}

async function assertIdFree(prisma: ProductionTracePrismaPort, organizationId: string, id: string): Promise<void> {
  const [entry, quema, time, product] = await Promise.all([
    prisma.osProductionTraceEntry.findFirst({ where: { id, organizationId } }),
    prisma.osProductionQuema.findFirst({ where: { id, organizationId } }),
    prisma.osProductionQuemaTime.findFirst({ where: { id, organizationId } }),
    prisma.osProductionQuemaProduct.findFirst({ where: { id, organizationId } }),
  ]);
  if (entry || quema || time || product) {
    throw new ProductionTraceError('conflict', 'Production record id already exists');
  }
}

async function getQuema(prisma: ProductionTracePrismaPort, organizationId: string, quemaId: string): Promise<QuemaView> {
  const quema = await findQuema(prisma, organizationId, quemaId);
  if (!quema) {
    throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
  }
  const [timeRows, productRows] = await Promise.all([
    prisma.osProductionQuemaTime.findMany({ where: { organizationId, quemaId } }),
    prisma.osProductionQuemaProduct.findMany({ where: { organizationId, quemaId } }),
  ]);
  return projectQuema({
    quema,
    times: timeRows.map(fromQuemaTimeRow),
    products: productRows.map(fromQuemaProductRow),
  });
}

function toEntryRow(entry: ProductionTraceEntry): Record<string, unknown> {
  const base = {
    id: entry.id,
    organizationId: entry.organizationId,
    kind: entry.kind,
    actorMemberId: entry.actorMemberId,
    actorLabel: entry.actorLabel,
    source: entry.source,
    occurredAt: asDate(entry.occurredAt),
    recordedAt: asDate(entry.recordedAt),
    evidenceJson: evidenceOf(entry.evidence),
    correctsEntryId: entry.correctsEntryId,
    correctionReason: entry.correctionReason,
    idempotencyKey: entry.idempotencyKey,
    productId: null as string | null,
    stepKey: null as string | null,
    quemaId: null as string | null,
    quantityLost: null as string | null,
    percentageLost: null as string | null,
    lossReason: null as string | null,
    consumptionCategory: null as string | null,
    consumptionDescription: null as string | null,
    consumptionReference: null as string | null,
    consumptionQuantity: null as string | null,
    consumptionUnit: null as string | null,
    inventoryEffect: null as string | null,
    goodCount: null as number | null,
    lostCount: null as number | null,
    receiptQuantity: null as string | null,
    note: null as string | null,
  };

  switch (entry.kind) {
    case 'process_record':
      return {
        ...base,
        productId: entry.productId,
        stepKey: entry.stepKey,
        quemaId: entry.quemaId,
        note: entry.note,
      };
    case 'loss':
      return {
        ...base,
        productId: entry.productId,
        stepKey: entry.stepKey,
        quantityLost: entry.quantityLost,
        percentageLost: entry.percentageLost,
        lossReason: entry.reason,
      };
    case 'consumption':
      return {
        ...base,
        stepKey: entry.stepKey,
        consumptionCategory: entry.category,
        consumptionDescription: entry.description,
        consumptionReference: entry.reference,
        consumptionQuantity: entry.quantity,
        consumptionUnit: entry.unit,
        inventoryEffect: entry.inventoryEffect,
      };
    case 'classification':
      return {
        ...base,
        productId: entry.productId,
        stepKey: entry.stepKey,
        goodCount: entry.goodCount,
        lostCount: entry.lostCount,
      };
    case 'finished_goods_receipt':
      return {
        ...base,
        productId: entry.productId,
        receiptQuantity: entry.quantity,
      };
  }
}

function fromEntryRow(row: TraceEntryRow): ProductionTraceEntry {
  const provenance = {
    id: row.id,
    organizationId: row.organizationId,
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'manual' as const,
    occurredAt: asIso(row.occurredAt),
    recordedAt: asIso(row.recordedAt),
    evidence: {
      reference: row.evidenceJson?.reference ?? null,
      note: row.evidenceJson?.note ?? null,
    },
    correctsEntryId: row.correctsEntryId,
    correctionReason: row.correctionReason,
    idempotencyKey: row.idempotencyKey,
  };

  switch (row.kind) {
    case 'process_record': {
      const record: ProcessRecord = {
        ...provenance,
        kind: 'process_record',
        productId: row.productId ?? '',
        stepKey: row.stepKey as ProductionStepKey,
        quemaId: row.quemaId,
        note: row.note,
      };
      return record;
    }
    case 'loss': {
      const record: LossRecord = {
        ...provenance,
        kind: 'loss',
        productId: row.productId,
        stepKey: row.stepKey as ProductionStepKey,
        quantityLost: row.quantityLost ?? '0',
        percentageLost: row.percentageLost ?? '0',
        reason: row.lossReason ?? '',
      };
      return record;
    }
    case 'consumption': {
      const category = (row.consumptionCategory ?? 'raw_material') as ConsumptionCategory;
      const record: ConsumptionRecord = {
        ...provenance,
        kind: 'consumption',
        stepKey: row.stepKey as ProductionStepKey,
        category,
        categoryLabel: consumptionCategoryLabel(category),
        description: row.consumptionDescription ?? '',
        reference: row.consumptionReference,
        quantity: row.consumptionQuantity ?? '0',
        unit: row.consumptionUnit ?? '',
        inventoryEffect: 'none',
      };
      return record;
    }
    case 'classification': {
      const record: ClassificationRecord = {
        ...provenance,
        kind: 'classification',
        productId: row.productId ?? '',
        stepKey: 'clasificacion',
        goodCount: row.goodCount,
        lostCount: row.lostCount,
      };
      return record;
    }
    case 'finished_goods_receipt': {
      const record: FinishedGoodsReceipt = {
        ...provenance,
        kind: 'finished_goods_receipt',
        productId: row.productId ?? '',
        quantity: row.receiptQuantity ?? '0',
        warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
        listoMeaning: LISTO_MEANING,
        allocatesToOrder: false,
        postsStock: false,
      };
      return record;
    }
    default:
      throw new ProductionTraceError('conflict', 'Production record was not changed.');
  }
}

function toQuemaRow(quema: Quema): Record<string, unknown> {
  return {
    id: quema.id,
    organizationId: quema.organizationId,
    actorMemberId: quema.actorMemberId,
    actorLabel: quema.actorLabel,
    source: quema.source,
    evidenceJson: evidenceOf(quema.evidence),
    recordedAt: asDate(quema.recordedAt),
    idempotencyKey: quema.idempotencyKey,
  };
}

function fromQuemaRow(row: QuemaRow): Quema {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'manual',
    recordedAt: asIso(row.recordedAt),
    evidence: {
      reference: row.evidenceJson?.reference ?? null,
      note: row.evidenceJson?.note ?? null,
    },
    idempotencyKey: row.idempotencyKey,
  };
}

function toQuemaTimeRow(fact: QuemaTimeFact): Record<string, unknown> {
  return {
    id: fact.id,
    organizationId: fact.organizationId,
    quemaId: fact.quemaId,
    phase: fact.phase,
    at: asDate(fact.at),
    actorMemberId: fact.actorMemberId,
    actorLabel: fact.actorLabel,
    source: fact.source,
    occurredAt: asDate(fact.occurredAt),
    recordedAt: asDate(fact.recordedAt),
    evidenceJson: evidenceOf(fact.evidence),
    correctsTimeId: fact.correctsTimeId,
    correctionReason: fact.correctionReason,
  };
}

function fromQuemaTimeRow(row: QuemaTimeRow): QuemaTimeFact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    quemaId: row.quemaId,
    phase: row.phase as 'start' | 'end',
    at: asIso(row.at),
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'manual',
    occurredAt: asIso(row.occurredAt),
    recordedAt: asIso(row.recordedAt),
    evidence: {
      reference: row.evidenceJson?.reference ?? null,
      note: row.evidenceJson?.note ?? null,
    },
    correctsTimeId: row.correctsTimeId,
    correctionReason: row.correctionReason,
  };
}

function toQuemaProductRow(link: QuemaProductLink): Record<string, unknown> {
  return {
    id: link.id,
    organizationId: link.organizationId,
    quemaId: link.quemaId,
    productId: link.productId,
    quantity: link.quantity,
    unit: link.unit,
    actorMemberId: link.actorMemberId,
    actorLabel: link.actorLabel,
    source: link.source,
    occurredAt: asDate(link.occurredAt),
    recordedAt: asDate(link.recordedAt),
    evidenceJson: evidenceOf(link.evidence),
    correctsLinkId: link.correctsLinkId,
    correctionReason: link.correctionReason,
  };
}

function fromQuemaProductRow(row: QuemaProductRow): QuemaProductLink {
  return {
    id: row.id,
    organizationId: row.organizationId,
    quemaId: row.quemaId,
    productId: row.productId,
    quantity: row.quantity,
    unit: row.unit,
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'manual',
    occurredAt: asIso(row.occurredAt),
    recordedAt: asIso(row.recordedAt),
    evidence: {
      reference: row.evidenceJson?.reference ?? null,
      note: row.evidenceJson?.note ?? null,
    },
    correctsLinkId: row.correctsLinkId,
    correctionReason: row.correctionReason,
  };
}

/** In-memory stand-in for ProductionTracePrismaPort used by unit tests. */
export class MemoryProductionTracePrismaPort implements ProductionTracePrismaPort {
  readonly entries: TraceEntryRow[] = [];
  readonly quemas: QuemaRow[] = [];
  readonly quemaTimes: QuemaTimeRow[] = [];
  readonly quemaProducts: QuemaProductRow[] = [];

  readonly osProductionTraceEntry: TraceEntryDelegate = {
    findFirst: async ({ where }) => this.entries.find((row) => matches(row, where)) ?? null,
    findMany: async ({ where }) => this.entries.filter((row) => matches(row, where)),
    create: async ({ data }) => {
      this.entries.push(data as TraceEntryRow);
      return data;
    },
  };

  readonly osProductionQuema: QuemaDelegate = {
    findFirst: async ({ where }) => this.quemas.find((row) => matches(row, where)) ?? null,
    create: async ({ data }) => {
      this.quemas.push(data as QuemaRow);
      return data;
    },
  };

  readonly osProductionQuemaTime: QuemaTimeDelegate = {
    findFirst: async ({ where }) => this.quemaTimes.find((row) => matches(row, where)) ?? null,
    findMany: async ({ where }) => this.quemaTimes.filter((row) => matches(row, where)),
    create: async ({ data }) => {
      this.quemaTimes.push(data as QuemaTimeRow);
      return data;
    },
  };

  readonly osProductionQuemaProduct: QuemaProductDelegate = {
    findFirst: async ({ where }) => this.quemaProducts.find((row) => matches(row, where)) ?? null,
    findMany: async ({ where }) => this.quemaProducts.filter((row) => matches(row, where)),
    create: async ({ data }) => {
      this.quemaProducts.push(data as QuemaProductRow);
      return data;
    },
  };
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (row[key] !== expected) return false;
  }
  return true;
}

void (null as unknown as IdRow);
