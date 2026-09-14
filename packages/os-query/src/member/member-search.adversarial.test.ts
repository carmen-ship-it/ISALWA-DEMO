import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemberQueryService } from './member-query-service';
import type { MemberQueryStorePort } from './member-query-store-port';
import type { QueryContext } from '../query-context';

const ORG = 'org-a';
const FOREIGN = 'org-b';
const AS_OF = new Date('2026-09-14T15:00:00.000Z');

function ctx(
  memberId: string,
  roleKeys: string[],
  organizationId = ORG,
  accessStatus: 'active' | 'suspended' = 'active',
): QueryContext {
  return {
    organizationId,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: AS_OF,
    auth: {
      memberId,
      organizationId,
      accessStatus,
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function store(): MemberQueryStorePort & {
  calls: Array<{ organizationId: string; q: string; limit: number }>;
} {
  const calls: Array<{ organizationId: string; q: string; limit: number }> = [];
  return {
    calls,
    async listMembers(organizationId, query) {
      if (organizationId !== ORG) return { items: [], hasMore: false };
      return {
        items: [],
        hasMore: false,
      };
    },
    async searchActiveMembers(organizationId, query) {
      calls.push({ organizationId, q: query.q, limit: query.limit });
      if (organizationId !== ORG) return { items: [], hasMore: false };
      return {
        items: [{ memberId: 'mem-ana', displayName: 'Ana Quispe' }],
        hasMore: false,
      };
    },
    async getMemberSummary() {
      return null;
    },
    async listCapabilityStateOverrides() {
      return [];
    },
    async listDirectReportMemberIds() {
      return [];
    },
  };
}

describe('searchActiveMembers', () => {
  it('searches only inside the session organization before limit', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });

    const result = await service.searchActiveMembers(ctx('mem-1', ['sales_rep']), { q: 'ana' });
    assert.equal(result.items[0]?.displayName, 'Ana Quispe');
    assert.equal(port.calls[0]?.organizationId, ORG);
    assert.equal(port.calls[0]?.q, 'ana');
    assert.ok((port.calls[0]?.limit ?? 0) <= 50);
  });

  it('returns empty for short queries and does not call the store', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });
    const empty = await service.searchActiveMembers(ctx('mem-1', ['sales_rep']), { q: 'a' });
    assert.deepEqual(empty.items, []);
    assert.equal(port.calls.length, 0);
  });

  it('denies suspended members and returns no foreign-org evidence', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });

    await assert.rejects(
      () => service.searchActiveMembers(ctx('mem-1', ['sales_rep'], ORG, 'suspended'), { q: 'ana' }),
      /ACCESS|ACTIVE|MEMBER/i,
    );

    const foreign = await service.searchActiveMembers(ctx('mem-1', ['sales_rep'], FOREIGN), {
      q: 'ana',
    });
    assert.deepEqual(foreign.items, []);
    assert.equal(port.calls[0]?.organizationId, FOREIGN);
  });

  it('keeps people.admin directory search capability-gated', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });
    await assert.rejects(
      () => service.listMembers(ctx('mem-1', ['sales_rep']), { q: 'ana', limit: 20 }),
      /PERMISSION_DENIED/,
    );
    const admin = await service.listMembers(ctx('mem-admin', ['people.admin']), {
      q: 'ana',
      limit: 20,
    });
    assert.deepEqual(admin.items, []);
  });

  it('denies revoked access before any search and does not call the store', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });
    await assert.rejects(
      () =>
        service.searchActiveMembers(ctx('mem-1', ['sales_rep'], ORG, 'suspended'), {
          q: 'ana',
        }),
      /ACCESS|ACTIVE|MEMBER/i,
    );
    assert.equal(port.calls.length, 0);
  });

  it('returns empty for blank query without store evidence', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });
    const blank = await service.searchActiveMembers(ctx('mem-1', ['sales_rep']), { q: '   ' });
    assert.deepEqual(blank, { items: [], hasMore: false });
    assert.equal(port.calls.length, 0);
  });

  it('caps limit to 50 and always scopes search to the session organization', async () => {
    const port = store();
    const service = new MemberQueryService({
      store: port,
      encodeCursor: () => 'cursor',
    });
    await service.searchActiveMembers(ctx('mem-1', ['sales_rep']), { q: 'ana', limit: 999 });
    assert.equal(port.calls[0]?.organizationId, ORG);
    assert.equal(port.calls[0]?.limit, 50);
  });
});
