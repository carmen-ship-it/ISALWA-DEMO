import type { ListOpenWorkQuery, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredWorkReadModel } from '../projection-store-port';
import { assertWorkListScope, canViewWork } from './work-auth';

function toWorkSummary(model: StoredWorkReadModel): WorkSummaryReadModel {
  return {
    workItemId: model.workItemId,
    organizationId: model.organizationId,
    title: model.title,
    description: model.description,
    status: model.status,
    priority: model.priority,
    ownerMemberId: model.ownerMemberId,
    createdByMemberId: model.createdByMemberId,
    subjectType: model.subjectType,
    subjectId: model.subjectId,
    dueAt: model.dueAt,
    completedAt: model.completedAt,
    cancelledAt: model.cancelledAt,
    pendingApprovalId: model.pendingApprovalId,
    approvalStatus: model.approvalStatus,
    ownershipChangeCount: model.ownershipChangeCount,
    lastOwnershipChangeAt: model.lastOwnershipChangeAt,
  };
}

export type WorkQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (title: string, workItemId: string) => string;
};

export class WorkQueryService {
  constructor(private readonly deps: WorkQueryServiceDeps) {}

  async listOpenWork(ctx: QueryContext, query: ListOpenWorkQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const ownerMemberId = assertWorkListScope(ctx, query.ownerMemberId);
    const scopedQuery: ListOpenWorkQuery = {
      ...query,
      ownerMemberId,
      status: query.status ?? 'open',
    };

    const { items, hasMore } = await this.deps.projectionStore.listWorkReadModels(
      ctx.organizationId,
      scopedQuery,
    );

    const visible = items.filter((item) => canViewWork(ctx, item));
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workSummary,
    );

    const last = visible.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeCursor(last.title, last.workItemId) : null;

    return {
      items: visible.map(toWorkSummary),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness,
    } satisfies PaginatedResult<WorkSummaryReadModel> & { freshness: unknown };
  }

  async getWorkSummary(ctx: QueryContext, workItemId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getWorkReadModel(ctx.organizationId, workItemId);
    if (!model) throw new Error('NOT_FOUND');
    if (!canViewWork(ctx, model)) throw new Error('PERMISSION_DENIED');
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workSummary,
    );
    return { work: toWorkSummary(model), freshness };
  }
}

export function encodeWorkSearchCursor(title: string, workItemId: string): string {
  return Buffer.from(JSON.stringify({ title, workItemId }), 'utf8').toString('base64url');
}
