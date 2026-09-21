import { createId } from '@isalwa/ts-utils';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsPartyStore } from '@isalwa/os-party';
import {
  createdAtDescCursorWhere,
  decodeBoundListCursor,
  encodeBoundListCursor,
  locationCursorWhere,
  type PartyBoundListOptions,
  type PartyBoundListPage,
} from '@isalwa/os-party';
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
  PartyOperatingSource,
  PartyRecord,
  PartyRoleAssignmentRecord,
  RoleAssignmentRecord,
} from '@isalwa/os-party';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';
import {
  OS_INTERACTIVE_TX,
  type OsInteractiveTxOptions,
} from './prisma-interactive-tx';

export class PrismaOsPartyStore implements OsPartyStore {
  private tx?: Prisma.TransactionClient;
  /** Test-only: fail once inside appendEventAndAudit (scoped into the active tx). */
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

  async runInTransaction<T>(fn: (store: OsPartyStore) => Promise<T>): Promise<T> {
    const failNextAppend = this.testFailNextAppend;
    const appendDelayMs = this.testAppendDelayMs;
    const txOptions = this.resolveInteractiveTxOptions();
    return this.prisma.$transaction(
      async (tx) => {
        const scoped = new PrismaOsPartyStore(this.prisma);
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

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const row = await this.db().osOrganizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    return row ? { id: row.id, organizationId: row.organizationId, accessStatus: row.accessStatus } : null;
  }

  async listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]> {
    const rows = await this.db().osRoleAssignment.findMany({
      where: organizationId ? { memberId, organizationId } : { memberId },
    });
    return rows.map((r) => ({
      memberId: r.memberId,
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]> {
    const rows = await this.db().osDelegation.findMany({
      where: organizationId
        ? { delegateMemberId: memberId, organizationId }
        : { delegateMemberId: memberId },
    });
    return rows.map((d) => ({
      scopes: d.scopesJson as string[],
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
    }));
  }

  async getPartyInOrg(organizationId: string, partyId: string): Promise<PartyRecord | null> {
    const row = await this.db().osParty.findFirst({ where: { id: partyId, organizationId } });
    return row ? mapParty(row) : null;
  }

  async getLocationInOrg(organizationId: string, locationId: string): Promise<LocationRecord | null> {
    const row = await this.db().osLocation.findFirst({ where: { id: locationId, organizationId } });
    return row ? mapLocation(row) : null;
  }

  async listLocationsForParty(
    organizationId: string,
    partyId: string,
    options?: PartyBoundListOptions,
  ): Promise<PartyBoundListPage<LocationRecord>> {
    const orderBy = [
      { status: 'asc' as const },
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ];
    if (!options) {
      const rows = await this.db().osLocation.findMany({
        where: { organizationId, partyId },
        orderBy,
      });
      return { items: rows.map(mapLocation), hasMore: false, nextCursor: null };
    }
    const limit = options.limit;
    const cursor = decodeBoundListCursor(options.cursor);
    const rows = await this.db().osLocation.findMany({
      where: { organizationId, partyId, ...(locationCursorWhere(cursor) as object) },
      orderBy,
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map(mapLocation),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeBoundListCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
              status: last.status,
            })
          : null,
    };
  }

  async insertLocation(location: LocationRecord): Promise<void> {
    await this.db().osLocation.create({
      data: {
        id: location.id,
        organizationId: location.organizationId,
        partyId: location.partyId,
        label: location.label,
        addressText: location.addressText,
        latitude: location.latitude,
        longitude: location.longitude,
        provenanceUrl: location.provenanceUrl,
        status: location.status,
        version: location.version,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      },
    });
  }

  async updateLocation(
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
  ): Promise<void> {
    const result = await this.db().osLocation.updateMany({
      where: { id: locationId, organizationId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async insertParty(party: PartyRecord): Promise<void> {
    await this.db().osParty.create({
      data: {
        id: party.id,
        organizationId: party.organizationId,
        partyKind: party.partyKind,
        displayName: party.displayName,
        legalName: party.legalName,
        status: party.status,
        mergedIntoPartyId: party.mergedIntoPartyId,
        version: party.version,
      },
    });
  }

  async updateParty(
    partyId: string,
    patch: Partial<Pick<PartyRecord, 'displayName' | 'legalName' | 'status' | 'mergedIntoPartyId' | 'version'>>,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osParty.updateMany({
      where: { id: partyId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async insertPartyRoleAssignment(assignment: PartyRoleAssignmentRecord): Promise<void> {
    await this.db().osPartyRoleAssignment.create({
      data: {
        id: assignment.id,
        organizationId: assignment.organizationId,
        partyId: assignment.partyId,
        roleKey: assignment.roleKey,
        effectiveAt: assignment.effectiveAt,
        endedAt: assignment.endedAt,
      },
    });
  }

  async getPartyRoleAssignment(
    organizationId: string,
    roleAssignmentId: string,
  ): Promise<PartyRoleAssignmentRecord | null> {
    const row = await this.db().osPartyRoleAssignment.findFirst({
      where: { id: roleAssignmentId, organizationId },
    });
    return row ? mapRole(row) : null;
  }

  async endPartyRoleAssignment(roleAssignmentId: string, endedAt: Date): Promise<void> {
    await this.db().osPartyRoleAssignment.update({
      where: { id: roleAssignmentId },
      data: { endedAt },
    });
  }

  async listActivePartyRoles(
    organizationId: string,
    partyId: string,
    asOf: Date,
  ): Promise<PartyRoleAssignmentRecord[]> {
    const rows = await this.db().osPartyRoleAssignment.findMany({
      where: {
        organizationId,
        partyId,
        effectiveAt: { lte: asOf },
        OR: [{ endedAt: null }, { endedAt: { gt: asOf } }],
      },
    });
    return rows.map(mapRole);
  }

  async insertContact(contact: ContactRecord): Promise<void> {
    await this.db().osContact.create({
      data: {
        id: contact.id,
        organizationId: contact.organizationId,
        organizationPartyId: contact.organizationPartyId,
        personPartyId: contact.personPartyId,
        givenName: contact.givenName,
        familyName: contact.familyName,
        email: contact.email,
        phone: contact.phone,
        whatsapp: contact.whatsapp,
        title: contact.title,
        status: contact.status,
        version: contact.version,
      },
    });
  }

  async updateContact(
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
  ): Promise<void> {
    const result = await this.db().osContact.updateMany({
      where: { id: contactId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  async getContactInOrg(organizationId: string, contactId: string): Promise<ContactRecord | null> {
    const row = await this.db().osContact.findFirst({ where: { id: contactId, organizationId } });
    return row ? mapContact(row) : null;
  }

  async listContactsForOrgParty(
    organizationId: string,
    organizationPartyId: string,
    options?: PartyBoundListOptions,
  ): Promise<PartyBoundListPage<ContactRecord>> {
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
    if (!options) {
      const rows = await this.db().osContact.findMany({
        where: { organizationId, organizationPartyId },
        orderBy,
      });
      return { items: rows.map(mapContact), hasMore: false, nextCursor: null };
    }
    const limit = options.limit;
    const cursor = decodeBoundListCursor(options.cursor);
    const rows = await this.db().osContact.findMany({
      where: {
        organizationId,
        organizationPartyId,
        ...(createdAtDescCursorWhere(cursor) as object),
      },
      orderBy,
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map(mapContact),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeBoundListCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async reassignContactsOrgParty(
    organizationId: string,
    fromPartyId: string,
    toPartyId: string,
  ): Promise<number> {
    const result = await this.db().osContact.updateMany({
      where: { organizationId, organizationPartyId: fromPartyId },
      data: { organizationPartyId: toPartyId },
    });
    return result.count;
  }

  async insertFiscalIdentity(record: FiscalIdentityRecord): Promise<void> {
    await this.db().osFiscalIdentity.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        partyId: record.partyId,
        nit: record.nit,
        razonSocial: record.razonSocial,
        effectiveAt: record.effectiveAt,
        endedAt: record.endedAt,
      },
    });
  }

  async endActiveFiscalIdentities(partyId: string, endedAt: Date): Promise<void> {
    await this.db().osFiscalIdentity.updateMany({
      where: { partyId, endedAt: null },
      data: { endedAt },
    });
  }

  async findActiveFiscalByNit(
    organizationId: string,
    nit: string,
    excludePartyId?: string,
  ): Promise<FiscalIdentityRecord | null> {
    const row = await this.db().osFiscalIdentity.findFirst({
      where: {
        organizationId,
        nit,
        endedAt: null,
        ...(excludePartyId ? { partyId: { not: excludePartyId } } : {}),
      },
    });
    return row ? mapFiscal(row) : null;
  }

  async listFiscalIdentitiesForParty(organizationId: string, partyId: string): Promise<FiscalIdentityRecord[]> {
    const rows = await this.db().osFiscalIdentity.findMany({
      where: { organizationId, partyId },
      orderBy: { effectiveAt: 'asc' },
    });
    return rows.map(mapFiscal);
  }

  async insertCommercialAccount(account: CommercialAccountRecord): Promise<void> {
    await this.db().osCommercialAccount.create({
      data: {
        id: account.id,
        organizationId: account.organizationId,
        partyId: account.partyId,
        territoryId: account.territoryId,
        ownerMemberId: account.ownerMemberId,
        status: account.status,
        version: account.version,
      },
    });
  }

  async listPartyOperatingSources(
    organizationId: string,
    partyIds: string[],
  ): Promise<PartyOperatingSource[]> {
    const ids = [...new Set(partyIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return [];

    const [contacts, locations, accounts] = await Promise.all([
      this.db().osContact.findMany({
        where: { organizationId, organizationPartyId: { in: ids } },
        select: { id: true, organizationPartyId: true, status: true, phone: true },
      }),
      this.db().osLocation.findMany({
        where: { organizationId, partyId: { in: ids } },
        select: {
          partyId: true,
          status: true,
          latitude: true,
          longitude: true,
          provenanceUrl: true,
        },
      }),
      this.db().osCommercialAccount.findMany({
        where: { organizationId, partyId: { in: ids } },
        select: { partyId: true, ownerMemberId: true },
      }),
    ]);

    return ids.map((partyId) => ({
      partyId,
      contacts: contacts
        .filter((contact) => contact.organizationPartyId === partyId)
        .map((contact) => ({ id: contact.id, status: contact.status, phone: contact.phone })),
      locations: locations
        .filter((location) => location.partyId === partyId)
        .map((location) => ({
          status: location.status,
          latitude: location.latitude,
          longitude: location.longitude,
          provenanceUrl: location.provenanceUrl,
        })),
      commercialOwnerMemberId:
        accounts.find((account) => account.partyId === partyId)?.ownerMemberId ?? null,
    }));
  }

  async getCommercialAccountForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommercialAccountRecord | null> {
    const row = await this.db().osCommercialAccount.findFirst({
      where: { organizationId, partyId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          partyId: row.partyId,
          territoryId: row.territoryId,
          ownerMemberId: row.ownerMemberId,
          status: row.status,
          version: row.version,
        }
      : null;
  }

  async reassignCommercialAccountParty(
    organizationId: string,
    fromPartyId: string,
    toPartyId: string,
  ): Promise<void> {
    await this.db().osCommercialAccount.updateMany({
      where: { organizationId, partyId: fromPartyId },
      data: { partyId: toPartyId },
    });
  }

  async insertLead(lead: LeadRecord): Promise<void> {
    await this.db().osLead.create({
      data: {
        id: lead.id,
        organizationId: lead.organizationId,
        displayName: lead.displayName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        resolvedPartyId: lead.resolvedPartyId,
        batchRef: lead.batchRef,
      },
    });
  }

  async getLeadInOrg(organizationId: string, leadId: string): Promise<LeadRecord | null> {
    const row = await this.db().osLead.findFirst({ where: { id: leadId, organizationId } });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          displayName: row.displayName,
          email: row.email,
          phone: row.phone,
          status: row.status,
          resolvedPartyId: row.resolvedPartyId,
          batchRef: row.batchRef,
        }
      : null;
  }

  async resolveLead(leadId: string, resolvedPartyId: string): Promise<void> {
    await this.db().osLead.update({
      where: { id: leadId },
      data: { status: 'resolved', resolvedPartyId },
    });
  }

  async upsertDuplicateCandidate(candidate: DuplicateCandidateRecord): Promise<void> {
    await this.db().osPartyDuplicateCandidate.upsert({
      where: {
        organizationId_partyIdA_partyIdB: {
          organizationId: candidate.organizationId,
          partyIdA: candidate.partyIdA,
          partyIdB: candidate.partyIdB,
        },
      },
      create: {
        id: candidate.id,
        organizationId: candidate.organizationId,
        partyIdA: candidate.partyIdA,
        partyIdB: candidate.partyIdB,
        matchReason: candidate.matchReason,
        confidence: candidate.confidence,
        status: candidate.status,
      },
      update: {
        matchReason: candidate.matchReason,
        confidence: candidate.confidence,
        status: candidate.status,
      },
    });
  }

  async listDuplicateCandidates(organizationId: string, partyId: string): Promise<DuplicateCandidateRecord[]> {
    const rows = await this.db().osPartyDuplicateCandidate.findMany({
      where: {
        organizationId,
        OR: [{ partyIdA: partyId }, { partyIdB: partyId }],
      },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      partyIdA: r.partyIdA,
      partyIdB: r.partyIdB,
      matchReason: r.matchReason,
      confidence: r.confidence,
      status: r.status,
    }));
  }

  async insertMergeRequest(request: MergeRequestRecord): Promise<void> {
    await this.db().osPartyMergeRequest.create({
      data: {
        id: request.id,
        organizationId: request.organizationId,
        sourcePartyId: request.sourcePartyId,
        targetPartyId: request.targetPartyId,
        status: request.status,
        requestedByMemberId: request.requestedByMemberId,
        decidedByMemberId: request.decidedByMemberId,
        lineageSnapshotJson: request.lineageSnapshotJson as Prisma.InputJsonValue | undefined,
        createdAt: request.createdAt,
        decidedAt: request.decidedAt,
      },
    });
  }

  async getMergeRequest(organizationId: string, mergeRequestId: string): Promise<MergeRequestRecord | null> {
    const row = await this.db().osPartyMergeRequest.findFirst({
      where: { id: mergeRequestId, organizationId },
    });
    return row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          sourcePartyId: row.sourcePartyId,
          targetPartyId: row.targetPartyId,
          status: row.status,
          requestedByMemberId: row.requestedByMemberId,
          decidedByMemberId: row.decidedByMemberId,
          lineageSnapshotJson: row.lineageSnapshotJson as Record<string, unknown> | null,
          createdAt: row.createdAt,
          decidedAt: row.decidedAt,
        }
      : null;
  }

  async updateMergeRequest(
    mergeRequestId: string,
    patch: Partial<Pick<MergeRequestRecord, 'status' | 'decidedByMemberId' | 'lineageSnapshotJson' | 'decidedAt'>>,
  ): Promise<void> {
    await this.db().osPartyMergeRequest.update({
      where: { id: mergeRequestId },
      data: {
        status: patch.status,
        decidedByMemberId: patch.decidedByMemberId,
        lineageSnapshotJson: patch.lineageSnapshotJson as Prisma.InputJsonValue | undefined,
        decidedAt: patch.decidedAt,
      },
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
}

function mapParty(row: {
  id: string;
  organizationId: string;
  partyKind: string;
  displayName: string;
  legalName: string | null;
  status: string;
  mergedIntoPartyId: string | null;
  version: number;
}): PartyRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyKind: row.partyKind as PartyRecord['partyKind'],
    displayName: row.displayName,
    legalName: row.legalName,
    status: row.status as PartyRecord['status'],
    mergedIntoPartyId: row.mergedIntoPartyId,
    version: row.version,
  };
}

function mapRole(row: {
  id: string;
  organizationId: string;
  partyId: string;
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
}): PartyRoleAssignmentRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    roleKey: row.roleKey as PartyRoleAssignmentRecord['roleKey'],
    effectiveAt: row.effectiveAt,
    endedAt: row.endedAt,
  };
}

function mapContact(row: {
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
}): ContactRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationPartyId: row.organizationPartyId,
    personPartyId: row.personPartyId,
    givenName: row.givenName,
    familyName: row.familyName,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    title: row.title,
    status: row.status,
    version: row.version,
  };
}

function mapLocation(row: {
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
  createdAt: Date;
  updatedAt: Date;
}): LocationRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    label: row.label,
    addressText: row.addressText,
    latitude: row.latitude,
    longitude: row.longitude,
    provenanceUrl: row.provenanceUrl,
    status: row.status as LocationRecord['status'],
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFiscal(row: {
  id: string;
  organizationId: string;
  partyId: string;
  nit: string;
  razonSocial: string;
  effectiveAt: Date;
  endedAt: Date | null;
}): FiscalIdentityRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    nit: row.nit,
    razonSocial: row.razonSocial,
    effectiveAt: row.effectiveAt,
    endedAt: row.endedAt,
  };
}
