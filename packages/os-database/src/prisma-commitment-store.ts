import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';
import {
  OS_INTERACTIVE_TX,
  type OsInteractiveTxOptions,
} from './prisma-interactive-tx';

// ─────────────────────────────────────────────────────────────────────────────
// Record types
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitmentRecord {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: Date | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  createdByMemberId: string;
  createdAt: Date;
  fulfilledAt: Date | null;
  fulfilledByMemberId: string | null;
  cancelledAt: Date | null;
  provenanceSuggestionId: string | null;
}

export interface CommitmentChangeRow {
  id: string;
  organizationId: string;
  commitmentId: string;
  kind: string;
  actorMemberId: string;
  reason: string | null;
  previousDueAt: Date | null;
  newDueAt: Date | null;
  previousOwnerMemberId: string | null;
  newOwnerMemberId: string | null;
  changedAt: Date;
}

export interface CommitmentNoticeInput {
  id: string;
  organizationId: string;
  recipientMemberId: string;
  kind: 'commitment_assigned' | 'commitment_due' | 'commitment_overdue' | 'responsibility_changed';
  dedupKey: string;
  title: string;
  body: string | null;
  commitmentId: string;
  partyId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

export interface OsCommitmentStore {
  runInTransaction<T>(fn: (store: OsCommitmentStore) => Promise<T>): Promise<T>;

  insertCommitment(commitment: CommitmentRecord): Promise<void>;
  getCommitmentInOrg(organizationId: string, commitmentId: string): Promise<CommitmentRecord | null>;
  updateCommitment(
    commitmentId: string,
    patch: Partial<Pick<
      CommitmentRecord,
      'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<void>;
  /** Applies the patch only while the commitment is still open under the same owner. False means someone else changed it first. */
  updateOpenCommitment(
    organizationId: string,
    commitmentId: string,
    expectedOwnerMemberId: string,
    patch: Partial<Pick<
      CommitmentRecord,
      'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<boolean>;
  insertCommitmentChange(change: CommitmentChangeRow): Promise<void>;
  listCommitmentChanges(organizationId: string, commitmentId: string): Promise<CommitmentChangeRow[]>;
  /** One open notice per recipient and issue; a second admission of the same issue is ignored. */
  admitCommitmentNotice(notice: CommitmentNoticeInput): Promise<void>;
  /**
   * Closes the commitment's open notices whose condition is gone. `keepRecipientMemberId`
   * leaves that member's notices alone (the new owner of a handover).
   */
  resolveCommitmentNotices(
    organizationId: string,
    commitmentId: string,
    options?: { kinds?: readonly string[]; exceptRecipientMemberId?: string },
  ): Promise<number>;

  // List queries
  listCommitmentsByOrg(organizationId: string): Promise<CommitmentRecord[]>;
  listCommitmentsByParty(organizationId: string, partyId: string): Promise<CommitmentRecord[]>;
  listCommitmentsByOwner(organizationId: string, ownerMemberId: string): Promise<CommitmentRecord[]>;
  listOpenCommitmentsByOwner(organizationId: string, ownerMemberId: string): Promise<CommitmentRecord[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma implementation
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaOsCommitmentStore implements OsCommitmentStore {
  private tx?: Prisma.TransactionClient;
  interactiveTxOptions?: OsInteractiveTxOptions;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  private resolveInteractiveTxOptions(): OsInteractiveTxOptions {
    return this.interactiveTxOptions ?? OS_INTERACTIVE_TX;
  }

  async runInTransaction<T>(fn: (store: OsCommitmentStore) => Promise<T>): Promise<T> {
    const txOptions = this.resolveInteractiveTxOptions();
    return this.prisma.$transaction(
      async (tx) => {
        const scoped = new PrismaOsCommitmentStore(this.prisma);
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

  async insertCommitment(commitment: CommitmentRecord): Promise<void> {
    await this.db().osCommitment.create({
      data: {
        id: commitment.id,
        organizationId: commitment.organizationId,
        partyId: commitment.partyId,
        ownerMemberId: commitment.ownerMemberId,
        text: commitment.text,
        dueAt: commitment.dueAt,
        origin: commitment.origin,
        relatedSubjectType: commitment.relatedSubjectType,
        relatedSubjectId: commitment.relatedSubjectId,
        lifecycle: commitment.lifecycle,
        createdByMemberId: commitment.createdByMemberId,
        createdAt: commitment.createdAt,
        fulfilledAt: commitment.fulfilledAt,
        fulfilledByMemberId: commitment.fulfilledByMemberId,
        cancelledAt: commitment.cancelledAt,
        provenanceSuggestionId: commitment.provenanceSuggestionId,
      },
    });
  }

  async getCommitmentInOrg(organizationId: string, commitmentId: string): Promise<CommitmentRecord | null> {
    const row = await this.db().osCommitment.findFirst({
      where: { id: commitmentId, organizationId },
    });
    return row ? mapCommitment(row) : null;
  }

  async updateCommitment(
    commitmentId: string,
    patch: Partial<Pick<
      CommitmentRecord,
      'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<void> {
    await this.db().osCommitment.update({
      where: { id: commitmentId },
      data: patch,
    });
  }

  async updateOpenCommitment(
    organizationId: string,
    commitmentId: string,
    expectedOwnerMemberId: string,
    patch: Partial<Pick<
      CommitmentRecord,
      'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<boolean> {
    const result = await this.db().osCommitment.updateMany({
      where: { id: commitmentId, organizationId, lifecycle: 'open', ownerMemberId: expectedOwnerMemberId },
      data: patch,
    });
    return result.count === 1;
  }

  async insertCommitmentChange(change: CommitmentChangeRow): Promise<void> {
    await this.db().osCommitmentChange.create({ data: change });
  }

  async listCommitmentChanges(organizationId: string, commitmentId: string): Promise<CommitmentChangeRow[]> {
    return this.db().osCommitmentChange.findMany({
      where: { organizationId, commitmentId },
      orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    });
  }

  async admitCommitmentNotice(notice: CommitmentNoticeInput): Promise<void> {
    await this.db().osInternalNotification.createMany({
      data: [
        {
          id: notice.id,
          organizationId: notice.organizationId,
          recipientMemberId: notice.recipientMemberId,
          kind: notice.kind,
          dedupKey: notice.dedupKey,
          title: notice.title,
          body: notice.body,
          sourceRecordType: 'commitment',
          sourceRecordId: notice.commitmentId,
          partyId: notice.partyId,
          channel: 'internal',
        },
      ],
      skipDuplicates: true,
    });
  }

  async resolveCommitmentNotices(
    organizationId: string,
    commitmentId: string,
    options: { kinds?: readonly string[]; exceptRecipientMemberId?: string } = {},
  ): Promise<number> {
    const result = await this.db().osInternalNotification.updateMany({
      where: {
        organizationId,
        sourceRecordType: 'commitment',
        sourceRecordId: commitmentId,
        resolvedAt: null,
        ...(options.kinds ? { kind: { in: [...options.kinds] } } : {}),
        ...(options.exceptRecipientMemberId
          ? { recipientMemberId: { not: options.exceptRecipientMemberId } }
          : {}),
      },
      data: { resolvedAt: new Date(), resolvedBecause: 'source_condition_gone' },
    });
    return result.count;
  }

  async listCommitmentsByOrg(organizationId: string): Promise<CommitmentRecord[]> {
    const rows = await this.db().osCommitment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapCommitment);
  }

  async listCommitmentsByParty(organizationId: string, partyId: string): Promise<CommitmentRecord[]> {
    const rows = await this.db().osCommitment.findMany({
      where: { organizationId, partyId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapCommitment);
  }

  async listCommitmentsByOwner(organizationId: string, ownerMemberId: string): Promise<CommitmentRecord[]> {
    const rows = await this.db().osCommitment.findMany({
      where: { organizationId, ownerMemberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapCommitment);
  }

  async listOpenCommitmentsByOwner(organizationId: string, ownerMemberId: string): Promise<CommitmentRecord[]> {
    const rows = await this.db().osCommitment.findMany({
      where: { organizationId, ownerMemberId, lifecycle: 'open' },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(mapCommitment);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────

function mapCommitment(row: {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: Date | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  createdByMemberId: string;
  createdAt: Date;
  fulfilledAt: Date | null;
  fulfilledByMemberId: string | null;
  cancelledAt: Date | null;
  provenanceSuggestionId: string | null;
}): CommitmentRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    ownerMemberId: row.ownerMemberId,
    text: row.text,
    dueAt: row.dueAt,
    origin: row.origin,
    relatedSubjectType: row.relatedSubjectType,
    relatedSubjectId: row.relatedSubjectId,
    lifecycle: row.lifecycle,
    createdByMemberId: row.createdByMemberId,
    createdAt: row.createdAt,
    fulfilledAt: row.fulfilledAt,
    fulfilledByMemberId: row.fulfilledByMemberId,
    cancelledAt: row.cancelledAt,
    provenanceSuggestionId: row.provenanceSuggestionId,
  };
}
