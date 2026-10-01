import type { OsOutboxConsumerPort, OsOutboxStorePort } from './outbox-port';
import { parseOutboxEnvelope } from './envelope';
import { DEFAULT_OUTBOX_WORKER_CONFIG } from './outbox-port';

export type OutboxWorkerRunResult = {
  claimed: number;
  published: number;
  retried: number;
  deadLetter: number;
  duplicates: number;
};

export class OsOutboxWorker {
  constructor(
    private readonly store: OsOutboxStorePort,
    private readonly consumers: OsOutboxConsumerPort[],
    private readonly config = DEFAULT_OUTBOX_WORKER_CONFIG,
  ) {}

  async runOnce(): Promise<OutboxWorkerRunResult> {
    const result: OutboxWorkerRunResult = {
      claimed: 0,
      published: 0,
      retried: 0,
      deadLetter: 0,
      duplicates: 0,
    };

    const batch = await this.store.claimPendingBatch(this.config.batchSize);
    result.claimed = batch.length;

    for (const message of batch) {
      try {
        const envelope = parseOutboxEnvelope(message.payloadJson);

        // The dedup row is a completion marker written AFTER a consumer has
        // durably applied the event. Nothing is claimed up front, so a worker
        // that dies mid-delivery leaves no row behind and no cleanup code has to
        // run: the lease on the outbox message expires, the message is claimed
        // again, and the consumer applies it. A message is published only after
        // every consumer has either completed now or was recorded complete.
        for (const consumer of this.consumers) {
          const alreadyDone = await this.store.hasConsumerDelivery(
            message.organizationId,
            consumer.consumerKey,
            envelope.id,
          );
          if (alreadyDone) {
            result.duplicates += 1;
            continue;
          }
          await consumer.deliver(envelope);
          await this.store.tryRecordConsumerDelivery(
            message.organizationId,
            consumer.consumerKey,
            envelope.id,
          );
        }

        await this.store.markPublished(message.id);
        result.published += 1;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'OUTBOX_DELIVERY_FAILED';
        const nextAttempt = message.attemptCount + 1;
        if (nextAttempt >= this.config.maxAttempts) {
          await this.store.markDeadLetter(message.id, errorMessage);
          result.deadLetter += 1;
        } else {
          const delay = Math.min(
            this.config.baseRetryMs * 2 ** (nextAttempt - 1),
            this.config.maxRetryMs,
          );
          await this.store.markForRetry(
            message.id,
            nextAttempt,
            new Date(Date.now() + delay),
            errorMessage,
          );
          result.retried += 1;
        }
      }
    }

    return result;
  }
}
