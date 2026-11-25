/**
 * AWS overnight browser seed — synthetic Pedido with nota/salida/entrega + Campana notice.
 * Writes session cookie material only under BROWSER_PROOF_DIR (not for GitHub).
 */
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';

async function main() {
  process.env.OS_OUTBOX_WORKER = '0';
  process.env.OS_PROJECTION_WORKER = '0';
  process.env.OS_ELAPSED_NOTICE_CLOCK = '0';
  const outDir = process.env.BROWSER_PROOF_DIR;
  if (!outDir) throw new Error('BROWSER_PROOF_DIR required');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const store = moduleRef.get(OS_STORE) as OsWorkforceStore;
  const prisma = getOsPrisma()!;

  const org = await store.seedOrganization('Browser Proof Org', `bp-${createId()}`);
  const owner = await store.seedAdminMember(
    org.id,
    `browser-${createId()}@proof.bo`,
    'Asesor',
    'Browser',
  );
  await prisma.osRoleAssignment.deleteMany({
    where: { organizationId: org.id, memberId: owner.member.id, roleKey: 'people.admin' },
  });
  for (const roleKey of ['sales_rep', 'commercial.quote.convert.own'] as const) {
    await prisma.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: owner.member.id,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
      },
    });
  }

  const partyId = createId();
  const quoteId = createId();
  const orderId = createId();
  const noteId = createId();
  const exitId = createId();
  const deliveryId = createId();
  const noticeId = createId();
  const now = new Date();

  await prisma.osParty.create({
    data: {
      id: partyId,
      organizationId: org.id,
      partyKind: 'organization',
      displayName: 'Cliente Browser Proof',
    },
  });
  await prisma.osPartyRoleAssignment.create({
    data: {
      id: createId(),
      organizationId: org.id,
      partyId,
      roleKey: 'customer',
      effectiveAt: new Date('2020-01-01'),
    },
  });
  await prisma.osCommercialAccount.create({
    data: { id: createId(), organizationId: org.id, partyId, ownerMemberId: owner.member.id },
  });
  await prisma.osQuote.create({
    data: {
      id: quoteId,
      organizationId: org.id,
      partyId,
      ownerMemberId: owner.member.id,
      quoteNumber: 'Q-BR-1',
      status: 'accepted',
    },
  });
  await prisma.osOrder.create({
    data: {
      id: orderId,
      organizationId: org.id,
      partyId,
      quoteId,
      ownerMemberId: owner.member.id,
      orderNumber: 'O-BR-1',
      subtotalCentavos: 10000n,
      totalCentavos: 10000n,
    },
  });
  // Commercial Pedido page reads the projection, not only os_orders.
  await prisma.osOrderReadModel.create({
    data: {
      orderId,
      organizationId: org.id,
      partyId,
      quoteId,
      ownerMemberId: owner.member.id,
      orderNumber: 'O-BR-1',
      status: 'open',
      currency: 'BOB',
      subtotalCentavos: 10000n,
      headerDiscountCentavos: 0n,
      totalCentavos: 10000n,
      createdAt: now,
    },
  });
  await prisma.osDeliveryNote.create({
    data: {
      id: noteId,
      organizationId: org.id,
      orderId,
      partyId,
      documentKind: 'nota_de_entrega',
      numberingPolicy: 'provisional_internal',
      internalDocumentRef: `NE-PILOT-${noteId}`,
      status: 'issued',
      recipient: 'Recepcion',
      deliveredBy: 'Chofer',
      createdByMemberId: owner.member.id,
      bornAt: now,
    },
  });
  await prisma.osWarehouseExit.create({
    data: {
      id: exitId,
      organizationId: org.id,
      orderId,
      deliveryNoteId: noteId,
      exitedAt: now,
      recordedByMemberId: owner.member.id,
      source: 'employee_recorded',
    },
  });
  await prisma.osDelivery.create({
    data: {
      id: deliveryId,
      organizationId: org.id,
      orderId,
      deliveryNoteId: noteId,
      deliveredAt: now,
      recordedByMemberId: owner.member.id,
      source: 'employee_recorded',
      deliveredTo: 'Cliente',
    },
  });
  for (const [eventType, primaryEntityId] of [
    ['delivery_note.created', noteId],
    ['warehouse_exit.recorded', exitId],
    ['customer_delivery.recorded', deliveryId],
  ] as const) {
    await prisma.osPartyTimelineEntry.create({
      data: {
        entryId: createId(),
        organizationId: org.id,
        partyId,
        eventType,
        occurredAt: now,
        actorMemberId: owner.member.id,
        correlationId: createId(),
        primaryEntityType: eventType.split('.')[0]!,
        primaryEntityId,
        factsJson: { orderId, partyId, deliveryNoteId: noteId },
      },
    });
  }
  // Notice must point at a real readable open commitment owned by the recipient.
  // List sync resolves orphans and hides commitments the member cannot read.
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
      { partyId, orderId, orderNumber: 'O-BR-1', noticeId, organizationId: org.id },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, orderId, partyId, noticeId }));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
