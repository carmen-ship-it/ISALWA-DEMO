import type {
  PaginatedMeta,
  PartySummaryReadModel,
  ProjectionFreshness,
} from '@isalwa/os-contracts';

export type PartySearchResponse = {
  items: PartySummaryReadModel[];
  meta: PaginatedMeta;
  freshness: ProjectionFreshness | null;
};

/** Authoritative party detail — GET /v1/parties/:id (Step 12). */
export type PartyDetailResponse = {
  party: {
    id: string;
    organizationId: string;
    partyKind: string;
    displayName: string;
    legalName: string | null;
    status: string;
    mergedIntoPartyId: string | null;
    version: number;
  };
  roles: Array<{
    id: string;
    organizationId: string;
    partyId: string;
    roleKey: string;
    effectiveAt: string;
    endedAt: string | null;
  }>;
  contacts: Array<{
    id: string;
    organizationId: string;
    organizationPartyId: string;
    personPartyId: string | null;
    givenName: string;
    familyName: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    title: string | null;
    status: string;
    version: number;
  }>;
  commercialAccount: {
    id: string;
    organizationId: string;
    partyId: string;
    territoryId: string | null;
    ownerMemberId: string | null;
    status: string;
    version: number;
  } | null;
};

export type PartySearchParams = {
  q?: string;
  status?: string;
  roleKey?: string;
  cursor?: string;
  limit?: string;
};
