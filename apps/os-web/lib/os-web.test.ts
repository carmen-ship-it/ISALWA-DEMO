import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeDevSession,
  devSessionHeaders,
  encodeDevSession,
} from './auth/dev-session';
import { filterNavByAccess, isNavItemDisabled, PRIMARY_NAV } from './navigation/nav-config';
import { parseOsApiError } from './api/os-api-errors';

describe('dev session codec', () => {
  it('round-trips dev session payload', () => {
    const session = {
      organizationId: 'org-1',
      memberId: 'mem-1',
      personId: 'per-1',
      authIdentityId: 'auth-1',
      displayLabel: 'Admin',
    };
    const encoded = encodeDevSession(session);
    assert.deepEqual(decodeDevSession(encoded), session);
  });

  it('maps dev session to os-api headers', () => {
    const headers = devSessionHeaders({
      organizationId: 'org-1',
      memberId: 'mem-1',
      personId: 'per-1',
      authIdentityId: 'auth-1',
    });
    assert.equal(headers['x-os-member-id'], 'mem-1');
  });
});

describe('navigation access', () => {
  it('hides administracion without admin probe', () => {
    const items = filterNavByAccess(PRIMARY_NAV, { showAdmin: false });
    assert.equal(
      items.some((item) => item.id === 'administracion'),
      false,
    );
  });

  it('marks locked nav items as disabled', () => {
    assert.equal(isNavItemDisabled({ ...PRIMARY_NAV[0], state: 'locked' }), true);
    assert.equal(isNavItemDisabled(PRIMARY_NAV[0]), false);
  });
});

describe('os api error parsing', () => {
  it('maps os-api code payloads to spanish errors', async () => {
    const response = new Response(JSON.stringify({ code: 'AUTH_REQUIRED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    const err = await parseOsApiError(response);
    assert.equal(err.kind, 'unauthorized');
    assert.match(err.message, /sesión/i);
  });

  it('maps ACCESS_REVOKED to forbidden account message', async () => {
    const response = new Response(JSON.stringify({ code: 'ACCESS_REVOKED' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
    const err = await parseOsApiError(response);
    assert.equal(err.kind, 'forbidden');
    assert.match(err.message, /desactivada/i);
  });
});
