import type {
  CoordinationDecisionRecord,
  CustomerInformedRecord,
  FinishedGoodsReceiptQuantity,
  OperationalReleaseDecision,
  OperationalReleaseReversal,
  OrderAllocation,
  ProductionIssue,
  PurchaseRequest,
} from '@isalwa/os-contracts';
import type {
  CoordinationExceptionKind,
  CoordinationSourceCategory,
  MEETING_REPLACEMENT,
} from './copy';

/**
 * Connected source. NO_FACT means the caller already queried and found no rows.
 * That is not UNPROVEN and it is not a license to treat a missing sibling source as zero.
 */
export type ConnectedSource<T> =
  | { status: 'AVAILABLE'; facts: readonly T[] }
  | { status: 'NO_FACT' };

export type FailingSource =
  | { status: 'ERROR'; reason?: string }
  | { status: 'UNPROVEN'; reason?: string };

export type InjectedSource<T> = ConnectedSource<T> | FailingSource;

/**
 * A reader cannot be authorized here. Passing one records a denial.
 * It is never invoked, and it does not become AVAILABLE.
 */
export type DeniedPriorDecisionsReader = {
  status: 'DENIED';
  reason: 'no_coordination_read_capability';
};

export type PriorDecisionsSource =
  | InjectedSource<CoordinationDecisionRecord>
  | DeniedPriorDecisionsReader;

/**
 * Only an explicit recorded gap. An allocation row by itself is not awaiting exit.
 * Absence of a warehouse-exit row is not this fact.
 */
export type AllocationAwaitingExitFact = {
  id: string;
  organizationId: string;
  allocationId: string;
  orderId: string | null;
  awaitsWarehouseExit: true;
  explicit: true;
  recordedAt: string | null;
};

/**
 * An allocation row read from the company reader. Not an awaiting-exit gap.
 * A missing warehouse-exit row is not this fact, and this fact is not one.
 */
export type AllocationReaderCitation = {
  id: string;
  organizationId: string;
  awaitsWarehouseExit: false;
  explicit: false;
};

export type AllocationSourceFact = OrderAllocation | AllocationAwaitingExitFact | AllocationReaderCitation;

/**
 * Only an explicit recorded gap. A warehouse exit is not a customer delivery,
 * and a missing delivery row is not this fact.
 */
export type WarehouseExitAwaitingDeliveryFact = {
  id: string;
  organizationId: string;
  warehouseExitId: string;
  orderId: string | null;
  awaitsDelivery: true;
  explicit: true;
  recordedAt: string | null;
};

export type WarehouseExitCitation = {
  id: string;
  organizationId: string;
  orderId: string;
  exitedAt: string;
};

export type WarehouseExitSourceFact = WarehouseExitCitation | WarehouseExitAwaitingDeliveryFact;

export type DeliveryCitation = {
  id: string;
  organizationId: string;
  orderId: string;
  deliveredAt: string;
};

export type DeliverySourceFact = DeliveryCitation;

/**
 * Canonical informed records store notified: true only.
 * A missing record is NO_FACT, not "the customer was not told".
 * This exception requires an explicit negative the caller already holds.
 */
export type CustomerNotInformedFact = {
  id: string;
  organizationId: string;
  issueId: string;
  notified: false;
  explicit: true;
  recordedAt: string | null;
  note: string | null;
};

export type CustomerInformedSourceFact = CustomerInformedRecord | CustomerNotInformedFact;

/**
 * A held release is an explicit decision already recorded.
 * A missing release is not a hold. A released decision is not an exception.
 */
export type ExplicitReleaseExceptionFact = {
  id: string;
  organizationId: string;
  orderId: string | null;
  reason: string;
  explicit: true;
  recordedAt: string | null;
};

/**
 * A stored release that is not a hold. A missing release is not this fact.
 */
export type ReleaseReaderCitation = {
  id: string;
  organizationId: string;
  explicit: false;
};

export type ReleaseSourceFact =
  | OperationalReleaseDecision
  | OperationalReleaseReversal
  | ExplicitReleaseExceptionFact
  | ReleaseReaderCitation;

/**
 * A stored production issue the date-risk reader already holds.
 * Flags are copied. They are not inferred from committed or target dates.
 */
export type DateRiskSourceFact = ProductionIssue | DateRiskNonIssue;

/**
 * The risk reader returned a row that is not an explicit customer-date issue.
 * Not zero risk inferred from a calendar, and not UNPROVEN.
 */
export type DateRiskNonIssue = {
  id: string;
  organizationId: string;
  explicitCustomerDateRisk: false;
};

/**
 * A company production row from the operating reader.
 * A quema or trace is not a calendar issue and is not a date-risk flag.
 */
export type ProductionOperatingCitation = {
  id: string;
  organizationId: string;
  explicitCalendarIssue: false;
  recordedAt: string | null;
};

export type ProductionSourceFact = ProductionIssue | ProductionOperatingCitation;

/**
 * A purchase row whose stored status is not a known request status.
 * Unknown is not pending, and it is not zero purchases.
 */
export type PurchaseReaderCitation = {
  id: string;
  organizationId: string;
  pending: false;
};

export type PurchaseSourceFact = PurchaseRequest | PurchaseReaderCitation;

export type CoordinationInjectedSources = {
  dateRisk?: InjectedSource<DateRiskSourceFact> | null;
  production?: InjectedSource<ProductionSourceFact> | null;
  purchase?: InjectedSource<PurchaseSourceFact> | null;
  release?: InjectedSource<ReleaseSourceFact> | null;
  finishedGoods?: InjectedSource<FinishedGoodsReceiptQuantity> | null;
  allocation?: InjectedSource<AllocationSourceFact> | null;
  warehouseExit?: InjectedSource<WarehouseExitSourceFact> | null;
  delivery?: InjectedSource<DeliverySourceFact> | null;
  customerInformed?: InjectedSource<CustomerInformedSourceFact> | null;
  priorDecisions?: PriorDecisionsSource | null;
};

/**
 * Server-established session plus facts the caller already loaded.
 * Cargo, title, and a client organization are not authority and are not a tenant.
 */
export type CoordinationTrustedContext = {
  organizationId?: string | null;
  actorMemberId?: string | null;
  grantedScopes?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
  /**
   * Passed through to company operating readers. Missing is not active.
   * Cargo and title do not fill this in.
   */
  accessStatus?: string | null;
  /** Clock already trusted. Missing clock cannot mark a decision overdue. */
  asOf?: string | null;
  sources?: CoordinationInjectedSources | null;
  /**
   * Ignored as a call. No coordination read capability exists.
   * Presence without injected prior-decision facts denies that source.
   */
  priorDecisionsReader?: unknown;
};

export type SourceProofStatus = 'AVAILABLE' | 'NO_FACT' | 'UNPROVEN' | 'ERROR';

export type SourceProof = {
  category: CoordinationSourceCategory;
  status: SourceProofStatus;
  connected: boolean;
  /** Null when the source was not measured. An omitted source is not zero. */
  factCount: number | null;
  countedAsZero: boolean;
  actionableCount: number;
  reason: string | null;
};

export type CoordinationException = {
  id: string;
  organizationId: string;
  kind: CoordinationExceptionKind;
  subjectId: string | null;
  summary: string;
  recordedAt: string | null;
  priority: null;
  ownerMemberId: null;
  /** Copied only when the injected decision row already has it. Never from title or cargo. */
  recordedOwnerLabel: string | null;
  stock: null;
  revenue: null;
  margin: null;
  officialStock: false;
  predictsDelay: false;
  availableQuantity: string | null;
};

export type CoordinationDenial = 'unauthorized' | 'missing_organization';

export type CoordinationExceptionsResult = {
  ok: boolean;
  reason: 'ok' | CoordinationDenial;
  organizationId: string | null;
  exceptions: readonly CoordinationException[];
  displayCopy: string | null;
  sources: Record<CoordinationSourceCategory, SourceProof>;
  coverageComplete: boolean;
  canRegisterDecision: boolean;
  registerScope: 'coordination.decision.record' | null;
  performsWrite: false;
  meetingReplacement: typeof MEETING_REPLACEMENT;
  tuesdayStatusMeeting: typeof MEETING_REPLACEMENT;
  crossLaneChangeRequests: readonly [typeof import('./copy').CROSS_LANE_CHANGE_REQUEST];
  inventedCapabilities: readonly [];
};
