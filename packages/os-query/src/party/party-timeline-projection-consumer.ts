import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import {
  EVENT_SCHEMA_VERSION_POLICY,
  isPartyTimelineEventType,
  OS_PROJECTION_CONSUMER_KEYS,
  PARTY_TIMELINE_EVENT_TYPES,
  PROJECTION_SCHEMA_VERSION_POLICY,
} from '@isalwa/os-contracts';
import type { OsOutboxConsumerPort } from '@isalwa/os-events';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type { OsWorkStore } from '@isalwa/os-work';
import type { OsProjectionStorePort, StoredPartyTimelineEntry } from '../projection-store-port';
import { extractTimelineFacts } from './party-timeline-facts';
import { resolvePartyIdForTimeline } from './party-timeline-association';

export type PartyTimelineProjectionDeps = {
  projectionStore: OsProjectionStorePort;
  commercialStore: OsCommercialStore;
  workStore: OsWorkStore;
};

export class PartyTimelineProjectionConsumer implements OsOutboxConsumerPort {
  readonly consumerKey = OS_PROJECTION_CONSUMER_KEYS.partyTimeline;

  constructor(private readonly deps: PartyTimelineProjectionDeps) {}

  async deliver(envelope: BusinessEventEnvelope): Promise<void> {
    if (envelope.schemaVersion > EVENT_SCHEMA_VERSION_POLICY.current) {
      throw new Error('OUTBOX_SCHEMA_VERSION_UNKNOWN');
    }
    if (!isPartyTimelineEventType(envelope.eventType)) {
      if (PROJECTION_SCHEMA_VERSION_POLICY.onUnknownEventType === 'skip') return;
      throw new Error('UNKNOWN_EVENT_TYPE');
    }

    const partyId = await resolvePartyIdForTimeline(this.deps, envelope);
    if (!partyId) return;

    const facts = extractTimelineFacts(
      envelope.eventType,
      (envelope.payload as Record<string, unknown> | undefined) ?? undefined,
    );

    const entry: StoredPartyTimelineEntry = {
      entryId: envelope.id,
      organizationId: envelope.organizationId,
      partyId,
      eventType: envelope.eventType,
      occurredAt: new Date(envelope.occurredAt),
      actorMemberId: envelope.actorMemberId ?? null,
      correlationId: envelope.correlationId,
      primaryEntityType: envelope.primaryEntityType,
      primaryEntityId: envelope.primaryEntityId,
      factsJson: facts,
      updatedAt: new Date(),
    };

    await this.deps.projectionStore.upsertPartyTimelineEntry(entry);

    await this.deps.projectionStore.upsertCheckpoint({
      organizationId: envelope.organizationId,
      consumerKey: this.consumerKey,
      lastEventId: envelope.id,
      lastOccurredAt: new Date(envelope.occurredAt),
      updatedAt: new Date(),
    });

    const pending = await this.deps.projectionStore.countPendingOutbox(envelope.organizationId);
    await this.deps.projectionStore.upsertFreshness(envelope.organizationId, this.consumerKey, {
      lastSuccessAt: new Date().toISOString(),
      lastEventOccurredAt: envelope.occurredAt,
      pendingOutboxCount: pending,
      lastError: null,
    });
  }
}

export async function replayPartyTimelineForOrg(
  deps: PartyTimelineProjectionDeps,
  organizationId: string,
  consumer: PartyTimelineProjectionConsumer,
): Promise<{ replayed: number }> {
  await deps.projectionStore.deletePartyTimelineEntriesForOrg(organizationId);

  const events = await deps.projectionStore.listEventsForReplay(
    organizationId,
    PARTY_TIMELINE_EVENT_TYPES,
  );

  for (const row of events) {
    await consumer.deliver({
      id: row.id,
      organizationId: row.organizationId,
      eventType: row.eventType,
      schemaVersion: row.schemaVersion,
      occurredAt: row.occurredAt.toISOString(),
      recordedAt: row.recordedAt.toISOString(),
      actorMemberId: row.actorMemberId,
      primaryEntityType: row.primaryEntityType,
      primaryEntityId: row.primaryEntityId,
      correlationId: row.correlationId,
      provenance: 'replay',
      dataOrigin: 'production',
      payload: row.payloadJson ?? undefined,
    });
  }

  await deps.projectionStore.upsertFreshness(organizationId, consumer.consumerKey, {
    rebuiltAt: new Date().toISOString(),
    lastError: null,
    pendingOutboxCount: await deps.projectionStore.countPendingOutbox(organizationId),
  });

  return { replayed: events.length };
}
