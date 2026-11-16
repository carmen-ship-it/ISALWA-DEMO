import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { ProjectionRunner } from '@isalwa/os-query';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';
import { issueAndAcceptOverHttp, seedSyntheticPriceApprover } from './quote-lifecycle.http-support';

/**
 * NEW-B1-D1: opportunity, quote, quote PDF and order detail answer a same-tenant
 * member who may not read the record exactly as for a missing id (no existence
 * oracle). Owner and team manager still read. Real Nest app, real disposable
 * Postgres, synthetic members.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };
type Raw = { status: number; text: string };

describeHttp('NEW-B1-D1 commercial detail has no existence oracle (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids = { opportunity: '', quote: '', order: '' };

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': `d1-${createId()}`,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string): Promise<Raw> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    return { status: res.status, text: await res.text() };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@d1.invalid`, name, 'D1');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const dataOf = (reply: Reply) => reply.body.data as Record<string, unknown>;

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('D1 Synth S.R.L.', `d1-${createId()}`);
    m.owner = await seedMember('owner', ['sales_rep', 'commercial.customer.create', 'commercial.quote.convert.own']);
    m.peer = await seedMember('peer', ['sales_rep', 'commercial.customer.create']);
    m.admin = await seedMember('admin', ['people.admin']);
    m.jefe = await seedMember('jefe', ['commercial.team.read']);
    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: org.id, memberId: m.owner!.member.id, managerMemberId: m.jefe!.member.id, effectiveAt: new Date('2020-01-01') },
    });

    const party = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente D1',
      contact: { givenName: 'Ana', familyName: 'Prueba' },
      phone: { country: 'BO', number: `7${String(Date.now()).slice(-7)}` },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(party.status, 201, JSON.stringify(party.body));
    const partyId = String(dataOf(party).partyId);
    const opp = await command('owner', 'CreateOpportunity', { partyId, title: 'Oportunidad D1' });
    assert.equal(opp.status, 201, JSON.stringify(opp.body));
    ids.opportunity = String(dataOf(opp).opportunityId);
    const quote = await command('owner', 'CreateQuote', { partyId });
    ids.quote = String(dataOf(quote).quoteId);
    assert.equal((await command('owner', 'AddQuoteLine', { quoteId: ids.quote, description: 'Ladrillo 6H', quantity: 10, unitPriceCentavos: 150 })).status, 201);
    const approver = await seedSyntheticPriceApprover(org.id, `approver-${createId()}@d1.invalid`);
    await issueAndAcceptOverHttp({
      baseUrl,
      ownerHeaders: headers(m.owner!),
      approverHeaders: headers(approver),
      quoteId: ids.quote,
    });
    const order = await command('owner', 'CreateOrder', { quoteId: ids.quote });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    ids.order = String(dataOf(order).orderId);
    await runner.runOnce();
    await runner.runOnce();
  });

  after(async () => {
    await app.close();
  });

  const paths = () => [
    [`/opportunities/${ids.opportunity}`, `/opportunities/${createId()}`],
    [`/quotes/${ids.quote}`, `/quotes/${createId()}`],
    [`/quotes/${ids.quote}/pdf`, `/quotes/${createId()}/pdf`],
    [`/orders/${ids.order}`, `/orders/${createId()}`],
  ];

  it('owner and team manager read every detail', async () => {
    for (const [path] of paths()) {
      assert.equal((await get('owner', path!)).status, 200, `owner ${path}`);
      assert.equal((await get('jefe', path!)).status, 200, `jefe ${path}`);
    }
  });

  it('a peer advisor and people.admin get exactly the missing-id answer', async () => {
    for (const who of ['peer', 'admin']) {
      for (const [existing, missing] of paths()) {
        const a = await get(who, existing!);
        const b = await get(who, missing!);
        assert.deepEqual(a, b, `${who} ${existing}`);
        assert.equal(a.status, 404);
        assert.equal(a.text.includes(ids.quote) || a.text.includes(ids.order) || a.text.includes(ids.opportunity), false);
      }
    }
  });
});
