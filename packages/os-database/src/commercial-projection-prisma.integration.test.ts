import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import {
  CommercialProjectionConsumer,
  CommercialQueryService,
  encodeOpportunityCursor,
  encodeOrderCursor,
  encodeQuoteCursor,
  replayCommercialProjectionForOrg,
} from '@isalwa/os-query';
import { buildQueryContext } from '@isalwa/os-query';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import {
  getOsPrisma,
  PrismaOsCommercialStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
} from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('commercial projection prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let commercialStore: PrismaOsCommercialStore;
  let projectionStore: PrismaOsProjectionStore;
  let partySvc: PartyCommandService;
  let commercialSvc: CommercialCommandService;
  let consumer: CommercialProjectionConsumer;
  let querySvc: CommercialQueryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    commercialStore = new PrismaOsCommercialStore(prisma);
    projectionStore = new PrismaOsProjectionStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    commercialSvc = new CommercialCommandService(commercialStore);
    consumer = new CommercialProjectionConsumer({ projectionStore, commercialStore });
    querySvc = new CommercialQueryService({
      projectionStore,
      encodeOpportunityCursor,
      encodeQuoteCursor,
      encodeOrderCursor,
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
      effectiveAt: new Date('2026-08-24T14:00:00Z'),
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

  async function runHappyPath(orgId: string, salesCtx: RequestContext, partyId: string) {
    const opp = await commercialSvc.execute(
      'CreateOpportunity',
      salesCtx,
      { partyId, title: 'Proyección test' },
      `opp-proj-${createId()}`,
    );
    const opportunityId = String(opp.data.opportunityId);

    await commercialSvc.execute(
      'ChangeOpportunityStage',
      salesCtx,
      { opportunityId, stage: 'proposal' },
    );
    await commercialSvc.execute(
      'AssignOpportunityOwner',
      salesCtx,
      { opportunityId, ownerMemberId: salesCtx.actorMemberId },
    );

    const quote = await commercialSvc.execute(
      'CreateQuote',
      salesCtx,
      { partyId, opportunityId },
      `quote-proj-${createId()}`,
    );
    const quoteId = String(quote.data.quoteId);

    const line = await commercialSvc.execute('AddQuoteLine', salesCtx, {
      quoteId,
      description: 'Item A',
      quantity: 2,
      unitPriceCentavos: 100000,
      discountCentavos: 5000,
    });
    await commercialSvc.execute('UpdateQuoteLine', salesCtx, {
      quoteLineId: String(line.data.quoteLineId),
      quantity: 3,
    });
    await commercialSvc.execute('SubmitQuote', salesCtx, { quoteId });
    const order = await commercialSvc.execute('CreateOrder', salesCtx, { quoteId });

    return { opportunityId, quoteId, orderId: String(order.data.orderId) };
  }

  async function drainOutbox(orgId: string) {
    const pending = await prisma.osOutboxMessage.findMany({
      where: { organizationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    for (const msg of pending) {
      const event = await prisma.osBusinessEvent.findUnique({ where: { id: msg.eventId } });
      if (!event) continue;
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
      await prisma.osOutboxMessage.update({
        where: { id: msg.id },
        data: { status: 'published', publishedAt: new Date() },
      });
    }
  }

  it('projects opportunity, quote lines, and order from commercial events', async () => {
    const org = await workforceStore.seedOrganization('Proj Org', `proj-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@proj.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@proj.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);

    const created = await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'Cliente Proyección',
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    const partyId = String(created.data.partyId);
    const commercialAccount = await partyStore.getCommercialAccountForParty(org.id, partyId);

    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await drainOutbox(org.id);

    const oppRm = await projectionStore.getOpportunityReadModel(org.id, ids.opportunityId);
    assert.ok(oppRm);
    assert.equal(oppRm.stage, 'proposal');
    assert.equal(oppRm.partyId, partyId);
    assert.equal(oppRm.commercialAccountId, commercialAccount?.id ?? null);

    const quoteRm = await projectionStore.getQuoteReadModel(org.id, ids.quoteId);
    assert.ok(quoteRm);
    assert.equal(quoteRm.status, 'accepted');
    assert.equal(quoteRm.totalCentavos, 295000n);

    const lines = await projectionStore.listQuoteLineReadModels(org.id, ids.quoteId);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.lineTotalCentavos, 295000n);
    assert.equal(lines[0]?.quantity, 3);

    const orderRm = await projectionStore.getOrderReadModel(org.id, ids.orderId);
    assert.ok(orderRm);
    assert.equal(orderRm.totalCentavos, 295000n);
    assert.equal(orderRm.quoteId, ids.quoteId);
  });

  it('duplicate event delivery is idempotent', async () => {
    const org = await workforceStore.seedOrganization('Dup Org', `dup-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@dup.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@dup.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const created = await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'Dup Client',
      initialRoleKey: 'customer',
    });
    const partyId = String(created.data.partyId);
    const opp = await commercialSvc.execute('CreateOpportunity', salesCtx, {
      partyId,
      title: 'Dup',
    });
    const opportunityId = String(opp.data.opportunityId);
    await drainOutbox(org.id);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'opportunity.created' },
    });
    assert.ok(event);
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
    const count = await prisma.osOpportunityReadModel.count({
      where: { organizationId: org.id, opportunityId },
    });
    assert.equal(count, 1);
  });

  it('rebuild from event replay restores read models', async () => {
    const org = await workforceStore.seedOrganization('Replay Org', `replay-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@replay.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@replay.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const created = await partySvc.execute('CreateParty', adminCtx, {
      partyKind: 'organization',
      displayName: 'Replay Client',
      initialRoleKey: 'customer',
    });
    const partyId = String(created.data.partyId);
    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await drainOutbox(org.id);

    await projectionStore.deleteQuoteLineReadModelsForOrg(org.id);
    await projectionStore.deleteQuoteReadModelsForOrg(org.id);
    await projectionStore.deleteOrderReadModelsForOrg(org.id);
    await projectionStore.deleteOpportunityReadModelsForOrg(org.id);

    const { replayed } = await replayCommercialProjectionForOrg(
      { projectionStore, commercialStore },
      org.id,
      consumer,
    );
    assert.ok(replayed >= 5);

    const quoteRm = await projectionStore.getQuoteReadModel(org.id, ids.quoteId);
    assert.equal(quoteRm?.totalCentavos, 295000n);
  });

  it('authorized queries enforce tenant and owner scope', async () => {
    const orgA = await workforceStore.seedOrganization('Query A', `qa-${createId()}`);
    const orgB = await workforceStore.seedOrganization('Query B', `qb-${createId()}`);
    const mdA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `mda-${createId()}@qa.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    const salesA = await seedSalesMember(orgA.id, `sa-${createId()}@qa.bo`);
    const salesB = await seedSalesMember(orgB.id, `sb-${createId()}@qb.bo`);
    const adminCtxA = ctx(orgA.id, mdA.member.id, mdA.person.id, mdA.auth.id);
    const salesCtxA = ctx(orgA.id, salesA.memberId, salesA.personId, salesA.authId);
    const partyA = String(
      (await partySvc.execute('CreateParty', adminCtxA, {
        partyKind: 'organization',
        displayName: 'Scoped Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const ids = await runHappyPath(orgA.id, salesCtxA, partyA);
    await drainOutbox(orgA.id);

    const salesQueryCtx = await buildQueryContext(salesCtxA, workforceStore);
    const ownQuote = await querySvc.getQuote(salesQueryCtx, ids.quoteId);
    assert.equal(ownQuote.quote.totalCentavos, '295000');

    const salesCtxB = ctx(orgB.id, salesB.memberId, salesB.personId, salesB.authId);
    const crossCtx = await buildQueryContext(salesCtxB, workforceStore);
    await assert.rejects(
      () => querySvc.getQuote(crossCtx, ids.quoteId),
      (err: Error) => err.message === 'NOT_FOUND',
    );

    await assert.rejects(
      () =>
        querySvc.listQuotes(salesQueryCtx, {
          limit: 25,
          ownerMemberId: salesB.memberId,
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('quote cancellation updates projection status', async () => {
    const org = await workforceStore.seedOrganization('Cancel Org', `cancel-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@cancel.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@cancel.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Cancel Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const quote = await commercialSvc.execute('CreateQuote', salesCtx, { partyId });
    const quoteId = String(quote.data.quoteId);
    await commercialSvc.execute('AddQuoteLine', salesCtx, {
      quoteId,
      description: 'Line',
      quantity: 1,
      unitPriceCentavos: 50000,
    });
    await commercialSvc.execute('CancelQuote', salesCtx, { quoteId, reason: 'test' });
    await drainOutbox(org.id);

    const quoteRm = await projectionStore.getQuoteReadModel(org.id, quoteId);
    assert.equal(quoteRm?.status, 'cancelled');
  });

  it('query path does not mutate authoritative commercial tables', async () => {
    const org = await workforceStore.seedOrganization('ReadOnly Org', `ro-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@ro.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@ro.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'ReadOnly Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await drainOutbox(org.id);

    const quotesBefore = await prisma.osQuote.count({ where: { organizationId: org.id } });
    const queryCtx = await buildQueryContext(salesCtx, workforceStore);
    await querySvc.listQuotes(queryCtx, { limit: 25 });
    await querySvc.getQuote(queryCtx, ids.quoteId);
    const quotesAfter = await prisma.osQuote.count({ where: { organizationId: org.id } });
    assert.equal(quotesBefore, quotesAfter);
  });

  it('order cancellation updates projection status', async () => {
    const org = await workforceStore.seedOrganization('Order Cancel Org', `oc-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@oc.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@oc.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Order Cancel Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await commercialSvc.execute('CancelOrder', salesCtx, { orderId: ids.orderId, reason: 'test' });
    await drainOutbox(org.id);

    const orderRm = await projectionStore.getOrderReadModel(org.id, ids.orderId);
    assert.equal(orderRm?.status, 'cancelled');
    assert.ok(orderRm?.cancelledAt);
  });

  it('duplicate order.cancelled delivery is idempotent', async () => {
    const org = await workforceStore.seedOrganization('Dup Cancel Org', `dc-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@dc.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@dc.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Dup Cancel Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await commercialSvc.execute('CancelOrder', salesCtx, { orderId: ids.orderId });
    await drainOutbox(org.id);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'order.cancelled' },
    });
    assert.ok(event);
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
    const count = await prisma.osOrderReadModel.count({
      where: { organizationId: org.id, orderId: ids.orderId },
    });
    assert.equal(count, 1);
    const orderRm = await projectionStore.getOrderReadModel(org.id, ids.orderId);
    assert.equal(orderRm?.status, 'cancelled');
  });

  it('commercial freshness is stale when outbox pending and current after drain', async () => {
    const org = await workforceStore.seedOrganization('Fresh Org', `fresh-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@fresh.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@fresh.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Fresh Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    await commercialSvc.execute('CreateOpportunity', salesCtx, { partyId, title: 'Fresh Opp' });

    const pending = await projectionStore.countPendingOutbox(org.id);
    assert.ok(pending >= 1);
    const staleFreshness = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.commercialSummary,
    );
    assert.ok(staleFreshness?.isStale);

    await drainOutbox(org.id);
    const currentFreshness = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.commercialSummary,
    );
    assert.ok(currentFreshness);
    assert.equal(currentFreshness.isStale, false);
    assert.equal(currentFreshness.pendingOutboxCount, 0);
  });

  it('rebuild preserves cancelled order state', async () => {
    const org = await workforceStore.seedOrganization('Replay Cancel Org', `rc-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@rc.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@rc.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = String(
      (await partySvc.execute('CreateParty', adminCtx, {
        partyKind: 'organization',
        displayName: 'Replay Cancel Client',
        initialRoleKey: 'customer',
      })).data.partyId,
    );
    const ids = await runHappyPath(org.id, salesCtx, partyId);
    await commercialSvc.execute('CancelOrder', salesCtx, { orderId: ids.orderId });
    await drainOutbox(org.id);

    await projectionStore.deleteOrderReadModelsForOrg(org.id);
    await replayCommercialProjectionForOrg({ projectionStore, commercialStore }, org.id, consumer);

    const orderRm = await projectionStore.getOrderReadModel(org.id, ids.orderId);
    assert.equal(orderRm?.status, 'cancelled');
  });

  it('unknown commercial event schema version is rejected', async () => {
    const org = await workforceStore.seedOrganization('Version Org', `ver-${createId()}`);
    await assert.rejects(
      () =>
        consumer.deliver({
          id: createId(),
          organizationId: org.id,
          eventType: 'order.created',
          schemaVersion: 999,
          occurredAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
          actorMemberId: createId(),
          primaryEntityType: 'order',
          primaryEntityId: createId(),
          correlationId: createId(),
          provenance: 'command',
          dataOrigin: 'production',
        }),
      (err: Error) => err.message === 'OUTBOX_SCHEMA_VERSION_UNKNOWN',
    );
  });
});
