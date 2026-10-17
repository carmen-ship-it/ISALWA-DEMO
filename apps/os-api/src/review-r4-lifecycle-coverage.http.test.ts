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
 * Owner decision 2026-10-16 22:20 §1: active customer coverage never blocks
 * suspension or termination. The lifecycle command ends it in the same
 * transaction (rows kept), records who is responsible, and nothing revives on
 * reinstatement. Real Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('Review R4 lifecycle ends customer coverage over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const state = { partyId: '', accountId: '', replayKey: '' };

  async function command(who: string, name: string, body: Record<string, unknown>, key = `r4-${createId()}`): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-os-organization-id': org.id,
        'x-os-member-id': m[who]!.member.id,
        'x-os-person-id': m[who]!.person.id,
        'x-os-auth-identity-id': m[who]!.auth.id,
        'idempotency-key': key,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4.bo`, name, 'R4');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({
        where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
      });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function read(who: string, path: string): Promise<number> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      headers: {
        'x-os-organization-id': org.id,
        'x-os-member-id': m[who]!.member.id,
        'x-os-person-id': m[who]!.person.id,
        'x-os-auth-identity-id': m[who]!.auth.id,
      },
    });
    await res.text();
    return res.status;
  }

  const openCoverage = (actingAdvisorMemberId: string) =>
    prisma().osCustomerCoverageGrant.findMany({ where: { organizationId: org.id, actingAdvisorMemberId, revokedAt: null } });

  const lastEvent = (eventType: string, memberId: string) =>
    prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType, primaryEntityId: memberId },
      orderBy: { occurredAt: 'desc' },
    });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R4 Org', `r4-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.seller = await seedMember('seller', ['commercial.customer.create', 'commercial.quote.convert.own']);
    m.manager = await seedMember('manager', ['commercial.account.reassign', 'commercial.assignment.org', 'commercial.customer.edit']);
    m.helper = await seedMember('helper', ['commercial.quote.convert.own']);
    m.helper2 = await seedMember('helper2', ['commercial.quote.convert.own']);

    const created = await command('seller', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Ferretería R4',
      contact: { givenName: 'Ana', familyName: 'Rojas' },
      phone: `7${String(Date.now()).slice(-7)}`,
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    state.partyId = String((created.body.data as Record<string, unknown>).partyId);
    state.accountId = (await prisma().osCommercialAccount.findFirstOrThrow({ where: { organizationId: org.id, partyId: state.partyId } })).id;
  });

  after(async () => {
    await app.close();
  });

  it('suspension is not blocked by coverage; it ends current and future-dated coverage and stops read, command and replay', async () => {
    const granted = await command('manager', 'GrantCustomerCoverage', {
      commercialAccountId: state.accountId,
      actingAdvisorMemberId: m.helper!.member.id,
    });
    assert.equal(granted.status, 201, JSON.stringify(granted.body));
    const future = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: state.partyId,
        primaryOwnerMemberId: m.seller!.member.id,
        actingAdvisorMemberId: m.helper!.member.id,
        startsAt: new Date(Date.now() + 3 * 86_400_000),
        recordedAt: new Date(),
      },
    });
    state.replayKey = `r4-replay-${createId()}`;
    const quoted = await command('helper', 'CreateQuote', { partyId: state.partyId }, state.replayKey);
    assert.equal(quoted.status, 201, 'coverage works before suspension');
    assert.equal(await read('helper', `/parties/${state.partyId}`), 200, 'coverage reads the customer');
    const rowsBefore = await prisma().osCustomerCoverageGrant.count({ where: { organizationId: org.id } });

    const suspended = await command('admin', 'SuspendMember', { memberId: m.helper!.member.id });
    assert.equal(suspended.status, 201, JSON.stringify(suspended.body));

    assert.deepEqual(await openCoverage(m.helper!.member.id), [], 'current and future-dated coverage ended');
    assert.equal(await prisma().osCustomerCoverageGrant.count({ where: { organizationId: org.id } }), rowsBefore, 'rows kept as history');
    assert.ok((await prisma().osCustomerCoverageGrant.findUniqueOrThrow({ where: { id: future.id } })).revokedAt);
    const payload = (await lastEvent('member.suspended', m.helper!.member.id)).payloadJson as Record<string, unknown>;
    const ended = payload.endedCustomerCoverage as Array<Record<string, unknown>>;
    assert.equal(ended.length, 2);
    assert.ok(ended.every((e) => e.memberRole === 'acting_advisor' && e.responsibleMemberId === m.seller!.member.id));
    assert.deepEqual(payload.unresolvedCustomerPartyIds, []);
    const audit = await prisma().osAuditLog.findFirst({ where: { organizationId: org.id, resourceId: m.helper!.member.id, action: 'member.suspended' } });
    assert.ok(audit, 'audited in the lifecycle transaction');

    const fresh = await command('helper', 'CreateQuote', { partyId: state.partyId });
    assert.equal(fresh.status, 403, 'suspended member is refused');
    assert.equal(await read('helper', `/parties/${state.partyId}`), 403, 'suspended member cannot read');
    const replay = await command('helper', 'CreateQuote', { partyId: state.partyId }, state.replayKey);
    assert.equal(replay.status, 403, 'replay re-authorizes');
  });

  it('reinstatement does not revive ended coverage; a fresh authorized grant is required', async () => {
    // No product command reinstates; this out-of-band update only pins that nothing revives.
    await prisma().osOrganizationMember.update({ where: { id: m.helper!.member.id }, data: { accessStatus: 'active' } });
    const noCoverage = await command('helper', 'CreateQuote', { partyId: state.partyId });
    assert.deepEqual([noCoverage.status, noCoverage.body], [404, { code: 'NOT_FOUND' }]);
    assert.equal(await read('helper', `/parties/${state.partyId}`), 404, 'no read through ended coverage');
    // Known S11 gap (receipt §1): replay re-checks the command permission, not
    // resource authority, so the same actor gets back their own earlier result.
    // Pinned here so a fix shows up as a deliberate expectation change.
    const quotesBefore = await prisma().osQuote.count({ where: { organizationId: org.id } });
    const replay = await command('helper', 'CreateQuote', { partyId: state.partyId }, state.replayKey);
    assert.equal(replay.status, 201);
    assert.equal(await prisma().osQuote.count({ where: { organizationId: org.id } }), quotesBefore, 'replay writes nothing');
    assert.deepEqual(await openCoverage(m.helper!.member.id), []);

    const regrant = await command('manager', 'GrantCustomerCoverage', {
      commercialAccountId: state.accountId,
      actingAdvisorMemberId: m.helper!.member.id,
    });
    assert.equal(regrant.status, 201);
    assert.equal((await command('helper', 'CreateQuote', { partyId: state.partyId })).status, 201);
  });

  it('termination is not blocked by future-dated coverage and ends it', async () => {
    const future = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: state.partyId,
        primaryOwnerMemberId: m.seller!.member.id,
        actingAdvisorMemberId: m.helper2!.member.id,
        startsAt: new Date(Date.now() + 86_400_000),
        recordedAt: new Date(),
      },
    });
    const terminated = await command('admin', 'TerminateMember', { memberId: m.helper2!.member.id });
    assert.equal(terminated.status, 201, JSON.stringify(terminated.body));
    assert.ok((await prisma().osCustomerCoverageGrant.findUniqueOrThrow({ where: { id: future.id } })).revokedAt);
    const payload = (await lastEvent('member.terminated', m.helper2!.member.id)).payloadJson as Record<string, unknown>;
    assert.deepEqual((payload.endedCustomerCoverage as Array<Record<string, unknown>>).map((e) => e.grantId), [future.id]);
  });

  it('when the primary owner is not active, the customer is recorded as unresolved and access is still revoked', async () => {
    const coverage = await prisma().osCustomerCoverageGrant.findFirstOrThrow({
      where: { organizationId: org.id, actingAdvisorMemberId: m.helper!.member.id, revokedAt: null },
    });
    await prisma().osOrganizationMember.update({ where: { id: m.seller!.member.id }, data: { accessStatus: 'suspended' } });
    const suspended = await command('admin', 'SuspendMember', { memberId: m.helper!.member.id });
    assert.equal(suspended.status, 201, JSON.stringify(suspended.body));
    const payload = (await lastEvent('member.suspended', m.helper!.member.id)).payloadJson as Record<string, unknown>;
    assert.deepEqual(payload.endedCustomerCoverage, [
      { grantId: coverage.id, customerPartyId: state.partyId, memberRole: 'acting_advisor', responsibleMemberId: null },
    ]);
    assert.deepEqual(payload.unresolvedCustomerPartyIds, [state.partyId]);
    const member = await prisma().osOrganizationMember.findUniqueOrThrow({ where: { id: m.helper!.member.id } });
    assert.equal(member.accessStatus, 'suspended');
  });
});
