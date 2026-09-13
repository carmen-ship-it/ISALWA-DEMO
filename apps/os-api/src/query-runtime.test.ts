import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  OS_PARTY_COMMAND_SERVICE,
  OS_PROJECTION_RUNNER,
  OS_STORE,
  OS_WORK_COMMAND_SERVICE,
} from './os-store.module';
import type { PartyCommandService } from '@isalwa/os-party';
import type { WorkCommandService } from '@isalwa/os-work';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { ProjectionRunner } from '@isalwa/os-query';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

function sessionHeaders(orgId: string, member: { id: string }, person: { id: string }, auth: { id: string }) {
  return {
    'x-os-organization-id': orgId,
    'x-os-member-id': member.id,
    'x-os-person-id': person.id,
    'x-os-auth-identity-id': auth.id,
  };
}

describeHttp('os-api query runtime (Step 15.1)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let partySvc: PartyCommandService;
  let workSvc: WorkCommandService;
  let runner: ProjectionRunner;
  let org: { id: string };
  let admin: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let owner: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let approver: { member: { id: string }; person: { id: string }; auth: { id: string } };
  let orgB: { id: string };
  let adminB: { member: { id: string }; person: { id: string }; auth: { id: string } };

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
    workSvc = moduleRef.get(OS_WORK_COMMAND_SERVICE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);

    org = await store.seedOrganization('HTTP Query Org', `http-q-${Date.now()}`);
    orgB = await store.seedOrganization('HTTP Query Org B', `http-qb-${Date.now()}`);
    admin = await seedMemberWithSingleRole(
      org.id,
      `http-adm-${Date.now()}@o.bo`,
      'Http',
      'Admin',
      'master_data.admin',
    );
    owner = await seedMemberWithSingleRole(
      org.id,
      `http-own-${Date.now()}@o.bo`,
      'Http',
      'Owner',
      'sales_rep',
    );
    approver = await store.seedAdminMember(
      org.id,
      `http-app-${Date.now()}@o.bo`,
      'Http',
      'Approver',
    );
    adminB = await store.seedAdminMember(orgB.id, `http-b-${Date.now()}@b.bo`, 'B', 'Admin');
  });

  after(async () => {
    await app.close();
  });

  async function drainProjections() {
    await runner.runOnce();
    await runner.runOnce();
  }

  async function seedMemberWithSingleRole(
    orgId: string,
    email: string,
    givenName: string,
    familyName: string,
    roleKey: string,
  ) {
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('Postgres required');
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({
      data: { id: personId, givenName, familyName, version: 0 },
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

  it('GET /v1/parties returns projected search results over HTTP', async () => {
    const ctx = {
      organizationId: org.id,
      actorMemberId: admin.member.id,
      personId: admin.person.id,
      authIdentityId: admin.auth.id,
      correlationId: `corr-party-${Date.now()}`,
      effectiveAt: new Date(),
    };
    await partySvc.execute(
      'CreateParty',
      ctx,
      { partyKind: 'organization', displayName: 'HTTP Visible Party', initialRoleKey: 'customer' },
      `idem-http-party-${Date.now()}`,
    );
    await drainProjections();

    const res = await fetch(`${baseUrl}/v1/parties?q=HTTP+Visible`, {
      headers: sessionHeaders(org.id, admin.member, admin.person, admin.auth),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { items: Array<{ displayName: string }> };
    assert.ok(json.items.some((p) => p.displayName.includes('HTTP Visible')));
  });

  it('GET /v1/work-items and /v1/approvals and /v1/attention over HTTP', async () => {
    const ctx = {
      organizationId: org.id,
      actorMemberId: approver.member.id,
      personId: approver.person.id,
      authIdentityId: approver.auth.id,
      correlationId: `corr-work-${Date.now()}`,
      effectiveAt: new Date(),
    };
    const work = await workSvc.execute(
      'CreateWorkItem',
      ctx,
      { title: 'HTTP runtime work', ownerMemberId: owner.member.id, priority: 'high' },
      `idem-http-work-${Date.now()}`,
    );
    await drainProjections();
    const workItemId = String(work.data.workItemId);

    const listWork = await fetch(`${baseUrl}/v1/work-items`, {
      headers: sessionHeaders(org.id, owner.member, owner.person, owner.auth),
    });
    assert.equal(listWork.status, 200);
    const workJson = (await listWork.json()) as { items: Array<{ workItemId: string }> };
    assert.ok(workJson.items.some((w) => w.workItemId === workItemId));

    await workSvc.execute(
      'RequestApproval',
      ctx,
      {
        approverMemberId: approver.member.id,
        workItemId,
        subjectType: 'work_item',
        subjectId: workItemId,
      },
      `idem-http-appr-${Date.now()}`,
    );
    await drainProjections();

    const listApprovals = await fetch(`${baseUrl}/v1/approvals`, {
      headers: sessionHeaders(org.id, approver.member, approver.person, approver.auth),
    });
    assert.equal(listApprovals.status, 200);
    const apprJson = (await listApprovals.json()) as {
      items: Array<{ workItemId: string | null; status: string }>;
    };
    assert.ok(apprJson.items.some((a) => a.workItemId === workItemId && a.status === 'pending'));

    const attention = await fetch(`${baseUrl}/v1/attention`, {
      headers: sessionHeaders(org.id, approver.member, approver.person, approver.auth),
    });
    assert.equal(attention.status, 200);
    const attJson = (await attention.json()) as {
      items: Array<{ attentionType: string; workItemId: string | null }>;
    };
    assert.ok(attJson.items.some((a) => a.attentionType === 'pending_approval'));
  });

  it('cross-tenant HTTP query is denied for work list', async () => {
    const res = await fetch(`${baseUrl}/v1/work-items`, {
      headers: sessionHeaders(orgB.id, admin.member, admin.person, admin.auth),
    });
    assert.equal(res.status, 403);
  });

  it('guessed work ID from another member returns forbidden over HTTP', async () => {
    const ctx = {
      organizationId: org.id,
      actorMemberId: admin.member.id,
      personId: admin.person.id,
      authIdentityId: admin.auth.id,
      correlationId: `corr-guess-${Date.now()}`,
      effectiveAt: new Date(),
    };
    const work = await workSvc.execute(
      'CreateWorkItem',
      ctx,
      { title: 'Private work', ownerMemberId: owner.member.id },
      `idem-http-private-${Date.now()}`,
    );
    await drainProjections();
    const workItemId = String(work.data.workItemId);

    const outsider = await seedMemberWithSingleRole(
      org.id,
      `http-out-${Date.now()}@o.bo`,
      'Out',
      'Sider',
      'master_data.admin',
    );

    const res = await fetch(`${baseUrl}/v1/work-items/${workItemId}`, {
      headers: sessionHeaders(org.id, outsider.member, outsider.person, outsider.auth),
    });
    assert.equal(res.status, 403);

    void adminB;
  });
});
