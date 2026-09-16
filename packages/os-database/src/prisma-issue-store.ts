import { createId } from '@isalwa/ts-utils';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';
import {
  OS_INTERACTIVE_TX,
  type OsInteractiveTxOptions,
} from './prisma-interactive-tx';

// ─────────────────────────────────────────────────────────────────────────────
// Record types
// ─────────────────────────────────────────────────────────────────────────────

export interface IssueRecord {
  id: string;
  organizationId: string;
  version: number;
  status: string;
  title: string | null;
  description: string;
  reportedByMemberId: string;
  reportedAt: Date;
  currentOwnerMemberId: string | null;
  confirmedCause: string | null;
  confirmedCauseByMemberId: string | null;
  confirmedCauseAt: Date | null;
  resolution: string | null;
  resolvedByMemberId: string | null;
  resolvedAt: Date | null;
  outcome: string | null;
  outcomeRecordedByMemberId: string | null;
  outcomeRecordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueReferenceRecord {
  id: string;
  organizationId: string;
  issueId: string;
  referenceType: string;
  referenceId: string;
  createdAt: Date;
  createdByMemberId: string;
}

export interface IssueJournalEntryRecord {
  id: string;
  organizationId: string;
  issueId: string;
  entryType: string;
  content: string;
  authorMemberId: string;
  recordedAt: Date;
  provenance: string | null;
}

export interface IssueWorkLinkRecord {
  id: string;
  organizationId: string;
  issueId: string;
  workItemId: string;
  linkedByMemberId: string;
  linkedAt: Date;
}

export interface IssueRelationRecord {
  id: string;
  organizationId: string;
  fromIssueId: string;
  toIssueId: string;
  relationType: string;
  createdByMemberId: string;
  createdAt: Date;
}

export interface IssueResolutionCycleRecord {
  id: string;
  organizationId: string;
  issueId: string;
  cycleIndex: number;
  confirmedCause: string | null;
  confirmedCauseByMemberId: string | null;
  confirmedCauseAt: Date | null;
  resolution: string | null;
  resolvedByMemberId: string | null;
  resolvedAt: Date | null;
  outcome: string | null;
  outcomeRecordedByMemberId: string | null;
  outcomeRecordedAt: Date | null;
  closedAt: Date | null;
  closedByMemberId: string | null;
  reopenedAt: Date | null;
  reopenedByMemberId: string | null;
  recordedAt: Date;
}

export interface IssueOwnershipHistoryRecord {
  id: string;
  organizationId: string;
  issueId: string;
  fromMemberId: string | null;
  toMemberId: string;
  changedByMemberId: string;
  changedAt: Date;
  reason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

export interface OsIssueStore {
  runInTransaction<T>(fn: (store: OsIssueStore) => Promise<T>): Promise<T>;

  // Issue CRUD
  insertIssue(issue: IssueRecord): Promise<void>;
  getIssueInOrg(organizationId: string, issueId: string): Promise<IssueRecord | null>;
  updateIssue(
    issueId: string,
    patch: Partial<Pick<
      IssueRecord,
      | 'status'
      | 'title'
      | 'description'
      | 'currentOwnerMemberId'
      | 'confirmedCause'
      | 'confirmedCauseByMemberId'
      | 'confirmedCauseAt'
      | 'resolution'
      | 'resolvedByMemberId'
      | 'resolvedAt'
      | 'outcome'
      | 'outcomeRecordedByMemberId'
      | 'outcomeRecordedAt'
      | 'version'
    >>,
    expectedVersion: number,
  ): Promise<void>;

  // List queries
  listIssuesByOwner(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]>;
  listIssuesByReporter(organizationId: string, reporterMemberId: string): Promise<IssueRecord[]>;
  listIssuesByStatus(organizationId: string, status: string): Promise<IssueRecord[]>;
  listActiveIssuesOwnedByMember(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]>;

  // Journal entries
  insertJournalEntry(entry: IssueJournalEntryRecord): Promise<void>;
  listJournalEntriesForIssue(issueId: string): Promise<IssueJournalEntryRecord[]>;

  // References
  insertReference(ref: IssueReferenceRecord): Promise<void>;
  listReferencesForIssue(organizationId: string, issueId: string): Promise<IssueReferenceRecord[]>;
  findIssuesByReference(
    organizationId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<IssueRecord[]>;

  // Work links
  insertWorkLink(link: IssueWorkLinkRecord): Promise<void>;
  listWorkLinksForIssue(organizationId: string, issueId: string): Promise<IssueWorkLinkRecord[]>;

  // Relations
  insertRelation(relation: IssueRelationRecord): Promise<void>;
  listRelationsFromIssue(organizationId: string, issueId: string): Promise<IssueRelationRecord[]>;
  listRelationsToIssue(organizationId: string, issueId: string): Promise<IssueRelationRecord[]>;

  // Resolution cycles
  insertResolutionCycle(cycle: IssueResolutionCycleRecord): Promise<void>;
  listResolutionCyclesForIssue(issueId: string): Promise<IssueResolutionCycleRecord[]>;

  // Ownership history
  insertOwnershipHistory(record: IssueOwnershipHistoryRecord): Promise<void>;
  listOwnershipHistoryForIssue(issueId: string): Promise<IssueOwnershipHistoryRecord[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma implementation
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaOsIssueStore implements OsIssueStore {
  private tx?: Prisma.TransactionClient;
  interactiveTxOptions?: OsInteractiveTxOptions;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  private resolveInteractiveTxOptions(): OsInteractiveTxOptions {
    return this.interactiveTxOptions ?? OS_INTERACTIVE_TX;
  }

  async runInTransaction<T>(fn: (store: OsIssueStore) => Promise<T>): Promise<T> {
    const txOptions = this.resolveInteractiveTxOptions();
    return this.prisma.$transaction(
      async (tx) => {
        const scoped = new PrismaOsIssueStore(this.prisma);
        scoped.tx = tx;
        try {
          return await fn(scoped);
        } finally {
          scoped.tx = undefined;
        }
      },
      { maxWait: txOptions.maxWait, timeout: txOptions.timeout },
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Issue CRUD
  // ───────────────────────────────────────────────────────────────────────────

  async insertIssue(issue: IssueRecord): Promise<void> {
    await this.db().osIssue.create({
      data: {
        id: issue.id,
        organizationId: issue.organizationId,
        version: issue.version,
        status: issue.status,
        title: issue.title,
        description: issue.description,
        reportedByMemberId: issue.reportedByMemberId,
        reportedAt: issue.reportedAt,
        currentOwnerMemberId: issue.currentOwnerMemberId,
        confirmedCause: issue.confirmedCause,
        confirmedCauseByMemberId: issue.confirmedCauseByMemberId,
        confirmedCauseAt: issue.confirmedCauseAt,
        resolution: issue.resolution,
        resolvedByMemberId: issue.resolvedByMemberId,
        resolvedAt: issue.resolvedAt,
        outcome: issue.outcome,
        outcomeRecordedByMemberId: issue.outcomeRecordedByMemberId,
        outcomeRecordedAt: issue.outcomeRecordedAt,
      },
    });
  }

  async getIssueInOrg(organizationId: string, issueId: string): Promise<IssueRecord | null> {
    const row = await this.db().osIssue.findFirst({
      where: { id: issueId, organizationId },
    });
    return row ? mapIssue(row) : null;
  }

  async updateIssue(
    issueId: string,
    patch: Partial<Pick<
      IssueRecord,
      | 'status'
      | 'title'
      | 'description'
      | 'currentOwnerMemberId'
      | 'confirmedCause'
      | 'confirmedCauseByMemberId'
      | 'confirmedCauseAt'
      | 'resolution'
      | 'resolvedByMemberId'
      | 'resolvedAt'
      | 'outcome'
      | 'outcomeRecordedByMemberId'
      | 'outcomeRecordedAt'
      | 'version'
    >>,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.db().osIssue.updateMany({
      where: { id: issueId, version: expectedVersion },
      data: patch,
    });
    if (result.count === 0) throw new Error('CONFLICT');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // List queries
  // ───────────────────────────────────────────────────────────────────────────

  async listIssuesByOwner(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]> {
    const rows = await this.db().osIssue.findMany({
      where: { organizationId, currentOwnerMemberId: ownerMemberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapIssue);
  }

  async listIssuesByReporter(organizationId: string, reporterMemberId: string): Promise<IssueRecord[]> {
    const rows = await this.db().osIssue.findMany({
      where: { organizationId, reportedByMemberId: reporterMemberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapIssue);
  }

  async listIssuesByStatus(organizationId: string, status: string): Promise<IssueRecord[]> {
    const rows = await this.db().osIssue.findMany({
      where: { organizationId, status },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapIssue);
  }

  async listActiveIssuesOwnedByMember(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]> {
    const rows = await this.db().osIssue.findMany({
      where: {
        organizationId,
        currentOwnerMemberId: ownerMemberId,
        status: { notIn: ['closed', 'resolved'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapIssue);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Journal entries
  // ───────────────────────────────────────────────────────────────────────────

  async insertJournalEntry(entry: IssueJournalEntryRecord): Promise<void> {
    await this.db().osIssueJournalEntry.create({
      data: {
        id: entry.id,
        organizationId: entry.organizationId,
        issueId: entry.issueId,
        entryType: entry.entryType,
        content: entry.content,
        authorMemberId: entry.authorMemberId,
        recordedAt: entry.recordedAt,
        provenance: entry.provenance,
      },
    });
  }

  async listJournalEntriesForIssue(issueId: string): Promise<IssueJournalEntryRecord[]> {
    const rows = await this.db().osIssueJournalEntry.findMany({
      where: { issueId },
      orderBy: { recordedAt: 'asc' },
    });
    return rows.map(mapJournalEntry);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // References
  // ───────────────────────────────────────────────────────────────────────────

  async insertReference(ref: IssueReferenceRecord): Promise<void> {
    await this.db().osIssueReference.create({
      data: {
        id: ref.id,
        organizationId: ref.organizationId,
        issueId: ref.issueId,
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        createdAt: ref.createdAt,
        createdByMemberId: ref.createdByMemberId,
      },
    });
  }

  async listReferencesForIssue(organizationId: string, issueId: string): Promise<IssueReferenceRecord[]> {
    const rows = await this.db().osIssueReference.findMany({
      where: { organizationId, issueId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapReference);
  }

  async findIssuesByReference(
    organizationId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<IssueRecord[]> {
    const refs = await this.db().osIssueReference.findMany({
      where: { organizationId, referenceType, referenceId },
      include: { issue: true },
    });
    return refs.map((r) => mapIssue(r.issue));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Work links
  // ───────────────────────────────────────────────────────────────────────────

  async insertWorkLink(link: IssueWorkLinkRecord): Promise<void> {
    await this.db().osIssueWorkLink.create({
      data: {
        id: link.id,
        organizationId: link.organizationId,
        issueId: link.issueId,
        workItemId: link.workItemId,
        linkedByMemberId: link.linkedByMemberId,
        linkedAt: link.linkedAt,
      },
    });
  }

  async listWorkLinksForIssue(organizationId: string, issueId: string): Promise<IssueWorkLinkRecord[]> {
    const rows = await this.db().osIssueWorkLink.findMany({
      where: { organizationId, issueId },
      orderBy: { linkedAt: 'asc' },
    });
    return rows.map(mapWorkLink);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Relations
  // ───────────────────────────────────────────────────────────────────────────

  async insertRelation(relation: IssueRelationRecord): Promise<void> {
    await this.db().osIssueRelation.create({
      data: {
        id: relation.id,
        organizationId: relation.organizationId,
        fromIssueId: relation.fromIssueId,
        toIssueId: relation.toIssueId,
        relationType: relation.relationType,
        createdByMemberId: relation.createdByMemberId,
        createdAt: relation.createdAt,
      },
    });
  }

  async listRelationsFromIssue(organizationId: string, issueId: string): Promise<IssueRelationRecord[]> {
    const rows = await this.db().osIssueRelation.findMany({
      where: { organizationId, fromIssueId: issueId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapRelation);
  }

  async listRelationsToIssue(organizationId: string, issueId: string): Promise<IssueRelationRecord[]> {
    const rows = await this.db().osIssueRelation.findMany({
      where: { organizationId, toIssueId: issueId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapRelation);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Resolution cycles
  // ───────────────────────────────────────────────────────────────────────────

  async insertResolutionCycle(cycle: IssueResolutionCycleRecord): Promise<void> {
    await this.db().osIssueResolutionCycle.create({
      data: {
        id: cycle.id,
        organizationId: cycle.organizationId,
        issueId: cycle.issueId,
        cycleIndex: cycle.cycleIndex,
        confirmedCause: cycle.confirmedCause,
        confirmedCauseByMemberId: cycle.confirmedCauseByMemberId,
        confirmedCauseAt: cycle.confirmedCauseAt,
        resolution: cycle.resolution,
        resolvedByMemberId: cycle.resolvedByMemberId,
        resolvedAt: cycle.resolvedAt,
        outcome: cycle.outcome,
        outcomeRecordedByMemberId: cycle.outcomeRecordedByMemberId,
        outcomeRecordedAt: cycle.outcomeRecordedAt,
        closedAt: cycle.closedAt,
        closedByMemberId: cycle.closedByMemberId,
        reopenedAt: cycle.reopenedAt,
        reopenedByMemberId: cycle.reopenedByMemberId,
        recordedAt: cycle.recordedAt,
      },
    });
  }

  async listResolutionCyclesForIssue(issueId: string): Promise<IssueResolutionCycleRecord[]> {
    const rows = await this.db().osIssueResolutionCycle.findMany({
      where: { issueId },
      orderBy: { cycleIndex: 'asc' },
    });
    return rows.map(mapResolutionCycle);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Ownership history
  // ───────────────────────────────────────────────────────────────────────────

  async insertOwnershipHistory(record: IssueOwnershipHistoryRecord): Promise<void> {
    await this.db().osIssueOwnershipHistory.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        issueId: record.issueId,
        fromMemberId: record.fromMemberId,
        toMemberId: record.toMemberId,
        changedByMemberId: record.changedByMemberId,
        changedAt: record.changedAt,
        reason: record.reason,
      },
    });
  }

  async listOwnershipHistoryForIssue(issueId: string): Promise<IssueOwnershipHistoryRecord[]> {
    const rows = await this.db().osIssueOwnershipHistory.findMany({
      where: { issueId },
      orderBy: { changedAt: 'asc' },
    });
    return rows.map(mapOwnershipHistory);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapIssue(row: {
  id: string;
  organizationId: string;
  version: number;
  status: string;
  title: string | null;
  description: string;
  reportedByMemberId: string;
  reportedAt: Date;
  currentOwnerMemberId: string | null;
  confirmedCause: string | null;
  confirmedCauseByMemberId: string | null;
  confirmedCauseAt: Date | null;
  resolution: string | null;
  resolvedByMemberId: string | null;
  resolvedAt: Date | null;
  outcome: string | null;
  outcomeRecordedByMemberId: string | null;
  outcomeRecordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IssueRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    version: row.version,
    status: row.status,
    title: row.title,
    description: row.description,
    reportedByMemberId: row.reportedByMemberId,
    reportedAt: row.reportedAt,
    currentOwnerMemberId: row.currentOwnerMemberId,
    confirmedCause: row.confirmedCause,
    confirmedCauseByMemberId: row.confirmedCauseByMemberId,
    confirmedCauseAt: row.confirmedCauseAt,
    resolution: row.resolution,
    resolvedByMemberId: row.resolvedByMemberId,
    resolvedAt: row.resolvedAt,
    outcome: row.outcome,
    outcomeRecordedByMemberId: row.outcomeRecordedByMemberId,
    outcomeRecordedAt: row.outcomeRecordedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapJournalEntry(row: {
  id: string;
  organizationId: string;
  issueId: string;
  entryType: string;
  content: string;
  authorMemberId: string;
  recordedAt: Date;
  provenance: string | null;
}): IssueJournalEntryRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    entryType: row.entryType,
    content: row.content,
    authorMemberId: row.authorMemberId,
    recordedAt: row.recordedAt,
    provenance: row.provenance,
  };
}

function mapReference(row: {
  id: string;
  organizationId: string;
  issueId: string;
  referenceType: string;
  referenceId: string;
  createdAt: Date;
  createdByMemberId: string;
}): IssueReferenceRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    createdAt: row.createdAt,
    createdByMemberId: row.createdByMemberId,
  };
}

function mapWorkLink(row: {
  id: string;
  organizationId: string;
  issueId: string;
  workItemId: string;
  linkedByMemberId: string;
  linkedAt: Date;
}): IssueWorkLinkRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    workItemId: row.workItemId,
    linkedByMemberId: row.linkedByMemberId,
    linkedAt: row.linkedAt,
  };
}

function mapRelation(row: {
  id: string;
  organizationId: string;
  fromIssueId: string;
  toIssueId: string;
  relationType: string;
  createdByMemberId: string;
  createdAt: Date;
}): IssueRelationRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    fromIssueId: row.fromIssueId,
    toIssueId: row.toIssueId,
    relationType: row.relationType,
    createdByMemberId: row.createdByMemberId,
    createdAt: row.createdAt,
  };
}

function mapResolutionCycle(row: {
  id: string;
  organizationId: string;
  issueId: string;
  cycleIndex: number;
  confirmedCause: string | null;
  confirmedCauseByMemberId: string | null;
  confirmedCauseAt: Date | null;
  resolution: string | null;
  resolvedByMemberId: string | null;
  resolvedAt: Date | null;
  outcome: string | null;
  outcomeRecordedByMemberId: string | null;
  outcomeRecordedAt: Date | null;
  closedAt: Date | null;
  closedByMemberId: string | null;
  reopenedAt: Date | null;
  reopenedByMemberId: string | null;
  recordedAt: Date;
}): IssueResolutionCycleRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    cycleIndex: row.cycleIndex,
    confirmedCause: row.confirmedCause,
    confirmedCauseByMemberId: row.confirmedCauseByMemberId,
    confirmedCauseAt: row.confirmedCauseAt,
    resolution: row.resolution,
    resolvedByMemberId: row.resolvedByMemberId,
    resolvedAt: row.resolvedAt,
    outcome: row.outcome,
    outcomeRecordedByMemberId: row.outcomeRecordedByMemberId,
    outcomeRecordedAt: row.outcomeRecordedAt,
    closedAt: row.closedAt,
    closedByMemberId: row.closedByMemberId,
    reopenedAt: row.reopenedAt,
    reopenedByMemberId: row.reopenedByMemberId,
    recordedAt: row.recordedAt,
  };
}

function mapOwnershipHistory(row: {
  id: string;
  organizationId: string;
  issueId: string;
  fromMemberId: string | null;
  toMemberId: string;
  changedByMemberId: string;
  changedAt: Date;
  reason: string | null;
}): IssueOwnershipHistoryRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    issueId: row.issueId,
    fromMemberId: row.fromMemberId,
    toMemberId: row.toMemberId,
    changedByMemberId: row.changedByMemberId,
    changedAt: row.changedAt,
    reason: row.reason,
  };
}
