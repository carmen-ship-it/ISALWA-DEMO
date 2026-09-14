/**
 * Spanish operating summary for one Pedido.
 * Dates stay on their own records. A release is not a confirmed payment.
 * Coverage names an acting advisor and does not change the primary owner.
 */

import {
  CUSTOMER_COMMITTED_DATE_LABEL,
  CUSTOMER_INFORMED_LABEL,
  CUSTOMER_NOT_INFORMED_LABEL,
  PRODUCTION_INTERNAL_TARGET_LABEL,
  continueCoveredCustomerWorkflow,
  customerNotifiedState,
  finishedGoodsReceiptAllocatesToOrder,
  quantityAllocatedToOrderLine,
  receiptAllocatesToOrder,
  releaseDecisionMayConfirmPayment,
  type CustomerCommittedDate,
  type CustomerCoverageGrant,
  type CustomerInformedRecord,
  type OrderAllocation,
  type ProductionInternalTargetDate,
  type ProductionIssue,
} from '@isalwa/os-contracts';
import {
  DELIVERY_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  hasExplicitScope,
} from '@isalwa/os-contracts';
import { COMMERCIAL_ORG_READ_SCOPE, COMMERCIAL_TEAM_READ_SCOPE } from '@isalwa/os-contracts';
import type { OrderCaseFactInput, OrderCaseReleaseInput } from '@/lib/operations/operational-case';
import {
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  canAuthorizeCommercialException,
  cargoGrantsExceptionAuthorization,
  type PedidoSession,
} from '@/lib/operations/pedido-access';
import {
  PEDIDO_FUNCTION_ROUTES,
  type PedidoFunctionRoute,
} from '@/lib/navigation/requests/pedido';

export const PEDIDO_WHAT_KIND = 'Pedido' as const;
export const PEDIDO_SPECIAL_LABEL = 'Pedido especial' as const;
export const PEDIDO_NORMAL_LABEL = 'Pedido normal' as const;
export const PEDIDO_UNCLASSIFIED_LABEL = 'Sin clasificación registrada' as const;
export const PEDIDO_PLANNING_LABEL = 'Requiere planificación de producción' as const;
export const PEDIDO_NO_CUSTOMER_DATE = 'Sin fecha con el cliente' as const;
export const PEDIDO_NO_PRODUCTION_DATE = 'Sin fecha interna de producción' as const;
export const PEDIDO_NO_ALLOCATION = 'No hay registro de asignación.' as const;
export const PEDIDO_NO_BLOCKER = null;
export const PEDIDO_LISTO_NOT_OWNERSHIP =
  'Listo no hace dueño del producto a este pedido.' as const;
export const PEDIDO_RELEASE_NOT_PAYMENT = 'Esta decisión no confirma el pago.' as const;
export const PEDIDO_PAYMENT_NOT_REQUIRED =
  'El pago no es siempre requisito. Seguir con el pedido no confirma el pago.' as const;
export const PEDIDO_EXCEPTION_SCOPE_NOTE =
  'Autorizar una excepción requiere el permiso commercial.exception.authorize. El cargo no lo otorga.' as const;
export const PEDIDO_NO_SHARED_OWNERSHIP = 'Hay un responsable principal. La cobertura no comparte la propiedad.' as const;
export const PEDIDO_NO_CUSTOMER_NOTICE = 'Sin aviso registrado' as const;

export type PedidoClassificationInput = {
  classification: 'normal' | 'special';
  requiresProductionPlanning: boolean;
  actorLabel: string;
  source: 'human_explicit';
  recordedAt: string;
};

export type PedidoDeliveryFact = {
  description: string;
  quantity: string;
};

export type PedidoReceiptFact = {
  productLabel: string;
  recordedAt: string;
};

export type PedidoOrderSnapshot = {
  organizationId: string;
  orderId: string;
  orderNumber: string;
  partyId: string;
  customerName: string;
  ownerMemberId: string;
  ownerLabel: string;
  statusLabel: string;
  createdAt: string;
  cancelledAt: string | null;
};

export type PedidoSectionId =
  | 'summary'
  | 'dates'
  | 'classification'
  | 'release'
  | 'allocation'
  | 'lines'
  | 'operationalCase'
  | 'productionLink'
  | 'warehouseLink'
  | 'purchasingLink'
  | 'deliveryLink'
  | 'exceptionAuthorize';

export type PedidoDateField = {
  label: typeof CUSTOMER_COMMITTED_DATE_LABEL | typeof PRODUCTION_INTERNAL_TARGET_LABEL;
  value: string;
  recorded: boolean;
};

export type PedidoOperatingView = {
  what: string;
  statusLabel: string;
  owner: {
    primaryMemberId: string;
    primaryLabel: string;
    actingAdvisorMemberId: string | null;
    actingAdvisorLabel: string | null;
    sharedOwnership: false;
    note: typeof PEDIDO_NO_SHARED_OWNERSHIP;
  };
  customerDate: PedidoDateField;
  productionDate: PedidoDateField;
  classificationLabel: string;
  planningLabel: string | null;
  blocker: string | null;
  nextAction: string;
  responsibleFunction: string;
  customerInformed: string;
  latestChange: { label: string; at: string | null };
  release: {
    title: string;
    confirmsPayment: false;
    boundary: string;
  } | null;
  paymentNotRequired: typeof PEDIDO_PAYMENT_NOT_REQUIRED;
  exceptionScope: typeof COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE;
  exceptionNote: typeof PEDIDO_EXCEPTION_SCOPE_NOTE;
  cargoGrantsException: false;
  canAuthorizeException: boolean;
  listo: { message: typeof PEDIDO_LISTO_NOT_OWNERSHIP; ownsFinishedGoods: false } | null;
  fulfillment:
    | { recorded: false; message: typeof PEDIDO_NO_ALLOCATION }
    | {
        recorded: true;
        items: { label: string; allocatedQuantity: string; deliveredQuantity: string | null }[];
      };
  laneLinks: { href: PedidoFunctionRoute; label: string }[];
  sections: Record<PedidoSectionId, boolean>;
  order: {
    orderNumber: string;
    customerName: string;
    statusLabel: string;
  };
};

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
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function hasScope(scopes: readonly string[], scope: string): boolean {
  return hasExplicitScope(scopes, scope);
}

export function pedidoSectionFlags(input: {
  grantedScopes: readonly string[];
  isOwner: boolean;
  coverageAllowed: boolean;
  apiAuthorizedDocument: boolean;
  nextLane: PedidoFunctionRoute | null;
  cargo?: string | null;
  title?: string | null;
}): Record<PedidoSectionId, boolean> {
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
  const document = input.apiAuthorizedDocument;

  const next = input.nextLane;
  return {
    summary: commercial || document,
    dates: commercial || document,
    classification: commercial || document,
    release: commercial || finance || exception,
    allocation: commercial || warehouse || delivery || coordinator,
    lines: commercial || document,
    operationalCase: commercial || finance || exception || document,
    productionLink: production || coordinator || management || next === PEDIDO_FUNCTION_ROUTES.produccion,
    warehouseLink: warehouse || coordinator || management || next === PEDIDO_FUNCTION_ROUTES.almacen,
    purchasingLink: purchasing || coordinator || management || next === PEDIDO_FUNCTION_ROUTES.compras,
    deliveryLink: delivery || coordinator || management || next === PEDIDO_FUNCTION_ROUTES.entregas,
    exceptionAuthorize:
      exception && cargoGrantsExceptionAuthorization(input.cargo, input.title) === false,
  };
}

function latestRelease(releases: readonly OrderCaseReleaseInput[]): OrderCaseReleaseInput | null {
  const open = releases.filter((item) => !item.reversalReason);
  if (open.length === 0) return null;
  return [...open].sort((left, right) => right.decidedAt.localeCompare(left.decidedAt))[0] ?? null;
}

function informedLabel(
  issues: readonly ProductionIssue[],
  informed: readonly CustomerInformedRecord[],
  organizationId: string,
): string {
  if (issues.length === 0) return PEDIDO_NO_CUSTOMER_NOTICE;
  const pending = issues.some(
    (issue) => customerNotifiedState(issue.id, organizationId, informed) === 'not_informed',
  );
  return pending ? CUSTOMER_NOT_INFORMED_LABEL : CUSTOMER_INFORMED_LABEL;
}

function fulfillmentOf(input: {
  allocations: readonly OrderAllocation[] | null | undefined;
  deliveries: readonly PedidoDeliveryFact[] | null | undefined;
  lineLabels: Readonly<Record<string, string>>;
  organizationId: string;
}): PedidoOperatingView['fulfillment'] {
  const allocations = input.allocations ?? [];
  const deliveries = input.deliveries ?? [];
  if (allocations.length === 0 && deliveries.length === 0) {
    return { recorded: false, message: PEDIDO_NO_ALLOCATION };
  }
  if (receiptAllocatesToOrder()) {
    return { recorded: false, message: PEDIDO_NO_ALLOCATION };
  }
  const allocated = [...new Set(allocations.map((item) => item.orderLineId))].map((orderLineId) => ({
    label: input.lineLabels[orderLineId]?.trim() || 'Línea registrada',
    allocatedQuantity: quantityAllocatedToOrderLine(allocations, input.organizationId, orderLineId),
    deliveredQuantity: null as string | null,
  }));
  const delivered = deliveries.map((item) => ({
    label: item.description,
    allocatedQuantity: item.quantity,
    deliveredQuantity: item.quantity,
  }));
  return { recorded: true, items: [...allocated, ...delivered] };
}

export function buildPedidoOperatingView(input: {
  order: PedidoOrderSnapshot;
  actorMemberId: string | null;
  grantedScopes?: readonly string[];
  cargo?: string | null;
  title?: string | null;
  asOf: Date;
  grants?: readonly CustomerCoverageGrant[];
  apiAuthorizedDocument?: boolean;
  actingAdvisorLabel?: string | null;
  customerDate?: CustomerCommittedDate | null;
  productionDate?: ProductionInternalTargetDate | null;
  issues?: readonly ProductionIssue[];
  informed?: readonly CustomerInformedRecord[];
  classification?: PedidoClassificationInput | null;
  releases?: readonly OrderCaseReleaseInput[];
  facts?: readonly OrderCaseFactInput[];
  allocations?: readonly OrderAllocation[] | null;
  deliveries?: readonly PedidoDeliveryFact[] | null;
  lineLabels?: Readonly<Record<string, string>>;
  receipt?: PedidoReceiptFact | null;
}): PedidoOperatingView {
  const scopes = input.grantedScopes ?? [];
  const grants = input.grants ?? [];
  const coverage =
    input.actorMemberId == null
      ? null
      : continueCoveredCustomerWorkflow({
          actorMemberId: input.actorMemberId,
          organizationId: input.order.organizationId,
          customerPartyId: input.order.partyId,
          primaryOwnerMemberId: input.order.ownerMemberId,
          grants,
          asOf: input.asOf,
        });
  const acting =
    coverage?.allowed === true
      ? grants.find(
          (grant) =>
            grant.actingAdvisorMemberId === input.actorMemberId &&
            grant.customerPartyId === input.order.partyId &&
            grant.primaryOwnerMemberId === input.order.ownerMemberId,
        )
      : undefined;

  const customerRecorded =
    input.customerDate?.organizationId === input.order.organizationId &&
    input.customerDate.subjectId === input.order.orderId
      ? input.customerDate
      : null;
  const productionRecorded =
    input.productionDate?.organizationId === input.order.organizationId &&
    input.productionDate.subjectId === input.order.orderId
      ? input.productionDate
      : null;

  const classification = input.classification ?? null;
  const special = classification?.classification === 'special';
  const planning = classification?.requiresProductionPlanning === true;
  const issues = (input.issues ?? []).filter(
    (issue) =>
      issue.organizationId === input.order.organizationId && issue.subjectId === input.order.orderId,
  );
  const pendingCustomerIssue = issues.find(
    (issue) =>
      issue.mayAffectCustomerDate &&
      customerNotifiedState(issue.id, input.order.organizationId, input.informed ?? []) === 'not_informed',
  );
  const release = latestRelease(input.releases ?? []);
  const held = release?.state === 'held';

  let blocker: string | null = null;
  let nextAction = 'Seguir el pedido';
  let responsibleFunction = 'Comercial';
  let nextLane: PedidoFunctionRoute | null = null;
  if (pendingCustomerIssue) {
    blocker = pendingCustomerIssue.note?.trim() || 'Puede afectar la fecha del cliente';
    nextAction = 'Avisar al cliente';
    responsibleFunction = 'Comercial';
  } else if (held) {
    blocker = 'Todavía no se sigue con el pedido';
    nextAction = 'Revisar si se puede seguir';
    responsibleFunction = release?.basis === 'authorized_other' ? 'Jefe o Gerencia' : 'Comercial';
  } else if (special && planning) {
    blocker = PEDIDO_PLANNING_LABEL;
    nextAction = 'Registrar la planificación de producción';
    responsibleFunction = 'Producción';
    nextLane = PEDIDO_FUNCTION_ROUTES.produccion;
  }

  const session: PedidoSession = {
    organizationId: input.order.organizationId,
    memberId: input.actorMemberId ?? '',
    grantedScopes: scopes,
    cargo: input.cargo,
    title: input.title,
    asOf: input.asOf,
  };

  const changes: { at: string; label: string }[] = [
    { at: input.order.createdAt, label: 'Pedido creado' },
  ];
  if (input.order.cancelledAt) changes.push({ at: input.order.cancelledAt, label: 'Pedido cancelado' });
  if (classification) changes.push({ at: classification.recordedAt, label: 'Clasificación' });
  if (customerRecorded) changes.push({ at: customerRecorded.setAt, label: CUSTOMER_COMMITTED_DATE_LABEL });
  if (productionRecorded) changes.push({ at: productionRecorded.setAt, label: PRODUCTION_INTERNAL_TARGET_LABEL });
  if (release) changes.push({ at: release.decidedAt, label: 'Decisión de seguir' });
  for (const fact of input.facts ?? []) changes.push({ at: fact.recordedAt, label: 'Anotación' });
  for (const notice of input.informed ?? []) {
    if (notice.organizationId === input.order.organizationId) {
      changes.push({ at: notice.recordedAt, label: CUSTOMER_INFORMED_LABEL });
    }
  }
  const latest = [...changes].sort((left, right) => right.at.localeCompare(left.at))[0];

  const sections = pedidoSectionFlags({
    grantedScopes: scopes,
    isOwner: input.actorMemberId === input.order.ownerMemberId,
    coverageAllowed: coverage?.allowed === true,
    apiAuthorizedDocument: input.apiAuthorizedDocument === true,
    nextLane,
    cargo: input.cargo,
    title: input.title,
  });

  const laneLinks = (
    [
      ['productionLink', PEDIDO_FUNCTION_ROUTES.produccion, 'Producción'],
      ['warehouseLink', PEDIDO_FUNCTION_ROUTES.almacen, 'Almacén'],
      ['purchasingLink', PEDIDO_FUNCTION_ROUTES.compras, 'Compras'],
      ['deliveryLink', PEDIDO_FUNCTION_ROUTES.entregas, 'Entregas'],
    ] as const
  )
    .filter(([section]) => sections[section])
    .map(([, href, label]) => ({ href, label }));

  const listo =
    input.receipt && finishedGoodsReceiptAllocatesToOrder() === false
      ? { message: PEDIDO_LISTO_NOT_OWNERSHIP, ownsFinishedGoods: false as const }
      : null;

  return {
    what: `${PEDIDO_WHAT_KIND} ${input.order.orderNumber}`,
    statusLabel: input.order.statusLabel,
    owner: {
      primaryMemberId: input.order.ownerMemberId,
      primaryLabel: input.order.ownerLabel,
      actingAdvisorMemberId: acting?.actingAdvisorMemberId ?? null,
      actingAdvisorLabel: acting
        ? input.actingAdvisorLabel?.trim() || 'Asesor que cubre'
        : null,
      sharedOwnership: false,
      note: PEDIDO_NO_SHARED_OWNERSHIP,
    },
    customerDate: {
      label: CUSTOMER_COMMITTED_DATE_LABEL,
      value: formatCalendar(customerRecorded?.committedOn) ?? PEDIDO_NO_CUSTOMER_DATE,
      recorded: customerRecorded !== null,
    },
    productionDate: {
      label: PRODUCTION_INTERNAL_TARGET_LABEL,
      value: formatCalendar(productionRecorded?.targetOn) ?? PEDIDO_NO_PRODUCTION_DATE,
      recorded: productionRecorded !== null,
    },
    classificationLabel: !classification
      ? PEDIDO_UNCLASSIFIED_LABEL
      : special
        ? PEDIDO_SPECIAL_LABEL
        : PEDIDO_NORMAL_LABEL,
    planningLabel: planning ? PEDIDO_PLANNING_LABEL : null,
    blocker,
    nextAction,
    responsibleFunction,
    customerInformed: informedLabel(issues, input.informed ?? [], input.order.organizationId),
    latestChange: {
      label: latest?.label ?? 'Pedido creado',
      at: formatWhen(latest?.at ?? null),
    },
    release: release
      ? {
          title: release.state === 'released' ? 'Se puede seguir con el pedido' : 'Todavía no se sigue con el pedido',
          confirmsPayment: releaseDecisionMayConfirmPayment(),
          boundary: PEDIDO_RELEASE_NOT_PAYMENT,
        }
      : null,
    paymentNotRequired: PEDIDO_PAYMENT_NOT_REQUIRED,
    exceptionScope: COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
    exceptionNote: PEDIDO_EXCEPTION_SCOPE_NOTE,
    cargoGrantsException: cargoGrantsExceptionAuthorization(input.cargo, input.title),
    canAuthorizeException: canAuthorizeCommercialException(session),
    listo,
    fulfillment: fulfillmentOf({
      allocations: input.allocations,
      deliveries: input.deliveries,
      lineLabels: input.lineLabels ?? {},
      organizationId: input.order.organizationId,
    }),
    laneLinks,
    sections,
    order: {
      orderNumber: input.order.orderNumber,
      customerName: input.order.customerName,
      statusLabel: input.order.statusLabel,
    },
  };
}
