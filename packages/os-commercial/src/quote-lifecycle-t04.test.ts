import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import {
  assertIssuedDocumentHashMatches,
  buildQuoteIssuedSnapshot,
  quoteIssuedDocumentHash,
  stableJson,
} from './quote-issuance';
import type {
  OrderLineRecord,
  OrderRecord,
  QuoteApprovalRecord,
  QuoteLineRecord,
  QuoteRecord,
} from './store-types';

/**
 * T04 lifecycle: draft → approval of exact terms → issue (SubmitQuote) →
 * customer acceptance → CreateOrder. The fake store is stateful so revisions,
 * approvals and the single-order-per-quote key behave as the database would.
 */

const ORG = 'org-a';
const OWNER = 'mem-owner';
const APPROVER = 'mem-approver';
const QUOTE_ID = 'quote-1';
const NOW = new Date('2026-11-16T15:00:00.000Z');
const TODAY = '2026-11-16';

function ctx(actorMemberId = OWNER, effectiveAt = NOW): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-t04',
    effectiveAt,
  };
}

function draftQuote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: QUOTE_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000001',
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: 20000n,
    headerDiscountCentavos: 0n,
    totalCentavos: 20000n,
    revisionNumber: 1,
    notes: null,
    version: 0,
    submittedAt: null,
    issuedAt: null,
    issuedDocumentHash: null,
    issuedRevisionNumber: null,
    validUntil: null,
    customerAcceptedAt: null,
    customerAcceptanceChannel: null,
    customerAcceptanceEvidence: null,
    customerAcceptedRevision: null,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function quoteLine(overrides: Partial<QuoteLineRecord> = {}): QuoteLineRecord {
  return {
    id: 'line-1',
    organizationId: ORG,
    quoteId: QUOTE_ID,
    lineNumber: 1,
    description: 'Lavamanos',
    quantity: 2,
    unitLabel: 'unidad',
    unitPriceCentavos: 10000n,
    discountCentavos: 0n,
    lineTotalCentavos: 20000n,
    productRef: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function approval(boundRevision: number | null, status = 'approved', id = 'approval-1'): QuoteApprovalRecord {
  return {
    id,
    status,
    contextSnapshotJson: boundRevision == null ? {} : { boundRevision },
    requestedByMemberId: OWNER,
    approverMemberId: APPROVER,
    decisionByMemberId: status === 'approved' ? APPROVER : null,
    decidedAt: status === 'approved' ? NOW : null,
  };
}

function harness(input: { quote?: Partial<QuoteRecord>; lines?: QuoteLineRecord[]; approvals?: QuoteApprovalRecord[] } = {}) {
  const quote = draftQuote(input.quote);
  const lines = new Map((input.lines ?? [quoteLine()]).map((row) => [row.id, row]));
  const approvals: QuoteApprovalRecord[] = input.approvals ?? [];
  const orders: OrderRecord[] = [];
  const orderLines: OrderLineRecord[] = [];
  const events: Array<{ eventType: string; payload?: Record<string, unknown> }> = [];
  const account = { id: 'acct-1', organizationId: ORG, partyId: 'party-1', ownerMemberId: OWNER, status: 'active', version: 1 };

  const store = {
    async runInTransaction(fn: (next: OsCommercialStore) => Promise<unknown>) {
      return fn(store as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      return organizationId === ORG ? { id: memberId, organizationId, accessStatus: 'active' } : null;
    },
    async listRoleAssignmentsForMember(memberId: string) {
      if (memberId !== OWNER) return [];
      return [{ roleKey: 'commercial.quote.convert.own', effectiveAt: new Date('2026-01-01'), endedAt: null }];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getCommercialAccountForParty(organizationId: string) {
      return organizationId === ORG ? account : null;
    },
    async getCommercialAccountInOrg(organizationId: string) {
      return organizationId === ORG ? account : null;
    },
    async listActiveCustomerCoverageGrants() {
      return [];
    },
    async isDirectReport() {
      return false;
    },
    async getQuoteInOrg(organizationId: string, quoteId: string) {
      return organizationId === quote.organizationId && quoteId === quote.id ? { ...quote } : null;
    },
    async updateQuote(_org: string, _id: string, patch: Partial<QuoteRecord>, expectedVersion: number) {
      if (quote.version !== expectedVersion) throw new Error('CONFLICT');
      Object.assign(quote, patch);
    },
    async listQuoteApprovals() {
      return approvals;
    },
    async listQuoteLines() {
      return [...lines.values()].sort((a, b) => a.lineNumber - b.lineNumber);
    },
    async getQuoteLineInOrg(organizationId: string, lineId: string) {
      const row = lines.get(lineId);
      return row && row.organizationId === organizationId ? row : null;
    },
    async nextQuoteLineNumber() {
      return lines.size + 1;
    },
    async insertQuoteLine(row: QuoteLineRecord) {
      lines.set(row.id, row);
    },
    async updateQuoteLine(_org: string, lineId: string, patch: Partial<QuoteLineRecord>) {
      Object.assign(lines.get(lineId)!, patch);
    },
    async deleteQuoteLine(_org: string, lineId: string) {
      lines.delete(lineId);
    },
    async getOrderForQuote(_org: string, quoteId: string) {
      // Yield so two concurrent conversions both pass this read before either inserts.
      await Promise.resolve();
      return orders.find((order) => order.quoteId === quoteId) ?? null;
    },
    async countOrdersForOrg() {
      return orders.length;
    },
    async insertOrder(order: OrderRecord) {
      // unique(organizationId, quoteId): the loser of a race gets CONFLICT.
      if (orders.some((row) => row.organizationId === order.organizationId && row.quoteId === order.quoteId)) {
        throw new Error('CONFLICT');
      }
      orders.push(order);
    },
    async insertOrderLines(rows: OrderLineRecord[]) {
      orderLines.push(...rows);
    },
    async appendEventAndAudit(event: { eventType: string; payload?: Record<string, unknown> }) {
      events.push(event);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
  const service = new CommercialCommandService(store as unknown as OsCommercialStore);
  const run = (command: Parameters<CommercialCommandService['execute']>[0], payload: Record<string, unknown>, who = OWNER, at = NOW) =>
    service.execute(command, ctx(who, at), payload);
  return { quote, lines, approvals, orders, orderLines, events, service, run };
}

const ACCEPT = {
  quoteId: QUOTE_ID,
  channel: 'llamada',
  acceptedOn: TODAY,
  evidence: 'El cliente confirmó por teléfono con el vendedor',
  expectedRevision: 1,
};

describe('T04 revision: material changes void earlier approvals', () => {
  it('increments the revision on line add, update, remove and header changes', async () => {
    const t = harness();
    assert.equal(t.quote.revisionNumber, 1);
    await t.run('AddQuoteLine', { quoteId: QUOTE_ID, description: 'Inodoro', quantity: 1, unitPriceCentavos: 5000 });
    assert.equal(t.quote.revisionNumber, 2);
    await t.run('UpdateQuoteLine', { quoteLineId: 'line-1', quantity: 3 });
    assert.equal(t.quote.revisionNumber, 3);
    await t.run('UpdateQuoteLine', { quoteLineId: 'line-1', discountCentavos: 500 });
    assert.equal(t.quote.revisionNumber, 4);
    await t.run('UpdateQuote', { quoteId: QUOTE_ID, headerDiscountCentavos: 100 });
    assert.equal(t.quote.revisionNumber, 5);
    await t.run('UpdateQuote', { quoteId: QUOTE_ID, notes: 'Entrega en obra' });
    assert.equal(t.quote.revisionNumber, 6);
    await t.run('UpdateQuote', { quoteId: QUOTE_ID, validUntil: '2026-12-31' });
    assert.equal(t.quote.revisionNumber, 7);
    assert.equal(t.quote.validUntil?.toISOString(), '2026-12-31T23:59:59.999Z');
    await t.run('RemoveQuoteLine', { quoteLineId: 'line-1' });
    assert.equal(t.quote.revisionNumber, 8);
  });

  it('keeps the revision for an exact no-op update', async () => {
    const t = harness({ quote: { notes: 'igual', validUntil: new Date('2026-12-31T23:59:59.999Z') } });
    await t.run('UpdateQuote', { quoteId: QUOTE_ID, notes: 'igual', validUntil: '2026-12-31' });
    await t.run('UpdateQuoteLine', { quoteLineId: 'line-1', quantity: 2, description: 'Lavamanos' });
    assert.equal(t.quote.revisionNumber, 1);
  });

  it('refuses a validity value that is not a date', async () => {
    const t = harness();
    await assert.rejects(() => t.run('UpdateQuote', { quoteId: QUOTE_ID, validUntil: 'mañana' }), /VALIDATION_FAILED/);
  });
});

describe('T04 issue (SubmitQuote / Emitir)', () => {
  it('refuses to issue a draft with no approval', async () => {
    const t = harness();
    await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
    assert.equal(t.quote.status, 'draft');
    assert.equal(t.quote.issuedAt, null);
    assert.deepEqual(t.events, []);
  });

  it('refuses a quote with no lines even when approved', async () => {
    const t = harness({ lines: [], approvals: [approval(1)] });
    await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
  });

  it('refuses pending, rejected and legacy unbound approvals', async () => {
    for (const rows of [[approval(1, 'pending')], [approval(1, 'rejected')], [approval(null)]]) {
      const t = harness({ approvals: rows });
      await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
      assert.equal(t.quote.status, 'draft');
    }
  });

  it('refuses a stale approval after a material change (price, quantity, discount, notes, validity)', async () => {
    const changes: Array<[string, Record<string, unknown>]> = [
      ['UpdateQuoteLine', { quoteLineId: 'line-1', unitPriceCentavos: 9000 }],
      ['UpdateQuoteLine', { quoteLineId: 'line-1', quantity: 5 }],
      ['UpdateQuoteLine', { quoteLineId: 'line-1', discountCentavos: 1000 }],
      ['UpdateQuote', { quoteId: QUOTE_ID, notes: 'otro texto' }],
      ['UpdateQuote', { quoteId: QUOTE_ID, validUntil: '2026-12-01' }],
    ];
    for (const [command, payload] of changes) {
      const t = harness({ approvals: [approval(1)] });
      await t.run(command as 'UpdateQuote', payload);
      await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/, command);
      assert.equal(t.quote.status, 'draft', command);
    }
  });

  it('issues with an approval bound to the current revision and freezes the terms hash', async () => {
    const t = harness({ approvals: [approval(1)] });
    const result = await t.run('SubmitQuote', { quoteId: QUOTE_ID });
    assert.equal(t.quote.status, 'submitted');
    assert.equal(t.quote.issuedAt?.toISOString(), NOW.toISOString());
    assert.equal(t.quote.submittedAt?.toISOString(), NOW.toISOString());
    assert.equal(t.quote.issuedRevisionNumber, 1);
    const expected = quoteIssuedDocumentHash({
      quoteNumber: 'Q-000001',
      revisionNumber: 1,
      partyId: 'party-1',
      currency: 'BOB',
      notes: null,
      validUntil: null,
      headerDiscountCentavos: 0n,
      lines: [quoteLine()],
    });
    assert.match(t.quote.issuedDocumentHash ?? '', /^[0-9a-f]{64}$/);
    assert.equal(t.quote.issuedDocumentHash, expected);
    assert.equal(result.data.issuedDocumentHash, expected);
    assert.deepEqual(t.events.map((event) => event.eventType), ['quote.submitted']);
  });

  it('issues a revision that was approved after earlier revisions were approved and then changed', async () => {
    const t = harness({ quote: { revisionNumber: 3 }, approvals: [approval(1, 'approved', 'old'), approval(3, 'approved', 'new')] });
    await t.run('SubmitQuote', { quoteId: QUOTE_ID });
    assert.equal(t.quote.issuedRevisionNumber, 3);
  });

  it('refuses to issue twice', async () => {
    const t = harness({ approvals: [approval(1)] });
    await t.run('SubmitQuote', { quoteId: QUOTE_ID });
    await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
    assert.equal(t.events.length, 1);
  });

  it('refuses a draft that somehow carries an issuance stamp', async () => {
    const t = harness({ quote: { issuedAt: NOW }, approvals: [approval(1)] });
    await assert.rejects(() => t.run('SubmitQuote', { quoteId: QUOTE_ID }), /CONFLICT/);
  });

  it('changes the hash when any material term changes and ignores key order', () => {
    const base = {
      quoteNumber: 'Q-000001',
      revisionNumber: 1,
      partyId: 'party-1',
      currency: 'BOB',
      notes: null,
      validUntil: null,
      headerDiscountCentavos: 0n,
      lines: [quoteLine()],
    };
    const hash = quoteIssuedDocumentHash(base);
    assert.equal(quoteIssuedDocumentHash({ ...base, lines: [quoteLine()] }), hash);
    assert.notEqual(quoteIssuedDocumentHash({ ...base, notes: 'x' }), hash);
    assert.notEqual(quoteIssuedDocumentHash({ ...base, partyId: 'party-2' }), hash);
    assert.notEqual(quoteIssuedDocumentHash({ ...base, headerDiscountCentavos: 1n }), hash);
    assert.notEqual(quoteIssuedDocumentHash({ ...base, validUntil: new Date('2026-12-01T00:00:00Z') }), hash);
    assert.notEqual(quoteIssuedDocumentHash({ ...base, lines: [quoteLine({ discountCentavos: 1n, lineTotalCentavos: 19999n })] }), hash);
    assert.equal(stableJson({ b: 1, a: { d: 2, c: [3, { y: 1, x: 2 }] } }), '{"a":{"c":[3,{"x":2,"y":1}],"d":2},"b":1}');
    const snapshot = buildQuoteIssuedSnapshot(base);
    assert.equal(snapshot.totalCentavos, '20000');
    assert.doesNotThrow(() => assertIssuedDocumentHashMatches(hash, base));
    assert.throws(
      () => assertIssuedDocumentHashMatches(hash, { ...base, notes: 'drift' }),
      /ISSUED_DOCUMENT_MISMATCH/,
    );
  });
});

describe('T04 customer acceptance (RecordQuoteCustomerAcceptance)', () => {
  const issued = (overrides: Partial<QuoteRecord> = {}) =>
    harness({
      quote: {
        status: 'submitted',
        submittedAt: NOW,
        issuedAt: NOW,
        issuedRevisionNumber: 1,
        issuedDocumentHash: 'hash-1',
        version: 1,
        ...overrides,
      },
      approvals: [approval(1)],
    });

  it('records the exact revision, channel, date and evidence, and emits the event', async () => {
    const t = issued();
    const result = await t.run('RecordQuoteCustomerAcceptance', ACCEPT);
    assert.equal(t.quote.status, 'accepted');
    assert.equal(t.quote.customerAcceptedRevision, 1);
    assert.equal(t.quote.customerAcceptanceChannel, 'llamada');
    assert.equal(t.quote.customerAcceptanceEvidence, ACCEPT.evidence);
    assert.equal(t.quote.customerAcceptedAt?.toISOString().slice(0, 10), TODAY);
    assert.deepEqual(t.events.map((event) => event.eventType), ['quote.customer_acceptance.recorded']);
    assert.equal(result.data.providerAcknowledgement, false);
    assert.equal(t.orders.length, 0);
  });

  it('refuses a draft, an unissued legacy submitted quote, and an already accepted quote', async () => {
    for (const overrides of [
      { status: 'draft' as const, submittedAt: null, issuedAt: null, issuedRevisionNumber: null },
      { issuedAt: null, issuedRevisionNumber: null, issuedDocumentHash: null },
      { status: 'accepted' as const },
    ]) {
      const t = issued(overrides);
      await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', ACCEPT), /VALIDATION_FAILED/, JSON.stringify(overrides));
      assert.deepEqual(t.events, []);
    }
  });

  it('refuses an acceptance for a different revision than the current one', async () => {
    const t = issued({ revisionNumber: 2, issuedRevisionNumber: 2 });
    await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', { ...ACCEPT, expectedRevision: 1 }), /CONFLICT/);
    assert.equal(t.quote.status, 'submitted');
  });

  it('refuses terms that were issued at an older revision than the current one', async () => {
    const t = issued({ revisionNumber: 2, issuedRevisionNumber: 1 });
    await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', { ...ACCEPT, expectedRevision: 2 }), /CONFLICT/);
  });

  it('requires real evidence, a known channel and a sane date', async () => {
    for (const bad of [
      { evidence: 'ok' },
      { evidence: '   ok ok ok  ' },
      { evidence: 'x'.repeat(501) },
      { channel: 'sms' },
      { acceptedOn: '16/11/2026' },
      { acceptedOn: '2026-11-30' },
      { acceptedOn: '2026-10-01' },
    ]) {
      const t = issued();
      await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', { ...ACCEPT, ...bad }), /VALIDATION_FAILED/, JSON.stringify(bad));
      assert.equal(t.quote.status, 'submitted');
    }
  });

  it('refuses acceptance after the stated validity ended (needs clarification instead)', async () => {
    const t = issued({ validUntil: new Date('2026-11-10T23:59:59.999Z') });
    await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', ACCEPT), /VALIDATION_FAILED/);
    const ok = issued({ validUntil: new Date('2026-11-16T23:59:59.999Z') });
    await ok.run('RecordQuoteCustomerAcceptance', ACCEPT);
    assert.equal(ok.quote.status, 'accepted');
  });

  it('answers a member with no access to the account as for a missing quote', async () => {
    const t = issued();
    await assert.rejects(() => t.run('RecordQuoteCustomerAcceptance', ACCEPT, 'mem-stranger'), /NOT_FOUND/);
  });
});

describe('T04 conversion (CreateOrder)', () => {
  const accepted = (overrides: Partial<QuoteRecord> = {}, approvals = [approval(1)]) =>
    harness({
      quote: {
        status: 'accepted',
        submittedAt: NOW,
        issuedAt: NOW,
        issuedRevisionNumber: 1,
        issuedDocumentHash: 'hash-1',
        customerAcceptedAt: new Date(`${TODAY}T00:00:00.000Z`),
        customerAcceptanceChannel: 'llamada',
        customerAcceptanceEvidence: ACCEPT.evidence,
        customerAcceptedRevision: 1,
        version: 2,
        ...overrides,
      },
      approvals,
    });

  it('requires customer acceptance: an issued (submitted) quote cannot be converted', async () => {
    const t = harness({
      quote: { status: 'submitted', submittedAt: NOW, issuedAt: NOW, issuedRevisionNumber: 1, issuedDocumentHash: 'hash-1' },
      approvals: [approval(1)],
    });
    await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
    assert.equal(t.orders.length, 0);
    assert.deepEqual(t.events, []);
  });

  it('walks the whole lifecycle to exactly one order', async () => {
    const t = harness();
    t.approvals.push(approval(1));
    await t.run('SubmitQuote', { quoteId: QUOTE_ID });
    await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
    await t.run('RecordQuoteCustomerAcceptance', ACCEPT);
    const result = await t.run('CreateOrder', { quoteId: QUOTE_ID });
    assert.equal(t.orders.length, 1);
    assert.equal(t.orderLines.length, 1);
    assert.equal(result.data.quoteId, QUOTE_ID);
    assert.equal(t.quote.status, 'accepted');
    assert.deepEqual(t.events.map((event) => event.eventType), [
      'quote.submitted',
      'quote.customer_acceptance.recorded',
      'order.created',
    ]);
  });

  it('refuses when the acceptance belongs to another revision than the current one', async () => {
    const t = accepted({ revisionNumber: 2, customerAcceptedRevision: 1 }, [approval(2)]);
    await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
    assert.equal(t.orders.length, 0);
  });

  it('refuses when the approval no longer binds the accepted revision', async () => {
    for (const rows of [[approval(0)], [approval(1, 'rejected')], [approval(null)], []]) {
      const t = accepted({}, rows);
      await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }), /VALIDATION_FAILED/);
      assert.equal(t.orders.length, 0);
    }
  });

  it('keeps conversion authority: a stranger and an unauthorized member cannot convert', async () => {
    const t = accepted();
    await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }, 'mem-stranger'), /NOT_FOUND/);
    assert.equal(t.orders.length, 0);
  });

  it('turns a second conversion into CONFLICT', async () => {
    const t = accepted();
    await t.run('CreateOrder', { quoteId: QUOTE_ID });
    await assert.rejects(() => t.run('CreateOrder', { quoteId: QUOTE_ID }), /CONFLICT/);
    assert.equal(t.orders.length, 1);
  });

  it('lets one of two concurrent conversions win and the other fail with CONFLICT', async () => {
    const t = accepted();
    const outcomes = await Promise.allSettled([
      t.run('CreateOrder', { quoteId: QUOTE_ID }),
      t.run('CreateOrder', { quoteId: QUOTE_ID }),
    ]);
    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(String(rejected[0]!.reason), /CONFLICT/);
    assert.equal(t.orders.length, 1);
    assert.equal(t.orderLines.length, 1);
    assert.equal(t.events.filter((event) => event.eventType === 'order.created').length, 1);
  });
});
