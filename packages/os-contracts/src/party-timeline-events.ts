import { OS_COMMERCIAL_EVENT_TYPES } from './commercial-events';
import { OS_DELIVERY_EVENT_TYPES } from './delivery';
import { OS_PARTY_EVENT_TYPES } from './party-events';
import { OS_WORK_EVENT_TYPES } from './work-events';

/** Event types eligible for Party-scoped timeline projection. */
export const PARTY_TIMELINE_EVENT_TYPES = [
  ...OS_PARTY_EVENT_TYPES,
  'contact.updated',
  ...OS_COMMERCIAL_EVENT_TYPES,
  ...OS_WORK_EVENT_TYPES,
  ...OS_DELIVERY_EVENT_TYPES,
] as const;

export type PartyTimelineEventType = (typeof PARTY_TIMELINE_EVENT_TYPES)[number];

export function isPartyTimelineEventType(value: string): value is PartyTimelineEventType {
  return (PARTY_TIMELINE_EVENT_TYPES as readonly string[]).includes(value);
}
