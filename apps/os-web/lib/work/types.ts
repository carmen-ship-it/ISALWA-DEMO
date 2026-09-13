import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  PaginatedMeta,
  ProjectionFreshness,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';

export type WorkListResponse = {
  items: WorkSummaryReadModel[];
  meta: PaginatedMeta;
  /** Null when no projection consumer checkpoint exists yet (query contract). */
  freshness: ProjectionFreshness | null;
};

export type ApprovalListResponse = {
  items: ApprovalSummaryReadModel[];
  meta: PaginatedMeta;
  freshness: ProjectionFreshness | null;
};

export type AttentionListResponse = {
  items: AttentionItemReadModel[];
  meta: PaginatedMeta;
  freshness: ProjectionFreshness | null;
};

export type WorkDetailResponse = {
  work: WorkSummaryReadModel;
  freshness: ProjectionFreshness | null;
};

export type ApprovalDetailResponse = {
  approval: ApprovalSummaryReadModel;
  freshness: ProjectionFreshness | null;
};

export type MemberDisplayResponse = {
  member: { id: string; accessStatus: string };
  person: { givenName: string; familyName: string };
  organizationId: string;
};
