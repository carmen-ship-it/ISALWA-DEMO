import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import {
  COMMERCIAL_TEAM_READ_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
} from '@isalwa/os-contracts';
import type { AuthIdentityRecord, DelegationRecord, MemberRecord, RoleAssignmentRecord } from '@isalwa/os-workforce';
import { loadTrustedMemberContextFromRequest } from './trusted-member-context';

const ORG = 'org-a';
const FOREIGN = 'org-b';
const PAST = new Date('2026-01-01T00:00:00.000Z');

const NOT_IMPLIED = [
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
];

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
  delegations?: DelegationRecord[];
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
    async listDelegationsForDelegate(memberId: string) {
      return (input.delegations ?? []).filter((row) => row.delegateMemberId === memberId);
    },
  };
}

function request(input: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Request {
  const headers = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    query: input.query ?? {},
    body: input.body ?? {},
  } as Request;
}

function functionSource(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, name);
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
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

function devRequest(overrides: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
} = {}) {
  return request({
    headers: {
      'x-os-auth-identity-id': 'auth-1',
      'x-os-person-id': 'person-1',
      'x-os-member-id': 'mem-spoof',
      ...overrides.headers,
    },
    query: { organizationId: FOREIGN, ...overrides.query },
    body: {
      organizationId: FOREIGN,
      grantedScopes: ['system.admin', ...NOT_IMPLIED],
      cargo: 'Gerencia',
      title: 'Encargado de Almacén',
      ...overrides.body,
    },
  });
}

describe('loadTrustedMemberContextFromRequest', { concurrency: false }, () => {
  it('ignores client organizationId, member id, and scopes', async () => {
    const result = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({
        identities: [auth()],
        members: [
          member(),
          member({ id: 'mem-spoof', personId: 'person-other', organizationId: FOREIGN }),
        ],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
    ));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.context.memberId, 'mem-a');
    assert.equal(result.context.organizationId, ORG);
    assert.deepEqual(result.context.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
  });

  it('denies a suspended member even when the client claims active scopes', async () => {
    const result = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({
        identities: [auth()],
        members: [member({ accessStatus: 'suspended' })],
        roles: [role(PEOPLE_ADMIN_SCOPE)],
      }),
    ));
    assert.deepEqual(result, { ok: false, denial: 'MEMBER_INACTIVE' });
  });

  it('does not select a foreign tenant named by the header or the client', async () => {
    const backing = store({
      identities: [auth()],
      members: [
        member(),
        member({ id: 'mem-foreign', personId: 'person-other', organizationId: FOREIGN }),
      ],
      roles: [
        role(COMMERCIAL_TEAM_READ_SCOPE),
        role(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE, {
          id: 'role-foreign',
          memberId: 'mem-foreign',
          organizationId: FOREIGN,
        }),
      ],
    });

    const headerDenied = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest({ headers: { 'x-os-member-id': 'mem-foreign', 'x-os-organization-id': FOREIGN } }),
      backing,
    ));
    assert.equal(headerDenied.ok, false);
    if (headerDenied.ok) return;
    assert.equal(headerDenied.denial === 'TENANT_FORBIDDEN' || headerDenied.denial === 'AUTH_REQUIRED', true);
    assert.equal('context' in headerDenied, false);

    const clientIgnored = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest({ headers: { 'x-os-member-id': 'mem-foreign' } }),
      backing,
    ));
    assert.equal(clientIgnored.ok, true);
    if (!clientIgnored.ok) return;
    assert.equal(clientIgnored.context.memberId, 'mem-a');
    assert.equal(clientIgnored.context.organizationId, ORG);
    assert.notEqual(clientIgnored.context.organizationId, FOREIGN);
    assert.equal(
      clientIgnored.context.grantedScopes.includes(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE),
      false,
    );
  });

  it('fails closed when several active memberships have no selector', async () => {
    const result = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({
        identities: [auth()],
        members: [
          member(),
          member({ id: 'mem-b', organizationId: FOREIGN }),
        ],
        roles: [
          role(COMMERCIAL_TEAM_READ_SCOPE),
          role(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE, {
            id: 'role-b',
            memberId: 'mem-b',
            organizationId: FOREIGN,
          }),
        ],
      }),
    ));
    assert.deepEqual(result, { ok: false, denial: 'TENANT_FORBIDDEN' });
  });

  it('selects only the proven membership named by the header', async () => {
    const result = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest({
        headers: { 'x-os-organization-id': FOREIGN },
        body: { grantedScopes: ['system.admin', COMMERCIAL_TEAM_READ_SCOPE] },
      }),
      store({
        identities: [auth()],
        members: [
          member(),
          member({ id: 'mem-b', organizationId: FOREIGN }),
        ],
        roles: [
          role(COMMERCIAL_TEAM_READ_SCOPE),
          role(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE, {
            id: 'role-b',
            memberId: 'mem-b',
            organizationId: FOREIGN,
          }),
        ],
      }),
    ));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.context.memberId, 'mem-b');
    assert.equal(result.context.organizationId, FOREIGN);
    assert.deepEqual(result.context.grantedScopes, [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]);
    assert.equal(result.context.grantedScopes.includes(COMMERCIAL_TEAM_READ_SCOPE), false);
    assert.equal(result.context.grantedScopes.includes('system.admin'), false);
  });

  it('denies an inactive member and does not fall back to another tenant', async () => {
    const inactive = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({
        identities: [auth()],
        members: [member({ accessStatus: 'inactive' })],
        roles: [role(PEOPLE_ADMIN_SCOPE)],
      }),
    ));
    assert.deepEqual(inactive, { ok: false, denial: 'MEMBER_INACTIVE' });

    const noFallback = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest({ headers: { 'x-os-organization-id': FOREIGN } }),
      store({
        identities: [auth()],
        members: [
          member(),
          member({ id: 'mem-b', organizationId: FOREIGN, accessStatus: 'inactive' }),
        ],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
    ));
    assert.equal(noFallback.ok, false);
    if (noFallback.ok) return;
    assert.notEqual(noFallback.denial, undefined);
    assert.equal('context' in noFallback, false);
  });

  it('does not let cargo, title, or people.admin grant operating scopes', async () => {
    const titled = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({ identities: [auth()], members: [member()], roles: [] }),
    ));
    assert.equal(titled.ok, true);
    if (!titled.ok) return;
    assert.deepEqual(titled.context.grantedScopes, []);

    const admin = await withDevAuth(() => loadTrustedMemberContextFromRequest(
      devRequest(),
      store({
        identities: [auth()],
        members: [member()],
        roles: [role(PEOPLE_ADMIN_SCOPE)],
      }),
    ));
    assert.equal(admin.ok, true);
    if (!admin.ok) return;
    assert.deepEqual(admin.context.grantedScopes, [PEOPLE_ADMIN_SCOPE]);
    for (const scope of NOT_IMPLIED) {
      assert.equal(admin.context.grantedScopes.includes(scope), false, scope);
    }
  });

  it('does not read query, body, or member headers as the grant source', () => {
    const source = readFileSync(new URL('./trusted-member-context.ts', import.meta.url), 'utf8');
    const subject = readFileSync(new URL('./os-session.ts', import.meta.url), 'utf8');
    const proof = functionSource(subject, 'resolveAuthenticatedProviderSubject');
    const session = functionSource(subject, 'resolveSession');
    const jwt = functionSource(subject, 'sessionFromSupabaseJwt');
    assert.match(source, /resolveRequestTrustedContext/);
    assert.match(subject, /resolveTrustedMemberContext/);
    assert.doesNotMatch(proof, /HEADER_ORG/);
    assert.doesNotMatch(proof, /HEADER_MEMBER/);
    assert.doesNotMatch(proof, /grantedScopes/);
    assert.match(proof, /findAuthIdentityById/);
    assert.doesNotMatch(session, /findActiveMemberForPerson/);
    assert.doesNotMatch(jwt, /findActiveMemberForPerson/);
    assert.doesNotMatch(jwt, /organizationHint/);
  });
});
