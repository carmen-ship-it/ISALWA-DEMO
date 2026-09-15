import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { getOsPrisma, PrismaOsCommercialStore, PrismaOsPartyStore, PrismaOsWorkforceStore } from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('commercial prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let commercialStore: PrismaOsCommercialStore;
  let partySvc: PartyCommandService;
  let commercialSvc: CommercialCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    commercialStore = new PrismaOsCommercialStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    commercialSvc = new CommercialCommandService(commercialStore);
    await workforceStore.truncateAll();
  });

  function ctx(
    orgId: string,
    memberId: string,
    personId: string,
    authId: string,
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt: new Date('2026-08-24T12:00:00Z'),
    };
  }

  async function seedSalesMember(orgId: string, email: string) {
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({
      data: { id: personId, givenName: 'Sales', familyName: 'Rep' },
    });
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

  async function seedCustomerParty(
    orgId: string,
    adminCtx: RequestContext,
    displayName: string,
  ) {
    const created = await partySvc.execute(
      'CreateParty',
      adminCtx,
      {
        partyKind: 'organization',
        displayName,
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
      `party-${createId()}`,
    );
    return String(created.data.partyId);
  }

  it('happy path: Party → Opportunity → Quote → lines → Submit → Order', async () => {
    const org = await workforceStore.seedOrganization('Commercial Org', `comm-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@comm.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@comm.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);

    const partyId = await seedCustomerParty(org.id, adminCtx, 'Cliente Demo SA');
    const commercialAccount = await partyStore.getCommercialAccountForParty(org.id, partyId);
    assert.ok(commercialAccount);

    const opp = await commercialSvc.execute(
      'CreateOpportunity',
      salesCtx,
      { partyId, title: 'Renovación anual' },
      `opp-${createId()}`,
    );
    const opportunityId = String(opp.data.opportunityId);

    const quote = await commercialSvc.execute(
      'CreateQuote',
      salesCtx,
      { partyId, opportunityId },
      `quote-${createId()}`,
    );
    const quoteId = String(quote.data.quoteId);

    const line = await commercialSvc.execute(
      'AddQuoteLine',
      salesCtx,
      {
        quoteId,
        description: 'Servicio consultoría',
        quantity: 2,
        unitPriceCentavos: 150000,
        discountCentavos: 5000,
      },
      `line-${createId()}`,
    );
    assert.equal(line.data.lineTotalCentavos, '295000');
    assert.equal(line.data.totalCentavos, '295000');

    const submitted = await commercialSvc.execute(
      'SubmitQuote',
      salesCtx,
      { quoteId },
      `submit-${createId()}`,
    );
    assert.equal(submitted.data.quoteId, quoteId);

    const order = await commercialSvc.execute(
      'CreateOrder',
      salesCtx,
      { quoteId },
      `order-${createId()}`,
    );
    assert.ok(order.data.orderId);
    assert.equal(order.data.totalCentavos, '295000');

    const quoteRow = await commercialStore.getQuoteInOrg(org.id, quoteId);
    assert.equal(quoteRow?.status, 'accepted');
    assert.equal(quoteRow?.commercialAccountId, commercialAccount?.id);

    const orderRow = await commercialStore.getOrderInOrg(org.id, String(order.data.orderId));
    assert.equal(orderRow?.partyId, partyId);
    assert.equal(orderRow?.quoteId, quoteId);

    const events = await prisma.osBusinessEvent.count({
      where: {
        organizationId: org.id,
        eventType: {
          in: [
            'opportunity.created',
            'quote.created',
            'quote.line_added',
            'quote.submitted',
            'order.created',
          ],
        },
      },
    });
    const audits = await prisma.osAuditLog.count({ where: { organizationId: org.id } });
    const outbox = await prisma.osOutboxMessage.count({ where: { organizationId: org.id } });
    assert.ok(events >= 5);
    assert.ok(audits >= 5);
    assert.ok(outbox >= 5);
  });

  it('rejects tenant B party on tenant A command', async () => {
    const orgA = await workforceStore.seedOrganization('Org A', `a-${createId()}`);
    const orgB = await workforceStore.seedOrganization('Org B', `b-${createId()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `mda-${createId()}@a.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    const salesA = await seedSalesMember(orgA.id, `sa-${createId()}@a.bo`);
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `mdb-${createId()}@b.bo`,
      'B',
      'Admin',
      'master_data.admin',
    );
    const partyB = await seedCustomerParty(
      orgB.id,
      ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
      'Cliente B',
    );
    const salesCtxA = ctx(orgA.id, salesA.memberId, salesA.personId, salesA.authId);

    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtxA, {
          partyId: partyB,
          title: 'Cross tenant',
        }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('rejects malformed money and negative totals', async () => {
    const org = await workforceStore.seedOrganization('Money Org', `money-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@money.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@money.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = await seedCustomerParty(org.id, adminCtx, 'Money Client');

    const quote = await commercialSvc.execute('CreateQuote', salesCtx, { partyId });
    const quoteId = String(quote.data.quoteId);

    await assert.rejects(
      () =>
        commercialSvc.execute('AddQuoteLine', salesCtx, {
          quoteId,
          description: 'Bad discount',
          quantity: 1,
          unitPriceCentavos: 1000,
          discountCentavos: 2000,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    await assert.rejects(
      () =>
        commercialSvc.execute('AddQuoteLine', salesCtx, {
          quoteId,
          description: 'Bad qty',
          quantity: 0,
          unitPriceCentavos: 1000,
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('duplicate commandId does not duplicate commercial state', async () => {
    const org = await workforceStore.seedOrganization('Idem Org', `idem-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@idem.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@idem.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = await seedCustomerParty(org.id, adminCtx, 'Idem Client');
    const key = `idem-opp-${createId()}`;

    const first = await commercialSvc.execute(
      'CreateOpportunity',
      salesCtx,
      { partyId, title: 'Once' },
      key,
    );
    const second = await commercialSvc.execute(
      'CreateOpportunity',
      salesCtx,
      { partyId, title: 'Once' },
      key,
    );
    assert.equal(first.commandId, second.commandId);

    const count = await prisma.osOpportunity.count({ where: { organizationId: org.id } });
    assert.equal(count, 1);
  });

  it('transaction rolls back when outbox append fails', async () => {
    const org = await workforceStore.seedOrganization('Rollback Org', `rb-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@rb.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@rb.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = await seedCustomerParty(org.id, adminCtx, 'Rollback Client');

    const eventsBefore = await commercialStore.countBusinessEvents(org.id);
    const oppsBefore = await prisma.osOpportunity.count({ where: { organizationId: org.id } });

    commercialStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtx, {
          partyId,
          title: 'Should rollback',
        }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );

    assert.equal(await prisma.osOpportunity.count({ where: { organizationId: org.id } }), oppsBefore);
    assert.equal(await commercialStore.countBusinessEvents(org.id), eventsBefore);
    assert.equal(await commercialStore.countOutbox(org.id), eventsBefore);
    assert.equal(await commercialStore.countAuditLogs(org.id), eventsBefore);
  });

  it('rejects submit on empty quote and create order from draft', async () => {
    const org = await workforceStore.seedOrganization('Lifecycle Org', `lc-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@lc.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@lc.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = await seedCustomerParty(org.id, adminCtx, 'Lifecycle Client');

    const quote = await commercialSvc.execute('CreateQuote', salesCtx, { partyId });
    const quoteId = String(quote.data.quoteId);

    await assert.rejects(
      () => commercialSvc.execute('SubmitQuote', salesCtx, { quoteId }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    await assert.rejects(
      () => commercialSvc.execute('CreateOrder', salesCtx, { quoteId }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });
});

describePrisma('commercial interactive transaction hardening', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let commercialStore: PrismaOsCommercialStore;
  let partySvc: PartyCommandService;
  let commercialSvc: CommercialCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    commercialStore = new PrismaOsCommercialStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    commercialSvc = new CommercialCommandService(commercialStore);
  });

  function ctx(
    orgId: string,
    memberId: string,
    personId: string,
    authId: string,
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt: new Date('2026-08-24T12:00:00Z'),
    };
  }

  async function seedSalesMember(orgId: string, email: string) {
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({
      data: { id: personId, givenName: 'Sales', familyName: 'Rep' },
    });
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

  async function seedCustomerParty(
    orgId: string,
    adminCtx: RequestContext,
    displayName: string,
  ) {
    const created = await partySvc.execute(
      'CreateParty',
      adminCtx,
      {
        partyKind: 'organization',
        displayName,
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
      `party-${createId()}`,
    );
    return String(created.data.partyId);
  }

  async function counts(organizationId: string) {
    const [opportunities, quotes, events, audits, outbox] = await Promise.all([
      prisma.osOpportunity.count({ where: { organizationId } }),
      prisma.osQuote.count({ where: { organizationId } }),
      prisma.osBusinessEvent.count({ where: { organizationId } }),
      prisma.osAuditLog.count({ where: { organizationId } }),
      prisma.osOutboxMessage.count({ where: { organizationId } }),
    ]);
    return { opportunities, quotes, events, audits, outbox };
  }

  async function seedOrgWithSalesAndParty(label: string) {
    const org = await workforceStore.seedOrganization(label, `${label}-${createId()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${createId()}@tx.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const sales = await seedSalesMember(org.id, `sales-${createId()}@tx.bo`);
    const adminCtx = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const salesCtx = ctx(org.id, sales.memberId, sales.personId, sales.authId);
    const partyId = await seedCustomerParty(org.id, adminCtx, `${label} Client`);
    return { org, sales, salesCtx, partyId };
  }

  it('CreateOpportunity and CreateQuote commit entity event audit outbox atomically', async () => {
    const { org, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Atomic');
    const before = await counts(org.id);

    const opp = await commercialSvc.execute(
      'CreateOpportunity',
      salesCtx,
      { partyId, title: 'Tx Opportunity' },
    );
    const opportunityId = String(opp.data.opportunityId);
    const mid = await counts(org.id);
    assert.equal(mid.opportunities, before.opportunities + 1);
    assert.ok(mid.events >= before.events + 1);
    assert.ok(mid.audits >= before.audits + 1);
    assert.ok(mid.outbox >= before.outbox + 1);
    const oppEvent = await prisma.osBusinessEvent.findFirst({
      where: {
        organizationId: org.id,
        primaryEntityId: opportunityId,
        eventType: 'opportunity.created',
      },
    });
    assert.ok(oppEvent);
    assert.ok(
      await prisma.osOutboxMessage.findFirst({
        where: { organizationId: org.id, eventId: oppEvent!.id },
      }),
    );
    assert.ok(
      await prisma.osAuditLog.findFirst({
        where: { organizationId: org.id, resourceId: opportunityId },
      }),
    );

    const quote = await commercialSvc.execute(
      'CreateQuote',
      salesCtx,
      { partyId, opportunityId },
    );
    const quoteId = String(quote.data.quoteId);
    const after = await counts(org.id);
    assert.equal(after.quotes, before.quotes + 1);
    assert.ok(after.events >= mid.events + 1);
    assert.ok(after.audits >= mid.audits + 1);
    assert.ok(after.outbox >= mid.outbox + 1);
    const quoteEvent = await prisma.osBusinessEvent.findFirst({
      where: {
        organizationId: org.id,
        primaryEntityId: quoteId,
        eventType: 'quote.created',
      },
    });
    assert.ok(quoteEvent);
    assert.ok(
      await prisma.osOutboxMessage.findFirst({
        where: { organizationId: org.id, eventId: quoteEvent!.id },
      }),
    );
    assert.ok(
      await prisma.osAuditLog.findFirst({
        where: { organizationId: org.id, resourceId: quoteId },
      }),
    );
  });

  it('rolls back Opportunity/Quote/event/audit/outbox when append fails', async () => {
    const { org, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Fail');
    const before = await counts(org.id);

    commercialStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtx, {
          partyId,
          title: 'Should Roll Back Opp',
        }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    assert.equal(commercialStore.testFailNextAppend, false);
    assert.deepEqual(await counts(org.id), before);

    commercialStore.testFailNextAppend = true;
    await assert.rejects(
      () => commercialSvc.execute('CreateQuote', salesCtx, { partyId }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    assert.equal(commercialStore.testFailNextAppend, false);
    assert.deepEqual(await counts(org.id), before);
  });

  it('latency regression: delay above old 5s default still succeeds with new timeout', async () => {
    const { org, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Latency');
    commercialStore.interactiveTxOptions = { maxWait: 2_000, timeout: 8_000 };
    commercialStore.testAppendDelayMs = 5_500;
    const before = await counts(org.id);
    const opp = await commercialSvc.execute('CreateOpportunity', salesCtx, {
      partyId,
      title: 'Latency Ok Opp',
    });
    assert.ok(opp.data.opportunityId);
    const quote = await commercialSvc.execute('CreateQuote', salesCtx, {
      partyId,
      opportunityId: String(opp.data.opportunityId),
    });
    assert.ok(quote.data.quoteId);
    const after = await counts(org.id);
    assert.equal(after.opportunities, before.opportunities + 1);
    assert.equal(after.quotes, before.quotes + 1);
    assert.ok(after.events >= before.events + 2);
    assert.ok(after.audits >= before.audits + 2);
    assert.ok(after.outbox >= before.outbox + 2);
    commercialStore.interactiveTxOptions = undefined;
    commercialStore.testAppendDelayMs = 0;
  });

  it('latency regression: delay beyond configured timeout leaves no partial rows', async () => {
    const { org, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Timeout');
    commercialStore.interactiveTxOptions = { maxWait: 2_000, timeout: 1_200 };
    commercialStore.testAppendDelayMs = 2_000;
    const before = await counts(org.id);
    await assert.rejects(() =>
      commercialSvc.execute('CreateOpportunity', salesCtx, {
        partyId,
        title: 'Timeout Partial Opp',
      }),
    );
    assert.deepEqual(await counts(org.id), before);
    await assert.rejects(() => commercialSvc.execute('CreateQuote', salesCtx, { partyId }));
    assert.deepEqual(await counts(org.id), before);
    commercialStore.interactiveTxOptions = undefined;
    commercialStore.testAppendDelayMs = 0;
  });

  it('after failed commercial command, same store instance succeeds without stale tx client', async () => {
    const { org, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Reuse');
    commercialStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtx, {
          partyId,
          title: 'Fail First Opp',
        }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    const opp = await commercialSvc.execute('CreateOpportunity', salesCtx, {
      partyId,
      title: 'Succeed Second Opp',
    });
    assert.ok(opp.data.opportunityId);
    const storedOpp = await commercialStore.getOpportunityInOrg(
      org.id,
      String(opp.data.opportunityId),
    );
    assert.equal(storedOpp?.title, 'Succeed Second Opp');

    commercialStore.testFailNextAppend = true;
    await assert.rejects(
      () => commercialSvc.execute('CreateQuote', salesCtx, { partyId }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    const quote = await commercialSvc.execute('CreateQuote', salesCtx, {
      partyId,
      opportunityId: String(opp.data.opportunityId),
    });
    assert.ok(quote.data.quoteId);
    const storedQuote = await commercialStore.getQuoteInOrg(org.id, String(quote.data.quoteId));
    assert.ok(storedQuote);
    assert.equal(storedQuote?.opportunityId, String(opp.data.opportunityId));
  });

  it('tenant isolation unchanged: foreign party CreateOpportunity/CreateQuote still NOT_FOUND', async () => {
    const orgA = await workforceStore.seedOrganization('Tx Tenant A', `txa-${createId()}`);
    const orgB = await workforceStore.seedOrganization('Tx Tenant B', `txb-${createId()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `mda-${createId()}@txa.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `mdb-${createId()}@txb.bo`,
      'B',
      'Admin',
      'master_data.admin',
    );
    const salesA = await seedSalesMember(orgA.id, `sa-${createId()}@txa.bo`);
    const partyB = await seedCustomerParty(
      orgB.id,
      ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
      'Foreign Client',
    );
    const salesCtxA = ctx(orgA.id, salesA.memberId, salesA.personId, salesA.authId);
    const beforeA = await counts(orgA.id);

    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtxA, {
          partyId: partyB,
          title: 'Cross tenant',
        }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
    await assert.rejects(
      () => commercialSvc.execute('CreateQuote', salesCtxA, { partyId: partyB }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
    assert.deepEqual(await counts(orgA.id), beforeA);
    void adminA;
  });

  it('authority unchanged: suspended member denied; non-owner UpdateOpportunity denied', async () => {
    const { org, sales, salesCtx, partyId } = await seedOrgWithSalesAndParty('Tx Auth');
    const opp = await commercialSvc.execute('CreateOpportunity', salesCtx, {
      partyId,
      title: 'Owned Opp',
    });
    const opportunityId = String(opp.data.opportunityId);

    const other = await seedSalesMember(org.id, `other-${createId()}@tx.bo`);
    const otherCtx = ctx(org.id, other.memberId, other.personId, other.authId);
    await assert.rejects(
      () =>
        commercialSvc.execute('UpdateOpportunity', otherCtx, {
          opportunityId,
          title: 'Hijack',
        }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    const unchanged = await commercialStore.getOpportunityInOrg(org.id, opportunityId);
    assert.equal(unchanged?.title, 'Owned Opp');

    await prisma.osOrganizationMember.update({
      where: { id: sales.memberId },
      data: { accessStatus: 'suspended' },
    });
    await assert.rejects(
      () =>
        commercialSvc.execute('CreateOpportunity', salesCtx, {
          partyId,
          title: 'Suspended blocked',
        }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
    await assert.rejects(
      () => commercialSvc.execute('CreateQuote', salesCtx, { partyId }),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });
});
