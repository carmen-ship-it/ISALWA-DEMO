import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
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
} from '@isalwa/os-workforce';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';

function mapMember(row: {
  id: string;
  organizationId: string;
  personId: string;
  employmentStatus: string;
  accessStatus: string;
  employmentStartedAt: Date | null;
  employmentEndedAt: Date | null;
  version: number;
}): MemberRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    personId: row.personId,
    employmentStatus: row.employmentStatus,
    accessStatus: row.accessStatus,
    employmentStartedAt: row.employmentStartedAt,
    employmentEndedAt: row.employmentEndedAt,
    version: row.version,
  };
}

export class PrismaOsWorkforceStore implements OsWorkforceStore {
  private tx?: Prisma.TransactionClient;

  /** Integration test hook — simulates outbox append failure inside transaction. */
  testFailNextAppend = false;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  async runInTransaction<T>(fn: (store: OsWorkforceStore) => Promise<T>): Promise<T> {
    const failNextAppend = this.testFailNextAppend;
    return this.prisma.$transaction(async (tx) => {
      const scoped = new PrismaOsWorkforceStore(this.prisma);
      scoped.tx = tx;
      scoped.testFailNextAppend = failNextAppend;
      try {
        return await fn(scoped);
      } finally {
        if (failNextAppend) {
          this.testFailNextAppend = scoped.testFailNextAppend;
        }
      }
    });
  }

  async getMember(memberId: string): Promise<MemberRecord | null> {
    const row = await this.db().osOrganizationMember.findUnique({ where: { id: memberId } });
    return row ? mapMember(row) : null;
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const row = await this.db().osOrganizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    return row ? mapMember(row) : null;
  }

  async getPerson(personId: string): Promise<PersonRecord | null> {
    const row = await this.db().osPerson.findUnique({ where: { id: personId } });
    return row
      ? { id: row.id, givenName: row.givenName, familyName: row.familyName, version: row.version }
      : null;
  }

  async findAuthIdentityByPersonAndStatus(
    personId: string,
    status: string,
  ): Promise<AuthIdentityRecord | null> {
    const row = await this.db().osAuthIdentity.findFirst({ where: { personId, status } });
    return row ? this.mapAuth(row) : null;
  }

  async findAuthIdentityByProviderSubject(
    provider: string,
    providerSubject: string,
  ): Promise<AuthIdentityRecord | null> {
    const row = await this.db().osAuthIdentity.findFirst({
      where: { provider, providerSubject },
    });
    return row ? this.mapAuth(row) : null;
  }

  async findAuthIdentityById(authIdentityId: string): Promise<AuthIdentityRecord | null> {
    const row = await this.db().osAuthIdentity.findUnique({ where: { id: authIdentityId } });
    return row ? this.mapAuth(row) : null;
  }

  async findActiveMemberForPerson(
    personId: string,
    organizationId?: string,
  ): Promise<MemberRecord | null> {
    const rows = await this.db().osOrganizationMember.findMany({
      where: {
        personId,
        accessStatus: 'active',
        ...(organizationId ? { organizationId } : {}),
      },
    });
    return rows[0] ? mapMember(rows[0]) : null;
  }

  async listRoleAssignmentsForMember(memberId: string): Promise<RoleAssignmentRecord[]> {
    const rows = await this.db().osRoleAssignment.findMany({ where: { memberId } });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      memberId: r.memberId,
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(delegateMemberId: string): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({ where: { delegateMemberId } });
    return rows.map((d) => ({
      id: d.id,
      organizationId: d.organizationId,
      delegatorMemberId: d.delegatorMemberId,
      delegateMemberId: d.delegateMemberId,
      scopes: d.scopesJson as string[],
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
    }));
  }

  async listOpenWorkItemsForMember(
    organizationId: string,
    memberId: string,
  ): Promise<WorkItemRecord[]> {
    const rows = await this.db().osWorkItem.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'open' },
    });
    return rows.map((w) => ({
      id: w.id,
      organizationId: w.organizationId,
      ownerMemberId: w.ownerMemberId,
      title: w.title,
      status: w.status,
      version: w.version,
    }));
  }

  async findWorkItem(organizationId: string, workItemId: string): Promise<WorkItemRecord | null> {
    const w = await this.db().osWorkItem.findFirst({
      where: { id: workItemId, organizationId },
    });
    return w
      ? {
          id: w.id,
          organizationId: w.organizationId,
          ownerMemberId: w.ownerMemberId,
          title: w.title,
          status: w.status,
          version: w.version,
        }
      : null;
  }

  async findDelegation(
    organizationId: string,
    delegationId: string,
  ): Promise<DelegationRecord | null> {
    const d = await this.db().osDelegation.findFirst({
      where: { id: delegationId, organizationId },
    });
    return d
      ? {
          id: d.id,
          organizationId: d.organizationId,
          delegatorMemberId: d.delegatorMemberId,
          delegateMemberId: d.delegateMemberId,
          scopes: d.scopesJson as string[],
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
        }
      : null;
  }

  async insertPerson(person: PersonRecord): Promise<void> {
    await this.db().osPerson.create({
      data: {
        id: person.id,
        givenName: person.givenName,
        familyName: person.familyName,
        version: person.version,
      },
    });
  }

  async insertMember(member: MemberRecord): Promise<void> {
    await this.db().osOrganizationMember.create({
      data: {
        id: member.id,
        organizationId: member.organizationId,
        personId: member.personId,
        employmentStatus: member.employmentStatus,
        accessStatus: member.accessStatus,
        employmentStartedAt: member.employmentStartedAt,
        employmentEndedAt: member.employmentEndedAt,
        version: member.version,
      },
    });
  }

  async insertAuthIdentity(auth: AuthIdentityRecord): Promise<void> {
    await this.db().osAuthIdentity.create({
      data: {
        id: auth.id,
        personId: auth.personId,
        provider: auth.provider,
        providerSubject: auth.providerSubject,
        email: auth.email,
        status: auth.status,
        invitedAt: auth.invitedAt,
        activatedAt: auth.activatedAt,
        revokedAt: auth.revokedAt,
      },
    });
  }

  async insertRoleAssignment(assignment: RoleAssignmentRecord): Promise<void> {
    await this.db().osRoleAssignment.create({
      data: {
        id: assignment.id,
        organizationId: assignment.organizationId,
        memberId: assignment.memberId,
        roleKey: assignment.roleKey,
        effectiveAt: assignment.effectiveAt,
        endedAt: assignment.endedAt,
      },
    });
  }

  async insertDepartmentAssignment(assignment: {
    id: string;
    organizationId: string;
    memberId: string;
    departmentId: string;
    effectiveAt: Date;
    endedAt: Date | null;
  }): Promise<void> {
    await this.db().osDepartmentAssignment.create({ data: assignment });
  }

  async insertManagerAssignment(assignment: ManagerAssignmentRecord): Promise<void> {
    await this.db().osManagerAssignment.create({
      data: {
        id: assignment.id,
        organizationId: assignment.organizationId,
        memberId: assignment.memberId,
        managerMemberId: assignment.managerMemberId,
        effectiveAt: assignment.effectiveAt,
        endedAt: assignment.endedAt,
      },
    });
  }

  async insertDelegation(delegation: DelegationRecord): Promise<void> {
    await this.db().osDelegation.create({
      data: {
        id: delegation.id,
        organizationId: delegation.organizationId,
        delegatorMemberId: delegation.delegatorMemberId,
        delegateMemberId: delegation.delegateMemberId,
        scopesJson: delegation.scopes,
        startsAt: delegation.startsAt,
        expiresAt: delegation.expiresAt,
        revokedAt: delegation.revokedAt,
      },
    });
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
    await this.db().osOrganizationMember.update({ where: { id: memberId }, data: patch });
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
    await this.db().osAuthIdentity.update({ where: { id: authIdentityId }, data: patch });
  }

  async endActiveDepartmentAssignments(memberId: string, endedAt: Date): Promise<void> {
    await this.db().osDepartmentAssignment.updateMany({
      where: { memberId, endedAt: null },
      data: { endedAt },
    });
  }

  async endActiveRoleAssignments(memberId: string, endedAt: Date): Promise<void> {
    await this.db().osRoleAssignment.updateMany({
      where: { memberId, endedAt: null },
      data: { endedAt },
    });
  }

  async endActiveRoleAssignmentsForKey(
    organizationId: string,
    memberId: string,
    roleKey: string,
    endedAt: Date,
  ): Promise<string[]> {
    const rows = await this.db().osRoleAssignment.findMany({
      where: { organizationId, memberId, roleKey, endedAt: null },
      select: { id: true },
    });
    if (rows.length === 0) return [];
    await this.db().osRoleAssignment.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { endedAt },
    });
    return rows.map((row) => row.id);
  }

  async endActiveManagerAssignments(memberId: string, endedAt: Date): Promise<void> {
    await this.db().osManagerAssignment.updateMany({
      where: { memberId, endedAt: null },
      data: { endedAt },
    });
  }

  async updateWorkItemOwner(
    workItemId: string,
    newOwnerMemberId: string,
    version: number,
  ): Promise<void> {
    await this.db().osWorkItem.update({
      where: { id: workItemId },
      data: { ownerMemberId: newOwnerMemberId, version },
    });
  }

  async revokeDelegation(delegationId: string, revokedAt: Date): Promise<void> {
    await this.db().osDelegation.update({
      where: { id: delegationId },
      data: { revokedAt },
    });
  }

  private async runBatch(ops: Array<Prisma.PrismaPromise<unknown>>): Promise<void> {
    if (this.tx) {
      for (const op of ops) await op;
      return;
    }
    await this.prisma.$transaction(ops);
  }

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    if (this.testFailNextAppend) {
      this.testFailNextAppend = false;
      throw new Error('TEST_APPEND_FAIL');
    }
    await this.runBatch([
      this.db().osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          actorMemberId: event.actorMemberId,
          authorizationContext: event.authorizationContext as Prisma.InputJsonValue | undefined,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          payloadJson: (event.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          provenance: event.provenance ?? 'command',
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          dataOrigin: event.dataOrigin ?? 'production',
          capabilityKey: event.capabilityKey,
        },
      }),
      this.db().osOutboxMessage.create({
        data: {
          id: outbox.id,
          organizationId: outbox.organizationId,
          eventId: outbox.eventId,
          payloadJson: outbox.payloadJson as Prisma.InputJsonValue,
          status: outbox.status,
          attemptCount: outbox.attemptCount,
          nextAttemptAt: outbox.nextAttemptAt,
          lastError: outbox.lastError,
          createdAt: outbox.createdAt,
          publishedAt: outbox.publishedAt,
        },
      }),
      this.db().osAuditLog.create({
        data: {
          id: audit.id,
          organizationId: audit.organizationId,
          actorMemberId: audit.actorMemberId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          beforeJson: (audit.beforeJson ?? undefined) as Prisma.InputJsonValue | undefined,
          afterJson: (audit.afterJson ?? undefined) as Prisma.InputJsonValue | undefined,
          correlationId: audit.correlationId,
          createdAt: audit.createdAt,
        },
      }),
    ]);
  }

  async appendStandaloneAudit(audit: StoredAuditLog): Promise<void> {
    await this.db().osAuditLog.create({
      data: {
        id: audit.id,
        organizationId: audit.organizationId,
        actorMemberId: audit.actorMemberId,
        action: audit.action,
        resourceType: audit.resourceType,
        resourceId: audit.resourceId,
        beforeJson: (audit.beforeJson ?? undefined) as Prisma.InputJsonValue | undefined,
        afterJson: (audit.afterJson ?? undefined) as Prisma.InputJsonValue | undefined,
        correlationId: audit.correlationId,
        createdAt: audit.createdAt,
      },
    });
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.db().osIdempotencyKey.findFirst({
      where: { organizationId, key, expiresAt: { gt: new Date() } },
    });
    return row
      ? {
          organizationId: row.organizationId,
          key: row.key,
          commandName: row.commandName,
          resultJson: row.resultJson as Record<string, unknown>,
          expiresAt: row.expiresAt,
        }
      : null;
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    await this.db().osIdempotencyKey.create({
      data: {
        id: record.id ?? createId(),
        organizationId: record.organizationId,
        key: record.key,
        commandName: record.commandName,
        resultJson: record.resultJson as Prisma.InputJsonValue,
        expiresAt: record.expiresAt,
      },
    });
  }

  async seedOrganization(legalName: string, slug: string): Promise<OrganizationRecord> {
    const orgId = createId();
    const deptId = createId();
    await this.runBatch([
      this.db().osOrganization.create({
        data: { id: orgId, legalName, slug, status: 'active' },
      }),
      this.db().osDepartment.create({
        data: {
          id: deptId,
          organizationId: orgId,
          name: 'General',
          code: 'general',
        },
      }),
    ]);
    return { id: orgId, legalName, slug, status: 'active' };
  }

  async seedAdminMember(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
  ): Promise<{ person: PersonRecord; member: MemberRecord; auth: AuthIdentityRecord }> {
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    const roleId = createId();
    const person: PersonRecord = {
      id: personId,
      givenName,
      familyName,
      version: 0,
    };
    const member: MemberRecord = {
      id: memberId,
      organizationId: orgId,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date(),
      employmentEndedAt: null,
      version: 0,
    };
    const auth: AuthIdentityRecord = {
      id: authId,
      personId,
      provider: 'local-dev',
      providerSubject: `subject:${email}`,
      email,
      status: 'active',
      invitedAt: null,
      activatedAt: new Date(),
      revokedAt: null,
    };
    await this.runBatch([
      this.db().osPerson.create({
        data: { id: personId, givenName, familyName, version: 0 },
      }),
      this.db().osOrganizationMember.create({
        data: {
          id: memberId,
          organizationId: orgId,
          personId,
          employmentStatus: 'active',
          accessStatus: 'active',
          employmentStartedAt: new Date(),
          employmentEndedAt: null,
          version: 0,
        },
      }),
      this.db().osAuthIdentity.create({
        data: {
          id: authId,
          personId,
          provider: 'local-dev',
          providerSubject: `subject:${email}`,
          email,
          status: 'active',
          activatedAt: new Date(),
        },
      }),
      this.db().osRoleAssignment.create({
        data: {
          id: roleId,
          organizationId: orgId,
          memberId,
          roleKey: 'people.admin',
          effectiveAt: new Date('2020-01-01'),
        },
      }),
    ]);
    return { person, member, auth };
  }

  async seedScopedAdminMember(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
    roleKey: string,
  ): Promise<{ person: PersonRecord; member: MemberRecord; auth: AuthIdentityRecord }> {
    const seeded = await this.seedAdminMember(orgId, email, givenName, familyName);
    await this.db().osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        memberId: seeded.member.id,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
      },
    });
    return seeded;
  }

  async listDepartments(organizationId: string): Promise<DepartmentRecord[]> {
    const rows = await this.db().osDepartment.findMany({ where: { organizationId } });
    return rows.map((d) => ({
      id: d.id,
      organizationId: d.organizationId,
      name: d.name,
      code: d.code,
    }));
  }

  async getDepartmentInOrg(
    organizationId: string,
    departmentId: string,
  ): Promise<DepartmentRecord | null> {
    const row = await this.db().osDepartment.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      code: row.code,
    };
  }

  async countBusinessEvents(organizationId: string): Promise<number> {
    return this.db().osBusinessEvent.count({ where: { organizationId } });
  }

  async countAuditLogs(organizationId: string): Promise<number> {
    return this.db().osAuditLog.count({ where: { organizationId } });
  }

  async countOutbox(organizationId: string): Promise<number> {
    return this.db().osOutboxMessage.count({ where: { organizationId } });
  }

  /** Test helper — truncate all os_* tables (integration tests only). */
  async truncateAll(): Promise<void> {
    await this.db().$executeRawUnsafe(`
      TRUNCATE TABLE
        os_outbox_consumer_dedup,
        os_idempotency_keys,
        os_outbox_messages,
        os_audit_logs,
        os_business_events,
        os_orders,
        os_quote_lines,
        os_quotes,
        os_opportunities,
        os_party_read_models,
        os_work_read_models,
        os_approval_read_models,
        os_attention_read_models,
        os_projection_checkpoints,
        os_projection_freshness,
        os_quote_line_read_models,
        os_quote_read_models,
        os_order_read_models,
        os_opportunity_read_models,
        os_party_merge_requests,
        os_party_duplicate_candidates,
        os_leads,
        os_commercial_accounts,
        os_fiscal_identities,
        os_contacts,
        os_locations,
        os_import_rows,
        os_import_batches,
        os_party_role_assignments,
        os_parties,
        os_approval_requests,
        os_work_item_ownership_history,
        os_work_items,
        os_delegations,
        os_manager_assignments,
        os_department_assignments,
        os_role_assignments,
        os_auth_identities,
        os_organization_members,
        os_departments,
        os_territories,
        os_capability_states,
        os_persons,
        os_organizations
      CASCADE
    `);
  }

  private mapAuth(row: {
    id: string;
    personId: string;
    provider: string;
    providerSubject: string | null;
    email: string;
    status: string;
    invitedAt: Date | null;
    activatedAt: Date | null;
    revokedAt: Date | null;
  }): AuthIdentityRecord {
    return {
      id: row.id,
      personId: row.personId,
      provider: row.provider,
      providerSubject: row.providerSubject,
      email: row.email,
      status: row.status,
      invitedAt: row.invitedAt,
      activatedAt: row.activatedAt,
      revokedAt: row.revokedAt,
    };
  }
}
