import type { ApprovalSummaryReadModel, ListPendingApprovalsQuery } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { OsWorkStore } from '@isalwa/os-work';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredApprovalReadModel } from '../projection-store-port';
import type { DirectReportLookup } from '../leadership/direct-reports';
import type { CustomerVisibilityLookup } from '../party/customer-visibility';
import { canReadOwnedRecord } from '../leadership/leadership-visibility';
import { assertApprovalListScope, canActAsApproverDelegate, canReadApproval, canViewApproval } from './work-auth';

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
  /** Managerial reads (commercial.team.read). Missing lookup fails closed. */
  directReports?: DirectReportLookup | null;
  /** Customer-linked approvals and work. Missing lookup fails closed. */
  customerVisibility?: CustomerVisibilityLookup | null;
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

    const statusFilter = query.status ?? 'pending';
    const visible = items.filter((item) => {
      if (!canViewApproval(ctx, item)) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'decided') return item.status === 'approved' || item.status === 'rejected';
      if (statusFilter === 'pending') return item.status === 'pending';
      return item.status === statusFilter;
    });
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
    options: { limit?: number; cursor?: string } = {},
  ): Promise<{
    items: SubjectApprovalItem[];
    meta: { hasMore: boolean; nextCursor: string | null; limit: number };
  }> {
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

    const lookup = this.deps.directReports ?? null;
    const canSeeAll = await canReadOwnedRecord({
      ctx,
      organizationId: subject.organizationId,
      ownerMemberId: subject.ownerMemberId,
      lookup,
    });

    const rows = await this.deps.workStore.listApprovalsForSubject(
      ctx.organizationId,
      subjectType,
      subjectId,
    );
    const visible: typeof rows = [];
    for (const row of rows) {
      if (canSeeAll) {
        visible.push(row);
        continue;
      }
      const approval: StoredApprovalReadModel = {
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
      };
      const customer = this.deps.customerVisibility ?? null;
      if (await canReadApproval({ ctx, approval, sources: this.deps.projectionStore, lookup, customer })) visible.push(row);
    }
    if (!canSeeAll && visible.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const sorted = [...visible].sort((a, b) => {
      const at = a.decidedAt?.getTime() ?? 0;
      const bt = b.decidedAt?.getTime() ?? 0;
      if (bt !== at) return bt - at;
      return b.id.localeCompare(a.id);
    });
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    let offset = 0;
    if (options.cursor && /^\d+$/.test(options.cursor)) offset = parseInt(options.cursor, 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    const page = sorted.slice(offset, offset + limit);
    const hasMore = offset + page.length < sorted.length;

    return {
      items: page.map((row) => ({
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
      meta: {
        hasMore,
        nextCursor: hasMore ? String(offset + page.length) : null,
        limit,
      },
    };
  }

  async getApproval(ctx: QueryContext, approvalRequestId: string) {
    assertQueryScope(ctx, 'member_active');
    const model = await this.deps.projectionStore.getApprovalReadModel(
      ctx.organizationId,
      approvalRequestId,
    );
    if (!model) throw new Error('NOT_FOUND');
    const readable = await canReadApproval({
      ctx,
      approval: model,
      sources: this.deps.projectionStore,
      lookup: this.deps.directReports ?? null,
      customer: this.deps.customerVisibility ?? null,
    });
    if (!readable) throw new Error('NOT_FOUND');
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
