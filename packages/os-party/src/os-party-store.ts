import type { CustomerCoverageGrant } from '@isalwa/os-contracts';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { PartyOperatingSource } from './store-types';
import type {
  CommercialAccountRecord,
  ContactRecord,
  DelegationRecord,
  DuplicateCandidateRecord,
  FiscalIdentityRecord,
  IdempotencyRecord,
  LeadRecord,
  LocationRecord,
  MemberRecord,
  MergeRequestRecord,
  PartyRecord,
  PartyRoleAssignmentRecord,
  RoleAssignmentRecord,
} from './store-types';
import type { PartyBoundListOptions, PartyBoundListPage } from './bound-list';

export interface OsPartyStore {
  runInTransaction<T>(fn: (store: OsPartyStore) => Promise<T>): Promise<T>;

  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]>;

  getPartyInOrg(organizationId: string, partyId: string): Promise<PartyRecord | null>;
  insertParty(party: PartyRecord): Promise<void>;
  updateParty(
    partyId: string,
    patch: Partial<Pick<PartyRecord, 'displayName' | 'legalName' | 'status' | 'mergedIntoPartyId' | 'version'>>,
    expectedVersion: number,
  ): Promise<void>;

  getLocationInOrg(organizationId: string, locationId: string): Promise<LocationRecord | null>;
  listLocationsForParty(
    organizationId: string,
    partyId: string,
    options?: PartyBoundListOptions,
  ): Promise<PartyBoundListPage<LocationRecord>>;
  insertLocation(location: LocationRecord): Promise<void>;
  updateLocation(
    organizationId: string,
    locationId: string,
    patch: Partial<
      Pick<
        LocationRecord,
        | 'label'
        | 'addressText'
        | 'latitude'
        | 'longitude'
        | 'provenanceUrl'
        | 'status'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;

  insertPartyRoleAssignment(assignment: PartyRoleAssignmentRecord): Promise<void>;
  getPartyRoleAssignment(organizationId: string, roleAssignmentId: string): Promise<PartyRoleAssignmentRecord | null>;
  endPartyRoleAssignment(roleAssignmentId: string, endedAt: Date): Promise<void>;
  listActivePartyRoles(organizationId: string, partyId: string, asOf: Date): Promise<PartyRoleAssignmentRecord[]>;

  insertContact(contact: ContactRecord): Promise<void>;
  updateContact(
    contactId: string,
    patch: Partial<
      Pick<
        ContactRecord,
        | 'givenName'
        | 'familyName'
        | 'email'
        | 'phone'
        | 'whatsapp'
        | 'title'
        | 'personPartyId'
        | 'status'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;
  getContactInOrg(organizationId: string, contactId: string): Promise<ContactRecord | null>;
  /** Parties with an active, unretired contact whose phone or WhatsApp equals this normalized number. */
  listPartyIdsWithContactPhone(organizationId: string, phone: string): Promise<string[]>;
  listContactsForOrgParty(
    organizationId: string,
    organizationPartyId: string,
    options?: PartyBoundListOptions,
  ): Promise<PartyBoundListPage<ContactRecord>>;
  reassignContactsOrgParty(
    organizationId: string,
    fromPartyId: string,
    toPartyId: string,
  ): Promise<number>;

  insertFiscalIdentity(record: FiscalIdentityRecord): Promise<void>;
  endActiveFiscalIdentities(partyId: string, endedAt: Date): Promise<void>;
  findActiveFiscalByNit(organizationId: string, nit: string, excludePartyId?: string): Promise<FiscalIdentityRecord | null>;
  listFiscalIdentitiesForParty(organizationId: string, partyId: string): Promise<FiscalIdentityRecord[]>;

  insertCommercialAccount(account: CommercialAccountRecord): Promise<void>;
  getCommercialAccountForParty(organizationId: string, partyId: string): Promise<CommercialAccountRecord | null>;
  /** Coverage rows for one customer (all states; the caller decides what is active). */
  listCustomerCoverageGrants(organizationId: string, customerPartyId: string): Promise<CustomerCoverageGrant[]>;
  /** Manager assignment in force at asOf, same tenant. */
  isDirectReport(organizationId: string, managerMemberId: string, memberId: string, asOf: Date): Promise<boolean>;
  /**
   * One page of customer operating facts. Three queries, never one GetParty per row.
   * Empty partyIds returns an empty list.
   */
  listPartyOperatingSources(
    organizationId: string,
    partyIds: string[],
  ): Promise<PartyOperatingSource[]>;
  reassignCommercialAccountParty(
    organizationId: string,
    fromPartyId: string,
    toPartyId: string,
  ): Promise<void>;

  insertLead(lead: LeadRecord): Promise<void>;
  getLeadInOrg(organizationId: string, leadId: string): Promise<LeadRecord | null>;
  resolveLead(leadId: string, resolvedPartyId: string): Promise<void>;

  upsertDuplicateCandidate(candidate: DuplicateCandidateRecord): Promise<void>;
  listDuplicateCandidates(organizationId: string, partyId: string): Promise<DuplicateCandidateRecord[]>;

  insertMergeRequest(request: MergeRequestRecord): Promise<void>;
  getMergeRequest(organizationId: string, mergeRequestId: string): Promise<MergeRequestRecord | null>;
  updateMergeRequest(
    mergeRequestId: string,
    patch: Partial<Pick<MergeRequestRecord, 'status' | 'decidedByMemberId' | 'lineageSnapshotJson' | 'decidedAt'>>,
  ): Promise<void>;

  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
  /** Replaces the stored result of an existing key (claim → completed). */
  completeIdempotency(
    organizationId: string,
    key: string,
    resultJson: Record<string, unknown>,
  ): Promise<void>;
  /** Releases a claim whose command did not complete. */
  deleteIdempotency(organizationId: string, key: string): Promise<void>;
}
