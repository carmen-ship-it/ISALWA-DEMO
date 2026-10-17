import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PURCHASING_OPERATIONAL_RECORD_SCOPE } from '@isalwa/os-contracts';
import { canReadApproval, canReadWork, type ApprovalReadSources } from './work-auth';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from '../party/customer-visibility';
import type { QueryContext } from '../query-context';
import type { StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';

const ORG = 'org-1';

function ctx(memberId: string, scopes: string[] = []): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    auth: {
      memberId,
      organizationId: ORG,
      accessStatus: 'active',
      roleKeys: scopes,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  } as unknown as QueryContext;
}

const FACTS: Record<string, CustomerVisibilityFacts> = {
  supplier: { organizationId: ORG, partyId: 'supplier', hasCommercialAccount: false, accountOwnerMemberId: null, activeRoleKeys: ['supplier'] },
  customer: { organizationId: ORG, partyId: 'customer', hasCommercialAccount: true, accountOwnerMemberId: 'm-advisor', activeRoleKeys: ['customer'] },
  unclassified: { organizationId: ORG, partyId: 'unclassified', hasCommercialAccount: false, accountOwnerMemberId: null, activeRoleKeys: [] },
};

const lookup: CustomerVisibilityLookup = {
  getCustomerFacts: async (org, id) => (org === ORG ? (FACTS[id] ?? null) : null),
  listCustomerFacts: async (org, ids) => (org === ORG ? ids.flatMap((id) => (FACTS[id] ? [FACTS[id]] : [])) : []),
  listPartyIdsOwnedBy: async () => [],
  listActiveCoverageForAdvisor: async () => [],
};

function work(subjectId: string, partial: Partial<StoredWorkReadModel> = {}): StoredWorkReadModel {
  return {
    workItemId: `w-${subjectId}`,
    organizationId: ORG,
    title: 'Confirmar entrega de insumos',
    description: null,
    status: 'open',
    ownerMemberId: 'm-buyer',
    createdByMemberId: 'm-buyer',
    subjectType: 'party',
    subjectId,
    priority: 'normal',
    dueAt: null,
    completedAt: null,
    cancelledAt: null,
    ownershipChangeCount: 0,
    lastEventId: 'e1',
    lastOccurredAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as unknown as StoredWorkReadModel;
}

function approval(subjectId: string): StoredApprovalReadModel {
  return {
    approvalRequestId: `a-${subjectId}`,
    organizationId: ORG,
    subjectType: 'party',
    subjectId,
    workItemId: null,
    requestedByMemberId: 'm-buyer',
    approverMemberId: 'm-approver',
    status: 'pending',
  } as unknown as StoredApprovalReadModel;
}

const noSources: ApprovalReadSources = {
  getWorkReadModel: async () => null,
  getQuoteReadModel: async () => null,
  getOrderReadModel: async () => null,
} as unknown as ApprovalReadSources;

const readWork = (c: QueryContext, w: StoredWorkReadModel) => canReadWork({ ctx: c, work: w, lookup: null, customer: lookup });
const readApproval = (c: QueryContext, a: StoredApprovalReadModel) =>
  canReadApproval({ ctx: c, approval: a, sources: noSources, lookup: null, customer: lookup });

describe('work and approval reads on party subjects (NEW-R4-1)', () => {
  it('does not open supplier-subject work to an unrelated member', async () => {
    assert.equal(await readWork(ctx('m-outsider'), work('supplier')), false);
  });

  it('does not open supplier-subject approvals to an unrelated member', async () => {
    assert.equal(await readApproval(ctx('m-outsider'), approval('supplier')), false);
  });

  it('keeps the owner and the approver on supplier subjects', async () => {
    assert.equal(await readWork(ctx('m-buyer'), work('supplier')), true);
    assert.equal(await readApproval(ctx('m-approver'), approval('supplier')), true);
  });

  it('keeps Compras on open purchasing prep reviews about a supplier', async () => {
    const prep = work('supplier', { description: '[[order-prep:purchasing:01ORDER]]', ownerMemberId: 'm-advisor' });
    assert.equal(await readWork(ctx('m-compras', [PURCHASING_OPERATIONAL_RECORD_SCOPE]), prep), true);
    assert.equal(await readWork(ctx('m-outsider'), prep), false);
  });

  it('still reads customer-subject work through customer scope', async () => {
    assert.equal(await readWork(ctx('m-advisor'), work('customer')), true);
    assert.equal(await readApproval(ctx('m-advisor'), approval('customer')), true);
    assert.equal(await readWork(ctx('m-outsider'), work('customer')), false);
  });

  it('keeps unclassified parties inside the customer boundary (fail closed)', async () => {
    assert.equal(await readWork(ctx('m-outsider'), work('unclassified')), false);
    assert.equal(await readApproval(ctx('m-outsider'), approval('unclassified')), false);
  });

  it('treats a missing party as unreadable', async () => {
    assert.equal(await readWork(ctx('m-outsider'), work('ghost')), false);
  });
});
