import type { ListMembersQuery, MemberSummaryReadModel } from '@isalwa/os-contracts';
import { memberHasScope } from '@isalwa/os-domain';
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

/**
 * What any active member may read about another member: name and the display
 * context (department, Cargo label) that Cliente 360, approvals and coverage
 * screens render. No email, person id, manager, employment dates or status,
 * delegation count, or scope keys. Same boundary as listActiveMemberOptions.
 */
export type MemberPeerSummary = Pick<
  MemberSummaryReadModel,
  | 'memberId'
  | 'organizationId'
  | 'givenName'
  | 'familyName'
  | 'displayName'
  | 'departmentName'
  | 'roleKeys'
> & { redacted: true };

export type MemberDetail = MemberSummaryReadModel | MemberPeerSummary;

export function isMemberPeerSummary(detail: MemberDetail): detail is MemberPeerSummary {
  return 'redacted' in detail && detail.redacted === true;
}

/**
 * roleKeys mixes authority scopes (people.admin, commercial.team.read, ...) with
 * evidenced Cargo labels ("ASESOR DE VENTA"). Scope-like keys are identifiers
 * (dots / lowercase slugs); only label-like keys are display context.
 */
function isCargoLabelKey(key: string): boolean {
  return !key.includes('.') && !/^[a-z0-9_.-]+$/.test(key);
}

function toPeerSummary(row: MemberSummaryReadModel): MemberPeerSummary {
  return {
    memberId: row.memberId,
    organizationId: row.organizationId,
    givenName: row.givenName,
    familyName: row.familyName,
    displayName: row.displayName,
    departmentName: row.departmentName,
    roleKeys: row.roleKeys.filter(isCargoLabelKey),
    redacted: true,
  };
}

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

  /**
   * Full row for the member's own record and for people.admin (the same policy as
   * listMembers). Any other active member gets the display-only peer summary.
   */
  async getMember(ctx: QueryContext, memberId: string): Promise<MemberDetail> {
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

    if (row.memberId === ctx.auth.memberId || memberHasScope(ctx.auth, 'people.admin')) {
      return row;
    }
    return toPeerSummary(row);
  }
}

export function encodeMemberDirectoryCursor(familyName: string, memberId: string): string {
  return Buffer.from(JSON.stringify({ familyName, memberId }), 'utf8').toString('base64url');
}
