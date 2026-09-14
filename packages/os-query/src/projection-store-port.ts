import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  ListAttentionQuery,
  ListOpenWorkQuery,
  ListOpportunitiesQuery,
  ListOrdersQuery,
  ListPartyTimelineQuery,
  ListPendingApprovalsQuery,
  ListQuotesQuery,
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  PartySummaryReadModel,
  PartyTimelineFacts,
  ProjectionFreshness,
  QuoteLineReadModel,
  QuoteSummaryReadModel,
  SearchPartiesQuery,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';

export type StoredPartyReadModel = PartySummaryReadModel & {
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type StoredWorkReadModel = WorkSummaryReadModel & {
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  lastReassignedAt: Date | null;
  updatedAt: Date;
};

export type StoredApprovalReadModel = ApprovalSummaryReadModel & {
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type StoredAttentionReadModel = AttentionItemReadModel & {
  derivedAt: Date;
  updatedAt: Date;
};

export type StoredOpportunityReadModel = {
  opportunityId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  ownerMemberId: string;
  title: string;
  stage: string;
  status: string;
  expectedValueCentavos: bigint | null;
  closedAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type StoredQuoteReadModel = {
  quoteId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  opportunityId: string | null;
  ownerMemberId: string;
  quoteNumber: string;
  status: string;
  currency: string;
  subtotalCentavos: bigint;
  headerDiscountCentavos: bigint;
  totalCentavos: bigint;
  revisionNumber: number;
  notes: string | null;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type StoredQuoteLineReadModel = {
  quoteLineId: string;
  organizationId: string;
  quoteId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: bigint;
  discountCentavos: bigint;
  lineTotalCentavos: bigint;
  productRef: string | null;
  updatedAt: Date;
};

export type StoredOrderReadModel = {
  orderId: string;
  organizationId: string;
  partyId: string;
  commercialAccountId: string | null;
  quoteId: string;
  ownerMemberId: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalCentavos: bigint;
  headerDiscountCentavos: bigint;
  totalCentavos: bigint;
  cancelledAt: Date | null;
  createdAt: Date;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type StoredPartyTimelineEntry = {
  entryId: string;
  organizationId: string;
  partyId: string;
  eventType: string;
  occurredAt: Date;
  actorMemberId: string | null;
  correlationId: string;
  primaryEntityType: string;
  primaryEntityId: string;
  factsJson: PartyTimelineFacts;
  updatedAt: Date;
};

export type ProjectionCheckpoint = {
  organizationId: string;
  consumerKey: string;
  lastEventId: string | null;
  lastOccurredAt: Date | null;
  updatedAt: Date;
};

export type ReplayBusinessEvent = {
  id: string;
  organizationId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: Date;
  recordedAt: Date;
  actorMemberId: string | null;
  primaryEntityType: string;
  primaryEntityId: string;
  correlationId: string;
  payloadJson: Record<string, unknown> | null;
};

/** Server-only list constraints. Clients cannot set these fields. */
export type ServerListConstraints = {
  ownerMemberIds?: readonly string[];
  dueBefore?: Date;
  subjectTypes?: readonly string[];
};

export interface OsProjectionStorePort {
  upsertPartyReadModel(model: StoredPartyReadModel): Promise<void>;
  getPartyReadModel(organizationId: string, partyId: string): Promise<StoredPartyReadModel | null>;
  deletePartyReadModelsForOrg(organizationId: string): Promise<void>;
  searchParties(
    organizationId: string,
    query: SearchPartiesQuery,
  ): Promise<{ items: StoredPartyReadModel[]; hasMore: boolean }>;

  upsertWorkReadModel(model: StoredWorkReadModel): Promise<void>;
  getWorkReadModel(organizationId: string, workItemId: string): Promise<StoredWorkReadModel | null>;
  listWorkReadModels(
    organizationId: string,
    query: ListOpenWorkQuery & ServerListConstraints,
  ): Promise<{ items: StoredWorkReadModel[]; hasMore: boolean }>;
  deleteWorkReadModelsForOrg(organizationId: string): Promise<void>;

  upsertApprovalReadModel(model: StoredApprovalReadModel): Promise<void>;
  getApprovalReadModel(
    organizationId: string,
    approvalRequestId: string,
  ): Promise<StoredApprovalReadModel | null>;
  listApprovalReadModels(
    organizationId: string,
    query: ListPendingApprovalsQuery,
  ): Promise<{ items: StoredApprovalReadModel[]; hasMore: boolean }>;
  deleteApprovalReadModelsForOrg(organizationId: string): Promise<void>;
  findPendingApprovalForWork(
    organizationId: string,
    workItemId: string,
  ): Promise<StoredApprovalReadModel | null>;

  replaceAttentionReadModels(
    organizationId: string,
    items: StoredAttentionReadModel[],
  ): Promise<void>;
  /**
   * Re-derive attention for one organization from current work and approval read models.
   * Must serialize per organization (event rebuild and clock refresh share this path)
   * and re-read work status inside that serialization so a completion cannot be
   * overwritten by a stale overdue snapshot.
   */
  rebuildAttentionForOrganization(organizationId: string, asOf: Date): Promise<void>;
  /**
   * Organizations where open work has crossed dueAt, or an overdue_work row no longer
   * matches open past-due work. Empty when the stored projection already matches the clock.
   */
  listOrganizationIdsNeedingOverdueRefresh(asOf: Date): Promise<string[]>;
  listAttentionReadModels(
    organizationId: string,
    memberId: string,
    query: ListAttentionQuery,
  ): Promise<{ items: StoredAttentionReadModel[]; hasMore: boolean }>;
  deleteAttentionReadModelsForOrg(organizationId: string): Promise<void>;
  listWorkReadModelsForOrg(organizationId: string): Promise<StoredWorkReadModel[]>;
  listApprovalReadModelsForOrg(organizationId: string): Promise<StoredApprovalReadModel[]>;

  upsertOpportunityReadModel(model: StoredOpportunityReadModel): Promise<void>;
  getOpportunityReadModel(
    organizationId: string,
    opportunityId: string,
  ): Promise<StoredOpportunityReadModel | null>;
  listOpportunityReadModels(
    organizationId: string,
    query: ListOpportunitiesQuery & ServerListConstraints,
  ): Promise<{ items: StoredOpportunityReadModel[]; hasMore: boolean }>;
  deleteOpportunityReadModelsForOrg(organizationId: string): Promise<void>;

  upsertQuoteReadModel(model: StoredQuoteReadModel): Promise<void>;
  getQuoteReadModel(organizationId: string, quoteId: string): Promise<StoredQuoteReadModel | null>;
  listQuoteReadModels(
    organizationId: string,
    query: ListQuotesQuery & ServerListConstraints,
  ): Promise<{ items: StoredQuoteReadModel[]; hasMore: boolean }>;
  deleteQuoteReadModelsForOrg(organizationId: string): Promise<void>;

  replaceQuoteLineReadModels(
    organizationId: string,
    quoteId: string,
    lines: StoredQuoteLineReadModel[],
  ): Promise<void>;
  listQuoteLineReadModels(
    organizationId: string,
    quoteId: string,
  ): Promise<StoredQuoteLineReadModel[]>;
  deleteQuoteLineReadModelsForOrg(organizationId: string): Promise<void>;

  upsertOrderReadModel(model: StoredOrderReadModel): Promise<void>;
  getOrderReadModel(organizationId: string, orderId: string): Promise<StoredOrderReadModel | null>;
  listOrderReadModels(
    organizationId: string,
    query: ListOrdersQuery,
  ): Promise<{ items: StoredOrderReadModel[]; hasMore: boolean }>;
  deleteOrderReadModelsForOrg(organizationId: string): Promise<void>;

  upsertPartyTimelineEntry(entry: StoredPartyTimelineEntry): Promise<void>;
  listPartyTimelineEntries(
    organizationId: string,
    partyId: string,
    query: ListPartyTimelineQuery,
  ): Promise<{ items: StoredPartyTimelineEntry[]; hasMore: boolean }>;
  deletePartyTimelineEntriesForOrg(organizationId: string): Promise<void>;
  countPartyTimelineEntries(organizationId: string, partyId: string): Promise<number>;

  getCheckpoint(organizationId: string, consumerKey: string): Promise<ProjectionCheckpoint | null>;
  upsertCheckpoint(checkpoint: ProjectionCheckpoint): Promise<void>;

  getFreshness(organizationId: string, consumerKey: string): Promise<ProjectionFreshness | null>;
  upsertFreshness(
    organizationId: string,
    consumerKey: string,
    patch: Partial<Omit<ProjectionFreshness, 'organizationId' | 'consumerKey'>>,
  ): Promise<ProjectionFreshness>;

  countPendingOutbox(organizationId: string): Promise<number>;
  listEventsForReplay(
    organizationId: string,
    eventTypes: readonly string[],
    afterOccurredAt?: Date | null,
  ): Promise<ReplayBusinessEvent[]>;

  truncateProjectionsForOrg(organizationId: string): Promise<void>;
}
