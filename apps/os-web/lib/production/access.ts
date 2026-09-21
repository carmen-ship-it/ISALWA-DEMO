import {
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  buildClassificationRecord,
  buildConsumptionRecord,
  buildFinishedGoodsReceipt,
  buildLossRecord,
  buildProcessRecord,
  buildQuema,
  buildQuemaEnd,
  buildQuemaProductLink,
  canEnterProduction,
  canReviewProduction,
  consumptionMutatesStock,
  deriveQualityRatios,
  finishedGoodsReceiptAllocatesToOrder,
  inputStockIsReliable,
  isWarehouseListo,
  projectQuema,
  scopesGrantedByCargoOrTitle,
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
} from '@isalwa/os-contracts';

export const PRODUCTION_RECORD_KINDS = [
  'process_record',
  'quema',
  'loss',
  'consumption',
  'finished_goods_receipt',
] as const;

export type ProductionRecordKind = (typeof PRODUCTION_RECORD_KINDS)[number];

export type ProductionDenial =
  | 'session_org_required'
  | 'cross_tenant'
  | 'unauthorized_role'
  | 'search_leakage'
  | 'aggregate_leakage'
  | 'invalid';

export type ProductionSession = {
  organizationId?: string | null;
  memberId?: string | null;
  grantedScopes?: readonly string[] | null;
  actorLabel?: string | null;
  cargo?: string | null;
  title?: string | null;
};

export type AccessFailure = {
  ok: false;
  denial: ProductionDenial;
  message: string;
};

export type AccessSuccess<T> = { ok: true; value: T };

export type AccessResult<T> = AccessSuccess<T> | AccessFailure;

export type ProductionSearchHit = {
  organizationId: string;
  kind: ProductionRecordKind;
  id: string;
  productId: string | null;
};

export type ProductionAggregate = {
  organizationId: string;
  kind: ProductionRecordKind | 'all';
  processRecords: number;
  quemas: number;
  losses: number;
  consumptions: number;
  receipts: number;
  /** Null when this tenant has no classification counts. Not another tenant's zero. */
  goodCount: number | null;
  lostCount: number | null;
  officialStock: null;
  stockOfficial: false;
};

export type OfficialStock = {
  official: false;
  quantity: null;
  mutatesStock: false;
  emptyIsZeroStock: false;
  reason: 'El stock no es oficial. Un resultado vacío no es cero.';
};

type LedgerSeed = {
  entries?: readonly ProductionTraceEntry[];
  quemas?: readonly Quema[];
  times?: readonly QuemaTimeFact[];
  links?: readonly QuemaProductLink[];
};

const DENIAL_MESSAGE: Record<ProductionDenial, string> = {
  session_org_required: 'Falta la organización de la sesión. No se anota nada.',
  cross_tenant: 'Ese registro no pertenece a esta organización.',
  unauthorized_role: 'Hace falta el permiso de planta. El cargo no autoriza.',
  search_leakage: 'La búsqueda no incluye otra organización.',
  aggregate_leakage: 'El resumen no mezcla otra organización.',
  invalid: 'No se pudo anotar. Revise los datos de planta.',
};

const ORDER_KEYS = [
  'orderId',
  'order_id',
  'pedidoId',
  'pedido_id',
  'orderLineId',
  'order_line_id',
  'completionPercent',
  'completion_percent',
] as const;

export class ProductionAccessLedger {
  readonly entries: ProductionTraceEntry[] = [];
  readonly quemas: Quema[] = [];
  readonly times: QuemaTimeFact[] = [];
  readonly links: QuemaProductLink[] = [];

  constructor(seed?: LedgerSeed) {
    this.entries.push(...(seed?.entries ?? []).map((item) => structuredClone(item)));
    this.quemas.push(...(seed?.quemas ?? []).map((item) => structuredClone(item)));
    this.times.push(...(seed?.times ?? []).map((item) => structuredClone(item)));
    this.links.push(...(seed?.links ?? []).map((item) => structuredClone(item)));
  }
}

function fail(denial: ProductionDenial, message?: string): AccessFailure {
  return { ok: false, denial, message: message ?? DENIAL_MESSAGE[denial] };
}

function sessionOrganization(session: ProductionSession | null | undefined): string | null {
  const organizationId = session?.organizationId?.trim() ?? '';
  return organizationId || null;
}

function scopesOf(session: ProductionSession): readonly string[] {
  const granted = session.grantedScopes ?? [];
  const fromCargo = scopesGrantedByCargoOrTitle(session.cargo, session.title);
  return [...granted, ...fromCargo];
}

export function canEnterProductionWorkspace(session: ProductionSession | null | undefined): boolean {
  if (!session) return false;
  return canEnterProduction(scopesOf(session));
}

export function canReviewProductionWorkspace(session: ProductionSession | null | undefined): boolean {
  if (!session) return false;
  return canReviewProduction(scopesOf(session));
}

function canRead(session: ProductionSession): boolean {
  return canEnterProductionWorkspace(session) || canReviewProductionWorkspace(session);
}

function payloadOrganization(input: Record<string, unknown>): string | null {
  const value = input.organizationId;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function hasForbiddenField(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => (ORDER_KEYS as readonly string[]).includes(key));
}

function gateWrite(
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessFailure | { ok: true; organizationId: string } {
  const organizationId = sessionOrganization(session);
  if (!session || !organizationId) return fail('session_org_required');
  if (hasForbiddenField(input)) return fail('invalid', 'Ese dato no es de fabricación.');
  const claimed = payloadOrganization(input);
  if (claimed && claimed !== organizationId) return fail('cross_tenant');
  if (!session || !canEnterProductionWorkspace(session)) return fail('unauthorized_role');
  return { ok: true, organizationId };
}

function gateRead(
  session: ProductionSession | null | undefined,
  requestedOrganizationId?: string | null,
): AccessFailure | { ok: true; organizationId: string } {
  const organizationId = sessionOrganization(session);
  if (!session || !organizationId) return fail('session_org_required');
  if (requestedOrganizationId && requestedOrganizationId.trim() && requestedOrganizationId.trim() !== organizationId) {
    return fail('cross_tenant');
  }
  if (!canRead(session)) return fail('unauthorized_role');
  return { ok: true, organizationId };
}

function actorLabelOf(session: ProductionSession): string {
  const label = session.actorLabel?.trim() ?? '';
  return label || 'Operación de planta';
}

function stamp(session: ProductionSession, organizationId: string, input: Record<string, unknown>) {
  return {
    ...input,
    organizationId,
    actorMemberId: session.memberId?.trim() || null,
    actorLabel: typeof input.actorLabel === 'string' && input.actorLabel.trim()
      ? input.actorLabel.trim()
      : actorLabelOf(session),
    source: 'manual' as const,
  };
}

function catchBuild(error: unknown): AccessFailure {
  const message = error instanceof Error ? error.message : DENIAL_MESSAGE.invalid;
  return fail('invalid', message);
}

export function recordProcess(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<ProcessRecord> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const record = buildProcessRecord(stamp(session!, gate.organizationId, input));
    const replay = findProcessByIdempotency(ledger, record.organizationId, record.idempotencyKey);
    if (replay) return { ok: true, value: replay };
    if (takenEntry(ledger, record.id, record.organizationId)) return fail('invalid', 'Ese identificador ya existe.');
    ledger.entries.push(record);
    return { ok: true, value: record };
  } catch (error) {
    return catchBuild(error);
  }
}

export function recordLoss(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<LossRecord> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const record = buildLossRecord(stamp(session!, gate.organizationId, input));
    if (takenEntry(ledger, record.id, record.organizationId)) return fail('invalid', 'Ese identificador ya existe.');
    ledger.entries.push(record);
    return { ok: true, value: record };
  } catch (error) {
    return catchBuild(error);
  }
}

export function recordConsumption(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<ConsumptionRecord> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const record = buildConsumptionRecord(stamp(session!, gate.organizationId, input));
    if (record.inventoryEffect !== 'none' || consumptionMutatesStock()) {
      return fail('invalid', 'El consumo no descuenta stock.');
    }
    if (takenEntry(ledger, record.id, record.organizationId)) return fail('invalid', 'Ese identificador ya existe.');
    ledger.entries.push(record);
    return { ok: true, value: record };
  } catch (error) {
    return catchBuild(error);
  }
}

export function recordReceipt(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<FinishedGoodsReceipt> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const record = buildFinishedGoodsReceipt(stamp(session!, gate.organizationId, input));
    if (record.allocatesToOrder || finishedGoodsReceiptAllocatesToOrder()) {
      return fail('invalid', 'Un ingreso no asigna un pedido.');
    }
    if (takenEntry(ledger, record.id, record.organizationId)) return fail('invalid', 'Ese identificador ya existe.');
    ledger.entries.push(record);
    return { ok: true, value: record };
  } catch (error) {
    return catchBuild(error);
  }
}

export function recordClassification(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<ClassificationRecord> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const record = buildClassificationRecord(stamp(session!, gate.organizationId, input));
    if (takenEntry(ledger, record.id, record.organizationId)) return fail('invalid', 'Ese identificador ya existe.');
    ledger.entries.push(record);
    return { ok: true, value: record };
  } catch (error) {
    return catchBuild(error);
  }
}

export function openQuema(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<QuemaView> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  try {
    const { quema, start } = buildQuema(stamp(session!, gate.organizationId, input));
    if (ledger.quemas.some((item) => item.id === quema.id && item.organizationId === quema.organizationId)) {
      return fail('invalid', 'Ese identificador ya existe.');
    }
    ledger.quemas.push(quema);
    ledger.times.push(start);
    return { ok: true, value: viewQuema(ledger, gate.organizationId, quema.id) };
  } catch (error) {
    return catchBuild(error);
  }
}

export function endQuema(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<QuemaView> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  const quemaId = typeof input.quemaId === 'string' ? input.quemaId : '';
  const owned = ledger.quemas.find((item) => item.id === quemaId && item.organizationId === gate.organizationId);
  if (!owned) return fail('invalid', 'La quema no está en esta organización.');
  try {
    const fact = buildQuemaEnd(stamp(session!, gate.organizationId, input));
    ledger.times.push(fact);
    return { ok: true, value: viewQuema(ledger, gate.organizationId, quemaId) };
  } catch (error) {
    return catchBuild(error);
  }
}

export function attachQuemaProduct(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  input: Record<string, unknown>,
): AccessResult<QuemaProductLink> {
  const gate = gateWrite(session, input);
  if (!gate.ok) return gate;
  const quemaId = typeof input.quemaId === 'string' ? input.quemaId : '';
  const owned = ledger.quemas.find((item) => item.id === quemaId && item.organizationId === gate.organizationId);
  if (!owned) return fail('invalid', 'La quema no está en esta organización.');
  try {
    const link = buildQuemaProductLink(stamp(session!, gate.organizationId, input));
    ledger.links.push(link);
    return { ok: true, value: link };
  } catch (error) {
    return catchBuild(error);
  }
}

export function searchProduction(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  query: { text: string; organizationId?: string | null; kind?: ProductionRecordKind },
): AccessResult<ProductionSearchHit[]> {
  const requested = query.organizationId?.trim() ?? '';
  const organizationId = sessionOrganization(session);
  if (!session || !organizationId) return fail('session_org_required');
  if (requested && requested !== organizationId) return fail('search_leakage');
  if (!canRead(session)) return fail('unauthorized_role');
  const text = query.text.trim().toLowerCase();
  const hits = collectHits(ledger, organizationId, query.kind).filter((hit) => {
    if (hit.organizationId !== organizationId) return false;
    if (!text) return true;
    return hit.id.toLowerCase().includes(text) || (hit.productId?.toLowerCase().includes(text) ?? false);
  });
  if (hits.some((hit) => hit.organizationId !== organizationId)) return fail('search_leakage');
  return { ok: true, value: hits };
}

export function aggregateProduction(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  query: { organizationId?: string | null; kind?: ProductionRecordKind | 'all' } = {},
): AccessResult<ProductionAggregate> {
  const requested = query.organizationId?.trim() ?? '';
  const organizationId = sessionOrganization(session);
  if (!session || !organizationId) return fail('session_org_required');
  if (requested && requested !== organizationId) return fail('aggregate_leakage');
  if (!canRead(session)) return fail('unauthorized_role');
  const kind = query.kind ?? 'all';
  const entries = ledger.entries.filter((entry) => entry.organizationId === organizationId);
  const quemas = ledger.quemas.filter((quema) => quema.organizationId === organizationId);
  if (entries.some((entry) => entry.organizationId !== organizationId) || quemas.some((quema) => quema.organizationId !== organizationId)) {
    return fail('aggregate_leakage');
  }
  const classifications = entries.filter((entry): entry is ClassificationRecord => entry.kind === 'classification');
  const current = currentClassifications(classifications);
  const hasCounts = current.some((entry) => entry.goodCount !== null || entry.lostCount !== null);
  const aggregate: ProductionAggregate = {
    organizationId,
    kind,
    processRecords: kind === 'all' || kind === 'process_record' ? entries.filter((entry) => entry.kind === 'process_record').length : 0,
    quemas: kind === 'all' || kind === 'quema' ? quemas.length : 0,
    losses: kind === 'all' || kind === 'loss' ? entries.filter((entry) => entry.kind === 'loss').length : 0,
    consumptions: kind === 'all' || kind === 'consumption' ? entries.filter((entry) => entry.kind === 'consumption').length : 0,
    receipts: kind === 'all' || kind === 'finished_goods_receipt' ? entries.filter((entry) => entry.kind === 'finished_goods_receipt').length : 0,
    goodCount: hasCounts ? current.reduce((sum, entry) => sum + (entry.goodCount ?? 0), 0) : null,
    lostCount: hasCounts ? current.reduce((sum, entry) => sum + (entry.lostCount ?? 0), 0) : null,
    officialStock: null,
    stockOfficial: false,
  };
  return { ok: true, value: aggregate };
}

export function qualityRatioForProduct(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  productId: string,
): AccessResult<{ goodPercent: string; lostPercent: string; denominator: number } | null> {
  const gate = gateRead(session);
  if (!gate.ok) return gate;
  const current = currentClassifications(
    ledger.entries.filter(
      (entry): entry is ClassificationRecord =>
        entry.kind === 'classification' &&
        entry.organizationId === gate.organizationId &&
        entry.productId === productId,
    ),
  );
  const latest = current.at(-1) ?? null;
  if (!latest) return { ok: true, value: null };
  return { ok: true, value: deriveQualityRatios(latest.goodCount, latest.lostCount) };
}

export function quemaProductList(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  quemaId: string,
): AccessResult<Array<{ productId: string; quantity: string | null; unit: string | null }>> {
  const gate = gateRead(session);
  if (!gate.ok) return gate;
  const owned = ledger.quemas.find((item) => item.id === quemaId && item.organizationId === gate.organizationId);
  if (!owned) return { ok: true, value: [] };
  const view = viewQuema(ledger, gate.organizationId, quemaId);
  return { ok: true, value: view.products.filter((product) => product.productId.length > 0) };
}

/**
 * Empty search is not official zero stock, even if another tenant consumed the reference.
 */
export function officialInputStock(
  _ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
  _reference: string,
): AccessResult<OfficialStock> {
  const organizationId = sessionOrganization(session);
  if (!session || !organizationId) return fail('session_org_required');
  if (!canRead(session)) return fail('unauthorized_role');
  if (inputStockIsReliable() || consumptionMutatesStock()) {
    return fail('invalid', 'El stock no es oficial.');
  }
  return {
    ok: true,
    value: {
      official: false,
      quantity: null,
      mutatesStock: false,
      emptyIsZeroStock: false,
      reason: 'El stock no es oficial. Un resultado vacío no es cero.',
    },
  };
}

export function listWorkspace(
  ledger: ProductionAccessLedger,
  session: ProductionSession | null | undefined,
): AccessResult<{
  entries: ProductionTraceEntry[];
  quemas: QuemaView[];
  listoProductIds: string[];
}> {
  const gate = gateRead(session);
  if (!gate.ok) return gate;
  const entries = ledger.entries.filter((entry) => entry.organizationId === gate.organizationId);
  const quemas = ledger.quemas
    .filter((quema) => quema.organizationId === gate.organizationId)
    .map((quema) => viewQuema(ledger, gate.organizationId, quema.id));
  const productIds = [...new Set(entries.map((entry) => ('productId' in entry ? entry.productId : null)).filter((id): id is string => Boolean(id)))];
  return {
    ok: true,
    value: {
      entries,
      quemas,
      listoProductIds: productIds.filter((productId) => isWarehouseListo(entries, productId)),
    },
  };
}

function viewQuema(ledger: ProductionAccessLedger, organizationId: string, quemaId: string): QuemaView {
  const quema = ledger.quemas.find((item) => item.id === quemaId && item.organizationId === organizationId);
  if (!quema) {
    return { id: quemaId, organizationId, startedAt: null, endedAt: null, products: [] };
  }
  return projectQuema({
    quema,
    times: ledger.times.filter((fact) => fact.organizationId === organizationId && fact.quemaId === quemaId),
    products: ledger.links.filter((link) => link.organizationId === organizationId && link.quemaId === quemaId),
  });
}

function collectHits(
  ledger: ProductionAccessLedger,
  organizationId: string,
  kind?: ProductionRecordKind,
): ProductionSearchHit[] {
  const hits: ProductionSearchHit[] = [];
  if (!kind || kind === 'quema') {
    for (const quema of ledger.quemas) {
      if (quema.organizationId !== organizationId) continue;
      hits.push({ organizationId, kind: 'quema', id: quema.id, productId: null });
      for (const link of ledger.links) {
        if (link.organizationId !== organizationId || link.quemaId !== quema.id) continue;
        hits.push({ organizationId, kind: 'quema', id: link.id, productId: link.productId });
      }
    }
  }
  for (const entry of ledger.entries) {
    if (entry.organizationId !== organizationId) continue;
    if (entry.kind === 'classification') continue;
    if (kind && entry.kind !== kind) continue;
    hits.push({
      organizationId,
      kind: entry.kind,
      id: entry.id,
      productId: 'productId' in entry ? entry.productId : null,
    });
  }
  return hits;
}

function findProcessByIdempotency(
  ledger: ProductionAccessLedger,
  organizationId: string,
  idempotencyKey: string | null | undefined,
): ProcessRecord | null {
  const key = idempotencyKey?.trim();
  if (!key) return null;
  for (const entry of ledger.entries) {
    if (entry.kind !== 'process_record') continue;
    if (entry.organizationId !== organizationId) continue;
    if (entry.idempotencyKey === key) return entry;
  }
  return null;
}

function takenEntry(ledger: ProductionAccessLedger, id: string, organizationId: string): boolean {
  return ledger.entries.some((item) => item.id === id && item.organizationId === organizationId);
}

function currentClassifications(entries: readonly ClassificationRecord[]): ClassificationRecord[] {
  const superseded = new Set(entries.map((entry) => entry.correctsEntryId).filter((id): id is string => id !== null));
  return entries.filter((entry) => !superseded.has(entry.id));
}

export const PRODUCTION_ENTRY_SCOPE = PRODUCTION_ENTRY_MEMBER_SCOPE;
export const PRODUCTION_REVIEW_SCOPE = PRODUCTION_REVIEW_MEMBER_SCOPE;
