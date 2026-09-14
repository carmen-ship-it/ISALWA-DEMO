import type { LocationStatus, PartyKind, PartyRoleKey, PartyStatus } from '@isalwa/os-contracts';

export type PartyRecord = {
  id: string;
  organizationId: string;
  partyKind: PartyKind;
  displayName: string;
  legalName: string | null;
  status: PartyStatus;
  mergedIntoPartyId: string | null;
  version: number;
};

export type LocationRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  label: string;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
  status: LocationStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PartyRoleAssignmentRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  roleKey: PartyRoleKey;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type ContactRecord = {
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
};

export type FiscalIdentityRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  nit: string;
  razonSocial: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

/** Batch input for a customer-list page. Not a second customer record. */
export type PartyOperatingSource = {
  partyId: string;
  contacts: Array<{ id: string; status: string; phone: string | null }>;
  locations: Array<{
    status: string;
    latitude: number | null;
    longitude: number | null;
    provenanceUrl: string | null;
  }>;
  commercialOwnerMemberId: string | null;
};

export type CommercialAccountRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  territoryId: string | null;
  ownerMemberId: string | null;
  status: string;
  version: number;
};

export type LeadRecord = {
  id: string;
  organizationId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: string;
  resolvedPartyId: string | null;
  batchRef: string | null;
};

export type DuplicateCandidateRecord = {
  id: string;
  organizationId: string;
  partyIdA: string;
  partyIdB: string;
  matchReason: string;
  confidence: number;
  status: string;
};

export type MergeRequestRecord = {
  id: string;
  organizationId: string;
  sourcePartyId: string;
  targetPartyId: string;
  status: string;
  requestedByMemberId: string;
  decidedByMemberId: string | null;
  lineageSnapshotJson: Record<string, unknown> | null;
  createdAt: Date;
  decidedAt: Date | null;
};

export type MemberRecord = {
  id: string;
  organizationId: string;
  accessStatus: string;
};

export type RoleAssignmentRecord = {
  memberId: string;
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type DelegationRecord = {
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};
