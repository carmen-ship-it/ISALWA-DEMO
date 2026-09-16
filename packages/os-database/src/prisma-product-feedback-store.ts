import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';
import {
  OS_INTERACTIVE_TX,
  type OsInteractiveTxOptions,
} from './prisma-interactive-tx';

// ─────────────────────────────────────────────────────────────────────────────
// Record types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductFeedbackRecord {
  id: string;
  organizationId: string;
  memberId: string;
  route: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

export interface OsProductFeedbackStore {
  runInTransaction<T>(fn: (store: OsProductFeedbackStore) => Promise<T>): Promise<T>;

  insertFeedback(feedback: ProductFeedbackRecord): Promise<void>;
  listFeedbackForReviewers(organizationId: string, limit?: number): Promise<ProductFeedbackRecord[]>;
  listFeedbackByMember(organizationId: string, memberId: string): Promise<ProductFeedbackRecord[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma implementation
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaOsProductFeedbackStore implements OsProductFeedbackStore {
  private tx?: Prisma.TransactionClient;
  interactiveTxOptions?: OsInteractiveTxOptions;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  private resolveInteractiveTxOptions(): OsInteractiveTxOptions {
    return this.interactiveTxOptions ?? OS_INTERACTIVE_TX;
  }

  async runInTransaction<T>(fn: (store: OsProductFeedbackStore) => Promise<T>): Promise<T> {
    const txOptions = this.resolveInteractiveTxOptions();
    return this.prisma.$transaction(
      async (tx) => {
        const scoped = new PrismaOsProductFeedbackStore(this.prisma);
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

  async insertFeedback(feedback: ProductFeedbackRecord): Promise<void> {
    await this.db().osProductFeedback.create({
      data: {
        id: feedback.id,
        organizationId: feedback.organizationId,
        memberId: feedback.memberId,
        route: feedback.route,
        message: feedback.message,
        entityType: feedback.entityType,
        entityId: feedback.entityId,
        createdAt: feedback.createdAt,
      },
    });
  }

  async listFeedbackForReviewers(organizationId: string, limit = 100): Promise<ProductFeedbackRecord[]> {
    const rows = await this.db().osProductFeedback.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(mapFeedback);
  }

  async listFeedbackByMember(organizationId: string, memberId: string): Promise<ProductFeedbackRecord[]> {
    const rows = await this.db().osProductFeedback.findMany({
      where: { organizationId, memberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapFeedback);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────

function mapFeedback(row: {
  id: string;
  organizationId: string;
  memberId: string;
  route: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}): ProductFeedbackRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    memberId: row.memberId,
    route: row.route,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt,
  };
}
