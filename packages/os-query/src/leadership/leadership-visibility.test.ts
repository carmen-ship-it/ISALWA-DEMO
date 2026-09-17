import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SCOPE_KEYS,
  COMMAND_REQUIRED_SCOPES,
  COMMERCIAL_READ_SCOPE_KEYS,
} from '@isalwa/os-contracts';
import { memberHasGrantedScope, memberHasScope } from '@isalwa/os-domain';
import { AttentionQueryService } from '../work/attention-query-service';
import { ApprovalQueryService } from '../work/approval-query-service';
import { CommercialQueryService } from '../commercial/commercial-query-service';
import { MemberQueryService } from '../member/member-query-service';
import { WorkQueryService } from '../work/work-query-service';
import { assertApprovalListScope, canViewApproval } from '../work/work-auth';
import type { QueryContext } from '../query-context';
import type {
  StoredOpportunityReadModel,
  StoredOrderReadModel,
  StoredQuoteReadModel,
  StoredWorkReadModel,
} from '../projection-store-port';
import { directReportMemberIds, type ManagerAssignmentSlice } from './direct-reports';

const AS_OF = new Date('2026-09-13T16:00:00.000Z');
const ORG = 'org-a';
const OTHER_ORG = 'org-b';

function ctx(memberId: string, roleKeys: string[], organizationId = ORG): QueryContext {
  return {
    organizationId,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: AS_OF,
    auth: {
      memberId,
      organizationId,
      accessStatus: 'active',
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function opportunity(id: string, ownerMemberId: string, organizationId = ORG): StoredOpportunityReadModel {
  return {
    opportunityId: id,
    organizationId,
    partyId: 'party-1',
    commercialAccountId: null,
    ownerMemberId,
    title: id,
    stage: 'qualification',
    status: 'open',
    expectedValueCentavos: 100n,
    closedAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function quote(
  id: string,
  ownerMemberId: string,
  status: string,
  organizationId = ORG,
): StoredQuoteReadModel {
  return {
    quoteId: id,
    organizationId,
    partyId: 'party-1',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId,
    quoteNumber: id,
    status,
    currency: 'BOB',
    subtotalCentavos: 10n,
    headerDiscountCentavos: 0n,
    totalCentavos: 10n,
    revisionNumber: 1,
    notes: null,
    submittedAt: status === 'submitted' ? AS_OF : null,
    cancelledAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function work(
  id: string,
  ownerMemberId: string,
  extras: Partial<StoredWorkReadModel> = {},
): StoredWorkReadModel {
  return {
    workItemId: id,
    organizationId: ORG,
    title: id,
    description: null,
    status: 'open',
    priority: 'normal',
    ownerMemberId,
    createdByMemberId: ownerMemberId,
    subjectType: 'work_item',
    subjectId: id,
    dueAt: '2026-09-20T16:00:00.000Z',
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    approvalStatus: 'none',
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    lastEventId: null,
    lastOccurredAt: null,
    lastReassignedAt: null,
    updatedAt: AS_OF,
    ...extras,
  };
}

function order(id: string, ownerMemberId: string): StoredOrderReadModel {
  return {
    orderId: id,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: null,
    quoteId: 'q-1',
    ownerMemberId,
    orderNumber: id,
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 10n,
    headerDiscountCentavos: 0n,
    totalCentavos: 10n,
    cancelledAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

const JEFE = 'mem-jefe';
const REPORT = 'mem-report';
const OTHER = 'mem-other';
const GRANDCHILD = 'mem-grand';
const GERENTE = 'mem-gerente';
const SALES = 'mem-sales';

function lookup(reports: string[]) {
  return {
    async listDirectReportMemberIds(organizationId: string, managerMemberId: string) {
      if (organizationId !== ORG || managerMemberId !== JEFE) return [];
      return reports;
    },
  };
}

function store() {
  const opportunities = [
    opportunity('opp-jefe', JEFE),
    opportunity('opp-self', SALES),
    opportunity('opp-report', REPORT),
    opportunity('opp-other', OTHER),
    opportunity('opp-grand', GRANDCHILD),
    opportunity('opp-foreign', REPORT, OTHER_ORG),
  ];
  const quotes = [
    quote('q-draft-report', REPORT, 'draft'),
    quote('q-sub-report', REPORT, 'submitted'),
    quote('q-other', OTHER, 'draft'),
    quote('q-self', SALES, 'draft'),
  ];
  const workItems = [
    work('w-report', REPORT),
    work('w-report-overdue', REPORT, { dueAt: '2026-09-01T16:00:00.000Z', subjectType: 'party' }),
    work('w-report-follow', REPORT, { subjectType: 'commercial_account', subjectId: 'acc-1' }),
    work('w-other', OTHER),
    work('w-foreign', REPORT, { organizationId: OTHER_ORG }),
  ];
  const orders = [order('o-report', REPORT), order('o-self', SALES)];
  const calls: Array<{ organizationId: string; ownerMemberIds?: readonly string[] }> = [];

  const projection = {
    calls,
    async getFreshness() {
      return { isStale: false };
    },
    async listOpportunityReadModels(organizationId: string, query: { ownerMemberId?: string; ownerMemberIds?: readonly string[]; status?: string }) {
      calls.push({ organizationId, ownerMemberIds: query.ownerMemberIds });
      return {
        hasMore: false,
        items: opportunities.filter((item) => {
          if (item.organizationId !== organizationId) return false;
          if (query.ownerMemberId && item.ownerMemberId !== query.ownerMemberId) return false;
          if (query.ownerMemberIds && !query.ownerMemberIds.includes(item.ownerMemberId)) return false;
          if (query.status && item.status !== query.status) return false;
          return true;
        }),
      };
    },
    async getOpportunityReadModel(organizationId: string, opportunityId: string) {
      return opportunities.find((item) => item.organizationId === organizationId && item.opportunityId === opportunityId) ?? null;
    },
    async listQuoteReadModels(organizationId: string, query: { ownerMemberId?: string; ownerMemberIds?: readonly string[]; status?: string }) {
      return {
        hasMore: false,
        items: quotes.filter((item) => {
          if (item.organizationId !== organizationId) return false;
          if (query.ownerMemberId && item.ownerMemberId !== query.ownerMemberId) return false;
          if (query.ownerMemberIds && !query.ownerMemberIds.includes(item.ownerMemberId)) return false;
          if (query.status && item.status !== query.status) return false;
          return true;
        }),
      };
    },
    async getQuoteReadModel(organizationId: string, quoteId: string) {
      return quotes.find((item) => item.organizationId === organizationId && item.quoteId === quoteId) ?? null;
    },
    async listQuoteLineReadModels() {
      return [];
    },
    async listOrderReadModels(organizationId: string, query: { ownerMemberId?: string; ownerMemberIds?: readonly string[] }) {
      return {
        hasMore: false,
        items: orders.filter((item) => {
          if (item.organizationId !== organizationId) return false;
          if (query.ownerMemberId && item.ownerMemberId !== query.ownerMemberId) return false;
          if (query.ownerMemberIds && !query.ownerMemberIds.includes(item.ownerMemberId)) return false;
          return true;
        }),
      };
    },
    async getOrderReadModel(organizationId: string, orderId: string) {
      return orders.find((item) => item.organizationId === organizationId && item.orderId === orderId) ?? null;
    },
    async listWorkReadModels(
      organizationId: string,
      query: {
        ownerMemberId?: string;
        ownerMemberIds?: readonly string[];
        dueBefore?: Date;
        subjectTypes?: readonly string[];
        status?: string;
      },
    ) {
      return {
        hasMore: false,
        items: workItems.filter((item) => {
          if (item.organizationId !== organizationId) return false;
          if (query.ownerMemberId && item.ownerMemberId !== query.ownerMemberId) return false;
          if (query.ownerMemberIds && !query.ownerMemberIds.includes(item.ownerMemberId)) return false;
          if (query.status && item.status !== query.status) return false;
          if (query.subjectTypes && !query.subjectTypes.includes(item.subjectType ?? '')) return false;
          if (query.dueBefore) {
            if (!item.dueAt || new Date(item.dueAt) >= query.dueBefore) return false;
          }
          return true;
        }),
      };
    },
    async getWorkReadModel(organizationId: string, workItemId: string) {
      return workItems.find((item) => item.organizationId === organizationId && item.workItemId === workItemId) ?? null;
    },
    async listAttentionReadModels(_organizationId: string, memberId: string) {
      projection.attentionMemberId = memberId;
      return { items: [], hasMore: false };
    },
    attentionMemberId: '',
    async listApprovalReadModels() {
      return { items: [], hasMore: false };
    },
  };

  return projection;
}

function commercial(reports = [REPORT]) {
  const projection = store();
  return {
    projection,
    service: new CommercialQueryService({
      projectionStore: projection as never,
      encodeOpportunityCursor: () => 'c',
      encodeQuoteCursor: () => 'c',
      encodeOrderCursor: () => 'c',
      directReports: lookup(reports),
    }),
  };
}

function workService(reports = [REPORT]) {
  const projection = store();
  return {
    projection,
    service: new WorkQueryService({
      projectionStore: projection as never,
      encodeCursor: () => 'c',
      directReports: lookup(reports),
    }),
  };
}

describe('pilot leadership visibility', () => {
  it('does not add the read scopes to admin or command authority', () => {
    for (const scope of COMMERCIAL_READ_SCOPE_KEYS) {
      assert.equal((ADMIN_SCOPE_KEYS as readonly string[]).includes(scope), false);
      assert.equal(Object.values(COMMAND_REQUIRED_SCOPES).includes(scope as never), false);
    }
    assert.equal(COMMAND_REQUIRED_SCOPES.ReassignWork, 'people.admin');
    assert.equal(COMMAND_REQUIRED_SCOPES.Approve, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.CreateOrder, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.AssignOpportunityOwner, 'member_active');

    const snap = ctx(GERENTE, ['commercial.org.read']).auth;
    assert.equal(memberHasScope(snap, 'people.admin'), false);
    assert.equal(memberHasScope(snap, 'master_data.admin'), false);
    assert.equal(memberHasGrantedScope(snap, 'approval.act'), false);

    const commercialSrc = readFileSync(
      resolve(__dirname, '../../../os-commercial/src/commercial-command-service.ts'),
      'utf8',
    );
    const workSrc = readFileSync(resolve(__dirname, '../../../os-work/src/work-command-service.ts'), 'utf8');
    assert.doesNotMatch(commercialSrc, /commercial\.(team|org)\.read/);
    assert.doesNotMatch(workSrc, /commercial\.(team|org)\.read/);
    assert.match(commercialSrc, /memberHasScope\(snap, 'people\.admin'\)/);
    assert.match(workSrc, /approval\.act/);
  });

  it('keeps direct reports to one active hop', () => {
    const asOf = AS_OF;
    const rows: ManagerAssignmentSlice[] = [
      {
        organizationId: ORG,
        memberId: REPORT,
        managerMemberId: JEFE,
        effectiveAt: new Date('2026-01-01'),
        endedAt: null,
      },
      {
        organizationId: ORG,
        memberId: OTHER,
        managerMemberId: JEFE,
        effectiveAt: new Date('2026-01-01'),
        endedAt: new Date('2026-09-01'),
      },
      {
        organizationId: ORG,
        memberId: GRANDCHILD,
        managerMemberId: REPORT,
        effectiveAt: new Date('2026-01-01'),
        endedAt: null,
      },
      {
        organizationId: OTHER_ORG,
        memberId: 'foreign-report',
        managerMemberId: JEFE,
        effectiveAt: new Date('2026-01-01'),
        endedAt: null,
      },
      {
        organizationId: ORG,
        memberId: JEFE,
        managerMemberId: JEFE,
        effectiveAt: new Date('2026-01-01'),
        endedAt: null,
      },
    ];
    assert.deepEqual(directReportMemberIds(rows, ORG, JEFE, asOf), [REPORT]);
  });

  it('denies a salesperson team and org reads', async () => {
    const { service } = commercial();
    const sales = ctx(SALES, ['sales_rep']);
    await assert.rejects(
      () => service.listOpportunities(sales, { limit: 25, visibility: 'team' }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => service.listQuotes(sales, { limit: 25, visibility: 'org' }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => service.getOpportunity(sales, 'opp-report'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('lets a jefe read direct reports only', async () => {
    const { service, projection } = commercial();
    const jefe = ctx(JEFE, ['commercial.team.read']);
    const listed = await service.listOpportunities(jefe, { limit: 25, visibility: 'team', status: 'open' });
    assert.deepEqual(listed.items.map((item) => item.opportunityId), ['opp-report']);
    assert.equal(projection.calls[0]?.organizationId, ORG);

    const quotes = await service.listQuotes(jefe, { limit: 25, visibility: 'team', status: 'draft' });
    assert.deepEqual(quotes.items.map((item) => item.quoteId), ['q-draft-report']);
    const submitted = await service.listQuotes(jefe, { limit: 25, visibility: 'team', status: 'submitted' });
    assert.deepEqual(submitted.items.map((item) => item.quoteId), ['q-sub-report']);

    const own = await service.listOpportunities(jefe, { limit: 25 });
    assert.deepEqual(own.items.map((item) => item.opportunityId), ['opp-jefe']);

    const report = await service.getOpportunity(jefe, 'opp-report');
    assert.equal(report.opportunity.ownerMemberId, REPORT);

    await assert.rejects(
      () => service.getOpportunity(jefe, 'opp-other'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => service.listOpportunities(jefe, { limit: 25, visibility: 'team', ownerMemberId: OTHER }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => service.listOpportunities(jefe, { limit: 25, visibility: 'team', ownerMemberId: GRANDCHILD }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => service.getOpportunity(jefe, 'opp-foreign'),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('does not treat people.admin as the team shortcut', async () => {
    const { service } = commercial();
    const admin = ctx('mem-admin', ['people.admin']);
    await assert.rejects(
      () => service.listOpportunities(admin, { limit: 25, visibility: 'team' }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    const existing = await service.listOpportunities(admin, { limit: 25 });
    assert.ok(existing.items.some((item) => item.opportunityId === 'opp-other'));
  });

  it('lets org read see tenant commercial records without people.admin', async () => {
    const { service } = commercial();
    const gerente = ctx(GERENTE, ['commercial.org.read']);
    const listed = await service.listOpportunities(gerente, { limit: 25, visibility: 'org' });
    assert.deepEqual(
      listed.items.map((item) => item.opportunityId).sort(),
      ['opp-grand', 'opp-jefe', 'opp-other', 'opp-report', 'opp-self'],
    );
    const other = await service.getQuote(gerente, 'q-other');
    assert.equal(other.quote.ownerMemberId, OTHER);
    const personal = await service.listOpportunities(gerente, { limit: 25 });
    assert.deepEqual(personal.items, []);

    // Orders share the same leadership visibility contract as quotes/opportunities.
    const orderDetail = await service.getOrder(gerente, 'o-report');
    assert.equal(orderDetail.order.ownerMemberId, REPORT);
    const orgOrders = await service.listOrders(gerente, { limit: 25, visibility: 'org' });
    assert.deepEqual(
      orgOrders.items.map((item) => item.orderId).sort(),
      ['o-report', 'o-self'],
    );
    const personalOrders = await service.listOrders(gerente, { limit: 25 });
    assert.deepEqual(personalOrders.items, []);
  });

  it('does not let org read open Administración', async () => {
    const members = new MemberQueryService({
      store: {
        async listMembers() {
          return { items: [], hasMore: false };
        },
        async searchActiveMembers() {
          return { items: [], hasMore: false };
        },
        async getMemberSummary() {
          return null;
        },
        async listCapabilityStateOverrides() {
          return [];
        },
        async listDirectReportMemberIds() {
          return [];
        },
      },
      encodeCursor: () => 'c',
    });
    await assert.rejects(
      () => members.listMembers(ctx(GERENTE, ['commercial.org.read']), { limit: 25 }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    await assert.rejects(
      () => members.listMembers(ctx(JEFE, ['commercial.team.read']), { limit: 25 }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('reads direct-report work, overdue, and follow-ups without approval authority', async () => {
    const { service } = workService();
    const jefe = ctx(JEFE, ['commercial.team.read']);
    const open = await service.listOpenWork(jefe, { limit: 25, visibility: 'team', status: 'open' });
    assert.deepEqual(open.items.map((item) => item.workItemId).sort(), [
      'w-report',
      'w-report-follow',
      'w-report-overdue',
    ]);
    const overdue = await service.listOpenWork(jefe, {
      limit: 25,
      visibility: 'team',
      status: 'open',
      overdue: true,
    });
    assert.deepEqual(overdue.items.map((item) => item.workItemId), ['w-report-overdue']);
    const followUps = await service.listOpenWork(jefe, {
      limit: 25,
      visibility: 'team',
      status: 'open',
      followUpOnly: true,
    });
    assert.deepEqual(followUps.items.map((item) => item.workItemId).sort(), [
      'w-report-follow',
      'w-report-overdue',
    ]);
    await assert.rejects(
      () => service.getWorkSummary(jefe, 'w-other'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );

    assert.throws(
      () => assertApprovalListScope(ctx(GERENTE, ['commercial.org.read']), OTHER),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    assert.equal(
      canViewApproval(ctx(GERENTE, ['commercial.org.read']), {
        approvalRequestId: 'ap-1',
        organizationId: ORG,
        workItemId: 'w-other',
        subjectType: 'party',
        subjectId: 'party-1',
        requestedByMemberId: OTHER,
        approverMemberId: OTHER,
        status: 'pending',
        decisionByMemberId: null,
        decisionReason: null,
        decidedAt: null,
        requiredScope: null,
        lastEventId: null,
        lastOccurredAt: null,
        updatedAt: AS_OF,
      }),
      false,
    );
  });

  it('keeps personal attention on the signed-in member', async () => {
    const projection = store();
    const attention = new AttentionQueryService({
      projectionStore: projection as never,
      encodeCursor: () => 'c',
    });
    await attention.listAttentionItems(ctx(GERENTE, ['commercial.org.read']), {
      limit: 25,
      activeOnly: true,
    });
    assert.equal(projection.attentionMemberId, GERENTE);

    const approvals = new ApprovalQueryService({
      projectionStore: projection as never,
      encodeCursor: () => 'c',
    });
    const pending = await approvals.listPendingApprovals(ctx(GERENTE, ['commercial.org.read']), {
      limit: 25,
    });
    assert.deepEqual(pending.items, []);
  });

  it('fails closed when the team lookup is missing', async () => {
    const projection = store();
    const service = new CommercialQueryService({
      projectionStore: projection as never,
      encodeOpportunityCursor: () => 'c',
      encodeQuoteCursor: () => 'c',
      encodeOrderCursor: () => 'c',
    });
    await assert.rejects(
      () =>
        service.listOpportunities(ctx(JEFE, ['commercial.team.read']), {
          limit: 25,
          visibility: 'team',
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });
});
