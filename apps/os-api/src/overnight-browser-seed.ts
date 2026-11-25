/**
 * AWS overnight browser seed — CreateOrder path (write table + outbox + projection),
 * then Nota/Salida/Entrega via delivery commands. No manual os_order_read_models insert.
 * Cookie material only under BROWSER_PROOF_DIR (not for GitHub).
 */
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import type { ProjectionRunner } from '@isalwa/os-query';
import {
  DELIVERY_RECORD_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
} from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { issueAndAcceptOverHttp, seedSyntheticPriceApprover } from './quote-lifecycle.http-support';

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

async function main() {
  process.env.OS_OUTBOX_WORKER = '0';
  process.env.OS_PROJECTION_WORKER = '0';
  process.env.OS_ELAPSED_NOTICE_CLOCK = '0';
  const outDir = process.env.BROWSER_PROOF_DIR;
  if (!outDir) throw new Error('BROWSER_PROOF_DIR required');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  await app.init();
  await app.listen(0);
  const baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
  const store = moduleRef.get(OS_STORE) as OsWorkforceStore;
  const runner = moduleRef.get(OS_PROJECTION_RUNNER) as ProjectionRunner;
  const prisma = getOsPrisma()!;

  const org = await store.seedOrganization('Browser Proof Org', `bp-${createId()}`);
  async function seedMember(label: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(
      org.id,
      `${label}-${createId()}@proof.bo`,
      label,
      'Browser',
    );
    await prisma.osRoleAssignment.deleteMany({
      where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma.osRoleAssignment.create({
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

  const owner = await seedMember('Asesor', ['sales_rep', 'commercial.customer.create', 'commercial.quote.convert.own']);
  const delivery = await seedMember('Entrega', [DELIVERY_RECORD_SCOPE, WAREHOUSE_OUTBOUND_RECORD_SCOPE]);

  function headers(who: Seeded, extra: Record<string, string> = {}) {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': createId(),
      ...extra,
    };
  }

  async function command(who: Seeded, name: string, payload: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(who),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    return { status: res.status, text, body };
  }

  const party = await command(owner, 'CreateParty', {
    partyKind: 'organization',
    displayName: 'Cliente Browser Proof',
    contact: { givenName: 'Ana', familyName: 'Browser' },
    phone: { country: 'BO', number: `7${String(Date.now()).slice(-7)}` },
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
  });
  if (party.status !== 201) throw new Error(`CreateParty ${party.text}`);
  const partyId = String(party.body.data.partyId);

  const quote = await command(owner, 'CreateQuote', { partyId });
  if (quote.status !== 201) throw new Error(`CreateQuote ${quote.text}`);
  const quoteId = String(quote.body.data.quoteId);
  const line = await command(owner, 'AddQuoteLine', {
    quoteId,
    description: 'Lavamanos browser',
    quantity: 2,
    unitPriceCentavos: 5000,
  });
  if (line.status !== 201) throw new Error(`AddQuoteLine ${line.text}`);

  const approver = await seedSyntheticPriceApprover(org.id, `approver-${createId()}@proof.bo`);
  await issueAndAcceptOverHttp({
    baseUrl,
    ownerHeaders: headers(owner),
    approverHeaders: {
      ...headers(owner),
      'x-os-member-id': approver.member.id,
      'x-os-person-id': approver.person.id,
      'x-os-auth-identity-id': approver.auth.id,
      'idempotency-key': createId(),
    },
    quoteId,
  });

  const order = await command(owner, 'CreateOrder', { quoteId });
  if (order.status !== 201) throw new Error(`CreateOrder ${order.text}`);
  const orderId = String(order.body.data.orderId);

  // Projection from outbox — never hand-insert os_order_read_models for this order.
  await runner.runOnce();
  await runner.runOnce();
  const projected = await prisma.osOrderReadModel.findFirst({
    where: { orderId, organizationId: org.id },
  });
  if (!projected) throw new Error('CreateOrder projection missing os_order_read_models');

  const orderLine = await prisma.osOrderLine.findFirst({
    where: { orderId, organizationId: org.id },
  });
  if (!orderLine) throw new Error('CreateOrder missing order line');

  const nota = await command(delivery, 'CreateNotaDeEntrega', {
    orderId,
    recipient: 'Recepcion',
    deliveredBy: 'Chofer',
    recordedBy: delivery.member.id,
    source: 'employee_recorded',
    quantities: [{ orderLineId: orderLine.id, quantity: Number(orderLine.quantity) }],
  });
  if (nota.status !== 201) throw new Error(`CreateNotaDeEntrega ${nota.text}`);
  const noteId = String(nota.body.data.deliveryNoteId);

  const salida = await command(delivery, 'RecordWarehouseExit', {
    orderId,
    deliveryNoteId: noteId,
    exitedAt: new Date().toISOString(),
    recordedBy: delivery.member.id,
    source: 'employee_recorded',
    quantities: [{ orderLineId: orderLine.id, quantity: Number(orderLine.quantity) }],
  });
  if (salida.status !== 201) throw new Error(`RecordWarehouseExit ${salida.text}`);

  const entrega = await command(delivery, 'RecordEntrega', {
    orderId,
    deliveredAt: new Date().toISOString(),
    receivedBy: 'Cliente',
    recordedBy: delivery.member.id,
    source: 'employee_recorded',
    quantities: [{ orderLineId: orderLine.id, quantity: Number(orderLine.quantity) }],
    deliveryNoteId: noteId,
  });
  if (entrega.status !== 201) throw new Error(`RecordEntrega ${entrega.text}`);

  const noticeId = createId();
  const commitmentId = createId();
  await prisma.osCommitment.create({
    data: {
      id: commitmentId,
      organizationId: org.id,
      ownerMemberId: owner.member.id,
      partyId,
      text: 'Llamar al cliente — Campana browser proof',
      lifecycle: 'open',
      origin: 'employee_entered',
      createdByMemberId: owner.member.id,
      dueAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  await prisma.osInternalNotification.create({
    data: {
      id: noticeId,
      organizationId: org.id,
      recipientMemberId: owner.member.id,
      kind: 'commitment_due_soon',
      dedupKey: `commitment_due_soon:commitment:${commitmentId}`,
      title: 'Compromiso en 60 minutos',
      body: 'Aviso de prueba Campana',
      sourceRecordType: 'commitment',
      sourceRecordId: commitmentId,
      partyId,
      channel: 'internal',
    },
  });

  const cookie = Buffer.from(
    JSON.stringify({
      organizationId: org.id,
      memberId: owner.member.id,
      personId: owner.person.id,
      authIdentityId: owner.auth.id,
      displayLabel: 'Asesor Browser',
    }),
    'utf8',
  ).toString('base64url');

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    `${outDir}/session.json`,
    JSON.stringify(
      {
        cookieName: 'os_dev_session',
        cookie,
        partyId,
        orderId,
        noticeId,
        noteId,
        quoteId,
        projectionSource: 'CreateOrder+outbox+projection',
        pedidoPath: `/clientes/${partyId}/pedidos/${orderId}`,
        inicioPath: '/inicio',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    `${outDir}/sanitized.json`,
    JSON.stringify(
      {
        partyId,
        orderId,
        quoteId,
        noteId,
        noticeId,
        organizationId: org.id,
        projectionSource: 'CreateOrder+outbox+projection',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      ok: true,
      orderId,
      partyId,
      noticeId,
      noteId,
      projectionSource: 'CreateOrder+outbox+projection',
    }),
  );
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
