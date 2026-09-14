import {
  NORMAL_ORDER_LABEL,
  PRODUCTION_ISSUE_SOURCE,
  PRODUCTION_PLANNING_LABEL,
  SPECIAL_ORDER_LABEL,
  parseQuantity,
  projectFinishedGoodsAvailability,
  purchaseRequestNextActionLabel,
  type CoordinationDecisionRecord,
  type CoordinationMatterInput,
  type CoordinationTrigger,
  type CustomerCommittedDate,
  type CustomerInformedRecord,
  type FinishedGoodsReceiptQuantity,
  type OrderAllocation,
  type ProductionInternalTargetDate,
  type ProductionIssue,
  type PurchaseRequest,
  type SpecialOrderClassificationKind,
} from '@isalwa/os-contracts';

/**
 * Coordination matters come only from a query that already required the session
 * organization. A missing query is UNPROVEN. It is not an empty list, and it is
 * not a license to read an unscoped table and filter afterward.
 *
 * Cargo and title are not inputs. A date, a payment object, or a special
 * classification does not become a matter unless the recorded fact says so.
 */

export const COORDINATION_OPERATING_FACT_IDS = [
  'customer_date_at_risk',
  'production_calendar_issue',
  'purchase_pending',
  'special_order_decision',
  'commercial_exception',
  'customer_not_informed',
  'finished_goods_awaiting_allocation',
  'delivery_blocked',
  'previous_decision_overdue',
  'critical_missing_evidence',
] as const;

export type CoordinationOperatingFactId = (typeof COORDINATION_OPERATING_FACT_IDS)[number];

export type CoordinationFactProof =
  | { status: 'UNPROVEN'; reason: 'no_tenant_scoped_query' }
  | { status: 'generated'; itemCount: number };

export type CoordinationFactProofs = Record<CoordinationOperatingFactId, CoordinationFactProof>;

export type UnavailableFactQuery = {
  status: 'unavailable';
};

export type ScopedFactList<T> = {
  status: 'scoped';
  organizationId: string;
  rows: readonly T[];
};

type FactQuery<T> = UnavailableFactQuery | ScopedFactList<T> | null | undefined;

export type CoordinationExplicitFact = {
  id: string;
  organizationId: string;
  /** Absent or false is not a fact. Do not infer it from a neighboring field. */
  explicit: true;
  cliente?: string | null;
  pedido?: string | null;
  productos?: string | readonly string[] | null;
  problema?: string | null;
  areaResponsable?: string | null;
  responsable?: string | null;
  fechaConElCliente?: string | null;
  fechaInterna?: string | null;
  queCambio?: string | null;
  clienteInformado?: boolean | null;
  proximaAccion?: string | null;
  linkedCaseId?: string | null;
};

export type CoordinationCommercialExceptionFact = CoordinationExplicitFact & {
  paymentException?: boolean;
};

export type CoordinationDeliveryBlockedFact = CoordinationExplicitFact & {
  blocked: true;
};

export type CoordinationMissingEvidenceFact = CoordinationExplicitFact & {
  critical: true;
};

export type CoordinationDateRevisionFact = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  revisedAt: string;
};

export type CoordinationSpecialOrderFact = {
  id: string;
  organizationId: string;
  orderId: string;
  classification: SpecialOrderClassificationKind;
  requiresProductionPlanning: boolean;
  recordedAt: string;
  previousClassification?: SpecialOrderClassificationKind | null;
  previousRequiresProductionPlanning?: boolean | null;
};

export type CoordinationFinishedGoodsFacts = {
  receipts: ScopedFactList<FinishedGoodsReceiptQuantity> | UnavailableFactQuery | null;
  allocations: ScopedFactList<OrderAllocation> | UnavailableFactQuery | null;
};

export type CoordinationOperatingFacts = {
  customerDateIssues?: FactQuery<ProductionIssue>;
  customerDates?: FactQuery<CustomerCommittedDate>;
  productionDates?: FactQuery<ProductionInternalTargetDate>;
  dateRevisions?: FactQuery<CoordinationDateRevisionFact>;
  informedRecords?: FactQuery<CustomerInformedRecord>;
  purchases?: FactQuery<PurchaseRequest>;
  specialOrders?: FactQuery<CoordinationSpecialOrderFact>;
  commercialExceptions?: FactQuery<CoordinationCommercialExceptionFact>;
  finishedGoods?: CoordinationFinishedGoodsFacts | null;
  deliveryBlocked?: FactQuery<CoordinationDeliveryBlockedFact>;
  missingEvidence?: FactQuery<CoordinationMissingEvidenceFact>;
  decisions?: FactQuery<CoordinationDecisionRecord>;
  /** Required to judge a due date. Missing clock does not mark anything overdue. */
  asOf?: string | null;
};

export type CoordinationFactsResult = {
  matters: readonly CoordinationMatterInput[];
  proofs: CoordinationFactProofs;
};

const PENDING_PURCHASE = new Set(['solicitado', 'cotizandose', 'pedido_preparandose']);
const LA_PAZ = 'America/La_Paz';

const UNPROVEN: CoordinationFactProof = { status: 'UNPROVEN', reason: 'no_tenant_scoped_query' };

function blank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function unprovenProofs(): CoordinationFactProofs {
  return {
    customer_date_at_risk: UNPROVEN,
    production_calendar_issue: UNPROVEN,
    purchase_pending: UNPROVEN,
    special_order_decision: UNPROVEN,
    commercial_exception: UNPROVEN,
    customer_not_informed: UNPROVEN,
    finished_goods_awaiting_allocation: UNPROVEN,
    delivery_blocked: UNPROVEN,
    previous_decision_overdue: UNPROVEN,
    critical_missing_evidence: UNPROVEN,
  };
}

/** No tenant-scoped reader exists in this lane. Do not substitute an unscoped list. */
export function unavailableOperatingFacts(): CoordinationOperatingFacts {
  return {
    customerDateIssues: { status: 'unavailable' },
    customerDates: { status: 'unavailable' },
    productionDates: { status: 'unavailable' },
    dateRevisions: { status: 'unavailable' },
    informedRecords: { status: 'unavailable' },
    purchases: { status: 'unavailable' },
    specialOrders: { status: 'unavailable' },
    commercialExceptions: { status: 'unavailable' },
    finishedGoods: {
      receipts: { status: 'unavailable' },
      allocations: { status: 'unavailable' },
    },
    deliveryBlocked: { status: 'unavailable' },
    missingEvidence: { status: 'unavailable' },
    decisions: { status: 'unavailable' },
    asOf: null,
  };
}

function scopedRows<T extends { organizationId: string }>(
  source: FactQuery<T>,
  organizationId: string,
): { readable: true; rows: T[] } | { readable: false } {
  if (!source || source.status !== 'scoped') return { readable: false };
  if (source.organizationId.trim() !== organizationId) return { readable: false };
  return {
    readable: true,
    rows: source.rows.filter((row) => row?.organizationId === organizationId),
  };
}

function generated(count: number): CoordinationFactProof {
  return { status: 'generated', itemCount: count };
}

function text(value: string | null | undefined): string | null {
  return blank(value);
}

function fieldBag(input: Omit<CoordinationMatterInput, 'id' | 'organizationId' | 'triggers'>): Omit<
  CoordinationMatterInput,
  'id' | 'organizationId' | 'triggers'
> {
  return {
    cliente: text(input.cliente),
    pedido: text(input.pedido),
    productos: input.productos ?? null,
    problema: text(input.problema),
    areaResponsable: text(input.areaResponsable),
    responsable: text(input.responsable),
    fechaConElCliente: text(input.fechaConElCliente),
    fechaInterna: text(input.fechaInterna),
    queCambio: text(input.queCambio),
    clienteInformado: input.clienteInformado === true || input.clienteInformado === false ? input.clienteInformado : null,
    proximaAccion: text(input.proximaAccion),
    linkedCaseId: text(input.linkedCaseId),
  };
}

function matter(
  id: string,
  organizationId: string,
  triggers: readonly CoordinationTrigger[],
  fields: Omit<CoordinationMatterInput, 'id' | 'organizationId' | 'triggers'>,
): CoordinationMatterInput {
  return {
    id,
    organizationId,
    triggers,
    ...fieldBag(fields),
  };
}

function subjectKey(subjectType: string, subjectId: string): string {
  return `${subjectType}\0${subjectId}`;
}

function latestBy<T>(rows: readonly T[], key: (row: T) => string, at: (row: T) => string): Map<string, T> {
  const out = new Map<string, T>();
  for (const row of rows) {
    const id = key(row);
    const current = out.get(id);
    if (!current || at(row) > at(current)) out.set(id, row);
  }
  return out;
}

function calendarDateInLaPaz(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LA_PAZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function isPastDue(dueAt: string, asOf: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) {
    const today = calendarDateInLaPaz(asOf);
    return today != null && today > dueAt;
  }
  const due = Date.parse(dueAt);
  const now = Date.parse(asOf);
  if (Number.isNaN(due) || Number.isNaN(now)) return false;
  return now > due;
}

function isOpenDecision(ledger: readonly CoordinationDecisionRecord[], row: CoordinationDecisionRecord): boolean {
  if (row.kind !== 'recorded') return false;
  return !ledger.some(
    (item) =>
      item.organizationId === row.organizationId &&
      item.kind === 'resolved' &&
      item.resolvesDecisionId === row.id,
  );
}

function dateMatters(
  organizationId: string,
  facts: CoordinationOperatingFacts,
): { matters: CoordinationMatterInput[]; dateRisk: CoordinationFactProof; calendar: CoordinationFactProof; informed: CoordinationFactProof } {
  const issues = scopedRows(facts.customerDateIssues, organizationId);
  if (!issues.readable) {
    return { matters: [], dateRisk: UNPROVEN, calendar: UNPROVEN, informed: UNPROVEN };
  }

  const dates = scopedRows(facts.customerDates, organizationId);
  const production = scopedRows(facts.productionDates, organizationId);
  const revisions = scopedRows(facts.dateRevisions, organizationId);
  const informed = scopedRows(facts.informedRecords, organizationId);

  const dateBySubject = dates.readable
    ? latestBy(dates.rows, (row) => subjectKey(row.subjectType, row.subjectId), (row) => row.setAt)
    : null;
  const productionBySubject = production.readable
    ? latestBy(production.rows, (row) => subjectKey(row.subjectType, row.subjectId), (row) => row.setAt)
    : null;
  const revisionBySubject = revisions.readable
    ? latestBy(revisions.rows, (row) => subjectKey(row.subjectType, row.subjectId), (row) => row.revisedAt)
    : null;

  const matters: CoordinationMatterInput[] = [];
  let dateRiskCount = 0;
  let calendarCount = 0;
  let informedCount = 0;

  for (const issue of issues.rows) {
    if (issue.source !== PRODUCTION_ISSUE_SOURCE) continue;
    if (!blank(issue.id) || !blank(issue.subjectId)) continue;
    const dateRisk = issue.mayAffectCustomerDate === true;
    const calendar = issue.mayAffectProductionCalendar === true;
    if (!dateRisk && !calendar) continue;

    const key = subjectKey(issue.subjectType, issue.subjectId);
    const customerDate = dateBySubject?.get(key) ?? null;
    const productionDate = productionBySubject?.get(key) ?? null;
    const revision = revisionBySubject?.get(key) ?? null;
    const told =
      informed.readable && dateRisk
        ? informed.rows.some(
            (row) => row.issueId === issue.id && row.organizationId === organizationId && row.notified === true,
          )
        : null;

    const triggers: CoordinationTrigger[] = [];
    if (dateRisk) {
      triggers.push('customer_date_at_risk');
      dateRiskCount += 1;
    }
    if (calendar) {
      triggers.push('production_issue_flag');
      calendarCount += 1;
    }
    if (told === false) {
      triggers.push('customer_not_informed');
      informedCount += 1;
    }

    matters.push(
      matter(`issue:${issue.id}`, organizationId, triggers, {
        cliente: null,
        pedido: issue.subjectType === 'order' ? issue.subjectId : null,
        productos: null,
        problema: issue.note,
        areaResponsable: null,
        responsable: null,
        fechaConElCliente: customerDate?.source === 'sales_customer_coordination' ? customerDate.committedOn : null,
        fechaInterna: productionDate?.source === 'production_internal' ? productionDate.targetOn : null,
        queCambio: revision?.reason ?? null,
        clienteInformado: told,
        proximaAccion: null,
        linkedCaseId: issue.id,
      }),
    );
  }

  return {
    matters,
    dateRisk: generated(dateRiskCount),
    calendar: generated(calendarCount),
    informed: informed.readable ? generated(informedCount) : UNPROVEN,
  };
}

function purchaseMatters(organizationId: string, facts: CoordinationOperatingFacts): {
  matters: CoordinationMatterInput[];
  proof: CoordinationFactProof;
} {
  const source = scopedRows(facts.purchases, organizationId);
  if (!source.readable) return { matters: [], proof: UNPROVEN };
  const matters = source.rows
    .filter((row) => blank(row.id) && PENDING_PURCHASE.has(row.status))
    .map((row) =>
      matter(`purchase:${row.id}`, organizationId, ['purchase_pending'], {
        cliente: null,
        pedido: row.orderId,
        productos: null,
        problema: row.description || row.reason,
        areaResponsable: row.requestingArea,
        responsable: row.buyerLabel || row.requestedByLabel,
        fechaConElCliente: null,
        fechaInterna: null,
        queCambio: null,
        clienteInformado: null,
        proximaAccion: purchaseRequestNextActionLabel(row.status),
        linkedCaseId: row.id,
      }),
    );
  return { matters, proof: generated(matters.length) };
}

function classificationLabel(kind: SpecialOrderClassificationKind): string {
  return kind === 'special' ? SPECIAL_ORDER_LABEL : NORMAL_ORDER_LABEL;
}

function specialOrderMatters(organizationId: string, facts: CoordinationOperatingFacts): {
  matters: CoordinationMatterInput[];
  proof: CoordinationFactProof;
} {
  const source = scopedRows(facts.specialOrders, organizationId);
  if (!source.readable) return { matters: [], proof: UNPROVEN };
  const current = latestBy(
    source.rows.filter((row) => blank(row.id) && blank(row.orderId)),
    (row) => row.orderId,
    (row) => row.recordedAt,
  );
  const matters: CoordinationMatterInput[] = [];
  for (const row of current.values()) {
    if (row.classification !== 'special' || row.requiresProductionPlanning !== true) continue;
    const previous = row.previousClassification;
    matters.push(
      matter(`special:${row.orderId}`, organizationId, ['special_order_decision'], {
        cliente: null,
        pedido: row.orderId,
        productos: null,
        problema: PRODUCTION_PLANNING_LABEL,
        areaResponsable: null,
        responsable: null,
        fechaConElCliente: null,
        fechaInterna: null,
        queCambio: previous ? `Clasificación anterior: ${classificationLabel(previous)}` : null,
        clienteInformado: null,
        proximaAccion: null,
        linkedCaseId: row.id,
      }),
    );
  }
  return { matters, proof: generated(matters.length) };
}

function explicitMatters(
  organizationId: string,
  source: FactQuery<CoordinationExplicitFact>,
  triggersFor: (row: CoordinationExplicitFact) => CoordinationTrigger[],
  idPrefix: string,
): { matters: CoordinationMatterInput[]; proof: CoordinationFactProof } {
  const scoped = scopedRows(source, organizationId);
  if (!scoped.readable) return { matters: [], proof: UNPROVEN };
  const matters = scoped.rows
    .filter((row) => row.explicit === true && blank(row.id) && triggersFor(row).length > 0)
    .map((row) =>
      matter(`${idPrefix}:${row.id}`, organizationId, triggersFor(row), {
        cliente: row.cliente,
        pedido: row.pedido,
        productos: row.productos,
        problema: row.problema,
        areaResponsable: row.areaResponsable,
        responsable: row.responsable,
        fechaConElCliente: row.fechaConElCliente,
        fechaInterna: row.fechaInterna,
        queCambio: row.queCambio,
        clienteInformado: row.clienteInformado,
        proximaAccion: row.proximaAccion,
        linkedCaseId: row.linkedCaseId ?? row.id,
      }),
    );
  return { matters, proof: generated(matters.length) };
}

function finishedGoodsMatters(organizationId: string, facts: CoordinationOperatingFacts): {
  matters: CoordinationMatterInput[];
  proof: CoordinationFactProof;
} {
  const goods = facts.finishedGoods;
  if (!goods) return { matters: [], proof: UNPROVEN };
  const receipts = scopedRows(goods.receipts, organizationId);
  const allocations = scopedRows(goods.allocations, organizationId);
  if (!receipts.readable || !allocations.readable) return { matters: [], proof: UNPROVEN };

  const productIds = [...new Set(receipts.rows.map((row) => blank(row.productId)).filter((id): id is string => id != null))];
  const matters: CoordinationMatterInput[] = [];
  for (const productId of productIds) {
    const projection = projectFinishedGoodsAvailability({
      organizationId,
      productId,
      receipts: receipts.rows,
      allocations: allocations.rows,
    });
    if (!projection.known || projection.availableQuantity == null) continue;
    let available = 0n;
    try {
      available = parseQuantity(projection.availableQuantity);
    } catch {
      continue;
    }
    if (available <= 0n) continue;
    matters.push(
      matter(`goods:${productId}`, organizationId, ['finished_goods_awaiting_allocation'], {
        cliente: null,
        pedido: null,
        productos: productId,
        problema: `Producto terminado sin asignar. Cantidad disponible: ${projection.availableQuantity}`,
        areaResponsable: null,
        responsable: null,
        fechaConElCliente: null,
        fechaInterna: null,
        queCambio: null,
        clienteInformado: null,
        proximaAccion: null,
        linkedCaseId: productId,
      }),
    );
  }
  return { matters, proof: generated(matters.length) };
}

function overdueMatters(organizationId: string, facts: CoordinationOperatingFacts): {
  matters: CoordinationMatterInput[];
  proof: CoordinationFactProof;
} {
  const source = scopedRows(facts.decisions, organizationId);
  const asOf = blank(facts.asOf);
  if (!source.readable || !asOf) return { matters: [], proof: UNPROVEN };
  const open = source.rows.filter((row) => isOpenDecision(source.rows, row) && blank(row.dueAt) && isPastDue(row.dueAt ?? '', asOf));
  const matters = open
    .filter((row) => blank(row.id) && blank(row.decision))
    .map((row) =>
      matter(`overdue:${row.id}`, organizationId, ['previous_decision_overdue'], {
        cliente: null,
        pedido: null,
        productos: null,
        problema: row.decision,
        areaResponsable: null,
        responsable: row.ownerLabel,
        fechaConElCliente: null,
        fechaInterna: null,
        queCambio: null,
        clienteInformado: null,
        proximaAccion: null,
        linkedCaseId: row.linkedCaseId ?? row.id,
      }),
    );
  return { matters, proof: generated(matters.length) };
}

/**
 * Session organization is required. Another tenant's rows are not read into
 * items, titles, or counts. An unavailable query contributes nothing.
 */
export function coordinationMattersFromOperatingFacts(input: {
  organizationId?: string | null;
  facts?: CoordinationOperatingFacts | null;
}): CoordinationFactsResult {
  const organizationId = blank(input.organizationId);
  const proofs = unprovenProofs();
  if (!organizationId) return { matters: [], proofs };

  const facts = input.facts ?? unavailableOperatingFacts();
  const dates = dateMatters(organizationId, facts);
  const purchases = purchaseMatters(organizationId, facts);
  const special = specialOrderMatters(organizationId, facts);
  const commercial = explicitMatters(
    organizationId,
    facts.commercialExceptions,
    (row) => {
      const fact = row as CoordinationCommercialExceptionFact;
      if (fact.explicit !== true) return [];
      const triggers: CoordinationTrigger[] = ['commercial_decision_required'];
      if (fact.paymentException === true) triggers.push('payment_exception');
      return triggers;
    },
    'exception',
  );
  const deliveries = explicitMatters(
    organizationId,
    facts.deliveryBlocked,
    (row) => ((row as CoordinationDeliveryBlockedFact).blocked === true ? ['delivery_blocked'] : []),
    'delivery',
  );
  const evidence = explicitMatters(
    organizationId,
    facts.missingEvidence,
    (row) => ((row as CoordinationMissingEvidenceFact).critical === true ? ['missing_evidence'] : []),
    'evidence',
  );
  const goods = finishedGoodsMatters(organizationId, facts);
  const overdue = overdueMatters(organizationId, facts);

  proofs.customer_date_at_risk = dates.dateRisk;
  proofs.production_calendar_issue = dates.calendar;
  proofs.customer_not_informed = dates.informed;
  proofs.purchase_pending = purchases.proof;
  proofs.special_order_decision = special.proof;
  proofs.commercial_exception = commercial.proof;
  proofs.delivery_blocked = deliveries.proof;
  proofs.critical_missing_evidence = evidence.proof;
  proofs.finished_goods_awaiting_allocation = goods.proof;
  proofs.previous_decision_overdue = overdue.proof;

  return {
    matters: [
      ...dates.matters,
      ...purchases.matters,
      ...special.matters,
      ...commercial.matters,
      ...deliveries.matters,
      ...evidence.matters,
      ...goods.matters,
      ...overdue.matters,
    ],
    proofs,
  };
}
