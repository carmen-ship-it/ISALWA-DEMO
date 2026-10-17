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
 * NEW-R4-3: the customer timeline and the detail endpoints answer the same for coverage.
 * A covering advisor (commercial.work) who sees the owner's quote approval or the owner's
 * customer work in the timeline can open it, and sees the quote's approvals; a data-only
 * grant and an unrelated member see neither. (Work items cannot take quote or order
 * subjects: WORK_SUBJECT_TYPES.) Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('NEW-R4-3 timeline and detail agree under coverage over HTTP (disposable Postgres)', () => {
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
      'idempotency-key': `r4-tl-${createId()}`,
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
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4tl.bo`, name, 'R4');
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

  const data = (reply: Reply) => reply.body.data as Record<string, unknown>;

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('R4 Timeline Org', `r4-tl-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.owner = await seedMember('owner', ['sales_rep']);
    m.approver = await seedMember('approver', ['sales_rep']);
    m.cover = await seedMember('cover', ['sales_rep']);
    m.dataOnly = await seedMember('dataonly', ['sales_rep']);
    m.outsider = await seedMember('outsider', ['sales_rep']);

    ids.party = createId();
    await prisma().osParty.create({ data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'R4 TL Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id } });
    await grantCoverage('cover', ['commercial.work']);
    await grantCoverage('dataOnly', ['customer.edit']);

    const quote = await command('owner', 'CreateQuote', { partyId: ids.party });
    assert.equal(quote.status, 201, `quote: ${JSON.stringify(quote.body)}`);
    ids.quote = String(data(quote).quoteId);
    const line = await command('owner', 'AddQuoteLine', { quoteId: ids.quote, description: 'Ladrillo 6H', quantity: 10, unitPriceCentavos: 150 });
    assert.equal(line.status, 201, `line: ${JSON.stringify(line.body)}`);
    const submitted = await command('owner', 'SubmitQuote', { quoteId: ids.quote });
    assert.equal(submitted.status, 201, `submit: ${JSON.stringify(submitted.body)}`);
    const quiet = await command('owner', 'CreateQuote', { partyId: ids.party });
    assert.equal(quiet.status, 201, `quiet: ${JSON.stringify(quiet.body)}`);
    ids.quietQuote = String(data(quiet).quoteId);
    const approval = await command('owner', 'RequestApproval', {
      approverMemberId: m.approver!.member.id,
      subjectType: 'quote',
      subjectId: ids.quote,
    });
    assert.equal(approval.status, 201, `approval: ${JSON.stringify(approval.body)}`);
    ids.approval = String(data(approval).approvalRequestId);
    const work = await command('admin', 'CreateWorkItem', {
      title: 'R4 TL seguimiento del cliente',
      ownerMemberId: m.owner!.member.id,
      subjectType: 'party',
      subjectId: ids.party,
    });
    assert.equal(work.status, 201, `work: ${JSON.stringify(work.body)}`);
    ids.work = String(data(work).workItemId);
    await runner.runOnce();
    await runner.runOnce();
  });

  after(async () => {
    await app.close();
  });

  const timelineIds = async (who: string) => JSON.stringify((await get(who, `/parties/${ids.party}/timeline?limit=100`)).body);

  it('the owner sees the quote, its approval and its work in the timeline and in detail', async () => {
    const timeline = await timelineIds('owner');
    for (const id of [ids.quote!, ids.approval!, ids.work!]) assert.equal(timeline.includes(id), true, id);
    assert.equal((await get('owner', `/approvals/${ids.approval}`)).status, 200);
    assert.equal((await get('owner', `/work-items/${ids.work}`)).status, 200);
  });

  it('commercial.work coverage: every approval and work entry the timeline shows opens in detail, and the quote approvals list answers', async () => {
    const timeline = await timelineIds('cover');
    assert.equal(timeline.includes(ids.approval!), true, 'approval in timeline');
    assert.equal(timeline.includes(ids.work!), true, 'work in timeline');
    assert.equal((await get('cover', `/approvals/${ids.approval}`)).status, 200);
    assert.equal((await get('cover', `/work-items/${ids.work}`)).status, 200);
    const subject = await get('cover', `/approvals/subject?subjectType=quote&subjectId=${ids.quote}`);
    assert.equal(subject.status, 200, JSON.stringify(subject.body));
    assert.equal(JSON.stringify(subject.body).includes(ids.approval!), true);
  });

  it('commercial.work coverage on a quote without approvals: the approvals list answers empty, as the owner\'s does', async () => {
    for (const who of ['owner', 'cover']) {
      const list = await get(who, `/approvals/subject?subjectType=quote&subjectId=${ids.quietQuote}`);
      assert.equal(list.status, 200, `${who}: ${JSON.stringify(list.body)}`);
      assert.deepEqual(list.body.items, [], who);
    }
    for (const who of ['dataOnly', 'outsider']) {
      assert.equal((await get(who, `/approvals/subject?subjectType=quote&subjectId=${ids.quietQuote}`)).status, 404, who);
    }
  });

  it('data-only coverage and an unrelated member: neither timeline nor detail', async () => {
    for (const who of ['dataOnly', 'outsider']) {
      if (who === 'dataOnly') {
        const timeline = await timelineIds(who);
        for (const id of [ids.approval!, ids.work!]) assert.equal(timeline.includes(id), false, `${who} ${id}`);
      }
      const missingApproval = await get(who, `/approvals/${createId()}`);
      const approval = await get(who, `/approvals/${ids.approval}`);
      assert.deepEqual([approval.status, approval.body], [missingApproval.status, missingApproval.body], `${who} approval`);
      const missingWork = await get(who, `/work-items/${createId()}`);
      const work = await get(who, `/work-items/${ids.work}`);
      assert.deepEqual([work.status, work.body], [missingWork.status, missingWork.body], `${who} work`);
      assert.equal((await get(who, `/approvals/subject?subjectType=quote&subjectId=${ids.quote}`)).status, 404, `${who} subject list`);
    }
  });
});
