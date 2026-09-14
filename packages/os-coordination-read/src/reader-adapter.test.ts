import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DateFactsReadPort } from '../../os-read-dates/src/port';
import type { OperatingReadDb } from '../../os-read-ops/src/db-port';
import { MemoryFulfillmentReadDb } from '../../os-read-fulfillment/src/memory-db';
import {
  COORDINATION_COMPLETE_EMPTY_COPY,
  COORDINATION_INCOMPLETE_EMPTY_COPY,
  CROSS_LANE_CHANGE_REQUEST,
  MEETING_REPLACEMENT,
  getCoordinationExceptionsFromReaders,
  type CoordinationTrustedContext,
} from './index';

const PIN = '316426f272bce29924ffd4991da88ffe7d421bbd';
const PARKED = '1ab294fca3bfdefbe81402f6b00b2d9d76a3c867';
const ORG = 'org-a';

function worktreeRoot(): string {
  let dir = dirname(new URL(import.meta.url).pathname);
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('worktree root not found');
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: worktreeRoot(), encoding: 'utf8' }).trim();
}

function ctx(overrides: Partial<CoordinationTrustedContext> = {}): CoordinationTrustedContext {
  return {
    organizationId: ORG,
    actorMemberId: 'mem-1',
    grantedScopes: ['management.org.read'],
    cargo: null,
    title: null,
    accessStatus: 'active',
    asOf: '2026-09-14T16:00:00.000Z',
    ...overrides,
  };
}

function emptyOperatingDb(): OperatingReadDb {
  return {
    async listPurchaseRequests() {
      return [];
    },
    async getPurchaseRequest() {
      return null;
    },
    async listPurchaseRequestStatusHistory() {
      return [];
    },
    async listPurchaseRequestNotes() {
      return [];
    },
    async productProvenInOrganization() {
      return false;
    },
    async listProductionQuemas() {
      return [];
    },
    async listProductionQuemaTimes() {
      return [];
    },
    async listProductionQuemaProducts() {
      return [];
    },
    async listProductionTraceEntries() {
      return [];
    },
    async listOrderAllocations() {
      return [];
    },
    async getOrderAllocation() {
      return null;
    },
  };
}

function datePort(calls: string[]): DateFactsReadPort {
  return {
    async findOrderInOrganization() {
      calls.push('findOrderInOrganization');
      return { id: 'order-1', organizationId: ORG };
    },
    async findCustomerCommittedDate() {
      calls.push('findCustomerCommittedDate');
      return {
        id: 'date-1',
        organizationId: ORG,
        subjectType: 'order',
        subjectId: 'order-1',
        partyId: null,
        commercialOwnerMemberId: 'mem-1',
        committedOn: new Date('2026-09-20T00:00:00.000Z'),
        originalCommittedOn: new Date('2026-09-20T00:00:00.000Z'),
        originalReason: 'Acuerdo',
        source: 'human_explicit',
        setByMemberId: 'mem-1',
        setAt: new Date('2026-09-01T00:00:00.000Z'),
      };
    },
    async listCustomerCommittedDateRevisions() {
      calls.push('listCustomerCommittedDateRevisions');
      return [];
    },
    async findProductionInternalTargetDate() {
      calls.push('findProductionInternalTargetDate');
      return {
        id: 'target-1',
        organizationId: ORG,
        subjectType: 'order',
        subjectId: 'order-1',
        maintainedByMemberId: 'mem-prod',
        targetOn: new Date('2026-09-28T00:00:00.000Z'),
        originalTargetOn: new Date('2026-09-28T00:00:00.000Z'),
        originalReason: 'Horno',
        source: 'human_explicit',
        setByMemberId: 'mem-prod',
        setAt: new Date('2026-09-01T00:00:00.000Z'),
      };
    },
    async listProductionInternalTargetRevisions() {
      calls.push('listProductionInternalTargetRevisions');
      return [];
    },
    async listProductionDateIssues() {
      calls.push('listProductionDateIssues');
      return [];
    },
    async listCustomerDateInformedRecords() {
      calls.push('listCustomerDateInformedRecords');
      return [];
    },
  };
}

describe('getCoordinationExceptionsFromReaders', () => {
  it('keeps finished goods UNPROVEN when the reader reports a missing model and forbids the strong sentence', async () => {
    const result = await getCoordinationExceptionsFromReaders(ctx(), {
      operating: { db: emptyOperatingDb() },
    });

    assert.equal(result.ok, true);
    assert.equal(result.sources['finished-goods'].status, 'UNPROVEN');
    assert.equal(result.sources['finished-goods'].reason, 'missing_model');
    assert.equal(result.sources['finished-goods'].connected, false);
    assert.equal(result.sources['finished-goods'].factCount, null);
    assert.equal(result.sources['finished-goods'].countedAsZero, false);
    assert.equal(result.sources.allocation.status, 'NO_FACT');
    assert.equal(result.sources.allocation.connected, true);
    assert.equal(
      result.exceptions.some((item) => item.kind === 'finished_goods_awaiting_allocation'),
      false,
    );
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    assert.equal(result.coverageComplete, false);
    assert.equal(result.meetingReplacement, MEETING_REPLACEMENT);
    assert.equal(result.meetingReplacement, 'UNPROVEN');
    assert.equal(JSON.stringify(result).includes('innecesaria'), false);
  });

  it('treats an authorized date-risk reader with no ProductionDateIssue as NO_FACT, not an exception and not UNPROVEN', async () => {
    const calls: string[] = [];
    const result = await getCoordinationExceptionsFromReaders(ctx({ title: 'Gerente' }), {
      dates: { db: datePort(calls), orderIds: ['order-1'] },
    });

    assert.equal(result.sources['date-risk'].status, 'NO_FACT');
    assert.equal(result.sources['date-risk'].connected, true);
    assert.notEqual(result.sources['date-risk'].status, 'UNPROVEN');
    assert.equal(result.sources['date-risk'].countedAsZero, true);
    assert.equal(result.exceptions.some((item) => item.kind === 'customer_date_risk'), false);
    assert.equal(calls.includes('listProductionDateIssues'), true);
    assert.equal(calls.includes('findCustomerCommittedDate'), false);
    assert.equal(calls.includes('findProductionInternalTargetDate'), false);
    assert.equal(calls.includes('listCustomerCommittedDateRevisions'), false);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
  });

  it('does not treat an unqueried date-risk reader as NO_FACT', async () => {
    const result = await getCoordinationExceptionsFromReaders(ctx(), {
      dates: { db: datePort([]), orderIds: [] },
    });

    assert.equal(result.sources['date-risk'].status, 'UNPROVEN');
    assert.equal(result.sources['date-risk'].countedAsZero, false);
    assert.equal(result.sources['date-risk'].factCount, null);
  });

  it('forbids the strong sentence when prior decisions are omitted and does not read them', async () => {
    let readerCalled = false;
    const fulfillment = new MemoryFulfillmentReadDb();
    fulfillment.coordinationDecisions.push({
      id: 'dec-1',
      organizationId: ORG,
      kind: 'recorded',
      decision: 'Confirmar fecha',
      ownerLabel: 'Coordinación',
      ownerMemberId: 'mem-owner',
      dueAt: '2026-09-01',
      actorLabel: 'Isa',
      actorMemberId: 'mem-isa',
      occurredAt: new Date('2026-08-01T12:00:00.000Z'),
      linkedCaseId: 'case-1',
      notes: null,
      resolvesDecisionId: null,
      recordedAt: new Date('2026-08-01T12:00:00.000Z'),
    });

    const result = await getCoordinationExceptionsFromReaders(
      ctx({
        title: 'Auxiliar',
        grantedScopes: ['management.org.read', 'coordination.decision.record', 'operations.coordinator.record'],
        priorDecisionsReader: () => {
          readerCalled = true;
          return [];
        },
      }),
      {
        operating: { db: emptyOperatingDb() },
        fulfillment: { db: fulfillment },
      },
    );

    assert.equal(readerCalled, false);
    assert.equal(fulfillment.calls.some((call) => call.method === 'listCoordinationDecisions'), false);
    assert.equal(result.sources['prior-decisions'].status, 'UNPROVEN');
    assert.equal(result.sources['prior-decisions'].reason, 'no_coordination_read_capability');
    assert.equal(result.sources['prior-decisions'].factCount, null);
    assert.equal(result.sources['prior-decisions'].countedAsZero, false);
    assert.equal(result.exceptions.some((item) => item.kind === 'overdue_prior_decision'), false);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    assert.equal(result.crossLaneChangeRequests[0], CROSS_LANE_CHANGE_REQUEST);
    assert.equal(result.canRegisterDecision, true);
    assert.equal(result.performsWrite, false);
    assert.equal(result.inventedCapabilities.includes('coordination.decision.read' as never), false);
  });

  it('does not unlock the company board with a write scope, commercial.team.read, or title', async () => {
    const readers = { operating: { db: emptyOperatingDb() } };
    for (const grantedScopes of [
      ['commercial.team.read'],
      ['coordination.decision.record'],
      ['operations.coordinator.record'],
      ['purchasing.operational.record'],
      ['warehouse.finished_goods.allocate'],
      ['people.admin'],
    ]) {
      const result = await getCoordinationExceptionsFromReaders(
        ctx({
          grantedScopes,
          cargo: 'Gerencia',
          title: 'Auxiliar',
        }),
        readers,
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'unauthorized');
      assert.equal(result.exceptions.length, 0);
      assert.equal(result.displayCopy, null);
      assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    }

    const titled = await getCoordinationExceptionsFromReaders(
      ctx({ title: 'Auxiliar', cargo: 'Gerencia', grantedScopes: ['management.org.read'] }),
      readers,
    );
    assert.equal(titled.ok, true);
    assert.equal(titled.canRegisterDecision, false);
    assert.equal(titled.registerScope, null);

    const writer = await getCoordinationExceptionsFromReaders(
      ctx({
        title: 'Auxiliar',
        grantedScopes: ['management.org.read', 'coordination.decision.record'],
      }),
      readers,
    );
    assert.equal(writer.canRegisterDecision, true);
    assert.equal(writer.registerScope, 'coordination.decision.record');
    assert.equal(writer.performsWrite, false);
  });

  it('does not merge the parked coordination page and does not move the integrate pin', () => {
    assert.equal(git(['rev-parse', 'wave2/integrate']), PIN);
    assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD']), 'wave2/candidate-coord-wire');
    assert.notEqual(git(['rev-parse', 'HEAD']), PARKED);

    let ancestor = true;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', PARKED, 'HEAD'], {
        cwd: worktreeRoot(),
        stdio: 'ignore',
      });
    } catch {
      ancestor = false;
    }
    assert.equal(ancestor, false);
  });
});
