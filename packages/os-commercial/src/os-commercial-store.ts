import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  CommercialAccountRecord,
  DelegationRecord,
  IdempotencyRecord,
  MemberRecord,
  OpportunityRecord,
  OrderRecord,
  PartyRecord,
  QuoteLineRecord,
  QuoteRecord,
  RoleAssignmentRecord,
} from './store-types';

export interface OsCommercialStore {
  runInTransaction<T>(fn: (store: OsCommercialStore) => Promise<T>): Promise<T>;

  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(memberId: string): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(memberId: string): Promise<DelegationRecord[]>;

  getPartyInOrg(organizationId: string, partyId: string): Promise<PartyRecord | null>;
  getCommercialAccountForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommercialAccountRecord | null>;
  getCommercialAccountInOrg(
    organizationId: string,
    commercialAccountId: string,
  ): Promise<CommercialAccountRecord | null>;

  insertOpportunity(record: OpportunityRecord): Promise<void>;
  getOpportunityInOrg(organizationId: string, opportunityId: string): Promise<OpportunityRecord | null>;
  updateOpportunity(
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
  deleteQuoteLine(quoteLineId: string): Promise<void>;
  nextQuoteLineNumber(quoteId: string): Promise<number>;

  insertOrder(record: OrderRecord): Promise<void>;
  getOrderInOrg(organizationId: string, orderId: string): Promise<OrderRecord | null>;
  getOrderForQuote(organizationId: string, quoteId: string): Promise<OrderRecord | null>;
  updateOrder(
    orderId: string,
    patch: Partial<Pick<OrderRecord, 'status' | 'cancelledAt' | 'version'>>,
    expectedVersion: number,
  ): Promise<void>;
  countOrdersForOrg(organizationId: string): Promise<number>;

  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
}
