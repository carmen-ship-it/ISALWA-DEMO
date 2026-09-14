import type { ListMembersQuery, MemberSummaryReadModel } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { MemberQueryStorePort } from './member-query-store-port';

export type MemberQueryServiceDeps = {
  store: MemberQueryStorePort;
  encodeCursor: (familyName: string, memberId: string) => string;
};

export type ActiveMemberOption = {
  memberId: string;
  displayName: string;
};

export type SearchActiveMembersQuery = {
  q: string;
  limit?: number;
  excludeMemberId?: string;
};

export class MemberQueryService {
  constructor(private readonly deps: MemberQueryServiceDeps) {}

  /** Bounded picker for same-tenant active members. Not the admin directory. */
  async listActiveMemberOptions(ctx: QueryContext): Promise<{ items: ActiveMemberOption[] }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);
    const { items } = await this.deps.store.listMembers(
      ctx.organizationId,
      { accessStatus: 'active', employmentStatus: 'active', limit: 100 },
      ctx.effectiveAt,
    );
    return {
      items: items
        .filter((item) => item.accessStatus === 'active')
        .map((item) => ({ memberId: item.memberId, displayName: item.displayName })),
    };
  }

  /**
   * Tenant-scoped active member search for pickers.
   * Organization is applied before search/limit. Name fields only (no email for member_active).
   */
  async searchActiveMembers(
    ctx: QueryContext,
    query: SearchActiveMembersQuery,
  ): Promise<{ items: ActiveMemberOption[]; hasMore: boolean }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);
    const q = query.q.trim();
    if (q.length < 2) return { items: [], hasMore: false };
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.deps.store.searchActiveMembers(
      ctx.organizationId,
      { q, limit, excludeMemberId: query.excludeMemberId },
      ctx.effectiveAt,
    );
  }

  async listMembers(
    ctx: QueryContext,
    query: ListMembersQuery,
  ): Promise<PaginatedResult<MemberSummaryReadModel>> {
    assertQueryScope(ctx, 'people.admin');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const { items, hasMore } = await this.deps.store.listMembers(
      ctx.organizationId,
      query,
      ctx.effectiveAt,
    );

    const limit = query.limit ?? 25;
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? this.deps.encodeCursor(last.familyName, last.memberId) : null;

    return {
      items,
      meta: { nextCursor, limit, hasMore },
    };
  }

  async getMember(ctx: QueryContext, memberId: string): Promise<MemberSummaryReadModel> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const row = await this.deps.store.getMemberSummary(
      ctx.organizationId,
      memberId,
      ctx.effectiveAt,
    );
    if (!row) {
      throw new Error('NOT_FOUND');
    }

    return row;
  }
}

export function encodeMemberDirectoryCursor(familyName: string, memberId: string): string {
  return Buffer.from(JSON.stringify({ familyName, memberId }), 'utf8').toString('base64url');
}
