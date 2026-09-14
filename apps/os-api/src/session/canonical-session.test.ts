import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { COMMERCIAL_TEAM_READ_SCOPE, PEOPLE_ADMIN_SCOPE } from '@isalwa/os-contracts';
import type { AuthIdentityRecord, MemberRecord, RoleAssignmentRecord } from '@isalwa/os-workforce';
import { resolveSession } from '../os-session';

const ORG = 'org-a';
const OTHER = 'org-b';
const PAST = new Date('2026-01-01T00:00:00.000Z');

function auth(overrides: Partial<AuthIdentityRecord> = {}): AuthIdentityRecord {
  return {
    id: 'auth-1',
    personId: 'person-1',
    provider: 'supabase',
    providerSubject: 'subject-1',
    email: 'isa@example.com',
    status: 'active',
    invitedAt: null,
    activatedAt: PAST,
    revokedAt: null,
    ...overrides,
  };
}

function member(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'mem-a',
    organizationId: ORG,
    personId: 'person-1',
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: null,
    employmentEndedAt: null,
    version: 1,
    ...overrides,
  };
}

function role(roleKey: string, overrides: Partial<RoleAssignmentRecord> = {}): RoleAssignmentRecord {
  return {
    id: `role-${roleKey}`,
    organizationId: ORG,
    memberId: 'mem-a',
    roleKey,
    effectiveAt: PAST,
    endedAt: null,
    ...overrides,
  };
}

function store(input: {
  identities?: AuthIdentityRecord[];
  members?: MemberRecord[];
  roles?: RoleAssignmentRecord[];
}) {
  return {
    async findAuthIdentityById(id: string) {
      return input.identities?.find((row) => row.id === id) ?? null;
    },
    async findAuthIdentityByProviderSubject(provider: string, providerSubject: string) {
      return (
        input.identities?.find(
          (row) => row.provider === provider && row.providerSubject === providerSubject,
        ) ?? null
      );
    },
    async listMembersForPerson(personId: string) {
      return (input.members ?? []).filter((row) => row.personId === personId);
    },
    async listRoleAssignmentsForMember(memberId: string) {
      return (input.roles ?? []).filter((row) => row.memberId === memberId);
    },
    async listDelegationsForDelegate() {
      return [];
    },
  };
}

function request(input: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
} = {}): Request & { authenticatedSession?: unknown } {
  const headers = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    query: {},
    body: input.body ?? {},
  } as Request & { authenticatedSession?: unknown };
}

function withDevAuth<T>(run: () => Promise<T>): Promise<T> {
  const previousAuthMode = process.env.OS_AUTH_MODE;
  const previousProfile = process.env.OS_RUNTIME_PROFILE;
  process.env.OS_AUTH_MODE = 'dev';
  process.env.OS_RUNTIME_PROFILE = 'development';
  return run().finally(() => {
    if (previousAuthMode === undefined) delete process.env.OS_AUTH_MODE;
    else process.env.OS_AUTH_MODE = previousAuthMode;
    if (previousProfile === undefined) delete process.env.OS_RUNTIME_PROFILE;
    else process.env.OS_RUNTIME_PROFILE = previousProfile;
  });
}

describe('resolveSession trusted attachment', { concurrency: false }, () => {
  it('attaches organization and stored scopes, ignoring the request body', async () => {
    const req = request({
      headers: {
        'x-os-auth-identity-id': 'auth-1',
        'x-os-person-id': 'person-1',
        'x-os-member-id': 'mem-spoof',
      },
      body: { grantedScopes: ['system.admin', PEOPLE_ADMIN_SCOPE], organizationId: OTHER },
    });
    const session = await withDevAuth(() =>
      resolveSession(
        req,
        store({
          identities: [auth()],
          members: [member()],
          roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
        }) as never,
      ),
    );
    assert.equal(session.organizationId, ORG);
    assert.equal(session.actorMemberId, 'mem-a');
    assert.deepEqual(session.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
    assert.equal(session.grantedScopes.includes('system.admin'), false);
    const attached = req.authenticatedSession as {
      authenticated?: boolean;
      organizationId?: string;
      grantedScopes?: string[];
    };
    assert.equal(attached.authenticated, true);
    assert.equal(attached.organizationId, ORG);
    assert.deepEqual(attached.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
  });

  it('does not attach a session when the header names a foreign tenant', async () => {
    const req = request({
      headers: {
        'x-os-auth-identity-id': 'auth-1',
        'x-os-person-id': 'person-1',
        'x-os-organization-id': OTHER,
      },
      body: { grantedScopes: ['system.admin'] },
    });
    req.authenticatedSession = {
      authenticated: true,
      organizationId: OTHER,
      grantedScopes: ['system.admin'],
    };
    await assert.rejects(
      () =>
        withDevAuth(() =>
          resolveSession(
            req,
            store({
              identities: [auth()],
              members: [member()],
              roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
            }) as never,
          ),
        ),
      /TENANT_FORBIDDEN|AUTH_REQUIRED/,
    );
    assert.equal(req.authenticatedSession, undefined);
  });

  it('fails closed for multiple memberships without a selector', async () => {
    await assert.rejects(
      () =>
        withDevAuth(() =>
          resolveSession(
            request({
              headers: {
                'x-os-auth-identity-id': 'auth-1',
                'x-os-person-id': 'person-1',
              },
              body: { organizationId: ORG, grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE] },
            }),
            store({
              identities: [auth()],
              members: [member(), member({ id: 'mem-b', organizationId: OTHER })],
              roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
            }) as never,
          ),
        ),
      /TENANT_FORBIDDEN/,
    );
  });
});
