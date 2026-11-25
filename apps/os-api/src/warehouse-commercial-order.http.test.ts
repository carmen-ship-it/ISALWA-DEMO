/**
 * Commercial CreateOrder must appear in warehouse pedido context from os_orders.
 * The commercial list is a projection and is not warehouse visibility.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { ProjectionRunner } from '@isalwa/os-query';
import {
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
} from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';
import { issueAndAcceptOverHttp, seedSyntheticPriceApprover } from './quote-lifecycle.http-support';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describe('warehouse sees CreateOrder from os_orders (disposable Postgres)', { skip: !RUN }, () => {
  let app: INestApplication;
  let baseUrl = '';
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  let orderId = '';
  let orderNumber = '';

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': createId(),
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

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@whc.invalid`, name, 'WHC');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId: org.id,
          memberId: seeded.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }
    return seeded;
  }

  const dataOf = (reply: Reply) => reply.body.data as Record<string, unknown>;

  before(async () => {
    if (!RUN) return;
    process.env.OS_OUTBOX_WORKER = '0';
    process.env.OS_PROJECTION_WORKER = '0';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('WHC Synth S.R.L.', `whc-${createId()}`);
    m.owner = await seedMember('owner', [
      'sales_rep',
      'commercial.customer.create',
      'commercial.quote.convert.own',
    ]);
    m.warehouse = await seedMember('warehouse', [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
    ]);

    const party = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente WHC',
      contact: { givenName: 'Ana', familyName: 'Almacen' },
      phone: { country: 'BO', number: `7${String(Date.now()).slice(-7)}` },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(party.status, 201, JSON.stringify(party.body));
    const partyId = String(dataOf(party).partyId);
    const quote = await command('owner', 'CreateQuote', { partyId });
    const quoteId = String(dataOf(quote).quoteId);
    assert.equal(
      (await command('owner', 'AddQuoteLine', {
        quoteId,
        description: 'Lavamanos oval',
        quantity: 4,
        unitPriceCentavos: 150,
      })).status,
      201,
    );
    const approver = await seedSyntheticPriceApprover(org.id, `approver-${createId()}@whc.invalid`);
    await issueAndAcceptOverHttp({
      baseUrl,
      ownerHeaders: headers(m.owner!),
      approverHeaders: headers(approver),
      quoteId,
    });
    const order = await command('owner', 'CreateOrder', { quoteId });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    orderId = String(dataOf(order).orderId);
    const written = await prisma().osOrder.findFirst({
      where: { id: orderId, organizationId: org.id },
    });
    assert.ok(written);
    orderNumber = written.orderNumber;
  });

  after(async () => {
    if (app) await app.close();
  });

  it('warehouse delivery-ops lists the write-table order before any projection', async () => {
    if (!RUN) return;
    const ops = await fetch(`${baseUrl}/v1/delivery-ops/orders`, { headers: headers(m.warehouse!) });
    assert.equal(ops.status, 200, await ops.clone().text());
    const body = (await ops.json()) as { items: Array<{ orderId: string; orderNumber: string }> };
    assert.equal(body.items.some((row) => row.orderId === orderId && row.orderNumber === orderNumber), true);
    const writeRow = await prisma().osOrder.findFirst({ where: { id: orderId, organizationId: org.id } });
    assert.ok(writeRow);

    const commercial = await fetch(`${baseUrl}/v1/orders`, { headers: headers(m.warehouse!) });
    assert.equal(commercial.status, 200, await commercial.clone().text());
    const commercialBody = (await commercial.json()) as { items: Array<{ orderId: string }> };
    assert.equal(commercialBody.items.some((row) => row.orderId === orderId), false);
  });

  it('projection fills the commercial list for the owner without duplicating the write row', async () => {
    if (!RUN) return;
    await runner.runOnce();
    await runner.runOnce();
    const projected = await prisma().osOrderReadModel.findFirst({
      where: { orderId, organizationId: org.id },
    });
    assert.ok(projected);
    assert.equal(projected.organizationId, org.id);
    assert.equal(projected.ownerMemberId, m.owner!.member.id);
    assert.equal(projected.orderNumber, orderNumber);

    const writes = await prisma().osOrder.count({ where: { id: orderId } });
    const reads = await prisma().osOrderReadModel.count({ where: { orderId } });
    assert.equal(writes, 1);
    assert.equal(reads, 1);

    const ownerList = await fetch(`${baseUrl}/v1/orders`, { headers: headers(m.owner!) });
    assert.equal(ownerList.status, 200, await ownerList.clone().text());
    const ownerBody = (await ownerList.json()) as { items: Array<{ orderId: string }> };
    assert.equal(ownerBody.items.some((row) => row.orderId === orderId), true);

    const warehouseOps = await fetch(`${baseUrl}/v1/delivery-ops/orders`, {
      headers: headers(m.warehouse!),
    });
    assert.equal(warehouseOps.status, 200);
    const opsBody = (await warehouseOps.json()) as { items: Array<{ orderId: string }> };
    assert.equal(opsBody.items.filter((row) => row.orderId === orderId).length, 1);
  });
});
