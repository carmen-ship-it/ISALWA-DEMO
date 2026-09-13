import type {
  ListOpportunitiesQuery,
  ListOrdersQuery,
  ListQuotesQuery,
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteDetailReadModel,
  QuoteLineReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type {
  OsProjectionStorePort,
  StoredOpportunityReadModel,
  StoredOrderReadModel,
  StoredQuoteLineReadModel,
  StoredQuoteReadModel,
} from '../projection-store-port';
import {
  assertCommercialListScope,
  canViewCommercialRecord,
  filterVisibleOpportunities,
  filterVisibleOrders,
  filterVisibleQuotes,
} from './commercial-auth';

function centavosToString(value: bigint): string {
  return value.toString();
}

function toOpportunitySummary(model: StoredOpportunityReadModel): OpportunitySummaryReadModel {
  return {
    opportunityId: model.opportunityId,
    organizationId: model.organizationId,
    partyId: model.partyId,
    commercialAccountId: model.commercialAccountId,
    ownerMemberId: model.ownerMemberId,
    title: model.title,
    stage: model.stage,
    status: model.status,
    expectedValueCentavos:
      model.expectedValueCentavos != null ? centavosToString(model.expectedValueCentavos) : null,
    closedAt: model.closedAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
  };
}

function toQuoteSummary(model: StoredQuoteReadModel): QuoteSummaryReadModel {
  return {
    quoteId: model.quoteId,
    organizationId: model.organizationId,
    partyId: model.partyId,
    commercialAccountId: model.commercialAccountId,
    opportunityId: model.opportunityId,
    ownerMemberId: model.ownerMemberId,
    quoteNumber: model.quoteNumber,
    status: model.status,
    currency: model.currency,
    subtotalCentavos: centavosToString(model.subtotalCentavos),
    headerDiscountCentavos: centavosToString(model.headerDiscountCentavos),
    totalCentavos: centavosToString(model.totalCentavos),
    revisionNumber: model.revisionNumber,
    notes: model.notes,
    submittedAt: model.submittedAt?.toISOString() ?? null,
    cancelledAt: model.cancelledAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
  };
}

function toQuoteLine(model: StoredQuoteLineReadModel): QuoteLineReadModel {
  return {
    quoteLineId: model.quoteLineId,
    quoteId: model.quoteId,
    lineNumber: model.lineNumber,
    description: model.description,
    quantity: model.quantity,
    unitLabel: model.unitLabel,
    unitPriceCentavos: centavosToString(model.unitPriceCentavos),
    discountCentavos: centavosToString(model.discountCentavos),
    lineTotalCentavos: centavosToString(model.lineTotalCentavos),
    productRef: model.productRef,
  };
}

function toOrderSummary(model: StoredOrderReadModel): OrderSummaryReadModel {
  return {
    orderId: model.orderId,
    organizationId: model.organizationId,
    partyId: model.partyId,
    commercialAccountId: model.commercialAccountId,
    quoteId: model.quoteId,
    ownerMemberId: model.ownerMemberId,
    orderNumber: model.orderNumber,
    status: model.status,
    currency: model.currency,
    subtotalCentavos: centavosToString(model.subtotalCentavos),
    headerDiscountCentavos: centavosToString(model.headerDiscountCentavos),
    totalCentavos: centavosToString(model.totalCentavos),
    cancelledAt: model.cancelledAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
  };
}

export type CommercialQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeOpportunityCursor: (title: string, opportunityId: string) => string;
  encodeQuoteCursor: (quoteNumber: string, quoteId: string) => string;
  encodeOrderCursor: (orderNumber: string, orderId: string) => string;
};

export class CommercialQueryService {
  constructor(private readonly deps: CommercialQueryServiceDeps) {}

  private async freshness(organizationId: string) {
    return this.deps.projectionStore.getFreshness(
      organizationId,
      OS_PROJECTION_CONSUMER_KEYS.commercialSummary,
    );
  }

  async listOpportunities(ctx: QueryContext, query: ListOpportunitiesQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const ownerMemberId = assertCommercialListScope(ctx, query.ownerMemberId);
    const { items, hasMore } = await this.deps.projectionStore.listOpportunityReadModels(
      ctx.organizationId,
      { ...query, ownerMemberId },
    );
    const visible = filterVisibleOpportunities(ctx, items);
    const last = visible.at(-1);
    const nextCursor =
      hasMore && last
        ? this.deps.encodeOpportunityCursor(last.title, last.opportunityId)
        : null;

    return {
      items: visible.map(toOpportunitySummary),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness: await this.freshness(ctx.organizationId),
    } satisfies PaginatedResult<OpportunitySummaryReadModel> & { freshness: unknown };
  }

  async getOpportunity(ctx: QueryContext, opportunityId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getOpportunityReadModel(
      ctx.organizationId,
      opportunityId,
    );
    if (!model) throw new Error('NOT_FOUND');
    if (!canViewCommercialRecord(ctx, model)) throw new Error('PERMISSION_DENIED');
    return { opportunity: toOpportunitySummary(model), freshness: await this.freshness(ctx.organizationId) };
  }

  async listQuotes(ctx: QueryContext, query: ListQuotesQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const ownerMemberId = assertCommercialListScope(ctx, query.ownerMemberId);
    const { items, hasMore } = await this.deps.projectionStore.listQuoteReadModels(ctx.organizationId, {
      ...query,
      ownerMemberId,
    });
    const visible = filterVisibleQuotes(ctx, items);
    const last = visible.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeQuoteCursor(last.quoteNumber, last.quoteId) : null;

    return {
      items: visible.map(toQuoteSummary),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness: await this.freshness(ctx.organizationId),
    } satisfies PaginatedResult<QuoteSummaryReadModel> & { freshness: unknown };
  }

  async getQuote(ctx: QueryContext, quoteId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getQuoteReadModel(ctx.organizationId, quoteId);
    if (!model) throw new Error('NOT_FOUND');
    if (!canViewCommercialRecord(ctx, model)) throw new Error('PERMISSION_DENIED');

    const lines = await this.deps.projectionStore.listQuoteLineReadModels(ctx.organizationId, quoteId);
    const detail: QuoteDetailReadModel = {
      ...toQuoteSummary(model),
      lines: lines.map(toQuoteLine),
    };
    return { quote: detail, freshness: await this.freshness(ctx.organizationId) };
  }

  async listOrders(ctx: QueryContext, query: ListOrdersQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const ownerMemberId = assertCommercialListScope(ctx, query.ownerMemberId);
    const { items, hasMore } = await this.deps.projectionStore.listOrderReadModels(ctx.organizationId, {
      ...query,
      ownerMemberId,
    });
    const visible = filterVisibleOrders(ctx, items);
    const last = visible.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeOrderCursor(last.orderNumber, last.orderId) : null;

    return {
      items: visible.map(toOrderSummary),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness: await this.freshness(ctx.organizationId),
    } satisfies PaginatedResult<OrderSummaryReadModel> & { freshness: unknown };
  }

  async getOrder(ctx: QueryContext, orderId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getOrderReadModel(ctx.organizationId, orderId);
    if (!model) throw new Error('NOT_FOUND');
    if (!canViewCommercialRecord(ctx, model)) throw new Error('PERMISSION_DENIED');
    return { order: toOrderSummary(model), freshness: await this.freshness(ctx.organizationId) };
  }
}

export function encodeOpportunityCursor(title: string, opportunityId: string): string {
  return Buffer.from(JSON.stringify({ title, opportunityId }), 'utf8').toString('base64url');
}

export function encodeQuoteCursor(quoteNumber: string, quoteId: string): string {
  return Buffer.from(JSON.stringify({ quoteNumber, quoteId }), 'utf8').toString('base64url');
}

export function encodeOrderCursor(orderNumber: string, orderId: string): string {
  return Buffer.from(JSON.stringify({ orderNumber, orderId }), 'utf8').toString('base64url');
}
