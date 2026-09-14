import { t } from '@/lib/i18n/es';
import { viewerHasManagementOrgRead } from '@/lib/management/scope';

export const MANAGEMENT_LANE_IDS = ['waiting', 'owner', 'attention'] as const;

export type ManagementLaneId = (typeof MANAGEMENT_LANE_IDS)[number];

export const NAMED_EXCEPTION_IDS = [
  'orders-awaiting-allocation',
  'customer-date-vs-production',
  'production-calendar-risk',
  'customer-not-informed',
  'purchase-requests-pending',
  'losses-by-product-process',
  'good-vs-lost-counts',
  'active-quemas',
  'finished-goods-awaiting-allocation',
  'allocated-orders-awaiting-exit',
  'warehouse-exit-awaiting-delivery',
  'delivered-orders',
  'missing-evidence',
] as const;

export type NamedExceptionId = (typeof NAMED_EXCEPTION_IDS)[number];

/**
 * A recorded exception row. Facts only: what is waiting, who handles it, what needs attention.
 * Not a money figure. Active kiln cycles stay their own label.
 */
export type ManagementExceptionRecord = {
  id: string;
  organizationId: string;
  exceptionId: NamedExceptionId;
  waitingOn: string;
  handledBy: string;
  attention: string;
};

export type ManagementExceptionQuery = {
  organizationId: string;
  exceptionId: NamedExceptionId;
  records: readonly ManagementExceptionRecord[];
};

export type ManagementExceptionCard = {
  id: string;
  exceptionId: NamedExceptionId;
  waitingOn: string;
  handledBy: string;
  attention: string;
};

export type NamedExceptionLabel = {
  id: NamedExceptionId;
  label: string;
  /** From the name itself. Owner is never inferred. */
  lane: Exclude<ManagementLaneId, 'owner'>;
  /** Null until that exception has a real query. Not zero. */
  recorded: null;
};

export type ManagementLensModel = {
  canReadOrg: boolean;
  /** Never a count. Absence is not zero. */
  orgCount: null;
  lanes: Array<{ id: ManagementLaneId; label: string }>;
  labels: NamedExceptionLabel[];
  cards: ManagementExceptionCard[] | null;
  emptyMessage: string;
  noRecord: string;
  ownerEmpty: string;
  orgFiguresHidden: string;
};

const LABEL_KEYS: Record<NamedExceptionId, string> = {
  'orders-awaiting-allocation': 'pages.inicio.exceptionOrdersAwaitingAllocation',
  'customer-date-vs-production': 'pages.inicio.exceptionCustomerDateVsProduction',
  'production-calendar-risk': 'pages.inicio.exceptionProductionCalendarRisk',
  'customer-not-informed': 'pages.inicio.exceptionCustomerNotInformed',
  'purchase-requests-pending': 'pages.inicio.exceptionPurchaseRequestsPending',
  'losses-by-product-process': 'pages.inicio.exceptionLossesByProductProcess',
  'good-vs-lost-counts': 'pages.inicio.exceptionGoodVsLostCounts',
  'active-quemas': 'pages.inicio.exceptionActiveQuemas',
  'finished-goods-awaiting-allocation': 'pages.inicio.exceptionFinishedGoodsAwaitingAllocation',
  'allocated-orders-awaiting-exit': 'pages.inicio.exceptionAllocatedOrdersAwaitingExit',
  'warehouse-exit-awaiting-delivery': 'pages.inicio.exceptionWarehouseExitAwaitingDelivery',
  'delivered-orders': 'pages.inicio.exceptionDeliveredOrders',
  'missing-evidence': 'pages.inicio.exceptionMissingEvidence',
};

const WAITING_IDS = new Set<NamedExceptionId>([
  'orders-awaiting-allocation',
  'purchase-requests-pending',
  'finished-goods-awaiting-allocation',
  'allocated-orders-awaiting-exit',
  'warehouse-exit-awaiting-delivery',
]);

/**
 * Production, delivery, customer-date, and the named exception reads are not on this branch.
 * Null is the honest result: do not synthesize a figure from orders or payments.
 */
export function recordedExceptionQueryOnBranch(): null {
  return null;
}

export function namedExceptionLabels(): NamedExceptionLabel[] {
  return NAMED_EXCEPTION_IDS.map((id) => ({
    id,
    label: t(LABEL_KEYS[id]),
    lane: WAITING_IDS.has(id) ? 'waiting' : 'attention',
    recorded: null,
  }));
}

/**
 * Cards only from a query proven to the viewer's organization and to one named exception.
 * A missing, foreign, or mixed tenant yields no cards and no number.
 * An empty same-tenant result is also no card — not a zero.
 */
export function cardsFromExceptionQuery(
  viewerOrganizationId: string,
  query: ManagementExceptionQuery | null,
): ManagementExceptionCard[] | null {
  if (!query) return null;
  const tenant = viewerOrganizationId.trim();
  if (!tenant || query.organizationId !== tenant) return null;
  if (
    query.records.some(
      (row) => row.organizationId !== tenant || row.exceptionId !== query.exceptionId,
    )
  ) {
    return null;
  }
  if (query.records.length === 0) return null;
  return query.records.map((row) => ({
    id: row.id,
    exceptionId: row.exceptionId,
    waitingOn: row.waitingOn,
    handledBy: row.handledBy,
    attention: row.attention,
  }));
}

export function composeManagementLens(input: {
  roleKeys: readonly string[];
  viewerOrganizationId: string | null;
  query: ManagementExceptionQuery | null;
}): ManagementLensModel {
  const canReadOrg = viewerHasManagementOrgRead(input.roleKeys);
  return {
    canReadOrg,
    orgCount: null,
    lanes: [
      { id: 'waiting', label: t('pages.inicio.managementWaiting') },
      { id: 'owner', label: t('pages.inicio.managementOwner') },
      { id: 'attention', label: t('pages.inicio.managementAttention') },
    ],
    labels: namedExceptionLabels(),
    cards: canReadOrg
      ? cardsFromExceptionQuery(input.viewerOrganizationId ?? '', input.query)
      : null,
    emptyMessage: t('pages.inicio.managementEmpty'),
    noRecord: t('pages.inicio.managementNoRecord'),
    ownerEmpty: t('pages.inicio.managementOwnerEmpty'),
    orgFiguresHidden: t('pages.inicio.managementOrgHidden'),
  };
}
