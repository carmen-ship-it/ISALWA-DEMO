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
 * T03 C8 recheck (finding 16): the steward lookup keeps `master_data.admin` delegable, and a
 * delegated steward reads only while the delegation is in its window, not revoked, names the
 * scope, and the grantor is an active member of the same company who holds the scope by their
 * own current role. Synthetic members and delegations in a disposable database only.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

const HOUR = 3_600_000;

describeHttp('T03 C8 delegated data steward over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let otherOrg: { id: string };
  const m: Record<string, Seeded> = {};

  async function lookup(who: string): Promise<number> {
    const res = await fetch(`${baseUrl}/v1/master-data/parties?q=${encodeURIComponent('C8 sin coincidencias')}`, {
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

  async function seedMember(orgId: string, name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@t03c8.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function delegate(input: {
    from: string;
    to: string;
    scopes?: string[];
    startsAt?: Date;
    expiresAt?: Date;
    revokedAt?: Date | null;
  }): Promise<string> {
    const id = createId();
    await prisma().osDelegation.create({
      data: {
        id,
        organizationId: org.id,
        delegatorMemberId: m[input.from]!.member.id,
        delegateMemberId: m[input.to]!.member.id,
        scopesJson: input.scopes ?? ['master_data.admin'],
        startsAt: input.startsAt ?? new Date(Date.now() - HOUR),
        expiresAt: input.expiresAt ?? new Date(Date.now() + 24 * HOUR),
        revokedAt: input.revokedAt ?? null,
      },
    });
    return id;
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('T03 C8 Org', `t03-c8-${createId()}`);
    otherOrg = await store.seedOrganization('T03 C8 Other Org', `t03-c8-other-${createId()}`);
    m.steward = await seedMember(org.id, 'steward', ['master_data.admin']);
    m.grantee = await seedMember(org.id, 'grantee', []);
    m.nonSteward = await seedMember(org.id, 'nonsteward', ['commercial.customer.edit']);
    m.second = await seedMember(org.id, 'second', []);
    m.foreignSteward = await seedMember(otherOrg.id, 'foreignsteward', ['master_data.admin']);
  });

  after(async () => {
    await app.close();
  });

  it('without any grant the lookup is refused; the steward by role reads', async () => {
    assert.equal(await lookup('steward'), 200);
    assert.equal(await lookup('grantee'), 403);
  });

  it('a current delegation from an active steward confers the lookup; it stops when the grantor loses the role or access', async () => {
    const id = await delegate({ from: 'steward', to: 'grantee' });
    assert.equal(await lookup('grantee'), 200);

    const role = await prisma().osRoleAssignment.findFirstOrThrow({ where: { memberId: m.steward!.member.id, roleKey: 'master_data.admin' } });
    await prisma().osRoleAssignment.update({ where: { id: role.id }, data: { endedAt: new Date(Date.now() - 60_000) } });
    assert.equal(await lookup('grantee'), 403, 'grantor no longer holds the scope');
    await prisma().osRoleAssignment.update({ where: { id: role.id }, data: { endedAt: null } });
    assert.equal(await lookup('grantee'), 200);

    await prisma().osOrganizationMember.update({ where: { id: m.steward!.member.id }, data: { accessStatus: 'suspended' } });
    assert.equal(await lookup('grantee'), 403, 'grantor suspended');
    await prisma().osOrganizationMember.update({ where: { id: m.steward!.member.id }, data: { accessStatus: 'active' } });
    assert.equal(await lookup('grantee'), 200);

    await prisma().osDelegation.update({ where: { id }, data: { revokedAt: new Date() } });
    assert.equal(await lookup('grantee'), 403, 'revoked');
  });

  it('the window, the named scope and the grantor\'s own authority all have to hold', async () => {
    const cases: Array<[string, Parameters<typeof delegate>[0]]> = [
      ['expired', { from: 'steward', to: 'grantee', startsAt: new Date(Date.now() - 48 * HOUR), expiresAt: new Date(Date.now() - HOUR) }],
      ['not started', { from: 'steward', to: 'grantee', startsAt: new Date(Date.now() + HOUR) }],
      ['scope not named', { from: 'steward', to: 'grantee', scopes: ['fiscal.admin'] }],
      ['grantor without the scope', { from: 'nonSteward', to: 'grantee' }],
      ['grantor from another company', { from: 'foreignSteward', to: 'grantee' }],
    ];
    for (const [label, input] of cases) {
      const id = await delegate(input);
      assert.equal(await lookup('grantee'), 403, label);
      await prisma().osDelegation.delete({ where: { id } });
    }
  });

  it('a delegated steward cannot pass the authority on', async () => {
    const first = await delegate({ from: 'steward', to: 'grantee' });
    assert.equal(await lookup('grantee'), 200);
    const second = await delegate({ from: 'grantee', to: 'second' });
    assert.equal(await lookup('second'), 403);
    await prisma().osDelegation.deleteMany({ where: { id: { in: [first, second] } } });
  });
});
