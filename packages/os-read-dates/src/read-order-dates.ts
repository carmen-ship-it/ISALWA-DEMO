import {
  CUSTOMER_DATE_SOURCE,
  PRODUCTION_DATE_SOURCE,
  recordedDateDivergence,
} from '@isalwa/os-contracts';
import { authorizeCommercialDateRead, type TrustedDateReadContext } from './authorize';
import { available, noFact, readError, unproven, type CoveredFact } from './coverage';
import { asDateFactsReadPort, type DateFactsReadPort, type PrismaDateFactsClient } from './port';
import {
  ORDER_DATE_SUBJECT_TYPE,
  calendarDate,
  instant,
  sameOrganization,
  type CustomerCommittedDateFact,
  type CustomerCommittedDateRevisionFact,
  type CustomerDateInformedFact,
  type ProductionDateIssueFact,
  type ProductionInternalTargetDateFact,
  type ProductionInternalTargetRevisionFact,
  type RecordedDateDivergenceFact,
} from './rows';

export type DateReadDb = DateFactsReadPort | PrismaDateFactsClient;

/**
 * Delay has no stored fact. This result cannot be AVAILABLE.
 * Do not compare dates or invent a day count.
 */
export type DateDelayRead =
  | { coverage: 'NO_FACT'; fact: null }
  | { coverage: 'UNPROVEN'; fact: null; denial: 'PERMISSION_DENIED' | 'AUTH_REQUIRED' }
  | { coverage: 'ERROR'; fact: null };

export type OrderDateFacts = {
  customerCommittedDate: CoveredFact<CustomerCommittedDateFact>;
  customerCommittedDateHistory: CoveredFact<CustomerCommittedDateRevisionFact[]>;
  productionInternalTargetDate: CoveredFact<ProductionInternalTargetDateFact>;
  productionInternalTargetHistory: CoveredFact<ProductionInternalTargetRevisionFact[]>;
  delay: DateDelayRead;
  risk: CoveredFact<ProductionDateIssueFact[]>;
  customerInformed: CoveredFact<CustomerDateInformedFact[]>;
  recordedDivergence: CoveredFact<RecordedDateDivergenceFact>;
};

export type OrderDateFactsRead = CoveredFact<OrderDateFacts>;

type ProvenOrder =
  | { kind: 'unproven'; result: CoveredFact<never> }
  | { kind: 'missing' }
  | { kind: 'error' }
  | { kind: 'proven'; organizationId: string; orderId: string; db: DateFactsReadPort };

function orderKey(orderId: string): string | null {
  if (typeof orderId !== 'string') return null;
  const trimmed = orderId.trim();
  return trimmed || null;
}

/**
 * Prove the order belongs to the trusted organization before any date read.
 * A foreign id and a missing id both stop here as missing. No existence leak.
 */
async function proveOrder(
  db: DateReadDb,
  ctx: TrustedDateReadContext | null | undefined,
  orderId: string,
): Promise<ProvenOrder> {
  const auth = authorizeCommercialDateRead(ctx);
  if (!auth.ok) return { kind: 'unproven', result: unproven(auth.denial) };
  const id = orderKey(orderId);
  if (!id) return { kind: 'missing' };
  const port = asDateFactsReadPort(db);
  try {
    const order = await port.findOrderInOrganization({
      organizationId: auth.context.organizationId,
      orderId: id,
    });
    if (!order || order.id !== id) return { kind: 'missing' };
    if (order.organizationId != null && order.organizationId !== auth.context.organizationId) {
      return { kind: 'missing' };
    }
    return { kind: 'proven', organizationId: auth.context.organizationId, orderId: id, db: port };
  } catch {
    return { kind: 'error' };
  }
}

function toCustomerDate(
  row: {
    id: string;
    organizationId: string;
    subjectType: string;
    subjectId: string;
    partyId: string | null;
    commercialOwnerMemberId: string;
    committedOn: Date | string;
    originalCommittedOn: Date | string;
    originalReason: string;
    source: string;
    setByMemberId: string;
    setAt: Date | string;
  },
  organizationId: string,
  orderId: string,
): CustomerCommittedDateFact | null {
  if (!sameOrganization(row, organizationId)) return null;
  if (row.subjectType !== ORDER_DATE_SUBJECT_TYPE || row.subjectId !== orderId) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    subjectType: ORDER_DATE_SUBJECT_TYPE,
    subjectId: row.subjectId,
    partyId: row.partyId,
    commercialOwnerMemberId: row.commercialOwnerMemberId,
    committedOn: calendarDate(row.committedOn),
    originalCommittedOn: calendarDate(row.originalCommittedOn),
    originalReason: row.originalReason,
    source: row.source,
    setByMemberId: row.setByMemberId,
    setAt: instant(row.setAt),
  };
}

function toProductionDate(
  row: {
    id: string;
    organizationId: string;
    subjectType: string;
    subjectId: string;
    maintainedByMemberId: string;
    targetOn: Date | string;
    originalTargetOn: Date | string;
    originalReason: string;
    source: string;
    setByMemberId: string;
    setAt: Date | string;
  },
  organizationId: string,
  orderId: string,
): ProductionInternalTargetDateFact | null {
  if (!sameOrganization(row, organizationId)) return null;
  if (row.subjectType !== ORDER_DATE_SUBJECT_TYPE || row.subjectId !== orderId) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    subjectType: ORDER_DATE_SUBJECT_TYPE,
    subjectId: row.subjectId,
    maintainedByMemberId: row.maintainedByMemberId,
    targetOn: calendarDate(row.targetOn),
    originalTargetOn: calendarDate(row.originalTargetOn),
    originalReason: row.originalReason,
    source: row.source,
    setByMemberId: row.setByMemberId,
    setAt: instant(row.setAt),
  };
}

export async function readOrderCustomerCommittedDate(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<CustomerCommittedDateFact>> {
  const proven = await proveOrder(db, ctx, orderId);
  if (proven.kind === 'unproven') return proven.result;
  if (proven.kind === 'missing') return noFact();
  if (proven.kind === 'error') return readError();
  try {
    const row = await proven.db.findCustomerCommittedDate({
      organizationId: proven.organizationId,
      subjectType: ORDER_DATE_SUBJECT_TYPE,
      subjectId: proven.orderId,
    });
    if (!row) return noFact();
    const fact = toCustomerDate(row, proven.organizationId, proven.orderId);
    return fact ? available(fact) : noFact();
  } catch {
    return readError();
  }
}

export async function readOrderCustomerCommittedDateHistory(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<CustomerCommittedDateRevisionFact[]>> {
  const current = await readOrderCustomerCommittedDate(db, ctx, orderId);
  if (current.coverage !== 'AVAILABLE') {
    if (current.coverage === 'UNPROVEN') return unproven(current.denial);
    if (current.coverage === 'ERROR') return readError();
    return noFact();
  }
  try {
    const rows = await asDateFactsReadPort(db).listCustomerCommittedDateRevisions({
      organizationId: current.fact.organizationId,
      committedDateId: current.fact.id,
    });
    const revisions = rows
      .filter((row) => sameOrganization(row, current.fact.organizationId) && row.committedDateId === current.fact.id)
      .map((row) => ({
        id: row.id,
        committedDateId: row.committedDateId,
        organizationId: row.organizationId,
        previousCommittedOn: calendarDate(row.previousCommittedOn),
        nextCommittedOn: calendarDate(row.nextCommittedOn),
        reason: row.reason,
        actorMemberId: row.actorMemberId,
        source: row.source,
        revisedAt: instant(row.revisedAt),
      }))
      .sort((left, right) => left.revisedAt.localeCompare(right.revisedAt) || left.id.localeCompare(right.id));
    return available(revisions);
  } catch {
    return readError();
  }
}

export async function readOrderProductionInternalTargetDate(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<ProductionInternalTargetDateFact>> {
  const proven = await proveOrder(db, ctx, orderId);
  if (proven.kind === 'unproven') return proven.result;
  if (proven.kind === 'missing') return noFact();
  if (proven.kind === 'error') return readError();
  try {
    const row = await proven.db.findProductionInternalTargetDate({
      organizationId: proven.organizationId,
      subjectType: ORDER_DATE_SUBJECT_TYPE,
      subjectId: proven.orderId,
    });
    if (!row) return noFact();
    const fact = toProductionDate(row, proven.organizationId, proven.orderId);
    return fact ? available(fact) : noFact();
  } catch {
    return readError();
  }
}

export async function readOrderProductionInternalTargetHistory(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<ProductionInternalTargetRevisionFact[]>> {
  const current = await readOrderProductionInternalTargetDate(db, ctx, orderId);
  if (current.coverage !== 'AVAILABLE') {
    if (current.coverage === 'UNPROVEN') return unproven(current.denial);
    if (current.coverage === 'ERROR') return readError();
    return noFact();
  }
  try {
    const rows = await asDateFactsReadPort(db).listProductionInternalTargetRevisions({
      organizationId: current.fact.organizationId,
      targetDateId: current.fact.id,
    });
    const revisions = rows
      .filter((row) => sameOrganization(row, current.fact.organizationId) && row.targetDateId === current.fact.id)
      .map((row) => ({
        id: row.id,
        targetDateId: row.targetDateId,
        organizationId: row.organizationId,
        previousTargetOn: calendarDate(row.previousTargetOn),
        nextTargetOn: calendarDate(row.nextTargetOn),
        reason: row.reason,
        actorMemberId: row.actorMemberId,
        source: row.source,
        revisedAt: instant(row.revisedAt),
      }))
      .sort((left, right) => left.revisedAt.localeCompare(right.revisedAt) || left.id.localeCompare(right.id));
    return available(revisions);
  } catch {
    return readError();
  }
}

/**
 * Schema has no delay column and no delay model. Never computed from a
 * calendar, a missed date, or a difference between the two stored dates.
 */
export async function readOrderDateDelay(
  _db: DateReadDb,
  ctx: TrustedDateReadContext,
  _orderId: string,
): Promise<DateDelayRead> {
  const auth = authorizeCommercialDateRead(ctx);
  if (!auth.ok) return { coverage: 'UNPROVEN', fact: null, denial: auth.denial };
  return { coverage: 'NO_FACT', fact: null };
}

/**
 * Risk is only an explicit ProductionDateIssue row. No issues is NO_FACT,
 * not false and not zero risk. Flags are returned as stored. Divergence
 * between the two dates is not risk.
 */
export async function readOrderDateRisk(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<ProductionDateIssueFact[]>> {
  const proven = await proveOrder(db, ctx, orderId);
  if (proven.kind === 'unproven') return proven.result;
  if (proven.kind === 'missing') return noFact();
  if (proven.kind === 'error') return readError();
  try {
    const rows = await proven.db.listProductionDateIssues({
      organizationId: proven.organizationId,
      subjectType: ORDER_DATE_SUBJECT_TYPE,
      subjectId: proven.orderId,
    });
    const issues = rows
      .filter(
        (row) =>
          sameOrganization(row, proven.organizationId) &&
          row.subjectType === ORDER_DATE_SUBJECT_TYPE &&
          row.subjectId === proven.orderId,
      )
      .map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        subjectType: ORDER_DATE_SUBJECT_TYPE,
        subjectId: row.subjectId,
        mayAffectProductionCalendar: row.mayAffectProductionCalendar,
        mayAffectCustomerDate: row.mayAffectCustomerDate,
        source: row.source,
        note: row.note,
        recordedByMemberId: row.recordedByMemberId,
        recordedAt: instant(row.recordedAt),
      }))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.id.localeCompare(right.id));
    if (issues.length === 0) return noFact();
    return available(issues);
  } catch {
    return readError();
  }
}

/**
 * Customer-informed is a separate stored record. A missing record is
 * NO_FACT, not "not informed" and not notified: false.
 */
export async function readOrderCustomerInformedState(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<CustomerDateInformedFact[]>> {
  const proven = await proveOrder(db, ctx, orderId);
  if (proven.kind === 'unproven') return proven.result;
  if (proven.kind === 'missing') return noFact();
  if (proven.kind === 'error') return readError();
  try {
    const rows = await proven.db.listCustomerDateInformedRecords({
      organizationId: proven.organizationId,
      subjectType: ORDER_DATE_SUBJECT_TYPE,
      subjectId: proven.orderId,
    });
    const records = rows
      .filter(
        (row) =>
          sameOrganization(row, proven.organizationId) &&
          row.subjectType === ORDER_DATE_SUBJECT_TYPE &&
          row.subjectId === proven.orderId,
      )
      .map((row) => ({
        id: row.id,
        issueId: row.issueId,
        organizationId: row.organizationId,
        subjectType: ORDER_DATE_SUBJECT_TYPE,
        subjectId: row.subjectId,
        note: row.note,
        recordedByMemberId: row.recordedByMemberId,
        recordedAt: instant(row.recordedAt),
        notified: row.notified,
      }))
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.id.localeCompare(right.id));
    if (records.length === 0) return noFact();
    return available(records);
  } catch {
    return readError();
  }
}

/**
 * Divergence only when both dates were recorded. A missing date is NO_FACT,
 * not diverges: false. This is not a risk score.
 */
export async function readOrderRecordedDateDivergence(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<CoveredFact<RecordedDateDivergenceFact>> {
  const customer = await readOrderCustomerCommittedDate(db, ctx, orderId);
  if (customer.coverage === 'UNPROVEN') return unproven(customer.denial);
  if (customer.coverage === 'ERROR') return readError();
  const production = await readOrderProductionInternalTargetDate(db, ctx, orderId);
  if (production.coverage === 'UNPROVEN') return unproven(production.denial);
  if (production.coverage === 'ERROR') return readError();
  if (customer.coverage !== 'AVAILABLE' || production.coverage !== 'AVAILABLE') return noFact();
  if (customer.fact.source !== CUSTOMER_DATE_SOURCE || production.fact.source !== PRODUCTION_DATE_SOURCE) {
    return noFact();
  }

  const compared = recordedDateDivergence(
    {
      id: customer.fact.id,
      organizationId: customer.fact.organizationId,
      subjectType: customer.fact.subjectType,
      subjectId: customer.fact.subjectId,
      partyId: customer.fact.partyId,
      commercialOwnerMemberId: customer.fact.commercialOwnerMemberId,
      committedOn: customer.fact.committedOn,
      originalCommittedOn: customer.fact.originalCommittedOn,
      originalReason: customer.fact.originalReason,
      source: CUSTOMER_DATE_SOURCE,
      setByMemberId: customer.fact.setByMemberId,
      setAt: customer.fact.setAt,
      canonical: true,
    },
    {
      id: production.fact.id,
      organizationId: production.fact.organizationId,
      subjectType: production.fact.subjectType,
      subjectId: production.fact.subjectId,
      maintainedByMemberId: production.fact.maintainedByMemberId,
      targetOn: production.fact.targetOn,
      originalTargetOn: production.fact.originalTargetOn,
      originalReason: production.fact.originalReason,
      source: PRODUCTION_DATE_SOURCE,
      setByMemberId: production.fact.setByMemberId,
      setAt: production.fact.setAt,
      canonical: true,
    },
  );
  if (!compared) return noFact();
  return available(compared);
}

/**
 * One tenant-scoped snapshot. A foreign or missing order is NO_FACT for the
 * whole snapshot, the same shape. Nested missing dates stay NO_FACT, not false.
 */
export async function readOrderDateFacts(
  db: DateReadDb,
  ctx: TrustedDateReadContext,
  orderId: string,
): Promise<OrderDateFactsRead> {
  const proven = await proveOrder(db, ctx, orderId);
  if (proven.kind === 'unproven') return proven.result;
  if (proven.kind === 'missing') return noFact();
  if (proven.kind === 'error') return readError();

  const [
    customerCommittedDate,
    customerCommittedDateHistory,
    productionInternalTargetDate,
    productionInternalTargetHistory,
    delay,
    risk,
    customerInformed,
    recordedDivergence,
  ] = await Promise.all([
    readOrderCustomerCommittedDate(db, ctx, orderId),
    readOrderCustomerCommittedDateHistory(db, ctx, orderId),
    readOrderProductionInternalTargetDate(db, ctx, orderId),
    readOrderProductionInternalTargetHistory(db, ctx, orderId),
    readOrderDateDelay(db, ctx, orderId),
    readOrderDateRisk(db, ctx, orderId),
    readOrderCustomerInformedState(db, ctx, orderId),
    readOrderRecordedDateDivergence(db, ctx, orderId),
  ]);

  return available({
    customerCommittedDate,
    customerCommittedDateHistory,
    productionInternalTargetDate,
    productionInternalTargetHistory,
    delay,
    risk,
    customerInformed,
    recordedDivergence,
  });
}
