/**
 * AllocateFinishedGoods command + warehouse desk facts — disposable HTTP.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import {
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
} from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

describe('warehouse AllocateFinishedGoods HTTP', { skip: !RUN }, () => {
  let baseUrl = '';
  let close: (() => Promise<void>) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  before(async () => {
    if (!RUN) return;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    store = app.get(OS_STORE);
    close = async () => {
      await app.close();
    };
  });

  after(async () => {
    if (close) await close();
  });

  async function seedSeat(orgId: string, label: string, roleKeys: string[]) {
    const seeded = await store.seedAdminMember(orgId, `${label}-${createId()}@wh.bo`, label, 'WH');
    const prisma = getOsPrisma()!;
    await prisma.osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma.osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId: orgId,
          memberId: seeded.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }
    return {
      organizationId: orgId,
      memberId: seeded.member.id,
      personId: seeded.person.id,
      authIdentityId: seeded.auth.id,
    };
  }

  function headers(seat: {
    organizationId: string;
    memberId: string;
    personId: string;
    authIdentityId: string;
  }) {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': seat.organizationId,
      'x-os-member-id': seat.memberId,
      'x-os-person-id': seat.personId,
      'x-os-auth-identity-id': seat.authIdentityId,
      'idempotency-key': createId(),
    };
  }

  it('desk facts deny commercial.team.read; allocate persists for allocate scope', async () => {
    if (!RUN) return;
    const prisma = getOsPrisma()!;
    const org = await store.seedOrganization('WH Org', `wh-${createId().slice(-8)}`);
    const orgId = org.id as string;
    const advisor = await seedSeat(orgId, 'adv', [COMMERCIAL_TEAM_READ_SCOPE]);
    const warehouse = await seedSeat(orgId, 'wh', [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
    ]);

    const deny = await fetch(`${baseUrl}/v1/warehouse/finished-goods-desk`, {
      headers: headers(advisor),
    });
    assert.equal(deny.status, 403);

    const allow = await fetch(`${baseUrl}/v1/warehouse/finished-goods-desk`, {
      headers: headers(warehouse),
    });
    assert.equal(allow.status, 200, await allow.text());

    const productId = createId();
    const orderId = createId();
    const orderLineId = createId();
    const partyId = createId();
    const quoteId = createId();
    const quoteLineId = createId();

    await prisma.osParty.create({
      data: {
        id: partyId,
        organizationId: orgId,
        partyKind: 'organization',
        displayName: 'Cliente WH',
      },
    });
    await prisma.osQuote.create({
      data: {
        id: quoteId,
        organizationId: orgId,
        partyId,
        ownerMemberId: warehouse.memberId,
        quoteNumber: `Q-WH-${createId().slice(-6)}`,
        status: 'accepted',
      },
    });
    await prisma.osQuoteLine.create({
      data: {
        id: quoteLineId,
        organizationId: orgId,
        quoteId,
        lineNumber: 1,
        description: 'Vidrio',
        quantity: 10,
        unitPriceCentavos: 100n,
        lineTotalCentavos: 1000n,
      },
    });
    await prisma.osOrder.create({
      data: {
        id: orderId,
        organizationId: orgId,
        partyId,
        quoteId,
        ownerMemberId: warehouse.memberId,
        orderNumber: `P-WH-${createId().slice(-6)}`,
        subtotalCentavos: 1000n,
        totalCentavos: 1000n,
        status: 'open',
      },
    });
    await prisma.osOrderLine.create({
      data: {
        id: orderLineId,
        organizationId: orgId,
        orderId,
        quoteId,
        quoteLineId,
        lineNumber: 1,
        descriptionSnapshot: 'Vidrio',
        quantity: 10,
        unitPriceCentavosSnapshot: 100n,
        lineTotalCentavos: 1000n,
        provenance: 'quote_conversion_snapshot',
        productRefSnapshot: productId,
        copiedAt: new Date(),
      },
    });

    const opsList = await fetch(`${baseUrl}/v1/delivery-ops/orders`, {
      headers: headers(warehouse),
    });
    assert.equal(opsList.status, 200, await opsList.clone().text());
    const opsBody = (await opsList.json()) as { items: Array<{ orderId: string; orderNumber: string }> };
    assert.equal(opsBody.items.some((row) => row.orderId === orderId), true);

    const commercialList = await fetch(`${baseUrl}/v1/orders`, { headers: headers(warehouse) });
    assert.equal(commercialList.status, 200, await commercialList.clone().text());
    const commercialBody = (await commercialList.json()) as { items: Array<{ orderId: string }> };
    assert.equal(
      commercialBody.items.some((row) => row.orderId === orderId),
      false,
      'warehouse seat must not need the commercial projection to see pedido lines',
    );

    const advisorOps = await fetch(`${baseUrl}/v1/delivery-ops/orders`, {
      headers: headers(advisor),
    });
    assert.equal(advisorOps.status, 403);

    const receive = await fetch(`${baseUrl}/v1/commands/ReceiveFinishedGoods`, {
      method: 'POST',
      headers: headers(warehouse),
      body: JSON.stringify({
        productId,
        quantity: '5',
        contextOrderId: orderId,
        contextOrderLineId: orderLineId,
      }),
    });
    const receiveText = await receive.text();
    assert.ok(receive.status === 200 || receive.status === 201, receiveText);

    const allocate = await fetch(`${baseUrl}/v1/commands/AllocateFinishedGoods`, {
      method: 'POST',
      headers: headers(warehouse),
      body: JSON.stringify({
        productId,
        quantity: '2',
        orderLineId,
      }),
    });
    const allocateText = await allocate.text();
    assert.ok(allocate.status === 200 || allocate.status === 201, allocateText);
    const body = JSON.parse(allocateText) as {
      data?: { allocationId: string; officialStock: boolean };
      allocationId?: string;
    };
    const allocationId = body.data?.allocationId ?? body.allocationId;
    assert.ok(allocationId);
    assert.equal(body.data?.officialStock ?? false, false);

    const desk2 = await fetch(`${baseUrl}/v1/warehouse/finished-goods-desk`, {
      headers: headers(warehouse),
    });
    assert.equal(desk2.status, 200);
    const deskBody = (await desk2.json()) as { allocations: Array<{ id: string }> };
    assert.equal(
      deskBody.allocations.some((row) => row.id === allocationId),
      true,
    );

    const advisorAllocate = await fetch(`${baseUrl}/v1/commands/AllocateFinishedGoods`, {
      method: 'POST',
      headers: headers(advisor),
      body: JSON.stringify({
        productId,
        quantity: '1',
        orderLineId,
      }),
    });
    assert.equal(advisorAllocate.status, 403);
  });
});
