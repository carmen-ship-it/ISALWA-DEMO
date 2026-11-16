import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_WORK_MANAGE_SCOPE,
  ISSUE_MANAGE_SCOPE,
  PEOPLE_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import type { CommitmentReadDeps } from './commitment-auth';
import { CommitmentHandoverAuthorizer, type CommitmentHandoverFacts } from './commitment-handover';
import type { DirectReportLookup } from '../leadership/direct-reports';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from '../party/customer-visibility';
import type { QueryContext } from '../query-context';

const ORG = 'org-1';

function ctx(memberId: string, scopes: string[] = [], accessStatus = 'active'): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    auth: { memberId, organizationId: ORG, accessStatus, roleKeys: scopes, delegatedScopes: [], delegatedApproverFor: [] },
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
  listDirectReportMemberIds: async (org, manager) =>
    org === ORG && manager === 'm-jefeA' ? ['m-advisorA', 'm-advisorA2'] : [],
};

const deps: CommitmentReadDeps = { directReports, customerVisibility };

const customer: CommitmentHandoverFacts = { organizationId: ORG, ownerMemberId: 'm-advisorA', partyId: 'customerA', relatedSubjectType: null };
const internal: CommitmentHandoverFacts = { organizationId: ORG, ownerMemberId: 'm-buyer', partyId: null, relatedSubjectType: null };
const linkedToWork: CommitmentHandoverFacts = { ...internal, relatedSubjectType: 'work_item' };
const supplier: CommitmentHandoverFacts = { ...internal, partyId: 'supplier' };

const authority = (c: QueryContext, commitment: CommitmentHandoverFacts, ownerIsActive = true) =>
  new CommitmentHandoverAuthorizer(c, deps).authority(commitment, ownerIsActive);

describe('commitment handover authority', () => {
  it('lets an org-range commercial manager hand over a customer commitment, even while the owner is active', async () => {
    const boss = ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_ORG_READ_SCOPE]);
    assert.deepEqual(await authority(boss, customer), { kind: 'customer_manager', range: 'org' });
    assert.deepEqual(await authority(boss, customer, false), { kind: 'customer_manager', range: 'org' });
  });

  it('team range needs a direct report as account owner', async () => {
    const jefe = ctx('m-jefeA', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]);
    assert.deepEqual(await authority(jefe, customer), { kind: 'customer_manager', range: 'team' });
    const other = ctx('m-jefeB', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]);
    assert.equal(await authority(other, customer), null);
  });

  it('a read scope without the manage scope, or the manage scope without range, is not enough', async () => {
    assert.equal(await authority(ctx('m-gerente', [COMMERCIAL_ORG_READ_SCOPE]), customer), null);
    assert.equal(await authority(ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE]), customer), null);
    assert.equal(await authority(ctx('m-admin', [PEOPLE_ADMIN_SCOPE]), customer, false), null);
    assert.equal(await authority(ctx('m-ops', [ISSUE_MANAGE_SCOPE]), customer, false), null);
  });

  it('people.admin hands over an internal commitment only once its owner has no access', async () => {
    const admin = ctx('m-admin', [PEOPLE_ADMIN_SCOPE]);
    assert.equal(await authority(admin, internal, true), null);
    assert.deepEqual(await authority(admin, internal, false), { kind: 'workforce_continuity' });
    assert.deepEqual(await authority(admin, supplier, false), { kind: 'workforce_continuity' });
    assert.equal(await authority(ctx('m-ops', [ISSUE_MANAGE_SCOPE]), internal, false), null);
  });

  it('a commitment linked to another record without a customer has no handover authority', async () => {
    assert.equal(await authority(ctx('m-admin', [PEOPLE_ADMIN_SCOPE]), linkedToWork, false), null);
    const boss = ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_ORG_READ_SCOPE]);
    assert.equal(await authority(boss, linkedToWork, false), null);
  });

  it('refuses another tenant, an inactive member and a missing customer record', async () => {
    const boss = ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_ORG_READ_SCOPE]);
    assert.equal(await authority(boss, { ...customer, organizationId: 'org-2' }), null);
    assert.equal(
      await authority(ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_ORG_READ_SCOPE], 'suspended'), customer),
      null,
    );
    assert.equal(await authority(boss, { ...customer, partyId: 'ghost' }), null);
  });
});

describe('commitment handover target', () => {
  const holder = (actor: QueryContext) => new CommitmentHandoverAuthorizer(actor, deps);

  it('a customer commitment only goes to someone who can work that customer', async () => {
    const boss = ctx('m-gerente', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_ORG_READ_SCOPE]);
    const handover = { kind: 'customer_manager', range: 'org' } as const;
    // The account owner and an org.read holder can read the customer; an unrelated advisor cannot.
    assert.equal(await holder(boss).mayHold(customer, ctx('m-advisorA'), handover), true);
    assert.equal(await holder(boss).mayHold(customer, ctx('m-reader', [COMMERCIAL_ORG_READ_SCOPE]), handover), true);
    assert.equal(await holder(boss).mayHold(customer, ctx('m-advisorB'), handover), false);
    assert.equal(await holder(boss).mayHold(customer, ctx('m-advisorA', [], 'suspended'), handover), false);
  });

  it('team range limits the target to the manager or a direct report who can work the customer', async () => {
    const jefe = ctx('m-jefeA', [COMMERCIAL_WORK_MANAGE_SCOPE, COMMERCIAL_TEAM_READ_SCOPE]);
    const handover = { kind: 'customer_manager', range: 'team' } as const;
    assert.equal(await holder(jefe).mayHold(customer, ctx('m-advisorA'), handover), true);
    // An org.read holder can read the customer but is outside the manager's team.
    assert.equal(await holder(jefe).mayHold(customer, ctx('m-reader', [COMMERCIAL_ORG_READ_SCOPE]), handover), false);
  });

  it('an internal commitment goes to any active member; a linked-record one only stays with its owner', async () => {
    const admin = ctx('m-admin', [PEOPLE_ADMIN_SCOPE]);
    assert.equal(await holder(admin).mayHold(internal, ctx('m-any'), { kind: 'workforce_continuity' }), true);
    assert.equal(await holder(admin).mayHold(linkedToWork, ctx('m-any'), { kind: 'workforce_continuity' }), false);
    assert.equal(await holder(ctx('m-buyer')).mayHold(linkedToWork, ctx('m-any'), { kind: 'owner' }), true);
  });
});
