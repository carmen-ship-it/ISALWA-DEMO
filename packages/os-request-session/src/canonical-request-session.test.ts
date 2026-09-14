import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OrganizationSelectorSemantics,
  organizationSelector,
  resolveCanonicalRequestContext,
  type CanonicalRequest,
  type CanonicalSessionStore,
} from './canonical-request-session';

const ORG = 'org-proven';
const OTHER = 'org-other';
const PAST = new Date('2026-01-01T00:00:00.000Z');

function request(input: {
  orgHeader?: string;
  queryOrg?: string;
  bodyOrg?: string;
  scopes?: string[];
  cargo?: string;
  title?: string;
} = {}): CanonicalRequest {
  return {
    header(name: string) {
      if (name === 'x-os-organization-id') return input.orgHeader;
      if (name === 'x-os-auth-identity-id') return 'auth-1';
      if (name === 'x-os-person-id') return 'person-1';
      return undefined;
    },
    query: input.queryOrg ? { organizationId: input.queryOrg } : {},
    body: {
      organizationId: input.bodyOrg,
      grantedScopes: input.scopes,
      cargo: input.cargo,
      title: input.title,
    },
  };
}

function store(orgs: string[], roleKey = 'commercial.team.read'): CanonicalSessionStore {
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
      return orgs.map((organizationId) => ({
        id: `mem-${organizationId}`,
        organizationId,
        personId: 'person-1',
        accessStatus: 'active',
        employmentStatus: 'active',
      }));
    },
    async listRoleAssignmentsForMember(memberId: string) {
      const organizationId = memberId.replace('mem-', '');
      return [{
        memberId,
        organizationId,
        roleKey,
        effectiveAt: PAST,
        endedAt: null,
      }];
    },
    async listDelegationsForDelegate() {
      return [];
    },
  };
}

describe('canonical request session', () => {
  it('documents that the organization header is a selector, not authority', () => {
    assert.equal(OrganizationSelectorSemantics.neverAuthority, true);
    assert.equal(OrganizationSelectorSemantics.neverCreatesOrganization, true);
    assert.equal(OrganizationSelectorSemantics.foreignSelector, 'TENANT_FORBIDDEN');
    assert.equal(OrganizationSelectorSemantics.ambiguousWithoutSelector, 'fail_closed');
  });

  it('uses the only eligible membership and ignores client scopes', async () => {
    const result = await resolveCanonicalRequestContext(
      request({ scopes: ['system.admin'], cargo: 'Gerente', title: 'Owner', bodyOrg: OTHER }),
      store([ORG]),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.context.organizationId, ORG);
    assert.equal(result.context.grantedScopes.includes('system.admin'), false);
    assert.equal(result.context.grantedScopes.includes('commercial.team.read'), true);
  });

  it('selects a proven membership and rejects a foreign selector', async () => {
    const selected = await resolveCanonicalRequestContext(
      request({ orgHeader: OTHER, queryOrg: ORG }),
      store([ORG, OTHER], 'management.org.read'),
    );
    assert.equal(selected.ok, true);
    if (selected.ok) assert.equal(selected.context.organizationId, OTHER);

    const foreign = await resolveCanonicalRequestContext(
      request({ orgHeader: 'org-invented' }),
      store([ORG, OTHER]),
    );
    assert.equal(foreign.ok, false);
    if (!foreign.ok) assert.equal(foreign.denial, 'TENANT_FORBIDDEN');
  });

  it('fails closed when several memberships have no selector', async () => {
    const result = await resolveCanonicalRequestContext(request(), store([ORG, OTHER]));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.denial, 'TENANT_FORBIDDEN');
    assert.equal(organizationSelector(request({ queryOrg: ORG })), null);
  });
});
