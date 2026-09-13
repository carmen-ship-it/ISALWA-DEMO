/** Registered projection consumer keys — one per read model family. */
export const OS_PROJECTION_CONSUMER_KEYS = {
  partySearch: 'projection.party.search.v1',
  workSummary: 'projection.work.summary.v1',
  workAttention: 'projection.work.attention.v1',
  commercialSummary: 'projection.commercial.summary.v1',
  partyTimeline: 'projection.timeline.party.v1',
} as const;

export type OsProjectionConsumerKey =
  (typeof OS_PROJECTION_CONSUMER_KEYS)[keyof typeof OS_PROJECTION_CONSUMER_KEYS];

/** Staleness threshold before queries flag degraded freshness metadata. */
export const PROJECTION_STALE_PENDING_OUTBOX_THRESHOLD = 1;

/** Unknown event schema version handling — mirrors EVENT_SCHEMA_VERSION_POLICY. */
export const PROJECTION_SCHEMA_VERSION_POLICY = {
  onUnknownVersion: 'reject' as const,
  onUnknownEventType: 'skip' as const,
} as const;
