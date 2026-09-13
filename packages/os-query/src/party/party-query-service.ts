import type { SearchPartiesQuery } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
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

    return {
      items: items.map((item) => toPartySummary(item)),
      meta: { nextCursor, limit, hasMore },
      freshness,
    };
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
