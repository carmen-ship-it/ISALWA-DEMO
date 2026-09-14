/**
 * Commercial timeline persistence adapters (Mission 17).
 * Domain owns types; this package owns append/read against ActivityEvent.
 */

export { emitCommercialEvent, buildActivityCreateManyInput } from './emit';
export { listAccountTimeline, TIMELINE_READ_SCOPE } from './read';
export type {
  TimelineReadItem,
  TimelineReadResult,
  TimelineDenialCode,
  TrustedTimelineSession,
} from './read';
