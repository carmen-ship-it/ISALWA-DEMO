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
      // Dedup rows claimed during this attempt. A failed attempt must release
      // them, or the retry mistakes its own claim for an earlier delivery and
      // the projection update is lost while the outbox reports success.
      const claimed: string[] = [];
      try {
        const envelope = parseOutboxEnvelope(message.payloadJson);
        let delivered = 0;
        let alreadyDone = 0;

        for (const consumer of this.consumers) {
          const firstTime = await this.store.tryRecordConsumerDelivery(
            message.organizationId,
            consumer.consumerKey,
            envelope.id,
          );
          if (!firstTime) {
            alreadyDone += 1;
            result.duplicates += 1;
            continue;
          }
          claimed.push(consumer.consumerKey);
          await consumer.deliver(envelope);
          delivered += 1;
        }

        // Publish once every consumer for this message is accounted for.
        if (delivered > 0 || alreadyDone === this.consumers.length) {
          await this.store.markPublished(message.id);
          result.published += 1;
        }
      } catch (err) {
        await this.releaseClaims(message.organizationId, message.eventId, claimed);
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

  /**
   * Best effort: a release failure must not hide the delivery failure, so the
   * message is still retried or dead-lettered by the caller.
   */
  private async releaseClaims(
    organizationId: string,
    eventId: string,
    consumerKeys: string[],
  ): Promise<void> {
    for (const consumerKey of consumerKeys) {
      try {
        await this.store.removeConsumerDelivery(organizationId, consumerKey, eventId);
      } catch {
        // Leave the row; the dead-letter recovery path can clear it.
      }
    }
  }
}
