/**
 * Executable middleware redirects/denials for evaluation walkthrough mode.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { encodeDevSession } from '@/lib/auth/dev-session';
import { OS_DEV_SESSION_COOKIE } from '@/lib/auth/constants';

const SESSION = encodeDevSession({
  organizationId: 'org-member-own',
  memberId: 'member-1',
  personId: 'person-1',
  authIdentityId: 'auth-1',
});

let middleware: (request: NextRequest) => Promise<Response>;

const prev = {
  profile: process.env.OS_RUNTIME_PROFILE,
  publicProfile: process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE,
  flag: process.env.OS_EVALUATION_WALKTHROUGH_ONLY,
  auth: process.env.NEXT_PUBLIC_OS_AUTH_MODE,
  allow: process.env.ISALWA_EVALUATOR_EMAILS,
};

before(async () => {
  process.env.OS_RUNTIME_PROFILE = 'evaluation';
  delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
  delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
  process.env.NEXT_PUBLIC_OS_AUTH_MODE = 'dev';
  // Dev sessions have no email → allowlist never matches → denegado for authenticated.
  delete process.env.ISALWA_EVALUATOR_EMAILS;
  ({ middleware } = await import('@/middleware'));
});

after(() => {
  if (prev.profile === undefined) delete process.env.OS_RUNTIME_PROFILE;
  else process.env.OS_RUNTIME_PROFILE = prev.profile;
  if (prev.publicProfile === undefined) delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
  else process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE = prev.publicProfile;
  if (prev.flag === undefined) delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
  else process.env.OS_EVALUATION_WALKTHROUGH_ONLY = prev.flag;
  if (prev.auth === undefined) delete process.env.NEXT_PUBLIC_OS_AUTH_MODE;
  else process.env.NEXT_PUBLIC_OS_AUTH_MODE = prev.auth;
  if (prev.allow === undefined) delete process.env.ISALWA_EVALUATOR_EMAILS;
  else process.env.ISALWA_EVALUATOR_EMAILS = prev.allow;
});

function request(
  path: string,
  init: { method?: string; cookies?: Record<string, string> } = {},
): NextRequest {
  const cookie = Object.entries(init.cookies ?? {})
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest(new URL(path, 'http://localhost:3220'), {
    method: init.method ?? 'GET',
    headers: cookie ? { cookie } : undefined,
  });
}

describe('evaluation middleware integration', () => {
  function ensureEvaluationEnv() {
    process.env.OS_RUNTIME_PROFILE = 'evaluation';
    delete process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE;
    delete process.env.OS_EVALUATION_WALKTHROUGH_ONLY;
    process.env.NEXT_PUBLIC_OS_AUTH_MODE = 'dev';
  }

  it('unauthenticated GET /evaluacion redirects to /login without ?next=', async () => {
    ensureEvaluationEnv();
    const response = await middleware(request('/evaluacion'));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location') ?? '', 'http://localhost:3220');
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), null);
  });

  it('unauthenticated GET /clientes redirects to /login without ?next=', async () => {
    ensureEvaluationEnv();
    const response = await middleware(request('/clientes'));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location') ?? '', 'http://localhost:3220');
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), null);
  });

  it('POST /evaluacion returns 405 with no redirect', async () => {
    ensureEvaluationEnv();
    const response = await middleware(
      request('/evaluacion', { method: 'POST', cookies: { [OS_DEV_SESSION_COOKIE]: SESSION } }),
    );
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('allow') ?? '', /GET/);
  });

  it('POST /clientes returns 405 with no redirect (no action replay)', async () => {
    ensureEvaluationEnv();
    const response = await middleware(
      request('/clientes', { method: 'POST', cookies: { [OS_DEV_SESSION_COOKIE]: SESSION } }),
    );
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('location'), null);
  });

  it('GET /clientes.json is gated (not treated as static) and redirects for authenticated', async () => {
    ensureEvaluationEnv();
    const response = await middleware(
      request('/clientes.json', { cookies: { [OS_DEV_SESSION_COOKIE]: SESSION } }),
    );
    // Dev session has no email → not on allowlist → denegado
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location') ?? '', 'http://localhost:3220');
    assert.equal(location.pathname, '/evaluacion/denegado');
  });

  it('POST /login remains allowed (auth mutation path)', async () => {
    ensureEvaluationEnv();
    const response = await middleware(request('/login', { method: 'POST' }));
    assert.notEqual(response.status, 405);
  });

  it('POST /auth/sign-out remains allowed', async () => {
    ensureEvaluationEnv();
    const response = await middleware(
      request('/auth/sign-out', { method: 'POST', cookies: { [OS_DEV_SESSION_COOKIE]: SESSION } }),
    );
    assert.notEqual(response.status, 405);
  });
});
