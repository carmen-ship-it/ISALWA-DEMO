import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OsOutboxWorker,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
  type OsOutboxStorePort,
  type OutboxOperationalBacklog,
  type OutboxStats,
  type StoredOutboxMessage,
} from './index';

class MemoryOutboxStore implements OsOutboxStorePort {
  messages: StoredOutboxMessage[] = [];
  dedup = new Set<string>();

  async claimPendingBatch(limit: number): Promise<StoredOutboxMessage[]> {
    const now = Date.now();
    return this.messages
      .filter(
        (m) =>
          m.status === 'pending' &&
          (!m.nextAttemptAt || m.nextAttemptAt.getTime() <= now),
      )
      .slice(0, limit);
  }

  async markPublished(outboxId: string): Promise<void> {
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'published';
      m.publishedAt = new Date();
      m.lastError = null;
    }
  }

  async markForRetry(
    outboxId: string,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError: string,
  ): Promise<void> {
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'pending';
      m.attemptCount = attemptCount;
      m.nextAttemptAt = nextAttemptAt;
      m.lastError = lastError;
    }
  }

  async markDeadLetter(outboxId: string, lastError: string): Promise<void> {
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'dead_letter';
      m.lastError = lastError;
      m.nextAttemptAt = null;
    }
  }

  async tryRecordConsumerDelivery(
    organizationId: string,
    consumerKey: string,
    eventId: string,
  ): Promise<boolean> {
    const key = `${organizationId}:${consumerKey}:${eventId}`;
    if (this.dedup.has(key)) return false;
    this.dedup.add(key);
    return true;
  }

  async getStats(organizationId?: string): Promise<OutboxStats> {
    const list = organizationId
      ? this.messages.filter((m) => m.organizationId === organizationId)
      : this.messages;
    return {
      pending: list.filter((m) => m.status === 'pending').length,
      published: list.filter((m) => m.status === 'published').length,
      deadLetter: list.filter((m) => m.status === 'dead_letter').length,
    };
  }

  async getOperationalHealth(organizationId?: string): Promise<OutboxOperationalBacklog> {
    const stats = await this.getStats(organizationId);
    const list = organizationId
      ? this.messages.filter((m) => m.organizationId === organizationId)
      : this.messages;
    const pending = list.filter((m) => m.status === 'pending');
    const retrying = pending.filter((m) => m.attemptCount > 0).length;
    const oldest = pending.reduce<number | null>((min, m) => {
      const age = Date.now() - m.createdAt.getTime();
      return min == null ? age : Math.min(min, age);
    }, null);
    const published = list.filter((m) => m.status === 'published' && m.publishedAt);
    const lastPublished = published.sort(
      (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    )[0];
    const deadLetters = list
      .filter((m) => m.status === 'dead_letter')
      .slice(-5)
      .reverse();
    return {
      ...stats,
      retrying,
      oldestPendingAgeMs: oldest,
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
    return this.messages.find((m) => m.id === outboxId) ?? null;
  }

  async getDeadLetterInOrg(organizationId: string, outboxId: string) {
    const m = this.messages.find(
      (x) => x.id === outboxId && x.organizationId === organizationId && x.status === 'dead_letter',
    );
    return m ?? null;
  }

  async listDeadLetters(organizationId: string, limit = 25) {
    return this.messages
      .filter((m) => m.organizationId === organizationId && m.status === 'dead_letter')
      .slice(0, limit)
      .map((d) => ({
        outboxId: d.id,
        eventId: d.eventId,
        lastError: d.lastError,
        attemptCount: d.attemptCount,
        createdAt: d.createdAt.toISOString(),
      }));
  }

  async findIdempotency() {
    return null;
  }

  async saveIdempotency() {}

  async recoverDeadLetterDelivery(request: import('./outbox-port').OutboxRecoveryRequest) {
    const m = await this.getDeadLetterInOrg(request.organizationId, request.outboxId);
    if (!m) throw new Error('NOT_FOUND');
    const before = { attemptCount: m.attemptCount, lastError: m.lastError };
    this.dedup.forEach((key) => {
      if (key.startsWith(`${request.organizationId}:`) && key.endsWith(`:${m.eventId}`)) {
        this.dedup.delete(key);
      }
    });
    m.status = 'pending';
    m.attemptCount = 0;
    m.lastError = null;
    m.nextAttemptAt = null;
    return {
      outboxId: m.id,
      eventId: m.eventId,
      organizationId: m.organizationId,
      previousStatus: 'dead_letter' as const,
      previousAttemptCount: before.attemptCount,
      previousLastError: before.lastError,
      recoveryStatus: 'requeued' as const,
    };
  }
}

describe('OsOutboxWorker', () => {
  it('publishes pending messages', async () => {
    const store = new MemoryOutboxStore();
    const event = buildBusinessEvent({
      organizationId: 'org-1',
      eventType: 'member.invited',
      occurredAt: new Date(),
      actorMemberId: 'mem-1',
      primaryEntityType: 'organization_member',
      primaryEntityId: 'm-1',
      correlationId: 'corr-1',
    });
    const outbox = buildOutboxForEvent(event);
    store.messages.push(outbox);

    let delivered = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'lane.f.test',
      async deliver() {
        delivered += 1;
      },
    };

    const worker = new OsOutboxWorker(store, [consumer]);
    const result = await worker.runOnce();
    assert.equal(result.published, 1);
    assert.equal(delivered, 1);
    const published = store.messages[0];
    assert.ok(published);
    assert.equal(published.status, 'published');
  });
});
