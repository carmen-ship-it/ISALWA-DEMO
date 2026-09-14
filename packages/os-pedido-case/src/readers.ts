import type { PedidoSection } from './source';

export type SpecialOrderFact = {
  classification: 'normal' | 'special';
  requiresProductionPlanning: boolean;
  source: 'human_explicit';
  numericThreshold: null;
  actorLabel?: string;
  recordedAt?: string;
};

export type DateFact = {
  date: string;
};

export type ProductionFact = {
  productId: string;
  label?: string;
  /** Production is not a child of the pedido. */
  orderOwnsProduction: false;
};

export type CoveringAdvisorFact = {
  actingAdvisorMemberId: string;
  actingAdvisorLabel: string | null;
  sharedOwnership: false;
  note: 'Cubre. No es responsable principal.';
};

export type InjectedSection<T> =
  | { state: 'AVAILABLE'; fact: T; displayCopy?: string }
  | { state: 'NO_FACT'; reason: string; displayCopy?: string }
  | { state: 'UNPROVEN'; reason?: string; displayCopy?: string }
  | { state: 'ERROR'; reason: string; displayCopy?: string };

export type SectionLookup = {
  organizationId: string;
  orderId: string;
};

export type CoveringLookup = SectionLookup & {
  customerPartyId: string;
  primaryOwnerMemberId: string;
};

/**
 * Production is not looked up by order id.
 * productIds, when present, are caller-supplied product links — never copied from the order.
 */
export type ProductionLookup = {
  organizationId: string;
  productIds: readonly string[];
};

export type PedidoSectionReaders = {
  coveringAdvisor?: (input: CoveringLookup) => Promise<InjectedSection<CoveringAdvisorFact> | null>;
  specialOrderClassification?: (
    input: SectionLookup,
  ) => Promise<InjectedSection<SpecialOrderFact> | null>;
  customerCommittedDate?: (input: SectionLookup) => Promise<InjectedSection<DateFact> | null>;
  productionInternalTargetDate?: (
    input: SectionLookup,
  ) => Promise<InjectedSection<DateFact> | null>;
  production?: (input: ProductionLookup) => Promise<InjectedSection<ProductionFact> | null>;
  risk?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  customerInformed?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  purchasing?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  release?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  finishedGoods?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  allocation?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  remainingFulfillment?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  warehouseExit?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  delivery?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  nextAction?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  latestImportantChange?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
  evidenceHistory?: (input: SectionLookup) => Promise<InjectedSection<unknown> | null>;
};

export type NormalizedInjected<T> = PedidoSection<T>;

const FORBIDDEN_NUMERIC_KEYS = [
  'quantity',
  'amount',
  'amountCentavos',
  'totalCentavos',
  'threshold',
  'minimum',
  'greaterThan',
  'lineCount',
] as const;

export function explicitSpecialOrder(fact: unknown): SpecialOrderFact | 'threshold' | null {
  if (!fact || typeof fact !== 'object') return null;
  const record = fact as Record<string, unknown>;
  for (const key of FORBIDDEN_NUMERIC_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return 'threshold';
  }
  if (record.numericThreshold != null) return 'threshold';
  if (record.source !== 'human_explicit') return null;
  if (record.classification !== 'normal' && record.classification !== 'special') return null;
  if (typeof record.requiresProductionPlanning !== 'boolean') return null;
  return {
    classification: record.classification,
    requiresProductionPlanning: record.requiresProductionPlanning,
    source: 'human_explicit',
    numericThreshold: null,
    ...(typeof record.actorLabel === 'string' ? { actorLabel: record.actorLabel } : {}),
    ...(typeof record.recordedAt === 'string' ? { recordedAt: record.recordedAt } : {}),
  };
}

export function calendarDate(fact: unknown): string | null {
  if (!fact || typeof fact !== 'object') return null;
  const date = (fact as { date?: unknown }).date;
  if (typeof date !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function productLinkedFact(fact: unknown): ProductionFact | null {
  if (!fact || typeof fact !== 'object') return null;
  const record = fact as Record<string, unknown>;
  if ('orderId' in record || 'order_id' in record || 'pedidoId' in record) return null;
  if (typeof record.productId !== 'string' || record.productId.trim().length === 0) return null;
  return {
    productId: record.productId.trim(),
    ...(typeof record.label === 'string' ? { label: record.label } : {}),
    orderOwnsProduction: false,
  };
}

/** A recorded zero is not a balance, a remainder, or stock. */
export function containsFakeZero(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(
    (item) => item === 0 || item === '0' || item === 0n,
  );
}
