import type { BusinessEventEnvelope, OsOutboxStatus } from '@isalwa/os-contracts';
import type { StoredOutboxMessage } from './append';

/** Delivery observability counts — not employee attention items. */
export type OutboxStats = {
  pending: number;
  published: number;
  deadLetter: number;
};

export type OutboxDeadLetterSummary = {
  outboxId: string;
  eventId: string;
  lastError: string | null;
  attemptCount: number;
  createdAt: string;
};

export type OutboxOperationalBacklog = OutboxStats & {
  /** Pending rows with at least one failed attempt scheduled for retry. */
  retrying: number;
  oldestPendingAgeMs: number | null;
  lastPublishedAt: string | null;
  recentDeadLetters: OutboxDeadLetterSummary[];
};

export type OutboxOperationalHealth = {
  backlog: OutboxOperationalBacklog;
  worker: {
    running: boolean;
    startedAt: string | null;
    lastRunAt: string | null;
    lastError: string | null;
    consecutiveErrors: number;
    lastRunClaimed: number | null;
    lastRunPublished: number | null;
  };
};

export type OutboxRecoveryResult = {
  outboxId: string;
  eventId: string;
  organizationId: string;
  previousStatus: 'dead_letter';
  previousAttemptCount: number;
  previousLastError: string | null;
  recoveryStatus: 'requeued';
};

export type OutboxRecoveryRequest = {
  organizationId: string;
  outboxId: string;
  actorMemberId: string;
  reason: string;
  correlationId: string;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};

/** Persistence port for outbox worker — implemented by Prisma store. */
export interface OsOutboxStorePort {
  claimPendingBatch(limit: number): Promise<StoredOutboxMessage[]>;
  markPublished(outboxId: string): Promise<void>;
  markForRetry(
    outboxId: string,
    attemptCount: number,
    nextAttemptAt: Date,
    lastError: string,
  ): Promise<void>;
  markDeadLetter(outboxId: string, lastError: string): Promise<void>;
  tryRecordConsumerDelivery(
    organizationId: string,
    consumerKey: string,
    eventId: string,
  ): Promise<boolean>;
  getStats(organizationId?: string): Promise<OutboxStats>;
  getOperationalHealth(organizationId?: string): Promise<OutboxOperationalBacklog>;
  getOutboxMessage(outboxId: string): Promise<StoredOutboxMessage | null>;
  getDeadLetterInOrg(organizationId: string, outboxId: string): Promise<StoredOutboxMessage | null>;
  listDeadLetters(organizationId: string, limit?: number): Promise<OutboxDeadLetterSummary[]>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord): Promise<void>;
  recoverDeadLetterDelivery(
    request: OutboxRecoveryRequest,
    idempotency?: { key: string; commandName: string },
  ): Promise<OutboxRecoveryResult>;
}

export type OutboxDeliveryResult = {
  status: 'delivered' | 'duplicate' | 'failed';
  error?: string;
};

/** Consumer/projection hook — lanes implement without custom outbox infra. */
export interface OsOutboxConsumerPort {
  readonly consumerKey: string;
  deliver(envelope: BusinessEventEnvelope): Promise<void>;
}

export const DEFAULT_OUTBOX_WORKER_CONFIG = {
  batchSize: 25,
  maxAttempts: 5,
  baseRetryMs: 1000,
  maxRetryMs: 60_000,
};
