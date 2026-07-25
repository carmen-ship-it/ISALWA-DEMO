import { eventFamily, normalizeEventType, type CommercialEventPayload } from '@isalwa/domain';
import type { PrismaClient } from '@prisma/client';

export type TimelineReadItem = {
  id: string;
  type: string;
  canonicalType: string | null;
  family: string;
  title: string;
  body: string | null;
  occurredAt: string;
  accountId: string | null;
  actorUserId: string | null;
  payload: CommercialEventPayload | null;
};

/**
 * Single read adapter for account timelines.
 * Personas / Memoria / future projectors should use this — not bespoke queries.
 */
export async function listAccountTimeline(
  db: PrismaClient,
  accountId: string,
  opts: { take?: number } = {},
): Promise<{ items: TimelineReadItem[] }> {
  const take = opts.take ?? 40;
  const rows = await db.activityEvent.findMany({
    where: { accountId },
    orderBy: { occurredAt: 'desc' },
    take,
  });

  return {
    items: rows.map((r) => {
      const canonical = normalizeEventType(r.type);
      const payload =
        r.payloadJson && typeof r.payloadJson === 'object' && !Array.isArray(r.payloadJson)
          ? (r.payloadJson as CommercialEventPayload)
          : null;
      return {
        id: r.id,
        type: r.type,
        canonicalType: canonical,
        family: eventFamily(r.type),
        title: r.title,
        body: r.body,
        occurredAt: r.occurredAt.toISOString(),
        accountId: r.accountId,
        actorUserId: r.actorUserId,
        payload,
      };
    }),
  };
}
