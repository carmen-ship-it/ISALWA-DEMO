import type { AttentionItemReadModel, ListAttentionQuery } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredAttentionReadModel } from '../projection-store-port';

function toAttentionItem(model: StoredAttentionReadModel): AttentionItemReadModel {
  return {
    attentionKey: model.attentionKey,
    organizationId: model.organizationId,
    memberId: model.memberId,
    attentionType: model.attentionType,
    reasonCode: model.reasonCode,
    reasonDetail: model.reasonDetail,
    resourceType: model.resourceType,
    resourceId: model.resourceId,
    workItemId: model.workItemId,
    approvalRequestId: model.approvalRequestId,
    subjectType: model.subjectType,
    subjectId: model.subjectId,
    isActive: model.isActive,
  };
}

export type AttentionQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (attentionKey: string) => string;
};

export class AttentionQueryService {
  constructor(private readonly deps: AttentionQueryServiceDeps) {}

  async listAttentionItems(ctx: QueryContext, query: ListAttentionQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const { items, hasMore } = await this.deps.projectionStore.listAttentionReadModels(
      ctx.organizationId,
      ctx.auth.memberId,
      query,
    );

    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workAttention,
    );

    const last = items.at(-1);
    const nextCursor = hasMore && last ? this.deps.encodeCursor(last.attentionKey) : null;

    return {
      items: items.map(toAttentionItem),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness,
    } satisfies PaginatedResult<AttentionItemReadModel> & { freshness: unknown };
  }
}

export function encodeAttentionCursor(attentionKey: string): string {
  return Buffer.from(JSON.stringify({ attentionKey }), 'utf8').toString('base64url');
}
