/**
 * Store adapter for CommitmentCommandService.
 * Composes PrismaOsCommitmentStore (CRUD) + shared auth methods from PrismaOsWorkforceStore.
 */
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  OsCommitmentStore as CommandStoreInterface,
  CommitmentDatabaseRecord,
  MemberRecord,
  RoleAssignmentRecord,
  DelegationRecord,
  IdempotencyRecord,
} from '@isalwa/os-commitment';
import type {
  PrismaOsCommitmentStore,
  CommitmentRecord as PrismaCommitmentRecord,
} from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsPartyStore } from '@isalwa/os-party';

/**
 * Adapts PrismaOsCommitmentStore + OsWorkforceStore to provide full OsCommitmentStore
 * interface for CommitmentCommandService (which needs auth + event append + party validation).
 */
export class CommitmentStoreAdapter implements CommandStoreInterface {
  constructor(
    private readonly commitmentStore: PrismaOsCommitmentStore,
    private readonly workforceStore: OsWorkforceStore,
    private readonly partyStore: OsPartyStore,
  ) {}

  async runInTransaction<T>(fn: (store: CommandStoreInterface) => Promise<T>): Promise<T> {
    return this.commitmentStore.runInTransaction(async (_scopedCommitment) => {
      const scopedAdapter = new CommitmentStoreAdapter(
        _scopedCommitment as unknown as PrismaOsCommitmentStore,
        this.workforceStore,
        this.partyStore,
      );
      return fn(scopedAdapter);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auth lookups — delegated to workforce store
  // ─────────────────────────────────────────────────────────────────────────────

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const member = await this.workforceStore.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    return {
      id: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
    };
  }

  async listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]> {
    const roles = await this.workforceStore.listRoleAssignmentsForMember(memberId, organizationId);
    return roles.map((r) => ({
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    }));
  }

  async listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]> {
    const delegations = await this.workforceStore.listDelegationsForDelegate(
      memberId,
      organizationId,
    );
    return delegations.map((d) => ({
      delegatorMemberId: d.delegatorMemberId,
      scopes: d.scopes,
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Party validation — delegated to party store
  // ─────────────────────────────────────────────────────────────────────────────

  async partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean> {
    const party = await this.partyStore.getPartyInOrg(organizationId, partyId);
    return party !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Commitment CRUD — delegated to prisma store with type mapping
  // ─────────────────────────────────────────────────────────────────────────────

  async insertCommitment(record: CommitmentDatabaseRecord): Promise<void> {
    const prismaRecord: PrismaCommitmentRecord = {
      id: record.id,
      organizationId: record.organizationId,
      partyId: record.partyId,
      ownerMemberId: record.ownerMemberId,
      text: record.text,
      dueAt: record.dueAt,
      origin: record.origin,
      relatedSubjectType: record.relatedSubjectType,
      relatedSubjectId: record.relatedSubjectId,
      lifecycle: record.lifecycle,
      createdByMemberId: record.createdByMemberId,
      createdAt: record.createdAt,
      fulfilledAt: record.fulfilledAt,
      fulfilledByMemberId: record.fulfilledByMemberId,
      cancelledAt: record.cancelledAt,
      provenanceSuggestionId: record.provenanceSuggestionId,
    };
    await this.commitmentStore.insertCommitment(prismaRecord);
  }

  async getCommitmentInOrg(
    organizationId: string,
    commitmentId: string,
  ): Promise<CommitmentDatabaseRecord | null> {
    const record = await this.commitmentStore.getCommitmentInOrg(organizationId, commitmentId);
    if (!record) return null;
    return this.toCommandRecord(record);
  }

  async updateCommitment(
    commitmentId: string,
    patch: Partial<
      Pick<
        CommitmentDatabaseRecord,
        'ownerMemberId' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
      >
    >,
  ): Promise<void> {
    const prismaPatch: Parameters<typeof this.commitmentStore.updateCommitment>[1] = {};
    if (patch.lifecycle !== undefined) prismaPatch.lifecycle = patch.lifecycle;
    if (patch.fulfilledAt !== undefined) prismaPatch.fulfilledAt = patch.fulfilledAt;
    if (patch.fulfilledByMemberId !== undefined) prismaPatch.fulfilledByMemberId = patch.fulfilledByMemberId;
    if (patch.cancelledAt !== undefined) prismaPatch.cancelledAt = patch.cancelledAt;
    // ownerMemberId is not in the prisma patch type — handle separately if needed
    await this.commitmentStore.updateCommitment(commitmentId, prismaPatch);
  }

  async listCommitmentsForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommitmentDatabaseRecord[]> {
    const records = await this.commitmentStore.listCommitmentsByParty(organizationId, partyId);
    return records.map((r) => this.toCommandRecord(r));
  }

  async listCommitmentsForOwner(
    organizationId: string,
    ownerMemberId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]> {
    let records: PrismaCommitmentRecord[];
    if (lifecycle === 'open') {
      records = await this.commitmentStore.listOpenCommitmentsByOwner(organizationId, ownerMemberId);
    } else {
      records = await this.commitmentStore.listCommitmentsByOwner(organizationId, ownerMemberId);
      if (lifecycle) {
        records = records.filter((r) => r.lifecycle === lifecycle);
      }
    }
    return records.map((r) => this.toCommandRecord(r));
  }

  async listCommitmentsInOrg(
    organizationId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]> {
    const records = await this.commitmentStore.listCommitmentsByOrg(organizationId);
    const filtered = lifecycle ? records.filter((r) => r.lifecycle === lifecycle) : records;
    return filtered.map((r) => this.toCommandRecord(r));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Events/audit — delegated to workforce store (uses same Prisma client)
  // ─────────────────────────────────────────────────────────────────────────────

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    await this.workforceStore.appendEventAndAudit(event, outbox, audit);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    return this.workforceStore.findIdempotency(organizationId, key);
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    await this.workforceStore.saveIdempotency(record);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private toCommandRecord(prisma: PrismaCommitmentRecord): CommitmentDatabaseRecord {
    return {
      id: prisma.id,
      organizationId: prisma.organizationId,
      partyId: prisma.partyId,
      ownerMemberId: prisma.ownerMemberId,
      text: prisma.text,
      dueAt: prisma.dueAt,
      origin: prisma.origin as CommitmentDatabaseRecord['origin'],
      relatedSubjectType: prisma.relatedSubjectType as CommitmentDatabaseRecord['relatedSubjectType'],
      relatedSubjectId: prisma.relatedSubjectId,
      lifecycle: prisma.lifecycle as CommitmentDatabaseRecord['lifecycle'],
      createdByMemberId: prisma.createdByMemberId,
      createdAt: prisma.createdAt,
      fulfilledAt: prisma.fulfilledAt,
      fulfilledByMemberId: prisma.fulfilledByMemberId,
      cancelledAt: prisma.cancelledAt,
      provenanceSuggestionId: prisma.provenanceSuggestionId,
    };
  }
}
