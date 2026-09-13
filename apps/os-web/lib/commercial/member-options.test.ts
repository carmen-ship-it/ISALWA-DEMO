import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadMemberOptionsForAdmin } from '@/lib/commercial/member-options';
import type { OsApiClient } from '@/lib/api/os-api-client';

function mockClient(items: Array<{ memberId: string; displayName: string; givenName: string; familyName: string }>) {
  let listQuery: Record<string, string | number | boolean> | undefined;
  const client = {
    probeAdminAccess: async () => true,
    listMembers: async (query?: Record<string, string | number | boolean>) => {
      listQuery = query;
      return { items, meta: { nextCursor: null, limit: 50, hasMore: false } };
    },
  } as unknown as OsApiClient;
  return { client, getQuery: () => listQuery };
}

describe('loadMemberOptionsForAdmin', () => {
  it('requests active members only for owner assignment', async () => {
    const { client, getQuery } = mockClient([
      {
        memberId: 'mem-admin',
        displayName: 'Step17 Admin',
        givenName: 'Step17',
        familyName: 'Admin',
      },
    ]);

    const options = await loadMemberOptionsForAdmin(client);

    assert.equal(getQuery()?.accessStatus, 'active');
    assert.deepEqual(options, [{ memberId: 'mem-admin', label: 'Step17 Admin' }]);
  });

  it('returns empty list when admin access is denied', async () => {
    const client = {
      probeAdminAccess: async () => false,
      listMembers: async () => {
        throw new Error('should not list members');
      },
    } as unknown as OsApiClient;

    assert.deepEqual(await loadMemberOptionsForAdmin(client), []);
  });
});
