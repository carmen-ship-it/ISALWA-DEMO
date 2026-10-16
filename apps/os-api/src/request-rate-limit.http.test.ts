import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';
import { REQUEST_RATE_LIMITS } from './request-rate-limit';

/**
 * V2 §18.1 shared limits over HTTP with the real Postgres counter (disposable DB).
 * Checks bodies and rows, not only status codes.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describeHttp('request rate limits over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let org: { id: string };
  const prisma = () => getOsPrisma()!;

  const headers = (who: Seeded) => ({
    'content-type': 'application/json',
    'x-os-organization-id': org.id,
    'x-os-member-id': who.member.id,
    'x-os-person-id': who.person.id,
    'x-os-auth-identity-id': who.auth.id,
  });
  const search = async (who: Seeded) => {
    const res = await fetch(`${baseUrl}/v1/parties?q=cliente`, { headers: headers(who) });
    return { status: res.status, body: await res.json() };
  };
  const createParty = async (who: Seeded, name: string) => {
    const res = await fetch(`${baseUrl}/v1/commands/CreateParty`, {
      method: 'POST',
      headers: headers(who),
      body: JSON.stringify({ partyKind: 'organization', displayName: name, initialRoleKey: 'customer' }),
    });
    return { status: res.status, body: await res.json() };
  };

  async function plainMember(name: string): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@rl.bo`, name, 'RL');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    return seeded;
  }

  /** Fixed one-minute windows: start a burst early in a window so it cannot straddle two. */
  async function startOfFreshWindow(): Promise<void> {
    const intoWindow = Date.now() % 60_000;
    if (intoWindow > 45_000) await new Promise((r) => setTimeout(r, 60_000 - intoWindow + 50));
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('RL Org', `rl-${createId()}`);
  });

  after(async () => {
    await app.close();
  });

  it('search: configured volume passes, the next request is 429 with a generic body; others unaffected', async () => {
    const heavy = await plainMember('heavy');
    const normal = await plainMember('normal');
    await startOfFreshWindow();
    const limit = REQUEST_RATE_LIMITS.search.perMember;
    for (let i = 0; i < limit; i += 1) {
      const res = await search(heavy);
      assert.equal(res.status, 200, `request ${i + 1}`);
    }
    const over = await search(heavy);
    assert.equal(over.status, 429);
    assert.deepEqual(Object.keys(over.body).sort(), ['code', 'retryAfterSeconds']);
    assert.equal(over.body.code, 'RATE_LIMITED');
    assert.ok(over.body.retryAfterSeconds >= 1 && over.body.retryAfterSeconds <= 60);
    assert.equal(JSON.stringify(over.body).includes(heavy.member.id), false);
    assert.equal((await search(normal)).status, 200);
    console.log(`[evidence] search limit=${limit} over=${JSON.stringify(over.body)} otherMember=200`);
  });

  it('commands: repeated denied CreateParty attempts are limited and create nothing', async () => {
    const prober = await plainMember('prober');
    await startOfFreshWindow();
    const partiesBefore = await prisma().osParty.count({ where: { organizationId: org.id } });
    const statuses = new Map<string, number>();
    for (let i = 0; i <= REQUEST_RATE_LIMITS.command.perMember; i += 1) {
      const res = await createParty(prober, `Sondeo ${i}`);
      const key = `${res.status}:${res.body.code}`;
      statuses.set(key, (statuses.get(key) ?? 0) + 1);
    }
    assert.deepEqual(Object.fromEntries(statuses), {
      '403:PERMISSION_DENIED': REQUEST_RATE_LIMITS.command.perMember,
      '429:RATE_LIMITED': 1,
    });
    assert.equal(await prisma().osParty.count({ where: { organizationId: org.id } }), partiesBefore);
    const bucket = await prisma().osRateLimitBucket.findMany({
      where: { organizationId: org.id, bucketKey: `command:member:${prober.member.id}` },
    });
    assert.equal(bucket.length, 1);
    assert.equal(bucket[0]?.count, REQUEST_RATE_LIMITS.command.perMember + 1);
    // The search budget is separate.
    assert.equal((await search(prober)).status, 200);
    console.log(`[evidence] commands ${JSON.stringify(Object.fromEntries(statuses))} partiesCreated=0 bucketCount=${bucket[0]?.count}`);
  });

  it('a concurrent burst is cut at exactly the limit', async () => {
    const burst = await plainMember('burst');
    await startOfFreshWindow();
    const limit = REQUEST_RATE_LIMITS.search.perMember;
    const results = await Promise.all(Array.from({ length: limit + 10 }, () => search(burst)));
    const ok = results.filter((r) => r.status === 200).length;
    const limited = results.filter((r) => r.status === 429 && r.body.code === 'RATE_LIMITED').length;
    console.log(`[evidence] concurrent burst sent=${limit + 10} ok=${ok} limited=${limited}`);
    assert.equal(ok, limit);
    assert.equal(limited, 10);
  });
});
