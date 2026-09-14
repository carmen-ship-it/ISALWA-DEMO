import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsWorkforceStore } from './os-workforce-store';
import type {
  AuthIdentityRecord,
  DepartmentAssignmentRecord,
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

export type {
  OrganizationRecord,
  PersonRecord,
  MemberRecord,
  AuthIdentityRecord,
  RoleAssignmentRecord,
  DepartmentRecord,
  DepartmentAssignmentRecord,
  ManagerAssignmentRecord,
  DelegationRecord,
  WorkItemRecord,
  IdempotencyRecord,
} from './store-types';

export class MemoryOsStore implements OsWorkforceStore {
  organizations: OrganizationRecord[] = [];
  persons: PersonRecord[] = [];
  members: MemberRecord[] = [];
  authIdentities: AuthIdentityRecord[] = [];
  departments: DepartmentRecord[] = [];
  roleAssignments: RoleAssignmentRecord[] = [];
  departmentAssignments: DepartmentAssignmentRecord[] = [];
  managerAssignments: ManagerAssignmentRecord[] = [];
  delegations: DelegationRecord[] = [];
  workItems: WorkItemRecord[] = [];
  businessEvents: StoredBusinessEvent[] = [];
  auditLogs: StoredAuditLog[] = [];
  outbox: StoredOutboxMessage[] = [];
  idempotency: IdempotencyRecord[] = [];

  async getMember(memberId: string): Promise<MemberRecord | null> {
    return this.members.find((m) => m.id === memberId) ?? null;
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const m = await this.getMember(memberId);
    return m?.organizationId === organizationId ? m : null;
  }

  async getPerson(personId: string): Promise<PersonRecord | null> {
    return this.persons.find((p) => p.id === personId) ?? null;
  }

  async findAuthIdentityByPersonAndStatus(
    personId: string,
    status: string,
  ): Promise<AuthIdentityRecord | null> {
    return this.authIdentities.find((a) => a.personId === personId && a.status === status) ?? null;
  }

  async findAuthIdentityByProviderSubject(
    provider: string,
    providerSubject: string,
  ): Promise<AuthIdentityRecord | null> {
    return (
      this.authIdentities.find(
        (a) => a.provider === provider && a.providerSubject === providerSubject,
      ) ?? null
    );
  }

  async findAuthIdentityById(authIdentityId: string): Promise<AuthIdentityRecord | null> {
    return this.authIdentities.find((a) => a.id === authIdentityId) ?? null;
  }

  async listAuthIdentitiesByProviderEmail(
    provider: string,
    email: string,
  ): Promise<AuthIdentityRecord[]> {
    const key = email.trim().toLowerCase();
    return this.authIdentities.filter(
      (identity) => identity.provider === provider && identity.email.trim().toLowerCase() === key,
    );
  }

  async listMembersForPerson(personId: string): Promise<MemberRecord[]> {
    return this.members.filter((member) => member.personId === personId);
  }

  async findActiveMemberForPerson(
    personId: string,
    organizationId?: string,
  ): Promise<MemberRecord | null> {
    const active = this.members.filter(
      (m) =>
        m.personId === personId &&
        m.accessStatus === 'active' &&
        (organizationId ? m.organizationId === organizationId : true),
    );
    return active.length === 1 ? active[0]! : active[0] ?? null;
  }

  async listRoleAssignmentsForMember(memberId: string): Promise<RoleAssignmentRecord[]> {
    return this.roleAssignments.filter((r) => r.memberId === memberId);
  }

  async listDelegationsForDelegate(delegateMemberId: string): Promise<DelegationRecord[]> {
    return this.delegations.filter((d) => d.delegateMemberId === delegateMemberId);
  }

  async listOpenWorkItemsForMember(
    organizationId: string,
    memberId: string,
  ): Promise<WorkItemRecord[]> {
    return this.workItems.filter(
      (w) =>
        w.organizationId === organizationId && w.ownerMemberId === memberId && w.status === 'open',
    );
  }

  async findWorkItem(organizationId: string, workItemId: string): Promise<WorkItemRecord | null> {
    const w = this.workItems.find((x) => x.id === workItemId);
    return w && w.organizationId === organizationId ? w : null;
  }

  async findDelegation(
    organizationId: string,
    delegationId: string,
  ): Promise<DelegationRecord | null> {
    const d = this.delegations.find((x) => x.id === delegationId);
    return d && d.organizationId === organizationId ? d : null;
  }

  async insertPerson(person: PersonRecord): Promise<void> {
    this.persons.push(person);
  }

  async insertMember(member: MemberRecord): Promise<void> {
    this.members.push(member);
  }

  async insertAuthIdentity(auth: AuthIdentityRecord): Promise<void> {
    this.authIdentities.push(auth);
  }

  async insertRoleAssignment(assignment: RoleAssignmentRecord): Promise<void> {
    this.roleAssignments.push(assignment);
  }

  async insertDepartmentAssignment(assignment: DepartmentAssignmentRecord): Promise<void> {
    this.departmentAssignments.push(assignment);
  }

  async insertManagerAssignment(assignment: ManagerAssignmentRecord): Promise<void> {
    this.managerAssignments.push(assignment);
  }

  async insertDelegation(delegation: DelegationRecord): Promise<void> {
    this.delegations.push(delegation);
  }

  async updateMember(
    memberId: string,
    patch: Partial<
      Pick<
        MemberRecord,
        'accessStatus' | 'employmentStatus' | 'employmentStartedAt' | 'employmentEndedAt' | 'version'
      >
    >,
  ): Promise<void> {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return;
    Object.assign(member, patch);
  }

  async updateAuthIdentity(
    authIdentityId: string,
    patch: Partial<
      Pick<
        AuthIdentityRecord,
        'status' | 'providerSubject' | 'email' | 'activatedAt' | 'revokedAt'
      >
    >,
  ): Promise<void> {
    const auth = this.authIdentities.find((a) => a.id === authIdentityId);
    if (!auth) return;
    Object.assign(auth, patch);
  }

  async endActiveDepartmentAssignments(memberId: string, endedAt: Date): Promise<void> {
    for (const a of this.departmentAssignments) {
      if (a.memberId === memberId && a.endedAt === null) a.endedAt = endedAt;
    }
  }

  async endActiveRoleAssignments(memberId: string, endedAt: Date): Promise<void> {
    for (const a of this.roleAssignments) {
      if (a.memberId === memberId && a.endedAt === null) a.endedAt = endedAt;
    }
  }

  async endActiveRoleAssignmentsForKey(
    organizationId: string,
    memberId: string,
    roleKey: string,
    endedAt: Date,
  ): Promise<string[]> {
    const ended: string[] = [];
    for (const a of this.roleAssignments) {
      if (
        a.organizationId === organizationId &&
        a.memberId === memberId &&
        a.roleKey === roleKey &&
        a.endedAt === null
      ) {
        a.endedAt = endedAt;
        ended.push(a.id);
      }
    }
    return ended;
  }

  async endActiveManagerAssignments(memberId: string, endedAt: Date): Promise<void> {
    for (const a of this.managerAssignments) {
      if (a.memberId === memberId && a.endedAt === null) a.endedAt = endedAt;
    }
  }

  async updateWorkItemOwner(
    workItemId: string,
    newOwnerMemberId: string,
    version: number,
  ): Promise<void> {
    const work = this.workItems.find((w) => w.id === workItemId);
    if (work) {
      work.ownerMemberId = newOwnerMemberId;
      work.version = version;
    }
  }

  async revokeDelegation(delegationId: string, revokedAt: Date): Promise<void> {
    const d = this.delegations.find((x) => x.id === delegationId);
    if (d) d.revokedAt = revokedAt;
  }

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    this.businessEvents.push(event);
    this.outbox.push(outbox);
    this.auditLogs.push(audit);
  }

  async appendStandaloneAudit(audit: StoredAuditLog): Promise<void> {
    this.auditLogs.push(audit);
  }

  async runInTransaction<T>(fn: (store: OsWorkforceStore) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    return (
      this.idempotency.find(
        (i) => i.organizationId === organizationId && i.key === key && i.expiresAt > new Date(),
      ) ?? null
    );
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    this.idempotency.push(record);
  }

  async seedOrganization(legalName: string, slug: string): Promise<OrganizationRecord> {
    const org: OrganizationRecord = {
      id: createId(),
      legalName,
      slug,
      status: 'active',
    };
    this.organizations.push(org);
    const dept: DepartmentRecord = {
      id: createId(),
      organizationId: org.id,
      name: 'General',
      code: 'general',
    };
    this.departments.push(dept);
    return org;
  }

  async seedAdminMember(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
  ): Promise<{ person: PersonRecord; member: MemberRecord; auth: AuthIdentityRecord }> {
    const person: PersonRecord = {
      id: createId(),
      givenName,
      familyName,
      version: 0,
    };
    await this.insertPerson(person);
    const member: MemberRecord = {
      id: createId(),
      organizationId: orgId,
      personId: person.id,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date(),
      employmentEndedAt: null,
      version: 0,
    };
    await this.insertMember(member);
    const auth: AuthIdentityRecord = {
      id: createId(),
      personId: person.id,
      provider: 'local-dev',
      providerSubject: `subject:${email}`,
      email,
      status: 'active',
      invitedAt: null,
      activatedAt: new Date(),
      revokedAt: null,
    };
    await this.insertAuthIdentity(auth);
    await this.insertRoleAssignment({
      id: createId(),
      organizationId: orgId,
      memberId: member.id,
      roleKey: 'people.admin',
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    return { person, member, auth };
  }

  async listDepartments(organizationId: string): Promise<DepartmentRecord[]> {
    return this.departments.filter((d) => d.organizationId === organizationId);
  }

  async getDepartmentInOrg(
    organizationId: string,
    departmentId: string,
  ): Promise<DepartmentRecord | null> {
    return (
      this.departments.find(
        (d) => d.organizationId === organizationId && d.id === departmentId,
      ) ?? null
    );
  }

  async countBusinessEvents(organizationId: string): Promise<number> {
    return this.businessEvents.filter((e) => e.organizationId === organizationId).length;
  }

  async countAuditLogs(organizationId: string): Promise<number> {
    return this.auditLogs.filter((a) => a.organizationId === organizationId).length;
  }

  async countOutbox(organizationId: string): Promise<number> {
    return this.outbox.filter((o) => o.organizationId === organizationId).length;
  }
}
