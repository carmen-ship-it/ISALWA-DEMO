/**
 * Maps os-read-dates, os-read-ops, and os-read-fulfillment into pedido sections.
 * States stay separate. A missing model, an incomplete queue, and a scope that
 * does not unlock a company store are UNPROVEN — not zero, not "nothing listo",
 * and not a denied header.
 * This module does not mutate, allocate, or attach a production run to an order.
 */

import {
  readOrderCustomerCommittedDate,
  readOrderCustomerInformedState,
  readOrderDateRisk,
  readOrderProductionInternalTargetDate,
  type CoveredFact,
  type CustomerCommittedDateFact,
  type CustomerDateInformedFact,
  type DateDelayRead,
  type DateReadDb,
  type ProductionDateIssueFact,
  type ProductionInternalTargetDateFact,
} from '@isalwa/os-read-dates';
import {
  COMPANY_OPERATING_READ_SCOPE,
  holdsExactScope,
  readFinishedGoodsReceipts,
  readOrderAllocations,
  readProductionFacts,
  readPurchaseRequests,
  type OperatingReadDb,
  type OrderAllocationFact,
  type ProductionFacts,
  type PurchaseRequestFact,
  type ReadResult,
  type TrustedOperatingSession,
  type UnprovenRead,
} from '@isalwa/os-read-ops';
import {
  FulfillmentReadService,
  holdsCommercialWorkRead,
  holdsCompanyRead,
  type DeliveryRead,
  type ReadResult as FulfillmentReadResult,
  type ReleaseRead,
  type WarehouseExitRead,
  type WorkNextActionValue,
} from '@isalwa/os-read-fulfillment';
import type { PedidoTrustedContext } from './authorize';
import type {
  DateFact,
  InjectedSection,
  PedidoSectionReaders,
  ProductionFact,
} from './readers';

export type PedidoLiveReaders = {
  dates?: DateReadDb;
  /** Null is a missing port. The ops reader then stays UNPROVEN, not an empty store. */
  ops?: OperatingReadDb | null;
  fulfillment?: FulfillmentReadService;
  /**
   * Company operating readers require an active session.
   * Omitted means this already-authorized pedido session is active.
   * An explicit non-active value keeps company stores UNPROVEN, not zero.
   */
  accessStatus?: string;
};

export type AdaptPedidoReadersInput = {
  trustedContext: PedidoTrustedContext;
  orderId: string;
  /** Caller-supplied line links. Allocation is not queried by order id. */
  orderLineIds?: readonly string[];
  live: PedidoLiveReaders;
};

const DATE_NO_FACT = 'Sin fecha con el cliente';
const TARGET_NO_FACT = 'Sin fecha interna de producción';
const RISK_NO_FACT = 'No hay un riesgo registrado.';
const INFORMED_NO_FACT = 'Sin aviso registrado';
const PURCHASE_NO_FACT = 'No hay compra registrada para este pedido.';
const ALLOCATION_NO_FACT = 'No hay asignación registrada para esta línea.';
const EXIT_NO_FACT = 'Sin salida de almacén registrada.';
const DELIVERY_NO_FACT = 'Sin entrega registrada.';
const RELEASE_NO_FACT = 'Sin liberación registrada.';
const NEXT_NO_FACT = 'No hay un siguiente paso con fecha.';

export function adaptPedidoSectionReaders(input: AdaptPedidoReadersInput): PedidoSectionReaders {
  const session = operatingSession(input.trustedContext, input.live.accessStatus);
  const orderId = input.orderId.trim();
  const readers: PedidoSectionReaders = {};

  if (input.live.dates) {
    const db = input.live.dates;
    const dateCtx = {
      organizationId: session.organizationId,
      grantedScopes: session.grantedScopes,
    };
    readers.customerCommittedDate = async () =>
      mapCustomerDate(await readOrderCustomerCommittedDate(db, dateCtx, orderId), null);
    readers.productionInternalTargetDate = async () =>
      mapProductionTarget(await readOrderProductionInternalTargetDate(db, dateCtx, orderId));
    readers.risk = async () => mapDateRisk(await readOrderDateRisk(db, dateCtx, orderId));
    readers.customerInformed = async () =>
      mapCustomerInformed(await readOrderCustomerInformedState(db, dateCtx, orderId));
  }

  if (input.live.ops !== undefined) {
    const db = input.live.ops;
    readers.purchasing = async () => mapPurchase(await readPurchaseRequests({ session, db }), orderId, session);
    readers.finishedGoods = async () => mapFinishedGoods(await readFinishedGoodsReceipts({ session, db }));
    readers.allocation = async () =>
      mapAllocation(
        session,
        db,
        input.orderLineIds,
      );
    readers.production = async (lookup) =>
      adaptProductionRead({
        session,
        db,
        productIds: lookup.productIds,
      });
  }

  if (input.live.fulfillment) {
    const service = input.live.fulfillment;
    const ctx = {
      organizationId: session.organizationId,
      actorMemberId: input.trustedContext.actorMemberId,
      grantedScopes: session.grantedScopes,
    };
    readers.warehouseExit = async () => mapWarehouse(await guardedCompanyRead(
      session,
      () => service.readWarehouseExits(ctx, { orderId }),
    ));
    readers.delivery = async () => mapDelivery(await guardedCompanyRead(
      session,
      () => service.readDeliveries(ctx, { orderId }),
    ));
    readers.release = async () => mapRelease(await guardedCompanyRead(
      session,
      () => service.readOperationalReleases(ctx, { orderId }),
    ));
    readers.nextAction = async () => mapNextAction(await readNextAction(service, session, ctx));
  }

  return readers;
}

/**
 * Production is not a child of the pedido. An order id is not a query key.
 * Passing only an order id does not call the reader and does not return an empty run list.
 */
export async function adaptProductionRead(input: {
  session: TrustedOperatingSession;
  db: OperatingReadDb | null;
  productIds?: readonly string[];
  /** Rejected as a lookup key. Never forwarded to the production reader. */
  orderId?: string;
}): Promise<InjectedSection<ProductionFact>> {
  void input.orderId;
  const links = uniqueLinks(input.productIds);
  if (links.length === 0) {
    return unproven('production_not_order_keyed');
  }
  if (!holdsCompanyOperatingRead(input.session)) {
    const denied = await readProductionFacts({
      session: input.session,
      db: input.db,
      productId: links[0],
    });
    return mapDeniedCompanyRead(denied, 'production_not_order_keyed');
  }

  let sawNoFact = false;
  let unprovenReason = 'production_not_order_keyed';
  for (const productId of links) {
    const result = await readProductionFacts({
      session: input.session,
      db: input.db,
      productId,
    });
    if (result.state === 'ERROR') return error(result.reason);
    if (result.state === 'UNPROVEN') {
      unprovenReason = result.reasonCode;
      continue;
    }
    if (result.state === 'NO_FACT') {
      sawNoFact = true;
      continue;
    }
    const linked = productionFactFrom(result.facts, productId);
    if (linked) {
      return {
        state: 'AVAILABLE',
        fact: linked,
        displayCopy: 'Registro de producción del producto.',
      };
    }
    sawNoFact = true;
  }
  if (sawNoFact && unprovenReason === 'production_not_order_keyed') {
    return noFact('no_product_linked_production', 'Sin producción ligada a un producto.');
  }
  if (!sawNoFact) return unproven(unprovenReason);
  return unproven(unprovenReason);
}

/**
 * Date sections may be AVAILABLE while delay and risk stay NO_FACT.
 * Delay is accepted so a caller cannot fold it into risk. It is not a section
 * and it is not compared to either date.
 */
export function mapPedidoDateReads(input: {
  customerCommittedDate: CoveredFact<CustomerCommittedDateFact>;
  productionInternalTargetDate: CoveredFact<ProductionInternalTargetDateFact>;
  risk: CoveredFact<ProductionDateIssueFact[]>;
  delay: DateDelayRead;
}): {
  customerCommittedDate: InjectedSection<DateFact>;
  productionInternalTargetDate: InjectedSection<DateFact>;
  risk: InjectedSection<{ issues: ProductionDateIssueFact[] }>;
} {
  return {
    customerCommittedDate: mapCustomerDate(input.customerCommittedDate, input.delay),
    productionInternalTargetDate: mapProductionTarget(input.productionInternalTargetDate),
    risk: mapDateRisk(input.risk),
  };
}

function mapCustomerDate(
  result: CoveredFact<CustomerCommittedDateFact>,
  delay: DateDelayRead | null,
): InjectedSection<DateFact> {
  acknowledgeDelay(delay);
  return mapCalendarDate(result, (fact) => fact.committedOn, DATE_NO_FACT);
}

function mapProductionTarget(
  result: CoveredFact<ProductionInternalTargetDateFact>,
): InjectedSection<DateFact> {
  return mapCalendarDate(result, (fact) => fact.targetOn, TARGET_NO_FACT);
}

function mapCalendarDate<T>(
  result: CoveredFact<T>,
  pick: (fact: T) => string,
  missingCopy: string,
): InjectedSection<DateFact> {
  if (result.coverage === 'UNPROVEN') return unproven(result.denial);
  if (result.coverage === 'ERROR') return error('reader_failed');
  if (result.coverage !== 'AVAILABLE') return noFact('no_stored_date', missingCopy);
  const date = pick(result.fact);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return noFact('missing_date', missingCopy);
  return { state: 'AVAILABLE', fact: { date }, displayCopy: date };
}

function mapDateRisk(
  result: CoveredFact<ProductionDateIssueFact[]>,
): InjectedSection<{ issues: ProductionDateIssueFact[] }> {
  if (result.coverage === 'UNPROVEN') return unproven(result.denial);
  if (result.coverage === 'ERROR') return error('reader_failed');
  if (result.coverage !== 'AVAILABLE' || result.fact.length === 0) {
    return noFact('no_recorded_date_issue', RISK_NO_FACT);
  }
  return {
    state: 'AVAILABLE',
    fact: { issues: result.fact },
    displayCopy: 'Riesgo registrado.',
  };
}

function mapCustomerInformed(
  result: CoveredFact<CustomerDateInformedFact[]>,
): InjectedSection<{ records: CustomerDateInformedFact[] }> {
  if (result.coverage === 'UNPROVEN') return unproven(result.denial);
  if (result.coverage === 'ERROR') return error('reader_failed');
  if (result.coverage !== 'AVAILABLE' || result.fact.length === 0) {
    return noFact('no_recorded_notice', INFORMED_NO_FACT);
  }
  return {
    state: 'AVAILABLE',
    fact: { records: result.fact },
    displayCopy: 'Aviso registrado.',
  };
}

function acknowledgeDelay(delay: DateDelayRead | null): void {
  if (!delay) return;
  if (delay.coverage === 'NO_FACT' || delay.coverage === 'UNPROVEN' || delay.coverage === 'ERROR') {
    return;
  }
}

async function mapPurchase(
  result: ReadResult<PurchaseRequestFact>,
  orderId: string,
  session: TrustedOperatingSession,
): Promise<InjectedSection<{ requests: PedidoPurchaseView[] }>> {
  if (!holdsCompanyOperatingRead(session)) {
    return mapDeniedCompanyRead(result, 'company_store_not_unlocked');
  }
  if (result.state === 'UNPROVEN') return unproven(result.reasonCode);
  if (result.state === 'ERROR') return error(result.reason);
  if (result.state === 'NO_FACT') return noFact('no_purchase_for_order', PURCHASE_NO_FACT);
  const requests = result.facts
    .filter((fact) => fact.orderId === orderId)
    .map(purchaseView);
  if (requests.length === 0) return noFact('no_purchase_for_order', PURCHASE_NO_FACT);
  const label = requests.find((item) => item.statusLabel)?.statusLabel ?? 'Compra registrada.';
  return {
    state: 'AVAILABLE',
    fact: { requests },
    displayCopy: label,
  };
}

async function mapAllocation(
  session: TrustedOperatingSession,
  db: OperatingReadDb | null,
  orderLineIds: readonly string[] | undefined,
): Promise<InjectedSection<{ allocations: PedidoAllocationView[] }>> {
  const links = uniqueLinks(orderLineIds);
  if (!holdsCompanyOperatingRead(session)) {
    const denied = await readOrderAllocations({ session, db });
    return mapDeniedCompanyRead(denied, 'company_store_not_unlocked');
  }
  if (links.length === 0) return unproven('allocation_not_order_keyed');
  if (!db) {
    const missing = await readOrderAllocations({ session, db: null });
    return mapDeniedCompanyRead(missing, 'NO_LIVE_READER');
  }

  const views: PedidoAllocationView[] = [];
  let sawNoFact = false;
  for (const orderLineId of links) {
    const result = await readOrderAllocations({ session, db, orderLineId });
    if (result.state === 'UNPROVEN') return unproven(result.reasonCode);
    if (result.state === 'ERROR') return error(result.reason);
    if (result.state === 'NO_FACT') {
      sawNoFact = true;
      continue;
    }
    views.push(...result.facts.filter((fact) => fact.orderLineId === orderLineId).map(allocationView));
  }
  if (views.length === 0) return noFact('no_allocation_for_line', ALLOCATION_NO_FACT);
  return {
    state: 'AVAILABLE',
    fact: { allocations: views },
    displayCopy: 'Asignación registrada.',
  };
}

function mapFinishedGoods(result: UnprovenRead): InjectedSection<never> {
  if (result.reasonCode === 'NO_LIVE_READER' || result.reason === 'missing_model') {
    return unproven('missing_model');
  }
  return unproven(result.reasonCode || result.reason || 'reader_not_connected');
}

function mapDeniedCompanyRead<T>(
  result: ReadResult<T>,
  fallback: string,
): InjectedSection<never> {
  if (result.state === 'ERROR') return error(result.reason);
  if (result.state === 'UNPROVEN') return unproven(result.reasonCode);
  return unproven(fallback);
}

type PedidoPurchaseView = {
  id: string;
  description: string;
  statusLabel: string | null;
  statusKey: string | null;
  requestedQuantity: string | null;
  unit: string | null;
  isStockTruth: false;
  stockQuantity: null;
};

function purchaseView(fact: PurchaseRequestFact): PedidoPurchaseView {
  return {
    id: fact.id,
    description: fact.description,
    statusLabel: fact.status.label,
    statusKey: fact.status.statusKey,
    requestedQuantity: fact.requestedQuantity,
    unit: fact.unit,
    isStockTruth: false,
    stockQuantity: null,
  };
}

type PedidoAllocationView = {
  id: string;
  productId: string;
  orderLineId: string;
  quantity: string;
  remainingQuantity: null;
  onHandStock: null;
};

function allocationView(fact: OrderAllocationFact): PedidoAllocationView {
  return {
    id: fact.id,
    productId: fact.productId,
    orderLineId: fact.orderLineId,
    quantity: fact.quantity,
    remainingQuantity: null,
    onHandStock: null,
  };
}

function productionFactFrom(facts: ProductionFacts[], productId: string): ProductionFact | null {
  const bundle = facts.find((item) => item.filteredByProductId === productId) ?? facts[0];
  if (!bundle) return null;
  const linked = bundle.products.some((item) => item.productId === productId)
    || bundle.quemas.some((item) => item.productIds.includes(productId))
    || bundle.traces.some((item) => item.productId === productId);
  if (!linked) return null;
  return {
    productId,
    orderOwnsProduction: false,
  };
}

async function guardedCompanyRead<T>(
  session: TrustedOperatingSession,
  read: () => Promise<T>,
): Promise<T | InjectedSection<never>> {
  if (!holdsCompanyRead(session.grantedScopes)) return unproven('company_store_not_unlocked');
  return read();
}

async function readNextAction(
  service: FulfillmentReadService,
  session: TrustedOperatingSession,
  ctx: { organizationId: string; actorMemberId: string; grantedScopes: readonly string[] },
): Promise<FulfillmentReadResult<WorkNextActionValue> | InjectedSection<never>> {
  if (!holdsCompanyRead(session.grantedScopes) && !holdsCommercialWorkRead(session.grantedScopes)) {
    return unproven('company_store_not_unlocked');
  }
  return service.readWorkNextAction(ctx, {});
}

async function mapWarehouse(
  result: Awaited<ReturnType<FulfillmentReadService['readWarehouseExits']>> | InjectedSection<never>,
): Promise<InjectedSection<{ exits: Array<{ id: string; exitedAt: string; source: string; notes: string | null }> }>> {
  if (isInjected(result)) return result;
  if (result.sourceState === 'UNPROVEN') return unproven(result.code);
  if (result.sourceState === 'ERROR') {
    if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') return unproven(result.code);
    return error(result.code);
  }
  if (result.sourceState === 'NO_FACT') return noFact('no_recorded_exit', EXIT_NO_FACT);
  const exits = result.rows.map((row: WarehouseExitRead) => ({
    id: row.id,
    exitedAt: row.exitedAt,
    source: row.source,
    notes: row.notes,
  }));
  if (exits.length === 0) return noFact('no_recorded_exit', EXIT_NO_FACT);
  return { state: 'AVAILABLE', fact: { exits }, displayCopy: 'Salida de almacén registrada.' };
}

async function mapDelivery(
  result: Awaited<ReturnType<FulfillmentReadService['readDeliveries']>> | InjectedSection<never>,
): Promise<InjectedSection<{ deliveries: Array<{ id: string; deliveredAt: string; deliveredTo: string | null }> }>> {
  if (isInjected(result)) return result;
  if (result.sourceState === 'UNPROVEN') return unproven(result.code);
  if (result.sourceState === 'ERROR') {
    if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') return unproven(result.code);
    return error(result.code);
  }
  if (result.sourceState === 'NO_FACT') return noFact('no_recorded_delivery', DELIVERY_NO_FACT);
  const rows = 'rows' in result ? result.rows : [];
  const deliveries = rows.map((row: DeliveryRead) => ({
    id: row.id,
    deliveredAt: row.deliveredAt,
    deliveredTo: row.deliveredTo,
  }));
  if (deliveries.length === 0) return noFact('no_recorded_delivery', DELIVERY_NO_FACT);
  return { state: 'AVAILABLE', fact: { deliveries }, displayCopy: 'Entrega registrada.' };
}

async function mapRelease(
  result: Awaited<ReturnType<FulfillmentReadService['readOperationalReleases']>> | InjectedSection<never>,
): Promise<InjectedSection<{ decisions: Array<{ id: string; state: string; reason: string; timestamp: string }> }>> {
  if (isInjected(result)) return result;
  if (result.sourceState === 'UNPROVEN') return unproven(result.code);
  if (result.sourceState === 'ERROR') {
    if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') return unproven(result.code);
    return error(result.code);
  }
  if (result.sourceState === 'NO_FACT') return noFact('no_recorded_release', RELEASE_NO_FACT);
  const decisions = result.rows.map((row: ReleaseRead) => ({
    id: row.id,
    state: row.state,
    reason: row.reason,
    timestamp: row.timestamp,
  }));
  if (decisions.length === 0) return noFact('no_recorded_release', RELEASE_NO_FACT);
  return { state: 'AVAILABLE', fact: { decisions }, displayCopy: 'Liberación registrada.' };
}

async function mapNextAction(
  result: FulfillmentReadResult<WorkNextActionValue> | InjectedSection<never>,
): Promise<InjectedSection<{
  workItemId: string;
  title: string | null;
  queueCoverage: WorkNextActionValue['queueCoverage'];
  coverageComplete: false | true;
}>> {
  if (isInjected(result)) return result;
  if (result.sourceState === 'UNPROVEN') return unproven(result.code);
  if (result.sourceState === 'ERROR') {
    if (result.code === 'PERMISSION_DENIED' || result.code === 'AUTH_REQUIRED') return unproven(result.code);
    return error(result.code);
  }
  if (result.sourceState === 'NO_FACT') return unproven('queue_coverage_incomplete');
  const value = result.rows[0];
  if (!value) return unproven('queue_coverage_incomplete');
  const next = value.nextAction;
  if (value.queueCoverage === 'UNPROVEN' && next.sourceState !== 'AVAILABLE') {
    return unproven('COMMERCIAL_SUBJECT_COVERAGE_INCOMPLETE');
  }
  if (next.sourceState === 'AVAILABLE') {
    const work = value.openWork.find((item) => item.id === next.workItemId);
    return {
      state: 'AVAILABLE',
      displayCopy: work?.title || 'Siguiente paso registrado.',
      fact: {
        workItemId: next.workItemId,
        title: work?.title ?? null,
        queueCoverage: value.queueCoverage,
        coverageComplete: value.queueCoverage === 'COMPLETE',
      },
    };
  }
  if (value.queueCoverage === 'COMPLETE' && value.nextAction.sourceState === 'NO_FACT') {
    return noFact('no_dated_open_work', NEXT_NO_FACT);
  }
  return unproven('COMMERCIAL_SUBJECT_COVERAGE_INCOMPLETE');
}

function holdsCompanyOperatingRead(session: TrustedOperatingSession): boolean {
  return session.accessStatus === 'active' && holdsExactScope(session.grantedScopes, COMPANY_OPERATING_READ_SCOPE);
}

function operatingSession(
  trustedContext: PedidoTrustedContext,
  accessStatus: string | undefined,
): TrustedOperatingSession {
  return {
    organizationId: trustedContext.organizationId.trim(),
    grantedScopes: trustedContext.grantedScopes,
    accessStatus: accessStatus ?? 'active',
    cargo: trustedContext.cargo ?? null,
    title: trustedContext.title ?? null,
  };
}

function uniqueLinks(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const links: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    links.push(trimmed);
  }
  return links;
}

function unproven(reason: string): InjectedSection<never> {
  return { state: 'UNPROVEN', reason };
}

function noFact(reason: string, displayCopy: string): InjectedSection<never> {
  return { state: 'NO_FACT', reason, displayCopy };
}

function error(reason: string): InjectedSection<never> {
  return { state: 'ERROR', reason };
}

function isInjected(value: object): value is InjectedSection<never> {
  return 'state' in value && (value as { state?: string }).state !== undefined && !('sourceState' in value);
}
