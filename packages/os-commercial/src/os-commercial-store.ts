import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  CommercialAccountRecord,
  DelegationRecord,
  IdempotencyRecord,
  MemberRecord,
  OpportunityRecord,
  OrderLineRecord,
  OrderRecord,
  PartyRecord,
  QuoteLineRecord,
  QuoteRecord,
  RoleAssignmentRecord,
} from './store-types';

export interface OsCommercialStore {
  runInTransaction<T>(fn: (store: OsCommercialStore) => Promise<T>): Promise<T>;

  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(memberId: string, organizationId?: string): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(memberId: string, organizationId?: string): Promise<DelegationRecord[]>;

  getPartyInOrg(organizationId: string, partyId: string): Promise<PartyRecord | null>;
  getCommercialAccountForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommercialAccountRecord | null>;
  getCommercialAccountInOrg(
    organizationId: string,
    commercialAccountId: string,
  ): Promise<CommercialAccountRecord | null>;
  updateCommercialAccount(
    organizationId: string,
    commercialAccountId: string,
    patch: Partial<Pick<CommercialAccountRecord, 'ownerMemberId' | 'version'>>,
    expectedVersion: number,
  ): Promise<void>;

  insertOpportunity(record: OpportunityRecord): Promise<void>;
  getOpportunityInOrg(organizationId: string, opportunityId: string): Promise<OpportunityRecord | null>;
  updateOpportunity(
    organizationId: string,
    opportunityId: string,
    patch: Partial<
      Pick<
        OpportunityRecord,
        | 'title'
        | 'stage'
        | 'status'
        | 'ownerMemberId'
        | 'expectedValueCentavos'
        | 'sourceMetadataJson'
        | 'closedAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;

  insertQuote(record: QuoteRecord): Promise<void>;
  getQuoteInOrg(organizationId: string, quoteId: string): Promise<QuoteRecord | null>;
  updateQuote(
    organizationId: string,
    quoteId: string,
    patch: Partial<
      Pick<
        QuoteRecord,
        | 'status'
        | 'notes'
        | 'subtotalCentavos'
        | 'headerDiscountCentavos'
        | 'totalCentavos'
        | 'submittedAt'
        | 'cancelledAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;
  countQuotesForOrg(organizationId: string): Promise<number>;

  insertQuoteLine(record: QuoteLineRecord): Promise<void>;
  getQuoteLineInOrg(organizationId: string, quoteLineId: string): Promise<QuoteLineRecord | null>;
  listQuoteLines(organizationId: string, quoteId: string): Promise<QuoteLineRecord[]>;
  updateQuoteLine(
    organizationId: string,
    quoteLineId: string,
    patch: Partial<
      Pick<
        QuoteLineRecord,
        | 'description'
        | 'quantity'
        | 'unitLabel'
        | 'unitPriceCentavos'
        | 'discountCentavos'
        | 'lineTotalCentavos'
        | 'productRef'
      >
    >,
  ): Promise<void>;
  deleteQuoteLine(organizationId: string, quoteLineId: string): Promise<void>;
  nextQuoteLineNumber(organizationId: string, quoteId: string): Promise<number>;

  insertOrder(record: OrderRecord): Promise<void>;
  insertOrderLines(records: OrderLineRecord[]): Promise<void>;
  listOrderLines(organizationId: string, orderId: string): Promise<OrderLineRecord[]>;
  getOrderInOrg(organizationId: string, orderId: string): Promise<OrderRecord | null>;
  getOrderForQuote(organizationId: string, quoteId: string): Promise<OrderRecord | null>;
  updateOrder(
    organizationId: string,
    orderId: string,
    patch: Partial<Pick<OrderRecord, 'status' | 'cancelledAt' | 'version'>>,
    expectedVersion: number,
  ): Promise<void>;
  countOrdersForOrg(organizationId: string): Promise<number>;

  /**
   * Active customer coverage grants for CreateOrder condition #2.
   * Organization is applied before filter. Never trust client-only grants.
   */
  listActiveCustomerCoverageGrants(input: {
    organizationId: string;
    customerPartyId: string;
    actingAdvisorMemberId: string;
    asOf: Date;
  }): Promise<
    Array<{
      grantType: 'commercial.customer.coverage';
      organizationId: string;
      customerPartyId: string;
      primaryOwnerMemberId: string;
      actingAdvisorMemberId: string;
      startsAt: Date;
      endsAt: Date | null;
      revokedAt: Date | null;
    }>
  >;

  /** Active grants for a party (any helper) — UI display. */
  listActiveCustomerCoverageForParty(input: {
    organizationId: string;
    customerPartyId: string;
    asOf: Date;
  }): Promise<
    Array<{
      id: string;
      grantType: 'commercial.customer.coverage';
      organizationId: string;
      customerPartyId: string;
      primaryOwnerMemberId: string;
      actingAdvisorMemberId: string;
      startsAt: Date;
      endsAt: Date | null;
      revokedAt: Date | null;
      recordedByMemberId: string | null;
    }>
  >;

  /** Persist a new temporary coverage grant (existing OsCustomerCoverageGrant model). */
  createCustomerCoverageGrant(input: {
    id: string;
    organizationId: string;
    customerPartyId: string;
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
    startsAt: Date;
    endsAt: Date | null;
    recordedAt: Date;
    recordedByMemberId: string;
  }): Promise<void>;

  /** Soft-revoke by setting revokedAt. Organization scoped. */
  revokeCustomerCoverageGrant(input: {
    organizationId: string;
    grantId: string;
    revokedAt: Date;
    recordedByMemberId: string;
  }): Promise<{
    id: string;
    customerPartyId: string;
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
  } | null>;

  getCustomerCoverageGrantInOrg(
    organizationId: string,
    grantId: string,
  ): Promise<{
    id: string;
    organizationId: string;
    customerPartyId: string;
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
    startsAt: Date;
    endsAt: Date | null;
    revokedAt: Date | null;
  } | null>;

  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
}
