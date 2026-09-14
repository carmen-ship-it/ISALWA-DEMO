import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { loadMemberAdminOptions } from '@/lib/workforce/admin-options';

describe('loadMemberAdminOptions', () => {
  it('derives departments and roles from member directory', async () => {
    const client = {
      listMembers: async () => ({
        items: [
          {
            memberId: 'm1',
            displayName: 'Ana',
            givenName: 'Ana',
            familyName: 'Q',
            accessStatus: 'active',
            roleKeys: ['sales_rep'],
            departmentId: 'd1',
            departmentName: 'Ventas',
          },
          {
            memberId: 'm2',
            displayName: 'Bob',
            givenName: 'Bob',
            familyName: 'R',
            accessStatus: 'active',
            roleKeys: ['people.admin'],
            departmentId: 'd2',
            departmentName: 'Admin',
          },
        ],
        meta: { nextCursor: null, limit: 100, hasMore: false },
      }),
    } as unknown as OsApiClient;

    const options = await loadMemberAdminOptions(client, 'm1');
    assert.deepEqual(options.departments, [
      { value: 'd2', label: 'Admin' },
      { value: 'd1', label: 'Ventas' },
    ]);
    assert.deepEqual(options.roles, [
      { value: 'people.admin', label: 'Administración de personas' },
      { value: 'sales_rep', label: 'Ventas' },
    ]);
  });
});
