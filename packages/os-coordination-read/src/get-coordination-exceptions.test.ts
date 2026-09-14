import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_ISSUE_SOURCE,
  type CoordinationDecisionRecord,
  type ProductionIssue,
  type PurchaseRequest,
} from '@isalwa/os-contracts';
import {
  COORDINATION_COMPLETE_EMPTY_COPY,
  COORDINATION_INCOMPLETE_EMPTY_COPY,
  CROSS_LANE_CHANGE_REQUEST,
  MEETING_REPLACEMENT,
  REQUIRED_SOURCE_CATEGORIES,
  getCoordinationExceptions,
  type CoordinationInjectedSources,
  type CoordinationTrustedContext,
} from './index';

const PIN = '316426f272bce29924ffd4991da88ffe7d421bbd';
const PARKED = '1ab294fca3bfdefbe81402f6b00b2d9d76a3c867';
const ORG = 'org-a';
const OTHER = 'org-b';

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

function connectedZero(): CoordinationInjectedSources {
  return {
    dateRisk: { status: 'NO_FACT' },
    production: { status: 'NO_FACT' },
    purchase: { status: 'NO_FACT' },
    release: { status: 'NO_FACT' },
    finishedGoods: { status: 'NO_FACT' },
    allocation: { status: 'NO_FACT' },
    warehouseExit: { status: 'NO_FACT' },
    delivery: { status: 'NO_FACT' },
    customerInformed: { status: 'NO_FACT' },
    priorDecisions: { status: 'NO_FACT' },
  };
}

function ctx(overrides: Partial<CoordinationTrustedContext> = {}): CoordinationTrustedContext {
  return {
    organizationId: ORG,
    actorMemberId: 'mem-1',
    grantedScopes: ['management.org.read'],
    cargo: null,
    title: null,
    asOf: '2026-09-14T16:00:00.000Z',
    sources: connectedZero(),
    ...overrides,
  };
}

function issue(overrides: Partial<ProductionIssue> = {}): ProductionIssue {
  return {
    id: 'issue-1',
    organizationId: ORG,
    subjectType: 'order',
    subjectId: 'order-1',
    mayAffectProductionCalendar: false,
    mayAffectCustomerDate: true,
    source: PRODUCTION_ISSUE_SOURCE,
    note: 'El horno se detuvo.',
    recordedByMemberId: 'mem-prod',
    recordedAt: '2026-09-13T15:00:00.000Z',
    ...overrides,
  };
}

function purchase(overrides: Partial<PurchaseRequest> = {}): PurchaseRequest {
  return {
    id: 'buy-1',
    organizationId: ORG,
    requestingArea: 'Producción',
    requestedByLabel: 'Encargado',
    requestedByMemberId: null,
    description: 'Arcilla',
    quantity: '4',
    unit: 'kg',
    productionContextId: null,
    orderId: 'order-9',
    reason: 'Falta material',
    requestedAt: '2026-09-01T12:00:00.000Z',
    status: 'solicitado',
    buyerLabel: null,
    buyerMemberId: null,
    notes: [],
    statusHistory: [],
    actorLabel: 'Encargado',
    actorMemberId: null,
    source: 'manual',
    stockAuthority: 'not_official',
    reorderPolicy: 'none',
    claimsOfficialStock: false,
    triggersReorder: false,
    idempotencyKey: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function decision(overrides: Partial<CoordinationDecisionRecord> = {}): CoordinationDecisionRecord {
  return {
    id: 'dec-1',
    organizationId: ORG,
    kind: 'recorded',
    decision: 'Confirmar fecha con el cliente',
    ownerLabel: 'Coordinación',
    ownerMemberId: 'mem-owner',
    dueAt: '2026-09-01',
    actorLabel: 'Isa',
    actorMemberId: 'mem-isa',
    occurredAt: '2026-08-01T12:00:00.000Z',
    linkedCaseId: 'case-1',
    notes: null,
    resolvesDecisionId: null,
    recordedAt: '2026-08-01T12:00:00.000Z',
    grantsProductionAuthority: false,
    grantsFinanceAuthority: false,
    grantsWarehouseAuthority: false,
    ...overrides,
  };
}

describe('getCoordinationExceptions', () => {
  it('uses the weak sentence when coverage is incomplete', () => {
    const sources = connectedZero();
    delete sources.purchase;
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.ok, true);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    assert.equal(result.coverageComplete, false);
    assert.equal(result.exceptions.length, 0);
    assert.equal(result.sources.purchase.status, 'UNPROVEN');
  });

  it('uses the strong sentence only when every required source is connected and nothing is actionable', () => {
    const result = getCoordinationExceptions(ctx());

    assert.equal(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    assert.equal(result.coverageComplete, true);
    assert.equal(result.exceptions.length, 0);
    for (const category of REQUIRED_SOURCE_CATEGORIES) {
      assert.equal(result.sources[category].status, 'NO_FACT');
      assert.equal(result.sources[category].connected, true);
      assert.notEqual(result.sources[category].status, 'UNPROVEN');
    }
  });

  it('does not use the strong sentence as the default when sources are omitted', () => {
    const result = getCoordinationExceptions(ctx({ sources: {} }));

    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.equal(result.coverageComplete, false);
    for (const category of REQUIRED_SOURCE_CATEGORIES) {
      assert.equal(result.sources[category].status, 'UNPROVEN');
      assert.equal(result.sources[category].factCount, null);
      assert.equal(result.sources[category].countedAsZero, false);
    }
  });

  it('lists one actionable fact without inventing priority, owner, stock, revenue, or margin', () => {
    const sources = connectedZero();
    sources.dateRisk = { status: 'AVAILABLE', facts: [issue()] };
    const result = getCoordinationExceptions(ctx({ sources, title: 'Gerente', cargo: 'Gerencia' }));

    assert.equal(result.exceptions.length, 1);
    const [item] = result.exceptions;
    assert.equal(item?.kind, 'customer_date_risk');
    assert.equal(item?.summary, 'El horno se detuvo.');
    assert.equal(item?.priority, null);
    assert.equal(item?.ownerMemberId, null);
    assert.equal(item?.recordedOwnerLabel, null);
    assert.equal(item?.stock, null);
    assert.equal(item?.revenue, null);
    assert.equal(item?.margin, null);
    assert.equal(item?.officialStock, false);
    assert.equal(item?.predictsDelay, false);
    assert.equal(result.displayCopy, null);
    assert.equal(JSON.stringify(result).includes('alta'), false);
    assert.equal(JSON.stringify(result).includes('prioridad'), false);
  });

  it('does not treat a date flag that is false, or a foreign issue, as a company exception', () => {
    const sources = connectedZero();
    sources.dateRisk = {
      status: 'AVAILABLE',
      facts: [
        issue({ id: 'quiet', mayAffectCustomerDate: false }),
        issue({ id: 'foreign', organizationId: OTHER }),
      ],
    };
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.exceptions.length, 0);
    assert.equal(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    assert.equal(JSON.stringify(result.exceptions).includes(OTHER), false);
  });

  it('does not let title, cargo, operations.coordinator.record, or people.admin grant register', () => {
    const titled = getCoordinationExceptions(
      ctx({ title: 'Auxiliar', cargo: 'Auxiliar', grantedScopes: ['management.org.read'] }),
    );
    assert.equal(titled.ok, true);
    assert.equal(titled.canRegisterDecision, false);
    assert.equal(titled.registerScope, null);
    assert.equal(titled.performsWrite, false);

    const coordinator = getCoordinationExceptions(
      ctx({
        title: 'Auxiliar',
        grantedScopes: ['management.org.read', 'operations.coordinator.record', 'people.admin'],
      }),
    );
    assert.equal(coordinator.canRegisterDecision, false);
    assert.equal(coordinator.registerScope, null);
  });

  it('reports register only when the trusted context already holds coordination.decision.record', () => {
    const held = getCoordinationExceptions(
      ctx({
        title: 'Auxiliar',
        cargo: 'Gerencia',
        grantedScopes: ['management.org.read', 'coordination.decision.record'],
      }),
    );
    assert.equal(held.canRegisterDecision, true);
    assert.equal(held.registerScope, 'coordination.decision.record');
    assert.equal(held.performsWrite, false);
    assert.equal('register' in held, false);
  });

  it('does not unlock the company board with commercial.team.read, people.admin, cargo, or title', () => {
    const sources = connectedZero();
    sources.purchase = { status: 'AVAILABLE', facts: [purchase()] };
    for (const grantedScopes of [
      ['commercial.team.read'],
      ['people.admin'],
      ['operations.coordinator.record'],
      ['coordination.decision.record'],
      ['coordination.decision.read'],
    ]) {
      const result = getCoordinationExceptions(
        ctx({
          grantedScopes,
          cargo: 'Gerente',
          title: 'Auxiliar',
          sources,
        }),
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'unauthorized');
      assert.equal(result.exceptions.length, 0);
      assert.equal(result.displayCopy, null);
      assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
    }
  });

  it('ignores a client organization when the session organization is missing', () => {
    const result = getCoordinationExceptions(
      ctx({
        organizationId: '  ',
        sources: connectedZero(),
        grantedScopes: ['management.org.read'],
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing_organization');
    assert.equal(result.organizationId, null);
    assert.equal(result.exceptions.length, 0);
    assert.notEqual(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
  });

  it('keeps the weak sentence when a connected source has a fact but another source is uninjected', () => {
    const sources = connectedZero();
    delete sources.production;
    sources.dateRisk = { status: 'AVAILABLE', facts: [issue()] };
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.exceptions.length, 1);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.equal(result.sources.production.factCount, null);
    assert.equal(result.sources.production.countedAsZero, false);
  });

  it('does not count an uninjected source as zero', () => {
    const sources = connectedZero();
    delete sources.allocation;
    const result = getCoordinationExceptions(ctx({ sources }));
    const proof = result.sources.allocation;

    assert.equal(proof.status, 'UNPROVEN');
    assert.equal(proof.factCount, null);
    assert.equal(proof.countedAsZero, false);
    assert.notEqual(proof.factCount, 0);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
  });

  it('does not emit finished goods awaiting allocation when allocation is uninjected', () => {
    const sources = connectedZero();
    delete sources.allocation;
    sources.finishedGoods = {
      status: 'AVAILABLE',
      facts: [{ organizationId: ORG, productId: 'prod-1', quantity: '3', receiptId: 'rec-1' }],
    };
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.exceptions.length, 0);
    assert.equal(result.sources.allocation.factCount, null);
    assert.equal(result.sources.allocation.countedAsZero, false);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
  });

  it('lists unallocated finished goods only when both receipt and allocation sources are connected', () => {
    const sources = connectedZero();
    sources.finishedGoods = {
      status: 'AVAILABLE',
      facts: [{ organizationId: ORG, productId: 'prod-1', quantity: '3', receiptId: 'rec-1' }],
    };
    const result = getCoordinationExceptions(ctx({ sources }));
    const [item] = result.exceptions;

    assert.equal(result.exceptions.length, 1);
    assert.equal(item?.kind, 'finished_goods_awaiting_allocation');
    assert.equal(item?.stock, null);
    assert.equal(item?.officialStock, false);
    assert.equal(item?.priority, null);
    assert.equal(item?.availableQuantity, '3');
  });

  it('treats an ERROR source as incomplete, not as zero facts', () => {
    const sources = connectedZero();
    sources.delivery = { status: 'ERROR', reason: 'query_failed' };
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.sources.delivery.status, 'ERROR');
    assert.equal(result.sources.delivery.factCount, null);
    assert.equal(result.sources.delivery.countedAsZero, false);
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.equal(result.coverageComplete, false);
  });

  it('keeps prior-decisions UNPROVEN when no read capability exists and records the change request', () => {
    let readerCalled = false;
    const sources = connectedZero();
    delete sources.priorDecisions;
    const result = getCoordinationExceptions(
      ctx({
        sources,
        title: 'Auxiliar',
        grantedScopes: [
          'management.org.read',
          'coordination.decision.record',
          'operations.coordinator.record',
        ],
        priorDecisionsReader: () => {
          readerCalled = true;
          return [{ status: 'AVAILABLE', facts: [decision()] }];
        },
      }),
    );

    assert.equal(readerCalled, false);
    assert.equal(result.sources['prior-decisions'].status, 'UNPROVEN');
    assert.equal(result.sources['prior-decisions'].factCount, null);
    assert.equal(result.sources['prior-decisions'].countedAsZero, false);
    assert.equal(result.sources['prior-decisions'].reason, 'no_coordination_read_capability');
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.equal(result.exceptions.some((item) => item.kind === 'overdue_prior_decision'), false);
    assert.equal(result.crossLaneChangeRequests[0], CROSS_LANE_CHANGE_REQUEST);
    assert.equal(result.inventedCapabilities.includes('coordination.decision.read' as never), false);
    assert.equal(result.canRegisterDecision, true);
    assert.equal(result.performsWrite, false);
  });

  it('denies an explicit prior-decisions reader without inventing coordination.decision.read', () => {
    const sources = connectedZero();
    sources.priorDecisions = { status: 'DENIED', reason: 'no_coordination_read_capability' };
    const result = getCoordinationExceptions(ctx({ sources, title: 'Auxiliar' }));

    assert.equal(result.sources['prior-decisions'].status, 'UNPROVEN');
    assert.equal(result.displayCopy, COORDINATION_INCOMPLETE_EMPTY_COPY);
    assert.equal(result.crossLaneChangeRequests[0]?.id, 'coordination-prior-decisions-read');
    assert.match(result.crossLaneChangeRequests[0]?.request ?? '', /Do not invent coordination\.decision\.read/);
    assert.equal(result.canRegisterDecision, false);
  });

  it('lists an overdue prior decision from injected rows without inventing a read capability or a priority', () => {
    const sources = connectedZero();
    sources.priorDecisions = { status: 'AVAILABLE', facts: [decision(), decision({ id: 'other', organizationId: OTHER })] };
    const result = getCoordinationExceptions(ctx({ sources }));
    const [item] = result.exceptions;

    assert.equal(result.exceptions.length, 1);
    assert.equal(item?.kind, 'overdue_prior_decision');
    assert.equal(item?.priority, null);
    assert.equal(item?.recordedOwnerLabel, 'Coordinación');
    assert.equal(item?.ownerMemberId, null);
    assert.equal(JSON.stringify(result.exceptions).includes(OTHER), false);
  });

  it('does not mark a decision overdue without a clock', () => {
    const sources = connectedZero();
    sources.priorDecisions = { status: 'AVAILABLE', facts: [decision()] };
    const result = getCoordinationExceptions(ctx({ sources, asOf: null }));

    assert.equal(result.exceptions.length, 0);
    assert.equal(result.sources['prior-decisions'].connected, true);
    assert.equal(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
  });

  it('does not treat a released decision or a delivered purchase as an exception', () => {
    const sources = connectedZero();
    sources.release = {
      status: 'AVAILABLE',
      facts: [
        {
          id: 'rel-1',
          organization_id: ORG,
          case_id: 'case-1',
          order_id: 'order-1',
          state: 'released',
          basis: 'commercial_agreement',
          reason: 'Acuerdo',
          source: 'manual',
          actor_member_id: null,
          actor_label: 'Isa',
          decided_at: '2026-09-01T12:00:00.000Z',
          recorded_at: '2026-09-01T12:00:00.000Z',
          evidence_text: 'Acuerdo',
          evidence_reference: null,
          corrects_decision_id: null,
          idempotency_key: null,
          created_at: '2026-09-01T12:00:00.000Z',
          canonical_effect: 'none',
        },
      ],
    };
    sources.purchase = { status: 'AVAILABLE', facts: [purchase({ status: 'entregado' })] };
    const result = getCoordinationExceptions(ctx({ sources }));

    assert.equal(result.exceptions.length, 0);
    assert.equal(result.displayCopy, COORDINATION_COMPLETE_EMPTY_COPY);
  });

  it('leaves meeting replacement unproven and does not claim the Tuesday meeting is unnecessary', () => {
    const result = getCoordinationExceptions(ctx());
    const text = JSON.stringify(result);

    assert.equal(MEETING_REPLACEMENT, 'UNPROVEN');
    assert.equal(result.meetingReplacement, 'UNPROVEN');
    assert.equal(result.tuesdayStatusMeeting, 'UNPROVEN');
    assert.equal(text.includes('No hace falta una reunión'), false);
    assert.equal(text.includes('innecesaria'), false);
    assert.equal('meetingRequired' in result, false);
  });

  it('does not move the integrate pin and does not merge the parked coordination page', () => {
    assert.equal(git(['rev-parse', 'wave2/integrate']), PIN);
    assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD']), 'wave2/coordination-projection');

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
