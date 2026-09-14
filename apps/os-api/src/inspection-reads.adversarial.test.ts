/**
 * Inspection-only read proofs for os-api handlers that can be called with a
 * fake store/port. HTTP session attachment via resolveSession is not proven
 * here. A function pass is not an authorized HTTP pass.
 *
 * Already LOCAL_FUNCTION_VERIFIED elsewhere and not recounted:
 * search, products, quotes, timeline, questions, contacts, conversations,
 * territory, accounts, radar, pulse, lastPrice, getQuote, getInvoice,
 * health ready.
 *
 * GET /locations/:locationId is TENANT-SCOPED and AUTHORIZATION_UNPROVEN.
 * This file does not invent a location capability and does not call it authorized.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
} from '@isalwa/os-contracts';
import { ApprovalQueryService } from '../../../packages/os-query/src/work/approval-query-service';
import { AttentionQueryService } from '../../../packages/os-query/src/work/attention-query-service';
import { WorkQueryService } from '../../../packages/os-query/src/work/work-query-service';
import { PartyQueryService } from '../../../packages/os-query/src/party/party-query-service';
import { PartyTimelineQueryService } from '../../../packages/os-query/src/party/party-timeline-query-service';
import { MemberQueryService } from '../../../packages/os-query/src/member/member-query-service';
import { CapabilityQueryService } from '../../../packages/os-query/src/capability/capability-query-service';
import { CommercialQueryService } from '../../../packages/os-query/src/commercial/commercial-query-service';
import type { QueryContext } from '../../../packages/os-query/src/query-context';

const ORG = 'org-session-alpha';
const FOREIGN = 'org-foreign-zeta';
const MEMBER = 'member-session';
const OTHER = 'member-other';
const AS_OF = new Date('2026-09-14T12:00:00.000Z');
const FOREIGN_NAME = 'ZetaForeignName';
const FOREIGN_PHONE = '+59170000077';
const FOREIGN_PRICE = '990077';
const FOREIGN_COUNT = 770077;
const FOREIGN_ID = 'id-foreign-zeta';
const SESSION_NAME = 'AlphaSessionName';
const PARTY = 'party-session';

const FOREIGN_TOKENS = [FOREIGN, FOREIGN_NAME, FOREIGN_PHONE, FOREIGN_PRICE, String(FOREIGN_COUNT), FOREIGN_ID];

type Call = { method: string; organizationId?: string; extra?: unknown };

function ctx(roleKeys: string[] = [], accessStatus = 'active'): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: MEMBER,
    personId: 'person-session',
    authIdentityId: 'auth-session',
    correlationId: 'corr-session',
    effectiveAt: AS_OF,
    auth: {
      memberId: MEMBER,
      organizationId: ORG,
      accessStatus,
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function assertNoForeign(value: unknown, calls: Call[]): void {
  const serialized = JSON.stringify(value);
  for (const token of FOREIGN_TOKENS) {
    assert.equal(serialized.includes(token), false, `leaked ${token}`);
  }
  assert.equal(
    calls.some((call) => call.organizationId === FOREIGN),
    false,
    'queried the foreign organization',
  );
}

async function denial(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (err) {
    return err instanceof Error ? err.message : 'UNKNOWN';
  }
  return 'ALLOWED';
}

function freshness(organizationId: string) {
  return {
    consumerKey: 'inspection',
    organizationId,
    lastSuccessAt: null,
    lastEventOccurredAt: null,
    pendingOutboxCount: organizationId === FOREIGN ? FOREIGN_COUNT : 0,
    isStale: false,
    lastError: null,
    rebuiltAt: null,
  };
}

function party(id: string, organizationId: string, displayName: string, phone: string | null) {
  return {
    partyId: id,
    organizationId,
    partyKind: 'organization',
    displayName,
    legalName: displayName,
    status: 'active',
    activeRoleKeys: ['customer'],
    hasCommercialAccount: false,
    commercialAccountStatus: null,
    mergedIntoPartyId: null,
    duplicateStatus: null,
    searchText: displayName,
    primaryPhone: phone,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function work(id: string, organizationId: string, ownerMemberId: string, title: string) {
  return {
    workItemId: id,
    organizationId,
    title,
    description: null,
    status: 'open',
    priority: 'normal',
    ownerMemberId,
    createdByMemberId: ownerMemberId,
    subjectType: null,
    subjectId: null,
    dueAt: null,
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    approvalStatus: 'none' as const,
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    lastEventId: null,
    lastOccurredAt: null,
    lastReassignedAt: null,
    updatedAt: AS_OF,
  };
}

function approval(id: string, organizationId: string, approverMemberId: string, reason: string) {
  return {
    approvalRequestId: id,
    organizationId,
    workItemId: 'work-1',
    subjectType: 'quote',
    subjectId: id,
    requestedByMemberId: approverMemberId,
    approverMemberId,
    status: 'pending',
    decisionByMemberId: null,
    decisionReason: reason,
    decidedAt: null,
    requiredScope: null,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function attention(id: string, organizationId: string, memberId: string, detail: string) {
  return {
    attentionKey: id,
    organizationId,
    memberId,
    attentionType: 'overdue_work',
    reasonCode: 'due',
    reasonDetail: { label: detail },
    resourceType: 'work_item',
    resourceId: id,
    workItemId: id,
    approvalRequestId: null,
    subjectType: null,
    subjectId: null,
    isActive: true,
    derivedAt: AS_OF,
    updatedAt: AS_OF,
  };
}

function opportunity(id: string, organizationId: string, ownerMemberId: string, title: string) {
  return {
    opportunityId: id,
    organizationId,
    partyId: PARTY,
    commercialAccountId: null,
    ownerMemberId,
    title,
    stage: 'qualify',
    status: 'open',
    expectedValueCentavos: organizationId === FOREIGN ? BigInt(FOREIGN_PRICE) : 100n,
    closedAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function quote(id: string, organizationId: string, ownerMemberId: string, number: string) {
  const amount = organizationId === FOREIGN ? BigInt(FOREIGN_PRICE) : 100n;
  return {
    quoteId: id,
    organizationId,
    partyId: PARTY,
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId,
    quoteNumber: number,
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: amount,
    headerDiscountCentavos: 0n,
    totalCentavos: amount,
    revisionNumber: 1,
    notes: number,
    submittedAt: null,
    cancelledAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function order(id: string, organizationId: string, ownerMemberId: string, number: string) {
  const amount = organizationId === FOREIGN ? BigInt(FOREIGN_PRICE) : 100n;
  return {
    orderId: id,
    organizationId,
    partyId: PARTY,
    commercialAccountId: null,
    quoteId: 'quote-session',
    ownerMemberId,
    orderNumber: number,
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: amount,
    headerDiscountCentavos: 0n,
    totalCentavos: amount,
    cancelledAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
  };
}

function memberRow(id: string, organizationId: string, displayName: string) {
  return {
    memberId: id,
    organizationId,
    personId: `person-${id}`,
    givenName: displayName,
    familyName: displayName,
    displayName,
    email: `${id}@example.test`,
    accessStatus: 'active',
    employmentStatus: 'active',
    employmentStartedAt: AS_OF.toISOString(),
    employmentEndedAt: null,
    roleKeys: ['sales_rep'],
    departmentId: null,
    departmentName: null,
    managerMemberId: null,
    activeDelegationCount: 0,
  };
}

function sameOrg<T extends { organizationId: string }>(rows: T[], organizationId: string): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}

const NEWLY_VERIFIED = [
  'PartyQueryService.searchParties',
  'PartyTimelineQueryService.listPartyTimeline',
  'MemberQueryService.listMembers',
  'MemberQueryService.listActiveMemberOptions',
  'MemberQueryService.getMember',
  'CapabilityQueryService.getCapabilityState',
  'ApprovalQueryService.listPendingApprovals',
  'ApprovalQueryService.listSubjectApprovals',
  'ApprovalQueryService.getApproval',
  'AttentionQueryService.listAttentionItems',
  'WorkQueryService.listOpenWork',
  'WorkQueryService.getWorkSummary',
  'CommercialQueryService.listOpportunities',
  'CommercialQueryService.getOpportunity',
  'CommercialQueryService.listQuotes',
  'CommercialQueryService.getQuote',
  'CommercialQueryService.listOrders',
  'CommercialQueryService.getOrder',
] as const;

/**
 * These routes now have a local HTTP proof in route-auth-path.http.test.ts.
 * Location detail remains AUTHORIZATION_UNPROVEN. Party detail has no
 * dedicated read capability beyond the session tenant predicate.
 */
const UNPROVEN_AUTH_PATH = [] as const;

const HTTP_CLASSIFICATION: Record<string, string> = {
  'GET /parties': 'LOCAL_FUNCTION_VERIFIED',
  'GET /parties/:partyId/timeline': 'LOCAL_FUNCTION_VERIFIED',
  'GET /members': 'LOCAL_FUNCTION_VERIFIED',
  'GET /members/active-options': 'LOCAL_FUNCTION_VERIFIED',
  'GET /members/:memberId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /capabilities': 'LOCAL_FUNCTION_VERIFIED',
  'GET /approvals': 'LOCAL_FUNCTION_VERIFIED',
  'GET /approvals/subject': 'LOCAL_FUNCTION_VERIFIED',
  'GET /approvals/:approvalRequestId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /attention': 'LOCAL_FUNCTION_VERIFIED',
  'GET /work-items': 'LOCAL_FUNCTION_VERIFIED',
  'GET /work-items/:workItemId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /opportunities': 'LOCAL_FUNCTION_VERIFIED',
  'GET /opportunities/:opportunityId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /quotes': 'LOCAL_FUNCTION_VERIFIED',
  'GET /quotes/:quoteId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /orders': 'LOCAL_FUNCTION_VERIFIED',
  'GET /orders/:orderId': 'LOCAL_FUNCTION_VERIFIED',
  'GET /health/ready': 'ALREADY_VERIFIED_ELSEWHERE',
  'GET /session/authorization': 'ALREADY_VERIFIED_ELSEWHERE',
  'GET /health': 'NON_TENANT',
  'GET /dev/status': 'NON_TENANT',
  'GET /locations/:locationId':
    'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED|TENANT-SCOPED|AUTHORIZATION_UNPROVEN',
  'GET /parties/:partyId': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED|AUTHORIZATION_UNPROVEN',
  'GET /parties/:partyId/locations':
    'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED|AUTHORIZATION_UNPROVEN',
  'GET /operations/outbox': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED',
  'GET /operations/outbox/dead-letters': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED',
  'GET /operations/outbox/dead-letters/:outboxId': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED',
  'GET /quotes/:quoteId/pdf': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED',
  'GET /session/me': 'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED',
};

function getRoutes(source: string): string[] {
  const routes: string[] = [];
  for (const chunk of source.split(/@Controller\(/).slice(1)) {
    const prefix = chunk.match(/^['"]([^'"]*)['"]/)?.[1] ?? '';
    for (const match of chunk.matchAll(/@Get\(\s*(?:['"]([^'"]*)['"])?\s*\)/g)) {
      const sub = match[1] ?? '';
      const segments = [prefix, sub].filter((part) => part.length > 0);
      routes.push(`GET /${segments.join('/')}`);
    }
  }
  return routes;
}

describe('os-api inspection read inventory', () => {
  it('classifies every GET and does not recount the 15 already-verified reads as new', () => {
    const dir = new URL('.', import.meta.url).pathname;
    const found = readdirSync(dir)
      .filter((name) => name.endsWith('.controller.ts'))
      .flatMap((name) => getRoutes(readFileSync(join(dir, name), 'utf8')))
      .sort();
    const classified = Object.keys(HTTP_CLASSIFICATION).sort();
    assert.deepEqual(found, classified);
    assert.equal(NEWLY_VERIFIED.length, 18);
    assert.equal(UNPROVEN_AUTH_PATH.length, 0);
    assert.equal(
      HTTP_CLASSIFICATION['GET /locations/:locationId'],
      'AUTH_PATH_VERIFIED_LOCAL|LOCAL_HTTP_VERIFIED|TENANT-SCOPED|AUTHORIZATION_UNPROVEN',
    );
    assert.equal(HTTP_CLASSIFICATION['GET /health/ready'], 'ALREADY_VERIFIED_ELSEWHERE');
    assert.equal(
      Object.values(HTTP_CLASSIFICATION).filter((value) => value === 'LOCAL_FUNCTION_VERIFIED').length,
      NEWLY_VERIFIED.length,
    );
  });

  it('records GET /locations/:locationId as tenant-scoped and authorization-unproven', () => {
    const source = readFileSync(new URL('./locations.controller.ts', import.meta.url), 'utf8');
    assert.match(source, /getLocationInOrg\(session\.organizationId,\s*locationId\)/);
    assert.equal(source.includes('assertQueryScope'), false);
    assert.equal(source.includes('PEOPLE_ADMIN'), false);
    assert.equal(source.includes('location.capability'), false);
    assert.equal(source.includes('LOCATION_'), false);
    assert.match(source, /resolveSession\(/);
    assert.equal(HTTP_CLASSIFICATION['GET /locations/:locationId']?.includes('AUTHORIZATION_UNPROVEN'), true);
    assert.equal(HTTP_CLASSIFICATION['GET /locations/:locationId']?.includes('fully'), false);
  });
});

describe('PartyQueryService.searchParties', () => {
  it('checks member_active, not a named scope, and excludes foreign rows', async () => {
    const calls: Call[] = [];
    const rows = [
      party(PARTY, ORG, SESSION_NAME, '+59171111111'),
      party(FOREIGN_ID, FOREIGN, FOREIGN_NAME, FOREIGN_PHONE),
    ];
    const service = new PartyQueryService({
      projectionStore: {
        async searchParties(organizationId: string) {
          calls.push({ method: 'searchParties', organizationId });
          return { items: sameOrg(rows, organizationId), hasMore: false };
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeCursor: () => 'cursor',
    });

    const allowed = await service.searchParties(ctx(), {});
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.items[0]?.displayName, SESSION_NAME);
    assert.equal(allowed.freshness?.pendingOutboxCount, 0);
    assertNoForeign(allowed, calls);

    calls.length = 0;
    assert.equal(await denial(() => service.searchParties(ctx([], 'revoked'), {})), 'ACCESS_REVOKED');
    assert.equal(calls.length, 0);
  });
});

describe('PartyTimelineQueryService.listPartyTimeline', () => {
  it('checks member_active and treats a foreign party id as missing', async () => {
    const calls: Call[] = [];
    const service = new PartyTimelineQueryService({
      projectionStore: {
        async listPartyTimelineEntries(organizationId: string, partyId: string) {
          calls.push({ method: 'listPartyTimelineEntries', organizationId, extra: partyId });
          if (organizationId !== ORG) {
            return {
              items: [
                {
                  entryId: FOREIGN_ID,
                  organizationId,
                  partyId,
                  eventType: 'note',
                  occurredAt: AS_OF,
                  actorMemberId: null,
                  correlationId: 'c',
                  primaryEntityType: 'party',
                  primaryEntityId: partyId,
                  factsJson: { note: FOREIGN_NAME },
                  updatedAt: AS_OF,
                },
              ],
              hasMore: false,
            };
          }
          return {
            items: [
              {
                entryId: 'entry-session',
                organizationId,
                partyId,
                eventType: 'note',
                occurredAt: AS_OF,
                actorMemberId: MEMBER,
                correlationId: 'c',
                primaryEntityType: 'party',
                primaryEntityId: partyId,
                factsJson: { note: SESSION_NAME },
                updatedAt: AS_OF,
              },
            ],
            hasMore: false,
          };
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeCursor: () => 'cursor',
      partyExists: async (organizationId, partyId) => {
        calls.push({ method: 'partyExists', organizationId, extra: partyId });
        return organizationId === ORG && partyId === PARTY;
      },
    });

    const allowed = await service.listPartyTimeline(ctx(), PARTY, {});
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.freshness && (allowed.freshness as { pendingOutboxCount: number }).pendingOutboxCount, 0);
    assertNoForeign(allowed, calls);

    const missing = await denial(() => service.listPartyTimeline(ctx(), 'missing-party', {}));
    const foreign = await denial(() => service.listPartyTimeline(ctx(), FOREIGN_ID, {}));
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, missing);
    assert.equal(calls.some((call) => call.organizationId === FOREIGN), false);
  });
});

describe('MemberQueryService', () => {
  const rows = [
    memberRow(MEMBER, ORG, SESSION_NAME),
    memberRow(FOREIGN_ID, FOREIGN, FOREIGN_NAME),
  ];

  function service(calls: Call[]) {
    return new MemberQueryService({
      store: {
        async listMembers(organizationId: string) {
          calls.push({ method: 'listMembers', organizationId });
          return { items: sameOrg(rows, organizationId), hasMore: false };
        },
        async searchActiveMembers(organizationId: string) {
          calls.push({ method: 'searchActiveMembers', organizationId });
          return { items: [], hasMore: false };
        },
        async getMemberSummary(organizationId: string, memberId: string) {
          calls.push({ method: 'getMemberSummary', organizationId, extra: memberId });
          return sameOrg(rows, organizationId).find((row) => row.memberId === memberId) ?? null;
        },
        async listCapabilityStateOverrides() {
          return [];
        },
        async listDirectReportMemberIds() {
          return [];
        },
      },
      encodeCursor: () => 'cursor',
    });
  }

  it('listMembers checks people.admin and does not query on the wrong capability', async () => {
    const calls: Call[] = [];
    const members = service(calls);
    const allowed = await members.listMembers(ctx([PEOPLE_ADMIN_SCOPE]), {});
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.items[0]?.displayName, SESSION_NAME);
    assertNoForeign(allowed, calls);

    calls.length = 0;
    assert.equal(
      await denial(() => members.listMembers(ctx([COMMERCIAL_TEAM_READ_SCOPE]), {})),
      'PERMISSION_DENIED',
    );
    assert.equal(calls.length, 0);
  });

  it('getMember and active options check member_active only and hide a foreign id', async () => {
    const calls: Call[] = [];
    const members = service(calls);
    const one = await members.getMember(ctx(), MEMBER);
    assert.equal(one.displayName, SESSION_NAME);
    const options = await members.listActiveMemberOptions(ctx());
    assert.deepEqual(
      options.items.map((item) => item.displayName),
      [SESSION_NAME],
    );
    assertNoForeign({ one, options }, calls);

    const missing = await denial(() => members.getMember(ctx(), 'missing-member'));
    const foreign = await denial(() => members.getMember(ctx(), FOREIGN_ID));
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, missing);
    assert.equal(calls.some((call) => call.organizationId === FOREIGN), false);
  });
});

describe('CapabilityQueryService.getCapabilityState', () => {
  it('checks member_active and does not apply the foreign organization override', async () => {
    const calls: Call[] = [];
    const service = new CapabilityQueryService({
      store: {
        async listCapabilityStateOverrides(organizationId: string) {
          calls.push({ method: 'listCapabilityStateOverrides', organizationId });
          if (organizationId === FOREIGN) {
            return [{ capabilityKey: 'finance', state: FOREIGN_NAME, updatedAt: AS_OF }];
          }
          return [{ capabilityKey: 'finance', state: 'LOCKED', updatedAt: AS_OF }];
        },
        async listMembers() {
          return { items: [], hasMore: false };
        },
        async searchActiveMembers() {
          return { items: [], hasMore: false };
        },
        async getMemberSummary() {
          return null;
        },
        async listDirectReportMemberIds() {
          return [];
        },
      },
    });

    const allowed = await service.getCapabilityState(ctx());
    assert.equal(allowed.capabilities.every((row) => row.organizationId === ORG), true);
    assert.equal(allowed.capabilities.find((row) => row.capabilityKey === 'finance')?.state, 'LOCKED');
    assertNoForeign(allowed, calls);

    calls.length = 0;
    assert.equal(await denial(() => service.getCapabilityState(ctx([], 'suspended'))), 'ACCESS_REVOKED');
    assert.equal(calls.length, 0);
  });
});

describe('ApprovalQueryService', () => {
  const rows = [
    approval('apr-session', ORG, MEMBER, SESSION_NAME),
    approval(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
  ];

  function service(calls: Call[], workStore?: object) {
    return new ApprovalQueryService({
      projectionStore: {
        async listApprovalReadModels(organizationId: string) {
          calls.push({ method: 'listApprovalReadModels', organizationId });
          const items = sameOrg(rows, organizationId);
          if (organizationId === ORG) items.push(approval(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME));
          return { items, hasMore: false };
        },
        async getApprovalReadModel(organizationId: string, approvalRequestId: string) {
          calls.push({ method: 'getApprovalReadModel', organizationId, extra: approvalRequestId });
          return sameOrg(rows, organizationId).find((row) => row.approvalRequestId === approvalRequestId) ?? null;
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeCursor: () => 'cursor',
      workStore: workStore as never,
    });
  }

  it('list checks member_active plus approval list scope and excludes foreign rows', async () => {
    const calls: Call[] = [];
    const approvals = service(calls);
    const allowed = await approvals.listPendingApprovals(ctx(), {});
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.items[0]?.decisionReason, SESSION_NAME);
    assert.equal(allowed.freshness?.pendingOutboxCount, 0);
    assertNoForeign(allowed, calls);

    calls.length = 0;
    assert.equal(
      await denial(() => approvals.listPendingApprovals(ctx(), { approverMemberId: OTHER })),
      'PERMISSION_DENIED',
    );
    assert.equal(calls.length, 0);
  });

  it('getApproval foreign id matches missing', async () => {
    const calls: Call[] = [];
    const approvals = service(calls);
    const missing = await denial(() => approvals.getApproval(ctx(), 'missing-approval'));
    const foreign = await denial(() => approvals.getApproval(ctx(), FOREIGN_ID));
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, missing);
    assert.equal(calls.some((call) => call.organizationId === FOREIGN), false);
  });

  it('listSubjectApprovals foreign subject matches missing and does not load foreign rows', async () => {
    const calls: Call[] = [];
    const approvals = service(calls, {
      async getQuoteApprovalSubject(organizationId: string, subjectId: string) {
        calls.push({ method: 'getQuoteApprovalSubject', organizationId, extra: subjectId });
        if (organizationId === ORG && subjectId === 'quote-session') return { ownerMemberId: MEMBER };
        return null;
      },
      async getOrderApprovalSubject() {
        return null;
      },
      async listApprovalsForSubject(organizationId: string, subjectType: string, subjectId: string) {
        calls.push({ method: 'listApprovalsForSubject', organizationId, extra: { subjectType, subjectId } });
        return organizationId === ORG && subjectId === 'quote-session'
          ? [
              {
                id: 'apr-session',
                organizationId: ORG,
                workItemId: 'work-1',
                subjectType,
                subjectId,
                requestedByMemberId: MEMBER,
                approverMemberId: MEMBER,
                status: 'pending',
                decisionByMemberId: null,
                decisionReason: SESSION_NAME,
                decidedAt: null,
              },
            ]
          : [
              {
                id: FOREIGN_ID,
                organizationId: FOREIGN,
                workItemId: 'work-f',
                subjectType,
                subjectId,
                requestedByMemberId: OTHER,
                approverMemberId: OTHER,
                status: 'pending',
                decisionByMemberId: null,
                decisionReason: FOREIGN_NAME,
                decidedAt: null,
              },
            ];
      },
    });

    const allowed = await approvals.listSubjectApprovals(ctx(), 'quote', 'quote-session');
    assert.equal(allowed.items.length, 1);
    assertNoForeign(allowed, calls);
    const missing = await denial(() => approvals.listSubjectApprovals(ctx(), 'quote', 'missing-quote'));
    const foreign = await denial(() => approvals.listSubjectApprovals(ctx(), 'quote', FOREIGN_ID));
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, missing);
  });
});

describe('AttentionQueryService.listAttentionItems', () => {
  it('checks member_active and passes session organization and member to the port', async () => {
    const calls: Call[] = [];
    const rows = [
      attention('att-session', ORG, MEMBER, SESSION_NAME),
      attention(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
    ];
    const service = new AttentionQueryService({
      projectionStore: {
        async listAttentionReadModels(organizationId: string, memberId: string) {
          calls.push({ method: 'listAttentionReadModels', organizationId, extra: memberId });
          return {
            items: rows.filter((row) => row.organizationId === organizationId && row.memberId === memberId),
            hasMore: false,
          };
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeCursor: () => 'cursor',
    });

    const allowed = await service.listAttentionItems(ctx(), {});
    assert.equal(allowed.items.length, 1);
    assert.equal(allowed.freshness?.pendingOutboxCount, 0);
    assert.equal(calls[0]?.extra, MEMBER);
    assertNoForeign(allowed, calls);
  });
});

describe('WorkQueryService', () => {
  const rows = [
    work('work-session', ORG, MEMBER, SESSION_NAME),
    work('work-other', ORG, OTHER, 'OtherOwnerTitle'),
    work(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
  ];

  function service(calls: Call[]) {
    return new WorkQueryService({
      projectionStore: {
        async listWorkReadModels(organizationId: string) {
          calls.push({ method: 'listWorkReadModels', organizationId });
          const items = sameOrg(rows, organizationId);
          if (organizationId === ORG) items.push(work(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME));
          return { items, hasMore: false };
        },
        async getWorkReadModel(organizationId: string, workItemId: string) {
          calls.push({ method: 'getWorkReadModel', organizationId, extra: workItemId });
          return sameOrg(rows, organizationId).find((row) => row.workItemId === workItemId) ?? null;
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeCursor: () => 'cursor',
    });
  }

  it('list checks member_active and own scope, and drops foreign rows', async () => {
    const calls: Call[] = [];
    const workQuery = service(calls);
    const allowed = await workQuery.listOpenWork(ctx(), {});
    assert.deepEqual(
      allowed.items.map((item) => item.title),
      [SESSION_NAME],
    );
    assert.equal(allowed.freshness?.pendingOutboxCount, 0);
    assertNoForeign(allowed, calls);

    calls.length = 0;
    assert.equal(
      await denial(() => workQuery.listOpenWork(ctx(), { visibility: 'org' })),
      'PERMISSION_DENIED',
    );
    assert.equal(calls.length, 0);
    assert.equal(
      await denial(() => workQuery.listOpenWork(ctx([COMMERCIAL_TEAM_READ_SCOPE]), { visibility: 'team' })),
      'PERMISSION_DENIED',
    );
  });

  it('getWorkSummary foreign id matches missing', async () => {
    const calls: Call[] = [];
    const workQuery = service(calls);
    const own = await workQuery.getWorkSummary(ctx(), 'work-session');
    assert.equal(own.work.title, SESSION_NAME);
    const missing = await denial(() => workQuery.getWorkSummary(ctx(), 'missing-work'));
    const foreign = await denial(() => workQuery.getWorkSummary(ctx(), FOREIGN_ID));
    assert.equal(missing, 'NOT_FOUND');
    assert.equal(foreign, missing);
    assertNoForeign(own, calls);
  });
});

describe('CommercialQueryService inspection reads', () => {
  const opportunities = [
    opportunity('opp-session', ORG, MEMBER, SESSION_NAME),
    opportunity(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
  ];
  const quotes = [
    quote('quote-session', ORG, MEMBER, 'Q-SESSION'),
    quote(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
  ];
  const orders = [
    order('order-session', ORG, MEMBER, 'O-SESSION'),
    order(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME),
  ];

  function service(calls: Call[]) {
    return new CommercialQueryService({
      projectionStore: {
        async listOpportunityReadModels(organizationId: string) {
          calls.push({ method: 'listOpportunityReadModels', organizationId });
          const items = sameOrg(opportunities, organizationId);
          if (organizationId === ORG) items.push(opportunity(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME));
          return { items, hasMore: false };
        },
        async getOpportunityReadModel(organizationId: string, opportunityId: string) {
          calls.push({ method: 'getOpportunityReadModel', organizationId, extra: opportunityId });
          return sameOrg(opportunities, organizationId).find((row) => row.opportunityId === opportunityId) ?? null;
        },
        async listQuoteReadModels(organizationId: string) {
          calls.push({ method: 'listQuoteReadModels', organizationId });
          const items = sameOrg(quotes, organizationId);
          if (organizationId === ORG) items.push(quote(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME));
          return { items, hasMore: false };
        },
        async getQuoteReadModel(organizationId: string, quoteId: string) {
          calls.push({ method: 'getQuoteReadModel', organizationId, extra: quoteId });
          return sameOrg(quotes, organizationId).find((row) => row.quoteId === quoteId) ?? null;
        },
        async listQuoteLineReadModels(organizationId: string, quoteId: string) {
          calls.push({ method: 'listQuoteLineReadModels', organizationId, extra: quoteId });
          if (organizationId !== ORG || quoteId !== 'quote-session') {
            return [
              {
                quoteLineId: FOREIGN_ID,
                organizationId,
                quoteId,
                lineNumber: 1,
                description: FOREIGN_NAME,
                quantity: 1,
                unitLabel: null,
                unitPriceCentavos: BigInt(FOREIGN_PRICE),
                discountCentavos: 0n,
                lineTotalCentavos: BigInt(FOREIGN_PRICE),
                productRef: null,
                updatedAt: AS_OF,
              },
            ];
          }
          return [
            {
              quoteLineId: 'line-session',
              organizationId,
              quoteId,
              lineNumber: 1,
              description: SESSION_NAME,
              quantity: 1,
              unitLabel: null,
              unitPriceCentavos: 100n,
              discountCentavos: 0n,
              lineTotalCentavos: 100n,
              productRef: null,
              updatedAt: AS_OF,
            },
          ];
        },
        async listOrderReadModels(organizationId: string) {
          calls.push({ method: 'listOrderReadModels', organizationId });
          const items = sameOrg(orders, organizationId);
          if (organizationId === ORG) items.push(order(FOREIGN_ID, FOREIGN, OTHER, FOREIGN_NAME));
          return { items, hasMore: false };
        },
        async getOrderReadModel(organizationId: string, orderId: string) {
          calls.push({ method: 'getOrderReadModel', organizationId, extra: orderId });
          return sameOrg(orders, organizationId).find((row) => row.orderId === orderId) ?? null;
        },
        async getFreshness(organizationId: string) {
          calls.push({ method: 'getFreshness', organizationId });
          return freshness(organizationId);
        },
      } as never,
      encodeOpportunityCursor: () => 'cursor',
      encodeQuoteCursor: () => 'cursor',
      encodeOrderCursor: () => 'cursor',
    });
  }

  it('lists own commercial rows and denies org visibility without commercial.org.read', async () => {
    const calls: Call[] = [];
    const commercial = service(calls);
    const listed = await commercial.listOpportunities(ctx(), {});
    assert.deepEqual(
      listed.items.map((item) => item.title),
      [SESSION_NAME],
    );
    assert.equal(listed.freshness?.pendingOutboxCount, 0);
    const quoteList = await commercial.listQuotes(ctx(), {});
    assert.deepEqual(
      quoteList.items.map((item) => item.quoteNumber),
      ['Q-SESSION'],
    );
    const orderList = await commercial.listOrders(ctx(), {});
    assert.deepEqual(
      orderList.items.map((item) => item.orderNumber),
      ['O-SESSION'],
    );
    assertNoForeign({ listed, quoteList, orderList }, calls);

    const before = calls.length;
    assert.equal(
      await denial(() => commercial.listOpportunities(ctx([PEOPLE_ADMIN_SCOPE]), { visibility: 'org' })),
      'PERMISSION_DENIED',
    );
    assert.equal(calls.length, before);
    assert.equal(
      await denial(() =>
        commercial.listOrders(ctx([COMMERCIAL_ORG_READ_SCOPE]), { ownerMemberId: OTHER }),
      ),
      'PERMISSION_DENIED',
    );
  });

  it('exact foreign commercial ids match missing and do not load foreign lines', async () => {
    const calls: Call[] = [];
    const commercial = service(calls);
    const ownQuote = await commercial.getQuote(ctx(), 'quote-session');
    assert.equal(ownQuote.quote.lines[0]?.description, SESSION_NAME);
    assert.equal(ownQuote.quote.totalCentavos, '100');

    for (const [label, missingId, foreignId, read] of [
      ['opportunity', 'missing-opp', FOREIGN_ID, (id: string) => commercial.getOpportunity(ctx(), id)],
      ['quote', 'missing-quote', FOREIGN_ID, (id: string) => commercial.getQuote(ctx(), id)],
      ['order', 'missing-order', FOREIGN_ID, (id: string) => commercial.getOrder(ctx(), id)],
    ] as const) {
      const missing = await denial(() => read(missingId));
      const foreign = await denial(() => read(foreignId));
      assert.equal(missing, 'NOT_FOUND', label);
      assert.equal(foreign, missing, label);
    }
    assert.equal(
      calls.filter((call) => call.method === 'listQuoteLineReadModels').every((call) => call.extra === 'quote-session'),
      true,
    );
    assertNoForeign(ownQuote, calls);
  });
});
