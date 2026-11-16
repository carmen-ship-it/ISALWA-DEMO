import type { DelegatorStanding } from '@isalwa/os-domain';
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
  city?: string | null;
  department?: string | null;
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
  phoneRetiredAt?: Date | null;
  phoneRetiredReason?: string | null;
  phoneDisplay?: string | null;
  whatsappDisplay?: string | null;
  phoneStatus?: string | null;
  whatsappStatus?: string | null;
  whatsappRetiredAt?: Date | null;
  whatsappRetiredReason?: string | null;
  relationEndedAt?: Date | null;
  relationEndReason?: string | null;
};

/** T03 L3: what archiving a customer would leave open or affect. Counts only. */
export type CustomerArchiveFacts = {
  openOrders: number;
  openCommitments: number;
  openIssues: number;
  openWorkItems: number;
  /** T07: reported payments with a tender still to verify. */
  pendingPayments: number;
  /** T07: reported payments with confirmed funds not assigned to any order. */
  unassignedPayments: number;
  openOpportunities: number;
  openQuotes: number;
  currentContacts: number;
};

/** T03 L2: one channel's recorded follow-up preference for a contact. */
export type ContactFollowupPreferenceRecord = {
  id: string;
  organizationId: string;
  contactId: string;
  channel: 'whatsapp' | 'phone' | 'email';
  preference: 'allowed' | 'no_promotions' | 'no_unsolicited_followups';
  source: 'customer_message' | 'staff_recorded';
  identityConfirmed: boolean;
  version: number;
  recordedByMemberId: string;
  updatedAt: Date;
};

/** T03 C6: one dated association of a number with a contact. Ended, never overwritten. */
export type ContactEndpointAssociationRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  contactId: string;
  channel: 'phone' | 'whatsapp';
  numberE164: string;
  country: string | null;
  enteredText: string | null;
  startedAt: Date;
  endedAt: Date | null;
  endReason: string | null;
  verificationMethod: string | null;
  recordedByMemberId: string | null;
};

/** T03 C7: a number that matched an ended association on another customer. */
export type ContactIdentityReviewRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  contactId: string;
  channel: 'phone' | 'whatsapp';
  associationId: string;
  matchedAssociationId: string;
  status: 'open' | 'confirmed' | 'rejected' | 'superseded';
  openedAt: Date;
  resolvedAt: Date | null;
  resolvedByMemberId: string | null;
  verificationMethod: string | null;
  note: string | null;
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
  delegatorMemberId?: string;
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  organizationId?: string;
  /** Delegator's current standing; without it the delegation confers nothing (F10). */
  delegator?: DelegatorStanding;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};
