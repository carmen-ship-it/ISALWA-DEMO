import type { ListOpenWorkQuery, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredWorkReadModel } from '../projection-store-port';
import { assertWorkListScope, canViewWork, isOpenPurchasingPrepReview } from './work-auth';
import { canRecordPurchasing } from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';
import {
  FOLLOW_UP_WORK_SUBJECT_TYPES,
  canReadOwnedRecord,
  ownerInReadScope,
  resolveOwnerReadScope,
  toStoreOwnerFilter,
} from '../leadership/leadership-visibility';

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
  /** Required for visibility=team. Missing lookup fails closed. */
  directReports?: DirectReportLookup | null;
};

export class WorkQueryService {
  constructor(private readonly deps: WorkQueryServiceDeps) {}

  async listOpenWork(ctx: QueryContext, query: ListOpenWorkQuery) {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    if (query.overdue && query.status && query.status !== 'open') {
      throw new Error('VALIDATION_FAILED');
    }
    if (
      query.followUpOnly &&
      query.subjectType &&
      !(FOLLOW_UP_WORK_SUBJECT_TYPES as readonly string[]).includes(query.subjectType)
    ) {
      throw new Error('VALIDATION_FAILED');
    }

    const visibility = query.visibility ?? 'own';
    const useLeadershipLens = visibility === 'team' || visibility === 'org';
    const scope = useLeadershipLens
      ? await resolveOwnerReadScope({
          ctx,
          visibility,
          requestedOwnerMemberId: query.ownerMemberId,
          lookup: this.deps.directReports ?? null,
        })
      : null;
    const ownerMemberId = scope ? undefined : assertWorkListScope(ctx, query.ownerMemberId);
    const ownerFilter = scope ? toStoreOwnerFilter(scope) : { ownerMemberId };

    if ('empty' in ownerFilter) {
      const freshness = await this.deps.projectionStore.getFreshness(
        ctx.organizationId,
        OS_PROJECTION_CONSUMER_KEYS.workSummary,
      );
      return {
        items: [],
        meta: { nextCursor: null, limit: query.limit ?? 25, hasMore: false },
        freshness,
      } satisfies PaginatedResult<WorkSummaryReadModel> & { freshness: unknown };
    }

    const subjectTypes = query.followUpOnly
      ? query.subjectType
        ? [query.subjectType]
        : [...FOLLOW_UP_WORK_SUBJECT_TYPES]
      : undefined;

    const { items, hasMore } = await this.deps.projectionStore.listWorkReadModels(
      ctx.organizationId,
      {
        cursor: query.cursor,
        limit: query.limit,
        ownerMemberId: 'ownerMemberId' in ownerFilter ? ownerFilter.ownerMemberId : undefined,
        ownerMemberIds: 'ownerMemberIds' in ownerFilter ? ownerFilter.ownerMemberIds : undefined,
        status: query.overdue ? 'open' : (query.status ?? 'open'),
        subjectType: subjectTypes ? undefined : query.subjectType,
        subjectTypes,
        subjectId: query.subjectId,
        dueBefore: query.overdue ? ctx.effectiveAt : undefined,
        q: query.q,
      },
    );

    // Compras must see requester-owned open abastecimiento reviews to resolve them.
    let purchasingPrepExtras: typeof items = [];
    if (
      !scope &&
      !query.overdue &&
      (query.status ?? 'open') === 'open' &&
      canRecordPurchasing([...ctx.auth.roleKeys, ...ctx.auth.delegatedScopes])
    ) {
      const orgOpen = await this.deps.projectionStore.listWorkReadModels(ctx.organizationId, {
        limit: 100,
        status: 'open',
        subjectType: subjectTypes ? undefined : query.subjectType,
        subjectTypes,
        subjectId: query.subjectId,
      });
      purchasingPrepExtras = (orgOpen.items ?? []).filter(
        (item) => isOpenPurchasingPrepReview(item) && canViewWork(ctx, item),
      );
    }

    const merged = [...items];
    const seen = new Set(merged.map((item) => item.workItemId));
    for (const extra of purchasingPrepExtras) {
      if (seen.has(extra.workItemId)) continue;
      seen.add(extra.workItemId);
      merged.push(extra);
    }

    const visible = merged.filter((item) => {
      if (item.organizationId !== ctx.organizationId) return false;
      if (scope) return ownerInReadScope(item.ownerMemberId, scope);
      return canViewWork(ctx, item);
    });
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
    const allowed =
      canViewWork(ctx, model) ||
      (await canReadOwnedRecord({
        ctx,
        organizationId: model.organizationId,
        ownerMemberId: model.ownerMemberId,
        lookup: this.deps.directReports ?? null,
      }));
    if (!allowed) throw new Error('PERMISSION_DENIED');
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
