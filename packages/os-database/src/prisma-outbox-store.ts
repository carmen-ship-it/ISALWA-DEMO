import type {
  OutboxOperationalBacklog,
  OutboxRecoveryRequest,
  OutboxRecoveryResult,
  OutboxStats,
  IdempotencyRecord,
  OsOutboxStorePort,
  StoredOutboxMessage,
} from '@isalwa/os-events';
import { OUTBOX_RECOVERY_AUDIT_ACTION, buildAuditEntry } from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import { Prisma } from './generated/client';
import type { OsPrismaClient } from './client';

type OutboxRow = {
  id: string;
  organization_id: string;
  event_id: string;
  payload_json: unknown;
  status: string;
  attempt_count: number;
  next_attempt_at: Date | null;
  last_error: string | null;
  created_at: Date;
  published_at: Date | null;
};

function mapOutbox(row: OutboxRow): StoredOutboxMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    payloadJson: row.payload_json as Record<string, unknown>,
    status: row.status as StoredOutboxMessage['status'],
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

export class PrismaOsOutboxStore implements OsOutboxStorePort {
  constructor(private readonly prisma: OsPrismaClient) {}

  async claimPendingBatch(limit: number): Promise<StoredOutboxMessage[]> {
    /** In-flight lease — recoverable if worker crashes before publish/retry. */
    const leaseSeconds = 120;
    const rows = await this.prisma.$queryRaw<OutboxRow[]>`
      UPDATE os_outbox_messages AS m
      SET next_attempt_at = NOW() + (${leaseSeconds} * INTERVAL '1 second')
      FROM (
        SELECT id
        FROM os_outbox_messages
        WHERE status = 'pending'
          AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      ) AS claimed
      WHERE m.id = claimed.id
      RETURNING m.id, m.organization_id, m.event_id, m.payload_json, m.status,
                m.attempt_count, m.next_attempt_at, m.last_error, m.created_at, m.published_at
    `;
    return rows.map(mapOutbox);
  }

  async markPublished(outboxId: string): Promise<void> {
    await this.prisma.osOutboxMessage.update({
      where: { id: outboxId },
      data: { status: 'published', publishedAt: new Date(), lastError: null },
    });
  }

  async markForRetry(
    outboxId: string,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError: string,
  ): Promise<void> {
    await this.prisma.osOutboxMessage.update({
      where: { id: outboxId },
      data: {
        status: 'pending',
        attemptCount,
        nextAttemptAt,
        lastError,
      },
    });
  }

  async markDeadLetter(outboxId: string, lastError: string): Promise<void> {
    await this.prisma.osOutboxMessage.update({
      where: { id: outboxId },
      data: {
        status: 'dead_letter',
        lastError,
        nextAttemptAt: null,
      },
    });
  }

  async tryRecordConsumerDelivery(
    organizationId: string,
    consumerKey: string,
    eventId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.osOutboxConsumerDedup.create({
        data: { organizationId, consumerKey, eventId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getStats(organizationId?: string): Promise<OutboxStats> {
    const where = organizationId ? { organizationId } : {};
    const [pending, published, deadLetter] = await Promise.all([
      this.prisma.osOutboxMessage.count({ where: { ...where, status: 'pending' } }),
      this.prisma.osOutboxMessage.count({ where: { ...where, status: 'published' } }),
      this.prisma.osOutboxMessage.count({ where: { ...where, status: 'dead_letter' } }),
    ]);
    return { pending, published, deadLetter };
  }

  async getOperationalHealth(organizationId?: string): Promise<OutboxOperationalBacklog> {
    const orgFilter = organizationId
      ? Prisma.sql`AND organization_id = ${organizationId}`
      : Prisma.empty;

    const counts = await this.prisma.$queryRaw<
      Array<{ pending: bigint; published: bigint; dead_letter: bigint; retrying: bigint }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'published') AS published,
        COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
        COUNT(*) FILTER (
          WHERE status = 'pending' AND attempt_count > 0
        ) AS retrying
      FROM os_outbox_messages
      WHERE 1=1 ${orgFilter}
    `;

    const oldest = await this.prisma.$queryRaw<Array<{ age_ms: bigint | null }>>`
      SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) * 1000 AS age_ms
      FROM os_outbox_messages
      WHERE status = 'pending'
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
        ${orgFilter}
    `;

    const lastPublished = await this.prisma.osOutboxMessage.findFirst({
      where: { ...(organizationId ? { organizationId } : {}), status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    });

    const deadLetters = await this.prisma.osOutboxMessage.findMany({
      where: { ...(organizationId ? { organizationId } : {}), status: 'dead_letter' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        eventId: true,
        lastError: true,
        attemptCount: true,
        createdAt: true,
      },
    });

    const row = counts[0] ?? { pending: 0n, published: 0n, dead_letter: 0n, retrying: 0n };
    const ageMs = oldest[0]?.age_ms;

    return {
      pending: Number(row.pending),
      published: Number(row.published),
      deadLetter: Number(row.dead_letter),
      retrying: Number(row.retrying),
      oldestPendingAgeMs: ageMs == null ? null : Number(ageMs),
      lastPublishedAt: lastPublished?.publishedAt?.toISOString() ?? null,
      recentDeadLetters: deadLetters.map((d) => ({
        outboxId: d.id,
        eventId: d.eventId,
        lastError: d.lastError,
        attemptCount: d.attemptCount,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async getOutboxMessage(outboxId: string): Promise<StoredOutboxMessage | null> {
    const row = await this.prisma.osOutboxMessage.findUnique({ where: { id: outboxId } });
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      eventId: row.eventId,
      payloadJson: row.payloadJson as Record<string, unknown>,
      status: row.status as StoredOutboxMessage['status'],
      attemptCount: row.attemptCount,
      nextAttemptAt: row.nextAttemptAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
    };
  }

  async getDeadLetterInOrg(
    organizationId: string,
    outboxId: string,
  ): Promise<StoredOutboxMessage | null> {
    const row = await this.prisma.osOutboxMessage.findFirst({
      where: { id: outboxId, organizationId, status: 'dead_letter' },
    });
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      eventId: row.eventId,
      payloadJson: row.payloadJson as Record<string, unknown>,
      status: 'dead_letter',
      attemptCount: row.attemptCount,
      nextAttemptAt: row.nextAttemptAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
    };
  }

  async listDeadLetters(organizationId: string, limit = 25) {
    const rows = await this.prisma.osOutboxMessage.findMany({
      where: { organizationId, status: 'dead_letter' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventId: true,
        lastError: true,
        attemptCount: true,
        createdAt: true,
      },
    });
    return rows.map((d) => ({
      outboxId: d.id,
      eventId: d.eventId,
      lastError: d.lastError,
      attemptCount: d.attemptCount,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.prisma.osIdempotencyKey.findFirst({
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

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    await this.prisma.osIdempotencyKey.create({
      data: {
        id: createId(),
        organizationId: record.organizationId,
        key: record.key,
        commandName: record.commandName,
        resultJson: record.resultJson as Prisma.InputJsonValue,
        expiresAt: record.expiresAt,
      },
    });
  }

  async recoverDeadLetterDelivery(
    request: OutboxRecoveryRequest,
    idempotency?: { key: string; commandName: string },
  ): Promise<OutboxRecoveryResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.osOutboxMessage.findFirst({
        where: {
          id: request.outboxId,
          organizationId: request.organizationId,
          status: 'dead_letter',
        },
      });
      if (!row) {
        throw new Error('NOT_FOUND');
      }

      const before = {
        status: row.status,
        attemptCount: row.attemptCount,
        lastError: row.lastError,
        eventId: row.eventId,
      };

      await tx.osOutboxConsumerDedup.deleteMany({
        where: {
          organizationId: request.organizationId,
          eventId: row.eventId,
        },
      });

      const recoveredAt = new Date();
      await tx.osOutboxMessage.update({
        where: { id: row.id },
        data: {
          status: 'pending',
          attemptCount: 0,
          nextAttemptAt: null,
          lastError: null,
          publishedAt: null,
        },
      });

      const audit = buildAuditEntry(
        request.organizationId,
        request.actorMemberId,
        OUTBOX_RECOVERY_AUDIT_ACTION,
        'outbox_message',
        row.id,
        request.correlationId,
        before,
        {
          status: 'pending',
          recoveryReason: request.reason,
          recoveredAt: recoveredAt.toISOString(),
          recoveredByMemberId: request.actorMemberId,
          priorLastError: before.lastError,
          priorAttemptCount: before.attemptCount,
        },
      );

      await tx.osAuditLog.create({
        data: {
          id: audit.id,
          organizationId: audit.organizationId,
          actorMemberId: audit.actorMemberId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          beforeJson: audit.beforeJson as Prisma.InputJsonValue | undefined,
          afterJson: audit.afterJson as Prisma.InputJsonValue | undefined,
          correlationId: audit.correlationId,
          createdAt: audit.createdAt,
        },
      });

      const recovery: OutboxRecoveryResult = {
        outboxId: row.id,
        eventId: row.eventId,
        organizationId: row.organizationId,
        previousStatus: 'dead_letter',
        previousAttemptCount: before.attemptCount,
        previousLastError: before.lastError,
        recoveryStatus: 'requeued',
      };

      if (idempotency) {
        const commandResult = {
          commandId: recovery.outboxId,
          correlationId: request.correlationId,
          data: recovery,
        };
        await tx.osIdempotencyKey.create({
          data: {
            id: createId(),
            organizationId: request.organizationId,
            key: idempotency.key,
            commandName: idempotency.commandName,
            resultJson: commandResult as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + 86400_000),
          },
        });
      }

      return recovery;
    });
  }
}
