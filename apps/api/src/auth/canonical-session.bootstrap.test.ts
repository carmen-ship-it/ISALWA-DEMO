import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { sessionFromAuthenticatedRequest } from './trusted-session';
import {
  CanonicalSessionMiddleware,
  applyCanonicalSessionMiddleware,
  attachResolvedCanonicalSession,
  type CanonicalSessionStore,
} from './canonical-session.middleware';

const ORG = 'org-proven';
const PAST = new Date('2026-01-01T00:00:00.000Z');

function request() {
  return {
    header(name: string) {
      if (name === 'x-os-organization-id') return ORG;
      if (name === 'x-os-auth-identity-id') return 'auth-1';
      if (name === 'x-os-person-id') return 'person-1';
      return undefined;
    },
    query: { organizationId: 'org-query' },
    body: { organizationId: 'org-body', grantedScopes: ['system.admin'], cargo: 'Gerente' },
    authenticatedSession: {
      authenticated: true,
      organizationId: 'org-injected',
      grantedScopes: ['people.admin'],
    },
  };
}

function store(): CanonicalSessionStore {
  return {
    async findAuthIdentityById() {
      return {
        id: 'auth-1',
        personId: 'person-1',
        provider: 'local',
        providerSubject: 'subject-1',
        status: 'active',
      };
    },
    async findAuthIdentityByProviderSubject() {
      return {
        id: 'auth-1',
        personId: 'person-1',
        provider: 'local',
        providerSubject: 'subject-1',
        status: 'active',
      };
    },
    async listMembersForPerson() {
      return [{
        id: 'mem-1',
        organizationId: ORG,
        personId: 'person-1',
        accessStatus: 'active',
        employmentStatus: 'active',
      }];
    },
    async listRoleAssignmentsForMember() {
      return [{
        memberId: 'mem-1',
        organizationId: ORG,
        roleKey: 'commercial.team.read',
        effectiveAt: PAST,
        endedAt: null,
      }];
    },
    async listDelegationsForDelegate() {
      return [];
    },
  };
}

describe('apps/api canonical session bootstrap', () => {
  it('registers CanonicalSessionMiddleware on the module Nest bootstrap loads', () => {
    const applied: unknown[] = [];
    applyCanonicalSessionMiddleware({
      apply(...handlers: unknown[]) {
        applied.push(...handlers);
        return { forRoutes() { return this; } };
      },
    });
    assert.deepEqual(applied, [CanonicalSessionMiddleware]);
    const moduleSource = readFileSync(new URL('../app.module.ts', import.meta.url), 'utf8');
    assert.match(moduleSource, /applyCanonicalSessionMiddleware\(consumer\)/);
    const main = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
    assert.match(main, /NestFactory\.create\(AppModule/);
    assert.match(moduleSource, /canonical-session\.store/);
    assert.doesNotMatch(moduleSource, /trustedSessionMiddleware/);
  });

  it('middleware result reaches a controller without client tenant or scope authority', async () => {
    const previous = process.env.OS_AUTH_MODE;
    process.env.OS_AUTH_MODE = 'dev';
    const req = request();
    await new CanonicalSessionMiddleware(store()).use(req, {}, () => undefined);
    const session = sessionFromAuthenticatedRequest(req);
    assert.equal(session?.organizationId, ORG);
    assert.deepEqual(session?.grantedScopes, ['commercial.team.read']);

    const controllerSession = sessionFromAuthenticatedRequest(req);
    assert.equal(controllerSession?.organizationId, ORG);
    assert.deepEqual(controllerSession?.grantedScopes, ['commercial.team.read']);

    const foreign = request();
    foreign.header = (name: string) => {
      if (name === 'x-os-organization-id') return 'org-invented';
      if (name === 'x-os-auth-identity-id') return 'auth-1';
      if (name === 'x-os-person-id') return 'person-1';
      return undefined;
    };
    await attachResolvedCanonicalSession(foreign, store());
    assert.equal(sessionFromAuthenticatedRequest(foreign), null);
    process.env.OS_AUTH_MODE = previous;
  });

  it('clears a stronger injected session when identity is not proven', async () => {
    const previous = process.env.OS_AUTH_MODE;
    process.env.OS_AUTH_MODE = 'dev';
    const req = request();
    req.header = () => undefined;
    await attachResolvedCanonicalSession(req, store());
    assert.equal(sessionFromAuthenticatedRequest(req), null);
    process.env.OS_AUTH_MODE = previous;
  });
});
