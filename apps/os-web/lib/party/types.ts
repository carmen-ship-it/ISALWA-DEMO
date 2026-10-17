import type {
  PaginatedMeta,
  PartySummaryReadModel,
  ProjectionFreshness,
} from '@isalwa/os-contracts';

/** Data-steward lookup (`/v1/master-data/parties`): identity fields only, no owner, phone or contacts. */
export type MasterDataPartySummary = {
  partyId: string;
  partyKind: string;
  displayName: string;
  legalName: string | null;
  status: string;
  activeRoleKeys: string[];
  mergedIntoPartyId: string | null;
};

export type MasterDataPartySearchResponse = {
  items: MasterDataPartySummary[];
  meta: { nextCursor: string | null; limit: number; hasMore: boolean };
};

export type MasterDataPartyDetailResponse = MasterDataPartySummary & {
  version: number;
  fiscalIdentities: Array<{ nit: string; razonSocial: string | null; effectiveAt: string; endedAt: string | null }>;
};

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
  contactsMeta?: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  commercialAccount: {
    id: string;
    organizationId: string;
    partyId: string;
    territoryId: string | null;
    ownerMemberId: string | null;
    status: string;
    version: number;
  } | null;
  commercialAuthority?: {
    canReassignOwner: boolean;
    canManageCoverage?: boolean;
    /** Actions this viewer may put on a new coverage grant. */
    grantableCoverageActions?: string[];
  };
  activeCoverage?: {
    grantId: string;
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
    startsAt: string;
    endsAt: string | null;
    recordedByMemberId: string | null;
    coveredActions?: string[];
  } | null;
};

export type LocationView = {
  id: string;
  organizationId: string;
  partyId: string;
  label: string;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
  status: string;
  version: number;
};

export type PartyLocationsResponse = {
  partyId: string;
  locations: LocationView[];
  meta: PaginatedMeta;
};

export type PartyContactsResponse = {
  partyId: string;
  contacts: PartyDetailResponse['contacts'];
  meta: PaginatedMeta;
};

export type PartySearchParams = {
  q?: string;
  status?: string;
  roleKey?: string;
  cursor?: string;
  limit?: string;
};
