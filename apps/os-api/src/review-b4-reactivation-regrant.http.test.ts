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
 * B4 (23:47 §B.4): reactivation restores access, not authority. Grants held
 * before the suspension, including a primary role that is a permission, end at
 * reinstatement and come back only through ChangeRole / GrantAdditionalRole by
 * someone allowed to grant them. Real Nest app, real disposable Postgres,
 * synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const DENIED = [403, { code: 'PERMISSION_DENIED' }];

describeHttp('B4 reactivation needs a fresh grant over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const phone = () => `6${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 10)}`;

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `b4-${createId()}`,
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
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@b4.bo`, name, 'B4');
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

  const activeKeys = async (who: string) =>
    (
      await prisma().osRoleAssignment.findMany({
        where: { organizationId: org.id, memberId: m[who]!.member.id, endedAt: null },
        select: { roleKey: true },
      })
    )
      .map((row) => row.roleKey)
      .sort();

  const endedKeys = async (who: string) =>
    (
      await prisma().osRoleAssignment.findMany({
        where: { organizationId: org.id, memberId: m[who]!.member.id, endedAt: { not: null } },
        select: { roleKey: true },
      })
    )
      .map((row) => row.roleKey)
      .sort();

  const createCustomer = (who: string, name: string) =>
    command(who, 'CreateParty', {
      partyKind: 'organization',
      displayName: name,
      contact: { givenName: 'Ana', familyName: 'Prueba' },
      phone: { country: 'BO', number: phone() },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });

  const suspendThenActivate = async (who: string) => {
    const suspended = await command('admin', 'SuspendMember', { memberId: m[who]!.member.id });
    assert.equal(suspended.status, 201, JSON.stringify(suspended.body));
    const activated = await command('admin', 'ActivateMember', {
      memberId: m[who]!.member.id,
      providerSubject: `subject:${m[who]!.member.id}`,
    });
    assert.equal(activated.status, 201, JSON.stringify(activated.body));
    return activated.body.data as Record<string, unknown>;
  };

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('B4 Org', `b4-${createId()}`);
    // Synthetic grantor fixture: holds the commercial scope in its own right.
    m.admin = await seedMember('admin', ['people.admin', 'commercial.customer.create']);
    m.rrhh = await seedMember('rrhh', ['people.admin']);
    m.seller = await seedMember('seller', ['sales_rep', 'commercial.customer.create', 'commercial.quote.convert.own']);
    m.gestor = await seedMember('gestor', ['people.admin']);
  });

  after(async () => {
    await app.close();
  });

  it('additional commercial grants end at reinstatement; the job title stays; rows are kept; the member cannot use them', async () => {
    const before = await createCustomer('seller', 'Cliente B4 antes');
    assert.equal(before.status, 201, JSON.stringify(before.body));

    const data = await suspendThenActivate('seller');

    assert.deepEqual(data.endedRoleKeys, ['commercial.customer.create', 'commercial.quote.convert.own']);
    assert.deepEqual(await activeKeys('seller'), ['sales_rep']);
    assert.deepEqual(await endedKeys('seller'), ['commercial.customer.create', 'commercial.quote.convert.own']);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'member.activated', primaryEntityId: m.seller!.member.id },
    });
    assert.deepEqual((event.payloadJson as Record<string, unknown>).endedRoleKeys, data.endedRoleKeys);
    const after = await createCustomer('seller', 'Cliente B4 sin permiso');
    assert.deepEqual([after.status, after.body], DENIED);
  });

  it('regrant goes through GrantAdditionalRole: people.admin alone is refused, a holder of the scope may grant it', async () => {
    const refused = await command('rrhh', 'GrantAdditionalRole', {
      memberId: m.seller!.member.id,
      roleKey: 'commercial.customer.create',
    });
    assert.deepEqual([refused.status, refused.body], DENIED);
    assert.deepEqual(await activeKeys('seller'), ['sales_rep']);

    const granted = await command('admin', 'GrantAdditionalRole', {
      memberId: m.seller!.member.id,
      roleKey: 'commercial.customer.create',
    });
    assert.equal(granted.status, 201, JSON.stringify(granted.body));
    assert.equal((await createCustomer('seller', 'Cliente B4 regrant')).status, 201);
    assert.deepEqual(
      await activeKeys('seller'),
      ['commercial.customer.create', 'sales_rep'],
      'only what was reviewed and granted again; quote conversion stays off',
    );
  });

  it('a primary role that is a permission ends too and returns only through ChangeRole', async () => {
    assert.equal(await listMembers('gestor'), 200);
    const data = await suspendThenActivate('gestor');
    assert.deepEqual(data.endedRoleKeys, ['people.admin']);
    assert.deepEqual(await activeKeys('gestor'), []);
    assert.equal(await listMembers('gestor'), 403);

    const changed = await command('admin', 'ChangeRole', { memberId: m.gestor!.member.id, roleKey: 'people.admin' });
    assert.equal(changed.status, 201, JSON.stringify(changed.body));
    assert.equal(await listMembers('gestor'), 200);
  });
});
