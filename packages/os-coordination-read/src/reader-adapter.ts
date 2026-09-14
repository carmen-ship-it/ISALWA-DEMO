/**
 * Company board adapter. Reads only through existing canonical readers.
 *
 * Connected sources: date risk (os-read-dates risk reader), purchase,
 * production, and allocation (os-read-ops under management.org.read),
 * warehouse exit, delivery, and release (os-read-fulfillment under
 * management.org.read).
 *
 * Finished goods has a reader and no model. That source stays UNPROVEN.
 * A missing model is not zero awaiting allocation.
 *
 * Prior decisions have no read capability. This adapter does not call
 * listCoordinationDecisions and does not treat coordination.decision.record
 * or operations.coordinator.record as a read gate.
 *
 * Omitted sources stay UNPROVEN. commercial.team.read does not unlock the
 * board. Title and cargo grant nothing. MEETING_REPLACEMENT stays UNPROVEN.
 *
 * Proof: IMPLEMENTED and TESTED in this package. Not hosted. Not
 * browser-verified. 1ab294f is not merged. The integrate pin is not moved.
 */

import {
  CUSTOMER_DATE_SUBJECT_TYPES,
  MANAGEMENT_ORG_READ_SCOPE,
  ORDER_ALLOCATION_GOODS_KIND,
  ORDER_ALLOCATION_SOURCE,
  PRODUCTION_ISSUE_SOURCE,
  PURCHASE_REQUEST_REORDER_POLICY,
  PURCHASE_REQUEST_SOURCE,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_REQUEST_STOCK_AUTHORITY,
  hasExplicitScope,
  type PurchaseRequest,
  type PurchaseRequestStatus,
} from '@isalwa/os-contracts';
import { readOrderDateRisk, type DateReadDb } from '../../os-read-dates/src/index';
import type { ProductionDateIssueFact } from '../../os-read-dates/src/rows';
import {
  readFinishedGoodsReceipts,
  readOrderAllocations,
  readProductionFacts,
  readPurchaseRequests,
  type OrderAllocationFact,
  type PurchaseRequestFact,
} from '../../os-read-ops/src/index';
import type { OperatingReadDb } from '../../os-read-ops/src/db-port';
import type { TrustedOperatingSession } from '../../os-read-ops/src/capability';
import type { ReadResult as OpsReadResult } from '../../os-read-ops/src/source-state';
import type { FulfillmentReadDbPort } from '../../os-read-fulfillment/src/db-port';
import {
  FulfillmentReadService,
  type ChronologyErrorRead,
  type DeliveryListRead,
  type DeliveryRead,
  type ReleaseRead,
  type WarehouseExitRead,
} from '../../os-read-fulfillment/src/readers';
import type { ReadResult as FulfillmentReadResult } from '../../os-read-fulfillment/src/source-state';
import { blank } from './copy';
import { getCoordinationExceptions } from './project';
import type {
  AllocationSourceFact,
  CoordinationExceptionsResult,
  CoordinationInjectedSources,
  CoordinationTrustedContext,
  DateRiskSourceFact,
  DeliverySourceFact,
  InjectedSource,
  ProductionSourceFact,
  PurchaseSourceFact,
  ReleaseSourceFact,
  WarehouseExitSourceFact,
} from './types';

export type CoordinationDateReader = {
  db: DateReadDb;
  /** Orders already known to the caller. An empty list is not "no issues". */
  orderIds: readonly string[];
};

export type CoordinationCanonicalReaders = {
  dates?: CoordinationDateReader | null;
  /** Present means the operating readers are asked. A null db is not an empty store. */
  operating?: { db: OperatingReadDb | null } | null;
  fulfillment?: { db: FulfillmentReadDbPort } | null;
};

const SUBJECT_TYPES = new Set<string>(CUSTOMER_DATE_SUBJECT_TYPES);
const PURCHASE_STATUSES = new Set<string>(PURCHASE_REQUEST_STATUSES);

function scopesOf(context: CoordinationTrustedContext): readonly string[] {
  return (context.grantedScopes ?? []).filter((scope): scope is string => typeof scope === 'string');
}

function boardAuthorized(
  context: CoordinationTrustedContext,
): context is CoordinationTrustedContext & { organizationId: string } {
  return blank(context.organizationId) != null && hasExplicitScope(scopesOf(context), MANAGEMENT_ORG_READ_SCOPE);
}

function operatingSession(context: CoordinationTrustedContext, organizationId: string): TrustedOperatingSession {
  return {
    organizationId,
    grantedScopes: scopesOf(context),
    accessStatus: context.accessStatus ?? undefined,
    cargo: context.cargo,
    title: context.title,
  };
}

function opsInjected<T, U>(
  result: OpsReadResult<T>,
  mapFacts: (facts: readonly T[]) => readonly U[],
): InjectedSource<U> {
  if (result.state === 'UNPROVEN') {
    return { status: 'UNPROVEN', reason: result.reason || result.reasonCode };
  }
  if (result.state === 'ERROR') {
    return { status: 'ERROR', reason: result.reason };
  }
  if (result.state === 'NO_FACT' || result.facts.length === 0) {
    return { status: 'NO_FACT' };
  }
  return { status: 'AVAILABLE', facts: mapFacts(result.facts) };
}

function fulfillmentInjected<T, U>(
  result: FulfillmentReadResult<T> | ChronologyErrorRead | DeliveryListRead,
  mapRows: (rows: readonly T[]) => readonly U[],
): InjectedSource<U> {
  if (result.sourceState === 'UNPROVEN') {
    return { status: 'UNPROVEN', reason: result.code };
  }
  if (result.sourceState === 'ERROR') {
    return { status: 'ERROR', reason: result.code };
  }
  if (result.sourceState === 'NO_FACT') {
    return { status: 'NO_FACT' };
  }
  const rows = 'rows' in result ? result.rows : [];
  if (rows.length === 0) return { status: 'NO_FACT' };
  return { status: 'AVAILABLE', facts: mapRows(rows as readonly T[]) };
}

function toDateRiskFact(fact: ProductionDateIssueFact): DateRiskSourceFact {
  if (
    fact.source === PRODUCTION_ISSUE_SOURCE &&
    SUBJECT_TYPES.has(fact.subjectType) &&
    blank(fact.id) &&
    blank(fact.organizationId)
  ) {
    return {
      id: fact.id,
      organizationId: fact.organizationId,
      subjectType: fact.subjectType,
      subjectId: fact.subjectId,
      mayAffectProductionCalendar: fact.mayAffectProductionCalendar === true,
      mayAffectCustomerDate: fact.mayAffectCustomerDate === true,
      source: PRODUCTION_ISSUE_SOURCE,
      note: fact.note,
      recordedByMemberId: fact.recordedByMemberId,
      recordedAt: fact.recordedAt,
    };
  }
  return {
    id: fact.id,
    organizationId: fact.organizationId,
    explicitCustomerDateRisk: false,
  };
}

/**
 * Risk is only an explicit ProductionDateIssue from the date reader.
 * Authorized absence is NO_FACT. Date comparison is not called.
 */
async function readDateRiskSource(
  context: CoordinationTrustedContext,
  organizationId: string,
  dates: CoordinationDateReader,
): Promise<InjectedSource<DateRiskSourceFact>> {
  const orderIds = [...new Set(dates.orderIds.map((id) => id.trim()).filter(Boolean))];
  if (orderIds.length === 0) {
    return { status: 'UNPROVEN', reason: 'unqueried' };
  }

  const facts: DateRiskSourceFact[] = [];
  let sawIssue = false;
  for (const orderId of orderIds) {
    const result = await readOrderDateRisk(
      dates.db,
      { organizationId, grantedScopes: scopesOf(context) },
      orderId,
    );
    if (result.coverage === 'UNPROVEN') {
      return { status: 'UNPROVEN', reason: result.denial };
    }
    if (result.coverage === 'ERROR') {
      return { status: 'ERROR', reason: 'query_failed' };
    }
    if (result.coverage === 'NO_FACT') continue;
    sawIssue = true;
    for (const issue of result.fact) facts.push(toDateRiskFact(issue));
  }
  if (!sawIssue) return { status: 'NO_FACT' };
  return { status: 'AVAILABLE', facts };
}

function toPurchase(fact: PurchaseRequestFact): PurchaseSourceFact {
  const status = fact.status.statusKey;
  if (!status || !PURCHASE_STATUSES.has(status)) {
    return { id: fact.id, organizationId: fact.organizationId, pending: false };
  }
  const request: PurchaseRequest = {
    id: fact.id,
    organizationId: fact.organizationId,
    requestingArea: fact.requestingArea,
    requestedByLabel: fact.requestedByLabel,
    requestedByMemberId: fact.requestedByMemberId,
    description: fact.description,
    quantity: fact.requestedQuantity,
    unit: fact.unit,
    productionContextId: fact.productionContextId,
    orderId: fact.orderId,
    reason: fact.reason,
    requestedAt: fact.requestedAt,
    status: status as PurchaseRequestStatus,
    buyerLabel: fact.buyerLabel,
    buyerMemberId: fact.buyerMemberId,
    notes: [],
    statusHistory: [],
    actorLabel: fact.requestedByLabel,
    actorMemberId: fact.requestedByMemberId,
    source: PURCHASE_REQUEST_SOURCE,
    stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
    reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
    claimsOfficialStock: false,
    triggersReorder: false,
    idempotencyKey: null,
    createdAt: fact.requestedAt,
    updatedAt: fact.updatedAt,
  };
  return request;
}

function toProduction(
  facts: readonly {
    quemas: { id: string; organizationId: string; recordedAt: string }[];
    times: { id: string; organizationId: string; recordedAt: string }[];
    products: { id: string; organizationId: string; recordedAt: string }[];
    traces: { id: string; organizationId: string; recordedAt: string }[];
  }[],
): ProductionSourceFact[] {
  const citations: ProductionSourceFact[] = [];
  for (const bundle of facts) {
    const rows = [...bundle.quemas, ...bundle.times, ...bundle.products, ...bundle.traces];
    for (const row of rows) {
      citations.push({
        id: row.id,
        organizationId: row.organizationId,
        explicitCalendarIssue: false,
        recordedAt: row.recordedAt,
      });
    }
  }
  return citations;
}

function toAllocation(fact: OrderAllocationFact): AllocationSourceFact {
  if (fact.goodsKind === ORDER_ALLOCATION_GOODS_KIND && fact.source === ORDER_ALLOCATION_SOURCE) {
    return {
      id: fact.id,
      organizationId: fact.organizationId,
      finishedProductId: fact.productId,
      productId: fact.productId,
      goodsKind: ORDER_ALLOCATION_GOODS_KIND,
      quantity: fact.quantity,
      orderLineId: fact.orderLineId,
      allocatedAt: fact.allocatedAt,
      recordedAt: fact.recordedAt,
      actorMemberId: fact.actorMemberId,
      actorLabel: fact.actorLabel,
      source: ORDER_ALLOCATION_SOURCE,
      finishedGoodsReceiptId: fact.finishedGoodsReceiptId,
      idempotencyKey: null,
      createdByReceipt: false,
      officialStock: false,
      wholeOrderFulfilled: false,
      isPartialDeliveryWorkflow: false,
    };
  }
  return {
    id: fact.id,
    organizationId: fact.organizationId,
    awaitsWarehouseExit: false,
    explicit: false,
  };
}

function toWarehouseExit(row: WarehouseExitRead): WarehouseExitSourceFact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: row.orderId,
    exitedAt: row.exitedAt,
  };
}

function toDelivery(row: DeliveryRead): DeliverySourceFact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: row.orderId,
    deliveredAt: row.deliveredAt,
  };
}

function toRelease(row: ReleaseRead): ReleaseSourceFact {
  if (row.state === 'held' && row.reversal == null && blank(row.id) && blank(row.organizationId)) {
    return {
      id: row.id,
      organizationId: row.organizationId,
      orderId: blank(row.orderId),
      reason: row.reason,
      explicit: true,
      recordedAt: blank(row.recordedAt),
    };
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    explicit: false,
  };
}

async function readOperatingSources(
  context: CoordinationTrustedContext,
  organizationId: string,
  db: OperatingReadDb | null,
): Promise<Pick<CoordinationInjectedSources, 'purchase' | 'production' | 'allocation' | 'finishedGoods'>> {
  const session = operatingSession(context, organizationId);
  const [purchase, production, allocation, finishedGoods] = await Promise.all([
    readPurchaseRequests({ session, db }),
    readProductionFacts({ session, db }),
    readOrderAllocations({ session, db }),
    readFinishedGoodsReceipts({ session, db }),
  ]);

  return {
    purchase: opsInjected(purchase, (facts) => facts.map(toPurchase)),
    production: opsInjected(production, toProduction),
    allocation: opsInjected(allocation, (facts) => facts.map(toAllocation)),
    finishedGoods:
      finishedGoods.state === 'UNPROVEN'
        ? { status: 'UNPROVEN', reason: finishedGoods.reason || finishedGoods.reasonCode }
        : { status: 'UNPROVEN', reason: 'missing_model' },
  };
}

async function readFulfillmentSources(
  context: CoordinationTrustedContext,
  organizationId: string,
  db: FulfillmentReadDbPort,
): Promise<Pick<CoordinationInjectedSources, 'warehouseExit' | 'delivery' | 'release'>> {
  const service = new FulfillmentReadService(db);
  const ctx = {
    organizationId,
    actorMemberId: blank(context.actorMemberId) ?? '',
    grantedScopes: scopesOf(context),
  };
  const [warehouseExit, delivery, release] = await Promise.all([
    service.readWarehouseExits(ctx),
    service.readDeliveries(ctx),
    service.readOperationalReleases(ctx),
  ]);
  return {
    warehouseExit: fulfillmentInjected(warehouseExit, (rows) => rows.map(toWarehouseExit)),
    delivery: fulfillmentInjected(delivery, (rows) => rows.map(toDelivery)),
    release: fulfillmentInjected(release, (rows) => rows.map(toRelease)),
  };
}

/**
 * Compose the company board from canonical readers.
 * Does not write. Does not invent a coordination read capability.
 * Does not claim the Tuesday meeting is unnecessary.
 */
export async function getCoordinationExceptionsFromReaders(
  trustedContext: CoordinationTrustedContext,
  readers: CoordinationCanonicalReaders | null = null,
): Promise<CoordinationExceptionsResult> {
  if (!boardAuthorized(trustedContext)) {
    return getCoordinationExceptions({
      ...trustedContext,
      sources: null,
    });
  }

  const organizationId = blank(trustedContext.organizationId);
  if (!organizationId) {
    return getCoordinationExceptions({ ...trustedContext, sources: null });
  }

  const sources: CoordinationInjectedSources = {};
  const ports = readers ?? {};

  if (ports.dates) {
    sources.dateRisk = await readDateRiskSource(trustedContext, organizationId, ports.dates);
  }
  if (ports.operating) {
    Object.assign(sources, await readOperatingSources(trustedContext, organizationId, ports.operating.db));
  }
  if (ports.fulfillment) {
    Object.assign(sources, await readFulfillmentSources(trustedContext, organizationId, ports.fulfillment.db));
  }

  return getCoordinationExceptions({
    ...trustedContext,
    sources,
  });
}
