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
 * S11 v2 over HTTP: the replay actor is the session member, never a body field.
 * CONFLICT keeps this controller's established 400; a pre-binding row is 409 with
 * the review message and no stored body.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

function headers(orgId: string, m: Seeded, key?: string): Record<string, string> {
  const h: Record<string, string> = {
    'content-type': 'application/json',
    'x-os-organization-id': orgId,
    'x-os-member-id': m.member.id,
    'x-os-person-id': m.person.id,
    'x-os-auth-identity-id': m.auth.id,
  };
  if (key) h['idempotency-key'] = key;
  return h;
}

describeHttp('S11 replay binding over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let org: { id: string };
  let a: Seeded;
  let b: Seeded;

  const post = (who: Seeded, body: Record<string, unknown>, key: string) =>
    fetch(`${baseUrl}/v1/commands/CreateParty`, {
      method: 'POST',
      headers: headers(org.id, who, key),
      body: JSON.stringify(body),
    });
  const party = (displayName: string, extra: Record<string, unknown> = {}) => ({
    partyKind: 'organization',
    displayName,
    initialRoleKey: 'customer',
    ...extra,
  });
  const parties = () => getOsPrisma()!.osParty.count({ where: { organizationId: org.id } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('S11 HTTP', `s11-http-${createId()}`);
    const seed = async () => {
      const m = await store.seedAdminMember(org.id, `s11h-${createId()}@o.bo`, 'S', 'Http');
      await getOsPrisma()!.osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: m.member.id, roleKey: 'master_data.admin', effectiveAt: new Date('2020-01-01') },
      });
      return m;
    };
    a = await seed();
    b = await seed();
  });

  after(async () => {
    await app.close();
  });

  it('same session, same body: second POST returns the first body and writes nothing', async () => {
    const before = await parties();
    const r1 = await post(a, party('HTTP Uno'), 'h-same');
    assert.equal(r1.status, 201);
    const b1 = await r1.json();
    const r2 = await post(a, party('HTTP Uno'), 'h-same');
    assert.equal(r2.status, 201);
    assert.deepEqual(await r2.json(), b1);
    assert.equal(await parties(), before + 1);
  });

  it('another session reusing the key gets CONFLICT with no stored body, even if the body names the first actor', async () => {
    await post(a, party('HTTP Dos'), 'h-other');
    const before = await parties();
    const res = await post(b, party('HTTP Dos', { actorMemberId: a.member.id }), 'h-other');
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { code: 'CONFLICT' });
    assert.equal(await parties(), before);
  });

  it('same session, changed body on the same key: CONFLICT', async () => {
    await post(a, party('HTTP Tres'), 'h-payload');
    const res = await post(a, party('HTTP Tres cambiado'), 'h-payload');
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { code: 'CONFLICT' });
  });

  it('a pre-binding row answers 409 REPLAY_REVIEW_REQUIRED with the review message, not the stored body', async () => {
    await getOsPrisma()!.osIdempotencyKey.create({
      data: {
        id: createId(),
        organizationId: org.id,
        key: 'h-legacy',
        commandName: 'CreateParty',
        resultJson: { data: { partyId: 'legacy-secret' } } as never,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    const before = await parties();
    const res = await post(a, party('HTTP Legacy'), 'h-legacy');
    assert.equal(res.status, 409);
    const text = await res.text();
    assert.ok(!text.includes('legacy-secret'));
    assert.deepEqual(JSON.parse(text), {
      code: 'REPLAY_REVIEW_REQUIRED',
      message: 'Esta solicitud anterior necesita revisión antes de repetirse.',
    });
    assert.equal(await parties(), before);
  });

  it('6 overlapping POSTs from one session on one key create one party', async () => {
    const before = await parties();
    const res = await Promise.all(Array.from({ length: 6 }, () => post(a, party('HTTP Race'), 'h-race')));
    const statuses = res.map((r) => r.status);
    console.log(`[evidence] http race statuses: ${statuses.join(',')}`);
    for (const s of statuses) assert.ok(s === 201 || s === 400, `unexpected ${s}`);
    assert.equal(await parties(), before + 1);
  });
});
