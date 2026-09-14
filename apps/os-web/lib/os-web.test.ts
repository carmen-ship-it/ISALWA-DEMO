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

  it('includes commercial list routes in primary nav', () => {
    assert.equal(
      PRIMARY_NAV.some((item) => item.href === '/oportunidades'),
      true,
    );
    assert.equal(
      PRIMARY_NAV.some((item) => item.href === '/cotizaciones'),
      true,
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

  it('hides a technical envelope message and keeps requestId', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Unauthorized',
          requestId: 'req-keep-1',
        },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
    const err = await parseOsApiError(response);
    assert.equal(err.kind, 'unauthorized');
    assert.equal(err.code, 'AUTH_REQUIRED');
    assert.equal(err.status, 401);
    assert.equal(err.requestId, 'req-keep-1');
    assert.match(err.message, /sesión/i);
    assert.doesNotMatch(err.message, /Unauthorized|req-keep-1/);
  });

  it('prefers Spanish when the envelope message is a provider exception', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'PrismaClientKnownRequestError: SELECT * FROM quotes WHERE id = $1',
          requestId: 'req-keep-2',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
    const err = await parseOsApiError(response);
    assert.equal(err.requestId, 'req-keep-2');
    assert.match(err.message, /Revise los datos/i);
    assert.doesNotMatch(err.message, /Prisma|SELECT|req-keep-2/);
  });
});
