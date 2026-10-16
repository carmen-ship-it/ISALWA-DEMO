import type { OsPrismaClient } from './client';

/**
 * Shared fixed-window counter (V2 §18.1). One atomic upsert per hit, so every API
 * instance sees the same count. Older windows of the same key are pruned when a
 * new window opens.
 *
 * Columns are `timestamp without time zone` holding UTC (Prisma convention); the raw
 * insert must convert explicitly or Postgres applies the session time zone.
 */
export class PrismaRateLimitStore {
  constructor(private readonly prisma: OsPrismaClient) {}

  async hit(input: {
    organizationId: string;
    bucketKey: string;
    windowMs: number;
    now?: Date;
  }): Promise<{ count: number; windowStart: Date; resetAt: Date }> {
    const nowMs = (input.now ?? new Date()).getTime();
    const windowStart = new Date(Math.floor(nowMs / input.windowMs) * input.windowMs);
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "os_rate_limit_buckets" ("organization_id", "bucket_key", "window_start", "count", "updated_at")
      VALUES (
        ${input.organizationId},
        ${input.bucketKey},
        (${windowStart.toISOString()}::timestamptz AT TIME ZONE 'UTC'),
        1,
        (NOW() AT TIME ZONE 'UTC')
      )
      ON CONFLICT ("organization_id", "bucket_key", "window_start")
      DO UPDATE SET "count" = "os_rate_limit_buckets"."count" + 1, "updated_at" = (NOW() AT TIME ZONE 'UTC')
      RETURNING "count"
    `;
    const count = Number(rows[0]?.count ?? 0);
    if (count === 1) {
      await this.prisma.osRateLimitBucket.deleteMany({
        where: {
          organizationId: input.organizationId,
          bucketKey: input.bucketKey,
          windowStart: { lt: windowStart },
        },
      });
    }
    return { count, windowStart, resetAt: new Date(windowStart.getTime() + input.windowMs) };
  }
}
