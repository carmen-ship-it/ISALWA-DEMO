import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  OS_PARTY_COMMAND_SERVICE,
  OS_PROJECTION_RUNNER,
  OS_STORE,
} from './os-store.module';
import type { PartyCommandService } from '@isalwa/os-party';
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

describeHttp('os-api party timeline work + approval runtime (Step 16.1B)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let partySvc: PartyCommandService;
  let runner: ProjectionRunner;
  let org: { id: string };
  let orgB: { id: string };
  let mdAdmin: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let sales: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let approver: { member: { id: string }; person: { id: string }; auth: { id: string } };
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
    runner = moduleRef.get(OS_PROJECTION_RUNNER);

    org = await store.seedOrganization('HTTP TL WA Org', `http-tlwa-${Date.now()}`);
    orgB = await store.seedOrganization('HTTP TL WA Org B', `http-tlwab-${Date.now()}`);
    mdAdmin = await seedMember(org.id, `http-md-${Date.now()}@tlwa.bo`, 'master_data.admin');
    sales = await seedMember(org.id, `http-sales-${Date.now()}@tlwa.bo`, 'sales_rep');
    approver = await seedMember(org.id, `http-app-${Date.now()}@tlwa.bo`, 'people.admin');
    salesB = await seedMember(orgB.id, `http-salesb-${Date.now()}@tlwa.bo`, 'sales_rep');
  });

  after(async () => {
    await app.close();
  });

  async function seedMember(orgId: string, email: string, roleKey: string) {
    const prisma = getOsPrisma()!;
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({ data: { id: personId, givenName: 'HTTP', familyName: 'User' } });
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
        roleKey,
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

  async function createParty(partyOrgId: string) {
    const res = await partySvc.execute(
      'CreateParty',
      {
        organizationId: partyOrgId,
        actorMemberId: mdAdmin.member.id,
        personId: mdAdmin.person.id,
        authIdentityId: mdAdmin.auth.id,
        correlationId: createId(),
        effectiveAt: new Date(),
      },
      {
        partyKind: 'organization',
        displayName: 'HTTP Timeline WA Client',
        initialRoleKey: 'customer',
      },
    );
    return String(res.data.partyId);
  }

  it('GET party timeline includes work and approval entries without raw payload', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const approverHeaders = sessionHeaders(org.id, approver.member, approver.person, approver.auth);
    const partyId = await createParty(org.id);
    await drainProjections();

    const workRes = await fetch(`${baseUrl}/v1/commands/CreateWorkItem`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({
        title: 'HTTP timeline work',
        ownerMemberId: sales.member.id,
        subjectType: 'party',
        subjectId: partyId,
      }),
    });
    assert.equal(workRes.status, 201);
    const workItemId = String(((await workRes.json()) as { data: { workItemId: string } }).data.workItemId);

    const approvalRes = await fetch(`${baseUrl}/v1/commands/RequestApproval`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({
        approverMemberId: approver.member.id,
        subjectType: 'work_item',
        subjectId: workItemId,
      }),
    });
    assert.equal(approvalRes.status, 201);
    const approvalRequestId = String(
      ((await approvalRes.json()) as { data: { approvalRequestId: string } }).data.approvalRequestId,
    );

    await drainProjections();

    await fetch(`${baseUrl}/v1/commands/Approve`, {
      method: 'POST',
      headers: approverHeaders,
      body: JSON.stringify({ approvalRequestId }),
    });
    await drainProjections();

    const timelineRes = await fetch(`${baseUrl}/v1/parties/${partyId}/timeline`, {
      headers: salesHeaders,
    });
    assert.equal(timelineRes.status, 200);
    const timeline = (await timelineRes.json()) as {
      items: Array<{ eventType: string; facts: Record<string, unknown>; payload?: unknown }>;
    };
    const types = timeline.items.map((item) => item.eventType);
    assert.ok(types.includes('work.created'));
    assert.ok(types.includes('approval.requested'));
    assert.ok(types.includes('approval.approved'));
    assert.ok(timeline.items.every((item) => item.payload === undefined));
    assert.ok(
      timeline.items.every(
        (item) => !Object.prototype.hasOwnProperty.call(item.facts, 'contextSnapshot'),
      ),
    );
  });

  it('cross-tenant party timeline remains blocked with work events present', async () => {
    const salesHeaders = sessionHeaders(org.id, sales.member, sales.person, sales.auth);
    const crossHeaders = sessionHeaders(orgB.id, salesB.member, salesB.person, salesB.auth);
    const partyId = await createParty(org.id);

    await fetch(`${baseUrl}/v1/commands/CreateWorkItem`, {
      method: 'POST',
      headers: salesHeaders,
      body: JSON.stringify({
        title: 'Cross tenant isolation work',
        ownerMemberId: sales.member.id,
        subjectType: 'party',
        subjectId: partyId,
      }),
    });
    await drainProjections();

    const crossTimeline = await fetch(`${baseUrl}/v1/parties/${partyId}/timeline`, {
      headers: crossHeaders,
    });
    assert.equal(crossTimeline.status, 404);
  });
});
