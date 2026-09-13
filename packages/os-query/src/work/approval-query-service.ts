import type { ApprovalSummaryReadModel, ListPendingApprovalsQuery } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredApprovalReadModel } from '../projection-store-port';
import { assertApprovalListScope, canViewApproval } from './work-auth';

function toApprovalSummary(model: StoredApprovalReadModel): ApprovalSummaryReadModel {
  return {
    approvalRequestId: model.approvalRequestId,
    organizationId: model.organizationId,
    workItemId: model.workItemId,
    subjectType: model.subjectType,
    subjectId: model.subjectId,
    requestedByMemberId: model.requestedByMemberId,
    approverMemberId: model.approverMemberId,
    status: model.status,
    decisionByMemberId: model.decisionByMemberId,
    decisionReason: model.decisionReason,
    decidedAt: model.decidedAt,
    requiredScope: model.requiredScope,
  };
}

export type ApprovalQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (approvalRequestId: string) => string;
};

export class ApprovalQueryService {
  constructor(private readonly deps: ApprovalQueryServiceDeps) {}

  async listPendingApprovals(ctx: QueryContext, query: ListPendingApprovalsQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const approverMemberId = assertApprovalListScope(ctx, query.approverMemberId);
    const scopedQuery: ListPendingApprovalsQuery = {
      ...query,
      approverMemberId,
    };

    const { items, hasMore } = await this.deps.projectionStore.listApprovalReadModels(
      ctx.organizationId,
      scopedQuery,
    );

    const visible = items.filter(
      (item) => item.status === 'pending' && canViewApproval(ctx, item),
    );
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workSummary,
    );

    const last = visible.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeCursor(last.approvalRequestId) : null;

    return {
      items: visible.map(toApprovalSummary),
      meta: { nextCursor, limit: query.limit ?? 25, hasMore },
      freshness,
    } satisfies PaginatedResult<ApprovalSummaryReadModel> & { freshness: unknown };
  }

  async getApproval(ctx: QueryContext, approvalRequestId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getApprovalReadModel(
      ctx.organizationId,
      approvalRequestId,
    );
    if (!model) throw new Error('NOT_FOUND');
    if (!canViewApproval(ctx, model)) throw new Error('PERMISSION_DENIED');
    const freshness = await this.deps.projectionStore.getFreshness(
      ctx.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workSummary,
    );
    return { approval: toApprovalSummary(model), freshness };
  }
}

export function encodeApprovalCursor(approvalRequestId: string): string {
  return Buffer.from(JSON.stringify({ approvalRequestId }), 'utf8').toString('base64url');
}
