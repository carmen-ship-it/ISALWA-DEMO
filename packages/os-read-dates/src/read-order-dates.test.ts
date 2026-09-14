import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
} from '@isalwa/os-contracts';
import {
  DATE_FACT_READ_SCOPES,
  createPrismaDateFactsReadPort,
  heldDateFactReadScopes,
  readOrderCustomerCommittedDate,
  readOrderCustomerCommittedDateHistory,
  readOrderCustomerInformedState,
  readOrderDateDelay,
  readOrderDateFacts,
  readOrderDateRisk,
  readOrderProductionInternalTargetDate,
  readOrderProductionInternalTargetHistory,
  readOrderRecordedDateDivergence,
} from './index';
import type { DateFactsReadPort, PrismaDateFactsClient, TrustedDateReadContext } from './index';
import type {
  CustomerCommittedDateRevisionRow,
  CustomerCommittedDateRow,
  CustomerDateInformedRecordRow,
  ProductionDateIssueRow,
  ProductionInternalTargetDateRow,
  ProductionInternalTargetRevisionRow,
} from './rows';

const ORG = 'org-a';
const OTHER = 'org-b';
const ORDER = 'order-1';
const FOREIGN = 'order-foreign';
const MISSING = 'order-missing';
const SET_AT = '2026-09-01T15:00:00.000Z';
const REVISED_AT = '2026-09-10T15:00:00.000Z';

type OrderRow = { id: string; organizationId: string };

function ctx(grantedScopes: readonly string[], organizationId = ORG): TrustedDateReadContext {
  return { organizationId, grantedScopes };
}

function customerDate(over: Partial<CustomerCommittedDateRow> = {}): CustomerCommittedDateRow {
  return {
    id: 'date-a',
    organizationId: ORG,
    subjectType: 'order',
    subjectId: ORDER,
    partyId: 'party-1',
    commercialOwnerMemberId: 'member-sales',
    committedOn: '2026-10-01',
    originalCommittedOn: '2026-09-20',
    originalReason: 'acordado con el cliente',
    source: 'sales_customer_coordination',
    setByMemberId: 'member-sales',
    setAt: SET_AT,
    ...over,
  };
}

function revision(over: Partial<CustomerCommittedDateRevisionRow> = {}): CustomerCommittedDateRevisionRow {
  return {
    id: 'rev-a',
    committedDateId: 'date-a',
    organizationId: ORG,
    previousCommittedOn: '2026-09-20',
    nextCommittedOn: '2026-10-01',
    reason: 'el cliente pidió una semana más',
    actorMemberId: 'member-sales',
    source: 'sales_customer_coordination',
    revisedAt: REVISED_AT,
    ...over,
  };
}

function productionDate(over: Partial<ProductionInternalTargetDateRow> = {}): ProductionInternalTargetDateRow {
  return {
    id: 'target-a',
    organizationId: ORG,
    subjectType: 'order',
    subjectId: ORDER,
    maintainedByMemberId: 'member-production',
    targetOn: '2026-10-05',
    originalTargetOn: '2026-10-05',
    originalReason: 'carga del horno',
    source: 'production_internal',
    setByMemberId: 'member-production',
    setAt: SET_AT,
    ...over,
  };
}

function productionRevision(
  over: Partial<ProductionInternalTargetRevisionRow> = {},
): ProductionInternalTargetRevisionRow {
  return {
    id: 'target-rev-a',
    targetDateId: 'target-a',
    organizationId: ORG,
    previousTargetOn: '2026-10-05',
    nextTargetOn: '2026-10-08',
    reason: 'quema reprogramada',
    actorMemberId: 'member-production',
    source: 'production_internal',
    revisedAt: REVISED_AT,
    ...over,
  };
}

function issue(over: Partial<ProductionDateIssueRow> = {}): ProductionDateIssueRow {
  return {
    id: 'issue-a',
    organizationId: ORG,
    subjectType: 'order',
    subjectId: ORDER,
    mayAffectProductionCalendar: true,
    mayAffectCustomerDate: true,
    source: 'human_explicit',
    note: 'falta esmalte',
    recordedByMemberId: 'member-production',
    recordedAt: SET_AT,
    ...over,
  };
}

function informed(over: Partial<CustomerDateInformedRecordRow> = {}): CustomerDateInformedRecordRow {
  return {
    id: 'informed-a',
    issueId: 'issue-a',
    organizationId: ORG,
    subjectType: 'order',
    subjectId: ORDER,
    note: 'avisado por teléfono',
    recordedByMemberId: 'member-sales',
    recordedAt: REVISED_AT,
    notified: true,
    ...over,
  };
}

type Calls = {
  orders: Array<{ organizationId: string; orderId: string }>;
  dates: Array<{ organizationId: string; subjectType: string; subjectId: string }>;
  revisions: Array<{ organizationId: string; committedDateId: string }>;
  targets: Array<{ organizationId: string; subjectType: string; subjectId: string }>;
  targetRevisions: Array<{ organizationId: string; targetDateId: string }>;
  issues: Array<{ organizationId: string; subjectType: string; subjectId: string }>;
  informed: Array<{ organizationId: string; subjectType: string; subjectId: string }>;
  writes: string[];
};

function fixture() {
  const calls: Calls = {
    orders: [],
    dates: [],
    revisions: [],
    targets: [],
    targetRevisions: [],
    issues: [],
    informed: [],
    writes: [],
  };
  const orders: OrderRow[] = [
    { id: ORDER, organizationId: ORG },
    { id: FOREIGN, organizationId: OTHER },
    { id: ORDER, organizationId: OTHER },
  ];
  const dates = [
    customerDate(),
    customerDate({
      id: 'date-b',
      organizationId: OTHER,
      subjectId: ORDER,
      committedOn: '2099-01-01',
      originalReason: 'secreto-org-b',
      setByMemberId: 'member-b',
      commercialOwnerMemberId: 'member-b',
    }),
    customerDate({
      id: 'date-foreign',
      organizationId: OTHER,
      subjectId: FOREIGN,
      committedOn: '2099-02-02',
      originalReason: 'secreto-foreign',
    }),
  ];
  const revisions = [
    revision(),
    revision({
      id: 'rev-b',
      committedDateId: 'date-a',
      organizationId: OTHER,
      actorMemberId: 'member-b',
      source: 'sales_customer_coordination',
      reason: 'secreto-revision',
    }),
  ];
  const targets = [
    productionDate(),
    productionDate({
      id: 'target-b',
      organizationId: OTHER,
      subjectId: ORDER,
      targetOn: '2099-03-03',
      originalReason: 'secreto-target',
    }),
  ];
  const targetRevisions = [
    productionRevision(),
    productionRevision({
      id: 'target-rev-b',
      targetDateId: 'target-a',
      organizationId: OTHER,
      actorMemberId: 'member-b',
      reason: 'secreto-target-revision',
    }),
  ];
  const issues = [
    issue(),
    issue({
      id: 'issue-b',
      organizationId: OTHER,
      subjectId: ORDER,
      note: 'secreto-issue',
      recordedByMemberId: 'member-b',
    }),
  ];
  const informedRows = [
    informed(),
    informed({
      id: 'informed-b',
      organizationId: OTHER,
      subjectId: ORDER,
      note: 'secreto-informed',
      recordedByMemberId: 'member-b',
    }),
  ];

  const port: DateFactsReadPort = {
    async findOrderInOrganization(input) {
      calls.orders.push(input);
      return orders.find((row) => row.id === input.orderId && row.organizationId === input.organizationId) ?? null;
    },
    async findCustomerCommittedDate(input) {
      calls.dates.push(input);
      return (
        dates.find(
          (row) =>
            row.organizationId === input.organizationId &&
            row.subjectType === input.subjectType &&
            row.subjectId === input.subjectId,
        ) ?? null
      );
    },
    async listCustomerCommittedDateRevisions(input) {
      calls.revisions.push(input);
      return revisions.filter(
        (row) => row.organizationId === input.organizationId && row.committedDateId === input.committedDateId,
      );
    },
    async findProductionInternalTargetDate(input) {
      calls.targets.push(input);
      return (
        targets.find(
          (row) =>
            row.organizationId === input.organizationId &&
            row.subjectType === input.subjectType &&
            row.subjectId === input.subjectId,
        ) ?? null
      );
    },
    async listProductionInternalTargetRevisions(input) {
      calls.targetRevisions.push(input);
      return targetRevisions.filter(
        (row) => row.organizationId === input.organizationId && row.targetDateId === input.targetDateId,
      );
    },
    async listProductionDateIssues(input) {
      calls.issues.push(input);
      return issues.filter(
        (row) =>
          row.organizationId === input.organizationId &&
          row.subjectType === input.subjectType &&
          row.subjectId === input.subjectId,
      );
    },
    async listCustomerDateInformedRecords(input) {
      calls.informed.push(input);
      return informedRows.filter(
        (row) =>
          row.organizationId === input.organizationId &&
          row.subjectType === input.subjectType &&
          row.subjectId === input.subjectId,
      );
    },
  };

  return { calls, port, dates, revisions, targets, issues, informedRows };
}

function leakyHistoryPort(): DateFactsReadPort {
  const base = fixture();
  return {
    ...base.port,
    async listCustomerCommittedDateRevisions(input) {
      base.calls.revisions.push(input);
      return [
        revision(),
        revision({
          id: 'rev-b',
          committedDateId: 'date-a',
          organizationId: OTHER,
          actorMemberId: 'member-b',
          reason: 'secreto-revision',
        }),
      ];
    },
  };
}

describe('date fact read scopes', () => {
  it('uses only the three existing read scopes and does not imply siblings', () => {
    assert.deepEqual(DATE_FACT_READ_SCOPES, [
      'commercial.team.read',
      'commercial.org.read',
      'management.org.read',
    ]);
    assert.deepEqual(heldDateFactReadScopes([COMMERCIAL_TEAM_READ_SCOPE]), [COMMERCIAL_TEAM_READ_SCOPE]);
    assert.deepEqual(heldDateFactReadScopes([MANAGEMENT_ORG_READ_SCOPE]), [MANAGEMENT_ORG_READ_SCOPE]);
    assert.equal(heldDateFactReadScopes([COMMERCIAL_TEAM_READ_SCOPE]).includes(MANAGEMENT_ORG_READ_SCOPE), false);
    assert.equal(heldDateFactReadScopes([MANAGEMENT_ORG_READ_SCOPE]).includes(COMMERCIAL_TEAM_READ_SCOPE), false);
    assert.deepEqual(heldDateFactReadScopes([PEOPLE_ADMIN_SCOPE, COMMERCIAL_ORDER_CONVERT_SCOPE, 'Gerencia']), []);
  });
});

describe('readOrderCustomerCommittedDate', () => {
  it('returns same-tenant facts for commercial.team.read', async () => {
    const { port } = fixture();
    const result = await readOrderCustomerCommittedDate(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.organizationId, ORG);
    assert.equal(result.fact.committedOn, '2026-10-01');
    assert.equal(result.fact.originalCommittedOn, '2026-09-20');
    assert.equal(result.fact.source, 'sales_customer_coordination');
    assert.equal(result.fact.setByMemberId, 'member-sales');
    assert.equal(result.fact.originalReason, 'acordado con el cliente');
  });

  it('allows commercial.org.read without management.org.read', async () => {
    const { port } = fixture();
    const result = await readOrderCustomerCommittedDate(port, ctx([COMMERCIAL_ORG_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
  });

  it('allows management.org.read without commercial.team.read', async () => {
    const { port } = fixture();
    const result = await readOrderCustomerCommittedDate(port, ctx([MANAGEMENT_ORG_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
  });

  it('denies people.admin, write scopes, cargo, and title', async () => {
    const { port, calls } = fixture();
    const denied = [
      ctx([PEOPLE_ADMIN_SCOPE]),
      ctx([COMMERCIAL_ORDER_CONVERT_SCOPE]),
      ctx([PRODUCTION_OPERATIONAL_RECORD_SCOPE]),
      ctx([]),
      ctx(['Gerencia']),
      ctx(['Jefe de ventas']),
    ];
    for (const session of denied) {
      const result = await readOrderCustomerCommittedDate(port, session, ORDER);
      assert.equal(result.coverage, 'UNPROVEN');
      assert.equal(result.fact, null);
      if (result.coverage === 'UNPROVEN') assert.equal(result.denial, 'PERMISSION_DENIED');
      assert.equal(JSON.stringify(result).includes('false'), false);
    }
    assert.equal(calls.orders.length, 0);
    assert.equal(calls.dates.length, 0);
  });

  it('does not treat a missing date as false', async () => {
    const { port } = fixture();
    const bare: DateFactsReadPort = {
      ...port,
      async findCustomerCommittedDate() {
        return null;
      },
    };
    const result = await readOrderCustomerCommittedDate(bare, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.deepEqual(result, { coverage: 'NO_FACT', fact: null });
    assert.notEqual(result.fact, false);
    assert.equal('committedOn' in result, false);
  });

  it('makes a foreign order id indistinguishable from a missing id', async () => {
    const { port, calls } = fixture();
    const session = ctx([COMMERCIAL_TEAM_READ_SCOPE]);
    const foreign = await readOrderCustomerCommittedDate(port, session, FOREIGN);
    const missing = await readOrderCustomerCommittedDate(port, session, MISSING);
    assert.deepEqual(foreign, missing);
    assert.deepEqual(foreign, { coverage: 'NO_FACT', fact: null });
    assert.equal(JSON.stringify(foreign).includes('secreto'), false);
    assert.equal(calls.dates.length, 0);
    assert.deepEqual(
      calls.orders.map((call) => call.organizationId),
      [ORG, ORG],
    );
  });

  it('refuses a blank trusted organization without querying', async () => {
    const { port, calls } = fixture();
    const result = await readOrderCustomerCommittedDate(
      port,
      { organizationId: '  ', grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE] },
      ORDER,
    );
    assert.equal(result.coverage, 'UNPROVEN');
    if (result.coverage === 'UNPROVEN') assert.equal(result.denial, 'AUTH_REQUIRED');
    assert.equal(result.fact, null);
    assert.equal(calls.orders.length, 0);
  });

  it('ignores a client organization override and cargo on the context', async () => {
    const { port, calls } = fixture();
    const noisy = {
      organizationId: ORG,
      grantedScopes: [COMMERCIAL_TEAM_READ_SCOPE],
      clientOrganizationId: OTHER,
      organizationIdOverride: OTHER,
      cargo: 'Gerencia',
      title: 'Jefe',
    };
    const result = await readOrderCustomerCommittedDate(port, noisy, ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.organizationId, ORG);
    assert.equal(result.fact.committedOn, '2026-10-01');
    assert.equal(result.fact.originalReason, 'acordado con el cliente');
    assert.equal(calls.orders[0]?.organizationId, ORG);
    assert.equal(calls.dates[0]?.organizationId, ORG);
    assert.notEqual(calls.orders[0]?.organizationId, OTHER);
  });
});

describe('history tenant predicate', () => {
  it('keeps actor and source and includes organizationId, not order id alone', async () => {
    const { port, calls } = fixture();
    const result = await readOrderCustomerCommittedDateHistory(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.length, 1);
    assert.equal(result.fact[0]?.actorMemberId, 'member-sales');
    assert.equal(result.fact[0]?.source, 'sales_customer_coordination');
    assert.equal(result.fact[0]?.reason, 'el cliente pidió una semana más');
    assert.equal(calls.revisions.length, 1);
    assert.equal(calls.revisions[0]?.organizationId, ORG);
    assert.equal(calls.revisions[0]?.committedDateId, 'date-a');
    assert.equal('orderId' in (calls.revisions[0] ?? {}), false);
    assert.equal(JSON.stringify(result).includes('secreto'), false);
  });

  it('drops a foreign revision even if the port ignores the organization predicate', async () => {
    const result = await readOrderCustomerCommittedDateHistory(
      leakyHistoryPort(),
      ctx([COMMERCIAL_ORG_READ_SCOPE]),
      ORDER,
    );
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.length, 1);
    assert.equal(result.fact[0]?.organizationId, ORG);
    assert.equal(result.fact[0]?.actorMemberId, 'member-sales');
  });

  it('returns NO_FACT for history when the date row is missing', async () => {
    const { port } = fixture();
    const bare: DateFactsReadPort = {
      ...port,
      async findCustomerCommittedDate() {
        return null;
      },
    };
    const result = await readOrderCustomerCommittedDateHistory(bare, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.deepEqual(result, { coverage: 'NO_FACT', fact: null });
    assert.notEqual(result.fact, false);
  });
});

describe('production target stays independent', () => {
  it('returns the stored production target, not a copy of the customer date', async () => {
    const { port, calls } = fixture();
    const result = await readOrderProductionInternalTargetDate(port, ctx([MANAGEMENT_ORG_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.targetOn, '2026-10-05');
    assert.notEqual(result.fact.targetOn, '2026-10-01');
    assert.equal(result.fact.source, 'production_internal');
    assert.equal(result.fact.setByMemberId, 'member-production');
    assert.equal(calls.targets[0]?.organizationId, ORG);
    assert.equal(calls.targets[0]?.subjectType, 'order');
  });

  it('scopes production history by organization and preserves actor and source', async () => {
    const { port, calls } = fixture();
    const result = await readOrderProductionInternalTargetHistory(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact[0]?.actorMemberId, 'member-production');
    assert.equal(result.fact[0]?.source, 'production_internal');
    assert.equal(calls.targetRevisions[0]?.organizationId, ORG);
    assert.equal(calls.targetRevisions[0]?.targetDateId, 'target-a');
    assert.equal(JSON.stringify(result).includes('secreto'), false);
  });
});

describe('delay and risk', () => {
  it('does not compute delay from dates or a missed calendar day', async () => {
    const { port, calls } = fixture();
    const result = await readOrderDateDelay(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.deepEqual(result, { coverage: 'NO_FACT', fact: null });
    assert.equal(calls.orders.length, 0);
    assert.equal(calls.dates.length, 0);
    assert.equal(calls.targets.length, 0);
    assert.equal(JSON.stringify(result).includes('false'), false);
    assert.equal(JSON.stringify(result).includes('0'), false);
  });

  it('returns NO_FACT risk when no issue is stored, even if the dates differ', async () => {
    const { port } = fixture();
    const noIssues: DateFactsReadPort = {
      ...port,
      async listProductionDateIssues() {
        return [];
      },
    };
    const risk = await readOrderDateRisk(noIssues, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    const divergence = await readOrderRecordedDateDivergence(
      noIssues,
      ctx([COMMERCIAL_TEAM_READ_SCOPE]),
      ORDER,
    );
    assert.deepEqual(risk, { coverage: 'NO_FACT', fact: null });
    assert.notEqual(risk.fact, false);
    assert.equal(divergence.coverage, 'AVAILABLE');
    if (divergence.coverage === 'AVAILABLE') assert.equal(divergence.fact.diverges, true);
  });

  it('returns only the explicit stored issue flags', async () => {
    const { port } = fixture();
    const result = await readOrderDateRisk(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.length, 1);
    assert.equal(result.fact[0]?.mayAffectCustomerDate, true);
    assert.equal(result.fact[0]?.mayAffectProductionCalendar, true);
    assert.equal(result.fact[0]?.source, 'human_explicit');
    assert.equal(result.fact[0]?.recordedByMemberId, 'member-production');
    assert.equal(JSON.stringify(result).includes('predicted'), false);
    assert.equal(JSON.stringify(result).includes('secreto'), false);
  });

  it('keeps an explicitly stored false flag distinct from a missing issue', async () => {
    const { port } = fixture();
    const storedFalse: DateFactsReadPort = {
      ...port,
      async listProductionDateIssues(input) {
        return [
          issue({
            mayAffectProductionCalendar: false,
            mayAffectCustomerDate: false,
            note: 'registrado sin efecto',
          }),
        ].filter((row) => row.organizationId === input.organizationId);
      },
    };
    const result = await readOrderDateRisk(storedFalse, ctx([COMMERCIAL_ORG_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact[0]?.mayAffectCustomerDate, false);
  });
});

describe('customer informed state', () => {
  it('returns the stored informed record and actor', async () => {
    const { port, calls } = fixture();
    const result = await readOrderCustomerInformedState(port, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact[0]?.notified, true);
    assert.equal(result.fact[0]?.recordedByMemberId, 'member-sales');
    assert.equal(result.fact[0]?.note, 'avisado por teléfono');
    assert.equal(calls.informed[0]?.organizationId, ORG);
    assert.equal(calls.informed[0]?.subjectType, 'order');
    assert.equal(calls.informed[0]?.subjectId, ORDER);
  });

  it('treats a missing informed record as NO_FACT, not notified false', async () => {
    const { port } = fixture();
    const none: DateFactsReadPort = {
      ...port,
      async listCustomerDateInformedRecords() {
        return [];
      },
    };
    const result = await readOrderCustomerInformedState(none, ctx([MANAGEMENT_ORG_READ_SCOPE]), ORDER);
    assert.deepEqual(result, { coverage: 'NO_FACT', fact: null });
    assert.equal(JSON.stringify(result).includes('false'), false);
    assert.equal(JSON.stringify(result).includes('not_informed'), false);
  });
});

describe('errors and snapshot', () => {
  it('returns ERROR when the port throws, not a false flag', async () => {
    const { port } = fixture();
    const broken: DateFactsReadPort = {
      ...port,
      async findOrderInOrganization() {
        throw new Error('db down');
      },
    };
    const result = await readOrderCustomerCommittedDate(broken, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.deepEqual(result, { coverage: 'ERROR', fact: null });
  });

  it('returns the same missing snapshot for a foreign order and a missing order', async () => {
    const { port } = fixture();
    const session = ctx([COMMERCIAL_TEAM_READ_SCOPE]);
    const foreign = await readOrderDateFacts(port, session, FOREIGN);
    const missing = await readOrderDateFacts(port, session, MISSING);
    assert.deepEqual(foreign, missing);
    assert.deepEqual(foreign, { coverage: 'NO_FACT', fact: null });
  });

  it('returns nested NO_FACT dates without collapsing them to false', async () => {
    const { port } = fixture();
    const emptyDates: DateFactsReadPort = {
      ...port,
      async findCustomerCommittedDate() {
        return null;
      },
      async findProductionInternalTargetDate() {
        return null;
      },
      async listProductionDateIssues() {
        return [];
      },
      async listCustomerDateInformedRecords() {
        return [];
      },
    };
    const result = await readOrderDateFacts(emptyDates, ctx([COMMERCIAL_TEAM_READ_SCOPE]), ORDER);
    assert.equal(result.coverage, 'AVAILABLE');
    if (result.coverage !== 'AVAILABLE') return;
    assert.equal(result.fact.customerCommittedDate.coverage, 'NO_FACT');
    assert.equal(result.fact.customerCommittedDate.fact, null);
    assert.equal(result.fact.productionInternalTargetDate.coverage, 'NO_FACT');
    assert.equal(result.fact.delay.coverage, 'NO_FACT');
    assert.equal(result.fact.risk.coverage, 'NO_FACT');
    assert.equal(result.fact.customerInformed.coverage, 'NO_FACT');
    assert.equal(result.fact.recordedDivergence.coverage, 'NO_FACT');
  });
});

describe('prisma delegate adapter', () => {
  it('puts organizationId on history queries and does not write', async () => {
    const writes: string[] = [];
    const seen: unknown[] = [];
    const client = {
      osOrder: {
        async findFirst(args: unknown) {
          seen.push(args);
          return { id: ORDER, organizationId: ORG };
        },
      },
      customerCommittedDate: {
        async findFirst(args: unknown) {
          seen.push(args);
          return customerDate({ committedOn: new Date('2026-10-01T00:00:00.000Z') });
        },
      },
      customerCommittedDateRevision: {
        async findMany(args: unknown) {
          seen.push(args);
          return [revision({ revisedAt: new Date(REVISED_AT) })];
        },
      },
      productionInternalTargetDate: {
        async findFirst(args: unknown) {
          seen.push(args);
          return null;
        },
      },
      productionInternalTargetRevision: {
        async findMany(args: unknown) {
          seen.push(args);
          return [];
        },
      },
      productionDateIssue: {
        async findMany(args: unknown) {
          seen.push(args);
          return [];
        },
      },
      customerDateInformedRecord: {
        async findMany(args: unknown) {
          seen.push(args);
          return [];
        },
      },
      create: () => {
        writes.push('create');
      },
      update: () => {
        writes.push('update');
      },
    };

    const port = createPrismaDateFactsReadPort(client as PrismaDateFactsClient);
    const history = await readOrderCustomerCommittedDateHistory(
      port,
      ctx([COMMERCIAL_TEAM_READ_SCOPE]),
      ORDER,
    );
    assert.equal(history.coverage, 'AVAILABLE');
    if (history.coverage === 'AVAILABLE') {
      assert.equal(history.fact[0]?.actorMemberId, 'member-sales');
      assert.equal(history.fact[0]?.source, 'sales_customer_coordination');
      assert.equal(history.fact[0]?.previousCommittedOn, '2026-09-20');
    }

    const revisionQuery = seen.find(
      (args) =>
        typeof args === 'object' &&
        args !== null &&
        'where' in args &&
        typeof (args as { where?: { committedDateId?: string } }).where?.committedDateId === 'string',
    ) as { where: { organizationId?: string; committedDateId?: string } } | undefined;
    assert.ok(revisionQuery);
    assert.equal(revisionQuery.where.organizationId, ORG);
    assert.equal(revisionQuery.where.committedDateId, 'date-a');
    assert.notDeepEqual(revisionQuery.where, { committedDateId: 'date-a' });
    assert.equal(writes.length, 0);

    const orderQuery = seen[0] as { where: { id: string; organizationId: string } };
    assert.deepEqual(orderQuery.where, { id: ORDER, organizationId: ORG });
  });
});
