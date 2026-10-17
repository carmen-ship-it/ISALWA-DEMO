import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CustomerCoverageAction, CustomerCoverageGrant } from '@isalwa/os-contracts';
import { canReadApproval, type ApprovalReadSources } from './work-auth';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from '../party/customer-visibility';
import type { StoredApprovalReadModel } from '../projection-store-port';
import type { QueryContext } from '../query-context';

const ORG = 'org-1';

function ctx(memberId: string): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    effectiveAt: new Date('2026-10-16T12:00:00Z'),
    auth: { memberId, organizationId: ORG, accessStatus: 'active', roleKeys: [], delegatedScopes: [], delegatedApproverFor: [] },
  } as unknown as QueryContext;
}

const customer: CustomerVisibilityFacts = {
  organizationId: ORG,
  partyId: 'customer',
  hasCommercialAccount: true,
  accountOwnerMemberId: 'm-owner',
  activeRoleKeys: ['customer'],
};

function lookupWith(coveredActions: CustomerCoverageAction[]): CustomerVisibilityLookup {
  const grant: CustomerCoverageGrant = {
    grantType: 'commercial.customer.coverage',
    organizationId: ORG,
    customerPartyId: 'customer',
    primaryOwnerMemberId: 'm-owner',
    actingAdvisorMemberId: 'm-cover',
    coveredActions,
    startsAt: new Date('2026-10-01T00:00:00Z'),
    endsAt: null,
    revokedAt: null,
  };
  return {
    getCustomerFacts: async (org, id) => (org === ORG && id === 'customer' ? customer : null),
    listCustomerFacts: async (org, ids) => (org === ORG && ids.includes('customer') ? [customer] : []),
    listPartyIdsOwnedBy: async () => [],
    listActiveCoverageForAdvisor: async (org, advisor) => (org === ORG && advisor === 'm-cover' ? [grant] : []),
  };
}

const records: Record<string, { organizationId: string; partyId: string; ownerMemberId: string }> = {
  ownerQuote: { organizationId: ORG, partyId: 'customer', ownerMemberId: 'm-owner' },
  otherQuote: { organizationId: ORG, partyId: 'customer', ownerMemberId: 'm-other' },
  ownerOrder: { organizationId: ORG, partyId: 'customer', ownerMemberId: 'm-owner' },
};

const sources = {
  getWorkReadModel: async () => null,
  getQuoteReadModel: async (_org: string, id: string) => (id.endsWith('Quote') ? (records[id] ?? null) : null),
  getOrderReadModel: async (_org: string, id: string) => (id.endsWith('Order') ? (records[id] ?? null) : null),
} as unknown as ApprovalReadSources;

const approval = (subjectType: 'quote' | 'order', subjectId: string) =>
  ({
    approvalRequestId: `a-${subjectId}`,
    organizationId: ORG,
    subjectType,
    subjectId,
    workItemId: null,
    requestedByMemberId: 'm-owner',
    approverMemberId: 'm-approver',
    status: 'pending',
  }) as unknown as StoredApprovalReadModel;

const read = (who: string, a: StoredApprovalReadModel, customerLookup: CustomerVisibilityLookup | null) =>
  canReadApproval({ ctx: ctx(who), approval: a, sources, lookup: null, customer: customerLookup });

describe('quote and order approvals under coverage (NEW-R4-3)', () => {
  it('commercial.work coverage reads approvals on the covered owner\'s quote and order', async () => {
    const commercial = lookupWith(['commercial.work']);
    assert.equal(await read('m-cover', approval('quote', 'ownerQuote'), commercial), true);
    assert.equal(await read('m-cover', approval('order', 'ownerOrder'), commercial), true);
  });

  it('does not reach a quote owned by someone other than the covered owner', async () => {
    assert.equal(await read('m-cover', approval('quote', 'otherQuote'), lookupWith(['commercial.work'])), false);
  });

  it('data-only coverage, no lookup and an unrelated member are refused', async () => {
    assert.equal(await read('m-cover', approval('quote', 'ownerQuote'), lookupWith(['customer.edit'])), false);
    assert.equal(await read('m-cover', approval('quote', 'ownerQuote'), null), false);
    assert.equal(await read('m-outsider', approval('quote', 'ownerQuote'), lookupWith(['commercial.work'])), false);
  });

  it('keeps the subject owner', async () => {
    assert.equal(await read('m-owner', approval('quote', 'ownerQuote'), null), true);
  });
});
