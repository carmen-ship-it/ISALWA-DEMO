import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import type { AuthIdentityRecord, MemberRecord } from '@isalwa/os-workforce';
import {
  authenticatedSessionHttpError,
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

describe('retired membership probe', () => {
  it('is not a production session attachment path', () => {
    const source = readFileSync(resolve('src/os-session.ts'), 'utf8');
    assert.doesNotMatch(source, /export async function resolveActiveMembership/);
    assert.doesNotMatch(source, /findActiveMemberForPerson\(/);
    assert.match(source, /resolveCanonicalRequestContext/);
    const view = toAuthenticatedSessionView({
      actorMemberId: member().id,
      organizationId: member().organizationId,
    });
    assert.deepEqual(Object.keys(view).sort(), ['accessStatus', 'memberId', 'organizationId']);
    assert.equal('personId' in view, false);
    assert.equal('authIdentityId' in view, false);
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
