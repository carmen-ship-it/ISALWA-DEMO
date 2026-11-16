import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CommercialCommandName, CustomerCoverageAction, RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import type { OrderRecord, QuoteRecord } from './store-types';

const ORG = 'org-a';
const FOREIGN_ORG = 'org-b';
const OWNER = 'mem-owner';
const ADVISOR = 'mem-advisor';
const STEWARD = 'mem-steward';
const STRANGER = 'mem-stranger';
const PARTY = 'party-1';
const FOREIGN_PARTY = 'party-foreign';
const NOW = new Date('2026-10-16T15:00:00.000Z');
const SINCE = new Date('2026-01-01T00:00:00.000Z');

type Grant = {
  actingAdvisorMemberId: string;
  coveredActions: readonly CustomerCoverageAction[];
  endsAt?: Date | null;
  revokedAt?: Date | null;
};

function ctx(actorMemberId: string): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: `corr-${actorMemberId}`,
    effectiveAt: NOW,
  };
}

function quote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: 'quote-1',
    organizationId: ORG,
    partyId: PARTY,
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    // Default: issued and accepted at revision 1, the convertible state (T04).
    status: 'accepted',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    revisionNumber: 1,
    notes: null,
    version: 1,
    submittedAt: NOW,
    issuedAt: NOW,
    issuedDocumentHash: 'hash-1',
    issuedRevisionNumber: 1,
    validUntil: null,
    customerAcceptedAt: NOW,
    customerAcceptanceChannel: 'llamada',
    customerAcceptanceEvidence: 'Aceptó por llamada telefónica',
    customerAcceptedRevision: 1,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    // A draft has not been issued or accepted.
    ...(overrides.status === 'draft'
      ? {
          submittedAt: null,
          issuedAt: null,
          issuedDocumentHash: null,
          issuedRevisionNumber: null,
          customerAcceptedAt: null,
          customerAcceptanceChannel: null,
          customerAcceptanceEvidence: null,
          customerAcceptedRevision: null,
        }
      : {}),
    ...overrides,
  };
}

function order(): OrderRecord {
  return {
    id: 'order-1',
    organizationId: ORG,
    partyId: PARTY,
    commercialAccountId: 'acct-1',
    quoteId: 'quote-1',
    ownerMemberId: OWNER,
    orderNumber: 'O-000001',
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    version: 0,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function harness(
  input: {
    scopes?: Record<string, string[]>;
    grants?: Grant[];
    quote?: QuoteRecord;
    partyStatus?: string;
    /** Members who currently lead OWNER. */
    leadsOwner?: string[];
  } = {},
) {
  const writes: string[] = [];
  const events: Array<{ eventType: string; actorMemberId?: string | null; payload?: Record<string, unknown> }> = [];
  const quoteRow = input.quote ?? quote();
  const parties = new Map([
    [PARTY, { id: PARTY, organizationId: ORG, status: input.partyStatus ?? 'active', mergedIntoPartyId: null }],
    [FOREIGN_PARTY, { id: FOREIGN_PARTY, organizationId: FOREIGN_ORG, status: 'active', mergedIntoPartyId: null }],
  ]);
  const store = {
    async runInTransaction(fn: (s: OsCommercialStore) => Promise<unknown>) {
      return fn(store as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      return organizationId === ORG ? { id: memberId, organizationId, accessStatus: 'active' } : null;
    },
    async listRoleAssignmentsForMember(memberId: string) {
      return (input.scopes?.[memberId] ?? []).map((roleKey) => ({ roleKey, effectiveAt: SINCE, endedAt: null }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getPartyInOrg(organizationId: string, partyId: string) {
      const row = parties.get(partyId);
      return row && row.organizationId === organizationId ? row : null;
    },
    async getCommercialAccountForParty(organizationId: string, partyId: string) {
      const row = parties.get(partyId);
      if (!row || row.organizationId !== organizationId) return null;
      return { id: 'acct-1', organizationId, partyId, territoryId: null, ownerMemberId: OWNER, status: 'active', version: 1 };
    },
    async getCommercialAccountInOrg(organizationId: string, accountId: string) {
      return organizationId === ORG && accountId === 'acct-1'
        ? { id: 'acct-1', organizationId, partyId: PARTY, territoryId: null, ownerMemberId: OWNER, status: 'active', version: 1 }
        : null;
    },
    async listActiveCustomerCoverageGrants(query: { customerPartyId: string; actingAdvisorMemberId: string; asOf: Date }) {
      return (input.grants ?? [])
        .filter(
          (g) =>
            g.actingAdvisorMemberId === query.actingAdvisorMemberId &&
            query.customerPartyId === PARTY &&
            !g.revokedAt &&
            (g.endsAt == null || g.endsAt > query.asOf),
        )
        .map((g) => ({
          grantType: 'commercial.customer.coverage' as const,
          organizationId: ORG,
          customerPartyId: PARTY,
          primaryOwnerMemberId: OWNER,
          actingAdvisorMemberId: g.actingAdvisorMemberId,
          coveredActions: g.coveredActions,
          startsAt: SINCE,
          endsAt: g.endsAt ?? null,
          revokedAt: g.revokedAt ?? null,
        }));
    },
    async isDirectReport(organizationId: string, managerMemberId: string, memberId: string) {
      return organizationId === ORG && memberId === OWNER && (input.leadsOwner ?? []).includes(managerMemberId);
    },
    async getOpportunityInOrg(organizationId: string, opportunityId: string) {
      return organizationId === ORG && opportunityId === 'opp-1'
        ? { id: 'opp-1', organizationId: ORG, partyId: PARTY, commercialAccountId: 'acct-1', ownerMemberId: OWNER, title: 'x', stage: 'new', status: 'open', version: 1, createdAt: NOW, updatedAt: NOW }
        : null;
    },
    async updateOpportunity() {
      writes.push('updateOpportunity');
    },
    async getQuoteInOrg(organizationId: string, quoteId: string) {
      return organizationId === quoteRow.organizationId && quoteId === quoteRow.id ? quoteRow : null;
    },
    async getOrderInOrg(organizationId: string, orderId: string) {
      const row = order();
      return organizationId === row.organizationId && orderId === row.id ? row : null;
    },
    async getOrderForQuote() {
      return null;
    },
    async listQuoteLines() {
      return [{ id: 'line-1', organizationId: ORG, quoteId: 'quote-1', lineNumber: 1, description: 'x', quantity: 1, unitLabel: null, unitPriceCentavos: 100n, discountCentavos: 0n, lineTotalCentavos: 100n, productRef: null, createdAt: NOW, updatedAt: NOW }];
    },
    async countQuotesForOrg() {
      return 0;
    },
    async listQuoteApprovals() {
      return [{ id: 'approval-1', status: 'approved', contextSnapshotJson: { boundRevision: 1 }, requestedByMemberId: OWNER, approverMemberId: 'mem-approver', decisionByMemberId: 'mem-approver', decidedAt: NOW }];
    },
    async countOrdersForOrg() {
      return 0;
    },
    async nextQuoteLineNumber() {
      return 2;
    },
    async insertOpportunity() {
      writes.push('insertOpportunity');
    },
    async insertQuote(row: QuoteRecord) {
      writes.push(`insertQuote:${row.ownerMemberId}`);
    },
    async insertQuoteLine() {
      writes.push('insertQuoteLine');
    },
    async updateQuote() {
      writes.push('updateQuote');
    },
    async insertOrder(row: OrderRecord) {
      writes.push(`insertOrder:${row.ownerMemberId}`);
    },
    async insertOrderLines() {
      writes.push('insertOrderLines');
    },
    async updateOrder() {
      writes.push('updateOrder');
    },
    async appendEventAndAudit(event: { eventType: string; actorMemberId?: string | null; payload?: Record<string, unknown> }) {
      events.push(event);
      writes.push(`event:${event.eventType}`);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
  return { service: new CommercialCommandService(store as unknown as OsCommercialStore), writes, events };
}

async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'OK';
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

const COMMANDS: Array<{ command: CommercialCommandName; payload: Record<string, unknown>; quote?: Partial<QuoteRecord> }> = [
  { command: 'CreateOpportunity', payload: { partyId: PARTY, title: 'Pedido de ladrillo' } },
  { command: 'CreateQuote', payload: { partyId: PARTY } },
  { command: 'AddQuoteLine', payload: { quoteId: 'quote-1', description: 'x', quantity: 1, unitPriceCentavos: 100 }, quote: { status: 'draft' } },
  { command: 'SubmitQuote', payload: { quoteId: 'quote-1' }, quote: { status: 'draft' } },
  { command: 'CreateOrder', payload: { quoteId: 'quote-1' } },
  { command: 'CancelOrder', payload: { orderId: 'order-1' } },
];

describe('T03 customer authority: master data is not commercial authority', () => {
  it('denies master_data.admin quotation, order, conversion and cancellation with zero writes', async () => {
    for (const probe of COMMANDS) {
      const t = harness({ scopes: { [STEWARD]: ['master_data.admin'] }, quote: quote(probe.quote) });
      const result = await outcome(() => t.service.execute(probe.command, ctx(STEWARD), probe.payload));
      // The steward may know the customer exists, so the honest answer is PERMISSION_DENIED.
      assert.equal(result, 'PERMISSION_DENIED', probe.command);
      assert.deepEqual(t.writes, [], probe.command);
    }
  });

  it('lets the account owner run the same commands (control)', async () => {
    for (const probe of COMMANDS) {
      const t = harness({ scopes: { [OWNER]: ['commercial.quote.convert.own'] }, quote: quote(probe.quote) });
      const result = await outcome(() => t.service.execute(probe.command, ctx(OWNER), probe.payload));
      assert.equal(result, 'OK', probe.command);
    }
  });
});

describe('T03 customer authority: coverage covers only explicit actions', () => {
  it('continues the owner\'s work under commercial.work coverage without changing the owner', async () => {
    const t = harness({ grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work'] }] });
    await t.service.execute('CreateQuote', ctx(ADVISOR), { partyId: PARTY });
    assert.deepEqual(t.writes.filter((w) => w.startsWith('insertQuote')), [`insertQuote:${OWNER}`]);
    assert.equal(t.events[0]!.actorMemberId, ADVISOR);
    assert.equal(t.events[0]!.payload?.ownerMemberId, OWNER);

    const draft = harness({
      grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work'] }],
      quote: quote({ status: 'draft' }),
    });
    assert.equal(
      await outcome(() =>
        draft.service.execute('AddQuoteLine', ctx(ADVISOR), { quoteId: 'quote-1', description: 'x', quantity: 1, unitPriceCentavos: 100 }),
      ),
      'OK',
    );
  });

  it('denies commercial work under coverage that covers only customer.edit', async () => {
    for (const probe of COMMANDS.slice(0, 4)) {
      const t = harness({
        grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['customer.edit'] }],
        quote: quote(probe.quote),
      });
      const result = await outcome(() => t.service.execute(probe.command, ctx(ADVISOR), probe.payload));
      assert.equal(result, 'PERMISSION_DENIED', probe.command);
      assert.deepEqual(t.writes, [], probe.command);
    }
  });

  // T03 2026-10-16 19:30 supersedes BR-CNV-02 ("coverage never converts"): conversion needs explicit
  // quote.convert coverage AND the advisor's own conversion permission. Coverage never cancels orders.
  it('never lets coverage cancel the owner\'s order', async () => {
    const t = harness({
      scopes: { [ADVISOR]: ['commercial.quote.convert.own'] },
      grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work', 'customer.edit', 'quote.convert'] }],
    });
    assert.equal(await outcome(() => t.service.execute('CancelOrder', ctx(ADVISOR), { orderId: 'order-1' })), 'PERMISSION_DENIED');
    assert.deepEqual(t.writes, []);
  });

  it('converts under explicit quote.convert coverage when the advisor holds conversion permission', async () => {
    const t = harness({
      scopes: { [ADVISOR]: ['commercial.quote.convert.own'] },
      grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work', 'quote.convert'] }],
    });
    assert.equal(await outcome(() => t.service.execute('CreateOrder', ctx(ADVISOR), { quoteId: 'quote-1' })), 'OK');
    assert.ok(t.writes.includes(`insertOrder:${OWNER}`), 'order keeps the account owner');
    const event = t.events.find((e) => e.eventType === 'order.created')!;
    assert.equal(event.actorMemberId, ADVISOR);
    assert.equal(event.payload?.primaryOwnerMemberId, OWNER);
    assert.equal(event.payload?.actingAdvisorMemberId, ADVISOR);
    assert.equal(event.payload?.conversionPath, 'coverage');
  });

  it('denies conversion under edit-only or work-only coverage, even with conversion permission', async () => {
    for (const coveredActions of [['customer.edit'], ['commercial.work', 'customer.edit']] as CustomerCoverageAction[][]) {
      const t = harness({
        scopes: { [ADVISOR]: ['commercial.quote.convert.own', 'commercial.order.convert'] },
        grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions }],
      });
      assert.equal(await outcome(() => t.service.execute('CreateOrder', ctx(ADVISOR), { quoteId: 'quote-1' })), 'PERMISSION_DENIED');
      assert.deepEqual(t.writes, []);
    }
  });

  it('denies quote.convert coverage when the advisor lacks conversion permission', async () => {
    const t = harness({ grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work', 'quote.convert'] }] });
    assert.equal(await outcome(() => t.service.execute('CreateOrder', ctx(ADVISOR), { quoteId: 'quote-1' })), 'PERMISSION_DENIED');
    assert.deepEqual(t.writes, []);
  });

  it('treats expired, revoked or foreign quote.convert coverage as no access', async () => {
    for (const grant of [
      { actingAdvisorMemberId: ADVISOR, coveredActions: ['quote.convert'] as const, endsAt: new Date('2026-10-01T00:00:00Z') },
      { actingAdvisorMemberId: ADVISOR, coveredActions: ['quote.convert'] as const, revokedAt: new Date('2026-10-01T00:00:00Z') },
    ]) {
      const t = harness({ scopes: { [ADVISOR]: ['commercial.quote.convert.own'] }, grants: [grant] });
      assert.equal(await outcome(() => t.service.execute('CreateOrder', ctx(ADVISOR), { quoteId: 'quote-1' })), 'NOT_FOUND');
      assert.deepEqual(t.writes, []);
    }
    const foreign = harness({
      scopes: { [ADVISOR]: ['commercial.quote.convert.own'] },
      grants: [{ actingAdvisorMemberId: ADVISOR, coveredActions: ['quote.convert'] }],
      quote: quote({ organizationId: FOREIGN_ORG, partyId: FOREIGN_PARTY }),
    });
    assert.equal(await outcome(() => foreign.service.execute('CreateOrder', ctx(ADVISOR), { quoteId: 'quote-1' })), 'NOT_FOUND');
    assert.deepEqual(foreign.writes, []);
  });

  it('treats expired and revoked coverage as no access and no visibility', async () => {
    for (const grant of [
      { actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work'] as const, endsAt: new Date('2026-10-01T00:00:00Z') },
      { actingAdvisorMemberId: ADVISOR, coveredActions: ['commercial.work'] as const, revokedAt: new Date('2026-10-01T00:00:00Z') },
    ]) {
      const t = harness({ grants: [grant] });
      assert.equal(await outcome(() => t.service.execute('CreateQuote', ctx(ADVISOR), { partyId: PARTY })), 'NOT_FOUND');
      assert.deepEqual(t.writes, []);
    }
  });

  it('refuses an explicit owner other than the current account owner', async () => {
    const t = harness();
    assert.equal(
      await outcome(() => t.service.execute('CreateQuote', ctx(OWNER), { partyId: PARTY, ownerMemberId: ADVISOR })),
      'VALIDATION_FAILED',
    );
    assert.deepEqual(t.writes, []);
  });
});

describe('T03 customer authority: manager work needs range plus commercial.work.manage', () => {
  const MANAGER = 'mem-manager';
  const WORK = COMMANDS.slice(0, 4);

  it('lets a team lead with commercial.work.manage work the account without becoming owner', async () => {
    for (const probe of WORK) {
      const t = harness({
        scopes: { [MANAGER]: ['commercial.team.read', 'commercial.work.manage'] },
        leadsOwner: [MANAGER],
        quote: quote(probe.quote),
      });
      assert.equal(await outcome(() => t.service.execute(probe.command, ctx(MANAGER), probe.payload)), 'OK', probe.command);
      assert.equal(t.events.at(-1)!.actorMemberId, MANAGER, probe.command);
    }
    const created = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.work.manage'] }, leadsOwner: [MANAGER] });
    await created.service.execute('CreateQuote', ctx(MANAGER), { partyId: PARTY });
    assert.deepEqual(created.writes.filter((w) => w.startsWith('insertQuote')), [`insertQuote:${OWNER}`]);
    assert.equal(created.events[0]!.payload?.ownerMemberId, OWNER);
  });

  it('lets commercial.org.read with commercial.work.manage work any account in the org', async () => {
    const t = harness({ scopes: { [MANAGER]: ['commercial.org.read', 'commercial.work.manage'] } });
    assert.equal(await outcome(() => t.service.execute('CreateQuote', ctx(MANAGER), { partyId: PARTY })), 'OK');
  });

  it('keeps team.read and org.read read-only without the action permission', async () => {
    for (const scopes of [['commercial.team.read'], ['commercial.org.read']]) {
      for (const probe of WORK) {
        const t = harness({ scopes: { [MANAGER]: scopes }, leadsOwner: [MANAGER], quote: quote(probe.quote) });
        assert.equal(await outcome(() => t.service.execute(probe.command, ctx(MANAGER), probe.payload)), 'PERMISSION_DENIED', `${scopes} ${probe.command}`);
        assert.deepEqual(t.writes, []);
      }
    }
  });

  it('denies a manager outside the owner\'s team as if the customer did not exist', async () => {
    for (const probe of WORK) {
      const t = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.work.manage'] }, quote: quote(probe.quote) });
      assert.equal(await outcome(() => t.service.execute(probe.command, ctx(MANAGER), probe.payload)), 'NOT_FOUND', probe.command);
      assert.deepEqual(t.writes, []);
    }
  });

  it('denies commercial.work.manage without any range, and never via people.admin or master_data.admin', async () => {
    for (const scopes of [['commercial.work.manage'], ['people.admin', 'commercial.team.read'], ['master_data.admin', 'commercial.team.read']]) {
      const t = harness({ scopes: { [MANAGER]: scopes }, leadsOwner: [MANAGER] });
      const result = await outcome(() => t.service.execute('CreateQuote', ctx(MANAGER), { partyId: PARTY }));
      assert.notEqual(result, 'OK', String(scopes));
      assert.deepEqual(t.writes, []);
    }
  });

  it('does not let manager work convert, cancel orders or reassign the opportunity owner', async () => {
    const scopes = { [MANAGER]: ['commercial.team.read', 'commercial.work.manage', 'commercial.quote.convert.own'] };
    for (const probe of COMMANDS.slice(4)) {
      const t = harness({ scopes, leadsOwner: [MANAGER] });
      assert.equal(await outcome(() => t.service.execute(probe.command, ctx(MANAGER), probe.payload)), 'PERMISSION_DENIED', probe.command);
      assert.deepEqual(t.writes, []);
    }
    const t = harness({ scopes, leadsOwner: [MANAGER] });
    assert.equal(
      await outcome(() => t.service.execute('AssignOpportunityOwner', ctx(MANAGER), { opportunityId: 'opp-1', ownerMemberId: MANAGER })),
      'PERMISSION_DENIED',
    );
    assert.deepEqual(t.writes, []);
  });

  it('cannot edit a non-draft quote (state rules unchanged)', async () => {
    const t = harness({ scopes: { [MANAGER]: ['commercial.team.read', 'commercial.work.manage'] }, leadsOwner: [MANAGER], quote: quote({ status: 'submitted' }) });
    assert.equal(
      await outcome(() => t.service.execute('AddQuoteLine', ctx(MANAGER), { quoteId: 'quote-1', description: 'x', quantity: 1, unitPriceCentavos: 100 })),
      'VALIDATION_FAILED',
    );
  });
});

describe('T03 customer authority: non-disclosure', () => {
  it('answers nonexistent, foreign-tenant and inaccessible customers identically', async () => {
    for (const command of ['CreateQuote', 'CreateOpportunity'] as const) {
      const answers: string[] = [];
      for (const partyId of ['party-missing', FOREIGN_PARTY, PARTY]) {
        const t = harness();
        answers.push(await outcome(() => t.service.execute(command, ctx(STRANGER), { partyId, title: 'x' })));
        assert.deepEqual(t.writes, [], `${command} ${partyId}`);
      }
      assert.deepEqual(answers, ['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND'], command);
    }
  });

  it('answers nonexistent, foreign-tenant and inaccessible quotes identically', async () => {
    const answers: string[] = [];
    for (const row of [quote({ id: 'other-id' }), quote({ organizationId: FOREIGN_ORG }), quote()]) {
      const t = harness({ quote: row });
      answers.push(await outcome(() => t.service.execute('CreateOrder', ctx(STRANGER), { quoteId: 'quote-1' })));
      assert.deepEqual(t.writes, []);
    }
    assert.deepEqual(answers, ['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND']);
  });

  it('does not reveal an archived customer\'s status to a caller who cannot know it', async () => {
    const owner = harness({ partyStatus: 'inactive' });
    assert.equal(await outcome(() => owner.service.execute('CreateQuote', ctx(OWNER), { partyId: PARTY })), 'VALIDATION_FAILED');
    const stranger = harness({ partyStatus: 'inactive' });
    assert.equal(await outcome(() => stranger.service.execute('CreateQuote', ctx(STRANGER), { partyId: PARTY })), 'NOT_FOUND');
    assert.deepEqual([...owner.writes, ...stranger.writes], []);
  });
});
