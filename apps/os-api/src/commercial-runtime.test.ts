import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  OS_COMMERCIAL_COMMAND_SERVICE,
  OS_PARTY_COMMAND_SERVICE,
  OS_PROJECTION_RUNNER,
  OS_STORE,
} from './os-store.module';
import type { PartyCommandService } from '@isalwa/os-party';
import type { CommercialCommandService } from '@isalwa/os-commercial';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { ProjectionRunner } from '@isalwa/os-query';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

function sessionHeaders(
  orgId: string,
  member: { id: string },
  person: { id: string },
  auth: { id: string },
) {
  return {
    'x-os-organization-id': orgId,
    'x-os-member-id': member.id,
    'x-os-person-id': person.id,
    'x-os-auth-identity-id': auth.id,
    'content-type': 'application/json',
  };
}

describeHttp('os-api commercial runtime (Step 16.1A)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let partySvc: PartyCommandService;
  let commercialSvc: CommercialCommandService;
  let runner: ProjectionRunner;
  let org: { id: string };
  let orgB: { id: string };
  let mdAdmin: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let sales: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let salesB: { member: { id: string }; person: { id: string }; auth: { id: string } };

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;

    store = moduleRef.get(OS_STORE);
    partySvc = moduleRef.get(OS_PARTY_COMMAND_SERVICE);
    commercialSvc = moduleRef.get(OS_COMMERCIAL_COMMAND_SERVICE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);

    org = await store.seedOrganization('HTTP Comm Org', `http-comm-${Date.now()}`);
    orgB = await store.seedOrganization('HTTP Comm Org B', `http-comm-b-${Date.now()}`);
    mdAdmin = await seedSalesMember(org.id, `http-md-${Date.now()}@comm.bo`);
    await getOsPrisma()!.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: mdAdmin.member.id,
        roleKey: 'master_data.admin',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    sales = await seedSalesMember(org.id, `http-sales-${Date.now()}@comm.bo`);
    salesB = await seedSalesMember(orgB.id, `http-salesb-${Date.now()}@comm.bo`);
  });

  after(async () => {
    await app.close();
  });

  async function seedSalesMember(
    orgId: string,
    email: string,
  ): Promise<{ member: { id: string }; person: { id: string }; auth: { id: string } }> {
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('Postgres required');
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
    return {
      member: { id: memberId },
      person: { id: personId },
      auth: { id: authId },
    };
  }

  async function drainProjections() {
    await runner.runOnce();
    await runner.runOnce();
  }

  it('HTTP happy path: commands → projection → GET queries', async () => {
    const headers = sessionHeaders(org.id, mdAdmin.member, mdAdmin.person, mdAdmin.auth);
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);

    const partyRes = await partySvc.execute(
      'CreateParty',
      {
        organizationId: org.id,
        actorMemberId: mdAdmin.member.id,
        personId: mdAdmin.person.id,
        authIdentityId: mdAdmin.auth.id,
        correlationId: createId(),
        effectiveAt: new Date(),
      },
      {
        partyKind: 'organization',
        displayName: 'HTTP Commercial Client',
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
    );
    const partyId = String(partyRes.data.partyId);

    const oppRes = await fetch(`${baseUrl}/v1/commands/CreateOpportunity`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, title: 'HTTP Opportunity' }),
    });
    assert.equal(oppRes.status, 201);
    const oppBody = (await oppRes.json()) as { data: { opportunityId: string } };
    const opportunityId = oppBody.data.opportunityId;

    const quoteRes = await fetch(`${baseUrl}/v1/commands/CreateQuote`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, opportunityId }),
    });
    assert.equal(quoteRes.status, 201);
    const quoteBody = (await quoteRes.json()) as { data: { quoteId: string } };
    const quoteId = quoteBody.data.quoteId;

    const lineRes = await fetch(`${baseUrl}/v1/commands/AddQuoteLine`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({
        quoteId,
        description: 'HTTP line',
        quantity: 1,
        unitPriceCentavos: 250000,
      }),
    });
    assert.equal(lineRes.status, 201);

    const submitRes = await fetch(`${baseUrl}/v1/commands/SubmitQuote`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ quoteId }),
    });
    assert.equal(submitRes.status, 201);

    const orderRes = await fetch(`${baseUrl}/v1/commands/CreateOrder`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ quoteId }),
    });
    assert.equal(orderRes.status, 201);
    const orderBody = (await orderRes.json()) as { data: { orderId: string } };
    const orderId = orderBody.data.orderId;

    await drainProjections();

    const listOpp = await fetch(`${baseUrl}/v1/opportunities`, { headers: salesHeaders });
    assert.equal(listOpp.status, 200);
    const oppList = (await listOpp.json()) as { items: Array<{ opportunityId: string }> };
    assert.ok(oppList.items.some((o) => o.opportunityId === opportunityId));

    const getQuote = await fetch(`${baseUrl}/v1/quotes/${quoteId}`, { headers: salesHeaders });
    assert.equal(getQuote.status, 200);
    const quoteDetail = (await getQuote.json()) as {
      quote: { totalCentavos: string; lines: unknown[] };
    };
    assert.equal(quoteDetail.quote.totalCentavos, '250000');
    assert.equal(quoteDetail.quote.lines.length, 1);

    const getOrder = await fetch(`${baseUrl}/v1/orders/${orderId}`, { headers: salesHeaders });
    assert.equal(getOrder.status, 200);

    void headers;
  });

  it('cross-tenant GET quote returns NOT_FOUND', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const crossHeaders = sessionHeaders(orgB.id, salesB.member, salesB.person, salesB.auth);

    const quoteRes = await fetch(`${baseUrl}/v1/commands/CreateQuote`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({
        partyId: String(
          (
            await partySvc.execute(
              'CreateParty',
              {
                organizationId: org.id,
                actorMemberId: mdAdmin.member.id,
                personId: mdAdmin.person.id,
                authIdentityId: mdAdmin.auth.id,
                correlationId: createId(),
                effectiveAt: new Date(),
              },
              { partyKind: 'organization', displayName: 'Cross tenant party' },
            )
          ).data.partyId,
        ),
      }),
    });
    const quoteId = String(((await quoteRes.json()) as { data: { quoteId: string } }).data.quoteId);
    await drainProjections();

    const crossGet = await fetch(`${baseUrl}/v1/quotes/${quoteId}`, { headers: crossHeaders });
    assert.equal(crossGet.status, 404);
  });

  async function createPartyInOrg(targetOrgId: string, displayName: string) {
    return String(
      (
        await partySvc.execute(
          'CreateParty',
          {
            organizationId: targetOrgId,
            actorMemberId: mdAdmin.member.id,
            personId: mdAdmin.person.id,
            authIdentityId: mdAdmin.auth.id,
            correlationId: createId(),
            effectiveAt: new Date(),
          },
          { partyKind: 'organization', displayName, initialRoleKey: 'customer' },
        )
      ).data.partyId,
    );
  }

  it('cross-tenant GET opportunity and order return NOT_FOUND', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const crossHeaders = sessionHeaders(orgB.id, salesB.member, salesB.person, salesB.auth);
    const partyId = await createPartyInOrg(org.id, 'Cross opp/order party');

    const oppRes = await fetch(`${baseUrl}/v1/commands/CreateOpportunity`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, title: 'Cross isolation opp' }),
    });
    const opportunityId = String(
      ((await oppRes.json()) as { data: { opportunityId: string } }).data.opportunityId,
    );

    const quoteRes = await fetch(`${baseUrl}/v1/commands/CreateQuote`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, opportunityId }),
    });
    const quoteId = String(((await quoteRes.json()) as { data: { quoteId: string } }).data.quoteId);
    await fetch(`${baseUrl}/v1/commands/AddQuoteLine`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ quoteId, description: 'x', quantity: 1, unitPriceCentavos: 1000 }),
    });
    await fetch(`${baseUrl}/v1/commands/SubmitQuote`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ quoteId }),
    });
    const orderRes = await fetch(`${baseUrl}/v1/commands/CreateOrder`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ quoteId }),
    });
    const orderId = String(((await orderRes.json()) as { data: { orderId: string } }).data.orderId);
    await drainProjections();

    assert.equal(
      (await fetch(`${baseUrl}/v1/opportunities/${opportunityId}`, { headers: crossHeaders })).status,
      404,
    );
    assert.equal(
      (await fetch(`${baseUrl}/v1/orders/${orderId}`, { headers: crossHeaders })).status,
      404,
    );
  });

  it('malicious ownerMemberId filter cannot widen visibility', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const otherSales = await seedSalesMember(org.id, `other-${Date.now()}@comm.bo`);
    const otherHeaders = sessionHeaders(org.id, otherSales.member, otherSales.person, otherSales.auth);
    const partyId = await createPartyInOrg(org.id, 'Owner filter party');

    await fetch(`${baseUrl}/v1/commands/CreateOpportunity`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, title: 'Owner scoped opp' }),
    });
    await drainProjections();

    const widened = await fetch(
      `${baseUrl}/v1/opportunities?ownerMemberId=${sales.member.id}`,
      { headers: otherHeaders },
    );
    assert.equal(widened.status, 403);
  });

  it('inactive member cannot query commercial data', async () => {
    const prisma = getOsPrisma()!;
    const inactive = await seedSalesMember(org.id, `inactive-${Date.now()}@comm.bo`);
    await prisma.osOrganizationMember.update({
      where: { id: inactive.member.id },
      data: { accessStatus: 'suspended' },
    });
    const inactiveHeaders = sessionHeaders(
      org.id,
      inactive.member,
      inactive.person,
      inactive.auth,
    );
    const res = await fetch(`${baseUrl}/v1/opportunities`, { headers: inactiveHeaders });
    assert.equal(res.status, 403);
  });

  it('foreign tenant partyId filter returns no records', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const partyA = await createPartyInOrg(org.id, 'Tenant A filter party');
    const foreignPartyId = createId();

    await fetch(`${baseUrl}/v1/commands/CreateOpportunity`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId: partyA, title: 'Tenant A opp' }),
    });
    await drainProjections();

    const filtered = await fetch(`${baseUrl}/v1/opportunities?partyId=${foreignPartyId}`, {
      headers: salesHeaders,
    });
    assert.equal(filtered.status, 200);
    const body = (await filtered.json()) as { items: unknown[] };
    assert.equal(body.items.length, 0);
  });

  it('GET party timeline returns authorized entries without raw payload', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const crossHeaders = sessionHeaders(orgB.id, salesB.member, salesB.person, salesB.auth);
    const partyId = await createPartyInOrg(org.id, 'Timeline HTTP party');

    await fetch(`${baseUrl}/v1/commands/CreateOpportunity`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({ partyId, title: 'Timeline HTTP opp' }),
    });
    await drainProjections();

    const timelineRes = await fetch(`${baseUrl}/v1/parties/${partyId}/timeline`, {
      headers: salesHeaders,
    });
    assert.equal(timelineRes.status, 200);
    const timeline = (await timelineRes.json()) as {
      items: Array<{ eventType: string; facts: Record<string, unknown>; payload?: unknown }>;
    };
    assert.ok(timeline.items.some((item) => item.eventType === 'party.created'));
    assert.ok(timeline.items.some((item) => item.eventType === 'opportunity.created'));
    assert.ok(timeline.items.every((item) => item.payload === undefined));

    const crossTimeline = await fetch(`${baseUrl}/v1/parties/${partyId}/timeline`, {
      headers: crossHeaders,
    });
    assert.equal(crossTimeline.status, 404);
  });
});
