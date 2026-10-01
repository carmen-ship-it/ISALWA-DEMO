import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  PaginatedMeta,
  PartyTimelineEntryReadModel,
  ProjectionFreshness,
  QuoteDetailReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import type { OrderLineView } from '@/lib/commercial/order-lines';

export type CommercialListResponse<T> = {
  items: T[];
  meta: PaginatedMeta;
  /** Null when no projection consumer checkpoint exists yet (query contract). */
  freshness: ProjectionFreshness | null;
};

export type OpportunityListResponse = CommercialListResponse<OpportunitySummaryReadModel>;
export type QuoteListResponse = CommercialListResponse<QuoteSummaryReadModel>;
export type OrderListResponse = CommercialListResponse<OrderSummaryReadModel>;

export type OpportunityDetailResponse = {
  opportunity: OpportunitySummaryReadModel;
  freshness: ProjectionFreshness | null;
};

export type CommercialSubjectAuthority = {
  canConvertToOrder: boolean;
  canRequestApproval: boolean;
};

export type QuoteDetailResponse = {
  quote: QuoteDetailReadModel;
  freshness: ProjectionFreshness | null;
  authority?: CommercialSubjectAuthority;
};

export type OrderDetailResponse = {
  order: OrderSummaryReadModel & {
    /** Null or omitted when line snapshots were not loaded. Empty means not recorded. */
    lines?: OrderLineView[] | null;
  };
  freshness: ProjectionFreshness | null;
  authority?: CommercialSubjectAuthority;
};

export type ActiveMemberOption = {
  memberId: string;
  displayName: string;
};

export type SubjectApprovalItem = {
  approvalRequestId: string;
  subjectType: string;
  subjectId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  status: string;
  decisionReason: string | null;
  decidedAt: string | null;
  canDecide: boolean;
};

export type PartyTimelineResponse = CommercialListResponse<PartyTimelineEntryReadModel>;

export type SafeFetchResult<T> = T | 'unavailable';
