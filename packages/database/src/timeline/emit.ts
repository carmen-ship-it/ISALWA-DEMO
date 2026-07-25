import {
  buildCommercialEvent,
  toActivityEventRow,
  type BuildCommercialEventArgs,
  type CommercialEventRecord,
} from '@isalwa/domain';
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Persist one immutable commercial event.
 * Modules must call this (or emitMany) — never invent parallel activity tables.
 */
export async function emitCommercialEvent(
  db: Db,
  args: BuildCommercialEventArgs,
): Promise<CommercialEventRecord> {
  const event = buildCommercialEvent(args);
  const row = toActivityEventRow(event);
  await db.activityEvent.create({
    data: {
      id: row.id,
      organizationId: row.organizationId,
      accountId: row.accountId,
      actorUserId: row.actorUserId,
      type: row.type,
      title: row.title,
      body: row.body,
      payloadJson: row.payloadJson as Prisma.InputJsonValue,
      occurredAt: row.occurredAt,
    },
  });
  return event;
}

/** Batch insert for seeds — still canonical rows via factory. */
export function buildActivityCreateManyInput(
  args: BuildCommercialEventArgs,
): Prisma.ActivityEventCreateManyInput {
  const event = buildCommercialEvent(args);
  const row = toActivityEventRow(event);
  return {
    id: row.id,
    organizationId: row.organizationId,
    accountId: row.accountId,
    actorUserId: row.actorUserId,
    type: row.type,
    title: row.title,
    body: row.body,
    payloadJson: row.payloadJson as Prisma.InputJsonValue,
    occurredAt: row.occurredAt,
  };
}
