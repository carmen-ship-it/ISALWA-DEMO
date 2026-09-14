import type { ApprovalSummaryReadModel, ListPendingApprovalsQuery } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { OsWorkStore } from '@isalwa/os-work';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredApprovalReadModel } from '../projection-store-port';
import { assertApprovalListScope, canActAsApproverDelegate, canViewApproval } from './work-auth';

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
  workStore?: OsWorkStore;
};

export type SubjectApprovalItem = ApprovalSummaryReadModel & {
  canDecide: boolean;
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

  async listSubjectApprovals(
    ctx: QueryContext,
    subjectType: string,
    subjectId: string,
  ): Promise<{ items: SubjectApprovalItem[] }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);
    if (!this.deps.workStore) throw new Error('VALIDATION_FAILED');
    if (subjectType !== 'quote' && subjectType !== 'order') throw new Error('VALIDATION_FAILED');
    if (!subjectId.trim()) throw new Error('VALIDATION_FAILED');

    const subject =
      subjectType === 'quote'
        ? await this.deps.workStore.getQuoteApprovalSubject(ctx.organizationId, subjectId)
        : await this.deps.workStore.getOrderApprovalSubject(ctx.organizationId, subjectId);
    if (!subject) throw new Error('NOT_FOUND');

    const canSeeAll =
      subject.ownerMemberId === ctx.auth.memberId ||
      ctx.auth.roleKeys.includes('people.admin') ||
      ctx.auth.roleKeys.includes('commercial.team.read') ||
      ctx.auth.roleKeys.includes('commercial.org.read');

    const rows = await this.deps.workStore.listApprovalsForSubject(
      ctx.organizationId,
      subjectType,
      subjectId,
    );
    const visible = rows.filter((row) => {
      if (canSeeAll) return true;
      return canViewApproval(ctx, {
        approvalRequestId: row.id,
        organizationId: row.organizationId,
        workItemId: row.workItemId,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        requestedByMemberId: row.requestedByMemberId,
        approverMemberId: row.approverMemberId,
        status: row.status,
        decisionByMemberId: row.decisionByMemberId,
        decisionReason: row.decisionReason,
        decidedAt: row.decidedAt?.toISOString() ?? null,
        requiredScope: null,
        lastEventId: null,
        lastOccurredAt: null,
        updatedAt: row.decidedAt ?? new Date(0),
      });
    });
    if (!canSeeAll && visible.length === 0 && rows.length > 0) {
      throw new Error('PERMISSION_DENIED');
    }

    return {
      items: visible.map((row) => ({
        approvalRequestId: row.id,
        organizationId: row.organizationId,
        workItemId: row.workItemId,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        requestedByMemberId: row.requestedByMemberId,
        approverMemberId: row.approverMemberId,
        status: row.status,
        decisionByMemberId: row.decisionByMemberId,
        decisionReason: row.decisionReason,
        decidedAt: row.decidedAt?.toISOString() ?? null,
        requiredScope: null,
        canDecide: row.status === 'pending' && canActAsApproverDelegate(ctx, row.approverMemberId),
      })),
    };
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
