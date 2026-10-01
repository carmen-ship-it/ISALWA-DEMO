import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OsOutboxWorker,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
  type OsOutboxStorePort,
  type StoredOutboxMessage,
} from './index';

/**
 * D1 reproof — crash recovery must not depend on cleanup code running.
 *
 * The store models process death: once `die()` is called every call throws, so
 * the worker's own catch path (markForRetry, any release/remove) cannot write
 * anything, exactly as if the process had been killed. A "restart" is a fresh
 * worker over the same persisted rows after the outbox lease has expired.
 */
const DEAD = 'PROCESS_DEAD';

class CrashableStore implements OsOutboxStorePort {
  messages: StoredOutboxMessage[] = [];
  /** Completion markers (os_outbox_consumer_dedup). */
  dedup = new Set<string>();
  private dead = false;
  /** Called after the named store operation succeeded, to place a crash point. */
  afterOp: Partial<Record<'tryRecord' | 'markPublished', () => void>> = {};
  failNext: Partial<Record<'hasConsumerDelivery' | 'tryRecord', Error>> = {};

  die(): void {
    this.dead = true;
  }

  /** Restart: new process, lease on in-flight messages has expired. */
  restart(): void {
    this.dead = false;
    for (const m of this.messages) if (m.status === 'pending') m.nextAttemptAt = null;
  }

  private guard(): void {
    if (this.dead) throw new Error(DEAD);
  }

  async claimPendingBatch(limit: number): Promise<StoredOutboxMessage[]> {
    this.guard();
    const now = Date.now();
    const rows = this.messages
      .filter(
        (m) =>
          m.status === 'pending' && (!m.nextAttemptAt || m.nextAttemptAt.getTime() <= now),
      )
      .slice(0, limit);
    // Same lease the Prisma store takes: in flight, reclaimable after expiry.
    for (const m of rows) m.nextAttemptAt = new Date(now + 120_000);
    return rows.map((m) => ({ ...m }));
  }

  async markPublished(outboxId: string): Promise<void> {
    this.guard();
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'published';
      m.publishedAt = new Date();
      m.lastError = null;
    }
    this.afterOp.markPublished?.();
  }

  async markForRetry(
    outboxId: string,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError: string,
  ): Promise<void> {
    this.guard();
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'pending';
      m.attemptCount = attemptCount;
      m.nextAttemptAt = nextAttemptAt;
      m.lastError = lastError;
    }
  }

  async markDeadLetter(outboxId: string, lastError: string): Promise<void> {
    this.guard();
    const m = this.messages.find((x) => x.id === outboxId);
    if (m) {
      m.status = 'dead_letter';
      m.lastError = lastError;
      m.nextAttemptAt = null;
    }
  }

  async hasConsumerDelivery(org: string, consumerKey: string, eventId: string): Promise<boolean> {
    this.guard();
    const err = this.failNext.hasConsumerDelivery;
    if (err) {
      delete this.failNext.hasConsumerDelivery;
      throw err;
    }
    return this.dedup.has(`${org}:${consumerKey}:${eventId}`);
  }

  async tryRecordConsumerDelivery(
    org: string,
    consumerKey: string,
    eventId: string,
  ): Promise<boolean> {
    this.guard();
    const err = this.failNext.tryRecord;
    if (err) {
      delete this.failNext.tryRecord;
      throw err;
    }
    const key = `${org}:${consumerKey}:${eventId}`;
    if (this.dedup.has(key)) return false;
    this.dedup.add(key);
    this.afterOp.tryRecord?.();
    return true;
  }

  // Observability / recovery surface: not exercised by these tests.
  async getStats() {
    return { pending: 0, published: 0, deadLetter: 0 };
  }
  async getOperationalHealth() {
    return {
      pending: 0,
      published: 0,
      deadLetter: 0,
      retrying: 0,
      oldestPendingAgeMs: null,
      lastPublishedAt: null,
      recentDeadLetters: [],
    };
  }
  async getOutboxMessage(outboxId: string) {
    return this.messages.find((m) => m.id === outboxId) ?? null;
  }
  async getDeadLetterInOrg() {
    return null;
  }
  async listDeadLetters() {
    return [];
  }
  async findIdempotency() {
    return null;
  }
  async saveIdempotency() {}
  async recoverDeadLetterDelivery(): Promise<never> {
    throw new Error('NOT_USED');
  }
}

/**
 * A retry-safe consumer: its durable state is keyed by event id, like a
 * projection that re-derives the same row for the same event.
 */
class DurableConsumer implements OsOutboxConsumerPort {
  readonly applied = new Map<string, number>();
  attempts = 0;
  /** Runs after the durable write and before deliver() returns. */
  afterDurableWrite: (() => void) | null = null;
  /** Runs before the durable write. */
  beforeDurableWrite: (() => void) | null = null;

  constructor(readonly consumerKey: string) {}

  async deliver(envelope: { id: string }): Promise<void> {
    this.attempts += 1;
    this.beforeDurableWrite?.();
    this.applied.set(envelope.id, (this.applied.get(envelope.id) ?? 0) + 1);
    this.afterDurableWrite?.();
  }

  /** Distinct events applied, regardless of how many times they were re-applied. */
  get appliedEventIds(): string[] {
    return [...this.applied.keys()];
  }
}

/** The process is killed at this point: nothing after it runs, including catch-path writes. */
function crash(store: CrashableStore): never {
  store.die();
  throw new Error(DEAD);
}

function seed(store: CrashableStore, primaryEntityId = 'o-1') {
  const event = buildBusinessEvent({
    organizationId: 'org-1',
    eventType: 'order.created',
    occurredAt: new Date(),
    actorMemberId: 'mem-1',
    primaryEntityType: 'order',
    primaryEntityId,
    correlationId: `corr-${primaryEntityId}`,
  });
  store.messages.push(buildOutboxForEvent(event));
  return event;
}

describe('OsOutboxWorker crash recovery (no cleanup code runs)', () => {
  it('applies the consumer on restart when the process died before the consumer wrote anything', async () => {
    const store = new CrashableStore();
    const event = seed(store);
    const consumer = new DurableConsumer('lane.crash.a');
    consumer.beforeDurableWrite = () => crash(store);

    // Process dies inside deliver(): the worker's catch path cannot write either.
    await assert.rejects(new OsOutboxWorker(store, [consumer]).runOnce(), /PROCESS_DEAD/);

    assert.equal(consumer.appliedEventIds.length, 0);
    assert.equal(store.dedup.size, 0, 'nothing may be recorded as delivered before it applied');
    assert.equal(store.messages[0]?.status, 'pending');

    consumer.beforeDurableWrite = null;
    store.restart();
    const result = await new OsOutboxWorker(store, [consumer]).runOnce();

    assert.deepEqual(consumer.appliedEventIds, [event.id], 'the consumer must still apply');
    assert.equal(result.published, 1);
    assert.equal(result.duplicates, 0);
    assert.equal(store.messages[0]?.status, 'published');
  });

  it('re-delivers when the process died after the consumer wrote but before completion was recorded', async () => {
    const store = new CrashableStore();
    const event = seed(store);
    const consumer = new DurableConsumer('lane.crash.b');
    consumer.afterDurableWrite = () => crash(store);

    await assert.rejects(new OsOutboxWorker(store, [consumer]).runOnce(), /PROCESS_DEAD/);
    assert.equal(consumer.applied.get(event.id), 1);
    assert.equal(store.dedup.size, 0, 'completion is not recorded for a delivery that never returned');

    consumer.afterDurableWrite = null;
    store.restart();
    const result = await new OsOutboxWorker(store, [consumer]).runOnce();

    assert.equal(consumer.attempts, 2, 'the event is delivered again (at-least-once)');
    assert.equal(consumer.appliedEventIds.length, 1, 'still exactly one projected event');
    assert.equal(result.published, 1);
    assert.equal(store.dedup.size, 1);
  });

  it('does not re-deliver, and still publishes, when the process died after completion was recorded', async () => {
    const store = new CrashableStore();
    const event = seed(store);
    const consumer = new DurableConsumer('lane.crash.c');
    store.afterOp.tryRecord = () => crash(store);

    await assert.rejects(new OsOutboxWorker(store, [consumer]).runOnce(), /PROCESS_DEAD/);
    assert.equal(store.messages[0]?.status, 'pending', 'never published while the process was dying');
    assert.equal(store.dedup.size, 1);

    store.afterOp.tryRecord = undefined;
    store.restart();
    const result = await new OsOutboxWorker(store, [consumer]).runOnce();

    assert.equal(consumer.attempts, 1, 'a recorded completion is honoured');
    assert.equal(result.duplicates, 1);
    assert.equal(result.published, 1);
    assert.equal(store.messages[0]?.eventId, event.id);
    assert.equal(store.messages[0]?.status, 'published');
  });

  it('after one consumer completed and another died, redelivers only the one that never completed', async () => {
    const store = new CrashableStore();
    const event = seed(store);
    const first = new DurableConsumer('lane.crash.first');
    const second = new DurableConsumer('lane.crash.second');
    second.beforeDurableWrite = () => crash(store);

    await assert.rejects(new OsOutboxWorker(store, [first, second]).runOnce(), /PROCESS_DEAD/);
    assert.deepEqual(first.appliedEventIds, [event.id]);
    assert.equal(second.appliedEventIds.length, 0);
    assert.equal(store.messages[0]?.status, 'pending');

    second.beforeDurableWrite = null;
    store.restart();
    const result = await new OsOutboxWorker(store, [first, second]).runOnce();

    assert.equal(first.attempts, 1, 'the completed consumer is not delivered again');
    assert.deepEqual(second.appliedEventIds, [event.id], 'the dead consumer still applies');
    assert.equal(result.published, 1);
    assert.equal(store.messages[0]?.status, 'published');
  });

  it('never publishes while a consumer has not applied, across repeated crashes', async () => {
    const store = new CrashableStore();
    seed(store);
    const consumer = new DurableConsumer('lane.crash.repeat');

    for (let kill = 0; kill < 3; kill += 1) {
      consumer.beforeDurableWrite = () => crash(store);
      await assert.rejects(new OsOutboxWorker(store, [consumer]).runOnce(), /PROCESS_DEAD/);
      assert.equal(store.messages[0]?.status, 'pending');
      assert.equal(store.dedup.size, 0);
      store.restart();
    }

    consumer.beforeDurableWrite = null;
    const result = await new OsOutboxWorker(store, [consumer]).runOnce();
    assert.equal(consumer.appliedEventIds.length, 1);
    assert.equal(result.published, 1);
  });

  it('retries, instead of treating the consumer as done, when recording completion fails for any other reason', async () => {
    const store = new CrashableStore();
    seed(store);
    const consumer = new DurableConsumer('lane.crash.record-fails');
    store.failNext.tryRecord = new Error('ECONNRESET');

    const first = await new OsOutboxWorker(store, [consumer]).runOnce();
    assert.equal(first.retried, 1);
    assert.equal(first.published, 0);
    assert.equal(store.messages[0]?.status, 'pending');
    assert.equal(store.dedup.size, 0);

    store.messages[0]!.nextAttemptAt = null;
    const second = await new OsOutboxWorker(store, [consumer]).runOnce();
    assert.equal(second.published, 1);
    assert.equal(consumer.appliedEventIds.length, 1);
  });

  it('retries, instead of skipping the consumer, when the completion lookup fails', async () => {
    const store = new CrashableStore();
    seed(store);
    const consumer = new DurableConsumer('lane.crash.lookup-fails');
    store.failNext.hasConsumerDelivery = new Error('P2024 pool timeout');

    const first = await new OsOutboxWorker(store, [consumer]).runOnce();
    assert.equal(first.retried, 1);
    assert.equal(first.published, 0);
    assert.equal(consumer.attempts, 0);

    store.messages[0]!.nextAttemptAt = null;
    const second = await new OsOutboxWorker(store, [consumer]).runOnce();
    assert.equal(second.published, 1);
    assert.equal(consumer.appliedEventIds.length, 1);
  });
});
