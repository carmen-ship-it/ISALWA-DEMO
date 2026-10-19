import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsPrismaClient } from './client';
import type { Prisma } from './generated/client';

/** Business event, outbox message and audit row, in this order, for one command. */
export function eventOutboxAuditWrites(
  db: OsPrismaClient | Prisma.TransactionClient,
  event: StoredBusinessEvent,
  outbox: StoredOutboxMessage,
  audit: StoredAuditLog,
): Array<() => Prisma.PrismaPromise<unknown>> {
  return [
    () =>
      db.osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          actorMemberId: event.actorMemberId,
          authorizationContext: event.authorizationContext as Prisma.InputJsonValue | undefined,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          payloadJson: (event.payload ?? undefined) as Prisma.InputJsonValue | undefined,
          provenance: event.provenance ?? 'command',
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          dataOrigin: event.dataOrigin ?? 'production',
          capabilityKey: event.capabilityKey,
        },
      }),
    () =>
      db.osOutboxMessage.create({
        data: {
          id: outbox.id,
          organizationId: outbox.organizationId,
          eventId: outbox.eventId,
          payloadJson: outbox.payloadJson as Prisma.InputJsonValue,
          status: outbox.status,
          attemptCount: outbox.attemptCount,
          nextAttemptAt: outbox.nextAttemptAt,
          lastError: outbox.lastError,
          createdAt: outbox.createdAt,
          publishedAt: outbox.publishedAt,
        },
      }),
    () =>
      db.osAuditLog.create({
        data: {
          id: audit.id,
          organizationId: audit.organizationId,
          actorMemberId: audit.actorMemberId,
          action: audit.action,
          resourceType: audit.resourceType,
          resourceId: audit.resourceId,
          beforeJson: (audit.beforeJson ?? undefined) as Prisma.InputJsonValue | undefined,
          afterJson: (audit.afterJson ?? undefined) as Prisma.InputJsonValue | undefined,
          correlationId: audit.correlationId,
          createdAt: audit.createdAt,
        },
      }),
  ];
}
