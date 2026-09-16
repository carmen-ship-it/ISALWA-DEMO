import type {
  CapabilityStateReadModel,
  MemberAccessHistoryResponse,
  MemberSummaryReadModel,
  PaginatedMeta,
  TerminationImpactReadModel,
} from '@isalwa/os-contracts';

export type MemberListResponse = {
  items: MemberSummaryReadModel[];
  meta: PaginatedMeta;
};

export type MemberDetailResponse = {
  member: {
    id: string;
    organizationId: string;
    personId: string;
    accessStatus: string;
    employmentStatus: string;
  };
  person: {
    id: string;
    givenName: string;
    familyName: string;
  };
  summary: MemberSummaryReadModel;
  organizationId: string;
};

export type TerminationImpactResponse = TerminationImpactReadModel;

export type { MemberAccessHistoryResponse };

export type CapabilityStateResponse = {
  capabilities: CapabilityStateReadModel[];
};

export type MemberSearchParams = {
  q?: string;
  accessStatus?: string;
  employmentStatus?: string;
  departmentId?: string;
  cursor?: string;
};
