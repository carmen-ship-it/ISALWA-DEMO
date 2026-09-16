import type { OsApiClient } from '@/lib/api/os-api-client';
import type { PartyDetailResponse, PartyLocationsResponse } from '@/lib/party/types';
import { fetchCommercialSection, type FetchOutcome } from '@/lib/commercial/fetch-outcome';
import type {
  OpportunityListResponse,
  OrderListResponse,
  PartyTimelineResponse,
  QuoteListResponse,
} from '@/lib/commercial/types';
import type { WorkListResponse } from '@/lib/work/types';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { mergeRelatedWork } from '@/lib/work/follow-up';
import { isProjectionStale } from '@/lib/query/projection-freshness';

export type Cliente360Data = {
  detail: PartyDetailResponse;
  opportunities: FetchOutcome<OpportunityListResponse>;
  quotes: FetchOutcome<QuoteListResponse>;
  orders: FetchOutcome<OrderListResponse>;
  timeline: FetchOutcome<PartyTimelineResponse>;
  relatedWork: FetchOutcome<WorkListResponse>;
  locations: FetchOutcome<PartyLocationsResponse>;
  memberLabels: Awaited<ReturnType<typeof resolveMemberLabels>>;
  staleFreshness: boolean;
};

function sectionStale<T extends { freshness: Parameters<typeof isProjectionStale>[0] }>(
  outcome: FetchOutcome<T>,
): boolean {
  return outcome.status === 'ok' && isProjectionStale(outcome.data.freshness);
}

export async function loadCliente360(
  client: OsApiClient,
  partyId: string,
): Promise<Cliente360Data> {
  const detail = await client.getParty(partyId);
  const commercialAccountId = detail.commercialAccount?.id ?? null;

  const [opportunities, quotes, orders, timeline, relatedWork, locations] = await Promise.all([
    fetchCommercialSection(() => client.listOpportunities({ partyId, limit: 10 })),
    fetchCommercialSection(() => client.listQuotes({ partyId, limit: 10 })),
    fetchCommercialSection(() => client.listOrders({ partyId, limit: 10 })),
    fetchCommercialSection(() => client.listPartyTimeline(partyId, { limit: 20 })),
    fetchCommercialSection(async () => {
      const partyWork = await client.listWorkItems({
        subjectType: 'party',
        subjectId: partyId,
        status: 'open',
        limit: 5,
      });
      if (!commercialAccountId) return partyWork;
      try {
        const accountWork = await client.listWorkItems({
          subjectType: 'commercial_account',
          subjectId: commercialAccountId,
          status: 'open',
          limit: 5,
        });
        return mergeRelatedWork(partyWork, accountWork);
      } catch {
        return partyWork;
      }
    }),
    fetchCommercialSection(() => client.listPartyLocations(partyId)),
  ]);

  const memberIds = new Set<string>();
  if (opportunities.status === 'ok') {
    for (const item of opportunities.data.items) memberIds.add(item.ownerMemberId);
  }
  if (quotes.status === 'ok') {
    for (const item of quotes.data.items) memberIds.add(item.ownerMemberId);
  }
  if (orders.status === 'ok') {
    for (const item of orders.data.items) memberIds.add(item.ownerMemberId);
  }
  if (relatedWork.status === 'ok') {
    for (const item of relatedWork.data.items) {
      memberIds.add(item.ownerMemberId);
      memberIds.add(item.createdByMemberId);
    }
  }
  if (timeline.status === 'ok') {
    for (const item of timeline.data.items) {
      if (item.actorMemberId) memberIds.add(item.actorMemberId);
    }
  }

  if (detail.commercialAccount?.ownerMemberId) {
    memberIds.add(detail.commercialAccount.ownerMemberId);
  }

  const memberLabels = await resolveMemberLabels(client, memberIds);

  const staleFreshness =
    sectionStale(opportunities) ||
    sectionStale(quotes) ||
    sectionStale(orders) ||
    sectionStale(timeline) ||
    sectionStale(relatedWork);

  return {
    detail,
    opportunities,
    quotes,
    orders,
    timeline,
    relatedWork,
    locations,
    memberLabels,
    staleFreshness,
  };
}

/** Cliente detail: 1 party + 4 commercial/timeline + 1 work + 1 locations = 7 parallel reads max. */
export const CLIENTE_360_REQUEST_COUNT = 7;
