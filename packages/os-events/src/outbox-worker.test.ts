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

  async removeConsumerDelivery(
    organizationId: string,
    consumerKey: string,
    eventId: string,
  ): Promise<void> {
    this.dedup.delete(`${organizationId}:${consumerKey}:${eventId}`);
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

  /**
   * The dedup row is recorded before delivery, so a failed delivery must not
   * leave a row behind that makes the retry look like a duplicate. Otherwise the
   * projection update is lost permanently while the outbox reports success.
   */
  it('redelivers to a consumer that failed, instead of publishing the message unprojected', async () => {
    const store = new MemoryOutboxStore();
    const event = buildBusinessEvent({
      organizationId: 'org-1',
      eventType: 'order.created',
      occurredAt: new Date(),
      actorMemberId: 'mem-1',
      primaryEntityType: 'order',
      primaryEntityId: 'o-1',
      correlationId: 'corr-1',
    });
    store.messages.push(buildOutboxForEvent(event));

    let attempts = 0;
    let projected = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'lane.f.test',
      async deliver() {
        attempts += 1;
        if (attempts === 1) throw new Error('TRANSIENT_PROJECTION_FAILURE');
        projected += 1;
      },
    };

    const worker = new OsOutboxWorker(store, [consumer]);

    const first = await worker.runOnce();
    assert.equal(first.retried, 1);
    assert.equal(first.published, 0);
    assert.equal(store.messages[0]?.status, 'pending');

    store.messages[0]!.nextAttemptAt = null;
    const second = await worker.runOnce();

    assert.equal(projected, 1, 'the consumer must actually project on the retry');
    assert.equal(second.published, 1);
    assert.equal(second.duplicates, 0);
    assert.equal(store.messages[0]?.status, 'published');
  });

  it('does not let one message duplicate publish another message that never delivered', async () => {
    const store = new MemoryOutboxStore();
    const base = {
      organizationId: 'org-1',
      occurredAt: new Date(),
      actorMemberId: 'mem-1',
      correlationId: 'corr-1',
    };
    const alreadyDone = buildBusinessEvent({
      ...base,
      eventType: 'quote.submitted',
      primaryEntityType: 'quote',
      primaryEntityId: 'q-1',
    });
    const pending = buildBusinessEvent({
      ...base,
      eventType: 'order.created',
      primaryEntityType: 'order',
      primaryEntityId: 'o-1',
    });
    store.messages.push(buildOutboxForEvent(alreadyDone), buildOutboxForEvent(pending));
    store.dedup.add(`org-1:lane.f.test:${alreadyDone.id}`);

    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'lane.f.test',
      async deliver(envelope) {
        if (envelope.id === pending.id) throw new Error('TRANSIENT_PROJECTION_FAILURE');
      },
    };

    const worker = new OsOutboxWorker(store, [consumer]);
    await worker.runOnce();

    const first = store.messages.find((m) => m.eventId === alreadyDone.id);
    const second = store.messages.find((m) => m.eventId === pending.id);
    assert.equal(first?.status, 'published');
    assert.equal(second?.status, 'pending', 'a failed message must not ride on another duplicate');
  });
});
