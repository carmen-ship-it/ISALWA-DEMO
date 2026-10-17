import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * S11 resource recheck: an accepted replay also requires the actor's current authority
 * over the record, not only the command scope. While that authority holds, the same
 * actor's retry returns the first body and writes nothing; once it is gone, the replay
 * answers as a fresh command would. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Res = { status: number; body: Record<string, unknown> & { data?: Record<string, unknown> } };

describeHttp('S11 replay rechecks record authority over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};

  async function command(who: string, name: string, body: Record<string, unknown>, key = `s11r-${createId()}`): Promise<Res> {
    const seeded = m[who]!;
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-os-organization-id': org.id,
        'x-os-member-id': seeded.member.id,
        'x-os-person-id': seeded.person.id,
        'x-os-auth-identity-id': seeded.auth.id,
        'idempotency-key': key,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@s11r.bo`, name, 'S11R');
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

  /** Same actor, same body, same key: first body back while authorized; then the given denial. */
  async function replayThenDeny(
    who: string,
    name: string,
    body: Record<string, unknown>,
    revoke: () => Promise<void>,
    denial: { status: number; code: string },
  ) {
    const key = `s11r-${createId()}`;
    const first = await command(who, name, body, key);
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const again = await command(who, name, body, key);
    assert.deepEqual([again.status, again.body], [201, first.body], 'authorized retry returns the first body');
    await revoke();
    const denied = await command(who, name, body, key);
    assert.deepEqual([denied.status, denied.body.code], [denial.status, denial.code]);
    assert.equal(JSON.stringify(denied.body).includes(String(first.body.data?.eventId)), false, 'no stored body');
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('S11 Recheck Org', `s11r-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.owner = await seedMember('owner', ['sales_rep']);
    m.other = await seedMember('other', ['sales_rep']);
    m.approver = await seedMember('approver', ['sales_rep']);
    m.ops = await seedMember('ops', ['issue.manage']);
    m.advisor = await seedMember('advisor', ['sales_rep']);
    m.jefe = await seedMember('jefe', ['commercial.team.read']);
  });

  after(async () => {
    await app.close();
  });

  it('CompleteWork: the owner\'s retry is refused once the work belongs to someone else', async () => {
    const created = await command('admin', 'CreateWorkItem', { title: 'S11 completar', ownerMemberId: m.owner!.member.id });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const workItemId = String(created.body.data!.workItemId);
    await replayThenDeny('owner', 'CompleteWork', { workItemId }, async () => {
      await prisma().osWorkItem.update({ where: { id: workItemId }, data: { ownerMemberId: m.other!.member.id } });
    }, { status: 403, code: 'PERMISSION_DENIED' });
  });

  it('Approve: the approver\'s retry is refused once the approval names another approver', async () => {
    const work = await command('admin', 'CreateWorkItem', { title: 'S11 aprobar', ownerMemberId: m.owner!.member.id });
    const requested = await command('owner', 'RequestApproval', {
      approverMemberId: m.approver!.member.id,
      subjectType: 'work_item',
      subjectId: String(work.body.data!.workItemId),
    });
    assert.equal(requested.status, 201, JSON.stringify(requested.body));
    const approvalRequestId = String(requested.body.data!.approvalRequestId);
    await replayThenDeny('approver', 'Approve', { approvalRequestId }, async () => {
      await prisma().osApprovalRequest.update({ where: { id: approvalRequestId }, data: { approverMemberId: m.other!.member.id } });
    }, { status: 403, code: 'PERMISSION_DENIED' });
  });

  it('AddIssueJournalEntry: a former issue owner\'s retry is refused after reassignment', async () => {
    const reported = await command('ops', 'ReportIssue', { title: 'S11 prensa', description: 'Ruido en la prensa' });
    assert.equal(reported.status, 201, JSON.stringify(reported.body));
    const issueId = String(reported.body.data!.issueId);
    const issue = await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } });
    const assigned = await command('ops', 'AssignIssueOwner', { issueId, ownerMemberId: m.owner!.member.id, expectedVersion: issue.version });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    const current = await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } });
    await replayThenDeny('owner', 'AddIssueJournalEntry', { issueId, entryType: 'observation', content: 'Revisado', expectedVersion: current.version }, async () => {
      await prisma().osIssue.update({ where: { id: issueId }, data: { currentOwnerMemberId: m.other!.member.id } });
    }, { status: 403, code: 'PERMISSION_DENIED' });
  });

  it('CreateEmployeeCommitment: a team lead\'s retry on a report\'s customer is refused once the report leaves the team', async () => {
    const assignment = await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: org.id, memberId: m.advisor!.member.id, managerMemberId: m.jefe!.member.id, effectiveAt: new Date('2020-01-01') },
    });
    const partyId = createId();
    await prisma().osParty.create({ data: { id: partyId, organizationId: org.id, partyKind: 'organization', displayName: 'S11 Synth Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: org.id, partyId, ownerMemberId: m.advisor!.member.id } });
    await replayThenDeny('jefe', 'CreateEmployeeCommitment', { text: 'S11 llamar al cliente', partyId, ownerMemberId: m.advisor!.member.id }, async () => {
      await prisma().osManagerAssignment.update({ where: { id: assignment.id }, data: { endedAt: new Date('2021-01-01') } });
    }, { status: 404, code: 'NOT_FOUND' });
  });
});
