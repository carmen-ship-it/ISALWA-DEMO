import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canReadApproval, canViewApproval, type ApprovalReadSources } from './work-auth';
import type { QueryContext } from '../query-context';
import type { StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';

const ORG = 'org-1';

function ctx(
  memberId: string,
  opts: { roleKeys?: string[]; delegatedScopes?: string[]; delegatedApproverFor?: string[]; org?: string } = {},
): QueryContext {
  const org = opts.org ?? ORG;
  return {
    organizationId: org,
    actorMemberId: memberId,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    auth: {
      memberId,
      organizationId: org,
      accessStatus: 'active',
      roleKeys: opts.roleKeys ?? [],
      delegatedScopes: opts.delegatedScopes ?? [],
      delegatedApproverFor: opts.delegatedApproverFor ?? [],
    },
  } as unknown as QueryContext;
}

function approval(partial: Partial<StoredApprovalReadModel> = {}): StoredApprovalReadModel {
  return {
    approvalRequestId: 'a-1',
    organizationId: ORG,
    subjectType: 'organization_member',
    subjectId: 'm-subject',
    workItemId: null,
    requestedByMemberId: 'm-requester',
    approverMemberId: 'm-approver',
    status: 'pending',
    ...partial,
  } as unknown as StoredApprovalReadModel;
}

const linkedWork = {
  workItemId: 'w-1',
  organizationId: ORG,
  ownerMemberId: 'm-workowner',
  subjectType: 'organization_member',
  subjectId: 'm-subject',
  status: 'open',
  title: 'Revisar baja',
  description: null,
} as unknown as StoredWorkReadModel;

const sources: ApprovalReadSources = {
  getWorkReadModel: async (org: string, id: string) => (org === ORG && id === 'w-1' ? linkedWork : null),
  getQuoteReadModel: async () => null,
  getOrderReadModel: async () => null,
} as unknown as ApprovalReadSources;

describe('organization_member approval reads (23:27 §2)', () => {
  it('keeps the requester only while they hold people.admin', () => {
    assert.equal(canViewApproval(ctx('m-requester', { roleKeys: ['people.admin'] }), approval()), true);
    assert.equal(canViewApproval(ctx('m-requester', { roleKeys: ['sales_rep'] }), approval()), false);
  });

  it('accepts people.admin held through a current delegation', () => {
    assert.equal(canViewApproval(ctx('m-requester', { delegatedScopes: ['people.admin'] }), approval()), true);
  });

  it('keeps the approver and a delegate that may act for the approver', () => {
    assert.equal(canViewApproval(ctx('m-approver'), approval()), true);
    assert.equal(canViewApproval(ctx('m-delegate', { delegatedApproverFor: ['m-approver'] }), approval()), true);
  });

  it('does not open the approval to another people.admin, the subject member or another tenant', () => {
    assert.equal(canViewApproval(ctx('m-otheradmin', { roleKeys: ['people.admin'] }), approval()), false);
    assert.equal(canViewApproval(ctx('m-subject'), approval()), false);
    assert.equal(canViewApproval(ctx('m-requester', { roleKeys: ['people.admin'], org: 'org-2' }), approval()), false);
  });

  it('still reads through a linked work item the actor can read, and not otherwise', async () => {
    const linked = approval({ workItemId: 'w-1' });
    const read = (c: QueryContext) => canReadApproval({ ctx: c, approval: linked, sources, lookup: null, customer: null });
    assert.equal(await read(ctx('m-workowner')), true);
    assert.equal(await read(ctx('m-requester')), false);
  });

  it('leaves other subject rules unchanged: work_item requesters read through the work, not authorship', () => {
    assert.equal(canViewApproval(ctx('m-requester'), approval({ subjectType: 'work_item', subjectId: 'w-1' })), false);
  });
});
