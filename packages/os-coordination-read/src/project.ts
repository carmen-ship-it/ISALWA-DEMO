import {
  COORDINATION_DECISION_CAPABILITY,
  MANAGEMENT_ORG_READ_SCOPE,
  PRODUCTION_ISSUE_SOURCE,
  hasCoordinationDecisionCapability,
  hasExplicitScope,
  parseQuantity,
  projectFinishedGoodsAvailability,
  purchaseRequestClaimsOfficialStock,
  type CoordinationDecisionRecord,
  type FinishedGoodsReceiptQuantity,
  type OperationalReleaseDecision,
  type OperationalReleaseReversal,
  type OrderAllocation,
  type ProductionIssue,
  type PurchaseRequest,
} from '@isalwa/os-contracts';
import {
  COORDINATION_COMPLETE_EMPTY_COPY,
  COORDINATION_EXCEPTION_KINDS,
  COORDINATION_INCOMPLETE_EMPTY_COPY,
  CROSS_LANE_CHANGE_REQUEST,
  MEETING_REPLACEMENT,
  REQUIRED_SOURCE_CATEGORIES,
  blank,
  isPastDue,
  type CoordinationExceptionKind,
  type CoordinationSourceCategory,
} from './copy';
import {
  coverageComplete,
  resolvePriorDecisionsSource,
  resolveSourceProof,
  sameTenantRows,
  sourceInput,
  withActionableCount,
} from './coverage';
import type {
  AllocationAwaitingExitFact,
  AllocationSourceFact,
  CoordinationException,
  CoordinationExceptionsResult,
  CoordinationInjectedSources,
  CoordinationTrustedContext,
  CustomerInformedSourceFact,
  CustomerNotInformedFact,
  ExplicitReleaseExceptionFact,
  ReleaseSourceFact,
  SourceProof,
  WarehouseExitAwaitingDeliveryFact,
  WarehouseExitSourceFact,
} from './types';

const PENDING_PURCHASE = new Set(['solicitado', 'cotizandose', 'pedido_preparandose']);

const KIND_ORDER = new Map<CoordinationExceptionKind, number>(
  COORDINATION_EXCEPTION_KINDS.map((kind, index) => [kind, index]),
);

function baseException(
  id: string,
  organizationId: string,
  kind: CoordinationExceptionKind,
  subjectId: string | null,
  summary: string,
  recordedAt: string | null,
): CoordinationException {
  return {
    id,
    organizationId,
    kind,
    subjectId,
    summary,
    recordedAt,
    priority: null,
    ownerMemberId: null,
    recordedOwnerLabel: null,
    stock: null,
    revenue: null,
    margin: null,
    officialStock: false,
    predictsDelay: false,
    availableQuantity: null,
  };
}

function orgOfIssue(row: ProductionIssue): string | null {
  return blank(row.organizationId);
}

function issueFacts(
  facts: readonly ProductionIssue[],
  organizationId: string,
  flag: 'mayAffectCustomerDate' | 'mayAffectProductionCalendar',
  kind: CoordinationExceptionKind,
  prefix: string,
  summaryWhenBlank: string,
): CoordinationException[] {
  return sameTenantRows(facts, organizationId, orgOfIssue)
    .filter(
      (row) =>
        row.source === PRODUCTION_ISSUE_SOURCE &&
        blank(row.id) != null &&
        row[flag] === true,
    )
    .map((row) =>
      baseException(
        `${prefix}:${row.id}`,
        organizationId,
        kind,
        blank(row.subjectId),
        blank(row.note) ?? summaryWhenBlank,
        blank(row.recordedAt),
      ),
    );
}

function purchaseFacts(facts: readonly PurchaseRequest[], organizationId: string): CoordinationException[] {
  return facts
    .filter(
      (row) =>
        blank(row.organizationId) === organizationId &&
        blank(row.id) != null &&
        PENDING_PURCHASE.has(row.status) &&
        purchaseRequestClaimsOfficialStock(row) === false,
    )
    .map((row) => {
      const description = blank(row.description) ?? blank(row.reason) ?? 'Compra pendiente.';
      return baseException(
        `purchase:${row.id}`,
        organizationId,
        'purchase_pending',
        blank(row.orderId),
        description,
        blank(row.requestedAt),
      );
    });
}

function isReleaseDecision(row: ReleaseSourceFact): row is OperationalReleaseDecision {
  return 'state' in row && 'case_id' in row && 'organization_id' in row;
}

function isReleaseReversal(row: ReleaseSourceFact): row is OperationalReleaseReversal {
  return 'decision_id' in row && 'organization_id' in row && !('state' in row);
}

function isExplicitRelease(row: ReleaseSourceFact): row is ExplicitReleaseExceptionFact {
  return 'explicit' in row && row.explicit === true && 'reason' in row && !('state' in row);
}

function releaseFacts(facts: readonly ReleaseSourceFact[], organizationId: string): CoordinationException[] {
  const explicit = facts.filter(isExplicitRelease).filter((row) => blank(row.organizationId) === organizationId && blank(row.id));
  const decisions = facts.filter(isReleaseDecision).filter((row) => blank(row.organization_id) === organizationId && blank(row.id));
  const reversals = new Set(
    facts
      .filter(isReleaseReversal)
      .filter((row) => blank(row.organization_id) === organizationId)
      .map((row) => row.decision_id),
  );

  const latest = new Map<string, OperationalReleaseDecision>();
  for (const row of decisions) {
    const key = blank(row.case_id) ?? row.id;
    const current = latest.get(key);
    const at = row.recorded_at || row.decided_at;
    const currentAt = current ? current.recorded_at || current.decided_at : '';
    if (!current || at > currentAt) latest.set(key, row);
  }

  const fromLedger = [...latest.values()]
    .filter((row) => row.state === 'held' && !reversals.has(row.id))
    .map((row) =>
      baseException(
        `release:${row.id}`,
        organizationId,
        'commercial_release_exception',
        blank(row.order_id),
        blank(row.reason) ?? 'Excepción de liberación registrada.',
        blank(row.recorded_at),
      ),
    );

  const fromExplicit = explicit
    .filter((row) => blank(row.id))
    .map((row) =>
      baseException(
        `release:${row.id}`,
        organizationId,
        'commercial_release_exception',
        blank(row.orderId),
        blank(row.reason) ?? 'Excepción comercial registrada.',
        blank(row.recordedAt),
      ),
    );

  return [...fromLedger, ...fromExplicit];
}

function isOrderAllocation(row: AllocationSourceFact): row is OrderAllocation {
  return 'orderLineId' in row && 'finishedProductId' in row && !('awaitsWarehouseExit' in row);
}

function isAwaitingExit(row: AllocationSourceFact): row is AllocationAwaitingExitFact {
  return (
    'awaitsWarehouseExit' in row &&
    row.awaitsWarehouseExit === true &&
    'explicit' in row &&
    row.explicit === true
  );
}

function allocationExitFacts(
  facts: readonly AllocationSourceFact[],
  organizationId: string,
): CoordinationException[] {
  return facts.filter(isAwaitingExit).filter((row) => blank(row.organizationId) === organizationId && blank(row.id)).map((row) =>
    baseException(
      `allocation-exit:${row.id}`,
      organizationId,
      'allocation_awaiting_warehouse_exit',
      blank(row.allocationId),
      'Asignación sin salida de almacén registrada.',
      blank(row.recordedAt),
    ),
  );
}

function isAwaitingDelivery(row: WarehouseExitSourceFact): row is WarehouseExitAwaitingDeliveryFact {
  return 'awaitsDelivery' in row && row.awaitsDelivery === true && 'explicit' in row && row.explicit === true;
}

function warehouseExitFacts(
  facts: readonly WarehouseExitSourceFact[],
  organizationId: string,
): CoordinationException[] {
  return facts
    .filter(isAwaitingDelivery)
    .filter((row) => blank(row.organizationId) === organizationId && blank(row.id))
    .map((row) =>
      baseException(
        `warehouse-exit:${row.id}`,
        organizationId,
        'warehouse_exit_awaiting_delivery',
        blank(row.warehouseExitId),
        'Salida de almacén sin entrega al cliente registrada.',
        blank(row.recordedAt),
      ),
    );
}

function isNotInformed(row: CustomerInformedSourceFact): row is CustomerNotInformedFact {
  return 'notified' in row && row.notified === false && 'explicit' in row && row.explicit === true;
}

function informedFacts(
  facts: readonly CustomerInformedSourceFact[],
  organizationId: string,
): CoordinationException[] {
  return facts
    .filter(isNotInformed)
    .filter((row) => blank(row.organizationId) === organizationId && blank(row.id))
    .map((row) =>
      baseException(
        `customer-informed:${row.id}`,
        organizationId,
        'customer_not_informed',
        blank(row.issueId),
        blank(row.note) ?? 'Cliente no informado.',
        blank(row.recordedAt),
      ),
    );
}

function isOpenDecision(rows: readonly CoordinationDecisionRecord[], row: CoordinationDecisionRecord): boolean {
  if (row.kind !== 'recorded') return false;
  return !rows.some(
    (item) =>
      item.organizationId === row.organizationId &&
      item.kind === 'resolved' &&
      item.resolvesDecisionId === row.id,
  );
}

function overdueFacts(
  facts: readonly CoordinationDecisionRecord[],
  organizationId: string,
  asOf: string | null,
): CoordinationException[] {
  if (!asOf) return [];
  const own = facts.filter((row) => blank(row.organizationId) === organizationId);
  return own
    .filter(
      (row) =>
        isOpenDecision(own, row) &&
        blank(row.id) != null &&
        blank(row.dueAt) != null &&
        isPastDue(row.dueAt ?? '', asOf),
    )
    .map((row) => {
      const item = baseException(
        `overdue:${row.id}`,
        organizationId,
        'overdue_prior_decision',
        blank(row.linkedCaseId),
        blank(row.decision) ?? 'Decisión anterior vencida.',
        blank(row.dueAt),
      );
      item.recordedOwnerLabel = blank(row.ownerLabel);
      return item;
    });
}

function finishedGoodsFacts(
  receipts: readonly FinishedGoodsReceiptQuantity[],
  allocations: readonly AllocationSourceFact[],
  organizationId: string,
  receiptsConnected: boolean,
  allocationsConnected: boolean,
): CoordinationException[] {
  if (!receiptsConnected || !allocationsConnected) return [];
  const ownReceipts = receipts.filter((row) => blank(row.organizationId) === organizationId && blank(row.productId));
  const ownAllocations = allocations.filter(isOrderAllocation).filter((row) => blank(row.organizationId) === organizationId);
  const productIds = [...new Set(ownReceipts.map((row) => row.productId.trim()))];
  const items: CoordinationException[] = [];
  for (const productId of productIds) {
    const projection = projectFinishedGoodsAvailability({
      organizationId,
      productId,
      receipts: ownReceipts,
      allocations: ownAllocations,
    });
    if (!projection.known || projection.availableQuantity == null || projection.officialStock !== false) continue;
    let available = 0n;
    try {
      available = parseQuantity(projection.availableQuantity);
    } catch {
      continue;
    }
    if (available <= 0n) continue;
    const item = baseException(
      `finished-goods:${productId}`,
      organizationId,
      'finished_goods_awaiting_allocation',
      productId,
      'Producto terminado sin asignar.',
      null,
    );
    item.availableQuantity = projection.availableQuantity;
    items.push(item);
  }
  return items;
}

function deniedResult(
  reason: 'unauthorized' | 'missing_organization',
  canRegisterDecision: boolean,
): CoordinationExceptionsResult {
  const sources = Object.fromEntries(
    REQUIRED_SOURCE_CATEGORIES.map((category) => [
      category,
      {
        category,
        status: 'UNPROVEN',
        connected: false,
        factCount: null,
        countedAsZero: false,
        actionableCount: 0,
        reason: reason === 'missing_organization' ? 'missing_organization' : 'unauthorized',
      } satisfies SourceProof,
    ]),
  ) as Record<CoordinationSourceCategory, SourceProof>;

  return {
    ok: false,
    reason,
    organizationId: null,
    exceptions: [],
    displayCopy: null,
    sources,
    coverageComplete: false,
    canRegisterDecision,
    registerScope: canRegisterDecision ? COORDINATION_DECISION_CAPABILITY : null,
    performsWrite: false,
    meetingReplacement: MEETING_REPLACEMENT,
    tuesdayStatusMeeting: MEETING_REPLACEMENT,
    crossLaneChangeRequests: [CROSS_LANE_CHANGE_REQUEST],
    inventedCapabilities: [],
  };
}

function displayCopyFor(proofs: Record<CoordinationSourceCategory, SourceProof>, exceptionCount: number): string | null {
  const incomplete = REQUIRED_SOURCE_CATEGORIES.some((category) => {
    const status = proofs[category].status;
    return status === 'UNPROVEN' || status === 'ERROR';
  });
  if (incomplete) return COORDINATION_INCOMPLETE_EMPTY_COPY;
  if (exceptionCount === 0) return COORDINATION_COMPLETE_EMPTY_COPY;
  return null;
}

function sortExceptions(items: CoordinationException[]): CoordinationException[] {
  return [...items].sort((left, right) => {
    const kind = (KIND_ORDER.get(left.kind) ?? 0) - (KIND_ORDER.get(right.kind) ?? 0);
    if (kind !== 0) return kind;
    return left.id.localeCompare(right.id);
  });
}

/**
 * Company exception board. Read-only.
 *
 * Callers must already hold management.org.read. commercial.team.read,
 * people.admin, cargo, and title do not unlock it. Another organization's
 * rows are ignored. A missing session organization is a denial, not a fallback.
 *
 * Sources are injected. An omitted source is UNPROVEN and is not counted as zero.
 * NO_FACT on a connected source is not UNPROVEN.
 *
 * Proof: IMPLEMENTED and TESTED in this package. Not hosted. Not browser-verified.
 * Parked UI 1ab294f is not merged. The integrate pin is not moved.
 */
export function getCoordinationExceptions(
  trustedContext: CoordinationTrustedContext,
): CoordinationExceptionsResult {
  const scopes = trustedContext.grantedScopes ?? [];
  const canRegisterDecision = hasCoordinationDecisionCapability(scopes);
  const organizationId = blank(trustedContext.organizationId);

  if (!organizationId) return deniedResult('missing_organization', canRegisterDecision);
  if (!hasExplicitScope(scopes, MANAGEMENT_ORG_READ_SCOPE)) {
    return deniedResult('unauthorized', canRegisterDecision);
  }

  const sources = trustedContext.sources ?? null;
  const proofs = {} as Record<CoordinationSourceCategory, SourceProof>;
  const collected: CoordinationException[] = [];

  const dateRisk = resolveSourceProof(
    'date-risk',
    sourceInput(sources, 'date-risk') as CoordinationInjectedSources['dateRisk'],
  );
  const dateItems = issueFacts(
    dateRisk.facts,
    organizationId,
    'mayAffectCustomerDate',
    'customer_date_risk',
    'date-risk',
    'Fecha con el cliente marcada en riesgo.',
  );
  proofs['date-risk'] = withActionableCount(dateRisk.proof, dateItems.length);
  collected.push(...dateItems);

  const production = resolveSourceProof(
    'production',
    sourceInput(sources, 'production') as CoordinationInjectedSources['production'],
  );
  const productionItems = issueFacts(
    production.facts,
    organizationId,
    'mayAffectProductionCalendar',
    'production_issue',
    'production',
    'Incidencia de producción registrada.',
  );
  proofs.production = withActionableCount(production.proof, productionItems.length);
  collected.push(...productionItems);

  const purchase = resolveSourceProof(
    'purchase',
    sourceInput(sources, 'purchase') as CoordinationInjectedSources['purchase'],
  );
  const purchaseItems = purchaseFacts(purchase.facts, organizationId);
  proofs.purchase = withActionableCount(purchase.proof, purchaseItems.length);
  collected.push(...purchaseItems);

  const release = resolveSourceProof(
    'release',
    sourceInput(sources, 'release') as CoordinationInjectedSources['release'],
  );
  const releaseItems = releaseFacts(release.facts, organizationId);
  proofs.release = withActionableCount(release.proof, releaseItems.length);
  collected.push(...releaseItems);

  const finishedGoods = resolveSourceProof(
    'finished-goods',
    sourceInput(sources, 'finished-goods') as CoordinationInjectedSources['finishedGoods'],
  );
  const allocation = resolveSourceProof(
    'allocation',
    sourceInput(sources, 'allocation') as CoordinationInjectedSources['allocation'],
  );
  const goodsItems = finishedGoodsFacts(
    finishedGoods.facts,
    allocation.facts,
    organizationId,
    finishedGoods.proof.connected,
    allocation.proof.connected,
  );
  proofs['finished-goods'] = withActionableCount(finishedGoods.proof, goodsItems.length);
  collected.push(...goodsItems);

  const exitItems = allocationExitFacts(allocation.facts, organizationId);
  proofs.allocation = withActionableCount(allocation.proof, exitItems.length);
  collected.push(...exitItems);

  const warehouseExit = resolveSourceProof(
    'warehouse-exit',
    sourceInput(sources, 'warehouse-exit') as CoordinationInjectedSources['warehouseExit'],
  );
  const exitDeliveryItems = warehouseExitFacts(warehouseExit.facts, organizationId);
  proofs['warehouse-exit'] = withActionableCount(warehouseExit.proof, exitDeliveryItems.length);
  collected.push(...exitDeliveryItems);

  const delivery = resolveSourceProof(
    'delivery',
    sourceInput(sources, 'delivery') as CoordinationInjectedSources['delivery'],
  );
  proofs.delivery = delivery.proof;

  const informed = resolveSourceProof(
    'customer-informed',
    sourceInput(sources, 'customer-informed') as CoordinationInjectedSources['customerInformed'],
  );
  const informedItems = informedFacts(informed.facts, organizationId);
  proofs['customer-informed'] = withActionableCount(informed.proof, informedItems.length);
  collected.push(...informedItems);

  const priorProof = resolvePriorDecisionsSource(trustedContext);
  const priorFacts =
    trustedContext.sources?.priorDecisions &&
    trustedContext.sources.priorDecisions.status !== 'DENIED' &&
    trustedContext.sources.priorDecisions.status !== 'ERROR' &&
    trustedContext.sources.priorDecisions.status !== 'UNPROVEN' &&
    trustedContext.sources.priorDecisions.status !== 'NO_FACT'
      ? trustedContext.sources.priorDecisions.facts
      : [];
  const overdueItems = priorProof.connected
    ? overdueFacts(priorFacts, organizationId, blank(trustedContext.asOf))
    : [];
  proofs['prior-decisions'] = withActionableCount(priorProof, overdueItems.length);
  collected.push(...overdueItems);

  const exceptions = sortExceptions(collected);
  const complete = coverageComplete(proofs);

  return {
    ok: true,
    reason: 'ok',
    organizationId,
    exceptions,
    displayCopy: displayCopyFor(proofs, exceptions.length),
    sources: proofs,
    coverageComplete: complete,
    canRegisterDecision,
    registerScope: canRegisterDecision ? COORDINATION_DECISION_CAPABILITY : null,
    performsWrite: false,
    meetingReplacement: MEETING_REPLACEMENT,
    tuesdayStatusMeeting: MEETING_REPLACEMENT,
    crossLaneChangeRequests: [CROSS_LANE_CHANGE_REQUEST],
    inventedCapabilities: [],
  };
}
