/**
 * A1 physical dispatch — two real disposable-Postgres connections through the
 * Nest delivery command path (transaction + order lock). Competing linked /
 * unlinked Salida, cumulative quantity, durable rows, retry and rollback.
 *
 * Complements packages/os-delivery fake-client concurrency tests (retained).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { DELIVERY_RECORD_SCOPE, WAREHOUSE_OUTBOUND_RECORD_SCOPE } from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describe('A1 dispatch concurrency (two disposable Postgres connections)', { skip: !RUN }, () => {
  let app: INestApplication;
  let baseUrl = '';
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let orgId = '';
  let ops: Seeded;
  let orderId = '';
  let noteId = '';
  let orderLineId = '';
  const LINE_QTY = 10;

  function headers(who: Seeded): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': createId(),
    };
  }

  async function post(path: string, body: unknown) {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method: 'POST',
      headers: headers(ops),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  }

  before(async () => {
    if (!RUN) return;
    process.env.OS_OUTBOX_WORKER = '0';
    process.env.OS_PROJECTION_WORKER = '0';
    process.env.OS_ELAPSED_NOTICE_CLOCK = '0';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    const org = await store.seedOrganization('A1 Concurrency Org', `a1c-${createId()}`);
    orgId = org.id;
    ops = await store.seedAdminMember(orgId, `ops-${createId()}@a1.bo`, 'Ops', 'A1');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: ops.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of [DELIVERY_RECORD_SCOPE, WAREHOUSE_OUTBOUND_RECORD_SCOPE, 'sales_rep']) {
      await prisma().osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId: orgId,
          memberId: ops.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }

    const partyId = createId();
    const quoteId = createId();
    orderId = createId();
    orderLineId = createId();
    noteId = createId();
    await prisma().osParty.create({
      data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: 'Cliente A1' },
    });
    await prisma().osQuote.create({
      data: {
        id: quoteId,
        organizationId: orgId,
        partyId,
        ownerMemberId: ops.member.id,
        quoteNumber: 'Q-A1C',
        status: 'accepted',
      },
    });
    await prisma().osOrder.create({
      data: {
        id: orderId,
        organizationId: orgId,
        partyId,
        quoteId,
        ownerMemberId: ops.member.id,
        orderNumber: 'O-A1C',
        subtotalCentavos: 10000n,
        totalCentavos: 10000n,
      },
    });
    await prisma().osOrderLine.create({
      data: {
        id: orderLineId,
        organizationId: orgId,
        orderId,
        lineNumber: 1,
        description: 'Pieza A1',
        quantity: LINE_QTY,
        unitPriceCentavosSnapshot: 1000n,
        lineTotalCentavosSnapshot: 10000n,
        productRefSnapshot: 'SKU-A1',
      },
    });
    await prisma().osDeliveryNote.create({
      data: {
        id: noteId,
        organizationId: orgId,
        orderId,
        partyId,
        documentKind: 'nota_de_entrega',
        numberingPolicy: 'provisional_internal',
        internalDocumentRef: `NE-A1-${noteId.slice(-6)}`,
        status: 'issued',
        recipient: 'Recepción',
        deliveredBy: 'Chofer',
        createdByMemberId: ops.member.id,
        bornAt: new Date('2026-11-25T12:00:00Z'),
      },
    });
    await prisma().osDeliveryNoteLine.create({
      data: {
        id: createId(),
        organizationId: orgId,
        deliveryNoteId: noteId,
        orderLineId,
        description: 'Pieza A1',
        quantity: LINE_QTY,
        productRef: 'SKU-A1',
      },
    });
  });

  after(async () => {
    if (app) await app.close();
  });

  it('lets exactly one of two concurrent unlinked Salida attempts through the real lock', async () => {
    const payload = {
      orderId,
      exitedAt: '2026-11-25T13:00:00.000Z',
      recordedBy: ops.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: LINE_QTY }],
    };
    const [a, b] = await Promise.all([
      post('/commands/RecordWarehouseExit', payload),
      post('/commands/RecordWarehouseExit', { ...payload, exitedAt: '2026-11-25T13:01:00.000Z' }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.ok(statuses.includes(201) || statuses.includes(200), JSON.stringify([a, b]));
    const ok = [a, b].filter((r) => r.status === 200 || r.status === 201);
    const denied = [a, b].filter((r) => r.status >= 400);
    assert.equal(ok.length, 1, JSON.stringify([a, b]));
    assert.equal(denied.length, 1, JSON.stringify([a, b]));
    const exits = await prisma().osWarehouseExit.count({ where: { organizationId: orgId, orderId } });
    assert.equal(exits, 1);
  });

  it('linked Salida does not consume extra cumulative qty; unlinked retry past cap rolls back', async () => {
    // Fresh order for linked path
    const partyId = createId();
    const order2 = createId();
    const line2 = createId();
    const note2 = createId();
    await prisma().osParty.create({
      data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: 'Cliente A1b' },
    });
    await prisma().osOrder.create({
      data: {
        id: order2,
        organizationId: orgId,
        partyId,
        ownerMemberId: ops.member.id,
        orderNumber: 'O-A1B',
        subtotalCentavos: 5000n,
        totalCentavos: 5000n,
      },
    });
    await prisma().osOrderLine.create({
      data: {
        id: line2,
        organizationId: orgId,
        orderId: order2,
        lineNumber: 1,
        description: 'Pieza',
        quantity: 5,
        unitPriceCentavosSnapshot: 1000n,
        lineTotalCentavosSnapshot: 5000n,
        productRefSnapshot: 'SKU-B',
      },
    });
    const noteRes = await post('/commands/CreateNotaDeEntrega', {
      orderId: order2,
      recipient: 'Recepción',
      deliveredBy: 'Chofer',
      bornAt: '2026-11-25T14:00:00.000Z',
      recordedBy: ops.member.id,
      quantities: [{ orderLineId: line2, quantity: 5 }],
    });
    let linkedNoteId = noteRes.body?.data?.deliveryNoteId ?? noteRes.body?.deliveryNoteId ?? null;
    if (!(noteRes.status === 200 || noteRes.status === 201) || !linkedNoteId) {
      linkedNoteId = note2;
      await prisma().osDeliveryNote.create({
        data: {
          id: note2,
          organizationId: orgId,
          orderId: order2,
          partyId,
          documentKind: 'nota_de_entrega',
          numberingPolicy: 'provisional_internal',
          internalDocumentRef: `NE-B-${note2.slice(-6)}`,
          status: 'issued',
          recipient: 'Recepción',
          deliveredBy: 'Chofer',
          createdByMemberId: ops.member.id,
          bornAt: new Date('2026-11-25T14:00:00Z'),
        },
      });
      await prisma().osDeliveryNoteLine.create({
        data: {
          id: createId(),
          organizationId: orgId,
          deliveryNoteId: note2,
          orderLineId: line2,
          description: 'Pieza',
          quantity: 5,
          productRef: 'SKU-B',
        },
      });
    }

    const linked = await post('/commands/RecordWarehouseExit', {
      orderId: order2,
      deliveryNoteId: linkedNoteId,
      exitedAt: '2026-11-25T15:00:00.000Z',
      recordedBy: ops.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId: line2, quantity: 5 }],
    });
    assert.ok(linked.status === 200 || linked.status === 201, linked.text);

    const over = await post('/commands/RecordWarehouseExit', {
      orderId: order2,
      exitedAt: '2026-11-25T15:30:00.000Z',
      recordedBy: ops.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId: line2, quantity: 1 }],
    });
    assert.ok(over.status >= 400, over.text);
    const exits = await prisma().osWarehouseExit.count({ where: { organizationId: orgId, orderId: order2 } });
    assert.equal(exits, 1, 'failed unlinked attempt must not leave a durable exit');
  });
});
