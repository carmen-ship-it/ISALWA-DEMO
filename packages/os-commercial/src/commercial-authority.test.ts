import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { CustomerCoverageAction, RequestContext } from '@isalwa/os-contracts';
import { CommercialCommandService } from './commercial-command-service';
import type { OsCommercialStore } from './os-commercial-store';
import type { CommercialAccountRecord, QuoteLineRecord, QuoteRecord } from './store-types';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const OWNER = 'mem-owner';
const OTHER = 'mem-other';
const QUOTE_ID = 'quote-1';
const NOW = new Date('2026-09-13T12:00:00.000Z');
const DAY = 86_400_000;
const IN_A_WEEK = new Date(NOW.getTime() + 7 * DAY).toISOString();

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
    // Default: issued and accepted by the customer at revision 1, i.e. convertible (T04).
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

const APPROVED_REV_1 = {
  id: 'approval-1',
  status: 'approved',
  contextSnapshotJson: { boundRevision: 1 },
  requestedByMemberId: OWNER,
  approverMemberId: 'mem-approver',
  decisionByMemberId: 'mem-approver',
  decidedAt: NOW,
};

function storeFor(input: {
  actorScopes?: string[];
  quote?: QuoteRecord | null;
  existingOrder?: boolean;
  coverageGrants?: Array<{
    grantType: 'commercial.customer.coverage';
    organizationId: string;
    customerPartyId: string;
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
    coveredActions: readonly CustomerCoverageAction[];
    startsAt: Date;
    endsAt: Date | null;
    revokedAt: Date | null;
  }>;
  accountOwnerMemberId?: string | null;
  /** Members whose manager (in force) is the actor. */
  directReportsOfActor?: string[];
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
      if (memberId === OWNER) {
        return [
          {
            roleKey: 'commercial.quote.convert.own',
            effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
            endedAt: null,
          },
        ];
      }
      return actorScopes.map((roleKey) => ({
        roleKey,
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        endedAt: null,
      }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async getCommercialAccountInOrg(organizationId, commercialAccountId) {
      if (!row || organizationId !== row.organizationId) return null;
      if (commercialAccountId !== row.commercialAccountId) return null;
      return {
        id: row.commercialAccountId,
        organizationId: ORG,
        partyId: row.partyId,
        ownerMemberId: input.accountOwnerMemberId === undefined ? OWNER : input.accountOwnerMemberId,
        status: 'active',
        version: 1,
      } satisfies CommercialAccountRecord;
    },
    async getCommercialAccountForParty(organizationId, partyId) {
      if (!row || organizationId !== row.organizationId || partyId !== row.partyId) return null;
      return {
        id: row.commercialAccountId,
        organizationId: ORG,
        partyId: row.partyId,
        ownerMemberId: input.accountOwnerMemberId === undefined ? OWNER : input.accountOwnerMemberId,
        status: 'active',
        version: 1,
      } as CommercialAccountRecord;
    },
    async isDirectReport(_organizationId, _managerMemberId, memberId) {
      return (input.directReportsOfActor ?? []).includes(memberId);
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
    async listQuoteApprovals() {
      return [APPROVED_REV_1];
    },
    async countOrdersForOrg() {
      return 0;
    },
    async listActiveCustomerCoverageGrants(query) {
      return (input.coverageGrants ?? []).filter(
        (grant) =>
          grant.organizationId === query.organizationId &&
          grant.customerPartyId === query.customerPartyId &&
          grant.actingAdvisorMemberId === query.actingAdvisorMemberId &&
          !grant.revokedAt &&
          grant.startsAt <= query.asOf &&
          (grant.endsAt === null || grant.endsAt > query.asOf),
      );
    },
    async insertOrder() {},
    async insertOrderLines() {},
    async listOrderLines() {
      return [];
    },
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
  it('lets the quote owner convert an accepted quote once', async () => {
    const row = quote();
    const orders: string[] = [];
    const store = storeFor({ quote: row });
    const mutable = store as unknown as {
      insertOrder: (order: { id: string }) => Promise<void>;
      updateQuote: (quoteId: string, patch: { status?: string }) => Promise<void>;
      getOrderForQuote: () => Promise<{ id: string } | null>;
    };
    mutable.insertOrder = async (order) => {
      orders.push(order.id);
    };
    mutable.updateQuote = async (_organizationId, _quoteId, patch) => {
      if (patch.status) row.status = patch.status as QuoteRecord['status'];
    };
    mutable.getOrderForQuote = async () => (orders[0] ? { id: orders[0] } : null);
    const service = new CommercialCommandService(store);
    assert.equal(row.status, 'accepted');
    const result = await service.execute('CreateOrder', ctx(OWNER), { quoteId: QUOTE_ID });
    assert.equal(result.data.quoteId, QUOTE_ID);
    assert.equal(orders.length, 1);
    assert.equal(row.status, 'accepted');
    assert.deepEqual((store as unknown as { events: string[] }).events, ['order.created']);
    await assert.rejects(
      () => service.execute('CreateOrder', ctx(OWNER), { quoteId: QUOTE_ID }),
      /CONFLICT/,
    );
    assert.equal(orders.length, 1);
  });

  it('answers an unrelated active member as for a missing quote (T02 non-disclosure)', async () => {
    await assert.rejects(() => convert(OTHER), /NOT_FOUND/);
    await assert.rejects(() => convert(OTHER, { quote: null }), /NOT_FOUND/);
  });

  it('denies read-only Jefe and Gerente scopes that may see the quote', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.team.read'], directReportsOfActor: [OWNER] }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.org.read'] }),
      /PERMISSION_DENIED/,
    );
    // A team lead over someone else cannot even learn this quote exists.
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.team.read'] }),
      /NOT_FOUND/,
    );
  });

  it('does not treat people.admin as conversion authority or visibility', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['people.admin'] }),
      /NOT_FOUND/,
    );
  });

  it('denies master_data.admin conversion: steward knowledge is not commercial authority', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['master_data.admin'] }),
      /PERMISSION_DENIED/,
    );
    // Steward knowledge does not widen commercial.order.convert to every account either.
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['master_data.admin', 'commercial.order.convert'] }),
      /PERMISSION_DENIED/,
    );
  });

  it('lets the explicit conversion capability succeed only with account access', async () => {
    const orgWide = await convert(OTHER, {
      actorScopes: ['commercial.order.convert', 'commercial.org.read'],
    });
    assert.equal(orgWide.data.quoteId, QUOTE_ID);
    const teamLead = await convert(OTHER, {
      actorScopes: ['commercial.order.convert', 'commercial.team.read'],
      directReportsOfActor: [OWNER],
    });
    assert.equal(teamLead.data.quoteId, QUOTE_ID);
    // The permission alone, with no access to this account, is not enough.
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.order.convert'] }),
      /NOT_FOUND/,
    );
  });

  // T03 2026-10-16 19:30: conversion under coverage needs explicit quote.convert (BR-CNV-02 superseded).
  it('denies conversion under commercial.work-only coverage', async () => {
    const store = storeFor({
      coverageGrants: [
        {
          grantType: 'commercial.customer.coverage',
          organizationId: ORG,
          customerPartyId: 'party-1',
          primaryOwnerMemberId: OWNER,
          actingAdvisorMemberId: OTHER,
          coveredActions: ['commercial.work'],
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          revokedAt: null,
        },
      ],
    });
    const service = new CommercialCommandService(store);
    await assert.rejects(
      () => service.execute('CreateOrder', ctx(OTHER), { quoteId: QUOTE_ID }),
      /PERMISSION_DENIED/,
    );
  });

  it('denies expired or revoked coverage and emits no success event', async () => {
    for (const grant of [
      {
        grantType: 'commercial.customer.coverage' as const,
        organizationId: ORG,
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        actingAdvisorMemberId: OTHER,
        coveredActions: ['commercial.work'] as const,
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        endsAt: new Date('2026-09-01T00:00:00.000Z'),
        revokedAt: null,
      },
      {
        grantType: 'commercial.customer.coverage' as const,
        organizationId: ORG,
        customerPartyId: 'party-1',
        primaryOwnerMemberId: OWNER,
        actingAdvisorMemberId: OTHER,
        coveredActions: ['commercial.work'] as const,
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        endsAt: null,
        revokedAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]) {
      const store = storeFor({ coverageGrants: [grant] });
      // Ended coverage leaves no visibility: the quote answers as missing.
      await assert.rejects(
        () => new CommercialCommandService(store).execute('CreateOrder', ctx(OTHER), { quoteId: QUOTE_ID }),
        /NOT_FOUND/,
      );
      assert.deepEqual((store as unknown as { events: string[] }).events, []);
    }
  });

  it('does not treat commercial.quote.convert.own as covering-advisor convert', async () => {
    await assert.rejects(
      () => convert(OTHER, { actorScopes: ['commercial.quote.convert.own'] }),
      /NOT_FOUND/,
    );
    await assert.rejects(
      () =>
        convert(OTHER, {
          actorScopes: ['commercial.quote.convert.own'],
          coverageGrants: [
            {
              grantType: 'commercial.customer.coverage',
              organizationId: ORG,
              customerPartyId: 'party-1',
              primaryOwnerMemberId: OWNER,
              actingAdvisorMemberId: OTHER,
              coveredActions: ['commercial.work', 'customer.edit'],
              startsAt: new Date('2026-01-01T00:00:00.000Z'),
              endsAt: null,
              revokedAt: null,
            },
          ],
        }),
      /PERMISSION_DENIED/,
    );
  });

  it('denies the quote owner after the account moved to another owner', async () => {
    await assert.rejects(() => convert(OWNER, { accountOwnerMemberId: OTHER }), /PERMISSION_DENIED/);
  });

  it('denies a cross-tenant quote', async () => {
    await assert.rejects(
      () => convert(OWNER, { quote: quote({ organizationId: OTHER_ORG }) }),
      /NOT_FOUND/,
    );
  });

  it('denies draft, issued-but-not-accepted, and cancelled quotes', async () => {
    for (const status of ['draft', 'submitted', 'cancelled'] as const) {
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
  /** Members the actor currently manages (direct reports). */
  leads?: string[];
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
    async updateCommercialAccount(
      organizationId: string,
      commercialAccountId: string,
      patch: { ownerMemberId?: string },
    ) {
      if (!row || organizationId !== row.organizationId || commercialAccountId !== row.id) {
        throw new Error('NOT_FOUND');
      }
      if (patch.ownerMemberId) row.ownerMemberId = patch.ownerMemberId;
    },
    async isDirectReport(_organizationId: string, _managerMemberId: string, memberId: string) {
      return (input.leads ?? []).includes(memberId);
    },
    async getCommercialAccountForParty(organizationId: string, partyId: string) {
      return row && row.organizationId === organizationId && row.partyId === partyId ? row : null;
    },
    async listActiveCustomerCoverageGrants() {
      return [];
    },
    async listActiveCustomerCoverageForParty() {
      return [];
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
  // T03 2026-10-16 19:30: reassign alone is not organization-wide; org assignment scope added.
  it('lets the explicit capability reassign and records both owners', async () => {
    const store = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.assignment.org'] });
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
      scopes: ['commercial.account.reassign', 'commercial.assignment.org'],
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
      scopes: ['commercial.account.reassign', 'commercial.assignment.org'],
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

type CoverageGrantRow = {
  id: string;
  organizationId: string;
  customerPartyId: string;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  coveredActions?: readonly CustomerCoverageAction[];
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
  recordedAt: Date;
  recordedByMemberId: string | null;
};

function coverageStore(input: {
  scopes?: string[];
  account?: CommercialAccountRecord | null;
  /** Members present in ORG. Absent id → cross-company / foreign helper. */
  memberIdsInOrg?: string[];
  grants?: CoverageGrantRow[];
  /** Members the actor currently manages (direct reports). */
  leads?: string[];
}) {
  const events: Array<{ eventType: string; payload?: Record<string, unknown> }> = [];
  const scopes = input.scopes ?? [];
  const row = input.account === undefined ? account() : input.account;
  const memberIds = new Set(input.memberIdsInOrg ?? [OWNER, OTHER, 'mem-actor', 'mem-asesor']);
  const grants: CoverageGrantRow[] = [...(input.grants ?? [])];

  return {
    events,
    grants,
    account: row,
    async runInTransaction(fn: (store: OsCommercialStore) => Promise<unknown>) {
      return fn(this as unknown as OsCommercialStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG || !memberIds.has(memberId)) return null;
      return { id: memberId, organizationId: ORG, accessStatus: 'active' as const };
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
      if (!row || organizationId !== row.organizationId || commercialAccountId !== row.id) {
        return null;
      }
      return row;
    },
    async updateCommercialAccount(
      organizationId: string,
      commercialAccountId: string,
      patch: { ownerMemberId?: string },
    ) {
      if (!row || organizationId !== row.organizationId || commercialAccountId !== row.id) {
        throw new Error('NOT_FOUND');
      }
      if (patch.ownerMemberId) row.ownerMemberId = patch.ownerMemberId;
    },
    async listActiveCustomerCoverageGrants(query: {
      organizationId: string;
      customerPartyId: string;
      actingAdvisorMemberId: string;
      asOf: Date;
    }) {
      return grants.filter(
        (grant) =>
          grant.organizationId === query.organizationId &&
          grant.customerPartyId === query.customerPartyId &&
          grant.actingAdvisorMemberId === query.actingAdvisorMemberId &&
          !grant.revokedAt &&
          grant.startsAt <= query.asOf &&
          (grant.endsAt === null || grant.endsAt > query.asOf),
      );
    },
    async createCustomerCoverageGrant(created: {
      id: string;
      organizationId: string;
      customerPartyId: string;
      primaryOwnerMemberId: string;
      actingAdvisorMemberId: string;
      coveredActions: readonly CustomerCoverageAction[];
      startsAt: Date;
      endsAt: Date | null;
      recordedAt: Date;
      recordedByMemberId: string;
    }) {
      grants.push({
        ...created,
        revokedAt: null,
      });
    },
    async revokeCustomerCoverageGrant(rev: {
      organizationId: string;
      grantId: string;
      revokedAt: Date;
      recordedByMemberId: string;
    }) {
      const grant = grants.find((g) => g.id === rev.grantId && g.organizationId === rev.organizationId);
      if (!grant || grant.revokedAt) return null;
      grant.revokedAt = rev.revokedAt;
      grant.recordedByMemberId = rev.recordedByMemberId;
      return {
        id: grant.id,
        customerPartyId: grant.customerPartyId,
        primaryOwnerMemberId: grant.primaryOwnerMemberId,
        actingAdvisorMemberId: grant.actingAdvisorMemberId,
      };
    },
    async getCustomerCoverageGrantInOrg(organizationId: string, grantId: string) {
      const grant = grants.find((g) => g.id === grantId && g.organizationId === organizationId);
      return grant ?? null;
    },
    async isDirectReport(_organizationId: string, _managerMemberId: string, memberId: string) {
      return (input.leads ?? []).includes(memberId);
    },
    async getCommercialAccountForParty(organizationId: string, partyId: string) {
      return row && row.organizationId === organizationId && row.partyId === partyId ? row : null;
    },
    async listActiveCustomerCoverageForParty(query: {
      organizationId: string;
      customerPartyId: string;
      asOf: Date;
      includeScheduled?: boolean;
    }) {
      return grants
        .filter(
          (grant) =>
            grant.organizationId === query.organizationId &&
            grant.customerPartyId === query.customerPartyId &&
            !grant.revokedAt &&
            (query.includeScheduled || grant.startsAt <= query.asOf) &&
            (grant.endsAt === null || grant.endsAt > query.asOf),
        )
        .map((grant) => ({ ...grant, coveredActions: grant.coveredActions ?? ['commercial.work'] }));
    },
    async appendEventAndAudit(event: { eventType: string; payload?: Record<string, unknown> }) {
      events.push({ eventType: event.eventType, payload: event.payload });
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
}

describe('GrantCustomerCoverage', () => {
  // T03 2026-10-16 19:30: reassign alone is not organization-wide; org assignment scope added.
  it('lets reassignment-scoped Jefe/Gerencia grant same-company helper without changing owner', async () => {
    const store = coverageStore({ scopes: ['commercial.account.reassign', 'commercial.assignment.org'] });
    const ownerBefore = store.account!.ownerMemberId;
    const service = new CommercialCommandService(store as unknown as OsCommercialStore);
    const result = await service.execute('GrantCustomerCoverage', ctx('mem-actor'), {
      commercialAccountId: 'acct-1',
      actingAdvisorMemberId: OTHER,
      endsAt: IN_A_WEEK,
      note: 'Vacaciones',
    });

    assert.equal(result.data.primaryOwnerMemberId, OWNER);
    assert.equal(result.data.actingAdvisorMemberId, OTHER);
    assert.equal(store.account!.ownerMemberId, ownerBefore);
    assert.equal(store.grants.length, 1);
    assert.equal(store.grants[0]!.primaryOwnerMemberId, OWNER);
    assert.equal(store.grants[0]!.actingAdvisorMemberId, OTHER);
    assert.equal(store.grants[0]!.revokedAt, null);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]!.eventType, 'customer_coverage.granted');
    assert.equal(store.events[0]!.payload?.primaryOwnerMemberId, OWNER);
    // No actions requested: the grant records the commercial-work meaning explicitly.
    assert.deepEqual(store.grants[0]!.coveredActions, ['commercial.work']);
    assert.deepEqual(store.events[0]!.payload?.coveredActions, ['commercial.work']);
  });

  it('records explicitly requested grantable actions on the row and the event', async () => {
    // The grantor holds commercial.customer.edit: a delegation cannot exceed the grantor's authority.
    const store = coverageStore({
      scopes: ['commercial.account.reassign', 'commercial.assignment.org', 'commercial.customer.edit'],
    });
    await new CommercialCommandService(store as unknown as OsCommercialStore).execute(
      'GrantCustomerCoverage',
      ctx('mem-actor'),
      { commercialAccountId: 'acct-1', actingAdvisorMemberId: OTHER, endsAt: IN_A_WEEK, coveredActions: ['commercial.work', 'customer.edit'] },
    );
    assert.deepEqual(store.grants[0]!.coveredActions, ['commercial.work', 'customer.edit']);
    assert.deepEqual(store.events[0]!.payload?.coveredActions, ['commercial.work', 'customer.edit']);
  });

  it('does not issue archive, reactivate, unknown, or empty coverage actions in this release', async () => {
    for (const coveredActions of [['customer.archive'], ['customer.reactivate'], ['order.convert'], []]) {
      const store = coverageStore({ scopes: ['commercial.account.reassign', 'commercial.assignment.org'] });
      await assert.rejects(
        () =>
          new CommercialCommandService(store as unknown as OsCommercialStore).execute(
            'GrantCustomerCoverage',
            ctx('mem-actor'),
            { commercialAccountId: 'acct-1', actingAdvisorMemberId: OTHER, endsAt: IN_A_WEEK, coveredActions },
          ),
        /VALIDATION_FAILED/,
        JSON.stringify(coveredActions),
      );
      assert.equal(store.grants.length, 0);
      assert.deepEqual(store.events, []);
    }
  });

  it('denies Asesor self-grant without commercial.account.reassign', async () => {
    const store = coverageStore({
      scopes: ['member_active', 'commercial.own.write'],
    });
    const service = new CommercialCommandService(store as unknown as OsCommercialStore);
    await assert.rejects(
      () =>
        service.execute('GrantCustomerCoverage', ctx('mem-asesor'), {
          commercialAccountId: 'acct-1',
          actingAdvisorMemberId: 'mem-asesor',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.grants.length, 0);
    assert.deepEqual(store.events, []);
    assert.equal(store.account!.ownerMemberId, OWNER);
  });

  it('denies cross-company helper (member not in actor org)', async () => {
    const store = coverageStore({
      scopes: ['commercial.account.reassign', 'commercial.assignment.org'],
      memberIdsInOrg: [OWNER, 'mem-actor'],
    });
    const service = new CommercialCommandService(store as unknown as OsCommercialStore);
    await assert.rejects(
      () =>
        service.execute('GrantCustomerCoverage', ctx('mem-actor'), {
          commercialAccountId: 'acct-1',
          actingAdvisorMemberId: 'mem-foreign-company',
          endsAt: IN_A_WEEK,
        }),
      /NOT_FOUND/,
    );
    assert.equal(store.grants.length, 0);
    assert.deepEqual(store.events, []);
    assert.equal(store.account!.ownerMemberId, OWNER);
  });

  describe('review 3129709 P6: bounded windows, all grants, independent authority', () => {
    const grantor = ['commercial.account.reassign', 'commercial.assignment.org'];
    const grant = (store: ReturnType<typeof coverageStore>, window: { startsAt?: string; endsAt?: string | null }) =>
      new CommercialCommandService(store as unknown as OsCommercialStore).execute('GrantCustomerCoverage', ctx('mem-actor'), {
        commercialAccountId: 'acct-1',
        actingAdvisorMemberId: OTHER,
        ...window,
      });
    const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

    it('refuses open-ended, past, too-long and too-distant windows', async () => {
      for (const window of [
        {},
        { endsAt: null },
        { endsAt: iso(-1) },
        { endsAt: iso(31) },
        { startsAt: iso(-2), endsAt: iso(3) },
        { startsAt: iso(31), endsAt: iso(35) },
        { startsAt: iso(5), endsAt: iso(5) },
        { startsAt: iso(5), endsAt: iso(36) },
      ]) {
        const store = coverageStore({ scopes: grantor });
        await assert.rejects(() => grant(store, window), /VALIDATION_FAILED/, JSON.stringify(window));
        assert.equal(store.grants.length, 0);
        assert.deepEqual(store.events, []);
      }
    });

    it('accepts exactly 30 days and a scheduled start within 30 days', async () => {
      const now = coverageStore({ scopes: grantor });
      await grant(now, { endsAt: iso(30) });
      assert.equal(now.grants[0]!.startsAt.toISOString(), NOW.toISOString());
      assert.equal(now.grants[0]!.endsAt!.toISOString(), iso(30));
      const later = coverageStore({ scopes: grantor });
      await grant(later, { startsAt: iso(30), endsAt: iso(60) });
      assert.equal(later.grants[0]!.startsAt.toISOString(), iso(30));
    });

    it('refuses a window overlapping an active or scheduled grant for the same helper; an extension starts when it ends', async () => {
      const store = coverageStore({ scopes: grantor });
      await grant(store, { endsAt: iso(10) });
      await assert.rejects(() => grant(store, { startsAt: iso(5), endsAt: iso(20) }), /VALIDATION_FAILED/);
      await grant(store, { startsAt: iso(10), endsAt: iso(25) });
      await assert.rejects(() => grant(store, { startsAt: iso(20), endsAt: iso(28) }), /VALIDATION_FAILED/);
      assert.equal(store.grants.length, 2);
      assert.equal(store.events.length, 2);
    });

    it('ends scheduled grants as well as active ones when the owner changes', async () => {
      const store = coverageStore({ scopes: grantor });
      await grant(store, { endsAt: iso(10) });
      await grant(store, { startsAt: iso(10), endsAt: iso(20) });
      await new CommercialCommandService(store as unknown as OsCommercialStore).execute(
        'ReassignCommercialAccountOwner',
        ctx('mem-actor'),
        { commercialAccountId: 'acct-1', ownerMemberId: 'mem-asesor' },
      );
      assert.deepEqual(
        store.grants.map((g) => Boolean(g.revokedAt)),
        [true, true],
      );
    });

    it('decides grant authority and delegable actions from independent role assignments only', () => {
      const source = readFileSync(resolve(__dirname, 'commercial-command-service.ts'), 'utf8');
      const body = source.slice(
        source.indexOf('private async grantCustomerCoverage'),
        source.indexOf('private async revokeCustomerCoverage'),
      );
      assert.match(body, /memberIndependentScopes\(snap\)/);
      assert.match(body, /canGrantCustomerCoverage\(independentScopes\)/);
      assert.match(body, /grantableCoverageActionsFor\(independentScopes\)/);
      assert.doesNotMatch(body, /delegatedScopes|snap\.roleKeys/);
    });
  });

  it('gates grant on canGrantCustomerCoverage (reassign scope only)', () => {
    const source = readFileSync(resolve(__dirname, 'commercial-command-service.ts'), 'utf8');
    const start = source.indexOf('private async grantCustomerCoverage');
    const end = source.indexOf('private async revokeCustomerCoverage');
    const body = source.slice(start, end);
    assert.match(body, /canGrantCustomerCoverage/);
    assert.match(body, /buildCustomerCoverageGrant/);
    assert.match(body, /createCustomerCoverageGrant/);
    assert.match(body, /customer_coverage\.granted/);
    assert.doesNotMatch(body, /people\.admin|memberHasAdminScope/);
  });
});

describe('RevokeCustomerCoverage', () => {
  it('marks grant inactive, keeps canonical owner, and retains history row', async () => {
    const grantId = 'grant-1';
    const store = coverageStore({
      scopes: ['commercial.account.reassign', 'commercial.assignment.org'],
      grants: [
        {
          id: grantId,
          organizationId: ORG,
          customerPartyId: 'party-1',
          primaryOwnerMemberId: OWNER,
          actingAdvisorMemberId: OTHER,
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          revokedAt: null,
          recordedAt: new Date('2026-01-01T00:00:00.000Z'),
          recordedByMemberId: 'mem-actor',
        },
      ],
    });
    const ownerBefore = store.account!.ownerMemberId;
    const service = new CommercialCommandService(store as unknown as OsCommercialStore);
    const result = await service.execute('RevokeCustomerCoverage', ctx('mem-actor'), {
      grantId,
      note: 'Back from leave',
    });

    assert.equal(result.data.grantId, grantId);
    assert.equal(result.data.primaryOwnerMemberId, OWNER);
    assert.equal(store.account!.ownerMemberId, ownerBefore);
    assert.equal(store.grants.length, 1);
    assert.ok(store.grants[0]!.revokedAt);
    assert.equal(store.grants[0]!.primaryOwnerMemberId, OWNER);
    assert.equal(store.grants[0]!.actingAdvisorMemberId, OTHER);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]!.eventType, 'customer_coverage.revoked');

    const stillActive = await store.listActiveCustomerCoverageGrants({
      organizationId: ORG,
      customerPartyId: 'party-1',
      actingAdvisorMemberId: OTHER,
      asOf: NOW,
    });
    assert.equal(stillActive.length, 0);
  });

  it('denies revoke without commercial.account.reassign', async () => {
    const store = coverageStore({
      scopes: ['member_active'],
      grants: [
        {
          id: 'grant-1',
          organizationId: ORG,
          customerPartyId: 'party-1',
          primaryOwnerMemberId: OWNER,
          actingAdvisorMemberId: OTHER,
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: null,
          revokedAt: null,
          recordedAt: new Date('2026-01-01T00:00:00.000Z'),
          recordedByMemberId: 'mem-actor',
        },
      ],
    });
    await assert.rejects(
      () =>
        new CommercialCommandService(store as unknown as OsCommercialStore).execute(
          'RevokeCustomerCoverage',
          ctx('mem-asesor'),
          { grantId: 'grant-1' },
        ),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.grants[0]!.revokedAt, null);
  });
});

describe('T03 assignment boundary (2026-10-16 19:30): action permission + explicit assignment scope', () => {
  const reassign = (store: ReturnType<typeof reassignStore>, ownerMemberId = OTHER) =>
    new CommercialCommandService(store as unknown as OsCommercialStore).execute(
      'ReassignCommercialAccountOwner',
      ctx('mem-actor'),
      { commercialAccountId: 'acct-1', ownerMemberId },
    );

  it('does not let commercial.account.reassign alone reach any account', async () => {
    const store = reassignStore({ scopes: ['commercial.account.reassign'] });
    await assert.rejects(() => reassign(store), /NOT_FOUND/);
    assert.deepEqual(store.events, []);
  });

  it('does not treat commercial.org.read as organization-wide assignment authority', async () => {
    const store = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.org.read'] });
    await assert.rejects(() => reassign(store), /PERMISSION_DENIED/);
    assert.deepEqual(store.events, []);
  });

  it('lets a team-scoped manager move an account between current team members', async () => {
    const store = reassignStore({
      scopes: ['commercial.account.reassign', 'commercial.team.read'],
      leads: [OWNER, OTHER],
    });
    const result = await reassign(store);
    assert.equal(result.data.ownerMemberId, OTHER);
    assert.equal(result.data.assignmentAuthority, 'team');
  });

  it('refuses a cross-team transfer by a team-scoped manager', async () => {
    const store = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.team.read'], leads: [OWNER] });
    await assert.rejects(() => reassign(store), /PERMISSION_DENIED/);
    const outside = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.team.read'], leads: [OTHER] });
    await assert.rejects(() => reassign(outside), /NOT_FOUND/);
    assert.deepEqual([...store.events, ...outside.events], []);
  });

  it('allocates an unassigned account only with org or intake assignment scope', async () => {
    const unassigned = () => account({ ownerMemberId: null as unknown as string });
    const team = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.team.read', 'commercial.org.read'], leads: [OTHER], account: unassigned() });
    await assert.rejects(() => reassign(team), /PERMISSION_DENIED/);
    const intake = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.intake.assign'], account: unassigned() });
    assert.equal((await reassign(intake)).data.assignmentAuthority, 'intake');
    const intakeOnOwned = reassignStore({ scopes: ['commercial.account.reassign', 'commercial.intake.assign'] });
    await assert.rejects(() => reassign(intakeOnOwned), /NOT_FOUND/);
  });

  it('applies the same boundary to coverage administration', async () => {
    const grant = (store: ReturnType<typeof coverageStore>, coveredActions?: string[]) =>
      new CommercialCommandService(store as unknown as OsCommercialStore).execute('GrantCustomerCoverage', ctx('mem-actor'), {
        commercialAccountId: 'acct-1',
        actingAdvisorMemberId: OTHER,
        endsAt: IN_A_WEEK,
        ...(coveredActions ? { coveredActions } : {}),
      });
    const alone = coverageStore({ scopes: ['commercial.account.reassign'] });
    await assert.rejects(() => grant(alone), /NOT_FOUND/);
    const team = coverageStore({ scopes: ['commercial.account.reassign', 'commercial.team.read'], leads: [OWNER, OTHER] });
    await grant(team);
    assert.equal(team.grants.length, 1);
    const helperOutside = coverageStore({ scopes: ['commercial.account.reassign', 'commercial.team.read'], leads: [OWNER] });
    await assert.rejects(() => grant(helperOutside), /PERMISSION_DENIED/);
    assert.equal(alone.grants.length + helperOutside.grants.length, 0);
  });

  it('does not let a grantor delegate conversion or edit authority they lack', async () => {
    const scopes = ['commercial.account.reassign', 'commercial.assignment.org'];
    for (const [actions, extra] of [
      [['quote.convert'], []],
      [['customer.edit'], []],
    ] as const) {
      const store = coverageStore({ scopes: [...scopes, ...extra] });
      await assert.rejects(
        () =>
          new CommercialCommandService(store as unknown as OsCommercialStore).execute('GrantCustomerCoverage', ctx('mem-actor'), {
            commercialAccountId: 'acct-1',
            actingAdvisorMemberId: OTHER,
            endsAt: IN_A_WEEK,
            coveredActions: [...actions],
          }),
        /PERMISSION_DENIED/,
      );
      assert.equal(store.grants.length, 0);
    }
    const store = coverageStore({ scopes: [...scopes, 'commercial.order.convert'] });
    await new CommercialCommandService(store as unknown as OsCommercialStore).execute('GrantCustomerCoverage', ctx('mem-actor'), {
      commercialAccountId: 'acct-1',
      actingAdvisorMemberId: OTHER,
      endsAt: IN_A_WEEK,
      coveredActions: ['commercial.work', 'quote.convert'],
    });
    assert.deepEqual(store.grants[0]!.coveredActions, ['commercial.work', 'quote.convert']);
  });
});
