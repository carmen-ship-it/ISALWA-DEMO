import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from './generated/client';
import { PrismaOsOutboxStore, isConsumerDedupViolation } from './prisma-outbox-store';
import type { OsPrismaClient } from './client';

/**
 * D1 — the consumer dedup claim used to treat every insert error as "already
 * delivered", and then every P2002 (any model, any unique index). A connection
 * error, a timeout, or a unique violation on some other table skipped the
 * consumer and the message was published without its projection being written.
 *
 * Only the violation on os_outbox_consumer_dedup (organizationId, consumerKey,
 * eventId) means "this consumer already delivered".
 */
function p2002(meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta,
  });
}

/** Shape Prisma 6 actually reports for the dedup primary key (verified against Postgres). */
const DEDUP_META = {
  modelName: 'OsOutboxConsumerDedup',
  target: ['organization_id', 'consumer_key', 'event_id'],
};

describe('outbox consumer dedup error classification', () => {
  it('treats the unique violation on the dedup key as an existing completion marker', () => {
    assert.equal(isConsumerDedupViolation(p2002(DEDUP_META)), true);
  });

  it('accepts the dedup key reported by field name or by constraint name', () => {
    assert.equal(
      isConsumerDedupViolation(
        p2002({ modelName: 'OsOutboxConsumerDedup', target: ['organizationId', 'consumerKey', 'eventId'] }),
      ),
      true,
    );
    assert.equal(
      isConsumerDedupViolation(p2002({ target: 'os_outbox_consumer_dedup_pkey' })),
      true,
    );
  });

  it('does not treat other database errors as an existing claim', () => {
    const timeout = new Prisma.PrismaClientKnownRequestError('Timed out', {
      code: 'P2024',
      clientVersion: 'test',
    });
    assert.equal(isConsumerDedupViolation(timeout), false);
    assert.equal(isConsumerDedupViolation(new Error('ECONNRESET')), false);
    assert.equal(isConsumerDedupViolation(undefined), false);
    assert.equal(isConsumerDedupViolation(null), false);
  });

  it('does not treat a P2002 on a different model as a duplicate delivery', () => {
    assert.equal(
      isConsumerDedupViolation(
        p2002({ modelName: 'OsIdempotencyKey', target: ['organization_id', 'key'] }),
      ),
      false,
    );
    assert.equal(
      isConsumerDedupViolation(
        p2002({ modelName: 'OsOutboxMessage', target: ['organization_id', 'event_id'] }),
      ),
      false,
    );
  });

  it('does not treat a P2002 with a different target as a duplicate delivery', () => {
    // Right model name, wrong constraint: still not the dedup key.
    assert.equal(
      isConsumerDedupViolation(
        p2002({ modelName: 'OsOutboxConsumerDedup', target: ['organization_id', 'event_id'] }),
      ),
      false,
    );
    // Same column names on a different model must not pass on target alone.
    assert.equal(
      isConsumerDedupViolation(
        p2002({ modelName: 'OsSomethingElse', target: ['organization_id', 'consumer_key', 'event_id'] }),
      ),
      false,
    );
    assert.equal(isConsumerDedupViolation(p2002({ target: 'os_idempotency_keys_pkey' })), false);
  });

  it('does not treat an unidentified P2002 as a duplicate delivery', () => {
    assert.equal(isConsumerDedupViolation(p2002()), false);
    assert.equal(isConsumerDedupViolation(p2002({})), false);
    assert.equal(isConsumerDedupViolation({ code: 'P2002' }), false);
  });
});

describe('PrismaOsOutboxStore.tryRecordConsumerDelivery', () => {
  function storeThrowing(err: unknown) {
    const prisma = {
      osOutboxConsumerDedup: {
        create: async () => {
          throw err;
        },
      },
    } as unknown as OsPrismaClient;
    return new PrismaOsOutboxStore(prisma);
  }

  it('returns false only for the dedup-key violation', async () => {
    const store = storeThrowing(p2002(DEDUP_META));
    assert.equal(await store.tryRecordConsumerDelivery('org', 'consumer', 'event'), false);
  });

  it('throws a P2002 on another model so the message retries', async () => {
    const other = p2002({ modelName: 'OsIdempotencyKey', target: ['organization_id', 'key'] });
    const store = storeThrowing(other);
    await assert.rejects(store.tryRecordConsumerDelivery('org', 'consumer', 'event'), other);
  });

  it('throws an unidentified P2002 and non-unique errors', async () => {
    const bare = p2002();
    await assert.rejects(storeThrowing(bare).tryRecordConsumerDelivery('o', 'c', 'e'), bare);
    const reset = new Error('ECONNRESET');
    await assert.rejects(storeThrowing(reset).tryRecordConsumerDelivery('o', 'c', 'e'), reset);
  });

  it('returns true when the completion marker is inserted', async () => {
    const prisma = {
      osOutboxConsumerDedup: { create: async () => ({}) },
    } as unknown as OsPrismaClient;
    assert.equal(
      await new PrismaOsOutboxStore(prisma).tryRecordConsumerDelivery('o', 'c', 'e'),
      true,
    );
  });
});
