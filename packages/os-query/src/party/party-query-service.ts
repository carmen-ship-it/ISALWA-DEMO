import type { PartySummaryReadModel, SearchPartiesQuery } from '@isalwa/os-contracts';
import {
  locationHasCoordinates,
  MASTER_DATA_ADMIN_SCOPE,
  OS_PROJECTION_CONSUMER_KEYS,
  selectLocationProvenanceUrl,
  selectPrimaryPhone,
} from '@isalwa/os-contracts';
import type { PartyOperatingSource } from '@isalwa/os-party';
import { memberHasScope } from '@isalwa/os-domain';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import { toPartySummary } from '../pagination';
import type { OsProjectionStorePort } from '../projection-store-port';
import type { DirectReportLookup } from '../leadership/direct-reports';
import {
  canReadCustomer,
  isCustomerBoundParty,
  resolveCustomerReadScope,
  type CustomerVisibilityLookup,
} from './customer-visibility';

/** Party identity a data steward maintains. Never contact, location or commercial data. */
export type MasterDataPartySummary = {
  partyId: string;
  partyKind: string;
  displayName: string;
  legalName: string | null;
  status: string;
  activeRoleKeys: string[];
  mergedIntoPartyId: string | null;
};

export function toMasterDataPartySummary(model: PartySummaryReadModel): MasterDataPartySummary {
  return {
    partyId: model.partyId,
    partyKind: model.partyKind,
    displayName: model.displayName,
    legalName: model.legalName ?? null,
    status: model.status,
    activeRoleKeys: [...model.activeRoleKeys],
    mergedIntoPartyId: model.mergedIntoPartyId ?? null,
  };
}

function foldForMatch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

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
  /** Customer contact boundary. Required: there is no unscoped search. */
  customerVisibility: CustomerVisibilityLookup;
  /** Team-lead visibility. Missing lookup fails closed. */
  directReports?: DirectReportLookup | null;
};

export class PartyQueryService {
  constructor(private readonly deps: PartyQueryServiceDeps) {}

  async searchParties(ctx: QueryContext, query: SearchPartiesQuery): Promise<PartySearchResult> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const scope = await resolveCustomerReadScope({
      ctx,
      lookup: this.deps.customerVisibility,
      directReports: this.deps.directReports ?? null,
    });
    const { items: rawItems, hasMore } = await this.deps.projectionStore.searchParties(
      ctx.organizationId,
      query,
      scope.kind === 'org' ? undefined : { partyIds: scope.partyIds },
    );
    const items =
      scope.kind === 'org' ? rawItems : await this.dropLaggingCustomers(ctx, rawItems, scope.partyIds);

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
    // Cursor follows the raw page so dropped rows never stall paging.
    const last = rawItems.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeCursor(last.displayName, last.partyId) : null;

    // Legal names are per-customer edit information (C3); the list returns them only to data stewards.
    const steward = memberHasScope(ctx.auth, MASTER_DATA_ADMIN_SCOPE);
    const summaries = items.map((item) => {
      const summary = toPartySummary(item);
      return steward ? summary : { ...summary, legalName: null };
    });
    const enriched = await this.attachOperatingFacts(ctx.organizationId, summaries);

    return {
      items: enriched,
      meta: { nextCursor, limit, hasMore },
      freshness,
    };
  }

  /**
   * Data-steward lookup (T03, 2026-10-16 19:30): a master_data.admin holder locates
   * the party records they maintain without commercial.org.read. Identity fields only;
   * matches only on display/legal name, so a contact name, email or phone never
   * reveals a party. No contacts, locations, owner, conversations, quotes or
   * payments. Grants no commercial action.
   */
  async searchMasterDataParties(
    ctx: QueryContext,
    query: SearchPartiesQuery,
  ): Promise<{ items: MasterDataPartySummary[]; meta: { nextCursor: string | null; limit: number; hasMore: boolean } }> {
    assertQueryScope(ctx, MASTER_DATA_ADMIN_SCOPE);
    assertQueryTenantResource(ctx, ctx.organizationId);
    const { items: rawItems, hasMore } = await this.deps.projectionStore.searchParties(
      ctx.organizationId,
      query,
      undefined,
    );
    const needle = foldForMatch(query.q ?? '');
    const items = rawItems
      .filter(
        (item) =>
          !needle ||
          foldForMatch(item.displayName).includes(needle) ||
          foldForMatch(item.legalName ?? '').includes(needle),
      )
      .map(toMasterDataPartySummary);
    const limit = query.limit ?? 25;
    const last = rawItems.at(-1);
    const nextCursor = hasMore && last ? this.deps.encodeCursor(last.displayName, last.partyId) : null;
    return { items, meta: { nextCursor, limit, hasMore } };
  }

  /**
   * Rows admitted only because the read model says "not customer-bound" are re-checked
   * against the source tables, so projection lag never exposes a customer.
   */
  private async dropLaggingCustomers<T extends { partyId: string }>(
    ctx: QueryContext,
    items: T[],
    visiblePartyIds: readonly string[],
  ): Promise<T[]> {
    const visible = new Set(visiblePartyIds);
    const unverified = items.filter((item) => !visible.has(item.partyId)).map((item) => item.partyId);
    if (unverified.length === 0) return items;
    const facts = await this.deps.customerVisibility.listCustomerFacts(
      ctx.organizationId,
      unverified,
      ctx.effectiveAt ?? new Date(),
    );
    const openIds = new Set(facts.filter((f) => !isCustomerBoundParty(f)).map((f) => f.partyId));
    return items.filter((item) => visible.has(item.partyId) || openIds.has(item.partyId));
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
    const readable = await canReadCustomer({
      ctx,
      partyId,
      lookup: this.deps.customerVisibility,
      directReports: this.deps.directReports ?? null,
    });
    if (!readable) throw new Error('NOT_FOUND');
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    return { party: toPartySummary(model), freshness };
  }
}
