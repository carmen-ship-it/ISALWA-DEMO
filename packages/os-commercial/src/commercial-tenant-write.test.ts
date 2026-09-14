import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { CommercialCommandName, RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import type {
  OpportunityRecord,
  OrderRecord,
  PartyRecord,
  QuoteLineRecord,
  QuoteRecord,
} from './store-types';

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const OWNER = 'mem-owner';
const ADVISOR = 'mem-advisor';
const QUOTE_ID = 'quote-b';
const LINE_ID = 'line-b';
const ORDER_ID = 'order-b';
const OPPORTUNITY_ID = 'opp-b';
const PARTY_ID = 'party-b';
const ACCOUNT_ID = 'acct-b';
const NOW = new Date('2026-09-14T12:00:00.000Z');

const WRITES = [
  'insertOpportunity',
  'updateOpportunity',
  'insertQuote',
  'updateQuote',
  'insertQuoteLine',
  'updateQuoteLine',
  'deleteQuoteLine',
  'nextQuoteLineNumber',
  'insertOrder',
  'insertOrderLines',
  'updateOrder',
  'updateCommercialAccount',
  'appendEventAndAudit',
  'saveIdempotency',
] as const;

type WriteName = (typeof WRITES)[number];

function ctx(actorMemberId: string, organizationId = ORG_A): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-tenant',
    effectiveAt: NOW,
  };
}

function party(organizationId = ORG_A, id = 'party-a'): PartyRecord {
  return { id, organizationId, status: 'active', mergedIntoPartyId: null };
}

function quote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: QUOTE_ID,
    organizationId: ORG_B,
    partyId: PARTY_ID,
    commercialAccountId: ACCOUNT_ID,
    opportunityId: OPPORTUNITY_ID,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    revisionNumber: 1,
    notes: null,
    version: 1,
    submittedAt: null,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function line(overrides: Partial<QuoteLineRecord> = {}): QuoteLineRecord {
  return {
    id: LINE_ID,
    organizationId: ORG_B,
    quoteId: QUOTE_ID,
    lineNumber: 1,
    description: 'Foreign line',
    quantity: 1,
    unitLabel: null,
    unitPriceCentavos: 100n,
    discountCentavos: 0n,
    lineTotalCentavos: 100n,
    productRef: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: ORDER_ID,
    organizationId: ORG_B,
    partyId: PARTY_ID,
    commercialAccountId: ACCOUNT_ID,
    quoteId: QUOTE_ID,
    ownerMemberId: OWNER,
    orderNumber: 'O-000001',
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    version: 1,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function opportunity(overrides: Partial<OpportunityRecord> = {}): OpportunityRecord {
  return {
    id: OPPORTUNITY_ID,
    organizationId: ORG_B,
    partyId: PARTY_ID,
    commercialAccountId: ACCOUNT_ID,
    ownerMemberId: OWNER,
    title: 'Foreign',
    stage: 'open',
    status: 'open',
    expectedValueCentavos: null,
    sourceMetadataJson: null,
    version: 1,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function harness(input: {
  session?: boolean;
  scopes?: string[];
  globalLoad?: boolean;
  quote?: QuoteRecord | null;
  line?: QuoteLineRecord | null;
  order?: OrderRecord | null;
  opportunity?: OpportunityRecord | null;
  party?: PartyRecord | null;
}) {
  const writes: WriteName[] = [];
  const lookups: string[] = [];
  const session = input.session !== false;
  const globalLoad = input.globalLoad === true;
  const quoteRow = input.quote === undefined ? quote() : input.quote;
  const lineRow = input.line === undefined ? line() : input.line;
  const orderRow = input.order === undefined ? order() : input.order;
  const opportunityRow = input.opportunity === undefined ? opportunity() : input.opportunity;
  const partyRow = input.party === undefined ? party() : input.party;
  const scopes = input.scopes ?? [];

  function visible<T extends { id: string; organizationId: string }>(
    row: T | null,
    organizationId: string,
    id: string,
  ): T | null {
    if (!row || row.id !== id) return null;
    if (globalLoad) return row;
    return row.organizationId === organizationId ? row : null;
  }

  function record(name: WriteName): void {
    writes.push(name);
  }

  const store = {
    writes,
    lookups,
    async runInTransaction(fn: (next: OsCommercialStore) => Promise<unknown>) {
      return fn(store as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      lookups.push(`member:${organizationId}`);
      if (!session || organizationId !== ORG_A) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember(memberId: string) {
      if (memberId !== ADVISOR) return [];
      return scopes.map((roleKey) => ({
        roleKey,
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        endedAt: null,
      }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getPartyInOrg(organizationId: string, partyId: string) {
      lookups.push(`party:${organizationId}`);
      return visible(partyRow, organizationId, partyId);
    },
    async getCommercialAccountForParty() {
      return null;
    },
    async getCommercialAccountInOrg(organizationId: string, commercialAccountId: string) {
      lookups.push(`account:${organizationId}`);
      if (commercialAccountId !== ACCOUNT_ID) return null;
      const account = {
        id: ACCOUNT_ID,
        organizationId: ORG_B,
        partyId: PARTY_ID,
        ownerMemberId: OWNER,
        status: 'active',
        version: 1,
      };
      if (globalLoad) return account;
      return organizationId === account.organizationId ? account : null;
    },
    async updateCommercialAccount() {
      record('updateCommercialAccount');
    },
    async insertOpportunity() {
      record('insertOpportunity');
    },
    async getOpportunityInOrg(organizationId: string, opportunityId: string) {
      lookups.push(`opportunity:${organizationId}`);
      return visible(opportunityRow, organizationId, opportunityId);
    },
    async updateOpportunity() {
      record('updateOpportunity');
    },
    async insertQuote() {
      record('insertQuote');
    },
    async getQuoteInOrg(organizationId: string, quoteId: string) {
      lookups.push(`quote:${organizationId}`);
      return visible(quoteRow, organizationId, quoteId);
    },
    async updateQuote() {
      record('updateQuote');
    },
    async countQuotesForOrg() {
      return 0;
    },
    async insertQuoteLine() {
      record('insertQuoteLine');
    },
    async getQuoteLineInOrg(organizationId: string, quoteLineId: string) {
      lookups.push(`quoteLine:${organizationId}`);
      return visible(lineRow, organizationId, quoteLineId);
    },
    async listQuoteLines(organizationId: string, quoteId: string) {
      if (!lineRow || lineRow.organizationId !== organizationId || lineRow.quoteId !== quoteId) {
        return [];
      }
      return [lineRow];
    },
    async updateQuoteLine() {
      record('updateQuoteLine');
    },
    async deleteQuoteLine() {
      record('deleteQuoteLine');
    },
    async nextQuoteLineNumber() {
      record('nextQuoteLineNumber');
      return 1;
    },
    async insertOrder() {
      record('insertOrder');
    },
    async insertOrderLines() {
      record('insertOrderLines');
    },
    async listOrderLines() {
      return [];
    },
    async getOrderInOrg(organizationId: string, orderId: string) {
      lookups.push(`order:${organizationId}`);
      return visible(orderRow, organizationId, orderId);
    },
    async getOrderForQuote(organizationId: string, quoteId: string) {
      lookups.push(`orderForQuote:${organizationId}`);
      if (!orderRow || orderRow.quoteId !== quoteId) return null;
      if (globalLoad) return orderRow;
      return orderRow.organizationId === organizationId ? orderRow : null;
    },
    async updateOrder() {
      record('updateOrder');
    },
    async countOrdersForOrg() {
      return 0;
    },
    async listActiveCustomerCoverageGrants() {
      return [];
    },
    async appendEventAndAudit() {
      record('appendEventAndAudit');
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {
      record('saveIdempotency');
    },
  };

  return {
    store: store as unknown as OsCommercialStore,
    writes,
    lookups,
  };
}

async function settle(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'SUCCESS';
  } catch (error) {
    return error instanceof Error ? error.message : 'UNKNOWN';
  }
}

const foreignProbes: Array<{
  command: CommercialCommandName;
  payload: Record<string, unknown>;
  missing: Record<string, unknown>;
}> = [
  {
    command: 'UpdateQuote',
    payload: { quoteId: QUOTE_ID, notes: 'hijack', organizationId: ORG_B },
    missing: { quoteId: 'quote-missing', notes: 'hijack', organizationId: ORG_B },
  },
  {
    command: 'SubmitQuote',
    payload: { quoteId: QUOTE_ID, organizationId: ORG_B },
    missing: { quoteId: 'quote-missing', organizationId: ORG_B },
  },
  {
    command: 'CancelQuote',
    payload: { quoteId: QUOTE_ID, organizationId: ORG_B },
    missing: { quoteId: 'quote-missing', organizationId: ORG_B },
  },
  {
    command: 'AddQuoteLine',
    payload: {
      quoteId: QUOTE_ID,
      description: 'hijack',
      quantity: 1,
      unitPriceCentavos: 100,
      organizationId: ORG_B,
    },
    missing: {
      quoteId: 'quote-missing',
      description: 'hijack',
      quantity: 1,
      unitPriceCentavos: 100,
      organizationId: ORG_B,
    },
  },
  {
    command: 'CreateOrder',
    payload: { quoteId: QUOTE_ID, organizationId: ORG_B },
    missing: { quoteId: 'quote-missing', organizationId: ORG_B },
  },
  {
    command: 'UpdateQuoteLine',
    payload: { quoteLineId: LINE_ID, description: 'hijack', organizationId: ORG_B },
    missing: { quoteLineId: 'line-missing', description: 'hijack', organizationId: ORG_B },
  },
  {
    command: 'RemoveQuoteLine',
    payload: { quoteLineId: LINE_ID, organizationId: ORG_B },
    missing: { quoteLineId: 'line-missing', organizationId: ORG_B },
  },
  {
    command: 'CancelOrder',
    payload: { orderId: ORDER_ID, organizationId: ORG_B },
    missing: { orderId: 'order-missing', organizationId: ORG_B },
  },
  {
    command: 'UpdateOpportunity',
    payload: { opportunityId: OPPORTUNITY_ID, title: 'hijack', organizationId: ORG_B },
    missing: { opportunityId: 'opp-missing', title: 'hijack', organizationId: ORG_B },
  },
  {
    command: 'ChangeOpportunityStage',
    payload: { opportunityId: OPPORTUNITY_ID, stage: 'proposal', organizationId: ORG_B },
    missing: { opportunityId: 'opp-missing', stage: 'proposal', organizationId: ORG_B },
  },
  {
    command: 'CloseOpportunity',
    payload: { opportunityId: OPPORTUNITY_ID, outcome: 'won', organizationId: ORG_B },
    missing: { opportunityId: 'opp-missing', outcome: 'won', organizationId: ORG_B },
  },
  {
    command: 'AssignOpportunityOwner',
    payload: { opportunityId: OPPORTUNITY_ID, ownerMemberId: ADVISOR, organizationId: ORG_B },
    missing: { opportunityId: 'opp-missing', ownerMemberId: ADVISOR, organizationId: ORG_B },
  },
];

describe('commercial tenant writes', () => {
  for (const probe of foreignProbes) {
    it(`${probe.command} treats a foreign id as missing and does not write`, async () => {
      const foreign = harness({});
      const missing = harness({});
      const foreignService = new CommercialCommandService(foreign.store);
      const missingService = new CommercialCommandService(missing.store);

      const foreignResult = await settle(() =>
        foreignService.execute(probe.command, ctx(OWNER), probe.payload),
      );
      const missingResult = await settle(() =>
        missingService.execute(probe.command, ctx(OWNER), probe.missing),
      );

      assert.equal(foreignResult, missingResult);
      assert.equal(foreignResult, 'NOT_FOUND');
      assert.deepEqual(foreign.writes, []);
      assert.deepEqual(missing.writes, []);
      assert.equal(
        foreign.lookups.every((lookup) => lookup.endsWith(`:${ORG_A}`)),
        true,
      );
    });
  }

  it('does not number or mutate a quote, line, or order loaded outside the session org', async () => {
    const loaded = harness({ globalLoad: true });
    const service = new CommercialCommandService(loaded.store);
    const session = ctx(OWNER);
    const results = await Promise.all([
      settle(() => service.execute('AddQuoteLine', session, {
        quoteId: QUOTE_ID,
        description: 'hijack',
        quantity: 1,
        unitPriceCentavos: 100,
      })),
      settle(() => service.execute('UpdateQuoteLine', session, {
        quoteLineId: LINE_ID,
        description: 'hijack',
      })),
      settle(() => service.execute('RemoveQuoteLine', session, { quoteLineId: LINE_ID })),
      settle(() => service.execute('UpdateQuote', session, { quoteId: QUOTE_ID, notes: 'hijack' })),
      settle(() => service.execute('CreateOrder', session, { quoteId: QUOTE_ID })),
      settle(() => service.execute('CancelOrder', session, { orderId: ORDER_ID })),
      settle(() => service.execute('UpdateOpportunity', session, {
        opportunityId: OPPORTUNITY_ID,
        title: 'hijack',
      })),
    ]);

    assert.deepEqual(results, Array(results.length).fill('NOT_FOUND'));
    assert.deepEqual(loaded.writes, []);
  });

  it('CreateQuote with a foreign opportunity is the same denial as a missing opportunity and does not insert', async () => {
    const sessionParty = party(ORG_A, 'party-a');
    const foreign = harness({ party: sessionParty, opportunity: opportunity() });
    const missing = harness({ party: sessionParty, opportunity: null });
    const payload = { partyId: 'party-a', opportunityId: OPPORTUNITY_ID, organizationId: ORG_B };
    const missingPayload = { partyId: 'party-a', opportunityId: 'opp-missing', organizationId: ORG_B };

    const foreignResult = await settle(() =>
      new CommercialCommandService(foreign.store).execute('CreateQuote', ctx(OWNER), payload),
    );
    const missingResult = await settle(() =>
      new CommercialCommandService(missing.store).execute('CreateQuote', ctx(OWNER), missingPayload),
    );

    assert.equal(foreignResult, missingResult);
    assert.equal(foreignResult, 'VALIDATION_FAILED');
    assert.deepEqual(foreign.writes, []);
    assert.deepEqual(missing.writes, []);
  });

  it('ReassignCommercialAccountOwner treats a foreign account as missing and does not write', async () => {
    const scopes = ['commercial.account.reassign'];
    const foreign = harness({ scopes });
    const missing = harness({ scopes });
    const foreignResult = await settle(() =>
      new CommercialCommandService(foreign.store).execute(
        'ReassignCommercialAccountOwner',
        ctx(ADVISOR),
        { commercialAccountId: ACCOUNT_ID, ownerMemberId: OWNER, organizationId: ORG_B },
      ),
    );
    const missingResult = await settle(() =>
      new CommercialCommandService(missing.store).execute(
        'ReassignCommercialAccountOwner',
        ctx(ADVISOR),
        { commercialAccountId: 'acct-missing', ownerMemberId: OWNER, organizationId: ORG_B },
      ),
    );

    assert.equal(foreignResult, missingResult);
    assert.equal(foreignResult, 'NOT_FOUND');
    assert.deepEqual(foreign.writes, []);
    assert.deepEqual(missing.writes, []);
  });

  it('CreateOpportunity with a foreign party is the same not-found as a missing party and does not insert', async () => {
    const foreign = harness({ party: party(ORG_B, PARTY_ID) });
    const missing = harness({ party: null });
    const foreignResult = await settle(() =>
      new CommercialCommandService(foreign.store).execute('CreateOpportunity', ctx(OWNER), {
        partyId: PARTY_ID,
        title: 'hijack',
        organizationId: ORG_B,
      }),
    );
    const missingResult = await settle(() =>
      new CommercialCommandService(missing.store).execute('CreateOpportunity', ctx(OWNER), {
        partyId: 'party-missing',
        title: 'hijack',
        organizationId: ORG_B,
      }),
    );

    assert.equal(foreignResult, missingResult);
    assert.equal(foreignResult, 'NOT_FOUND');
    assert.deepEqual(foreign.writes, []);
    assert.deepEqual(missing.writes, []);
  });

  it('denies commercial.team.read for update, submit, line writes, and convert without writing', async () => {
    const sessionQuote = quote({
      id: 'quote-a',
      organizationId: ORG_A,
      ownerMemberId: OWNER,
      status: 'draft',
    });
    const sessionLine = line({
      id: 'line-a',
      organizationId: ORG_A,
      quoteId: 'quote-a',
    });
    const submitted = quote({
      id: 'quote-a',
      organizationId: ORG_A,
      ownerMemberId: OWNER,
      status: 'submitted',
    });
    const denied: Array<{
      command: CommercialCommandName;
      payload: Record<string, unknown>;
      quoteRow: QuoteRecord;
    }> = [
      {
        command: 'UpdateQuote',
        payload: { quoteId: 'quote-a', notes: 'nope' },
        quoteRow: sessionQuote,
      },
      {
        command: 'SubmitQuote',
        payload: { quoteId: 'quote-a' },
        quoteRow: sessionQuote,
      },
      {
        command: 'AddQuoteLine',
        payload: { quoteId: 'quote-a', description: 'nope', quantity: 1, unitPriceCentavos: 100 },
        quoteRow: sessionQuote,
      },
      {
        command: 'UpdateQuoteLine',
        payload: { quoteLineId: 'line-a', description: 'nope' },
        quoteRow: sessionQuote,
      },
      {
        command: 'RemoveQuoteLine',
        payload: { quoteLineId: 'line-a' },
        quoteRow: sessionQuote,
      },
      {
        command: 'CreateOrder',
        payload: { quoteId: 'quote-a' },
        quoteRow: submitted,
      },
    ];

    for (const probe of denied) {
      const box = harness({
        scopes: ['commercial.team.read'],
        quote: probe.quoteRow,
        line: sessionLine,
      });
      const result = await settle(() =>
        new CommercialCommandService(box.store).execute(probe.command, ctx(ADVISOR), probe.payload),
      );
      assert.equal(result, 'PERMISSION_DENIED', probe.command);
      assert.deepEqual(box.writes, [], probe.command);
    }

    const reassign = harness({ scopes: ['commercial.team.read'] });
    const reassignResult = await settle(() =>
      new CommercialCommandService(reassign.store).execute(
        'ReassignCommercialAccountOwner',
        ctx(ADVISOR),
        { commercialAccountId: ACCOUNT_ID, ownerMemberId: OWNER },
      ),
    );
    assert.equal(reassignResult, 'PERMISSION_DENIED');
    assert.deepEqual(reassign.writes, []);
  });

  it('keeps own-submitted conversion and does not let commercial.team.read or people.admin convert', async () => {
    const submitted = quote({
      id: 'quote-a',
      organizationId: ORG_A,
      ownerMemberId: OWNER,
      status: 'submitted',
    });
    const sessionLine = line({ id: 'line-a', organizationId: ORG_A, quoteId: 'quote-a' });

    const owner = harness({ quote: submitted, line: sessionLine });
    const converted = await new CommercialCommandService(owner.store).execute(
      'CreateOrder',
      ctx(OWNER),
      { quoteId: 'quote-a' },
    );
    assert.equal(converted.data.quoteId, 'quote-a');
    assert.equal(owner.writes.includes('insertOrder'), true);
    assert.equal(owner.writes.includes('appendEventAndAudit'), true);
    assert.equal(owner.writes.includes('updateQuote'), true);

    for (const scopes of [['commercial.team.read'], ['people.admin'], ['commercial.org.read']]) {
      const denied = harness({ scopes, quote: submitted, line: sessionLine });
      const result = await settle(() =>
        new CommercialCommandService(denied.store).execute('CreateOrder', ctx(ADVISOR), {
          quoteId: 'quote-a',
        }),
      );
      assert.equal(result, 'PERMISSION_DENIED', scopes.join(','));
      assert.deepEqual(denied.writes, [], scopes.join(','));
    }

    const converter = harness({
      scopes: ['commercial.order.convert'],
      quote: submitted,
      line: sessionLine,
    });
    const result = await new CommercialCommandService(converter.store).execute(
      'CreateOrder',
      ctx(ADVISOR),
      { quoteId: 'quote-a' },
    );
    assert.equal(result.data.quoteId, 'quote-a');
    assert.equal(converter.writes.includes('insertOrder'), true);
  });

  it('denies a missing session before any write', async () => {
    const commands: Array<{ command: CommercialCommandName; payload: Record<string, unknown> }> = [
      { command: 'CreateOpportunity', payload: { partyId: 'party-a', title: 'x' } },
      { command: 'CreateQuote', payload: { partyId: 'party-a' } },
      { command: 'UpdateQuote', payload: { quoteId: QUOTE_ID, notes: 'x' } },
      { command: 'AddQuoteLine', payload: { quoteId: QUOTE_ID, description: 'x', quantity: 1, unitPriceCentavos: 100 } },
      { command: 'UpdateQuoteLine', payload: { quoteLineId: LINE_ID, description: 'x' } },
      { command: 'SubmitQuote', payload: { quoteId: QUOTE_ID } },
      { command: 'CreateOrder', payload: { quoteId: QUOTE_ID } },
      { command: 'CancelOrder', payload: { orderId: ORDER_ID } },
    ];

    for (const probe of commands) {
      const box = harness({ session: false });
      const result = await settle(() =>
        new CommercialCommandService(box.store).execute(probe.command, ctx(OWNER), probe.payload),
      );
      assert.equal(result, 'TENANT_FORBIDDEN', probe.command);
      assert.deepEqual(box.writes, [], probe.command);
    }
  });

  it('does not leave an id-only quote-line lookup or a read-scope write grant', () => {
    const command = readFileSync(resolve(__dirname, 'commercial-command-service.ts'), 'utf8');
    const prisma = readFileSync(
      resolve(__dirname, '../../os-database/src/prisma-commercial-store.ts'),
      'utf8',
    );

    assert.doesNotMatch(command, /payload\.organizationId/);
    assert.doesNotMatch(command, /commercial\.(team|org)\.read/);
    assert.match(command, /canConvertQuoteToOrder/);
    assert.doesNotMatch(prisma, /findUnique\(/);
    assert.doesNotMatch(prisma, /osQuoteLine\.update\(\{/);
    assert.doesNotMatch(prisma, /osQuoteLine\.delete\(\{/);
    assert.doesNotMatch(prisma, /where:\s*\{\s*quoteId\s*\}/);
    assert.match(prisma, /nextQuoteLineNumber\(organizationId: string, quoteId: string\)/);
    assert.match(prisma, /where: \{ id: quoteId, organizationId \}/);
    assert.match(prisma, /where: \{ id: line\.id, organizationId, quoteId: line\.quoteId \}/);
  });
});
