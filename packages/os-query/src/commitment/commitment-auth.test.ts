import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  ISSUE_MANAGE_SCOPE,
} from '@isalwa/os-contracts';
import { CommitmentReadAuthorizer, canLinkCommitmentParty, type CommitmentReadDeps } from './commitment-auth';
import type { DirectReportLookup } from '../leadership/direct-reports';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from '../party/customer-visibility';
import type { QueryContext } from '../query-context';

const ORG = 'org-1';

function ctx(memberId: string, scopes: string[] = [], org = ORG): QueryContext {
  return {
    organizationId: org,
    actorMemberId: memberId,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    auth: {
      memberId,
      organizationId: org,
      accessStatus: 'active',
      roleKeys: scopes,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  } as unknown as QueryContext;
}

const FACTS: Record<string, CustomerVisibilityFacts> = {
  customerA: { organizationId: ORG, partyId: 'customerA', hasCommercialAccount: true, accountOwnerMemberId: 'm-advisorA', activeRoleKeys: ['customer'] },
  supplier: { organizationId: ORG, partyId: 'supplier', hasCommercialAccount: false, accountOwnerMemberId: null, activeRoleKeys: ['supplier'] },
};

const customerVisibility: CustomerVisibilityLookup = {
  getCustomerFacts: async (org, id) => (org === ORG ? (FACTS[id] ?? null) : null),
  listCustomerFacts: async (org, ids) => (org === ORG ? ids.flatMap((id) => (FACTS[id] ? [FACTS[id]] : [])) : []),
  listPartyIdsOwnedBy: async () => [],
  listActiveCoverageForAdvisor: async () => [],
};

const directReports: DirectReportLookup = {
  listDirectReportMemberIds: async (org, manager) => (org === ORG && manager === 'm-jefeA' ? ['m-advisorA'] : []),
};

const deps: CommitmentReadDeps = { directReports, customerVisibility };

const customerCommitment = { organizationId: ORG, ownerMemberId: 'm-advisorA', partyId: 'customerA' };
const supplierCommitment = { organizationId: ORG, ownerMemberId: 'm-buyer', partyId: 'supplier' };
const internalCommitment = { organizationId: ORG, ownerMemberId: 'm-buyer', partyId: null };

const canRead = (c: QueryContext, commitment: typeof customerCommitment | typeof internalCommitment, d = deps) =>
  new CommitmentReadAuthorizer(c, d).canRead(commitment);

describe('commitment reads (F07)', () => {
  it('hides a customer commitment from another advisor in the same tenant', async () => {
    assert.equal(await canRead(ctx('m-advisorB'), customerCommitment), false);
  });

  it('keeps the owner, the manager in range and org.read on a customer commitment', async () => {
    assert.equal(await canRead(ctx('m-advisorA'), customerCommitment), true);
    assert.equal(await canRead(ctx('m-jefeA', [COMMERCIAL_TEAM_READ_SCOPE]), customerCommitment), true);
    assert.equal(await canRead(ctx('m-gerente', [COMMERCIAL_ORG_READ_SCOPE]), customerCommitment), true);
  });

  it('does not open customer commitments to a manager out of range', async () => {
    assert.equal(await canRead(ctx('m-jefeB', [COMMERCIAL_TEAM_READ_SCOPE]), customerCommitment), false);
  });

  it('limits issue.manage to non-customer commitments', async () => {
    const manager = ctx('m-ops', [ISSUE_MANAGE_SCOPE]);
    assert.equal(await canRead(manager, customerCommitment), false);
    assert.equal(await canRead(manager, supplierCommitment), true);
    assert.equal(await canRead(manager, internalCommitment), true);
    assert.equal(await canRead(ctx('m-outsider'), supplierCommitment), false);
    assert.equal(await canRead(ctx('m-outsider'), internalCommitment), false);
  });

  it('denies another tenant even with org.read', async () => {
    assert.equal(await canRead(ctx('m-gerente', [COMMERCIAL_ORG_READ_SCOPE], 'org-2'), customerCommitment), false);
  });

  it('fails closed on a party link when visibility facts are unavailable', async () => {
    const noLookup: CommitmentReadDeps = { directReports, customerVisibility: null };
    assert.equal(await canRead(ctx('m-ops', [ISSUE_MANAGE_SCOPE]), customerCommitment, noLookup), false);
    assert.equal(await canRead(ctx('m-advisorA'), customerCommitment, noLookup), true);
  });

  it('filters a list to the readable commitments', async () => {
    const list = [customerCommitment, supplierCommitment, internalCommitment];
    const visible = await new CommitmentReadAuthorizer(ctx('m-advisorB'), deps).filter(list);
    assert.deepEqual(visible, []);
    const own = await new CommitmentReadAuthorizer(ctx('m-advisorA'), deps).filter(list);
    assert.deepEqual(own, [customerCommitment]);
  });
});

describe('commitment party links on create (F07)', () => {
  it('refuses a customer the actor cannot read', async () => {
    assert.equal(await canLinkCommitmentParty(ctx('m-advisorB'), 'customerA', deps), false);
  });

  it('allows the account owner and a non-customer party', async () => {
    assert.equal(await canLinkCommitmentParty(ctx('m-advisorA'), 'customerA', deps), true);
    assert.equal(await canLinkCommitmentParty(ctx('m-advisorB'), 'supplier', deps), true);
  });

  it('refuses an unknown party', async () => {
    assert.equal(await canLinkCommitmentParty(ctx('m-advisorA'), 'ghost', deps), false);
  });
});
