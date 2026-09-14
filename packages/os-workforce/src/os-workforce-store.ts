import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  AuthIdentityRecord,
  DepartmentRecord,
  DelegationRecord,
  IdempotencyRecord,
  ManagerAssignmentRecord,
  MemberRecord,
  OrganizationRecord,
  PersonRecord,
  RoleAssignmentRecord,
  WorkItemRecord,
} from './store-types';

/** Persistence contract for workforce command service — memory and Prisma implementations. */
export interface OsWorkforceStore {
  getMember(memberId: string): Promise<MemberRecord | null>;
  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  getPerson(personId: string): Promise<PersonRecord | null>;
  findAuthIdentityByPersonAndStatus(
    personId: string,
    status: string,
  ): Promise<AuthIdentityRecord | null>;
  findAuthIdentityByProviderSubject(
    provider: string,
    providerSubject: string,
  ): Promise<AuthIdentityRecord | null>;
  findAuthIdentityById(authIdentityId: string): Promise<AuthIdentityRecord | null>;
  /** Case-insensitive email match. Used only to reconcile a verified provider email. */
  listAuthIdentitiesByProviderEmail(
    provider: string,
    email: string,
  ): Promise<AuthIdentityRecord[]>;
  /** organizationId, when present, is a proven tenant predicate — not a client argument. */
  listMembersForPerson(personId: string, organizationId?: string): Promise<MemberRecord[]>;
  findActiveMemberForPerson(
    personId: string,
    organizationId?: string,
  ): Promise<MemberRecord | null>;
  /** organizationId, when present, is a proven tenant predicate — not a post-filter. */
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(
    delegateMemberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]>;
  listOpenWorkItemsForMember(organizationId: string, memberId: string): Promise<WorkItemRecord[]>;
  findWorkItem(organizationId: string, workItemId: string): Promise<WorkItemRecord | null>;
  findDelegation(organizationId: string, delegationId: string): Promise<DelegationRecord | null>;

  insertPerson(person: PersonRecord): Promise<void>;
  insertMember(member: MemberRecord): Promise<void>;
  insertAuthIdentity(auth: AuthIdentityRecord): Promise<void>;
  insertRoleAssignment(assignment: RoleAssignmentRecord): Promise<void>;
  insertDepartmentAssignment(assignment: {
    id: string;
    organizationId: string;
    memberId: string;
    departmentId: string;
    effectiveAt: Date;
    endedAt: Date | null;
  }): Promise<void>;
  insertManagerAssignment(assignment: ManagerAssignmentRecord): Promise<void>;
  insertDelegation(delegation: DelegationRecord): Promise<void>;

  updateMember(
    memberId: string,
    patch: Partial<
      Pick<
        MemberRecord,
        'accessStatus' | 'employmentStatus' | 'employmentStartedAt' | 'employmentEndedAt' | 'version'
      >
    >,
  ): Promise<void>;
  updateAuthIdentity(
    authIdentityId: string,
    patch: Partial<
      Pick<
        AuthIdentityRecord,
        'status' | 'providerSubject' | 'email' | 'activatedAt' | 'revokedAt'
      >
    >,
  ): Promise<void>;
  endActiveDepartmentAssignments(memberId: string, endedAt: Date): Promise<void>;
  endActiveRoleAssignments(memberId: string, endedAt: Date): Promise<void>;
  /** Ends only active rows of one role key. Returns the assignment ids ended. */
  endActiveRoleAssignmentsForKey(
    organizationId: string,
    memberId: string,
    roleKey: string,
    endedAt: Date,
  ): Promise<string[]>;
  endActiveManagerAssignments(memberId: string, endedAt: Date): Promise<void>;
  updateWorkItemOwner(workItemId: string, newOwnerMemberId: string, version: number): Promise<void>;
  revokeDelegation(delegationId: string, revokedAt: Date): Promise<void>;

  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;

  /** Post-commit audit when provider side effects fail after OS lifecycle commit. */
  appendStandaloneAudit(audit: StoredAuditLog): Promise<void>;

  /** Atomic command boundary when persistence supports transactions. */
  runInTransaction<T>(fn: (store: OsWorkforceStore) => Promise<T>): Promise<T>;

  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;

  /** Test/bootstrap helpers — not used in production command paths. */
  seedOrganization(legalName: string, slug: string): Promise<OrganizationRecord>;
  seedAdminMember(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
  ): Promise<{ person: PersonRecord; member: MemberRecord; auth: AuthIdentityRecord }>;

  /** Read helpers for queries and verification. */
  listDepartments(organizationId: string): Promise<DepartmentRecord[]>;
  /** Org-scoped department lookup — never returns a foreign-tenant row. */
  getDepartmentInOrg(
    organizationId: string,
    departmentId: string,
  ): Promise<DepartmentRecord | null>;
  countBusinessEvents(organizationId: string): Promise<number>;
  countAuditLogs(organizationId: string): Promise<number>;
  countOutbox(organizationId: string): Promise<number>;
}
