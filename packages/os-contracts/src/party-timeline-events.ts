import { OS_COMMERCIAL_EVENT_TYPES } from './commercial-events';
import { OS_DELIVERY_EVENT_TYPES } from './delivery';
import { OS_PARTY_EVENT_TYPES } from './party-events';
import { OS_WORK_EVENT_TYPES } from './work-events';

/**
 * Event types eligible for Party-scoped timeline projection.
 * finished_goods.* are post-sale physical evidence (Pedido context), not allocation.
 */
export const PARTY_TIMELINE_EVENT_TYPES = [
  ...OS_PARTY_EVENT_TYPES,
  'contact.updated',
  ...OS_COMMERCIAL_EVENT_TYPES,
  ...OS_WORK_EVENT_TYPES,
  ...OS_DELIVERY_EVENT_TYPES,
  'finished_goods.received',
  'finished_goods.corrected',
] as const;

export type PartyTimelineEventType = (typeof PARTY_TIMELINE_EVENT_TYPES)[number];

export function isPartyTimelineEventType(value: string): value is PartyTimelineEventType {
  return (PARTY_TIMELINE_EVENT_TYPES as readonly string[]).includes(value);
}
