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

describeHttp('os-api quote PDF (Cotización)', () => {
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

    org = await store.seedOrganization('PDF Org', `pdf-org-${Date.now()}`);
    orgB = await store.seedOrganization('PDF Org B', `pdf-org-b-${Date.now()}`);
    mdAdmin = await seedSalesMember(org.id, `pdf-md-${Date.now()}@comm.bo`);
    await getOsPrisma()!.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: mdAdmin.member.id,
        roleKey: 'master_data.admin',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    sales = await seedSalesMember(org.id, `pdf-sales-${Date.now()}@comm.bo`);
    salesB = await seedSalesMember(orgB.id, `pdf-salesb-${Date.now()}@comm.bo`);
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

  async function createQuoteWithLines(opts?: { withLines?: boolean; submit?: boolean }) {
    const headers = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const partyId = String(
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
          { partyKind: 'organization', displayName: 'PDF Customer', initialRoleKey: 'customer' },
        )
      ).data.partyId,
    );

    const quoteRes = await fetch(`${baseUrl}/v1/commands/CreateQuote`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ partyId }),
    });
    assert.equal(quoteRes.status, 200);
    const quoteId = String(((await quoteRes.json()) as { data: { quoteId: string } }).data.quoteId);

    if (opts?.withLines !== false) {
      await fetch(`${baseUrl}/v1/commands/AddQuoteLine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          quoteId,
          description: 'Producto PDF',
          quantity: 2,
          unitPriceCentavos: 2500,
        }),
      });
    }

    if (opts?.submit) {
      await fetch(`${baseUrl}/v1/commands/SubmitQuote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ quoteId }),
      });
    }

    await drainProjections();
    return { quoteId, headers };
  }

  it('unauthenticated PDF request is denied', async () => {
    const { quoteId } = await createQuoteWithLines();
    const res = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'AUTH_REQUIRED');
  });

  it('valid draft quote returns PDF with correct content-type and filename', async () => {
    const { quoteId, headers } = await createQuoteWithLines({ withLines: true });
    const res = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`, { headers });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/pdf/);
    assert.match(res.headers.get('content-disposition') ?? '', /attachment; filename="cotizacion-Q-/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.subarray(0, 4).toString('utf8'), '%PDF');
    void commercialSvc;
  });

  it('submitted quote returns PDF', async () => {
    const { quoteId, headers } = await createQuoteWithLines({ submit: true });
    const res = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`, { headers });
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString('utf8'), '%PDF');
  });

  it('cross-tenant PDF is NOT_FOUND (no existence leak)', async () => {
    const { quoteId } = await createQuoteWithLines();
    const crossHeaders = sessionHeaders(orgB.id, salesB.member, salesB.person, salesB.auth);
    const res = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`, { headers: crossHeaders });
    assert.equal(res.status, 404);
    const body = (await res.json()) as { code?: string; message?: string };
    assert.equal(body.code, 'NOT_FOUND');
    assert.equal(body.message, undefined);
  });

  it('invalid quote id is denied safely', async () => {
    const headers = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const res = await fetch(`${baseUrl}/v1/quotes/does-not-exist-${createId()}/pdf`, { headers });
    assert.equal(res.status, 404);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'NOT_FOUND');
  });

  it('malformed quote id is safe', async () => {
    const headers = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const res = await fetch(`${baseUrl}/v1/quotes/${encodeURIComponent('../etc/passwd')}/pdf`, {
      headers,
    });
    assert.ok(res.status === 404 || res.status === 400);
    const body = (await res.json()) as { code?: string; stack?: string };
    assert.ok(body.code === 'NOT_FOUND' || body.code === 'VALIDATION_FAILED');
    assert.equal(body.stack, undefined);
  });
});
