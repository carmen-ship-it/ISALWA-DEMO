import { z } from 'zod';

/** Outbox delivery lifecycle — provider-neutral. */
export const OS_OUTBOX_STATUSES = ['pending', 'published', 'dead_letter'] as const;
export type OsOutboxStatus = (typeof OS_OUTBOX_STATUSES)[number];

/** Canonical BusinessEvent envelope (Step 9 / Lane D). */
export const BusinessEventEnvelopeSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  eventType: z.string().min(1),
  schemaVersion: z.number().int().positive().default(1),
  occurredAt: z.string().datetime(),
  recordedAt: z.string().datetime(),
  actorMemberId: z.string().nullable(),
  authorizationContext: z.record(z.unknown()).optional(),
  primaryEntityType: z.string().min(1),
  primaryEntityId: z.string().min(1),
  relatedEntities: z
    .array(z.object({ entityType: z.string(), entityId: z.string() }))
    .optional(),
  correlationId: z.string().min(1),
  causationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  provenance: z.string(),
  dataOrigin: z.string(),
  capabilityKey: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type BusinessEventEnvelope = z.infer<typeof BusinessEventEnvelopeSchema>;

/** Consumer behavior for unknown envelope schema versions. */
export const EVENT_SCHEMA_VERSION_POLICY = {
  current: 1,
  onUnknownVersion: 'reject_and_dead_letter' as const,
  deprecation: 'event types are immutable; new types supersede; old consumers skip unknown types',
};
