import type { PartySummaryReadModel, SearchPartiesQuery } from '@isalwa/os-contracts';
import {
  locationHasCoordinates,
  OS_PROJECTION_CONSUMER_KEYS,
  selectLocationProvenanceUrl,
  selectPrimaryPhone,
} from '@isalwa/os-contracts';
import type { PartyOperatingSource } from '@isalwa/os-party';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import { toPartySummary } from '../pagination';
import type { OsProjectionStorePort } from '../projection-store-port';

export type PartySearchResult = PaginatedResult<ReturnType<typeof toPartySummary>> & {
  freshness: Awaited<ReturnType<OsProjectionStorePort['getFreshness']>>;
};

export type PartyQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (displayName: string, partyId: string) => string;
  /** Optional so existing search tests keep working. When set, one batch, never per row. */
  listOperatingSources?: (
    organizationId: string,
    partyIds: string[],
  ) => Promise<PartyOperatingSource[]>;
};

export class PartyQueryService {
  constructor(private readonly deps: PartyQueryServiceDeps) {}

  async searchParties(ctx: QueryContext, query: SearchPartiesQuery): Promise<PartySearchResult> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const { items, hasMore } = await this.deps.projectionStore.searchParties(
      ctx.organizationId,
      query,
    );

    const freshness =
      (await this.deps.projectionStore.getFreshness(
        ctx.organizationId,
        OS_PROJECTION_CONSUMER_KEYS.partySearch,
      )) ?? {
        consumerKey: OS_PROJECTION_CONSUMER_KEYS.partySearch,
        organizationId: ctx.organizationId,
        lastSuccessAt: null,
        lastEventOccurredAt: null,
        pendingOutboxCount: 0,
        isStale: true,
        lastError: null,
        rebuiltAt: null,
      };

    const limit = query.limit ?? 25;
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeCursor(last.displayName, last.partyId) : null;

    const summaries = items.map((item) => toPartySummary(item));
    const enriched = await this.attachOperatingFacts(ctx.organizationId, summaries);

    return {
      items: enriched,
      meta: { nextCursor, limit, hasMore },
      freshness,
    };
  }

  private async attachOperatingFacts(
    organizationId: string,
    items: PartySummaryReadModel[],
  ): Promise<PartySummaryReadModel[]> {
    if (!this.deps.listOperatingSources || items.length === 0) return items;
    const sources = await this.deps.listOperatingSources(
      organizationId,
      items.map((item) => item.partyId),
    );
    const byId = new Map(sources.map((source) => [source.partyId, source]));
    return items.map((item) => {
      const source = byId.get(item.partyId);
      if (!source) return item;
      return {
        ...item,
        primaryPhone: selectPrimaryPhone(source.contacts),
        commercialOwnerMemberId: source.commercialOwnerMemberId,
        hasCoordinates: source.locations.some(locationHasCoordinates),
        locationProvenanceUrl: selectLocationProvenanceUrl(source.locations),
      };
    });
  }

  async getPartySummary(ctx: QueryContext, partyId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getPartyReadModel(ctx.organizationId, partyId);
    if (!model) {
      throw new Error('NOT_FOUND');
    }
    assertQueryTenantResource(ctx, model.organizationId);
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    return { party: toPartySummary(model), freshness };
  }
}
