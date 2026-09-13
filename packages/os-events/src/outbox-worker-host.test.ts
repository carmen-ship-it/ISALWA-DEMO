import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OutboxWorkerHost, type OutboxWorkerRunResult } from './outbox-worker-host';
import type { OsOutboxStorePort, OutboxOperationalBacklog, OutboxStats } from './outbox-port';

class StubStore implements OsOutboxStorePort {
  pending = 0;

  async claimPendingBatch(): Promise<never[]> {
    return [];
  }
  async markPublished(): Promise<void> {}
  async markForRetry(): Promise<void> {}
  async markDeadLetter(): Promise<void> {}
  async tryRecordConsumerDelivery(): Promise<boolean> {
    return true;
  }
  async getStats(): Promise<OutboxStats> {
    return { pending: this.pending, published: 0, deadLetter: 0 };
  }
  async getOperationalHealth(): Promise<OutboxOperationalBacklog> {
    return {
      pending: this.pending,
      published: 0,
      deadLetter: 0,
      retrying: 0,
      oldestPendingAgeMs: null,
      lastPublishedAt: null,
      recentDeadLetters: [],
    };
  }
  async getOutboxMessage(): Promise<null> {
    return null;
  }
  async getDeadLetterInOrg(): Promise<null> {
    return null;
  }
  async listDeadLetters() {
    return [];
  }
  async findIdempotency() {
    return null;
  }
  async saveIdempotency(): Promise<void> {}
  async recoverDeadLetterDelivery(): Promise<never> {
    throw new Error('NOT_FOUND');
  }
}

describe('OutboxWorkerHost', () => {
  it('graceful stop waits for in-flight tick', async () => {
    const store = new StubStore();
    store.pending = 1;
    let runs = 0;
    const runner = {
      async runOnce(): Promise<OutboxWorkerRunResult> {
        runs += 1;
        await new Promise((r) => setTimeout(r, 30));
        return { claimed: 1, published: 1, retried: 0, deadLetter: 0, duplicates: 0 };
      },
    };

    const host = new OutboxWorkerHost(store, runner, { pollIntervalMs: 5_000 });
    host.start();
    await new Promise((r) => setTimeout(r, 20));
    await host.stop(500);
    assert.ok(runs >= 1);
    assert.equal(host.getState().running, false);
  });
});
