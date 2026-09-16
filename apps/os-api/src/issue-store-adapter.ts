/**
 * Store adapter for IssueCommandService.
 * Composes PrismaOsIssueStore (CRUD) + shared auth methods from PrismaOsWorkforceStore.
 */
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  OsIssueStore as CommandStoreInterface,
  IssueRecord as CommandIssueRecord,
  IssueReferenceRecord as CommandReferenceRecord,
  IssueJournalEntryRecord as CommandJournalRecord,
  IssueWorkLinkRecord as CommandWorkLinkRecord,
  IssueRelationRecord as CommandRelationRecord,
  MemberRecord,
  RoleAssignmentRecord,
  DelegationRecord,
  IdempotencyRecord,
} from '@isalwa/os-issue';
import type {
  PrismaOsIssueStore,
  IssueRecord as PrismaIssueRecord,
} from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

/**
 * Adapts PrismaOsIssueStore + OsWorkforceStore to provide full OsIssueStore
 * interface for IssueCommandService (which needs auth + event append).
 */
export class IssueStoreAdapter implements CommandStoreInterface {
  constructor(
    private readonly issueStore: PrismaOsIssueStore,
    private readonly workforceStore: OsWorkforceStore,
  ) {}

  async runInTransaction<T>(fn: (store: CommandStoreInterface) => Promise<T>): Promise<T> {
    // IssueStore has its own transaction, workforceStore ops are read-only or separate
    return this.issueStore.runInTransaction(async (_scopedIssue) => {
      // Create a new adapter scoped to the transaction
      // Note: workforceStore reads are fine outside the issue tx
      const scopedAdapter = new IssueStoreAdapter(
        _scopedIssue as unknown as PrismaOsIssueStore,
        this.workforceStore,
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
  // Issue CRUD — adapted from PrismaOsIssueStore
  // ─────────────────────────────────────────────────────────────────────────────

  async insertIssue(issue: CommandIssueRecord): Promise<void> {
    // Map command record to prisma record
    const prismaRecord: PrismaIssueRecord = {
      id: issue.id,
      organizationId: issue.organizationId,
      version: issue.version,
      status: issue.status,
      title: issue.title,
      description: issue.description,
      reportedByMemberId: issue.reportedByMemberId,
      reportedAt: issue.reportedAt,
      currentOwnerMemberId: issue.ownerMemberId,
      confirmedCause: issue.confirmedCause,
      confirmedCauseByMemberId: null,
      confirmedCauseAt: null,
      resolution: issue.resolution,
      resolvedByMemberId: null,
      resolvedAt: issue.resolvedAt,
      outcome: issue.outcome,
      outcomeRecordedByMemberId: null,
      outcomeRecordedAt: null,
      createdAt: issue.reportedAt,
      updatedAt: issue.reportedAt,
    };
    await this.issueStore.insertIssue(prismaRecord);
  }

  async getIssueInOrg(organizationId: string, issueId: string): Promise<CommandIssueRecord | null> {
    const prismaRecord = await this.issueStore.getIssueInOrg(organizationId, issueId);
    if (!prismaRecord) return null;
    return this.toCommandIssueRecord(prismaRecord);
  }

  async updateIssue(
    issueId: string,
    patch: Partial<
      Pick<
        CommandIssueRecord,
        | 'status'
        | 'ownerMemberId'
        | 'confirmedCause'
        | 'resolution'
        | 'outcome'
        | 'triagedAt'
        | 'progressStartedAt'
        | 'resolvedAt'
        | 'closedAt'
        | 'reopenedAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void> {
    // Map command patch to prisma patch
    const prismaPatch: Parameters<typeof this.issueStore.updateIssue>[1] = {};
    if (patch.status !== undefined) prismaPatch.status = patch.status;
    if (patch.ownerMemberId !== undefined) prismaPatch.currentOwnerMemberId = patch.ownerMemberId;
    if (patch.confirmedCause !== undefined) prismaPatch.confirmedCause = patch.confirmedCause;
    if (patch.resolution !== undefined) prismaPatch.resolution = patch.resolution;
    if (patch.outcome !== undefined) prismaPatch.outcome = patch.outcome;
    if (patch.resolvedAt !== undefined) prismaPatch.resolvedAt = patch.resolvedAt;
    if (patch.version !== undefined) prismaPatch.version = patch.version;

    await this.issueStore.updateIssue(issueId, prismaPatch, expectedVersion);
  }

  async listIssuesForOwner(organizationId: string, ownerMemberId: string): Promise<CommandIssueRecord[]> {
    const records = await this.issueStore.listIssuesByOwner(organizationId, ownerMemberId);
    return records.map((r) => this.toCommandIssueRecord(r));
  }

  async listOpenIssuesInOrg(organizationId: string): Promise<CommandIssueRecord[]> {
    // Open = not closed, not resolved
    const reported = await this.issueStore.listIssuesByStatus(organizationId, 'reported');
    const triaged = await this.issueStore.listIssuesByStatus(organizationId, 'triaged');
    const inProgress = await this.issueStore.listIssuesByStatus(organizationId, 'in_progress');
    const reopened = await this.issueStore.listIssuesByStatus(organizationId, 'reopened');
    return [...reported, ...triaged, ...inProgress, ...reopened].map((r) =>
      this.toCommandIssueRecord(r),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // References
  // ─────────────────────────────────────────────────────────────────────────────

  async insertIssueReference(ref: CommandReferenceRecord): Promise<void> {
    await this.issueStore.insertReference({
      id: ref.id,
      organizationId: ref.organizationId,
      issueId: ref.issueId,
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      createdAt: ref.createdAt,
      createdByMemberId: '', // Not tracked in command record
    });
  }

  async listIssueReferences(
    organizationId: string,
    issueId: string,
  ): Promise<CommandReferenceRecord[]> {
    const refs = await this.issueStore.listReferencesForIssue(organizationId, issueId);
    return refs.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      issueId: r.issueId,
      referenceType: r.referenceType as CommandReferenceRecord['referenceType'],
      referenceId: r.referenceId,
      createdAt: r.createdAt,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Journal entries
  // ─────────────────────────────────────────────────────────────────────────────

  async insertJournalEntry(entry: CommandJournalRecord): Promise<void> {
    await this.issueStore.insertJournalEntry({
      id: entry.id,
      organizationId: entry.organizationId,
      issueId: entry.issueId,
      entryType: entry.entryType,
      content: entry.content,
      authorMemberId: entry.createdByMemberId,
      recordedAt: entry.createdAt,
      provenance: null,
    });
  }

  async listJournalEntries(
    organizationId: string,
    issueId: string,
  ): Promise<CommandJournalRecord[]> {
    const entries = await this.issueStore.listJournalEntriesForIssue(issueId);
    // Filter by org for safety (the query doesn't include org)
    return entries
      .filter((e) => e.organizationId === organizationId)
      .map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        issueId: e.issueId,
        entryType: e.entryType as CommandJournalRecord['entryType'],
        content: e.content,
        createdByMemberId: e.authorMemberId,
        createdAt: e.recordedAt,
      }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Work links
  // ─────────────────────────────────────────────────────────────────────────────

  async insertWorkLink(link: CommandWorkLinkRecord): Promise<void> {
    await this.issueStore.insertWorkLink({
      id: link.id,
      organizationId: link.organizationId,
      issueId: link.issueId,
      workItemId: link.workItemId,
      linkedByMemberId: link.linkedByMemberId,
      linkedAt: link.linkedAt,
    });
  }

  async listWorkLinks(organizationId: string, issueId: string): Promise<CommandWorkLinkRecord[]> {
    const links = await this.issueStore.listWorkLinksForIssue(organizationId, issueId);
    return links.map((l) => ({
      id: l.id,
      organizationId: l.organizationId,
      issueId: l.issueId,
      workItemId: l.workItemId,
      linkedByMemberId: l.linkedByMemberId,
      linkedAt: l.linkedAt,
    }));
  }

  async workItemExistsInOrg(organizationId: string, workItemId: string): Promise<boolean> {
    const item = await this.workforceStore.findWorkItem(organizationId, workItemId);
    return item !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Relations
  // ─────────────────────────────────────────────────────────────────────────────

  async insertIssueRelation(relation: CommandRelationRecord): Promise<void> {
    await this.issueStore.insertRelation({
      id: relation.id,
      organizationId: relation.organizationId,
      fromIssueId: relation.issueId,
      toIssueId: relation.relatedIssueId,
      relationType: relation.relationType,
      createdByMemberId: relation.createdByMemberId,
      createdAt: relation.createdAt,
    });
  }

  async listIssueRelations(
    organizationId: string,
    issueId: string,
  ): Promise<CommandRelationRecord[]> {
    const fromRelations = await this.issueStore.listRelationsFromIssue(organizationId, issueId);
    const toRelations = await this.issueStore.listRelationsToIssue(organizationId, issueId);
    // Convert from prisma format to command format
    const results: CommandRelationRecord[] = [
      ...fromRelations.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        issueId: r.fromIssueId,
        relatedIssueId: r.toIssueId,
        relationType: r.relationType as CommandRelationRecord['relationType'],
        createdByMemberId: r.createdByMemberId,
        createdAt: r.createdAt,
      })),
      ...toRelations.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        issueId: r.toIssueId,
        relatedIssueId: r.fromIssueId,
        relationType: r.relationType as CommandRelationRecord['relationType'],
        createdByMemberId: r.createdByMemberId,
        createdAt: r.createdAt,
      })),
    ];
    return results;
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

  private toCommandIssueRecord(prisma: PrismaIssueRecord): CommandIssueRecord {
    return {
      id: prisma.id,
      organizationId: prisma.organizationId,
      title: prisma.title,
      description: prisma.description,
      status: prisma.status as CommandIssueRecord['status'],
      reportedByMemberId: prisma.reportedByMemberId,
      ownerMemberId: prisma.currentOwnerMemberId,
      confirmedCause: prisma.confirmedCause,
      resolution: prisma.resolution,
      outcome: prisma.outcome,
      reportedAt: prisma.reportedAt,
      triagedAt: null, // Not stored in prisma schema yet
      progressStartedAt: null, // Not stored in prisma schema yet
      resolvedAt: prisma.resolvedAt,
      closedAt: null, // Not stored in prisma schema yet
      reopenedAt: null, // Not stored in prisma schema yet
      version: prisma.version,
    };
  }
}
