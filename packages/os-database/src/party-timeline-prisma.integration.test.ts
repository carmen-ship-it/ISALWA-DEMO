import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import {
  PartyTimelineProjectionConsumer,
  PartyTimelineQueryService,
  encodePartyTimelineCursor,
  replayPartyTimelineForOrg,
} from '@isalwa/os-query';
import { buildQueryContext } from '@isalwa/os-query';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import {
  getOsPrisma,
  PrismaOsCommercialStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
  PrismaOsWorkStore,
} from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('party timeline prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let commercialStore: PrismaOsCommercialStore;
  let workStore: PrismaOsWorkStore;
  let projectionStore: PrismaOsProjectionStore;
  let partySvc: PartyCommandService;
  let commercialSvc: CommercialCommandService;
  let consumer: PartyTimelineProjectionConsumer;
  let querySvc: PartyTimelineQueryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    commercialStore = new PrismaOsCommercialStore(prisma);
    workStore = new PrismaOsWorkStore(prisma);
    projectionStore = new PrismaOsProjectionStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    commercialSvc = new CommercialCommandService(commercialStore);
    consumer = new PartyTimelineProjectionConsumer({ projectionStore, commercialStore, workStore });
    querySvc = new PartyTimelineQueryService({
      projectionStore,
      encodeCursor: encodePartyTimelineCursor,
      partyExists: async (organizationId, partyId) => {
        const party = await partyStore.getPartyInOrg(organizationId, partyId);
        return party != null;
      },
    });
    await workforceStore.truncateAll();
  });

  function ctx(orgId: string, memberId: string, personId: string, authId: string): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt: new Date('2026-08-24T15:00:00Z'),
    };
  }

  async function seedSalesMember(orgId: string, email: string) {
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({ data: { id: personId, givenName: 'Sales', familyName: 'Rep' } });
    await prisma.osOrganizationMember.create({
      data: {
        id: memberId,
        organizationId: orgId,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        version: 0,
      },
    });
    await prisma.osAuthIdentity.create({
      data: {
        id: authId,
        personId,
        provider: 'local-dev',
        providerSubject: `subject:${email}`,
        email,
        status: 'active',
        activatedAt: new Date(),
      },
    });
    await prisma.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        memberId,
        roleKey: 'sales_rep',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    return { memberId, personId, authId };
  }

  async function drainOutbox(orgId: string) {
    const pending = await prisma.osOutboxMessage.findMany({
      where: { organizationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    for (const msg of pending) {
      const event = await prisma.osBusinessEvent.findUnique({ where: { id: msg.eventId } });
      if (!event) continue;
      const envelope = {
        id: event.id,
        organizationId: event.organizationId,
        eventType: event.eventType,
        schemaVersion: 1,
        occurredAt: event.occurredAt.toISOString(),
        recordedAt: event.recordedAt.toISOString(),
        actorMemberId: event.actorMemberId,
        primaryEntityType: event.primaryEntityType,
        primaryEntityId: event.primaryEntityId,
        correlationId: event.correlationId ?? createId(),
        provenance: 'command' as const,
        dataOrigin: 'production' as const,
        payload: (event.payloadJson as Record<string, unknown> | undefined) ?? undefined,
      };
      await consumer.deliver(envelope);
      await prisma.osOutboxMessage.update({
        where: { id: msg.id },
        data: { status: 'published', publishedAt: new Date() },
      });
    }
  }

  it('projects Party and Commercial events for the same party', async () => {
    const org = await workforceStore.seedOrganization('Timeline Org', `tl-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@tl.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@tl.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);

    const created = await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'Timeline Client',
      initialRoleKey: 'customer',
    });
    const partyId = String(created.data.partyId);
    await drainOutbox(org.id);

    const opp = await commercialSvc.execute('CreateOpportunity', salesCtx, {
      partyId,
      title: 'Timeline Opp',
    });
    const opportunityId = String(opp.data.opportunityId);
    const quote = await commercialSvc.execute('CreateQuote', salesCtx, { partyId, opportunityId });
    const quoteId = String(quote.data.quoteId);
    await commercialSvc.execute('AddQuoteLine', salesCtx, {
      quoteId,
      description: 'Line',
      quantity: 1,
      unitPriceCentavos: 100000,
    });
    await commercialSvc.execute('SubmitQuote', salesCtx, { quoteId });
    const order = await commercialSvc.execute('CreateOrder', salesCtx, { quoteId });
    const orderId = String(order.data.orderId);
    await commercialSvc.execute('CancelOrder', salesCtx, { orderId });
    await drainOutbox(org.id);

    const queryCtx = await buildQueryContext(salesCtx, workforceStore);
    const page = await querySvc.listPartyTimeline(queryCtx, partyId, { limit: 50 });
    const types = page.items.map((item) => item.eventType);
    assert.ok(types.includes('party.created'));
    assert.ok(types.includes('opportunity.created'));
    assert.ok(types.includes('quote.created'));
    assert.ok(types.includes('order.created'));
    assert.ok(types.includes('order.cancelled'));

    const cancelEntry = page.items.find((item) => item.eventType === 'order.cancelled');
    assert.ok(cancelEntry);
    assert.equal(cancelEntry.facts.orderId, orderId);
    assert.equal('payloadJson' in cancelEntry, false);
    assert.equal('payload' in cancelEntry, false);
  });

  it('does not include unrelated party events', async () => {
    const org = await workforceStore.seedOrganization('Iso Org', `iso-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@iso.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const partyA = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Party A',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const partyB = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Party B',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    await drainOutbox(org.id);

    const queryCtx = await buildQueryContext(adminCtx, workforceStore);
    const pageA = await querySvc.listPartyTimeline(queryCtx, partyA, { limit: 25 });
    assert.ok(pageA.items.every((item) => item.partyId === partyA));
    assert.ok(pageA.items.some((item) => item.eventType === 'party.created'));
    assert.ok(pageA.items.every((item) => item.facts.displayName !== 'Party B'));
    void partyB;
  });

  it('duplicate event delivery does not duplicate timeline entry', async () => {
    const org = await workforceStore.seedOrganization('Dup TL Org', `dtl-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@dtl.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'Dup TL Client',
      initialRoleKey: 'customer',
    });
    await drainOutbox(org.id);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'party.created' },
    });
    assert.ok(event);
    await consumer.deliver({
      id: event.id,
      organizationId: event.organizationId,
      eventType: event.eventType,
      schemaVersion: 1,
      occurredAt: event.occurredAt.toISOString(),
      recordedAt: event.recordedAt.toISOString(),
      actorMemberId: event.actorMemberId,
      primaryEntityType: event.primaryEntityType,
      primaryEntityId: event.primaryEntityId,
      correlationId: event.correlationId ?? createId(),
      provenance: 'command',
      dataOrigin: 'production',
      payload: (event.payloadJson as Record<string, unknown> | undefined) ?? undefined,
    });

    const count = await prisma.osPartyTimelineEntry.count({
      where: { organizationId: org.id, entryId: event.id },
    });
    assert.equal(count, 1);
  });

  it('enforces tenant isolation on timeline query', async () => {
    const orgA = await workforceStore.seedOrganization('TL A', `tla-${createId()}`);
    const orgB = await workforceStore.seedOrganization('TL B', `tlb-${createId()}`);
    const mdA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `mda-${createId()}@tla.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    const mdB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `mdb-${createId()}@tlb.bo`,
      'B',
      'Admin',
      'master_data.admin',
    );
    const adminCtxA = ctx(orgA.id, mdA.member.id, mdA.person.id, mdA.auth.id);
    const adminCtxB = ctx(orgB.id, mdB.member.id, mdB.person.id, mdB.auth.id);
    const partyA = String(
      (await partySvc.execute('CreateParty', adminCtxA, {
        partyKind: 'organization',
        displayName: 'Tenant A Party',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    await drainOutbox(orgA.id);

    const crossCtx = await buildQueryContext(adminCtxB, workforceStore);
    await assert.rejects(
      () => querySvc.listPartyTimeline(crossCtx, partyA, { limit: 25 }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('replay rebuild restores timeline entries', async () => {
    const org = await workforceStore.seedOrganization('Replay TL Org', `rtl-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@rtl.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@rtl.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Replay TL Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    await commercialSvc.execute('CreateOpportunity', salesCtx, { partyId, title: 'Replay Opp' });
    await drainOutbox(org.id);

    await projectionStore.deletePartyTimelineEntriesForOrg(org.id);
    const { replayed } = await replayPartyTimelineForOrg(
      { projectionStore, commercialStore, workStore },
      org.id,
      consumer,
    );
    assert.ok(replayed >= 2);

    const count = await projectionStore.countPartyTimelineEntries(org.id, partyId);
    assert.ok(count >= 2);
  });

  it('timeline freshness is stale when outbox pending', async () => {
    const org = await workforceStore.seedOrganization('TL Fresh Org', `tlf-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@tlf.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'TL Fresh Client',
      initialRoleKey: 'customer',
    });

    const pending = await projectionStore.countPendingOutbox(org.id);
    assert.ok(pending >= 1);
    const stale = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
    );
    assert.ok(stale?.isStale);

    await drainOutbox(org.id);
    const current = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
    );
    assert.equal(current?.isStale, false);
  });
});
