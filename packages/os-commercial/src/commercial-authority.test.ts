import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import type { CommercialAccountRecord, QuoteLineRecord, QuoteRecord } from './store-types';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const OWNER = 'mem-owner';
const OTHER = 'mem-other';
const QUOTE_ID = 'quote-1';
const NOW = new Date('2026-09-13T12:00:00.000Z');

function ctx(actorMemberId: string, organizationId = ORG): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-1',
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
    quoteNumber: 'Q-000001',
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

function storeFor(input: {
  actorScopes?: string[];
  quote?: QuoteRecord | null;
  existingOrder?: boolean;
}): OsCommercialStore {
  const actorScopes = input.actorScopes ?? [];
  const row = input.quote === undefined ? quote() : input.quote;
  const events: string[] = [];
  return {
    async runInTransaction(fn) {
      return fn(this);
    },
    async getMemberInOrg(organizationId, memberId) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember(memberId) {
      if (memberId === OWNER) return [];
      return actorScopes.map((roleKey) => ({
        roleKey,
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        endedAt: null,
      }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getQuoteInOrg(organizationId, quoteId) {
      if (!row || organizationId !== row.organizationId || quoteId !== row.id) return null;
      return row;
    },
    async getOrderForQuote() {
      return input.existingOrder ? ({ id: 'order-existing' } as never) : null;
    },
    async listQuoteLines() {
      return [line()];
    },
    async countOrdersForOrg() {
      return 0;
    },
    async insertOrder() {},
    async updateQuote() {},
    async appendEventAndAudit(event) {
      events.push(event.eventType);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
    events,
  } as unknown as OsCommercialStore & { events: string[] };
}

async function convert(actorMemberId: string, options: Parameters<typeof storeFor>[0] = {}) {
  const store = storeFor(options);
  const service = new CommercialCommandService(store);
  return service.execute('CreateOrder', ctx(actorMemberId), { quoteId: QUOTE_ID });
}

describe('CreateOrder provisional authority', () => {
  it('lets the quote owner convert a submitted quote', async () => {
    const result = await convert(OWNER);
    assert.equal(result.data.quoteId, QUOTE_ID);
    assert.equal(typeof result.data.orderId, 'string');
  });

  it('denies an unrelated active member', async () => {
    await assert.rejects(() => convert(OTHER), /PERMISSION_DENIED/);
  });

  it('denies read-only Jefe and Gerente scopes', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.team.read'] }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.org.read'] }),
      /PERMISSION_DENIED/,
    );
  });

  it('does not treat people.admin as conversion authority', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['people.admin'] }),
      /PERMISSION_DENIED/,
    );
  });

  it('lets the explicit conversion capability succeed', async () => {
    const result = await convert(OTHER, { actorScopes: ['commercial.order.convert'] });
    assert.equal(result.data.quoteId, QUOTE_ID);
  });

  it('denies a cross-tenant quote', async () => {
    await assert.rejects(
      () => convert(OWNER, { quote: quote({ organizationId: OTHER_ORG }) }),
      /NOT_FOUND/,
    );
  });

  it('denies draft, cancelled, and accepted quotes', async () => {
    for (const status of ['draft', 'cancelled', 'accepted'] as const) {
      await assert.rejects(() => convert(OWNER, { quote: quote({ status }) }), /VALIDATION_FAILED/);
    }
  });

  it('enforces conversion inside the command and does not mention leadership read scopes', () => {
    const source = readFileSync(resolve(__dirname, 'commercial-command-service.ts'), 'utf8');
    const start = source.indexOf('private async createOrder');
    const end = source.indexOf('private async cancelOrder');
    const body = source.slice(start, end);
    assert.match(body, /canConvertQuoteToOrder/);
    assert.doesNotMatch(body, /memberHasAdminScope/);
    assert.doesNotMatch(body, /people\.admin/);
    assert.doesNotMatch(source, /commercial\.(team|org)\.read/);
  });
});

function account(overrides: Partial<CommercialAccountRecord> = {}): CommercialAccountRecord {
  return {
    id: 'acct-1',
    organizationId: ORG,
    partyId: 'party-1',
    ownerMemberId: OWNER,
    status: 'active',
    version: 2,
    ...overrides,
  };
}

function reassignStore(input: {
  scopes?: string[];
  account?: CommercialAccountRecord | null;
  targetStatus?: string | null;
}) {
  const events: string[] = [];
  const scopes = input.scopes ?? [];
  const row = input.account === undefined ? account() : input.account;
  return {
    events,
    async runInTransaction(fn: (store: OsCommercialStore) => Promise<unknown>) {
      return fn(this as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      if (input.targetStatus === null && memberId !== 'mem-actor') return null;
      return {
        id: memberId,
        organizationId,
        accessStatus: memberId === OTHER ? (input.targetStatus ?? 'active') : 'active',
      };
    },
    async listRoleAssignmentsForMember() {
      return scopes.map((roleKey) => ({
        roleKey,
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        endedAt: null,
      }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getCommercialAccountInOrg(organizationId: string, commercialAccountId: string) {
      if (!row || organizationId !== row.organizationId || commercialAccountId !== row.id) return null;
      return row;
    },
    async updateCommercialAccount(_id: string, patch: { ownerMemberId?: string }) {
      if (row && patch.ownerMemberId) row.ownerMemberId = patch.ownerMemberId;
    },
    async appendEventAndAudit(event: { eventType: string }) {
      events.push(event.eventType);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
}

describe('ReassignCommercialAccountOwner', () => {
  it('lets the explicit capability reassign and records both owners', async () => {
    const store = reassignStore({ scopes: ['commercial.account.reassign'] });
    const service = new CommercialCommandService(store as unknown as OsCommercialStore);
    const result = await service.execute(
      'ReassignCommercialAccountOwner',
      ctx('mem-actor'),
      { commercialAccountId: 'acct-1', ownerMemberId: OTHER },
    );
    assert.equal(result.data.previousOwnerMemberId, OWNER);
    assert.equal(result.data.ownerMemberId, OTHER);
    assert.deepEqual(store.events, ['commercial_account.owner_reassigned']);
  });

  it('does not let the current owner, people.admin, or read-only leadership reassign', async () => {
    for (const scopes of [[], ['people.admin'], ['commercial.team.read'], ['commercial.org.read']]) {
      const store = reassignStore({ scopes });
      const service = new CommercialCommandService(store as unknown as OsCommercialStore);
      await assert.rejects(
        () =>
          service.execute('ReassignCommercialAccountOwner', ctx(OWNER), {
            commercialAccountId: 'acct-1',
            ownerMemberId: OTHER,
          }),
        /PERMISSION_DENIED/,
      );
    }
  });

  it('denies an inactive or cross-tenant target', async () => {
    const inactive = reassignStore({
      scopes: ['commercial.account.reassign'],
      targetStatus: 'suspended',
    });
    await assert.rejects(
      () =>
        new CommercialCommandService(inactive as unknown as OsCommercialStore).execute(
          'ReassignCommercialAccountOwner',
          ctx('mem-actor'),
          { commercialAccountId: 'acct-1', ownerMemberId: OTHER },
        ),
      /VALIDATION_FAILED/,
    );

    const missing = reassignStore({
      scopes: ['commercial.account.reassign'],
      targetStatus: null,
    });
    await assert.rejects(
      () =>
        new CommercialCommandService(missing as unknown as OsCommercialStore).execute(
          'ReassignCommercialAccountOwner',
          ctx('mem-actor'),
          { commercialAccountId: 'acct-1', ownerMemberId: OTHER },
        ),
      /NOT_FOUND/,
    );
  });

  it('does not use people.admin as a reassignment shortcut', () => {
    const source = readFileSync(resolve(__dirname, 'commercial-command-service.ts'), 'utf8');
    const start = source.indexOf('private async reassignCommercialAccountOwner');
    const body = source.slice(start);
    assert.match(body, /canReassignCommercialAccountOwner/);
    assert.doesNotMatch(body, /people\.admin|memberHasAdminScope|commercial\.(team|org)\.read/);
  });
});
