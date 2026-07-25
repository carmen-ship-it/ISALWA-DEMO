import { z } from 'zod';
import {
  COMMERCIAL_EVENT_TYPES,
  type CommercialEventType,
} from '@isalwa/domain';

export const CommercialEventTypeSchema = z.enum(
  COMMERCIAL_EVENT_TYPES as unknown as [CommercialEventType, ...CommercialEventType[]],
);

export const CommercialObjectRefSchema = z.object({
  type: z.enum([
    'account',
    'visit',
    'quote',
    'order',
    'invoice',
    'payment',
    'payment_allocation',
    'payment_promise',
    'conversation',
    'message',
    'task',
    'note',
    'attention_item',
    'territory',
    'user',
  ]),
  id: z.string().min(1),
});

export const EvidenceRefSchema = z.object({
  kind: z.enum(['entity', 'document', 'url', 'snapshot']),
  label: z.string().optional(),
  ref: z.union([
    CommercialObjectRefSchema,
    z.object({ url: z.string().min(1) }),
    z.object({ snapshot: z.record(z.unknown()) }),
  ]),
});

export const CommercialActorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.string().min(1) }),
  z.object({ kind: z.literal('system'), systemId: z.string().min(1) }),
]);

export const CommercialEventPayloadSchema = z.object({
  v: z.literal(1),
  related: CommercialObjectRefSchema.optional(),
  evidence: z.array(EvidenceRefSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Wire format for timeline API responses */
export const TimelineEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  canonicalType: CommercialEventTypeSchema.nullable(),
  family: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  occurredAt: z.string().datetime(),
  accountId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  payload: CommercialEventPayloadSchema.nullable(),
});

export const AccountTimelineResponseSchema = z.object({
  items: z.array(TimelineEventSchema),
});

export type TimelineEventDto = z.infer<typeof TimelineEventSchema>;
export type AccountTimelineResponse = z.infer<typeof AccountTimelineResponseSchema>;
