import {
  buildClassificationRecord,
  buildConsumptionRecord,
  buildFinishedGoodsReceipt,
  buildLossRecord,
  buildProcessRecord,
  buildQuema,
  buildQuemaEnd,
  buildQuemaProductLink,
  inputStockIsReliable,
  isWarehouseListo,
  projectQuema,
  type ClassificationRecord,
  type ConsumptionRecord,
  type FinishedGoodsReceipt,
  type LossRecord,
  type ProcessRecord,
  type ProductionTraceEntry,
  type Quema,
  type QuemaProductLink,
  type QuemaTimeFact,
  type QuemaView,
} from '../../os-contracts/src/production-trace';

export class ProductionTraceError extends Error {
  constructor(
    readonly code: 'not_found' | 'conflict',
    message: string,
  ) {
    super(message);
    this.name = 'ProductionTraceError';
  }
}

/**
 * In-memory manufacturing trace.
 * Product id is the join key. There is no order key and no stock ledger.
 * Corrections append. They do not overwrite.
 */
export class InMemoryProductionTraceStore {
  private readonly entries: ProductionTraceEntry[] = [];
  private readonly quemas: Quema[] = [];
  private readonly quemaTimes: QuemaTimeFact[] = [];
  private readonly quemaProducts: QuemaProductLink[] = [];

  recordProcess(input: unknown): ProcessRecord {
    const record = buildProcessRecord(input);
    this.insertEntry(record);
    return this.publish(record);
  }

  recordLoss(input: unknown): LossRecord {
    const record = buildLossRecord(input);
    this.insertEntry(record);
    return this.publish(record);
  }

  correctLoss(input: unknown): LossRecord {
    const record = buildLossRecord(input);
    this.assertCorrection(record, 'loss');
    this.insertEntry(record);
    return this.publish(record);
  }

  recordConsumption(input: unknown): ConsumptionRecord {
    const record = buildConsumptionRecord(input);
    this.insertEntry(record);
    return this.publish(record);
  }

  recordClassification(input: unknown): ClassificationRecord {
    const record = buildClassificationRecord(input);
    this.insertEntry(record);
    return this.publish(record);
  }

  recordFinishedGoodsReceipt(input: unknown): FinishedGoodsReceipt {
    const record = buildFinishedGoodsReceipt(input);
    this.insertEntry(record);
    return this.publish(record);
  }

  openQuema(input: unknown): QuemaView {
    const { quema, start } = buildQuema(input);
    if (this.quemas.some((item) => item.id === quema.id)) {
      throw new ProductionTraceError('conflict', 'Production record id already exists');
    }
    this.assertIdFree(start.id);
    this.quemas.push(structuredClone(quema));
    this.quemaTimes.push(structuredClone(start));
    return this.getQuema(quema.organizationId, quema.id);
  }

  endQuema(input: unknown): QuemaView {
    const fact = buildQuemaEnd(input);
    const quema = this.quemas.find(
      (item) => item.id === fact.quemaId && item.organizationId === fact.organizationId,
    );
    if (!quema) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
    this.assertIdFree(fact.id);
    if (fact.correctsTimeId) {
      this.assertTimeCorrection(fact);
    } else if (this.currentTimes(fact.organizationId, fact.quemaId).some((item) => item.phase === 'end')) {
      throw new ProductionTraceError('conflict', 'Correct the latest end. The prior fact is not overwritten.');
    }
    this.quemaTimes.push(structuredClone(fact));
    return this.getQuema(fact.organizationId, fact.quemaId);
  }

  attachQuemaProduct(input: unknown): QuemaProductLink {
    const link = buildQuemaProductLink(input);
    const quema = this.quemas.find(
      (item) => item.id === link.quemaId && item.organizationId === link.organizationId,
    );
    if (!quema) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
    this.assertIdFree(link.id);
    this.quemaProducts.push(structuredClone(link));
    return this.publish(link);
  }

  get(organizationId: string, id: string): ProductionTraceEntry | null {
    const entry = this.entries.find((item) => item.id === id && item.organizationId === organizationId);
    return entry ? this.publish(entry) : null;
  }

  listForProduct(organizationId: string, productId: string): ProductionTraceEntry[] {
    return this.entries
      .filter((entry) => entry.organizationId === organizationId && 'productId' in entry && entry.productId === productId)
      .map((entry) => this.publish(entry));
  }

  listQuemasForProduct(organizationId: string, productId: string): QuemaView[] {
    const quemaIds = new Set(
      this.quemaProducts
        .filter((link) => link.organizationId === organizationId && link.productId === productId)
        .map((link) => link.quemaId),
    );
    return [...quemaIds].map((quemaId) => this.getQuema(organizationId, quemaId));
  }

  getQuema(organizationId: string, quemaId: string): QuemaView {
    const quema = this.quemas.find((item) => item.id === quemaId && item.organizationId === organizationId);
    if (!quema) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
    return projectQuema({
      quema,
      times: this.quemaTimes.filter((fact) => fact.organizationId === organizationId && fact.quemaId === quemaId),
      products: this.quemaProducts.filter(
        (link) => link.organizationId === organizationId && link.quemaId === quemaId,
      ),
    });
  }

  correctionHistory(organizationId: string, entryId: string): ProductionTraceEntry[] {
    const entry = this.entries.find((item) => item.id === entryId && item.organizationId === organizationId);
    if (!entry) return [];
    let root = entry;
    const seen = new Set<string>();
    while (root.correctsEntryId && !seen.has(root.id)) {
      seen.add(root.id);
      const parent = this.entries.find(
        (item) => item.id === root.correctsEntryId && item.organizationId === organizationId,
      );
      if (!parent) break;
      root = parent;
    }
    const chain = [root];
    let cursor = root.id;
    while (true) {
      const next = this.entries.find(
        (item) => item.organizationId === organizationId && item.correctsEntryId === cursor,
      );
      if (!next) break;
      chain.push(next);
      cursor = next.id;
    }
    return chain.map((item) => this.publish(item));
  }

  isListo(organizationId: string, productId: string): boolean {
    return isWarehouseListo(
      this.entries.filter((entry) => entry.organizationId === organizationId),
      productId,
    );
  }

  /**
   * Input stock is not a ledger. This always returns null and does not change when consumption is recorded.
   */
  inputStockBalance(_organizationId: string, _reference: string): null {
    return inputStockIsReliable() ? null : null;
  }

  private insertEntry(entry: ProductionTraceEntry): void {
    this.assertIdFree(entry.id);
    if (entry.correctsEntryId && entry.kind !== 'loss') {
      this.assertCorrection(entry, entry.kind);
    }
    if (entry.kind === 'loss' && entry.correctsEntryId) {
      this.assertCorrection(entry, 'loss');
    }
    if (entry.idempotencyKey) {
      const clash = this.entries.find(
        (item) => item.organizationId === entry.organizationId && item.idempotencyKey === entry.idempotencyKey,
      );
      if (clash) throw new ProductionTraceError('conflict', 'Idempotency key already used in this organization');
    }
    this.entries.push(structuredClone(entry));
  }

  private assertCorrection(entry: ProductionTraceEntry, kind: ProductionTraceEntry['kind']): void {
    if (!entry.correctsEntryId) return;
    const prior = this.entries.find(
      (item) => item.id === entry.correctsEntryId && item.organizationId === entry.organizationId,
    );
    if (!prior) {
      throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
    }
    if (prior.kind !== kind || entry.kind !== kind) {
      throw new ProductionTraceError('conflict', 'A correction keeps the same kind. The prior record is not overwritten.');
    }
    if (this.entries.some((item) => item.organizationId === entry.organizationId && item.correctsEntryId === prior.id)) {
      throw new ProductionTraceError('conflict', 'Correct the latest record. The prior record is not overwritten.');
    }
  }

  private assertTimeCorrection(fact: QuemaTimeFact): void {
    const prior = this.quemaTimes.find(
      (item) => item.id === fact.correctsTimeId && item.organizationId === fact.organizationId,
    );
    if (!prior || prior.quemaId !== fact.quemaId) {
      throw new ProductionTraceError('not_found', 'Quema time was not found in this organization');
    }
  }

  private currentTimes(organizationId: string, quemaId: string): QuemaTimeFact[] {
    const facts = this.quemaTimes.filter(
      (item) => item.organizationId === organizationId && item.quemaId === quemaId,
    );
    const superseded = new Set(facts.map((item) => item.correctsTimeId).filter((id): id is string => id !== null));
    return facts.filter((item) => !superseded.has(item.id));
  }

  private assertIdFree(id: string): void {
    const taken =
      this.entries.some((item) => item.id === id) ||
      this.quemas.some((item) => item.id === id) ||
      this.quemaTimes.some((item) => item.id === id) ||
      this.quemaProducts.some((item) => item.id === id);
    if (taken) throw new ProductionTraceError('conflict', 'Production record id already exists');
  }

  private publish<T>(value: T): T {
    return structuredClone(value);
  }
}
