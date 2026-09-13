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
        let anyDelivered = false;

        for (const consumer of this.consumers) {
          const firstTime = await this.store.tryRecordConsumerDelivery(
            message.organizationId,
            consumer.consumerKey,
            envelope.id,
          );
          if (!firstTime) {
            result.duplicates += 1;
            continue;
          }
          await consumer.deliver(envelope);
          anyDelivered = true;
        }

        if (anyDelivered || this.consumers.length === 0) {
          await this.store.markPublished(message.id);
          result.published += 1;
        } else if (result.duplicates > 0) {
          // All consumers already processed — still publish outbox row.
          await this.store.markPublished(message.id);
          result.published += 1;
        }
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
