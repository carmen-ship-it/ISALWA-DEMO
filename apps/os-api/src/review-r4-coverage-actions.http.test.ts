import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { ProjectionRunner } from '@isalwa/os-query';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * NEW-R4-2: coverage reads the customer's master data under any active grant, but work,
 * approvals and commitments linked to that customer need a grant that covers commercial
 * work. A data-only grant (customer.edit) gets the missing-id answer on them and does not
 * see them in the customer timeline. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('NEW-R4-2 coverage action on customer-linked reads over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `r4-cov-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4cov.bo`, name, 'R4');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function grantCoverage(advisor: string, coveredActions: string[]) {
    await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: ids.party!,
        primaryOwnerMemberId: m.owner!.member.id,
        actingAdvisorMemberId: m[advisor]!.member.id,
        coveredActions,
        startsAt: new Date('2020-01-01'),
        recordedAt: new Date('2020-01-01'),
      },
    });
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('R4 Coverage Org', `r4-cov-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.owner = await seedMember('owner', ['sales_rep']);
    m.approver = await seedMember('approver', ['sales_rep']);
    m.dataOnly = await seedMember('dataonly', ['sales_rep']);
    m.commercial = await seedMember('commercial', ['sales_rep']);

    ids.party = createId();
    await prisma().osParty.create({ data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'R4 Cov Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id } });
    await grantCoverage('dataOnly', ['customer.edit']);
    await grantCoverage('commercial', ['commercial.work']);

    const work = await command('admin', 'CreateWorkItem', {
      title: 'R4 cov seguimiento',
      ownerMemberId: m.owner!.member.id,
      subjectType: 'party',
      subjectId: ids.party,
    });
    assert.equal(work.status, 201, JSON.stringify(work.body));
    ids.work = String((work.body.data as Record<string, unknown>).workItemId);
    const approval = await command('owner', 'RequestApproval', {
      approverMemberId: m.approver!.member.id,
      subjectType: 'party',
      subjectId: ids.party,
    });
    assert.equal(approval.status, 201, JSON.stringify(approval.body));
    ids.approval = String((approval.body.data as Record<string, unknown>).approvalRequestId);
    const commitment = await command('owner', 'CreateEmployeeCommitment', { text: 'R4 cov entregar muestra', partyId: ids.party });
    assert.equal(commitment.status, 201, JSON.stringify(commitment.body));
    ids.commitment = String((commitment.body.data as Record<string, unknown>).commitmentId);
    await runner.runOnce();
    await runner.runOnce();
  });

  after(async () => {
    await app.close();
  });

  it('data-only coverage keeps the customer record but gets the missing-id answer on its work, approval and commitment', async () => {
    assert.equal((await get('dataOnly', `/parties/${ids.party}`)).status, 200);
    const pairs: Array<[string, string]> = [
      [`/work-items/${ids.work}`, `/work-items/${createId()}`],
      [`/approvals/${ids.approval}`, `/approvals/${createId()}`],
      [`/commitments/${ids.commitment}`, `/commitments/${createId()}`],
    ];
    for (const [path, missingPath] of pairs) {
      const missing = await get('dataOnly', missingPath);
      const hidden = await get('dataOnly', path);
      assert.deepEqual([hidden.status, hidden.body], [missing.status, missing.body], path);
      assert.equal(hidden.status, 404, path);
    }
  });

  it('data-only coverage reads the timeline without the owner\'s work, approval or commitment entries', async () => {
    const timeline = await get('dataOnly', `/parties/${ids.party}/timeline`);
    assert.equal(timeline.status, 200);
    const text = JSON.stringify(timeline.body);
    for (const id of [ids.work!, ids.approval!, ids.commitment!]) assert.equal(text.includes(id), false, id);
  });

  it('commercial.work coverage keeps the work, approval and commitment reads', async () => {
    assert.equal((await get('commercial', `/parties/${ids.party}`)).status, 200);
    for (const path of [`/work-items/${ids.work}`, `/approvals/${ids.approval}`, `/commitments/${ids.commitment}`]) {
      assert.equal((await get('commercial', path)).status, 200, path);
    }
    const timeline = JSON.stringify((await get('commercial', `/parties/${ids.party}/timeline`)).body);
    assert.equal(timeline.includes(ids.work!), true);
  });

  it('the owner and the approver are unaffected', async () => {
    for (const path of [`/work-items/${ids.work}`, `/approvals/${ids.approval}`, `/commitments/${ids.commitment}`]) {
      assert.equal((await get('owner', path)).status, 200, path);
    }
    assert.equal((await get('approver', `/approvals/${ids.approval}`)).status, 200);
  });
});
