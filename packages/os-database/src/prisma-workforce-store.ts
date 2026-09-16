import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import {
  MEMBER_ACCESS_HISTORY_EVENT_TYPES,
  memberMatchesAccessEvent,
  type OsWorkforceStore,
} from '@isalwa/os-workforce';
import type {
  AuthIdentityRecord,
  DepartmentRecord,
  DelegationRecord,
  IdempotencyRecord,
  ManagerAssignmentRecord,
  MemberRecord,
  OrganizationRecord,
  OwnedCommercialAccountRecord,
  OwnedOpportunityRecord,
  OwnedOrderRecord,
  OwnedQuoteRecord,
  PendingApprovalForMemberRecord,
  ActiveCustomerCoverageRecord,
  OwnedIssueRecord,
  OpenCommitmentRecord,
  PersonRecord,
  RoleAssignmentRecord,
  WorkItemRecord,
} from '@isalwa/os-workforce';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';
import {
  OS_INTERACTIVE_TX,
  type OsInteractiveTxOptions,
} from './prisma-interactive-tx';

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
  /** Test-only: delay inside appendEventAndAudit before writes (ms). */
  testAppendDelayMs = 0;
  /** Test-only: override interactive tx options (latency regression). */
  interactiveTxOptions?: OsInteractiveTxOptions;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  private resolveInteractiveTxOptions(): OsInteractiveTxOptions {
    return this.interactiveTxOptions ?? OS_INTERACTIVE_TX;
  }

  async runInTransaction<T>(fn: (store: OsWorkforceStore) => Promise<T>): Promise<T> {
    const failNextAppend = this.testFailNextAppend;
    const appendDelayMs = this.testAppendDelayMs;
    const txOptions = this.resolveInteractiveTxOptions();
    return this.prisma.$transaction(
      async (tx) => {
        const scoped = new PrismaOsWorkforceStore(this.prisma);
        scoped.tx = tx;
        scoped.testFailNextAppend = failNextAppend;
        scoped.testAppendDelayMs = appendDelayMs;
        try {
          return await fn(scoped);
        } finally {
          scoped.tx = undefined;
          if (failNextAppend) {
            this.testFailNextAppend = scoped.testFailNextAppend;
          }
        }
      },
      { maxWait: txOptions.maxWait, timeout: txOptions.timeout },
    );
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

  /**
   * Matches a verified provider email. OsAuthIdentity has no organizationId;
   * do not invent a tenant predicate on this table.
   */
  async listAuthIdentitiesByProviderEmail(
    provider: string,
    email: string,
  ): Promise<AuthIdentityRecord[]> {
    const rows = await this.db().osAuthIdentity.findMany({
      where: {
        provider,
        email: { equals: email.trim().toLowerCase(), mode: 'insensitive' },
      },
    });
    return rows.map((row) => this.mapAuth(row));
  }

  async listMembersForPerson(personId: string, organizationId?: string): Promise<MemberRecord[]> {
    const rows = await this.db().osOrganizationMember.findMany({
      where: organizationId ? { personId, organizationId } : { personId },
    });
    return rows.map((row) => mapMember(row));
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
    return rows.length === 1 ? mapMember(rows[0]!) : null;
  }

  async listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]> {
    const rows = await this.db().osRoleAssignment.findMany({
      where: organizationId ? { memberId, organizationId } : { memberId },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      memberId: r.memberId,
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(
    delegateMemberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({
      where: organizationId ? { delegateMemberId, organizationId } : { delegateMemberId },
    });
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

  async listActiveCommercialAccountsForOwner(
    organizationId: string,
    memberId: string,
  ): Promise<OwnedCommercialAccountRecord[]> {
    const rows = await this.db().osCommercialAccount.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'active' },
    });
    return rows.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      partyId: a.partyId,
      ownerMemberId: a.ownerMemberId ?? memberId,
      status: a.status,
    }));
  }

  async listOpenOpportunitiesForOwner(
    organizationId: string,
    memberId: string,
  ): Promise<OwnedOpportunityRecord[]> {
    const rows = await this.db().osOpportunity.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'open' },
    });
    return rows.map((o) => ({
      id: o.id,
      organizationId: o.organizationId,
      ownerMemberId: o.ownerMemberId,
      title: o.title,
      status: o.status,
    }));
  }

  async listBlockingQuotesForOwner(
    organizationId: string,
    memberId: string,
  ): Promise<OwnedQuoteRecord[]> {
    // Quote statuses: draft | submitted | accepted | cancelled. No "closed".
    const rows = await this.db().osQuote.findMany({
      where: {
        organizationId,
        ownerMemberId: memberId,
        status: { not: 'cancelled' },
      },
    });
    return rows.map((q) => ({
      id: q.id,
      organizationId: q.organizationId,
      ownerMemberId: q.ownerMemberId,
      quoteNumber: q.quoteNumber,
      status: q.status,
    }));
  }

  async listActiveOrdersForOwner(
    organizationId: string,
    memberId: string,
  ): Promise<OwnedOrderRecord[]> {
    const rows = await this.db().osOrder.findMany({
      where: { organizationId, ownerMemberId: memberId, status: 'open' },
    });
    return rows.map((o) => ({
      id: o.id,
      organizationId: o.organizationId,
      ownerMemberId: o.ownerMemberId,
      orderNumber: o.orderNumber,
      status: o.status,
    }));
  }

  async listPendingApprovalsForApprover(
    organizationId: string,
    memberId: string,
  ): Promise<PendingApprovalForMemberRecord[]> {
    const rows = await this.db().osApprovalRequest.findMany({
      where: { organizationId, approverMemberId: memberId, status: 'pending' },
    });
    return rows.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      approverMemberId: a.approverMemberId,
      subjectType: a.subjectType,
      subjectId: a.subjectId,
      status: a.status,
    }));
  }

  async listActiveDirectReportAssignments(
    organizationId: string,
    managerMemberId: string,
    asOf: Date,
  ): Promise<ManagerAssignmentRecord[]> {
    const rows = await this.db().osManagerAssignment.findMany({
      where: {
        organizationId,
        managerMemberId,
        effectiveAt: { lte: asOf },
        OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
      },
    });
    return rows.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      memberId: m.memberId,
      managerMemberId: m.managerMemberId,
      effectiveAt: m.effectiveAt,
      endedAt: m.endedAt,
    }));
  }

  async listActiveDelegationsInvolvingMember(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({
      where: {
        organizationId,
        revokedAt: null,
        startsAt: { lte: asOf },
        expiresAt: { gt: asOf },
        OR: [{ delegatorMemberId: memberId }, { delegateMemberId: memberId }],
      },
    });
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

  async listActiveCustomerCoverageInvolvingMember(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<ActiveCustomerCoverageRecord[]> {
    const rows = await this.db().osCustomerCoverageGrant.findMany({
      where: {
        organizationId,
        grantType: 'commercial.customer.coverage',
        revokedAt: null,
        startsAt: { lte: asOf },
        OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
        AND: [
          {
            OR: [{ primaryOwnerMemberId: memberId }, { actingAdvisorMemberId: memberId }],
          },
        ],
      },
    });
    const partyIds = [...new Set(rows.map((r) => r.customerPartyId))];
    const parties =
      partyIds.length === 0
        ? []
        : await this.db().osParty.findMany({
            where: { organizationId, id: { in: partyIds } },
            select: { id: true, displayName: true },
          });
    const nameById = new Map(parties.map((p) => [p.id, p.displayName]));
    const out: ActiveCustomerCoverageRecord[] = [];
    for (const row of rows) {
      const base = {
        id: row.id,
        organizationId: row.organizationId,
        customerPartyId: row.customerPartyId,
        customerDisplayName: nameById.get(row.customerPartyId) ?? null,
        primaryOwnerMemberId: row.primaryOwnerMemberId,
        actingAdvisorMemberId: row.actingAdvisorMemberId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        revokedAt: row.revokedAt,
      };
      if (row.primaryOwnerMemberId === memberId) {
        out.push({ ...base, role: 'primary' });
      }
      if (row.actingAdvisorMemberId === memberId) {
        out.push({ ...base, role: 'acting' });
      }
    }
    return out;
  }

  async listActiveOwnedIssuesForMember(
    organizationId: string,
    memberId: string,
  ): Promise<{ id: string; organizationId: string; ownerMemberId: string; title: string | null; status: string }[]> {
    const rows = await this.db().osIssue.findMany({
      where: {
        organizationId,
        currentOwnerMemberId: memberId,
        status: { notIn: ['closed', 'resolved'] },
      },
      select: {
        id: true,
        organizationId: true,
        currentOwnerMemberId: true,
        title: true,
        status: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      ownerMemberId: r.currentOwnerMemberId ?? memberId, // Should always exist due to where clause
      title: r.title,
      status: r.status,
    }));
  }

  async listOpenCommitmentsForOwner(
    organizationId: string,
    memberId: string,
  ): Promise<{ id: string; organizationId: string; ownerMemberId: string; text: string; lifecycle: string }[]> {
    const rows = await this.db().osCommitment.findMany({
      where: {
        organizationId,
        ownerMemberId: memberId,
        lifecycle: 'open',
      },
      select: {
        id: true,
        organizationId: true,
        ownerMemberId: true,
        text: true,
        lifecycle: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      ownerMemberId: r.ownerMemberId,
      text: r.text,
      lifecycle: r.lifecycle,
    }));
  }

  async listDelegationsInvolvingMember(
    organizationId: string,
    memberId: string,
  ): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({
      where: {
        organizationId,
        OR: [{ delegatorMemberId: memberId }, { delegateMemberId: memberId }],
      },
    });
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

  async listMemberAccessBusinessEvents(
    organizationId: string,
    memberId: string,
    limit: number,
  ): Promise<StoredBusinessEvent[]> {
    const delegations = await this.listDelegationsInvolvingMember(organizationId, memberId);
    const delegationIds = delegations.map((d) => d.id);
    const rows = await this.db().osBusinessEvent.findMany({
      where: {
        organizationId,
        eventType: { in: [...MEMBER_ACCESS_HISTORY_EVENT_TYPES] },
        OR: [
          { primaryEntityType: 'organization_member', primaryEntityId: memberId },
          {
            payloadJson: {
              path: ['memberId'],
              equals: memberId,
            },
          },
          ...(delegationIds.length > 0
            ? [
                {
                  eventType: { in: ['delegation.granted', 'delegation.revoked'] },
                  primaryEntityId: { in: delegationIds },
                },
              ]
            : []),
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    return rows
      .map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        recordedAt: row.recordedAt,
        actorMemberId: row.actorMemberId,
        authorizationContext: row.authorizationContext as Record<string, unknown> | undefined,
        primaryEntityType: row.primaryEntityType,
        primaryEntityId: row.primaryEntityId,
        payload: row.payloadJson as Record<string, unknown> | undefined,
        provenance: row.provenance,
        correlationId: row.correlationId,
        idempotencyKey: row.idempotencyKey ?? undefined,
        dataOrigin: row.dataOrigin,
        capabilityKey: row.capabilityKey ?? undefined,
      }))
      .filter((event) =>
        memberMatchesAccessEvent(
          event,
          organizationId,
          memberId,
          new Set(delegationIds),
        ),
      );
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

  /**
   * Batch writes. Outside an interactive tx, Prisma's sequential batch API is used.
   * Inside an interactive tx, factories are invoked one-at-a-time so tx-bound
   * PrismaPromises are never preconstructed concurrently (Prisma forbids that).
   */
  private async runSequential(
    ops: Array<() => Prisma.PrismaPromise<unknown>>,
  ): Promise<void> {
    if (this.tx) {
      for (const op of ops) {
        await op();
      }
      return;
    }
    await this.prisma.$transaction(ops.map((op) => op()));
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
    if (this.testAppendDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.testAppendDelayMs));
    }
    await this.runSequential([
      () =>
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
      () =>
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
      () =>
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
    await this.runSequential([
      () =>
        this.db().osOrganization.create({
          data: { id: orgId, legalName, slug, status: 'active' },
        }),
      () =>
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
    await this.runSequential([
      () =>
        this.db().osPerson.create({
          data: { id: personId, givenName, familyName, version: 0 },
        }),
      () =>
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
      () =>
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
      () =>
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
