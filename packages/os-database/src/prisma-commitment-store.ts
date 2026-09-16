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
      'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<void>;

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
      'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
    >>,
  ): Promise<void> {
    await this.db().osCommitment.update({
      where: { id: commitmentId },
      data: patch,
    });
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
