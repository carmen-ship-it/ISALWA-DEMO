/**
 * Compras purchase-request durable list/create/transition — disposable HTTP.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { PURCHASING_OPERATIONAL_RECORD_SCOPE } from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

describe('purchasing purchase-request HTTP', { skip: !RUN }, () => {
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
    const seeded = await store.seedAdminMember(orgId, `${label}-${createId()}@pr.bo`, label, 'PR');
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

  it('missing session is unauthorized, not a server error', async () => {
    if (!RUN) return;
    const anon = await fetch(`${baseUrl}/v1/purchasing/requests`);
    const text = await anon.text();
    assert.equal(anon.status, 401, text);
    assert.equal(JSON.parse(text).code, 'AUTH_REQUIRED');
  });

  it('buyer creates and advances; stranger denied; row persists in Postgres', async () => {
    if (!RUN) return;
    const prisma = getOsPrisma()!;
    const org = await store.seedOrganization('PR Org', `pr-${createId().slice(-8)}`);
    const orgId = org.id as string;
    const buyer = await seedSeat(orgId, 'buyer', [PURCHASING_OPERATIONAL_RECORD_SCOPE]);
    const stranger = await seedSeat(orgId, 'stranger', []);

    const denied = await fetch(`${baseUrl}/v1/purchasing/requests`, {
      headers: headers(stranger),
    });
    assert.equal(denied.status, 403);

    const created = await fetch(`${baseUrl}/v1/purchasing/requests`, {
      method: 'POST',
      headers: headers(buyer),
      body: JSON.stringify({
        requestingArea: 'Producción',
        description: 'Pigmento verify disposable',
        reason: 'Falta material para pedido',
        quantity: '2',
        unit: 'kg',
      }),
    });
    const createdText = await created.text();
    assert.equal(created.status, 201, createdText);
    const createdBody = JSON.parse(createdText) as {
      liveWrite: string;
      request: { id: string; status: string };
    };
    assert.equal(createdBody.liveWrite, 'PROVEN');
    assert.equal(createdBody.request.status, 'solicitado');
    const requestId = createdBody.request.id;

    const advanced = await fetch(`${baseUrl}/v1/purchasing/requests/${requestId}/transition`, {
      method: 'POST',
      headers: headers(buyer),
      body: JSON.stringify({ status: 'cotizandose' }),
    });
    const advancedText = await advanced.text();
    assert.equal(advanced.status, 201, advancedText);
    const advancedBody = JSON.parse(advancedText) as {
      liveWrite: string;
      request: { status: string };
    };
    assert.equal(advancedBody.liveWrite, 'PROVEN');
    assert.equal(advancedBody.request.status, 'cotizandose');

    const listed = await fetch(`${baseUrl}/v1/purchasing/requests`, {
      headers: headers(buyer),
    });
    assert.equal(listed.status, 200);
    const listBody = (await listed.json()) as {
      liveWrite: string;
      requests: Array<{ id: string; status: string }>;
    };
    assert.equal(listBody.liveWrite, 'PROVEN');
    assert.equal(listBody.requests.some((row) => row.id === requestId && row.status === 'cotizandose'), true);

    const row = await prisma.osPurchaseRequest.findUnique({ where: { id: requestId } });
    assert.ok(row);
    assert.equal(row!.organizationId, orgId);
    assert.equal(row!.status, 'cotizandose');
    const history = await prisma.osPurchaseRequestStatusHistory.count({
      where: { organizationId: orgId, purchaseRequestId: requestId },
    });
    assert.ok(history >= 2);

    const strangerTransition = await fetch(
      `${baseUrl}/v1/purchasing/requests/${requestId}/transition`,
      {
        method: 'POST',
        headers: headers(stranger),
        body: JSON.stringify({ status: 'pedido_preparandose' }),
      },
    );
    assert.equal(strangerTransition.status, 403);
    const afterDeny = await prisma.osPurchaseRequest.findUnique({ where: { id: requestId } });
    assert.equal(afterDeny!.status, 'cotizandose');
  });
});
