import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRevokeAdditionalRoleKeys, roleChangeRefusalMessage } from './role-change';

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

describe('role-change preview refusals (22:29 decision 4)', () => {
  it('explains each refusal in Spanish and falls back to a neutral message', () => {
    assert.match(roleChangeRefusalMessage('scope_not_held'), /su propio rol/);
    assert.match(roleChangeRefusalMessage('commercial_scope_not_primary'), /permiso adicional/);
    assert.match(roleChangeRefusalMessage('reach_beyond_grantor'), /alcance comercial mayor/);
    assert.equal(roleChangeRefusalMessage('unknown_code'), 'Este cambio no está permitido.');
  });

  it('the form shows the refusal and enables confirmation only for an allowed plan', () => {
    const form = readFileSync(join(process.cwd(), 'components/admin/role-change-form.tsx'), 'utf8');
    assert.match(form, /data-role-change-refusal/);
    assert.match(form, /preview\.allowed \? preview : null/);
    assert.match(form, /disabled=\{plan === null\}/);
  });
});
