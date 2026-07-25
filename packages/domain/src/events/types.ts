/**
 * Commercial Timeline Engine — canonical event types (Mission 17).
 * Append-only. Modules emit; the timeline owns history.
 */

/** Actor who caused the event — never anonymous when a user exists. */
export type CommercialActor =
  | { kind: 'user'; userId: string }
  | { kind: 'system'; systemId: string };

/** Pointer to a durable commercial object (evidence / related). */
export type CommercialObjectRef = {
  type:
    | 'account'
    | 'visit'
    | 'quote'
    | 'order'
    | 'invoice'
    | 'payment'
    | 'payment_allocation'
    | 'payment_promise'
    | 'conversation'
    | 'message'
    | 'task'
    | 'note'
    | 'attention_item'
    | 'territory'
    | 'user';
  id: string;
};

export type EvidenceRef = {
  kind: 'entity' | 'document' | 'url' | 'snapshot';
  label?: string;
  ref: CommercialObjectRef | { url: string } | { snapshot: Record<string, unknown> };
};

/**
 * Canonical dotted taxonomy.
 * Do not invent ad-hoc strings at call sites — extend this union + catalog.
 */
export const COMMERCIAL_EVENT_TYPES = [
  'account.created',
  'visit.scheduled',
  'visit.completed',
  'quote.created',
  'quote.revised',
  'quote.sent',
  'quote.accepted',
  'order.confirmed',
  'invoice.issued',
  'payment.allocated',
  'promise.made',
  'promise.broken',
  'whatsapp.received',
  'whatsapp.sent',
  'task.completed',
  'note.created',
  'credit.approved',
  'territory.reassigned',
] as const;

export type CommercialEventType = (typeof COMMERCIAL_EVENT_TYPES)[number];

/** Experience / subsystem consumers of the timeline (design-time map). */
export type TimelineConsumer =
  | 'radar'
  | 'pulso'
  | 'personas'
  | 'memoria'
  | 'senal'
  | 'collections'
  | 'ai'
  | 'revenue'
  | 'notifications';

export type CommercialEventCatalogEntry = {
  type: CommercialEventType;
  /** Spanish UI default title template (may include {number}) */
  defaultTitle: string;
  /** Memoria / dossier chapter */
  chapter: 'relación' | 'campo' | 'comercio' | 'cobranza' | 'señal' | 'crédito' | 'territorio' | 'interno';
  /** Which product surfaces typically project this event */
  consumers: TimelineConsumer[];
  /** Soft state vs irreversible commercial fact */
  mutability: 'immutable';
};

/** Payload envelope stored in ActivityEvent.payloadJson (versioned). */
export type CommercialEventPayload = {
  v: 1;
  related?: CommercialObjectRef;
  evidence?: EvidenceRef[];
  metadata?: Record<string, unknown>;
};

/**
 * Domain event before persistence.
 * Immutable once written — never update; emit a compensating/follow-on event.
 */
export type CommercialEventInput = {
  type: CommercialEventType;
  organizationId: string;
  accountId: string | null;
  actor: CommercialActor;
  occurredAt: Date;
  title: string;
  body?: string | null;
  related?: CommercialObjectRef;
  evidence?: EvidenceRef[];
  metadata?: Record<string, unknown>;
  /** Optional stable id (seeds); otherwise adapter generates ULID */
  id?: string;
};

export type CommercialEventRecord = CommercialEventInput & {
  id: string;
  payload: CommercialEventPayload;
};
