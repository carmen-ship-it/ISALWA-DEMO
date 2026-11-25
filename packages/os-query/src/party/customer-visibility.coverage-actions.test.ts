import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CustomerCoverageAction, CustomerCoverageGrant } from '@isalwa/os-contracts';
import { CommitmentReadAuthorizer } from '../commitment/commitment-auth';
import { canReadApproval, canReadWork, type ApprovalReadSources } from '../work/work-auth';
import type { StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';
import type { QueryContext } from '../query-context';
import {
  canReadCustomer,
  COMMERCIAL_COVERAGE_READ_ACTIONS,
  CONVERSATION_COVERAGE_READ_ACTIONS,
  coveredAccountOwner,
  resolveCustomerReadScope,
  type CustomerVisibilityFacts,
  type CustomerVisibilityLookup,
} from './customer-visibility';

const ORG = 'org-1';
const NOW = new Date('2026-10-16T12:00:00Z');

function ctx(memberId: string): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    effectiveAt: NOW,
    auth: {
      memberId,
      organizationId: ORG,
      accessStatus: 'active',
      roleKeys: [],
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
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

const dataOnly = lookupWith(['customer.edit']);
const commercial = lookupWith(['commercial.work']);
const convertOnly = lookupWith(['quote.convert']);

const work = {
  workItemId: 'w-1',
  organizationId: ORG,
  title: 'Llamar al cliente',
  status: 'open',
  ownerMemberId: 'm-owner',
  createdByMemberId: 'm-owner',
  subjectType: 'party',
  subjectId: 'customer',
} as unknown as StoredWorkReadModel;

const approval = {
  approvalRequestId: 'a-1',
  organizationId: ORG,
  subjectType: 'party',
  subjectId: 'customer',
  workItemId: null,
  requestedByMemberId: 'm-owner',
  approverMemberId: 'm-approver',
  status: 'pending',
} as unknown as StoredApprovalReadModel;

const noSources = {
  getWorkReadModel: async () => null,
  getQuoteReadModel: async () => null,
  getOrderReadModel: async () => null,
} as unknown as ApprovalReadSources;

const commitment = { organizationId: ORG, ownerMemberId: 'm-owner', partyId: 'customer' };

describe('coverage action on customer-linked reads (NEW-R4-2)', () => {
  it('keeps master-data reads under a data-only grant', async () => {
    assert.equal(await canReadCustomer({ ctx: ctx('m-cover'), partyId: 'customer', lookup: dataOnly, directReports: null }), true);
  });

  it('refuses commercial reads under a data-only grant', async () => {
    const c = ctx('m-cover');
    assert.equal(
      await canReadCustomer({
        ctx: c,
        partyId: 'customer',
        lookup: dataOnly,
        directReports: null,
        coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS,
      }),
      false,
    );
    assert.equal(
      await coveredAccountOwner({ ctx: c, partyId: 'customer', lookup: dataOnly, coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS }),
      null,
    );
    assert.equal(await coveredAccountOwner({ ctx: c, partyId: 'customer', lookup: dataOnly }), 'm-owner');
  });

  it('hides customer-linked work, approvals and commitments under a data-only grant', async () => {
    const c = ctx('m-cover');
    assert.equal(await canReadWork({ ctx: c, work, lookup: null, customer: dataOnly }), false);
    assert.equal(await canReadApproval({ ctx: c, approval, sources: noSources, lookup: null, customer: dataOnly }), false);
    assert.equal(
      await new CommitmentReadAuthorizer(c, { directReports: null, customerVisibility: dataOnly }).canRead(commitment),
      false,
    );
  });

  it('keeps them under commercial.work coverage', async () => {
    const c = ctx('m-cover');
    assert.equal(await canReadWork({ ctx: c, work, lookup: null, customer: commercial }), true);
    assert.equal(await canReadApproval({ ctx: c, approval, sources: noSources, lookup: null, customer: commercial }), true);
    assert.equal(
      await new CommitmentReadAuthorizer(c, { directReports: null, customerVisibility: commercial }).canRead(commitment),
      true,
    );
    assert.equal(
      await coveredAccountOwner({ ctx: c, partyId: 'customer', lookup: commercial, coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS }),
      'm-owner',
    );
  });

  it('lists a commercially covered customer and omits a data-only grant', async () => {
    const c = ctx('m-cover');
    const dataScope = await resolveCustomerReadScope({
      ctx: c,
      lookup: dataOnly,
      directReports: null,
      coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS,
    });
    assert.deepEqual(dataScope, { kind: 'parties', partyIds: [] });
    const workScope = await resolveCustomerReadScope({
      ctx: c,
      lookup: commercial,
      directReports: null,
      coverageActions: COMMERCIAL_COVERAGE_READ_ACTIONS,
    });
    assert.deepEqual(workScope, { kind: 'parties', partyIds: ['customer'] });
    const masterScope = await resolveCustomerReadScope({
      ctx: c,
      lookup: dataOnly,
      directReports: null,
    });
    assert.deepEqual(masterScope, { kind: 'parties', partyIds: ['customer'] });
  });

  it('keeps them under quote.convert coverage', async () => {
    const c = ctx('m-cover');
    assert.equal(await canReadWork({ ctx: c, work, lookup: null, customer: convertOnly }), true);
    assert.equal(await canReadApproval({ ctx: c, approval, sources: noSources, lookup: null, customer: convertOnly }), true);
  });

  it('does not treat quote.convert as conversation coverage', async () => {
    const c = ctx('m-cover');
    assert.equal(
      await canReadCustomer({
        ctx: c,
        partyId: 'customer',
        lookup: convertOnly,
        directReports: null,
        coverageActions: CONVERSATION_COVERAGE_READ_ACTIONS,
      }),
      false,
    );
    assert.equal(
      await canReadCustomer({
        ctx: c,
        partyId: 'customer',
        lookup: commercial,
        directReports: null,
        coverageActions: CONVERSATION_COVERAGE_READ_ACTIONS,
      }),
      true,
    );
  });
});
