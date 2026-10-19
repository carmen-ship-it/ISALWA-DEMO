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
 * T03 "Apoyo temporal": the customer detail tells the viewer which coverage actions they may
 * grant (the same rule GrantCustomerCoverage enforces) and which actions the active coverage
 * includes. Real Nest app, disposable Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('T03 coverage action choice over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
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
      'idempotency-key': `t03-cov-ui-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function detail(who: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${baseUrl}/v1/parties/${ids.party}`, { headers: headers(m[who]!) });
    assert.equal(res.status, 200, who);
    return (await res.json()) as Record<string, unknown>;
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03covui.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const grant = (who: string, coveredActions: string[]) =>
    command(who, 'GrantCustomerCoverage', { commercialAccountId: ids.account, actingAdvisorMemberId: m.helper!.member.id, coveredActions, endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('T03 Coverage UI Org', `t03-cov-ui-${createId()}`);
    const assigner = ['commercial.account.reassign', 'commercial.assignment.org', 'commercial.org.read'];
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.quote.convert.own']);
    m.helper = await seedMember('helper', ['commercial.quote.convert.own']);
    m.assigner = await seedMember('assigner', assigner);
    m.editor = await seedMember('editor', [...assigner, 'commercial.customer.edit']);
    m.full = await seedMember('full', [...assigner, 'commercial.customer.edit', 'commercial.order.convert']);

    ids.party = createId();
    ids.account = createId();
    await prisma().osParty.create({ data: { id: ids.party, organizationId: org.id, partyKind: 'organization', displayName: 'T03 Cov UI Cliente' } });
    await prisma().osCommercialAccount.create({ data: { id: ids.account, organizationId: org.id, partyId: ids.party, ownerMemberId: m.owner!.member.id } });
  });

  after(async () => {
    await app.close();
  });

  it('offers each viewer exactly the coverage actions they may delegate; the owner gets none', async () => {
    const offered = async (who: string) =>
      (await detail(who)).commercialAuthority as { canManageCoverage: boolean; grantableCoverageActions: string[] };
    assert.deepEqual(await offered('assigner'), { canReassignOwner: true, canManageCoverage: true, canRevokeCoverage: true, grantableCoverageActions: ['commercial.work'] });
    assert.deepEqual((await offered('editor')).grantableCoverageActions, ['commercial.work', 'customer.edit']);
    assert.deepEqual((await offered('full')).grantableCoverageActions, ['commercial.work', 'customer.edit', 'quote.convert']);
    const owner = await offered('owner');
    assert.equal(owner.canManageCoverage, false);
    assert.deepEqual(owner.grantableCoverageActions, []);
  });

  it('the server refuses anything outside the offer and stores nothing', async () => {
    for (const [who, actions] of [
      ['assigner', ['commercial.work', 'customer.edit']],
      ['editor', ['commercial.work', 'quote.convert']],
    ] as const) {
      const reply = await grant(who, [...actions]);
      assert.deepEqual([reply.status, reply.body], [403, { code: 'PERMISSION_DENIED' }], who);
    }
    assert.equal(await prisma().osCustomerCoverageGrant.count({ where: { organizationId: org.id } }), 0);
    assert.equal((await detail('full')).activeCoverage, null);
  });

  it('the active coverage shows the actions it covers to the viewer', async () => {
    const granted = await grant('editor', ['commercial.work', 'customer.edit']);
    assert.equal(granted.status, 201, JSON.stringify(granted.body));
    const active = (await detail('full')).activeCoverage as Record<string, unknown>;
    assert.equal(active.actingAdvisorMemberId, m.helper!.member.id);
    assert.equal(active.primaryOwnerMemberId, m.owner!.member.id);
    assert.deepEqual(active.coveredActions, ['commercial.work', 'customer.edit']);
    assert.deepEqual(((await detail('helper')).activeCoverage as Record<string, unknown>).coveredActions, ['commercial.work', 'customer.edit']);
  });

  it('review 3129709 P6: refuses unbounded windows and lists every active and scheduled grant', async () => {
    const day = 86_400_000;
    const iso = (days: number) => new Date(Date.now() + days * day).toISOString();
    const raw = (body: Record<string, unknown>) =>
      command('editor', 'GrantCustomerCoverage', { commercialAccountId: ids.account, actingAdvisorMemberId: m.helper!.member.id, ...body });
    const before = await prisma().osCustomerCoverageGrant.count({ where: { organizationId: org.id } });
    for (const window of [{}, { endsAt: null }, { endsAt: '2099-01-01T00:00:00.000Z' }, { endsAt: iso(31) }, { startsAt: iso(40), endsAt: iso(45) }]) {
      const reply = await raw(window);
      assert.deepEqual([reply.status, reply.body], [400, { code: 'VALIDATION_FAILED' }], JSON.stringify(window));
    }
    const overlapping = await raw({ startsAt: iso(3), endsAt: iso(10) });
    assert.deepEqual([overlapping.status, overlapping.body], [400, { code: 'VALIDATION_FAILED' }], 'overlaps the active grant');
    assert.equal(await prisma().osCustomerCoverageGrant.count({ where: { organizationId: org.id } }), before);

    const activeRow = await prisma().osCustomerCoverageGrant.findFirstOrThrow({ where: { organizationId: org.id, revokedAt: null } });
    const extension = await raw({ startsAt: activeRow.endsAt!.toISOString(), endsAt: new Date(activeRow.endsAt!.getTime() + 14 * day).toISOString() });
    assert.equal(extension.status, 201, JSON.stringify(extension.body));
    const second = await command('editor', 'GrantCustomerCoverage', {
      commercialAccountId: ids.account,
      actingAdvisorMemberId: m.assigner!.member.id,
      endsAt: iso(5),
    });
    assert.equal(second.status, 201, JSON.stringify(second.body));

    type Grant = { grantId: string; actingAdvisorMemberId: string; status: string; startsAt: string; endsAt: string | null; canRevoke: boolean };
    const grants = (who: string) => detail(who).then((d) => d.coverageGrants as Grant[]);
    const full = await grants('full');
    assert.equal(full.length, 3, 'every grant, not only the first');
    assert.deepEqual(
      full.map((g) => [g.actingAdvisorMemberId, g.status, g.canRevoke]).sort(),
      [
        [m.assigner!.member.id, 'active', true],
        [m.helper!.member.id, 'active', true],
        [m.helper!.member.id, 'scheduled', true],
      ].sort(),
    );
    assert.ok(full.every((g) => g.endsAt !== null));
    assert.ok((await grants('owner')).every((g) => g.canRevoke === false), 'the owner sees the grants but cannot revoke');
  });
});
