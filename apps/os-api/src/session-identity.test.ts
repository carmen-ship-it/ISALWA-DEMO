import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import type { AuthIdentityRecord, MemberRecord } from '@isalwa/os-workforce';
import {
  authenticatedSessionHttpError,
  resolveActiveMembership,
  toAuthenticatedSessionView,
} from './os-session';

function auth(overrides: Partial<AuthIdentityRecord> = {}): AuthIdentityRecord {
  return {
    id: 'auth-1',
    personId: 'person-1',
    provider: 'supabase',
    providerSubject: 'supabase-user-1',
    email: 'isa@example.com',
    status: 'active',
    invitedAt: null,
    activatedAt: new Date('2026-01-01T00:00:00.000Z'),
    revokedAt: null,
    ...overrides,
  };
}

function member(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'mem-hosted',
    organizationId: 'org-1',
    personId: 'person-1',
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: null,
    employmentEndedAt: null,
    version: 1,
    ...overrides,
  };
}

function store(input: {
  identities?: AuthIdentityRecord[];
  members?: MemberRecord[];
}) {
  return {
    async findAuthIdentityByProviderSubject(provider: string, providerSubject: string) {
      return (
        input.identities?.find(
          (row) => row.provider === provider && row.providerSubject === providerSubject,
        ) ?? null
      );
    },
    async findActiveMemberForPerson(personId: string, organizationId?: string) {
      const matches = (input.members ?? []).filter(
        (row) =>
          row.personId === personId &&
          row.accessStatus === 'active' &&
          (organizationId ? row.organizationId === organizationId : true),
      );
      return matches[0] ?? null;
    },
  };
}

describe('CC-2A hosted session membership', () => {
  it('resolves memberId from AuthIdentity to the active OrganizationMember', async () => {
    const resolved = await resolveActiveMembership(
      store({ identities: [auth()], members: [member()] }),
      { provider: 'supabase', providerSubject: 'supabase-user-1' },
    );
    assert.equal(resolved.memberId, 'mem-hosted');
    assert.equal(resolved.organizationId, 'org-1');
    assert.equal(resolved.accessStatus, 'active');
    const view = toAuthenticatedSessionView({
      actorMemberId: resolved.memberId,
      organizationId: resolved.organizationId,
    });
    assert.deepEqual(Object.keys(view).sort(), ['accessStatus', 'memberId', 'organizationId']);
    assert.equal('personId' in view, false);
    assert.equal('authIdentityId' in view, false);
  });

  it('ignores a caller-supplied member id and organization', async () => {
    const resolved = await resolveActiveMembership(
      store({ identities: [auth()], members: [member()] }),
      {
        provider: 'supabase',
        providerSubject: 'supabase-user-1',
        organizationHint: 'org-1',
      },
    );
    assert.equal(resolved.memberId, 'mem-hosted');
    assert.notEqual(resolved.memberId, 'mem-attacker');
    assert.equal(resolved.organizationId, 'org-1');
  });

  it('rejects a missing AuthIdentity', async () => {
    await assert.rejects(
      () =>
        resolveActiveMembership(store({ identities: [], members: [member()] }), {
          provider: 'supabase',
          providerSubject: 'missing-user',
        }),
      /AUTH_REQUIRED/,
    );
  });

  it('rejects a missing or inactive member', async () => {
    await assert.rejects(
      () =>
        resolveActiveMembership(store({ identities: [auth()], members: [] }), {
          provider: 'supabase',
          providerSubject: 'supabase-user-1',
        }),
      /ACCESS_REVOKED/,
    );
    await assert.rejects(
      () =>
        resolveActiveMembership(
          store({
            identities: [auth()],
            members: [member({ accessStatus: 'suspended', id: 'mem-suspended' })],
          }),
          { provider: 'supabase', providerSubject: 'supabase-user-1' },
        ),
      /ACCESS_REVOKED/,
    );
  });

  it('rejects a cross-tenant organization hint', async () => {
    await assert.rejects(
      () =>
        resolveActiveMembership(store({ identities: [auth()], members: [member()] }), {
          provider: 'supabase',
          providerSubject: 'supabase-user-1',
          organizationHint: 'org-other',
        }),
      /ACCESS_REVOKED/,
    );
  });

  it('rejects a membership returned from another organization', async () => {
    const leaking = {
      async findAuthIdentityByProviderSubject() {
        return auth();
      },
      async findActiveMemberForPerson() {
        return member({ organizationId: 'org-other', id: 'mem-other' });
      },
    };
    await assert.rejects(
      () =>
        resolveActiveMembership(leaking, {
          provider: 'supabase',
          providerSubject: 'supabase-user-1',
          organizationHint: 'org-1',
        }),
      /TENANT_FORBIDDEN/,
    );
  });
});

describe('CC-2A session HTTP errors', () => {
  it('maps expected auth states to 401/403 and hides store errors', () => {
    assert.deepEqual(authenticatedSessionHttpError(new Error('AUTH_REQUIRED')), {
      status: 401,
      body: { code: 'AUTH_REQUIRED' },
    });
    assert.deepEqual(authenticatedSessionHttpError(new Error('ACCESS_REVOKED')), {
      status: 403,
      body: { code: 'ACCESS_REVOKED' },
    });
    assert.deepEqual(authenticatedSessionHttpError(new Error('TENANT_FORBIDDEN')), {
      status: 403,
      body: { code: 'TENANT_FORBIDDEN' },
    });
    assert.deepEqual(
      authenticatedSessionHttpError(new Error('Invalid prisma.osOrganizationMember.findMany()')),
      { status: 500, body: { code: 'INTERNAL_ERROR' } },
    );
  });

  it('does not read caller member or organization from the session controller', () => {
    const source = readFileSync(resolve('src/session.controller.ts'), 'utf8');
    assert.match(source, /resolveSession/);
    assert.match(source, /toAuthenticatedSessionView/);
    assert.doesNotMatch(source, /req\.query/);
    assert.doesNotMatch(source, /req\.body/);
    assert.doesNotMatch(source, /header\('x-os-member-id'\)/);
  });
});
