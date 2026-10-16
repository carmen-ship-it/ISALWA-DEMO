import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import { OsPrismaClient } from './client';
import { PrismaRateLimitStore } from './prisma-rate-limit-store';

/**
 * V2 §18.1: the counter is shared between instances. Two independent Prisma clients
 * (two connection pools, as two API instances would have) race on one key.
 */
const describeDb = process.env.OS_DATABASE_URL ? describe : describe.skip;

describeDb('shared rate-limit counter (real Postgres)', () => {
  let a: OsPrismaClient;
  let b: OsPrismaClient;

  before(async () => {
    a = new OsPrismaClient();
    b = new OsPrismaClient();
    await Promise.all([a.$connect(), b.$connect()]);
  });

  after(async () => {
    await Promise.all([a.$disconnect(), b.$disconnect()]);
  });

  it('100 concurrent hits from two pools count exactly 1..100, no lost update', async () => {
    const org = `org-rl-${createId()}`;
    const key = `command:member:${createId()}`;
    const now = new Date('2026-10-16T21:30:10.000Z');
    const storeA = new PrismaRateLimitStore(a);
    const storeB = new PrismaRateLimitStore(b);
    const hits = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        (i % 2 === 0 ? storeA : storeB).hit({ organizationId: org, bucketKey: key, windowMs: 60_000, now }),
      ),
    );
    const counts = hits.map((h) => h.count).sort((x, y) => x - y);
    assert.deepEqual(counts, Array.from({ length: 100 }, (_, i) => i + 1));
    const over = counts.filter((c) => c > 60).length;
    console.log(`[evidence] rate-limit race: hits=100 distinctCounts=${new Set(counts).size} overLimit60=${over}`);
    assert.equal(over, 40);
    const row = await a.osRateLimitBucket.findMany({ where: { organizationId: org, bucketKey: key } });
    assert.equal(row.length, 1);
    assert.equal(row[0]?.count, 100);
  });

  it('a new window starts at 1 and prunes the previous window of that key only', async () => {
    const org = `org-rl-${createId()}`;
    const store = new PrismaRateLimitStore(a);
    const key = 'search:member:m1';
    const other = 'search:member:m2';
    await store.hit({ organizationId: org, bucketKey: key, windowMs: 60_000, now: new Date('2026-10-16T21:00:05Z') });
    await store.hit({ organizationId: org, bucketKey: other, windowMs: 60_000, now: new Date('2026-10-16T21:00:05Z') });
    const next = await store.hit({ organizationId: org, bucketKey: key, windowMs: 60_000, now: new Date('2026-10-16T21:01:05Z') });
    assert.equal(next.count, 1);
    assert.equal(next.resetAt.toISOString(), '2026-10-16T21:02:00.000Z');
    const rows = await a.osRateLimitBucket.findMany({ where: { organizationId: org }, orderBy: { bucketKey: 'asc' } });
    assert.deepEqual(
      rows.map((r) => [r.bucketKey, r.windowStart.toISOString(), r.count]),
      [
        [key, '2026-10-16T21:01:00.000Z', 1],
        [other, '2026-10-16T21:00:00.000Z', 1],
      ],
    );
  });

  it('organizations never share a bucket', async () => {
    const store = new PrismaRateLimitStore(a);
    const now = new Date('2026-10-16T21:05:00Z');
    const key = 'command:member:same-id';
    const orgA = `org-rl-a-${createId()}`;
    const orgB = `org-rl-b-${createId()}`;
    await store.hit({ organizationId: orgA, bucketKey: key, windowMs: 60_000, now });
    await store.hit({ organizationId: orgA, bucketKey: key, windowMs: 60_000, now });
    const inB = await store.hit({ organizationId: orgB, bucketKey: key, windowMs: 60_000, now });
    assert.equal(inB.count, 1);
  });
});
