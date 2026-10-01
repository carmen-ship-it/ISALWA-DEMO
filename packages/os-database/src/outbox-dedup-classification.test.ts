import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from './generated/client';
import { isUniqueViolation } from './prisma-outbox-store';

/**
 * D1 — the consumer dedup claim used to treat every insert error as "already
 * delivered", so a connection or timeout error skipped the consumer and the
 * message was published without its projection ever being written.
 */
describe('outbox consumer dedup error classification', () => {
  it('treats a unique-constraint violation as an existing claim', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    assert.equal(isUniqueViolation(err), true);
  });

  it('does not treat other database errors as an existing claim', () => {
    const timeout = new Prisma.PrismaClientKnownRequestError('Timed out', {
      code: 'P2024',
      clientVersion: 'test',
    });
    assert.equal(isUniqueViolation(timeout), false);
    assert.equal(isUniqueViolation(new Error('ECONNRESET')), false);
    assert.equal(isUniqueViolation(undefined), false);
    assert.equal(isUniqueViolation(null), false);
  });
});
