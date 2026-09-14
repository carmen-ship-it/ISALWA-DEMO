/**
 * Cross-functional case file for one Pedido.
 * Answers only from facts the caller already loaded. A missing query is unavailable,
 * not an invented absence. Session scopes stay on the server. A missing scope list
 * fails closed and does not become an empty grant.
 *
 * Agent 0 wire: Worker B will provide loadMemberCapabilities from
 * apps/os-web/lib/auth/member-capabilities.ts. Do not invent that module.
 * Pass its grantedScopes into pedidoGrantedScopesFromSession. Until that call
 * returns, scope-gated sections stay closed.
 */

import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  CUSTOMER_COMMITTED_DATE_LABEL,
  CUSTOMER_INFORMED_LABEL,
  CUSTOMER_NOT_INFORMED_LABEL,
  DELIVERY_RECORD_SCOPE,
  ENTREGA_PANEL_COPY,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_INTERNAL_TARGET_LABEL,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  continueCoveredCustomerWorkflow,
  customerNotifiedState,
  finishedGoodsReceiptAllocatesToOrder,
  hasExplicitScope,
  quantityAllocatedToOrderLine,
  receiptAllocatesToOrder,
  type CustomerCommittedDate,
  type CustomerCoverageGrant,
  type CustomerInformedRecord,
  type OrderAllocation,
  type ProductionInternalTargetDate,
  type ProductionIssue,
} from '@isalwa/os-contracts';
import { timelineEntrySummary, timelineEventLabel } from '@/lib/commercial/timeline-labels';
import { PEDIDO_FUNCTION_ROUTES } from '@/lib/navigation/requests/pedido';
import { ORDER_CASE_UNAVAILABLE } from '@/lib/operations/operational-case';
import {
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  cargoGrantsExceptionAuthorization,
} from '@/lib/operations/pedido-access';
import {
  PEDIDO_EXCEPTION_SCOPE_NOTE,
  PEDIDO_LISTO_NOT_OWNERSHIP,
  PEDIDO_NO_ALLOCATION,
  PEDIDO_NO_CUSTOMER_DATE,
  PEDIDO_NO_CUSTOMER_NOTICE,
  PEDIDO_NO_PRODUCTION_DATE,
  PEDIDO_NO_SHARED_OWNERSHIP,
  PEDIDO_NORMAL_LABEL,
  PEDIDO_PAYMENT_NOT_REQUIRED,
  PEDIDO_PLANNING_LABEL,
  PEDIDO_RELEASE_NOT_PAYMENT,
  PEDIDO_SPECIAL_LABEL,
  PEDIDO_UNCLASSIFIED_LABEL,
  type PedidoClassificationInput,
  type PedidoOrderSnapshot,
} from '@/lib/operations/pedido-case';

export const PEDIDO_FACT_UNAVAILABLE = 'No disponible' as const;
export const PEDIDO_SCOPES_UNCONFIRMED =
  'Los permisos de la sesión no están cargados. Esta parte queda cerrada.' as const;
export const PEDIDO_SECTION_DENIED = 'Sin permiso para ver esta parte del pedido.' as const;
export const PEDIDO_EXIT_IS_NOT_DELIVERY = ENTREGA_PANEL_COPY.warehouseDistinct;
export const PEDIDO_PRODUCTION_NOT_CHILD =
  'La producción no es hija de este pedido. El identificador de producto es el vínculo. Sin un contexto de asignación, no se muestra producción como si perteneciera al pedido.' as const;
export const PEDIDO_PRODUCTION_JOIN =
  'Hay asignación. El pedido no es dueño del registro de producción.' as const;
export const PEDIDO_NO_BLOCKER = 'Sin bloqueo registrado' as const;
export const PEDIDO_NO_NEXT = 'Seguir el pedido' as const;
export const PEDIDO_DOCUMENT_CHANGE_ONLY =
  'Otros cambios no están cargados.' as const;
export const PEDIDO_NO_COVERAGE = 'Sin cobertura registrada' as const;
export const PEDIDO_COVERING_NOT_OWNER = 'Cubre. No es responsable principal.' as const;
export const PEDIDO_NORMAL_DATE_NA = 'No aplica a este pedido normal.' as const;
export const PEDIDO_SESSION_SCOPES_WIRE =
  'Agent 0 must wire loadMemberCapabilities from apps/os-web/lib/auth/member-capabilities.ts (Worker B) and pass grantedScopes into the pedido page. Until that returns, scope-gated sections fail closed.' as const;

export type FactLoad<T> =
  | { status: 'loaded'; value: T }
  | { status: 'empty' }
  | { status: 'unavailable' };

export type PedidoCaseSectionId =
  | 'resumen'
  | 'comercial'
  | 'fechas'
  | 'compras'
  | 'produccion'
  | 'almacen'
  | 'comunicacion'
  | 'entrega'
  | 'evidencia'
  | 'historial';

export type PedidoGate = 'open' | 'denied' | 'scopes_unconfirmed';

export type PedidoAnswerField = {
  id: string;
  label: string;
  value: string;
};

export type PedidoSectionModel = {
  id: PedidoCaseSectionId;
  title: string;
  gate: PedidoGate;
  state: 'ready' | 'empty' | 'unavailable' | 'denied' | 'scopes_unconfirmed';
  lines: readonly string[];
  links: readonly { href: string; label: string }[];
};

export type PedidoHistoryEntry = {
  occurredAt: string;
  label: string;
  detail: string | null;
};

export type PedidoDeliveryStatusInput = {
  deliveredAt: string;
  description: string | null;
  quantity: string | null;
};

export type PedidoWarehouseExitInput = {
  exitedAt: string;
};

export type PedidoCaseFile = {
  answer: PedidoAnswerField[];
  blocker: string | null;
  boundaries: readonly string[];
  sections: PedidoSectionModel[];
  gates: Record<PedidoCaseSectionId, PedidoGate>;
  closedSectionTitles: readonly string[];
  exceptionVisible: boolean;
  exceptionNote: typeof PEDIDO_EXCEPTION_SCOPE_NOTE;
  paymentNotRequired: typeof PEDIDO_PAYMENT_NOT_REQUIRED;
  paymentIsGate: false;
  coveringIsCoOwner: false;
  listoAllocates: false;
  exitIsDelivery: false;
  productionOwnedByOrder: false;
  scopesWire: typeof PEDIDO_SESSION_SCOPES_WIRE;
  scopesConfirmed: boolean;
};

const SECTION_TITLES: Record<PedidoCaseSectionId, string> = {
  resumen: 'Resumen',
  comercial: 'Comercial',
  fechas: 'Fechas',
  compras: 'Compras',
  produccion: 'Producción',
  almacen: 'Almacén',
  comunicacion: 'Cliente y comunicación',
  entrega: 'Entrega',
  evidencia: 'Evidencia',
  historial: 'Historial',
};

const SECTION_ORDER: PedidoCaseSectionId[] = [
  'resumen',
  'comercial',
  'fechas',
  'compras',
  'produccion',
  'almacen',
  'comunicacion',
  'entrega',
  'evidencia',
  'historial',
];

function unavailable<T>(): FactLoad<T> {
  return { status: 'unavailable' };
}

function formatCalendar(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(date);
}

function hasScope(scopes: readonly string[], scope: string): boolean {
  return hasExplicitScope(scopes, scope);
}

function closedCopy(gate: PedidoGate): string | null {
  if (gate === 'scopes_unconfirmed') return PEDIDO_SCOPES_UNCONFIRMED;
  if (gate === 'denied') return PEDIDO_SECTION_DENIED;
  return null;
}

/**
 * Missing scopes are not an empty grant. Do not invent loadMemberCapabilities.
 * Agent 0 passes the Worker B result here.
 */
export function pedidoGrantedScopesFromSession(
  scopes: readonly string[] | null | undefined,
): readonly string[] | null {
  if (scopes == null) return null;
  return [...scopes];
}

export function pedidoCaseGates(input: {
  grantedScopes: readonly string[] | null;
  isOwner: boolean;
  coverageAllowed: boolean;
}): Record<PedidoCaseSectionId, PedidoGate> {
  if (input.grantedScopes == null) {
    return {
      resumen: 'scopes_unconfirmed',
      comercial: 'scopes_unconfirmed',
      fechas: 'scopes_unconfirmed',
      compras: 'scopes_unconfirmed',
      produccion: 'scopes_unconfirmed',
      almacen: 'scopes_unconfirmed',
      comunicacion: 'scopes_unconfirmed',
      entrega: 'scopes_unconfirmed',
      evidencia: 'scopes_unconfirmed',
      historial: 'scopes_unconfirmed',
    };
  }

  const scopes = input.grantedScopes;
  const commercial =
    input.isOwner ||
    input.coverageAllowed ||
    hasScope(scopes, COMMERCIAL_TEAM_READ_SCOPE) ||
    hasScope(scopes, COMMERCIAL_ORG_READ_SCOPE) ||
    hasScope(scopes, MANAGEMENT_ORG_READ_SCOPE) ||
    hasScope(scopes, OPERATIONS_COORDINATOR_RECORD_SCOPE);
  const finance = hasScope(scopes, FINANCE_OPERATIONAL_RECORD_SCOPE);
  const exception = hasScope(scopes, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
  const production =
    hasScope(scopes, PRODUCTION_OPERATIONAL_RECORD_SCOPE) ||
    hasScope(scopes, PRODUCTION_ENTRY_MEMBER_SCOPE) ||
    hasScope(scopes, PRODUCTION_REVIEW_MEMBER_SCOPE);
  const warehouse = hasScope(scopes, WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE);
  const purchasing = hasScope(scopes, PURCHASING_OPERATIONAL_RECORD_SCOPE);
  const delivery = hasScope(scopes, DELIVERY_RECORD_SCOPE);
  const coordinator = hasScope(scopes, OPERATIONS_COORDINATOR_RECORD_SCOPE);
  const management = hasScope(scopes, MANAGEMENT_ORG_READ_SCOPE);

  const gate = (open: boolean): PedidoGate => (open ? 'open' : 'denied');
  return {
    resumen: gate(commercial),
    comercial: gate(commercial),
    fechas: gate(commercial || production || coordinator || management),
    compras: gate(purchasing || coordinator || management),
    produccion: gate(production || coordinator || management),
    almacen: gate(warehouse || coordinator || management),
    comunicacion: gate(commercial),
    entrega: gate(delivery || coordinator || management),
    evidencia: gate(commercial || finance || exception),
    historial: gate(commercial || coordinator || management),
  };
}

export function timelineEntriesForPedido(
  entries: readonly PartyTimelineEntryReadModel[],
  organizationId: string,
  orderId: string,
): PedidoHistoryEntry[] {
  return entries
    .filter((entry) => entryBelongsToOrder(entry, organizationId, orderId))
    .map((entry) => {
      const label = timelineEventLabel(entry.eventType);
      const summary = timelineEntrySummary(entry);
      return {
        occurredAt: entry.occurredAt,
        label,
        detail: summary && summary !== label ? summary : null,
      };
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function entryBelongsToOrder(
  entry: PartyTimelineEntryReadModel,
  organizationId: string,
  orderId: string,
): boolean {
  if (entry.organizationId !== organizationId) return false;
  if (entry.facts.orderId === orderId) return true;
  return (
    entry.primaryEntityId === orderId && entry.primaryEntityType.toLowerCase().includes('order')
  );
}

function sameOrderDate<T extends { organizationId: string; subjectId: string }>(
  fact: T | null | undefined,
  order: PedidoOrderSnapshot,
): T | null {
  if (!fact) return null;
  if (fact.organizationId !== order.organizationId || fact.subjectId !== order.orderId) return null;
  return fact;
}

function displayName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : PEDIDO_FACT_UNAVAILABLE;
}

export function buildPedidoCaseFile(input: {
  order: PedidoOrderSnapshot;
  actorMemberId: string | null;
  grantedScopes: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
  asOf: Date;
  grants?: FactLoad<readonly CustomerCoverageGrant[]>;
  actingAdvisorLabel?: string | null;
  customerDate?: FactLoad<CustomerCommittedDate | null>;
  productionDate?: FactLoad<ProductionInternalTargetDate | null>;
  classification?: FactLoad<PedidoClassificationInput | null>;
  issues?: FactLoad<readonly ProductionIssue[]>;
  informed?: FactLoad<readonly CustomerInformedRecord[]>;
  allocations?: FactLoad<readonly OrderAllocation[]>;
  deliveries?: FactLoad<readonly PedidoDeliveryStatusInput[]>;
  warehouseExits?: FactLoad<readonly PedidoWarehouseExitInput[]>;
  receipts?: FactLoad<readonly { productId: string; recordedAt: string }[]>;
  history?: FactLoad<readonly PedidoHistoryEntry[]>;
  lineLabels?: Readonly<Record<string, string>>;
  quoteNumber?: FactLoad<string | null>;
  linesLoaded?: FactLoad<number>;
  totalLabel?: string | null;
  statusLabel?: string;
}): PedidoCaseFile {
  const grantsLoad = input.grants ?? unavailable();
  const grants = grantsLoad.status === 'loaded' ? grantsLoad.value : [];
  const coverage =
    input.actorMemberId && grantsLoad.status === 'loaded'
      ? continueCoveredCustomerWorkflow({
          actorMemberId: input.actorMemberId,
          organizationId: input.order.organizationId,
          customerPartyId: input.order.partyId,
          primaryOwnerMemberId: input.order.ownerMemberId,
          grants,
          asOf: input.asOf,
        })
      : null;
  const presentGrant = grants.find(
    (grant) =>
      grant.organizationId === input.order.organizationId &&
      grant.customerPartyId === input.order.partyId &&
      grant.primaryOwnerMemberId === input.order.ownerMemberId,
  );
  const viewerIsCovering = presentGrant?.actingAdvisorMemberId === input.actorMemberId;

  const scopesConfirmed = input.grantedScopes != null;
  const isOwner = scopesConfirmed && input.actorMemberId === input.order.ownerMemberId;
  const gates = pedidoCaseGates({
    grantedScopes: input.grantedScopes,
    isOwner,
    coverageAllowed: scopesConfirmed && coverage?.allowed === true,
  });

  const customerLoad = input.customerDate ?? unavailable();
  const productionLoad = input.productionDate ?? unavailable();
  const classificationLoad = input.classification ?? unavailable();
  const issuesLoad = input.issues ?? unavailable();
  const informedLoad = input.informed ?? unavailable();
  const allocationLoad = input.allocations ?? unavailable();
  const deliveryLoad = input.deliveries ?? unavailable();
  const exitLoad = input.warehouseExits ?? unavailable();
  const receiptLoad = input.receipts ?? unavailable();
  const historyLoad = input.history ?? unavailable();

  const customerRecord =
    customerLoad.status === 'loaded' ? sameOrderDate(customerLoad.value, input.order) : null;
  const productionRecord =
    productionLoad.status === 'loaded' ? sameOrderDate(productionLoad.value, input.order) : null;
  const classification =
    classificationLoad.status === 'loaded' ? classificationLoad.value : null;
  const special = classification?.classification === 'special';
  const planning = classification?.requiresProductionPlanning === true;

  const issues =
    issuesLoad.status === 'loaded'
      ? issuesLoad.value.filter(
          (issue) =>
            issue.organizationId === input.order.organizationId &&
            issue.subjectId === input.order.orderId,
        )
      : [];
  const informed =
    informedLoad.status === 'loaded'
      ? informedLoad.value.filter((item) => item.organizationId === input.order.organizationId)
      : [];
  const pendingIssue = issues.find(
    (issue) =>
      issue.mayAffectCustomerDate &&
      customerNotifiedState(issue.id, input.order.organizationId, informed) === 'not_informed',
  );

  const cancelled = input.order.statusLabel.toLowerCase() === 'cancelado' || Boolean(input.order.cancelledAt);
  const blockerSourcesKnown =
    issuesLoad.status !== 'unavailable' &&
    classificationLoad.status !== 'unavailable';
  let blocker: string | null = null;
  let nextAction: string = PEDIDO_FACT_UNAVAILABLE;
  let responsible: string = PEDIDO_FACT_UNAVAILABLE;
  if (cancelled) {
    blocker = 'Pedido cancelado';
    nextAction = 'Ninguna. El pedido está cancelado.';
    responsible = 'No aplica.';
  } else if (issuesLoad.status === 'loaded' && pendingIssue) {
    blocker = pendingIssue.note?.trim() || 'Puede afectar la fecha del cliente';
    nextAction = 'Avisar al cliente';
    responsible = 'Comercial';
  } else if (classificationLoad.status === 'loaded' && special && planning) {
    blocker = PEDIDO_PLANNING_LABEL;
    nextAction = 'Registrar la planificación de producción';
    responsible = 'Producción';
  } else if (blockerSourcesKnown && !pendingIssue && !(special && planning)) {
    blocker = null;
    nextAction = PEDIDO_NO_NEXT;
    responsible = 'Comercial';
  }

  const coveringValue = coveringLabel({
    grantsLoad,
    gate: gates.comercial,
    presentGrant,
    viewerIsCovering,
    label: input.actingAdvisorLabel,
  });

  const customerDateValue = dateValue({
    gate: gates.fechas,
    load: customerLoad,
    recorded: customerRecord,
    formatted: formatCalendar(customerRecord?.committedOn),
    emptyLabel: PEDIDO_NO_CUSTOMER_DATE,
    mismatched: customerLoad.status === 'loaded' && customerLoad.value != null && !customerRecord,
  });
  const productionDateValue = productionDateLabel({
    gate: gates.fechas,
    load: productionLoad,
    recorded: productionRecord,
    formatted: formatCalendar(productionRecord?.targetOn),
    classificationLoad,
  });

  const allocationValue = allocationSummary({
    gate: gates.almacen,
    load: allocationLoad,
    organizationId: input.order.organizationId,
    lineLabels: input.lineLabels ?? {},
  });
  const deliveryValue = deliverySummary({
    gate: gates.entrega,
    deliveries: deliveryLoad,
    exits: exitLoad,
  });
  const informedValue = informedSummary({
    gate: gates.comunicacion,
    issuesLoad,
    informedLoad,
    issues,
    informed,
    organizationId: input.order.organizationId,
  });
  const latest = latestChange({
    gate: gates.historial,
    order: input.order,
    history: historyLoad,
    customer: customerRecord,
    production: productionRecord,
    classification,
    classificationKnown: classificationLoad.status === 'loaded',
  });

  const exceptionVisible =
    gates.evidencia === 'open' &&
    input.grantedScopes != null &&
    hasScope(input.grantedScopes, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE) &&
    cargoGrantsExceptionAuthorization(input.cargo, input.title) === false;

  const answer: PedidoAnswerField[] = [
    { id: 'cliente', label: 'Cliente', value: displayName(input.order.customerName) },
    { id: 'pedido', label: 'Pedido', value: displayName(input.order.orderNumber) },
    { id: 'owner', label: 'Responsable', value: displayName(input.order.ownerLabel) },
    { id: 'estado', label: 'Estado', value: displayName(input.statusLabel ?? input.order.statusLabel) },
    { id: 'cobertura', label: 'Cobertura', value: coveringValue },
    { id: 'clasificacion', label: 'Clasificación', value: classificationValue(gates.comercial, classificationLoad) },
    { id: 'fecha-cliente', label: CUSTOMER_COMMITTED_DATE_LABEL, value: customerDateValue },
    { id: 'fecha-produccion', label: PRODUCTION_INTERNAL_TARGET_LABEL, value: productionDateValue },
    { id: 'bloqueo', label: 'Bloqueo', value: blockerField(gates.resumen, cancelled, blocker, blockerSourcesKnown) },
    { id: 'siguiente', label: 'Siguiente acción', value: gatedText(gates.resumen, nextAction) },
    { id: 'funcion', label: 'Función responsable', value: gatedText(gates.resumen, responsible) },
    { id: 'informado', label: 'Cliente informado', value: informedValue },
    { id: 'asignacion', label: 'Asignación', value: allocationValue },
    { id: 'entrega', label: 'Entrega', value: deliveryValue },
    { id: 'cambio', label: 'Último cambio', value: latest },
  ];

  const sections = SECTION_ORDER.map((id) =>
    sectionModel(id, gates[id], {
      order: input.order,
      totalLabel: input.totalLabel ?? null,
      quote: input.quoteNumber ?? unavailable(),
      lines: input.linesLoaded ?? unavailable(),
      customerDateValue,
      productionDateValue,
      allocationLoad,
      allocationValue,
      deliveryLoad,
      deliveryValue,
      exitLoad,
      receiptLoad,
      informedValue,
      historyLoad,
      organizationId: input.order.organizationId,
      exceptionVisible,
    }),
  );

  const boundaries = [
    PEDIDO_NO_SHARED_OWNERSHIP,
    PEDIDO_PAYMENT_NOT_REQUIRED,
    PEDIDO_EXIT_IS_NOT_DELIVERY,
    PEDIDO_LISTO_NOT_OWNERSHIP,
  ];

  return {
    answer,
    blocker: gates.resumen === 'open' && blocker ? blocker : null,
    boundaries,
    sections,
    gates,
    closedSectionTitles: sections
      .filter((section) => section.gate !== 'open' && section.id !== 'resumen')
      .map((section) => section.title),
    exceptionVisible,
    exceptionNote: PEDIDO_EXCEPTION_SCOPE_NOTE,
    paymentNotRequired: PEDIDO_PAYMENT_NOT_REQUIRED,
    paymentIsGate: false,
    coveringIsCoOwner: false,
    listoAllocates: finishedGoodsReceiptAllocatesToOrder(),
    exitIsDelivery: false,
    productionOwnedByOrder: false,
    scopesWire: PEDIDO_SESSION_SCOPES_WIRE,
    scopesConfirmed,
  };
}

function coveringLabel(input: {
  grantsLoad: FactLoad<readonly CustomerCoverageGrant[]>;
  gate: PedidoGate;
  presentGrant: CustomerCoverageGrant | undefined;
  viewerIsCovering: boolean;
  label: string | null | undefined;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.grantsLoad.status === 'unavailable') return PEDIDO_FACT_UNAVAILABLE;
  if (input.grantsLoad.status === 'empty' || input.grantsLoad.value.length === 0 || !input.presentGrant) {
    return PEDIDO_NO_COVERAGE;
  }
  const named = input.viewerIsCovering ? input.label?.trim() : '';
  const who = named || 'Asesor que cubre';
  return `${who}. ${PEDIDO_COVERING_NOT_OWNER}`;
}

function classificationValue(
  gate: PedidoGate,
  load: FactLoad<PedidoClassificationInput | null>,
): string {
  const closed = closedCopy(gate);
  if (closed) return closed;
  if (load.status === 'unavailable') return PEDIDO_FACT_UNAVAILABLE;
  if (load.status === 'empty' || !load.value) return PEDIDO_UNCLASSIFIED_LABEL;
  return load.value.classification === 'special' ? PEDIDO_SPECIAL_LABEL : PEDIDO_NORMAL_LABEL;
}

function dateValue(input: {
  gate: PedidoGate;
  load: FactLoad<unknown>;
  recorded: { committedOn?: string } | null;
  formatted: string | null;
  emptyLabel: string;
  mismatched: boolean;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.load.status === 'unavailable' || input.mismatched) return PEDIDO_FACT_UNAVAILABLE;
  if (input.load.status === 'empty' || !input.recorded) return input.emptyLabel;
  return input.formatted ?? PEDIDO_FACT_UNAVAILABLE;
}

function productionDateLabel(input: {
  gate: PedidoGate;
  load: FactLoad<ProductionInternalTargetDate | null>;
  recorded: ProductionInternalTargetDate | null;
  formatted: string | null;
  classificationLoad: FactLoad<PedidoClassificationInput | null>;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.load.status === 'unavailable') return PEDIDO_FACT_UNAVAILABLE;
  if (input.recorded && input.formatted) return input.formatted;
  if (
    input.classificationLoad.status === 'loaded' &&
    input.classificationLoad.value?.classification === 'normal' &&
    input.classificationLoad.value.requiresProductionPlanning !== true
  ) {
    return PEDIDO_NORMAL_DATE_NA;
  }
  if (input.load.status === 'empty' || !input.recorded) return PEDIDO_NO_PRODUCTION_DATE;
  return PEDIDO_FACT_UNAVAILABLE;
}

function blockerField(
  gate: PedidoGate,
  cancelled: boolean,
  blocker: string | null,
  sourcesKnown: boolean,
): string {
  if (cancelled) return 'Pedido cancelado';
  const closed = closedCopy(gate);
  if (closed) return closed;
  if (!sourcesKnown) return PEDIDO_FACT_UNAVAILABLE;
  return blocker ?? PEDIDO_NO_BLOCKER;
}

function gatedText(gate: PedidoGate, value: string): string {
  if (value === 'Ninguna. El pedido está cancelado.' || value === 'No aplica.') return value;
  const closed = closedCopy(gate);
  if (closed) return closed;
  return value;
}

function allocationSummary(input: {
  gate: PedidoGate;
  load: FactLoad<readonly OrderAllocation[]>;
  organizationId: string;
  lineLabels: Readonly<Record<string, string>>;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.load.status === 'unavailable') return PEDIDO_FACT_UNAVAILABLE;
  if (receiptAllocatesToOrder()) return PEDIDO_NO_ALLOCATION;
  const rows = input.load.status === 'loaded' ? input.load.value : [];
  const sameTenant = rows.filter((row) => row.organizationId === input.organizationId);
  if (sameTenant.length === 0) return PEDIDO_NO_ALLOCATION;
  return sameTenant
    .map((row) => {
      const label = input.lineLabels[row.orderLineId]?.trim() || 'Línea registrada';
      const quantity = quantityAllocatedToOrderLine(sameTenant, input.organizationId, row.orderLineId);
      return `${label}: ${quantity}. Producto ${row.productId}.`;
    })
    .filter((line, index, all) => all.indexOf(line) === index)
    .join(' ');
}

function deliverySummary(input: {
  gate: PedidoGate;
  deliveries: FactLoad<readonly PedidoDeliveryStatusInput[]>;
  exits: FactLoad<readonly PedidoWarehouseExitInput[]>;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.deliveries.status === 'unavailable') return PEDIDO_FACT_UNAVAILABLE;
  const deliveries = input.deliveries.status === 'loaded' ? input.deliveries.value : [];
  if (deliveries.length === 0) {
    const exitNote =
      input.exits.status === 'loaded' && input.exits.value.length > 0
        ? ` ${PEDIDO_EXIT_IS_NOT_DELIVERY}`
        : '';
    return `${ENTREGA_PANEL_COPY.noDeliveryYet}${exitNote}`;
  }
  const latest = [...deliveries].sort((left, right) => right.deliveredAt.localeCompare(left.deliveredAt))[0];
  const when = formatWhen(latest?.deliveredAt) ?? PEDIDO_FACT_UNAVAILABLE;
  const what = latest?.description?.trim() || 'Entrega registrada';
  const quantity = latest?.quantity?.trim() ? ` Cantidad ${latest.quantity.trim()}.` : '';
  return `${what}. ${when}.${quantity} ${PEDIDO_EXIT_IS_NOT_DELIVERY}`;
}

function informedSummary(input: {
  gate: PedidoGate;
  issuesLoad: FactLoad<readonly ProductionIssue[]>;
  informedLoad: FactLoad<readonly CustomerInformedRecord[]>;
  issues: readonly ProductionIssue[];
  informed: readonly CustomerInformedRecord[];
  organizationId: string;
}): string {
  const closed = closedCopy(input.gate);
  if (closed) return closed;
  if (input.issuesLoad.status === 'unavailable' || input.informedLoad.status === 'unavailable') {
    return PEDIDO_FACT_UNAVAILABLE;
  }
  if (input.issues.length === 0) return PEDIDO_NO_CUSTOMER_NOTICE;
  const pending = input.issues.some(
    (issue) => customerNotifiedState(issue.id, input.organizationId, input.informed) === 'not_informed',
  );
  return pending ? CUSTOMER_NOT_INFORMED_LABEL : CUSTOMER_INFORMED_LABEL;
}

function latestChange(input: {
  gate: PedidoGate;
  order: PedidoOrderSnapshot;
  history: FactLoad<readonly PedidoHistoryEntry[]>;
  customer: CustomerCommittedDate | null;
  production: ProductionInternalTargetDate | null;
  classification: PedidoClassificationInput | null;
  classificationKnown: boolean;
}): string {
  const document: { at: string; label: string }[] = [
    { at: input.order.createdAt, label: 'Pedido creado' },
  ];
  if (input.order.cancelledAt) document.push({ at: input.order.cancelledAt, label: 'Pedido cancelado' });
  const documentLatest = [...document].sort((left, right) => right.at.localeCompare(left.at))[0];
  const documentText = documentLatest
    ? `${documentLatest.label}${formatWhen(documentLatest.at) ? ` · ${formatWhen(documentLatest.at)}` : ''}`
    : PEDIDO_FACT_UNAVAILABLE;

  const closed = closedCopy(input.gate);
  if (closed || input.history.status === 'unavailable') {
    return `${documentText}. ${PEDIDO_DOCUMENT_CHANGE_ONLY}`;
  }

  const changes = [...document];
  if (input.classificationKnown && input.classification) {
    changes.push({ at: input.classification.recordedAt, label: 'Clasificación' });
  }
  if (input.customer) changes.push({ at: input.customer.setAt, label: CUSTOMER_COMMITTED_DATE_LABEL });
  if (input.production) changes.push({ at: input.production.setAt, label: PRODUCTION_INTERNAL_TARGET_LABEL });
  for (const entry of input.history.status === 'loaded' ? input.history.value : []) {
    changes.push({ at: entry.occurredAt, label: entry.label });
  }
  const latest = [...changes].sort((left, right) => right.at.localeCompare(left.at))[0];
  if (!latest) return documentText;
  const when = formatWhen(latest.at);
  return when ? `${latest.label} · ${when}` : latest.label;
}

function sectionModel(
  id: PedidoCaseSectionId,
  gate: PedidoGate,
  ctx: {
    order: PedidoOrderSnapshot;
    totalLabel: string | null;
    quote: FactLoad<string | null>;
    lines: FactLoad<number>;
    customerDateValue: string;
    productionDateValue: string;
    allocationLoad: FactLoad<readonly OrderAllocation[]>;
    allocationValue: string;
    deliveryLoad: FactLoad<readonly PedidoDeliveryStatusInput[]>;
    deliveryValue: string;
    exitLoad: FactLoad<readonly PedidoWarehouseExitInput[]>;
    receiptLoad: FactLoad<readonly { productId: string; recordedAt: string }[]>;
    informedValue: string;
    historyLoad: FactLoad<readonly PedidoHistoryEntry[]>;
    organizationId: string;
    exceptionVisible: boolean;
  },
): PedidoSectionModel {
  const title = SECTION_TITLES[id];
  if (gate !== 'open') {
    return {
      id,
      title,
      gate,
      state: gate === 'denied' ? 'denied' : 'scopes_unconfirmed',
      lines: [closedCopy(gate) ?? PEDIDO_SECTION_DENIED],
      links: [],
    };
  }

  if (id === 'resumen') {
    return { id, title, gate, state: 'ready', lines: [], links: [] };
  }
  if (id === 'comercial') return comercialSection(ctx);
  if (id === 'fechas') {
    return {
      id,
      title,
      gate,
      state: 'ready',
      lines: [
        `${CUSTOMER_COMMITTED_DATE_LABEL}: ${ctx.customerDateValue}`,
        `${PRODUCTION_INTERNAL_TARGET_LABEL}: ${ctx.productionDateValue}`,
        'Se mantienen aparte.',
      ],
      links: [],
    };
  }
  if (id === 'compras') {
    return {
      id,
      title,
      gate,
      state: 'unavailable',
      lines: ['Las compras de este pedido no están cargadas. No se inventan.'],
      links: [{ href: PEDIDO_FUNCTION_ROUTES.compras, label: 'Compras' }],
    };
  }
  if (id === 'produccion') return productionSection(ctx);
  if (id === 'almacen') return warehouseSection(ctx);
  if (id === 'comunicacion') {
    const unavailableFact = ctx.informedValue === PEDIDO_FACT_UNAVAILABLE;
    return {
      id,
      title,
      gate,
      state: unavailableFact ? 'unavailable' : ctx.informedValue === PEDIDO_NO_CUSTOMER_NOTICE ? 'empty' : 'ready',
      lines: [ctx.informedValue, 'No se muestra un número de WhatsApp. No está cargado.'],
      links: [],
    };
  }
  if (id === 'entrega') return deliverySection(ctx);
  if (id === 'evidencia') {
    const lines = [ORDER_CASE_UNAVAILABLE, PEDIDO_PAYMENT_NOT_REQUIRED, PEDIDO_RELEASE_NOT_PAYMENT];
    if (ctx.exceptionVisible) {
      lines.push('Puede autorizar una excepción. Eso no confirma el pago.');
      lines.push(PEDIDO_EXCEPTION_SCOPE_NOTE);
    }
    return { id, title, gate, state: 'unavailable', lines, links: [] };
  }
  return historySection(ctx);
}

function comercialSection(ctx: {
  order: PedidoOrderSnapshot;
  totalLabel: string | null;
  quote: FactLoad<string | null>;
  lines: FactLoad<number>;
}): PedidoSectionModel {
  const lines = [`Estado: ${displayName(ctx.order.statusLabel)}`];
  if (ctx.totalLabel?.trim()) lines.push(`Total: ${ctx.totalLabel.trim()}`);
  if (ctx.quote.status === 'unavailable') lines.push('Cotización de origen: No disponible');
  else if (ctx.quote.status === 'empty' || !ctx.quote.value?.trim()) lines.push('Sin cotización de origen');
  else lines.push(`Cotización de origen: ${ctx.quote.value.trim()}`);
  if (ctx.lines.status === 'unavailable') lines.push('Líneas: No disponible');
  else if (ctx.lines.status === 'empty' || ctx.lines.value === 0) lines.push('Líneas: no se registraron.');
  else lines.push(`Líneas registradas: ${ctx.lines.value}`);
  const created = formatWhen(ctx.order.createdAt);
  if (created) lines.push(`Creado: ${created}`);
  lines.push(PEDIDO_PAYMENT_NOT_REQUIRED);
  return {
    id: 'comercial',
    title: SECTION_TITLES.comercial,
    gate: 'open',
    state: 'ready',
    lines,
    links: [],
  };
}

function productionSection(ctx: {
  allocationLoad: FactLoad<readonly OrderAllocation[]>;
  organizationId: string;
}): PedidoSectionModel {
  const lines: string[] = [PEDIDO_PRODUCTION_NOT_CHILD];
  if (ctx.allocationLoad.status !== 'loaded') {
    return {
      id: 'produccion',
      title: SECTION_TITLES.produccion,
      gate: 'open',
      state: 'unavailable',
      lines,
      links: [{ href: PEDIDO_FUNCTION_ROUTES.produccion, label: 'Producción' }],
    };
  }
  const rows = ctx.allocationLoad.value.filter((row) => row.organizationId === ctx.organizationId);
  if (rows.length === 0) {
    lines.push('Sin asignación, no se lista producción de este pedido.');
  } else {
    lines.push(PEDIDO_PRODUCTION_JOIN);
    for (const row of rows) {
      lines.push(`Producto ${row.productId}.`);
    }
  }
  return {
    id: 'produccion',
    title: SECTION_TITLES.produccion,
    gate: 'open',
    state: rows.length === 0 ? 'empty' : 'ready',
    lines,
    links: [{ href: PEDIDO_FUNCTION_ROUTES.produccion, label: 'Producción' }],
  };
}

function warehouseSection(ctx: {
  allocationLoad: FactLoad<readonly OrderAllocation[]>;
  allocationValue: string;
  receiptLoad: FactLoad<readonly { productId: string; recordedAt: string }[]>;
}): PedidoSectionModel {
  if (ctx.allocationLoad.status === 'unavailable') {
    return {
      id: 'almacen',
      title: SECTION_TITLES.almacen,
      gate: 'open',
      state: 'unavailable',
      lines: ['La asignación no está cargada. No se inventa.', PEDIDO_LISTO_NOT_OWNERSHIP],
      links: [{ href: PEDIDO_FUNCTION_ROUTES.almacen, label: 'Almacén' }],
    };
  }
  const lines = [ctx.allocationValue, PEDIDO_LISTO_NOT_OWNERSHIP];
  if (ctx.receiptLoad.status === 'loaded' && ctx.receiptLoad.value.length > 0) {
    lines.push('Hay un listo registrado. No asigna el producto a este pedido.');
  } else if (ctx.receiptLoad.status === 'unavailable') {
    lines.push('El listo no está cargado. No se usa como asignación.');
  }
  const empty = ctx.allocationValue === PEDIDO_NO_ALLOCATION;
  return {
    id: 'almacen',
    title: SECTION_TITLES.almacen,
    gate: 'open',
    state: empty ? 'empty' : 'ready',
    lines,
    links: [{ href: PEDIDO_FUNCTION_ROUTES.almacen, label: 'Almacén' }],
  };
}

function deliverySection(ctx: {
  deliveryLoad: FactLoad<readonly PedidoDeliveryStatusInput[]>;
  deliveryValue: string;
  exitLoad: FactLoad<readonly PedidoWarehouseExitInput[]>;
}): PedidoSectionModel {
  const lines = [ctx.deliveryValue, PEDIDO_EXIT_IS_NOT_DELIVERY, ENTREGA_PANEL_COPY.numberingUnknown];
  if (ctx.exitLoad.status === 'loaded' && ctx.exitLoad.value.length > 0) {
    lines.push('Hay una nota de salida. No cuenta como entrega.');
  } else if (ctx.exitLoad.status === 'unavailable') {
    lines.push('La nota de salida no está cargada. No se usa como entrega.');
  }
  const state =
    ctx.deliveryLoad.status === 'unavailable'
      ? 'unavailable'
      : ctx.deliveryValue.startsWith(ENTREGA_PANEL_COPY.noDeliveryYet)
        ? 'empty'
        : 'ready';
  return {
    id: 'entrega',
    title: SECTION_TITLES.entrega,
    gate: 'open',
    state,
    lines,
    links: [{ href: PEDIDO_FUNCTION_ROUTES.entregas, label: 'Entregas' }],
  };
}

function historySection(ctx: {
  historyLoad: FactLoad<readonly PedidoHistoryEntry[]>;
}): PedidoSectionModel {
  if (ctx.historyLoad.status === 'unavailable') {
    return {
      id: 'historial',
      title: SECTION_TITLES.historial,
      gate: 'open',
      state: 'unavailable',
      lines: ['El historial de este pedido no está cargado. No se inventa.'],
      links: [],
    };
  }
  const entries = ctx.historyLoad.status === 'loaded' ? ctx.historyLoad.value : [];
  if (entries.length === 0) {
    return {
      id: 'historial',
      title: SECTION_TITLES.historial,
      gate: 'open',
      state: 'empty',
      lines: ['Sin cambios de este pedido en el historial cargado.'],
      links: [],
    };
  }
  return {
    id: 'historial',
    title: SECTION_TITLES.historial,
    gate: 'open',
    state: 'ready',
    lines: entries.map((entry) => {
      const when = formatWhen(entry.occurredAt);
      const detail = entry.detail?.trim();
      return [entry.label, when, detail].filter(Boolean).join(' · ');
    }),
    links: [],
  };
}

export function answerValue(file: PedidoCaseFile, id: string): string {
  return file.answer.find((field) => field.id === id)?.value ?? PEDIDO_FACT_UNAVAILABLE;
}

export function pedidoSection(file: PedidoCaseFile, id: PedidoCaseSectionId): PedidoSectionModel {
  const section = file.sections.find((item) => item.id === id);
  if (!section) {
    return {
      id,
      title: SECTION_TITLES[id],
      gate: 'denied',
      state: 'denied',
      lines: [PEDIDO_SECTION_DENIED],
      links: [],
    };
  }
  return section;
}
