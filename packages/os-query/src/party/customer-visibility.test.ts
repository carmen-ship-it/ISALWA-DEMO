import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CustomerCoverageGrant } from '@isalwa/os-contracts';
import type { QueryContext } from '../query-context';
import {
  canReadCustomer,
  isCustomerBoundParty,
  resolveCustomerReadScope,
  type CustomerVisibilityFacts,
  type CustomerVisibilityLookup,
} from './customer-visibility';

const ORG = 'org-a';
const NOW = new Date('2026-10-16T12:00:00Z');

function ctx(memberId: string, roleKeys: string[] = [], accessStatus = 'active'): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    effectiveAt: NOW,
    auth: {
      memberId,
      organizationId: ORG,
      accessStatus,
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  } as unknown as QueryContext;
}

function grant(partial: Partial<CustomerCoverageGrant>): CustomerCoverageGrant {
  return {
    grantType: 'commercial.customer.coverage',
    organizationId: ORG,
    customerPartyId: 'cust-owned',
    primaryOwnerMemberId: 'owner',
    actingAdvisorMemberId: 'advisor',
    startsAt: new Date('2026-10-01T00:00:00Z'),
    endsAt: null,
    revokedAt: null,
    ...partial,
  };
}

function lookup(input: {
  facts: CustomerVisibilityFacts[];
  grants?: CustomerCoverageGrant[];
}): CustomerVisibilityLookup {
  const active = (g: CustomerCoverageGrant, asOf: Date) =>
    !g.revokedAt && g.startsAt <= asOf && (g.endsAt === null || g.endsAt > asOf);
  return {
    async getCustomerFacts(org, partyId) {
      return input.facts.find((f) => f.organizationId === org && f.partyId === partyId) ?? null;
    },
    async listCustomerFacts(org, ids) {
      return input.facts.filter((f) => f.organizationId === org && ids.includes(f.partyId));
    },
    async listPartyIdsOwnedBy(org, owners) {
      return input.facts
        .filter((f) => f.organizationId === org && f.accountOwnerMemberId && owners.includes(f.accountOwnerMemberId))
        .map((f) => f.partyId);
    },
    async listActiveCoverageForAdvisor(org, advisor, asOf) {
      return (input.grants ?? []).filter(
        (g) => g.organizationId === org && g.actingAdvisorMemberId === advisor && active(g, asOf),
      );
    },
  };
}

const owned: CustomerVisibilityFacts = {
  organizationId: ORG,
  partyId: 'cust-owned',
  hasCommercialAccount: true,
  accountOwnerMemberId: 'owner',
  activeRoleKeys: ['customer'],
};
const supplier: CustomerVisibilityFacts = {
  organizationId: ORG,
  partyId: 'supp-1',
  hasCommercialAccount: false,
  accountOwnerMemberId: null,
  activeRoleKeys: ['supplier'],
};
const unclassified: CustomerVisibilityFacts = {
  organizationId: ORG,
  partyId: 'no-roles',
  hasCommercialAccount: false,
  accountOwnerMemberId: null,
  activeRoleKeys: [],
};
const foreign: CustomerVisibilityFacts = { ...owned, organizationId: 'org-b', partyId: 'cust-foreign' };

const directReports = (map: Record<string, string[]>) => ({
  async listDirectReportMemberIds(_org: string, manager: string) {
    return map[manager] ?? [];
  },
});

describe('customer visibility (T02 decision)', () => {
  const base = lookup({ facts: [owned, supplier, unclassified, foreign] });

  it('classifies customer, account holder and role-less parties as customer-bound', () => {
    assert.equal(isCustomerBoundParty(owned), true);
    assert.equal(isCustomerBoundParty(unclassified), true);
    assert.equal(isCustomerBoundParty(supplier), false);
  });

  it('owner reads; membership alone, people.admin alone and master_data.admin do not', async () => {
    const read = (c: QueryContext) =>
      canReadCustomer({ ctx: c, partyId: 'cust-owned', lookup: base, directReports: null });
    assert.equal(await read(ctx('owner')), true);
    assert.equal(await read(ctx('stranger')), false);
    assert.equal(await read(ctx('stranger', ['people.admin'])), false);
    assert.equal(await read(ctx('stranger', ['master_data.admin'])), false);
    assert.equal(await read(ctx('stranger', ['commercial.org.read'])), true);
  });

  it('team lead reads only accounts owned by an active direct report', async () => {
    const reports = directReports({ lead: ['owner'], otherLead: ['someone'] });
    const read = (c: QueryContext) =>
      canReadCustomer({ ctx: c, partyId: 'cust-owned', lookup: base, directReports: reports });
    assert.equal(await read(ctx('lead', ['commercial.team.read'])), true);
    assert.equal(await read(ctx('otherLead', ['commercial.team.read'])), false);
    assert.equal(await read(ctx('lead')), false);
  });

  it('coverage applies only while active and while the grant owner is still the account owner', async () => {
    const read = (grants: CustomerCoverageGrant[], facts = owned) =>
      canReadCustomer({
        ctx: ctx('advisor'),
        partyId: 'cust-owned',
        lookup: lookup({ facts: [facts], grants }),
        directReports: null,
      });
    assert.equal(await read([grant({})]), true);
    assert.equal(await read([grant({ endsAt: new Date('2026-10-10T00:00:00Z') })]), false);
    assert.equal(await read([grant({ revokedAt: new Date('2026-10-05T00:00:00Z') })]), false);
    assert.equal(await read([grant({ startsAt: new Date('2026-11-01T00:00:00Z') })]), false);
    assert.equal(await read([grant({})], { ...owned, accountOwnerMemberId: 'new-owner' }), false);
  });

  it('suspended actor reads nothing, and a foreign or missing id is the same false', async () => {
    assert.equal(
      await canReadCustomer({ ctx: ctx('owner', [], 'suspended'), partyId: 'cust-owned', lookup: base, directReports: null }),
      false,
    );
    assert.equal(
      await canReadCustomer({ ctx: ctx('owner'), partyId: 'cust-foreign', lookup: base, directReports: null }),
      false,
    );
    assert.equal(
      await canReadCustomer({ ctx: ctx('owner'), partyId: 'missing', lookup: base, directReports: null }),
      false,
    );
  });

  it('a role-less party is readable only by commercial.org.read; a supplier-only party keeps its existing rule', async () => {
    const read = (c: QueryContext, partyId: string) =>
      canReadCustomer({ ctx: c, partyId, lookup: base, directReports: null });
    assert.equal(await read(ctx('owner'), 'no-roles'), false);
    assert.equal(await read(ctx('x', ['commercial.org.read']), 'no-roles'), true);
    assert.equal(await read(ctx('stranger'), 'supp-1'), true);
  });

  it('read scope lists owned, team and applicable coverage parties; org read is the tenant', async () => {
    const facts = [
      owned,
      { ...owned, partyId: 'cust-report', accountOwnerMemberId: 'report' },
      { ...owned, partyId: 'cust-reassigned', accountOwnerMemberId: 'new-owner' },
    ];
    const grants = [
      grant({ actingAdvisorMemberId: 'lead', customerPartyId: 'cust-owned' }),
      grant({ actingAdvisorMemberId: 'lead', customerPartyId: 'cust-reassigned' }),
    ];
    const scope = await resolveCustomerReadScope({
      ctx: ctx('lead', ['commercial.team.read']),
      lookup: lookup({ facts, grants }),
      directReports: directReports({ lead: ['report'] }),
    });
    assert.equal(scope.kind, 'parties');
    if (scope.kind !== 'parties') return;
    assert.deepEqual([...scope.partyIds].sort(), ['cust-owned', 'cust-report']);

    const org = await resolveCustomerReadScope({
      ctx: ctx('x', ['commercial.org.read']),
      lookup: lookup({ facts }),
      directReports: null,
    });
    assert.deepEqual(org, { kind: 'org' });

    const none = await resolveCustomerReadScope({
      ctx: ctx('x', ['people.admin']),
      lookup: lookup({ facts }),
      directReports: null,
    });
    assert.deepEqual(none, { kind: 'parties', partyIds: [] });
  });
});
