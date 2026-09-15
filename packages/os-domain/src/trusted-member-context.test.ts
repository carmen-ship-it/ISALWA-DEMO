import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_TEAM_READ_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
} from '@isalwa/os-contracts';
import {
  acceptTrustedMemberContext,
  authorizeTrustedMemberContext,
  resolveTrustedMemberContext,
  trustedTenantFields,
  type TrustedAuthIdentity,
  type TrustedDelegation,
  type TrustedMemberRecord,
  type TrustedMembershipReader,
  type TrustedRoleAssignment,
} from './trusted-member-context';

const ORG = 'org-a';
const FOREIGN = 'org-b';
const AS_OF = new Date('2026-06-01T00:00:00.000Z');
const PAST = new Date('2026-01-01T00:00:00.000Z');
const FUTURE = new Date('2026-12-01T00:00:00.000Z');

const NOT_IMPLIED = [
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
] as const;

function identity(overrides: Partial<TrustedAuthIdentity> = {}): TrustedAuthIdentity {
  return {
    id: 'auth-1',
    personId: 'person-1',
    provider: 'supabase',
    providerSubject: 'subject-1',
    status: 'active',
    ...overrides,
  };
}

function member(overrides: Partial<TrustedMemberRecord> = {}): TrustedMemberRecord {
  return {
    id: 'mem-a',
    organizationId: ORG,
    personId: 'person-1',
    accessStatus: 'active',
    employmentStatus: 'active',
    ...overrides,
  };
}

function role(
  roleKey: string,
  overrides: Partial<TrustedRoleAssignment> = {},
): TrustedRoleAssignment {
  return {
    memberId: 'mem-a',
    organizationId: ORG,
    roleKey,
    effectiveAt: PAST,
    endedAt: null,
    ...overrides,
  };
}

type Fixture = {
  identities?: TrustedAuthIdentity[];
  members?: TrustedMemberRecord[];
  roles?: TrustedRoleAssignment[];
  delegations?: TrustedDelegation[];
};

function reader(fixture: Fixture): TrustedMembershipReader {
  return {
    async findAuthIdentityByProviderSubject(provider, providerSubject) {
      return (
        fixture.identities?.find(
          (row) => row.provider === provider && row.providerSubject === providerSubject,
        ) ?? null
      );
    },
    async listMembersForPerson(personId) {
      const rows = fixture.members ?? [];
      const own = rows.filter((row) => row.personId === personId);
      const leaked = rows.filter((row) => row.personId !== personId);
      return [...own, ...leaked];
    },
    async listRoleAssignmentsForMember(memberId) {
      return (fixture.roles ?? []).filter((row) => !row.memberId || row.memberId === memberId);
    },
    async listDelegationsForDelegate(memberId) {
      return (fixture.delegations ?? []).filter(
        (row) => !row.delegateMemberId || row.delegateMemberId === memberId,
      );
    },
  };
}

function claimed(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'supabase',
    providerSubject: 'subject-1',
    asOf: AS_OF,
    organizationId: FOREIGN,
    grantedScopes: ['system.admin', ...NOT_IMPLIED],
    cargo: 'Gerencia',
    title: 'Encargado de Almacén',
    ...overrides,
  };
}

describe('resolveTrustedMemberContext', () => {
  it('ignores a client organizationId and uses the stored membership', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member(), member({ id: 'mem-foreign-person', personId: 'person-other', organizationId: FOREIGN })],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.context.organizationId, ORG);
    assert.equal(result.context.memberId, 'mem-a');
    assert.notEqual(result.context.organizationId, FOREIGN);
  });

  it('ignores a client scope array and reads stored assignments only', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
  });

  it('denies suspended, inactive, and terminated members without returning grants', async () => {
    for (const closed of [
      member({ accessStatus: 'suspended' }),
      member({ accessStatus: 'inactive' }),
      member({ accessStatus: 'active', employmentStatus: 'terminated' }),
      member({ accessStatus: 'active', employmentStatus: 'inactive' }),
      member({ accessStatus: 'revoked', employmentStatus: 'terminated' }),
    ]) {
      const result = await resolveTrustedMemberContext(
        reader({
          identities: [identity()],
          members: [closed],
          roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
        }),
        claimed(),
      );
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.denial, 'MEMBER_INACTIVE');
    }
  });

  it('does not select a foreign-tenant member when the client names that tenant', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [
          member(),
          member({ id: 'mem-foreign', personId: 'person-other', organizationId: FOREIGN }),
        ],
        roles: [
          role(COMMERCIAL_TEAM_READ_SCOPE),
          role(WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE, {
            memberId: 'mem-foreign',
            organizationId: FOREIGN,
          }),
        ],
      }),
      claimed({ organizationId: FOREIGN }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.context.memberId, 'mem-a');
    assert.equal(result.context.organizationId, ORG);
    assert.deepEqual(result.context.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
  });

  it('fails closed when the person has eligible members in more than one tenant', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member(), member({ id: 'mem-b', organizationId: FOREIGN })],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
      claimed({ organizationId: FOREIGN }),
    );
    assert.deepEqual(result, { ok: false, denial: 'TENANT_FORBIDDEN' });
  });

  it('drops a role assignment that belongs to another organization', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [
          role(COMMERCIAL_TEAM_READ_SCOPE),
          role(FINANCE_OPERATIONAL_RECORD_SCOPE, { organizationId: FOREIGN }),
        ],
      }),
      claimed({ organizationId: ORG }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
  });

  it('keeps an active additional grant and drops ended or wrong-tenant grants', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [
          role('sales_rep'),
          role(COMMERCIAL_TEAM_READ_SCOPE),
          role(MANAGEMENT_ORG_READ_SCOPE, { endedAt: new Date('2026-05-01T00:00:00.000Z') }),
          role(FINANCE_OPERATIONAL_RECORD_SCOPE, { organizationId: FOREIGN }),
        ],
        delegations: [
          {
            delegateMemberId: 'mem-a',
            organizationId: ORG,
            scopes: [COORDINATION_DECISION_CAPABILITY],
            startsAt: PAST,
            expiresAt: FUTURE,
            revokedAt: null,
            delegatorMemberId: 'mem-mgr',
          },
          {
            delegateMemberId: 'mem-a',
            organizationId: FOREIGN,
            scopes: [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE],
            startsAt: PAST,
            expiresAt: FUTURE,
            revokedAt: null,
            delegatorMemberId: 'mem-foreign',
          },
        ],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, [
      COMMERCIAL_TEAM_READ_SCOPE,
      COORDINATION_DECISION_CAPABILITY,
      'sales_rep',
    ]);
  });

  it('each planned role session contains exact intended scopes', async () => {
    const { V1_PLANNED_ASSIGNMENTS } = await import('@isalwa/os-contracts');
    for (const planned of V1_PLANNED_ASSIGNMENTS) {
      const result = await resolveTrustedMemberContext(
        reader({
          identities: [identity()],
          members: [member()],
          roles: planned.intendedCapabilities.map((scope) => role(scope)),
        }),
        claimed({
          cargo: planned.functionLabel,
          title: planned.functionLabel,
          grantedScopes: [PEOPLE_ADMIN_SCOPE, 'system.admin'],
        }),
      );
      assert.equal(result.ok, true, planned.functionId);
      if (!result.ok) return;
      assert.deepEqual(
        result.context.grantedScopes,
        [...planned.intendedCapabilities].sort(),
        planned.functionId,
      );
    }
  });

  it('does not keep an ended assignment', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE, { endedAt: new Date('2026-05-01T00:00:00.000Z') })],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, []);
  });

  it('grants empty scopes for cargo and title when no assignment is stored', async () => {
    const result = await resolveTrustedMemberContext(
      reader({ identities: [identity()], members: [member()], roles: [] }),
      claimed({ cargo: 'Encargado de producción', title: 'Gerencia' }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, []);
    for (const required of NOT_IMPLIED) {
      assert.equal(
        authorizeTrustedMemberContext(result.context, required, ORG),
        'ROLE_FORBIDDEN',
        required,
      );
    }
  });

  it('does not let people.admin imply operating or leadership scopes', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [role(PEOPLE_ADMIN_SCOPE)],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.context.grantedScopes, [PEOPLE_ADMIN_SCOPE]);
    for (const required of NOT_IMPLIED) {
      assert.equal(
        authorizeTrustedMemberContext(result.context, required, ORG),
        'ROLE_FORBIDDEN',
        required,
      );
    }
    assert.equal(
      authorizeTrustedMemberContext(result.context, PEOPLE_ADMIN_SCOPE, ORG),
      'allow',
    );
  });

  it('does not let a held scope imply another stored scope', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [role('warehouse.finished_goods.receive')],
      }),
      claimed(),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      authorizeTrustedMemberContext(result.context, WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE, ORG),
      'ROLE_FORBIDDEN',
    );
  });

  it('denies a revoked auth identity before selecting a member', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity({ status: 'revoked' })],
        members: [member()],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
      claimed(),
    );
    assert.deepEqual(result, { ok: false, denial: 'AUTH_REQUIRED' });
  });
});

describe('trusted tenant projection', () => {
  it('exposes only organization and stored scopes, not a second session type', async () => {
    const result = await resolveTrustedMemberContext(
      reader({
        identities: [identity()],
        members: [member()],
        roles: [role(COMMERCIAL_TEAM_READ_SCOPE)],
      }),
      claimed({ organizationId: FOREIGN, grantedScopes: [PEOPLE_ADMIN_SCOPE] }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(trustedTenantFields(result.context), {
      organizationId: ORG,
      grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
    });
  });
});

describe('acceptTrustedMemberContext', () => {
  it('ignores cargo, title, role keys, and a second scope or organization field', () => {
    const accepted = acceptTrustedMemberContext({
      authIdentityId: 'auth-1',
      personId: 'person-1',
      memberId: 'mem-a',
      organizationId: ORG,
      accessStatus: 'active',
      employmentStatus: 'active',
      grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
      cargo: 'Gerencia',
      title: 'Jefe comercial',
      roleKeys: [PEOPLE_ADMIN_SCOPE, FINANCE_OPERATIONAL_RECORD_SCOPE],
      scopes: [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE],
      organizationIdOverride: FOREIGN,
      clientOrganizationId: FOREIGN,
    });
    assert.deepEqual(accepted?.grantedScopes, [COMMERCIAL_TEAM_READ_SCOPE]);
    assert.equal(accepted?.organizationId, ORG);
  });

  it('rejects a payload that is only organization and scopes, and rejects closed lifecycle', () => {
    assert.equal(
      acceptTrustedMemberContext({
        organizationId: ORG,
        grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
        authenticated: true,
      }),
      null,
    );
    assert.equal(
      acceptTrustedMemberContext({
        authIdentityId: 'auth-1',
        personId: 'person-1',
        memberId: 'mem-a',
        organizationId: ORG,
        accessStatus: 'suspended',
        employmentStatus: 'active',
        grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
      }),
      null,
    );
    assert.equal(
      acceptTrustedMemberContext({
        authIdentityId: 'auth-1',
        personId: 'person-1',
        memberId: 'mem-a',
        organizationId: ORG,
        accessStatus: 'active',
        employmentStatus: 'terminated',
        grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
      }),
      null,
    );
  });
});
