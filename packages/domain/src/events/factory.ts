import { catalogEntry } from './catalog';
import type {
  CommercialEventInput,
  CommercialEventPayload,
  CommercialEventRecord,
  CommercialEventType,
} from './types';

export type BuildCommercialEventArgs = {
  type: CommercialEventType;
  organizationId: string;
  accountId: string | null;
  actor: CommercialEventInput['actor'];
  occurredAt: Date;
  title?: string;
  body?: string | null;
  related?: CommercialEventInput['related'];
  evidence?: CommercialEventInput['evidence'];
  metadata?: Record<string, unknown>;
  id: string;
};

/**
 * Pure factory — no I/O. Adapter persists the record.
 */
export function buildCommercialEvent(args: BuildCommercialEventArgs): CommercialEventRecord {
  const entry = catalogEntry(args.type);
  const payload: CommercialEventPayload = {
    v: 1,
    related: args.related,
    evidence: args.evidence ?? (args.related ? [{ kind: 'entity', ref: args.related }] : undefined),
    metadata: args.metadata,
  };

  return {
    id: args.id,
    type: args.type,
    organizationId: args.organizationId,
    accountId: args.accountId,
    actor: args.actor,
    occurredAt: args.occurredAt,
    title: args.title ?? entry.defaultTitle,
    body: args.body ?? null,
    related: args.related,
    evidence: payload.evidence,
    metadata: args.metadata,
    payload,
  };
}

/** Map domain record → Prisma ActivityEvent create fields (no Prisma import). */
export function toActivityEventRow(event: CommercialEventRecord): {
  id: string;
  organizationId: string;
  accountId: string | null;
  actorUserId: string | null;
  type: string;
  title: string;
  body: string | null;
  payloadJson: CommercialEventPayload;
  occurredAt: Date;
} {
  return {
    id: event.id,
    organizationId: event.organizationId,
    accountId: event.accountId,
    actorUserId: event.actor.kind === 'user' ? event.actor.userId : null,
    type: event.type,
    title: event.title,
    body: event.body ?? null,
    payloadJson: event.payload,
    occurredAt: event.occurredAt,
  };
}
