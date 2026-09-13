import type { ListPartyTimelineQuery, PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredPartyTimelineEntry } from '../projection-store-port';

export type PartyTimelineQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (occurredAt: string, entryId: string) => string;
  partyExists: (organizationId: string, partyId: string) => Promise<boolean>;
};

function toTimelineEntry(model: StoredPartyTimelineEntry): PartyTimelineEntryReadModel {
  return {
    entryId: model.entryId,
    organizationId: model.organizationId,
    partyId: model.partyId,
    eventType: model.eventType,
    occurredAt: model.occurredAt.toISOString(),
    actorMemberId: model.actorMemberId,
    correlationId: model.correlationId,
    primaryEntityType: model.primaryEntityType,
    primaryEntityId: model.primaryEntityId,
    facts: { ...model.factsJson },
  };
}

export class PartyTimelineQueryService {
  constructor(private readonly deps: PartyTimelineQueryServiceDeps) {}

  async listPartyTimeline(
    ctx: QueryContext,
    partyId: string,
    query: ListPartyTimelineQuery,
  ): Promise<PaginatedResult<PartyTimelineEntryReadModel> & { freshness: unknown }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const exists = await this.deps.partyExists(ctx.organizationId, partyId);
    if (!exists) {
      throw new Error('NOT_FOUND');
    }

    const { items, hasMore } = await this.deps.projectionStore.listPartyTimelineEntries(
      ctx.organizationId,
      partyId,
      query,
    );

    const limit = query.limit ?? 25;
    const last = items.at(-1);
    const nextCursor =
      hasMore && last
        ? this.deps.encodeCursor(last.occurredAt.toISOString(), last.entryId)
        : null;

    const freshness =
      (await this.deps.projectionStore.getFreshness(
        ctx.organizationId,
        OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
      )) ?? {
        consumerKey: OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
        organizationId: ctx.organizationId,
        lastSuccessAt: null,
        lastEventOccurredAt: null,
        pendingOutboxCount: 0,
        isStale: true,
        lastError: null,
        rebuiltAt: null,
      };

    return {
      items: items.map(toTimelineEntry),
      meta: { nextCursor, limit, hasMore },
      freshness,
    };
  }
}

export function encodePartyTimelineCursor(occurredAt: string, entryId: string): string {
  return Buffer.from(JSON.stringify({ occurredAt, entryId }), 'utf8').toString('base64url');
}

export function decodePartyTimelineCursor(cursor: string): { occurredAt: string; entryId: string } {
  const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
    occurredAt: string;
    entryId: string;
  };
  return parsed;
}
