import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import type { QuoteLineRecord, QuoteRecord } from './store-types';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const OWNER = 'mem-owner';
const OTHER = 'mem-other';
const QUOTE_ID = 'quote-1';
const NOW = new Date('2026-09-16T18:00:00.000Z');

function ctx(actorMemberId: string, organizationId = ORG): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-send-1',
    effectiveAt: NOW,
  };
}

function quote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: QUOTE_ID,
    organizationId: ORG,
    partyId: 'party-1',
    commercialAccountId: 'acct-1',
    opportunityId: null,
    ownerMemberId: OWNER,
    quoteNumber: 'Q-000042',
    status: 'submitted',
    currency: 'BOB',
    subtotalCentavos: 100n,
    headerDiscountCentavos: 0n,
    totalCentavos: 100n,
    revisionNumber: 1,
    notes: null,
    version: 1,
    submittedAt: NOW,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function line(): QuoteLineRecord {
  return {
    id: 'line-1',
    organizationId: ORG,
    quoteId: QUOTE_ID,
    lineNumber: 1,
    description: 'Item',
    quantity: 1,
    unitLabel: null,
    unitPriceCentavos: 100n,
    discountCentavos: 0n,
    lineTotalCentavos: 100n,
    productRef: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function storeFor(input: { quote?: QuoteRecord | null }): OsCommercialStore & {
  events: Array<{ eventType: string; payload?: Record<string, unknown>; actorMemberId?: string }>;
} {
  const row = input.quote === undefined ? quote() : input.quote;
  const events: Array<{
    eventType: string;
    payload?: Record<string, unknown>;
    actorMemberId?: string;
  }> = [];
  return {
    events,
    async runInTransaction(fn) {
      return fn(this);
    },
    async getMemberInOrg(organizationId, memberId) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember() {
      return [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getQuoteInOrg(organizationId, quoteId) {
      if (!row || organizationId !== row.organizationId || quoteId !== row.id) return null;
      return row;
    },
    async listQuoteLines() {
      return [line()];
    },
    async appendEventAndAudit(event) {
      events.push({
        eventType: event.eventType,
        payload: event.payload as Record<string, unknown> | undefined,
        actorMemberId: event.actorMemberId ?? undefined,
      });
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  } as unknown as OsCommercialStore & {
    events: Array<{ eventType: string; payload?: Record<string, unknown>; actorMemberId?: string }>;
  };
}

describe('RecordQuoteManualSend', () => {
  it('lets the quote owner record a WhatsApp send without provider confirmation', async () => {
    const store = storeFor({});
    const service = new CommercialCommandService(store);
    const result = await service.execute(
      'RecordQuoteManualSend',
      ctx(OWNER),
      { quoteId: QUOTE_ID, channel: 'whatsapp', note: 'PDF por chat' },
      'idem-send-1',
    );
    assert.equal(result.data.quoteId, QUOTE_ID);
    assert.equal(result.data.channel, 'whatsapp');
    assert.equal(result.data.providerSend, false);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]?.eventType, 'quote.send_recorded');
    assert.equal(store.events[0]?.actorMemberId, OWNER);
    assert.equal(store.events[0]?.payload?.channel, 'whatsapp');
    assert.equal(store.events[0]?.payload?.providerSend, false);
    assert.equal(store.events[0]?.payload?.note, 'PDF por chat');
  });

  it('denies another advisor who does not own the quote', async () => {
    const store = storeFor({});
    const service = new CommercialCommandService(store);
    await assert.rejects(
      () =>
        service.execute('RecordQuoteManualSend', ctx(OTHER), {
          quoteId: QUOTE_ID,
          channel: 'whatsapp',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.events.length, 0);
  });

  it('denies a cross-tenant quote', async () => {
    const store = storeFor({ quote: quote({ organizationId: OTHER_ORG }) });
    const service = new CommercialCommandService(store);
    await assert.rejects(
      () =>
        service.execute('RecordQuoteManualSend', ctx(OWNER), {
          quoteId: QUOTE_ID,
          channel: 'otro',
        }),
      /NOT_FOUND/,
    );
  });

  it('denies draft, accepted, and cancelled quotes', async () => {
    for (const status of ['draft', 'accepted', 'cancelled'] as const) {
      const store = storeFor({ quote: quote({ status }) });
      const service = new CommercialCommandService(store);
      await assert.rejects(
        () =>
          service.execute('RecordQuoteManualSend', ctx(OWNER), {
            quoteId: QUOTE_ID,
            channel: 'whatsapp',
          }),
        /VALIDATION_FAILED/,
      );
    }
  });

  it('replays the same idempotency key without a second event', async () => {
    const store = storeFor({});
    const saved: { resultJson: Record<string, unknown> }[] = [];
    (store as unknown as { findIdempotency: OsCommercialStore['findIdempotency'] }).findIdempotency =
      async () => (saved[0] ? { resultJson: saved[0].resultJson } : null) as never;
    (store as unknown as { saveIdempotency: OsCommercialStore['saveIdempotency'] }).saveIdempotency =
      async (row) => {
        saved.push({ resultJson: row.resultJson });
      };
    const service = new CommercialCommandService(store);
    const first = await service.execute(
      'RecordQuoteManualSend',
      ctx(OWNER),
      { quoteId: QUOTE_ID, channel: 'otro' },
      'idem-dup',
    );
    const second = await service.execute(
      'RecordQuoteManualSend',
      ctx(OWNER),
      { quoteId: QUOTE_ID, channel: 'otro' },
      'idem-dup',
    );
    assert.equal(store.events.length, 1);
    assert.equal(first.data.quoteId, second.data.quoteId);
    assert.equal(second.data.channel, 'otro');
  });
});
