import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  PaginatedMeta,
  PartyTimelineEntryReadModel,
  ProjectionFreshness,
  QuoteDetailReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';

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

export type QuoteDetailResponse = {
  quote: QuoteDetailReadModel;
  freshness: ProjectionFreshness | null;
};

export type OrderDetailResponse = {
  order: OrderSummaryReadModel;
  freshness: ProjectionFreshness | null;
};

export type PartyTimelineResponse = CommercialListResponse<PartyTimelineEntryReadModel>;

export type SafeFetchResult<T> = T | 'unavailable';
