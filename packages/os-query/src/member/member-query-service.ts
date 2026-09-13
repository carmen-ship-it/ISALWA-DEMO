import type { ListMembersQuery, MemberSummaryReadModel } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { MemberQueryStorePort } from './member-query-store-port';

export type MemberQueryServiceDeps = {
  store: MemberQueryStorePort;
  encodeCursor: (familyName: string, memberId: string) => string;
};

export class MemberQueryService {
  constructor(private readonly deps: MemberQueryServiceDeps) {}

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
