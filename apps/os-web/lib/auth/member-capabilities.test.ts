import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  SESSION_CAPABILITY_SCOPES,
  decideCapability,
  loadMemberCapabilities,
  trustedMemberCapabilitySnapshot,
  type DecideCapabilityInput,
} from './member-capabilities';

const ORG = 'org-a';
const OTHER = 'org-b';
const MEMBER = 'mem-a';

const LISTED_SCOPES = [
  'commercial.team.read',
  'master_data.admin',
  'production.operational.record',
  'warehouse.finished_goods.receive',
  'warehouse.finished_goods.allocate',
  'warehouse.outbound.record',
  'operations.coordinator.record',
  'purchasing.operational.record',
  'delivery.record',
  'management.org.read',
  'commercial.exception.authorize',
  'coordination.decision.record',
  'production.entry.member',
  'production.review.member',
] as const;

function input(overrides: Partial<DecideCapabilityInput> = {}): DecideCapabilityInput {
  return {
    organizationId: ORG,
    memberId: MEMBER,
    accessStatus: 'active',
    grantedScopes: ['commercial.team.read'],
    requiredScope: 'commercial.team.read',
    resourceOrganizationId: ORG,
    ...overrides,
  };
}

describe('session capability scopes', () => {
  it('covers the exact operating strings and does not add extras', () => {
    assert.deepEqual([...SESSION_CAPABILITY_SCOPES], [...LISTED_SCOPES]);
    assert.equal(new Set(SESSION_CAPABILITY_SCOPES).size, SESSION_CAPABILITY_SCOPES.length);
  });
});

describe('decideCapability', () => {
  it('correct tenant and required scope allow', () => {
    assert.equal(decideCapability(input()), 'allow');
  });

  it('correct tenant and wrong scope deny', () => {
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['commercial.team.read'],
          requiredScope: 'production.operational.record',
        }),
      ),
      'ROLE_FORBIDDEN',
    );
  });

  it('wrong tenant and right scope deny', () => {
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['warehouse.finished_goods.allocate'],
          requiredScope: 'warehouse.finished_goods.allocate',
          resourceOrganizationId: OTHER,
        }),
      ),
      'TENANT_FORBIDDEN',
    );
  });

  it('no member deny', () => {
    assert.equal(decideCapability(input({ memberId: '' })), 'AUTH_REQUIRED');
    assert.equal(decideCapability(input({ memberId: null })), 'AUTH_REQUIRED');
    assert.equal(decideCapability(input({ organizationId: '  ' })), 'AUTH_REQUIRED');
  });

  it('inactive deny', () => {
    assert.equal(decideCapability(input({ accessStatus: 'inactive' })), 'MEMBER_INACTIVE');
    assert.equal(decideCapability(input({ accessStatus: 'suspended' })), 'MEMBER_INACTIVE');
    assert.equal(decideCapability(input({ accessStatus: 'revoked' })), 'MEMBER_INACTIVE');
    assert.equal(decideCapability(input({ accessStatus: '' })), 'MEMBER_INACTIVE');
  });

  it('denies an invited member even when the scope string is present', () => {
    assert.equal(
      decideCapability(input({ accessStatus: 'invited', grantedScopes: ['commercial.exception.authorize'] })),
      'AUTH_REQUIRED',
    );
  });

  it('does not let a listed scope grant any other listed scope', () => {
    for (const held of LISTED_SCOPES) {
      for (const required of LISTED_SCOPES) {
        const decision = decideCapability(
          input({ grantedScopes: [held], requiredScope: required }),
        );
        assert.equal(decision, held === required ? 'allow' : 'ROLE_FORBIDDEN', `${held} -> ${required}`);
      }
    }
  });

  it('does not treat warehouse.finished_goods.receive as warehouse.finished_goods.allocate', () => {
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['warehouse.finished_goods.receive'],
          requiredScope: 'warehouse.finished_goods.allocate',
        }),
      ),
      'ROLE_FORBIDDEN',
    );
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['warehouse.finished_goods.allocate'],
          requiredScope: 'warehouse.finished_goods.receive',
        }),
      ),
      'ROLE_FORBIDDEN',
    );
  });

  it('does not treat people.admin as a manager or operating shortcut', () => {
    const blocked = [
      ...LISTED_SCOPES,
      'finance.operational.record',
    ];
    for (const required of blocked) {
      assert.equal(
        decideCapability(input({ grantedScopes: ['people.admin'], requiredScope: required })),
        'ROLE_FORBIDDEN',
        required,
      );
    }
  });

  it('denies terminated employment even when access still says active', () => {
    assert.equal(
      decideCapability(input({ accessStatus: 'active', employmentStatus: 'terminated' })),
      'MEMBER_INACTIVE',
    );
    assert.equal(
      decideCapability(input({ accessStatus: 'active', employmentStatus: 'inactive' })),
      'MEMBER_INACTIVE',
    );
  });

  it('does not treat management.org.read as system admin or as a mutation', () => {
    assert.equal(
      decideCapability(input({ grantedScopes: ['management.org.read'], requiredScope: 'system.admin' })),
      'ROLE_FORBIDDEN',
    );
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['commercial.team.read'],
          requiredScope: 'delivery.record',
        }),
      ),
      'ROLE_FORBIDDEN',
    );
    assert.equal(
      decideCapability(
        input({
          grantedScopes: ['management.org.read'],
          requiredScope: 'commercial.exception.authorize',
        }),
      ),
      'ROLE_FORBIDDEN',
    );
  });

  it('ignores cargo and title because they are not a grant', () => {
    const withTitle = {
      ...input({ grantedScopes: [], requiredScope: 'production.entry.member' }),
      cargo: 'Encargado de producción',
      title: 'Gerencia',
    };
    assert.equal(decideCapability(withTitle), 'ROLE_FORBIDDEN');
  });
});

describe('trusted member capability snapshot', () => {
  it('uses role keys from the member read and ignores a client-supplied scope list', () => {
    const snapshot = trustedMemberCapabilitySnapshot(
      {
        memberId: MEMBER,
        organizationId: ORG,
        accessStatus: 'active',
        grantedScopes: ['system.admin', 'commercial.exception.authorize'],
      } as {
        memberId: string;
        organizationId: string;
        accessStatus: string;
      },
      {
        member: {
          id: MEMBER,
          organizationId: ORG,
          accessStatus: 'active',
        },
        summary: {
          memberId: MEMBER,
          organizationId: ORG,
          accessStatus: 'active',
          roleKeys: ['commercial.team.read'],
          cargo: 'Jefe comercial',
          title: 'Gerencia',
        },
        grantedScopes: ['warehouse.finished_goods.allocate', 'system.admin'],
        organizationId: ORG,
      },
    );
    assert.deepEqual(snapshot, {
      organizationId: ORG,
      memberId: MEMBER,
      accessStatus: 'active',
      grantedScopes: ['commercial.team.read'],
    });
  });

  it('discards a member read that names another tenant or member', () => {
    assert.equal(
      trustedMemberCapabilitySnapshot(
        { memberId: MEMBER, organizationId: ORG, accessStatus: 'active' },
        {
          member: { id: 'mem-other', organizationId: ORG, accessStatus: 'active' },
          summary: {
            memberId: 'mem-other',
            organizationId: ORG,
            accessStatus: 'active',
            roleKeys: ['commercial.team.read'],
          },
        },
      ),
      null,
    );
    assert.equal(
      trustedMemberCapabilitySnapshot(
        { memberId: MEMBER, organizationId: ORG, accessStatus: 'active' },
        {
          member: { id: MEMBER, organizationId: OTHER, accessStatus: 'active' },
          summary: {
            memberId: MEMBER,
            organizationId: OTHER,
            accessStatus: 'active',
            roleKeys: ['commercial.team.read'],
          },
        },
      ),
      null,
    );
  });
});

describe('loadMemberCapabilities', () => {
  it('direct call cannot spoof scopes by passing them as arguments to the loader', async () => {
    const spoofedScopes = [
      'system.admin',
      'commercial.exception.authorize',
      'warehouse.finished_goods.allocate',
      'people.admin',
    ];
    const spoof = {
      organizationId: 'org-spoof',
      memberId: 'mem-spoof',
      accessStatus: 'active',
      grantedScopes: spoofedScopes,
      cargo: 'Gerencia',
      title: 'Encargado de Almacén',
    };
    const result = await loadMemberCapabilities(spoof);

    assert.equal(loadMemberCapabilities.length, 0);
    assert.equal(result, null);
    assert.notEqual(result, spoof);
  });

  it('does not read caller arguments, cookies, or localStorage as the grant list', () => {
    const source = readFileSync(new URL('./member-capabilities.ts', import.meta.url), 'utf8');
    const loader = source.slice(source.indexOf('export async function loadMemberCapabilities'));
    assert.match(loader, /void callerSupplied/);
    assert.doesNotMatch(loader, /callerSupplied\[/);
    assert.doesNotMatch(loader, /localStorage/);
    assert.doesNotMatch(loader, /document\.cookie/);
    assert.match(loader, /getServerOsAuthContext/);
    assert.match(loader, /getTrustedAuthorization/);
    assert.match(loader, /acceptTrustedMemberContext/);
    assert.doesNotMatch(loader, /getMember\(/);
    assert.doesNotMatch(loader, /grantedScopes/);
    assert.doesNotMatch(source, /OS_DEV_SESSION_COOKIE/);
    assert.doesNotMatch(source, /cookies\(/);
  });
});
