import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  readControllerTrustedSession,
  sessionFromAuthenticatedRequest,
  trustedSessionMiddleware,
  type AuthenticatedTenantRequest,
  type TrustedSessionSource,
} from './trusted-session';

const STORED = 'commercial.team.read';
const CLIENT = 'system.admin';
const STRONGER = 'people.admin';

function controllerRequest(): AuthenticatedTenantRequest & {
  authenticatedSession?: unknown;
  body?: { grantedScopes?: string[]; organizationId?: string };
} {
  return {
    authenticatedSession: {
      authenticated: true,
      organizationId: 'org-injected',
      grantedScopes: [STRONGER, CLIENT],
    },
    query: { organizationId: 'org-query' },
    body: { organizationId: 'org-body', grantedScopes: [CLIENT, STRONGER] },
  };
}

describe('apps/api trusted session attachment', () => {
  it('gives a controller-style request scopes only from the resolver helper', async () => {
    const req = controllerRequest();
    const resolve = async (): Promise<TrustedSessionSource> => ({
      organizationId: 'org-proven',
      grantedScopes: [STORED],
    });

    const session = await readControllerTrustedSession(req, resolve);
    assert.equal(session?.organizationId, 'org-proven');
    assert.deepEqual(session?.grantedScopes, [STORED]);
    assert.equal(session?.grantedScopes.includes(CLIENT), false);
    assert.equal(session?.grantedScopes.includes(STRONGER), false);
    assert.deepEqual(sessionFromAuthenticatedRequest(req)?.grantedScopes, [STORED]);
  });

  it('does not keep a stronger injected session when the resolver denies', async () => {
    const req = controllerRequest();
    const session = await readControllerTrustedSession(req, async () => null);
    assert.equal(session, null);
    assert.equal(sessionFromAuthenticatedRequest(req), null);
    assert.equal(req.authenticatedSession, undefined);
  });

  it('middleware uses the same helper and does not read body scopes', async () => {
    const req = controllerRequest();
    const middleware = trustedSessionMiddleware(async () => ({
      organizationId: 'org-proven',
      grantedScopes: [STORED],
    }));
    let continued = false;
    await middleware(req, {}, () => {
      continued = true;
    });
    assert.equal(continued, true);
    assert.deepEqual(sessionFromAuthenticatedRequest(req)?.grantedScopes, [STORED]);
    const source = readFileSync(new URL('./trusted-session.ts', import.meta.url), 'utf8');
    const helperStart = source.indexOf('export function attachTrustedTenantSession');
    const helperEnd = source.indexOf('export async function readControllerTrustedSession', helperStart);
    const helper = source.slice(helperStart, helperEnd);
    assert.doesNotMatch(helper, /req\.body/);
    assert.doesNotMatch(helper, /req\.query/);
    assert.match(helper, /writeAttachedSession/);
    assert.match(source, /readControllerTrustedSession/);
  });
});
