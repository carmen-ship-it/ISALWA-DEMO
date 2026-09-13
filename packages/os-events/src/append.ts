import { createId } from '@isalwa/ts-utils';
import type { OsFoundationEventType } from '@isalwa/os-contracts';
import { toBusinessEventEnvelope } from './envelope';

export type BusinessEventInput = {
  organizationId: string;
  eventType: OsFoundationEventType | string;
  occurredAt: Date;
  actorMemberId: string | null;
  authorizationContext?: Record<string, unknown>;
  primaryEntityType: string;
  primaryEntityId: string;
  payload?: Record<string, unknown>;
  provenance?: string;
  correlationId: string;
  idempotencyKey?: string;
  dataOrigin?: string;
  capabilityKey?: string;
};

export type StoredBusinessEvent = BusinessEventInput & {
  id: string;
  recordedAt: Date;
};

export type StoredOutboxMessage = {
  id: string;
  organizationId: string;
  eventId: string;
  payloadJson: Record<string, unknown>;
  status: 'pending' | 'published' | 'dead_letter';
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};

export type StoredAuditLog = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  correlationId: string;
  createdAt: Date;
};

export function buildBusinessEvent(input: BusinessEventInput): StoredBusinessEvent {
  return {
    ...input,
    id: createId(),
    recordedAt: new Date(),
    provenance: input.provenance ?? 'command',
    dataOrigin: input.dataOrigin ?? 'production',
  };
}

export function buildOutboxForEvent(event: StoredBusinessEvent): StoredOutboxMessage {
  const envelope = toBusinessEventEnvelope(event);
  return {
    id: createId(),
    organizationId: event.organizationId,
    eventId: event.id,
    payloadJson: envelope as unknown as Record<string, unknown>,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
    createdAt: new Date(),
    publishedAt: null,
  };
}

export function buildAuditEntry(
  organizationId: string,
  actorMemberId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  correlationId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): StoredAuditLog {
  return {
    id: createId(),
    organizationId,
    actorMemberId,
    action,
    resourceType,
    resourceId,
    beforeJson: before,
    afterJson: after,
    correlationId,
    createdAt: new Date(),
  };
}
