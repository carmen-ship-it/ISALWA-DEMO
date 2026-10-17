import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma, type PrismaOsWorkforceStore } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * Re-review R3/R2F decision 1 (2026-10-16 22:29): ActivateMember never revives
 * delegations from the previous lifecycle. The legacy state is written directly,
 * as code before ce74648 left it (suspended member, unrevoked delegations). Real
 * Nest app, real disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };
const DAY = 24 * 3600 * 1000;

describeHttp('Review R4 reactivation over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `r4a-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(m[who]!),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function listMembers(who: string): Promise<number> {
    const res = await fetch(`${baseUrl}/v1/members`, { headers: headers(m[who]!) });
    await res.text();
    return res.status;
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r4a.bo`, name, 'R4');
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

  async function legacyDelegation(from: string, to: string, startsAt: Date): Promise<string> {
    const id = createId();
    await prisma().osDelegation.create({
      data: {
        id,
        organizationId: org.id,
        delegatorMemberId: m[from]!.member.id,
        delegateMemberId: m[to]!.member.id,
        scopesJson: ['people.admin'],
        startsAt,
        expiresAt: new Date(Date.now() + 30 * DAY),
      },
    });
    return id;
  }

  const setStatus = (who: string, accessStatus: 'active' | 'suspended') =>
    prisma().osOrganizationMember.update({ where: { id: m[who]!.member.id }, data: { accessStatus } });
  const statusOf = async (who: string) =>
    (await prisma().osOrganizationMember.findUniqueOrThrow({ where: { id: m[who]!.member.id } })).accessStatus;
  const row = (id: string) => prisma().osDelegation.findUniqueOrThrow({ where: { id } });
  const activate = (who: string) =>
    command('admin', 'ActivateMember', { memberId: m[who]!.member.id, providerSubject: `subject:${m[who]!.member.id}` });
  const grant = (from: string, to: string) =>
    command(from, 'GrantDelegation', {
      delegateMemberId: m[to]!.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
    });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R4A Org', `r4a-${createId()}`);
    m.admin = await seedMember('admin', ['people.admin']);
    m.holder = await seedMember('holder', ['people.admin']);
    m.legacyIssuer = await seedMember('legacyIssuer', ['people.admin']);
    m.legacyDelegate = await seedMember('legacyDelegate', ['sales_rep']);
    m.helper = await seedMember('helper', ['sales_rep']);
    m.helper2 = await seedMember('helper2', ['sales_rep']);
    m.racer = await seedMember('racer', ['sales_rep']);
    m.atomic = await seedMember('atomic', ['sales_rep']);
  });

  after(async () => {
    await app.close();
  });

  const legacy = { issued: '', issuedFuture: '', received: '' };

  it('legacy state: suspended before ce74648 with unrevoked delegations issued and received', async () => {
    legacy.issued = await legacyDelegation('legacyIssuer', 'helper', new Date(Date.now() - DAY));
    legacy.issuedFuture = await legacyDelegation('legacyIssuer', 'helper2', new Date(Date.now() + 2 * DAY));
    legacy.received = await legacyDelegation('holder', 'legacyDelegate', new Date(Date.now() - DAY));
    await setStatus('legacyIssuer', 'suspended');
    await setStatus('legacyDelegate', 'suspended');
    assert.equal(await listMembers('helper'), 403, 'inactive delegator confers nothing');
    for (const id of Object.values(legacy)) assert.equal((await row(id)).revokedAt, null);
  });

  it('ActivateMember through HTTP ends them in the same transaction; old delegations stay ineffective; rows kept', async () => {
    const before = await row(legacy.issued);
    for (const who of ['legacyIssuer', 'legacyDelegate']) {
      const reply = await activate(who);
      assert.equal(reply.status, 201, JSON.stringify(reply.body));
      assert.equal(await statusOf(who), 'active');
    }
    for (const id of Object.values(legacy)) assert.ok((await row(id)).revokedAt, id);
    assert.deepEqual({ ...(await row(legacy.issued)), revokedAt: null }, before, 'only revokedAt written');
    assert.equal(await listMembers('helper'), 403, 'issued delegation not revived');
    assert.equal(await listMembers('legacyDelegate'), 403, 'received delegation not revived (holder is active)');
    const event = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'member.activated', primaryEntityId: m.legacyIssuer!.member.id },
    });
    assert.deepEqual(
      (event.payloadJson as Record<string, unknown>).endedDelegationIds,
      [legacy.issued, legacy.issuedFuture].sort(),
    );
  });

  it('a fresh authorized grant works; repeated activation is refused and leaves it in force', async () => {
    const fresh = await grant('holder', 'legacyDelegate');
    assert.equal(fresh.status, 201, JSON.stringify(fresh.body));
    assert.equal(await listMembers('legacyDelegate'), 200);
    const again = await activate('legacyDelegate');
    assert.deepEqual([again.status, again.body], [400, { code: 'VALIDATION_FAILED' }]);
    const id = String((fresh.body.data as Record<string, unknown>).delegationId);
    assert.equal((await row(id)).revokedAt, null);
    assert.equal(await listMembers('legacyDelegate'), 200);
  });

  it('GrantDelegation to a suspended member is refused and writes nothing', async () => {
    await setStatus('helper', 'suspended');
    const count = await prisma().osDelegation.count({ where: { delegateMemberId: m.helper!.member.id } });
    const reply = await grant('holder', 'helper');
    assert.deepEqual([reply.status, reply.body], [400, { code: 'VALIDATION_FAILED' }]);
    assert.equal(await prisma().osDelegation.count({ where: { delegateMemberId: m.helper!.member.id } }), count);
    await setStatus('helper', 'active');
  });

  it('concurrent ActivateMember and GrantDelegation: a stale grant never survives; a grant after activation does', async () => {
    for (let round = 0; round < 6; round += 1) {
      await setStatus('racer', 'suspended');
      const [activated, granted] = await Promise.all([activate('racer'), grant('holder', 'racer')]);
      assert.equal(activated.status, 201, JSON.stringify(activated.body));
      assert.equal(await statusOf('racer'), 'active');
      const open = await prisma().osDelegation.findMany({
        where: { delegateMemberId: m.racer!.member.id, revokedAt: null },
      });
      if (granted.status === 201) {
        const id = String((granted.body.data as Record<string, unknown>).delegationId);
        assert.deepEqual(open.map((d) => d.id), [id], `round ${round}: only the post-activation grant is open`);
        assert.equal(await listMembers('racer'), 200);
      } else {
        assert.deepEqual([granted.status, granted.body], [400, { code: 'VALIDATION_FAILED' }]);
        assert.deepEqual(open, [], `round ${round}: refused grant left nothing`);
        assert.equal(await listMembers('racer'), 403);
      }
      await prisma().osDelegation.updateMany({
        where: { delegateMemberId: m.racer!.member.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  });

  it('if the transaction cannot complete, activation fails without reactivating or ending anything', async () => {
    const id = await legacyDelegation('holder', 'atomic', new Date(Date.now() - DAY));
    await setStatus('atomic', 'suspended');
    (store as PrismaOsWorkforceStore).testFailNextAppend = true;
    const reply = await activate('atomic');
    assert.ok(reply.status >= 500, `failed: ${reply.status}`);
    assert.equal(await statusOf('atomic'), 'suspended');
    assert.equal((await row(id)).revokedAt, null);
    const retry = await activate('atomic');
    assert.equal(retry.status, 201, JSON.stringify(retry.body));
    assert.ok((await row(id)).revokedAt);
    assert.equal(await listMembers('atomic'), 403);
  });
});
