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
import { loadDocumentLinks, type DocumentLinksOutcome } from './document-links';
import { loadClienteFinanceSummary, type FinanceSummaryOutcome } from './finance-summary';

export type Cliente360Data = {
  detail: PartyDetailResponse;
  opportunities: FetchOutcome<OpportunityListResponse>;
  quotes: FetchOutcome<QuoteListResponse>;
  orders: FetchOutcome<OrderListResponse>;
  timeline: FetchOutcome<PartyTimelineResponse>;
  relatedWork: FetchOutcome<WorkListResponse>;
  locations: FetchOutcome<PartyLocationsResponse>;
  documentLinks: DocumentLinksOutcome;
  financeSummary: FinanceSummaryOutcome;
  memberLabels: Awaited<ReturnType<typeof resolveMemberLabels>>;
  staleFreshness: boolean;
};

/** Optional View As / lens query. Never elevates — only narrows org-first party lists. */
export type LoadCliente360Options = {
  /** From commercialListQueryFromProjection — e.g. visibility=org&ownerMemberId=… */
  commercialQuery?: Record<string, string>;
  /**
   * Ops Vista de evaluación: suppress opportunity/quote negotiation lists.
   * Pedido list may still use org visibility for operational context.
   */
  suppressCommercialNegotiation?: boolean;
};

function sectionStale<T extends { freshness: Parameters<typeof isProjectionStale>[0] }>(
  outcome: FetchOutcome<T>,
): boolean {
  return outcome.status === 'ok' && isProjectionStale(outcome.data.freshness);
}

function emptyCommercialList<T extends { items: unknown[]; meta: unknown; freshness: unknown }>(): T {
  return {
    items: [],
    meta: { nextCursor: null, limit: 10, hasMore: false },
    freshness: null,
  } as unknown as T;
}

export async function loadCliente360(
  client: OsApiClient,
  partyId: string,
  options: LoadCliente360Options = {},
): Promise<Cliente360Data> {
  const detail = await client.getParty(partyId);
  const commercialAccountId = detail.commercialAccount?.id ?? null;
  const commercialQuery = options.commercialQuery ?? {};
  const suppressNegotiation = options.suppressCommercialNegotiation === true;

  // Party-scoped commercial graph: prefer org visibility so Resumen reconciles to
  // canonical records owned by other members. View As must pass commercialQuery
  // (or suppressNegotiation) so Carmen's org.read does not leak through projection.
  const listPartyScoped = async <T,>(
    withOrg: () => Promise<T>,
    without: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await withOrg();
    } catch {
      return without();
    }
  };

  const opportunityLoader = suppressNegotiation
    ? async () => emptyCommercialList<OpportunityListResponse>()
    : () =>
        listPartyScoped(
          () =>
            client.listOpportunities({
              partyId,
              limit: 10,
              visibility: 'org',
              ...commercialQuery,
            }),
          () => client.listOpportunities({ partyId, limit: 10, ...commercialQuery }),
        );

  const quoteLoader = suppressNegotiation
    ? async () => emptyCommercialList<QuoteListResponse>()
    : () =>
        listPartyScoped(
          () =>
            client.listQuotes({
              partyId,
              limit: 10,
              visibility: 'org',
              ...commercialQuery,
            }),
          () => client.listQuotes({ partyId, limit: 10, ...commercialQuery }),
        );

  const [opportunities, quotes, orders, timeline, relatedWork, locations, documentLinks, financeSummary] =
    await Promise.all([
      fetchCommercialSection(opportunityLoader),
      fetchCommercialSection(quoteLoader),
      fetchCommercialSection(() =>
        listPartyScoped(
          () =>
            client.listOrders({
              partyId,
              limit: 10,
              visibility: 'org',
              ...commercialQuery,
            }),
          () => client.listOrders({ partyId, limit: 10, ...commercialQuery }),
        ),
      ),
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
      loadDocumentLinks(client, partyId, { commercialQuery, suppressNegotiation }),
      loadClienteFinanceSummary(client, partyId, { commercialQuery, suppressNegotiation }),
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
  if (detail.activeCoverage?.actingAdvisorMemberId) {
    memberIds.add(detail.activeCoverage.actingAdvisorMemberId);
  }
  if (detail.activeCoverage?.recordedByMemberId) {
    memberIds.add(detail.activeCoverage.recordedByMemberId);
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
    documentLinks,
    financeSummary,
    memberLabels,
    staleFreshness,
  };
}

/** Cliente detail: 1 party + 4 commercial/timeline + 1 work + 1 locations + 2 dossier = 9 parallel reads max. */
export const CLIENTE_360_REQUEST_COUNT = 9;
