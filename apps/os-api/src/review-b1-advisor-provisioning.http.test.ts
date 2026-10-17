import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { ProjectionRunner } from '@isalwa/os-query';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * B1 (23:47 §B.1): an advisor provisioned by the initial plan registers a customer,
 * quotes and converts their own submitted quote; a later advisor is onboarded through
 * the governed commands, not the plan. Real Nest app, real disposable Postgres,
 * synthetic identities only.
 *
 * The plan module may not be imported by an app, so the plan's role rows are written
 * here as it writes them (deterministic `bootstrap:` ids, advisor and manager scopes).
 * The plan itself is proved by the os-database ops integration test.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const ADVISOR_SCOPES = ['commercial.customer.create', 'commercial.quote.convert.own'];
const GERENTE_SCOPES = ['commercial.customer.edit', 'commercial.org.read', 'commercial.work.manage', ...ADVISOR_SCOPES];
const DENIED = [403, { code: 'PERMISSION_DENIED' }];
const DAY = 24 * 3600 * 1000;

describeHttp('B1 advisor provisioning and onboarding over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const phone = () => `7${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 10)}`;

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `b1-${createId()}`,
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

  /** `planKeys` are written with the plan's deterministic ids; `labels` are job titles. */
  async function seedMember(name: string, planKeys: readonly string[], labels: readonly string[] = []): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@b1.invalid`, name, 'B1');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of planKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: `bootstrap:${org.id}:${roleKey}:${seeded.member.id}`, organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    for (const roleKey of labels) {
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

  const dataOf = (reply: Reply) => reply.body.data as Record<string, unknown>;

  /** Registration → quote → line → submit → conversion, all as `who`. */
  async function journey(who: string, customer: string) {
    const party = await command(who, 'CreateParty', {
      partyKind: 'organization',
      displayName: customer,
      contact: { givenName: 'Ana', familyName: 'Prueba' },
      phone: phone(),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(party.status, 201, `register: ${JSON.stringify(party.body)}`);
    const partyId = String(dataOf(party).partyId);
    const quote = await command(who, 'CreateQuote', { partyId });
    assert.equal(quote.status, 201, `quote: ${JSON.stringify(quote.body)}`);
    const quoteId = String(dataOf(quote).quoteId);
    const draftConvert = await command(who, 'CreateOrder', { quoteId });
    assert.notEqual(draftConvert.status, 201, 'a draft quote is not eligible for conversion');
    const line = await command(who, 'AddQuoteLine', { quoteId, description: 'Ladrillo 6H', quantity: 100, unitPriceCentavos: 150 });
    assert.equal(line.status, 201, `line: ${JSON.stringify(line.body)}`);
    const submitted = await command(who, 'SubmitQuote', { quoteId });
    assert.equal(submitted.status, 201, `submit: ${JSON.stringify(submitted.body)}`);
    const order = await command(who, 'CreateOrder', { quoteId });
    assert.equal(order.status, 201, `convert: ${JSON.stringify(order.body)}`);
    const quoteRow = await prisma().osQuote.findUniqueOrThrow({ where: { id: quoteId } });
    assert.equal(quoteRow.ownerMemberId, m[who]!.member.id);
    return { partyId, quoteId };
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
    org = await store.seedOrganization('B1 Synth S.R.L.', `b1-${createId()}`);
    m.rrhh = await store.seedAdminMember(org.id, `rrhh-${createId()}@b1.invalid`, 'rrhh', 'B1');
    m.gerente = await seedMember('gerente', GERENTE_SCOPES);
    m.asesor = await seedMember('asesor', ADVISOR_SCOPES, ['sales_rep']);
    m.other = await seedMember('other', ADVISOR_SCOPES, ['sales_rep']);
  });

  after(async () => {
    await app.close();
  });

  const state = { otherQuote: '' };

  it('plan advisor: registers a customer, quotes and converts their own submitted quote; holds nothing administrative', async () => {
    await journey('asesor', 'Ferretería B1 Uno');
    assert.deepEqual(await activeKeys('asesor'), [...ADVISOR_SCOPES, 'sales_rep'].sort());
    assert.equal(await listMembers('asesor'), 403, 'no people.admin');
    const invite = await command('asesor', 'InviteMember', { email: `x-${createId()}@b1.invalid`, givenName: 'X', familyName: 'Y', roleKey: 'sales_rep' });
    assert.deepEqual([invite.status, invite.body], DENIED);
    state.otherQuote = (await journey('other', 'Ladrillera B1 Dos')).quoteId;
  });

  it('plan advisor cannot convert or read another advisor’s quote (no team or organization range)', async () => {
    const convert = await command('asesor', 'CreateOrder', { quoteId: state.otherQuote });
    assert.ok([403, 404].includes(convert.status), JSON.stringify(convert.body));
    await runner.runOnce();
    await runner.runOnce();
    const own = await fetch(`${baseUrl}/v1/quotes/${state.otherQuote}`, { headers: headers(m.other!) });
    await own.text();
    assert.equal(own.status, 200, 'the route answers for the owner');
    const read = await fetch(`${baseUrl}/v1/quotes/${state.otherQuote}`, { headers: headers(m.asesor!) });
    const body = await read.text();
    assert.notEqual(read.status, 200);
    assert.equal(body.includes(state.otherQuote), false, 'no quote data in the refusal');
  });

  it('ongoing onboarding: RRHH invites with a job title; neither RRHH nor the Gerente alone can grant; RRHH delegates people.admin and the Gerente grants', async () => {
    const invited = await command('rrhh', 'InviteMember', {
      email: `nuevo-${createId()}@b1.invalid`,
      givenName: 'Nuevo',
      familyName: 'Asesor',
      roleKey: 'sales_rep',
    });
    assert.equal(invited.status, 201, JSON.stringify(invited.body));
    const memberId = String(dataOf(invited).memberId);
    const activated = await command('rrhh', 'ActivateMember', { memberId, providerSubject: `subject:${memberId}` });
    assert.equal(activated.status, 201, JSON.stringify(activated.body));
    const member = await prisma().osOrganizationMember.findUniqueOrThrow({ where: { id: memberId } });
    const auth = await prisma().osAuthIdentity.findFirstOrThrow({ where: { personId: member.personId, status: 'active' } });
    m.nuevo = { member: { id: memberId }, person: { id: member.personId }, auth: { id: auth.id } };
    assert.deepEqual(await activeKeys('nuevo'), ['sales_rep']);
    const before = await command('nuevo', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Sin permiso B1',
      contact: { givenName: 'Ana', familyName: 'Prueba' },
      phone: phone(),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.deepEqual([before.status, before.body], DENIED);

    for (const roleKey of ADVISOR_SCOPES) {
      const byRrhh = await command('rrhh', 'GrantAdditionalRole', { memberId, roleKey });
      assert.deepEqual([byRrhh.status, byRrhh.body], DENIED, `people.admin without ${roleKey}`);
      const byGerente = await command('gerente', 'GrantAdditionalRole', { memberId, roleKey });
      assert.deepEqual([byGerente.status, byGerente.body], DENIED, `${roleKey} without people.admin`);
    }
    assert.deepEqual(await activeKeys('nuevo'), ['sales_rep']);

    const delegation = await command('rrhh', 'GrantDelegation', {
      delegateMemberId: m.gerente!.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date(Date.now() + DAY).toISOString(),
    });
    assert.equal(delegation.status, 201, JSON.stringify(delegation.body));
    for (const roleKey of ADVISOR_SCOPES) {
      const granted = await command('gerente', 'GrantAdditionalRole', { memberId, roleKey });
      assert.equal(granted.status, 201, `${roleKey}: ${JSON.stringify(granted.body)}`);
    }
    const revoked = await command('rrhh', 'RevokeDelegation', { delegationId: String(dataOf(delegation).delegationId) });
    assert.equal(revoked.status, 201, JSON.stringify(revoked.body));
    const afterRevoke = await command('gerente', 'GrantAdditionalRole', { memberId: m.other!.member.id, roleKey: 'commercial.customer.create' });
    assert.deepEqual([afterRevoke.status, afterRevoke.body], DENIED, 'the onboarding window closes with the delegation');

    assert.deepEqual(await activeKeys('nuevo'), [...ADVISOR_SCOPES, 'sales_rep'].sort());
    assert.equal(await listMembers('nuevo'), 403, 'the new advisor holds no people.admin');
    const ids = await journey('nuevo', 'Constructora B1 Tres');
    const order = await prisma().osBusinessEvent.findFirst({
      where: { organizationId: org.id, actorMemberId: memberId, eventType: { contains: 'order' } },
    });
    assert.ok(order, `conversion recorded for quote ${ids.quoteId}`);
  });
});
