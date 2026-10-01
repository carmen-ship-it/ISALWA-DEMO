import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PARTY_TIMELINE_EVENT_TYPES } from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';
import type { OsProjectionStorePort, StoredPartyTimelineEntry } from '../projection-store-port';
import type { QueryContext } from '../query-context';
import {
  classifyTimelineEventType,
  encodePartyTimelineCursor,
  PartyTimelineQueryService,
} from './party-timeline-query-service';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const PARTY = 'party-1';
const AS_OF = new Date('2026-09-14T15:00:00.000Z');

const OWNER = 'mem-owner';
const LEAD = 'mem-lead';
const STRANGER = 'mem-stranger';
const OUTSIDER = 'mem-outsider';
const OTHER_REP = 'mem-other-rep';
const APPROVER = 'mem-approver';
const ORG_READER = 'mem-org-reader';
const ADMIN = 'mem-admin';

function ctx(memberId: string, roleKeys: string[] = []): QueryContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: AS_OF,
    auth: {
      memberId,
      organizationId: ORG,
      accessStatus: 'active',
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

let seq = 0;
function entry(
  eventType: string,
  primaryEntityType: string,
  primaryEntityId: string,
  factsJson: Record<string, string | number | boolean | null> = {},
): StoredPartyTimelineEntry {
  seq += 1;
  return {
    entryId: `entry-${String(seq).padStart(3, '0')}`,
    organizationId: ORG,
    partyId: PARTY,
    eventType,
    occurredAt: new Date(AS_OF.getTime() - seq * 1000),
    actorMemberId: OWNER,
    correlationId: 'corr',
    primaryEntityType,
    primaryEntityId,
    factsJson,
    updatedAt: AS_OF,
  };
}

const ENTRIES = {
  partyCreated: entry('party.created', 'party', PARTY, { displayName: 'Cliente Uno' }),
  oppStage: entry('opportunity.stage_changed', 'opportunity', 'opp-1', { stage: 'proposal' }),
  quoteSubmitted: entry('quote.submitted', 'quote', 'quote-1', {
    quoteId: 'quote-1',
    totalCentavos: '987654',
  }),
  orderCreated: entry('order.created', 'order', 'order-1', {
    orderId: 'order-1',
    totalCentavos: '555000',
  }),
  strangerQuote: entry('quote.submitted', 'quote', 'quote-2', {
    quoteId: 'quote-2',
    totalCentavos: '111222',
  }),
  work: entry('work.created', 'work_item', 'work-1', { workItemId: 'work-1', title: 'Seguimiento' }),
  approval: entry('approval.approved', 'approval_request', 'appr-1', {
    approvalRequestId: 'appr-1',
    subjectType: 'quote',
    subjectId: 'quote-1',
    reason: 'descuento especial 12%',
  }),
  accountReassigned: entry('commercial_account.owner_reassigned', 'commercial_account', 'acct-1', {
    ownerMemberId: OWNER,
    previousOwnerMemberId: OTHER_REP,
  }),
  deliveryNote: entry('delivery_note.created', 'delivery_note', 'dn-1', { orderId: 'order-1' }),
  orphanQuote: entry('quote.submitted', 'quote', 'quote-missing', { totalCentavos: '42' }),
  foreignOrgQuote: entry('quote.submitted', 'quote', 'quote-foreign', { totalCentavos: '77' }),
};

const NON_TIMELINE_TYPE_ENTRY = entry('future.unknown_event', 'thing', 'thing-1', {
  note: 'surprise',
});

const ALL_ENTRIES = Object.values(ENTRIES);
const OPEN_ENTRY_IDS = [ENTRIES.partyCreated.entryId, ENTRIES.deliveryNote.entryId];

function store(items: StoredPartyTimelineEntry[] = ALL_ENTRIES, hasMore = false): OsProjectionStorePort {
  return {
    async listPartyTimelineEntries() {
      return { items, hasMore };
    },
    async getFreshness() {
      return null;
    },
    async getOpportunityReadModel(_org: string, id: string) {
      return id === 'opp-1' ? { organizationId: ORG, opportunityId: id, ownerMemberId: OWNER } : null;
    },
    async getQuoteReadModel(_org: string, id: string) {
      if (id === 'quote-1') return { organizationId: ORG, quoteId: id, ownerMemberId: OWNER };
      if (id === 'quote-2') return { organizationId: ORG, quoteId: id, ownerMemberId: STRANGER };
      if (id === 'quote-foreign') {
        return { organizationId: OTHER_ORG, quoteId: id, ownerMemberId: OWNER };
      }
      return null;
    },
    async getOrderReadModel(_org: string, id: string) {
      return id === 'order-1' ? { organizationId: ORG, orderId: id, ownerMemberId: OWNER } : null;
    },
    async getWorkReadModel(_org: string, id: string) {
      return id === 'work-1'
        ? {
            organizationId: ORG,
            workItemId: id,
            ownerMemberId: OWNER,
            createdByMemberId: OWNER,
            status: 'open',
            title: 'Seguimiento',
            description: null,
          }
        : null;
    },
    async getApprovalReadModel(_org: string, id: string) {
      return id === 'appr-1'
        ? {
            organizationId: ORG,
            approvalRequestId: id,
            subjectType: 'quote',
            subjectId: 'quote-1',
            requestedByMemberId: OWNER,
            approverMemberId: APPROVER,
          }
        : null;
    },
  } as unknown as OsProjectionStorePort;
}

const leadLookup: DirectReportLookup = {
  async listDirectReportMemberIds(_org, manager) {
    return manager === LEAD ? [OWNER] : [];
  },
};

function service(
  opts: { items?: StoredPartyTimelineEntry[]; hasMore?: boolean; directReports?: DirectReportLookup | null } = {},
) {
  return new PartyTimelineQueryService({
    projectionStore: store(opts.items, opts.hasMore),
    encodeCursor: encodePartyTimelineCursor,
    partyExists: async (org, id) => org === ORG && id === PARTY,
    directReports: opts.directReports === undefined ? leadLookup : opts.directReports,
  });
}

async function visibleIds(
  svc: PartyTimelineQueryService,
  c: QueryContext,
): Promise<string[]> {
  const result = await svc.listPartyTimeline(c, PARTY, { limit: 50 });
  return result.items.map((item) => item.entryId).sort();
}

const ids = (...entries: StoredPartyTimelineEntry[]) => entries.map((e) => e.entryId).sort();

describe('party timeline read authorization (S4)', () => {
  it('shows a plain member only party-level and fulfilment entries, no commercial values', async () => {
    const result = await service().listPartyTimeline(ctx(OUTSIDER), PARTY, { limit: 50 });
    assert.deepEqual(result.items.map((i) => i.entryId).sort(), [...OPEN_ENTRY_IDS].sort());
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('totalCentavos'), false);
    assert.equal(serialized.includes('987654'), false);
    assert.equal(serialized.includes('descuento especial'), false);
    assert.equal(serialized.includes('proposal'), false);
  });

  it('lets the record owner see their own commercial, work, approval and account entries', async () => {
    const got = await visibleIds(service(), ctx(OWNER));
    assert.deepEqual(
      got,
      ids(
        ENTRIES.partyCreated,
        ENTRIES.oppStage,
        ENTRIES.quoteSubmitted,
        ENTRIES.orderCreated,
        ENTRIES.work,
        ENTRIES.approval,
        ENTRIES.accountReassigned,
        ENTRIES.deliveryNote,
      ),
    );
    const quote = (await service().listPartyTimeline(ctx(OWNER), PARTY, { limit: 50 })).items.find(
      (i) => i.entryId === ENTRIES.quoteSubmitted.entryId,
    );
    assert.equal(quote?.facts.totalCentavos, '987654');
  });

  it('lets another rep see exactly their own quote and nothing of the owner', async () => {
    const got = await visibleIds(service(), ctx(STRANGER));
    assert.deepEqual(got, ids(ENTRIES.partyCreated, ENTRIES.strangerQuote, ENTRIES.deliveryNote));
  });

  it('never exposes another rep\'s quote to the owner of different records', async () => {
    const got = await visibleIds(service(), ctx(OWNER));
    assert.equal(got.includes(ENTRIES.strangerQuote.entryId), false);
  });

  it('lets a team lead see direct reports\' records but not other reps\' records', async () => {
    const got = await visibleIds(service(), ctx(LEAD, ['commercial.team.read']));
    assert.equal(got.includes(ENTRIES.quoteSubmitted.entryId), true);
    assert.equal(got.includes(ENTRIES.orderCreated.entryId), true);
    assert.equal(got.includes(ENTRIES.work.entryId), true);
    assert.equal(got.includes(ENTRIES.strangerQuote.entryId), false);
  });

  it('fails closed for a team lead when no direct-report lookup is wired', async () => {
    const got = await visibleIds(
      service({ directReports: null }),
      ctx(LEAD, ['commercial.team.read']),
    );
    assert.deepEqual(got, [...OPEN_ENTRY_IDS].sort());
  });

  it('does not treat commercial.team.read alone as org-wide', async () => {
    const got = await visibleIds(service(), ctx(OUTSIDER, ['commercial.team.read']));
    assert.deepEqual(got, [...OPEN_ENTRY_IDS].sort());
  });

  it('lets commercial.org.read and people.admin see every attributable entry', async () => {
    const expected = ids(
      ENTRIES.partyCreated,
      ENTRIES.oppStage,
      ENTRIES.quoteSubmitted,
      ENTRIES.orderCreated,
      ENTRIES.strangerQuote,
      ENTRIES.work,
      ENTRIES.approval,
      ENTRIES.accountReassigned,
      ENTRIES.deliveryNote,
    );
    assert.deepEqual(await visibleIds(service(), ctx(ORG_READER, ['commercial.org.read'])), expected);
    assert.deepEqual(await visibleIds(service(), ctx(ADMIN, ['people.admin'])), expected);
  });

  it('omits entries whose owning record cannot be found, even for admins (fail closed)', async () => {
    const got = await visibleIds(service(), ctx(ADMIN, ['people.admin']));
    assert.equal(got.includes(ENTRIES.orphanQuote.entryId), false);
  });

  it('omits entries whose owning record belongs to another tenant', async () => {
    const got = await visibleIds(service(), ctx(ADMIN, ['people.admin']));
    assert.equal(got.includes(ENTRIES.foreignOrgQuote.entryId), false);
  });

  it('classifies every projectable timeline event type (new types must be classified)', () => {
    for (const eventType of PARTY_TIMELINE_EVENT_TYPES) {
      assert.notEqual(
        classifyTimelineEventType(eventType),
        'unclassified',
        `${eventType} has no timeline read-policy class`,
      );
    }
  });

  it('returns a non-projectable event type without any facts, never with stored values', async () => {
    const svc = service({ items: [NON_TIMELINE_TYPE_ENTRY] });
    const result = await svc.listPartyTimeline(ctx(OUTSIDER), PARTY, { limit: 50 });
    assert.equal(result.items.length, 1);
    assert.deepEqual(result.items[0]?.facts, {});
  });

  it('shows approval entries to the requester and approver but not to an unrelated member', async () => {
    const one = ids(ENTRIES.approval);
    assert.equal((await visibleIds(service(), ctx(OWNER))).includes(one[0]!), true);
    assert.equal((await visibleIds(service(), ctx(APPROVER))).includes(one[0]!), true);
    assert.equal((await visibleIds(service(), ctx(OUTSIDER))).includes(one[0]!), false);
  });

  it('shows work entries to the work creator/owner but not to an unrelated member', async () => {
    assert.equal(
      (await visibleIds(service(), ctx(OWNER))).includes(ENTRIES.work.entryId),
      true,
    );
    assert.equal(
      (await visibleIds(service(), ctx(OUTSIDER))).includes(ENTRIES.work.entryId),
      false,
    );
  });

  it('derives the next cursor from the raw page so filtered rows do not stall paging', async () => {
    const svc = service({ items: [ENTRIES.quoteSubmitted, ENTRIES.orderCreated], hasMore: true });
    const result = await svc.listPartyTimeline(ctx(OUTSIDER), PARTY, { limit: 2 });
    assert.equal(result.items.length, 0);
    assert.equal(result.meta.hasMore, true);
    assert.equal(
      result.meta.nextCursor,
      encodePartyTimelineCursor(
        ENTRIES.orderCreated.occurredAt.toISOString(),
        ENTRIES.orderCreated.entryId,
      ),
    );
  });

  it('still returns NOT_FOUND for an unknown party', async () => {
    await assert.rejects(
      () => service().listPartyTimeline(ctx(OWNER), 'missing-party', { limit: 5 }),
      /NOT_FOUND/,
    );
  });
});
