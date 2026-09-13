import {
  BusinessEventEnvelopeSchema,
  EVENT_SCHEMA_VERSION_POLICY,
  type BusinessEventEnvelope,
} from '@isalwa/os-contracts';
import type { StoredBusinessEvent } from './append';

export function toBusinessEventEnvelope(event: StoredBusinessEvent): BusinessEventEnvelope {
  const envelope: BusinessEventEnvelope = {
    id: event.id,
    organizationId: event.organizationId,
    eventType: event.eventType,
    schemaVersion: EVENT_SCHEMA_VERSION_POLICY.current,
    occurredAt: event.occurredAt.toISOString(),
    recordedAt: event.recordedAt.toISOString(),
    actorMemberId: event.actorMemberId,
    authorizationContext: event.authorizationContext,
    primaryEntityType: event.primaryEntityType,
    primaryEntityId: event.primaryEntityId,
    correlationId: event.correlationId,
    idempotencyKey: event.idempotencyKey,
    provenance: event.provenance ?? 'command',
    dataOrigin: event.dataOrigin ?? 'production',
    capabilityKey: event.capabilityKey,
    payload: event.payload,
  };
  return BusinessEventEnvelopeSchema.parse(envelope);
}

export function parseOutboxEnvelope(payload: Record<string, unknown>): BusinessEventEnvelope {
  const parsed = BusinessEventEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('OUTBOX_ENVELOPE_INVALID');
  }
  if (parsed.data.schemaVersion > EVENT_SCHEMA_VERSION_POLICY.current) {
    throw new Error('OUTBOX_SCHEMA_VERSION_UNKNOWN');
  }
  return parsed.data;
}
