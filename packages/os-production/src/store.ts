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

  recordProcess(trustedOrganizationId: string, input: unknown): ProcessRecord {
    const record = buildProcessRecord(this.bindOrganization(trustedOrganizationId, input));
    this.assertReferencedQuema(record.organizationId, record.quemaId);
    this.insertEntry(record);
    return this.publish(record);
  }

  recordLoss(trustedOrganizationId: string, input: unknown): LossRecord {
    const record = buildLossRecord(this.bindOrganization(trustedOrganizationId, input));
    this.insertEntry(record);
    return this.publish(record);
  }

  correctLoss(trustedOrganizationId: string, input: unknown): LossRecord {
    const organizationId = this.resolveOrganization(trustedOrganizationId);
    const priorId = textField(input, 'correctsEntryId');
    this.assertVisibleEntry(organizationId, priorId, 'loss');
    const record = buildLossRecord(this.bindOrganization(organizationId, input));
    this.assertCorrection(record, 'loss');
    this.insertEntry(record);
    return this.publish(record);
  }

  recordConsumption(trustedOrganizationId: string, input: unknown): ConsumptionRecord {
    const record = buildConsumptionRecord(this.bindOrganization(trustedOrganizationId, input));
    this.insertEntry(record);
    return this.publish(record);
  }

  recordClassification(trustedOrganizationId: string, input: unknown): ClassificationRecord {
    const record = buildClassificationRecord(this.bindOrganization(trustedOrganizationId, input));
    this.insertEntry(record);
    return this.publish(record);
  }

  recordFinishedGoodsReceipt(trustedOrganizationId: string, input: unknown): FinishedGoodsReceipt {
    const record = buildFinishedGoodsReceipt(this.bindOrganization(trustedOrganizationId, input));
    this.insertEntry(record);
    return this.publish(record);
  }

  openQuema(trustedOrganizationId: string, input: unknown): QuemaView {
    const { quema, start } = buildQuema(this.bindOrganization(trustedOrganizationId, input));
    if (this.quemas.some((item) => item.id === quema.id && item.organizationId === quema.organizationId)) {
      throw new ProductionTraceError('conflict', 'Production record id already exists');
    }
    this.assertIdFree(quema.organizationId, start.id);
    this.assertIdFree(quema.organizationId, quema.id);
    this.quemas.push(structuredClone(quema));
    this.quemaTimes.push(structuredClone(start));
    return this.getQuema(quema.organizationId, quema.id);
  }

  endQuema(trustedOrganizationId: string, input: unknown): QuemaView {
    const organizationId = this.resolveOrganization(trustedOrganizationId);
    const quemaId = textField(input, 'quemaId');
    if (!this.findQuema(organizationId, quemaId)) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
    const fact = buildQuemaEnd(this.bindOrganization(organizationId, input));
    this.assertIdFree(fact.organizationId, fact.id);
    if (fact.correctsTimeId) {
      this.assertTimeCorrection(fact);
    } else if (this.currentTimes(fact.organizationId, fact.quemaId).some((item) => item.phase === 'end')) {
      throw new ProductionTraceError('conflict', 'Correct the latest end. The prior fact is not overwritten.');
    }
    this.quemaTimes.push(structuredClone(fact));
    return this.getQuema(fact.organizationId, fact.quemaId);
  }

  attachQuemaProduct(trustedOrganizationId: string, input: unknown): QuemaProductLink {
    const organizationId = this.resolveOrganization(trustedOrganizationId);
    const quemaId = textField(input, 'quemaId');
    if (!this.findQuema(organizationId, quemaId)) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
    const correctsLinkId = textField(input, 'correctsLinkId');
    if (correctsLinkId && !this.findQuemaProduct(organizationId, quemaId, correctsLinkId)) {
      throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
    }
    const link = buildQuemaProductLink(this.bindOrganization(organizationId, input));
    this.assertIdFree(link.organizationId, link.id);
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

  private bindOrganization(trustedOrganizationId: string, input: unknown): unknown {
    const organizationId = this.resolveOrganization(trustedOrganizationId);
    const body = input && typeof input === 'object' ? { ...(input as Record<string, unknown>) } : {};
    return { ...body, organizationId };
  }

  /** Payload organizationId is ignored. The caller must pass the trusted session organization. */
  private resolveOrganization(trustedOrganizationId: string): string {
    const trusted = trustedOrganizationId.trim();
    if (!trusted) {
      throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
    }
    return trusted;
  }

  private findQuema(organizationId: string, quemaId: string): Quema | null {
    if (!organizationId || !quemaId) return null;
    return this.quemas.find((item) => item.id === quemaId && item.organizationId === organizationId) ?? null;
  }

  private findQuemaProduct(organizationId: string, quemaId: string, linkId: string): QuemaProductLink | null {
    if (!organizationId || !quemaId || !linkId) return null;
    return (
      this.quemaProducts.find(
        (item) => item.id === linkId && item.organizationId === organizationId && item.quemaId === quemaId,
      ) ?? null
    );
  }

  private assertReferencedQuema(organizationId: string, quemaId: string | null): void {
    if (!quemaId) return;
    if (!this.findQuema(organizationId, quemaId)) {
      throw new ProductionTraceError('not_found', 'Quema was not found in this organization');
    }
  }

  private assertVisibleEntry(
    organizationId: string,
    entryId: string,
    kind: ProductionTraceEntry['kind'],
  ): void {
    const prior = this.entries.find((item) => item.id === entryId && item.organizationId === organizationId);
    if (!prior || prior.kind !== kind) {
      throw new ProductionTraceError('not_found', 'Production record was not found in this organization');
    }
  }

  private insertEntry(entry: ProductionTraceEntry): void {
    this.assertIdFree(entry.organizationId, entry.id);
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

  private assertIdFree(organizationId: string, id: string): void {
    const taken =
      this.entries.some((item) => item.id === id && item.organizationId === organizationId) ||
      this.quemas.some((item) => item.id === id && item.organizationId === organizationId) ||
      this.quemaTimes.some((item) => item.id === id && item.organizationId === organizationId) ||
      this.quemaProducts.some((item) => item.id === id && item.organizationId === organizationId);
    if (taken) throw new ProductionTraceError('conflict', 'Production record id already exists');
  }

  private publish<T>(value: T): T {
    return structuredClone(value);
  }
}

function textField(input: unknown, key: string): string {
  if (!input || typeof input !== 'object') return '';
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}
