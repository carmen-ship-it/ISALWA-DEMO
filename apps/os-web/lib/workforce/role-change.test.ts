import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readRevokeAdditionalRoleKeys } from './role-change';

describe('readRevokeAdditionalRoleKeys', () => {
  it('sends nothing for revocation unless boxes are checked', () => {
    const form = new FormData();
    form.set('memberId', 'm1');
    form.set('roleKey', 'sales_manager');
    assert.deepEqual(readRevokeAdditionalRoleKeys(form), []);
  });

  it('returns only the checked keys, trimmed, de-duplicated and sorted', () => {
    const form = new FormData();
    form.append('revokeAdditionalRoleKeys', 'commercial.team.read');
    form.append('revokeAdditionalRoleKeys', ' commercial.customer.edit ');
    form.append('revokeAdditionalRoleKeys', 'commercial.team.read');
    form.append('revokeAdditionalRoleKeys', '');
    assert.deepEqual(readRevokeAdditionalRoleKeys(form), ['commercial.customer.edit', 'commercial.team.read']);
  });
});
