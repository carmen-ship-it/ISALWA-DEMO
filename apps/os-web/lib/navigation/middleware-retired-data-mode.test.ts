/**
 * The removed sample-data mode cannot be reactivated through the URL or old
 * cookies (REUSE_MAP 11.0 owner acceptance 2).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { encodeDevSession } from '@/lib/auth/dev-session';
import { OS_DEV_SESSION_COOKIE } from '@/lib/auth/constants';
import { RETIRED_DATA_MODE_COOKIES } from './retired-data-mode';

const SESSION = encodeDevSession({
  organizationId: 'org-member-own',
  memberId: 'member-1',
  personId: 'person-1',
  authIdentityId: 'auth-1',
});

let middleware: (request: NextRequest) => Promise<Response>;

before(async () => {
  process.env.NEXT_PUBLIC_OS_AUTH_MODE = 'dev';
  ({ middleware } = await import('@/middleware'));
});

function request(path: string, cookies: Record<string, string> = {}): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest(new URL(path, 'http://localhost:3220'), {
    headers: cookie ? { cookie } : {},
  });
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function assertNoDataModeState(response: Response): void {
  for (const line of setCookies(response)) {
    assert.doesNotMatch(line, /^isalwa-demo-data-mode=(demo|real)/, line);
    assert.doesNotMatch(line, /^isalwa-owner-effective-company=[^;]/, line);
  }
  for (const [name] of response.headers) {
    assert.doesNotMatch(name, /x-isalwa-data-mode/, `request header ${name} must not be pinned`);
  }
  const location = response.headers.get('location') ?? '';
  assert.doesNotMatch(location, /datos=/);
}

describe('middleware ignores the retired data mode', () => {
  // Ensure evaluation walkthrough env cannot leak into these product-path tests.
  const prevProfile = process.env.OS_RUNTIME_PROFILE;
  const prevFlag = process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
  before(() => {
    delete process.env.OS_RUNTIME_PROFILE;
    delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
  });
  after(() => {
    if (prevProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
    else process.env.OS_RUNTIME_PROFILE = prevProfile;
    if (prevFlag === undefined) delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
    else process.env.OS_EVALUATION_WALKTHROUGH_ONLY = prevFlag;
  });

  for (const path of ['/inicio?datos=demo', '/inicio?datos=demo&story=1', '/clientes?datos=real']) {
    it(`${path} sets no mode cookie and pins no mode header`, async () => {
      const response = await middleware(request(path, { [OS_DEV_SESSION_COOKIE]: SESSION }));
      assert.equal(response.status, 200);
      assertNoDataModeState(response);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    });
  }

  it('expires stale mode and company cookies instead of honouring them', async () => {
    const response = await middleware(
      request('/clientes', {
        [OS_DEV_SESSION_COOKIE]: SESSION,
        'isalwa-demo-data-mode': 'demo',
        'isalwa-owner-effective-company': 'synth',
      }),
    );
    assert.equal(response.status, 200);
    const lines = setCookies(response);
    for (const name of RETIRED_DATA_MODE_COOKIES) {
      const line = lines.find((entry) => entry.startsWith(`${name}=`));
      assert.ok(line, `${name} is expired`);
      assert.match(line, new RegExp(`^${name}=;`));
      assert.match(line, /Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    }
    assertNoDataModeState(response);
  });

  it('does not touch cookies the browser does not have', async () => {
    const response = await middleware(request('/inicio', { [OS_DEV_SESSION_COOKIE]: SESSION }));
    for (const name of RETIRED_DATA_MODE_COOKIES) {
      assert.equal(setCookies(response).some((line) => line.startsWith(`${name}=`)), false);
    }
  });

  it('an unauthenticated ?datos=demo still goes to login without a session or a mode', async () => {
    const response = await middleware(request('/inicio?datos=demo', { 'isalwa-demo-data-mode': 'demo' }));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location') ?? '');
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), '/inicio');
    assertNoDataModeState(response);
  });
});
