/**
 * CT3-E owner-demo seed — SYNTH org ONLY.
 *
 * Creates DEMO-prefixed clients + commercial/ops loop for Story Mode CTAs.
 * Never mutates REAL tenant or REAL seven names.
 *
 * Required:
 *   OS_DATABASE_URL (or ~/.isalwa-secrets/isalwa-os-staging.external-database-url)
 *   STAGING_FIXTURE_CONFIRM=1
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/owner-demo/seed.ts
 *
 * Receipt (no secrets): ~/.isalwa-secrets/isalwa-os-owner-demo-seed.json
 * Also copies a non-secret id map to packages/os-database/fixtures/owner-demo/last-seed-ids.json when writable.
 */
import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  CUSTOMER_DELIVERY_NOTE_KIND,
  DELIVERY_NOTE_NUMBERING_POLICY,
  DELIVERY_SOURCE,
} from '@isalwa/os-contracts';
import { PartyCommandService, LocationCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { WorkCommandService } from '@isalwa/os-work';
import { getOsPrisma } from '../client';
import { PrismaOsPartyStore } from '../prisma-party-store';
import { PrismaOsCommercialStore } from '../prisma-commercial-store';
import { PrismaOsWorkStore } from '../prisma-work-store';
import {
  STAGING_DATABASE_NAME,
  STAGING_DATABASE_HOST_MARKER,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from '../staging-wave2-role-fixtures-guards';
import {
  OWNER_DEMO_CLIENTS,
  OWNER_DEMO_CONVERSATIONS,
  ownerDemoCatalogMeta,
  type OwnerDemoClientKey,
} from './catalog';
import {
  OWNER_DEMO_QUOTE_NUMBER_PROYECTOS,
  OWNER_DEMO_REAL_ORG,
  OWNER_DEMO_SYNTH_ORG,
  assertNotProtectedRealSevenName,
  assertOwnerDemoConfirm,
  assertOwnerDemoNotRealOrg,
  assertOwnerDemoSynthOrg,
  realSevenMutationProof,
  withOwnerDemoNotesTag,
} from './guards';

const HERE = dirname(__filename);

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function ctx(
  orgId: string,
  memberId: string,
  personId: string,
  authId: string,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date(),
  };
}

type SeedActor = {
  memberId: string;
  personId: string;
  authIdentityId: string;
  email: string;
};

type ClientIds = {
  key: OwnerDemoClientKey;
  partyId: string;
  contactId: string | null;
  locationId: string | null;
  opportunityId: string | null;
  quoteId: string | null;
  quoteNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  deliveryNoteId: string | null;
  warehouseExitId: string | null;
  deliveryId: string | null;
  finishedGoodsReceiptId: string | null;
  followUpWorkId: string | null;
  orderPrepWorkId: string | null;
  commitmentId: string | null;
  conversation: (typeof OWNER_DEMO_CONVERSATIONS)[number] | null;
};

async function resolveMemberByEmail(
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  orgId: string,
  email: string,
): Promise<SeedActor | null> {
  const auth = await prisma.osAuthIdentity.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, status: 'active' },
  });
  if (!auth) return null;
  const member = await prisma.osOrganizationMember.findFirst({
    where: { organizationId: orgId, personId: auth.personId, accessStatus: 'active' },
  });
  if (!member) return null;
  return {
    memberId: member.id,
    personId: auth.personId,
    authIdentityId: auth.id,
    email,
  };
}

async function resolveSeedActors(
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  orgId: string,
): Promise<{ partyActor: SeedActor; commercialActor: SeedActor }> {
  const partyActor =
    (await resolveMemberByEmail(prisma, orgId, 'w2.fixture-seed@isalwa.demo')) ??
    (await resolveMemberByEmail(prisma, orgId, 'w2.owner@isalwa.demo'));
  if (!partyActor) throw new Error('OWNER_DEMO_PARTY_ACTOR_NOT_FOUND');

  const commercialActor =
    (await resolveMemberByEmail(prisma, orgId, 'w2.asesor@isalwa.demo')) ?? partyActor;

  return { partyActor, commercialActor };
}

async function ensureParty(
  partySvc: PartyCommandService,
  locationSvc: LocationCommandService,
  session: RequestContext,
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  spec: (typeof OWNER_DEMO_CLIENTS)[number],
): Promise<{ partyId: string; contactId: string | null; locationId: string | null; created: boolean }> {
  assertNotProtectedRealSevenName(spec.displayName);
  assertNotProtectedRealSevenName(spec.legalName);

  const existing = await prisma.osParty.findFirst({
    where: {
      organizationId: session.organizationId,
      OR: [{ displayName: spec.displayName }, { legalName: spec.legalName }],
    },
  });
  if (existing) {
    const contact = await prisma.osContact.findFirst({
      where: { organizationId: session.organizationId, organizationPartyId: existing.id },
      orderBy: { createdAt: 'asc' },
    });
    const location = await prisma.osLocation.findFirst({
      where: { organizationId: session.organizationId, partyId: existing.id, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      partyId: existing.id,
      contactId: contact?.id ?? null,
      locationId: location?.id ?? null,
      created: false,
    };
  }

  const created = await partySvc.execute('CreateParty', session, {
    displayName: spec.displayName,
    partyKind: 'organization',
    legalName: spec.legalName,
    fiscalIdentity: {
      nit: `DEMO-${spec.key.slice(0, 8).toUpperCase()}`,
      razonSocial: spec.legalName,
    },
    initialRoleKey: 'customer',
    createCommercialAccount: true,
  });
  const partyId = String(created.data.partyId);

  const contactRes = await partySvc.execute('UpdateContact', session, {
    organizationPartyId: partyId,
    givenName: spec.contact.givenName,
    familyName: spec.contact.familyName,
    phone: spec.contact.phone,
    title: spec.contact.title,
  });
  const contactId = contactRes.data.contactId ? String(contactRes.data.contactId) : null;

  const locRes = await locationSvc.execute('CreateLocation', session, {
    partyId,
    label: spec.location.label,
    addressText: spec.location.addressText,
    latitude: spec.location.latitude,
    longitude: spec.location.longitude,
  });
  const locationId = String(locRes.data.locationId);

  return { partyId, contactId, locationId, created: true };
}

async function ensureQuoteLoop(
  commercialSvc: CommercialCommandService,
  session: RequestContext,
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  input: {
    partyId: string;
    title: string;
    notes: string;
    lineDescription: string;
    quantity: number;
    unitPriceCentavos: number;
    quoteNumber?: string;
    convertToOrder: boolean;
    recordManualSend: boolean;
  },
): Promise<{
  opportunityId: string;
  quoteId: string;
  quoteNumber: string;
  orderId: string | null;
  orderNumber: string | null;
}> {
  let opportunity = await prisma.osOpportunity.findFirst({
    where: { organizationId: session.organizationId, partyId: input.partyId, title: input.title },
  });
  let opportunityId = opportunity?.id;
  if (!opportunityId) {
    const opp = await commercialSvc.execute('CreateOpportunity', session, {
      partyId: input.partyId,
      title: input.title,
      stage: 'propuesta',
      expectedValueCentavos: input.unitPriceCentavos * input.quantity,
    });
    opportunityId = String(opp.data.opportunityId);
  }

  let quote = await prisma.osQuote.findFirst({
    where: { organizationId: session.organizationId, partyId: input.partyId, opportunityId },
    orderBy: { createdAt: 'asc' },
  });
  let quoteId = quote?.id;
  if (!quoteId) {
    const q = await commercialSvc.execute('CreateQuote', session, {
      partyId: input.partyId,
      opportunityId,
      currency: 'BOB',
      notes: withOwnerDemoNotesTag(input.notes),
    });
    quoteId = String(q.data.quoteId);
    await commercialSvc.execute('AddQuoteLine', session, {
      quoteId,
      description: input.lineDescription,
      quantity: input.quantity,
      unitLabel: 'pza',
      unitPriceCentavos: input.unitPriceCentavos,
    });
    await commercialSvc.execute('SubmitQuote', session, { quoteId });
    if (input.recordManualSend) {
      await commercialSvc.execute('RecordQuoteManualSend', session, {
        quoteId,
        channel: 'whatsapp',
        note: withOwnerDemoNotesTag('Envío manual demo'),
      });
    }
  }

  if (input.quoteNumber) {
    await prisma.osQuote.update({
      where: { id: quoteId },
      data: { quoteNumber: input.quoteNumber, version: { increment: 1 } },
    });
    const rm = await prisma.osQuoteReadModel.findFirst({
      where: { organizationId: session.organizationId, quoteId },
    });
    if (rm) {
      await prisma.osQuoteReadModel.update({
        where: { quoteId: rm.quoteId },
        data: { quoteNumber: input.quoteNumber },
      });
    }
  }

  const quoteRow = await prisma.osQuote.findUniqueOrThrow({ where: { id: quoteId } });
  let orderId: string | null = null;
  let orderNumber: string | null = null;

  if (input.convertToOrder) {
    const existingOrder = await prisma.osOrder.findFirst({
      where: { organizationId: session.organizationId, quoteId },
    });
    if (existingOrder) {
      orderId = existingOrder.id;
      orderNumber = existingOrder.orderNumber;
    } else if (quoteRow.status === 'submitted') {
      const order = await commercialSvc.execute('CreateOrder', session, { quoteId });
      orderId = String(order.data.orderId);
      const orderRow = await prisma.osOrder.findUniqueOrThrow({ where: { id: orderId } });
      orderNumber = orderRow.orderNumber;
    } else if (quoteRow.status === 'accepted') {
      const existing = await prisma.osOrder.findFirst({
        where: { organizationId: session.organizationId, quoteId },
      });
      orderId = existing?.id ?? null;
      orderNumber = existing?.orderNumber ?? null;
    }
  }

  return {
    opportunityId,
    quoteId,
    quoteNumber: quoteRow.quoteNumber,
    orderId,
    orderNumber,
  };
}

async function ensureFollowUpAndPrep(
  workSvc: WorkCommandService,
  session: RequestContext,
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  partyId: string,
  orderId: string,
  orderNumber: string,
): Promise<{ followUpWorkId: string; orderPrepWorkId: string }> {
  const followTitle = withOwnerDemoNotesTag('Seguimiento cotización DEMO MADERAS');
  let follow = await prisma.osWorkItem.findFirst({
    where: {
      organizationId: session.organizationId,
      title: { contains: 'Seguimiento cotización DEMO MADERAS' },
    },
  });
  if (!follow) {
    const created = await workSvc.execute('CreateWorkItem', session, {
      title: followTitle,
      description: withOwnerDemoNotesTag('Llamar para confirmar aceptación'),
      ownerMemberId: session.actorMemberId,
      subjectType: 'party',
      subjectId: partyId,
      priority: 'normal',
    });
    follow = await prisma.osWorkItem.findUniqueOrThrow({
      where: { id: String(created.data.workItemId) },
    });
  }

  const prepMarker = `[[order-prep:production:${orderId}]]`;
  let prep = await prisma.osWorkItem.findFirst({
    where: {
      organizationId: session.organizationId,
      description: { contains: prepMarker },
    },
  });
  if (!prep) {
    const created = await workSvc.execute('CreateWorkItem', session, {
      title: `Revisión de producción · ${orderNumber}`,
      description: `Revise si este pedido requiere acción de producción.\n\nContexto: Pedido ${orderNumber} (${orderId})\n${prepMarker}\n${withOwnerDemoNotesTag('')}`,
      ownerMemberId: session.actorMemberId,
      subjectType: 'party',
      subjectId: partyId,
      priority: 'normal',
    });
    prep = await prisma.osWorkItem.findUniqueOrThrow({
      where: { id: String(created.data.workItemId) },
    });
  }

  return { followUpWorkId: follow.id, orderPrepWorkId: prep.id };
}

async function ensureCommitment(
  session: RequestContext,
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  partyId: string,
): Promise<string> {
  const text = withOwnerDemoNotesTag('Confirmar recepción de pedido DEMO MADERAS');
  let row = await prisma.osCommitment.findFirst({
    where: {
      organizationId: session.organizationId,
      partyId,
      text: { contains: 'Confirmar recepción de pedido DEMO MADERAS' },
    },
  });
  if (!row) {
    const id = createId();
    const now = new Date();
    row = await prisma.osCommitment.create({
      data: {
        id,
        organizationId: session.organizationId,
        partyId,
        ownerMemberId: session.actorMemberId,
        text,
        origin: 'employee',
        lifecycle: 'fulfilled',
        createdByMemberId: session.actorMemberId,
        createdAt: now,
        fulfilledAt: now,
        fulfilledByMemberId: session.actorMemberId,
      },
    });
    return row.id;
  }
  if (row.lifecycle !== 'fulfilled') {
    await prisma.osCommitment.update({
      where: { id: row.id },
      data: {
        lifecycle: 'fulfilled',
        fulfilledAt: new Date(),
        fulfilledByMemberId: session.actorMemberId,
      },
    });
  }
  return row.id;
}

/** Fixture-tooling persistence for delivery/FG — command-equivalent rows, SYNTH only. */
async function ensureOpsLoop(
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  session: RequestContext,
  input: {
    partyId: string;
    orderId: string;
    includeSalidaEntrega: boolean;
    productId: string;
  },
): Promise<{
  deliveryNoteId: string;
  warehouseExitId: string | null;
  deliveryId: string | null;
  finishedGoodsReceiptId: string;
}> {
  assertOwnerDemoSynthOrg(session.organizationId);

  const orderLines = await prisma.osOrderLine.findMany({
    where: { organizationId: session.organizationId, orderId: input.orderId },
  });

  let fg = await prisma.osFinishedGoodsReceipt.findFirst({
    where: {
      organizationId: session.organizationId,
      contextOrderId: input.orderId,
      idempotencyKey: `owner-demo-fg:${input.orderId}`,
    },
  });
  if (!fg) {
    fg = await prisma.osFinishedGoodsReceipt.create({
      data: {
        id: createId(),
        organizationId: session.organizationId,
        productId: input.productId,
        quantity: String(orderLines[0]?.quantity ?? 10),
        warehouseLabel: 'Almacén de Productos Terminados',
        receivedAt: new Date(),
        recordedAt: new Date(),
          actorMemberId: session.actorMemberId,
        actorLabel: 'Owner demo seed',
        source: 'explicit_command',
        contextOrderId: input.orderId,
        contextOrderLineId: orderLines[0]?.id ?? null,
        contextPartyId: input.partyId,
        note: withOwnerDemoNotesTag('FG receipt'),
        idempotencyKey: `owner-demo-fg:${input.orderId}`,
      },
    });
  }

  let note = await prisma.osDeliveryNote.findFirst({
    where: {
      organizationId: session.organizationId,
      orderId: input.orderId,
      internalDocumentRef: { startsWith: 'NE-DEMO-' },
    },
  });
  if (!note) {
    const noteId = createId();
    note = await prisma.osDeliveryNote.create({
      data: {
        id: noteId,
        organizationId: session.organizationId,
        orderId: input.orderId,
        partyId: input.partyId,
        documentKind: CUSTOMER_DELIVERY_NOTE_KIND,
        numberingPolicy: DELIVERY_NOTE_NUMBERING_POLICY,
        internalDocumentRef: `NE-DEMO-${noteId.slice(0, 8)}`,
        displayDocumentNumber: 'NE-DEMO-MADERAS',
        status: 'issued',
        recipient: 'Elena Rocha',
        deliveredBy: session.actorMemberId,
        receivedBy: null,
        observations: withOwnerDemoNotesTag('Nota de entrega demo'),
        createdByMemberId: session.actorMemberId,
        bornAt: new Date(),
      },
    });
    for (const line of orderLines) {
      await prisma.osDeliveryNoteLine.create({
        data: {
          id: createId(),
          organizationId: session.organizationId,
          deliveryNoteId: note.id,
          orderLineId: line.id,
          productRef: line.productRefSnapshot,
          description: line.descriptionSnapshot,
          quantity: line.quantity,
          unitLabel: line.unitLabel,
        },
      });
    }
  }

  let warehouseExitId: string | null = null;
  let deliveryId: string | null = null;

  if (input.includeSalidaEntrega) {
    let exit = await prisma.osWarehouseExit.findFirst({
      where: { organizationId: session.organizationId, orderId: input.orderId },
    });
    if (!exit) {
      const exitId = createId();
      exit = await prisma.osWarehouseExit.create({
        data: {
          id: exitId,
          organizationId: session.organizationId,
          orderId: input.orderId,
          deliveryNoteId: note.id,
          exitedAt: new Date(),
          recordedByMemberId: session.actorMemberId,
          source: DELIVERY_SOURCE,
          notes: withOwnerDemoNotesTag('Salida demo'),
        },
      });
      await prisma.osWarehouseOutboundNote.create({
        data: {
          id: createId(),
          organizationId: session.organizationId,
          warehouseExitId: exit.id,
          orderId: input.orderId,
          documentKind: 'warehouse_outbound',
          numberingPolicy: 'external_or_none',
          exitedAt: exit.exitedAt,
          bornAt: new Date(),
        },
      });
    }
    warehouseExitId = exit.id;

    let delivery = await prisma.osDelivery.findFirst({
      where: { organizationId: session.organizationId, orderId: input.orderId },
    });
    if (!delivery) {
      delivery = await prisma.osDelivery.create({
        data: {
          id: createId(),
          organizationId: session.organizationId,
          orderId: input.orderId,
          deliveryNoteId: note.id,
          deliveredAt: new Date(),
          deliveredTo: 'Elena Rocha',
          recordedByMemberId: session.actorMemberId,
          source: DELIVERY_SOURCE,
          notes: withOwnerDemoNotesTag('Entrega demo'),
        },
      });
      await prisma.osDeliveryNote.update({
        where: { id: note.id },
        data: { deliveryId: delivery.id, receivedBy: 'Elena Rocha', deliveredAt: delivery.deliveredAt },
      });
    }
    deliveryId = delivery.id;
  }

  return {
    deliveryNoteId: note.id,
    warehouseExitId,
    deliveryId,
    finishedGoodsReceiptId: fg.id,
  };
}

async function main(): Promise<void> {
  assertOwnerDemoConfirm(process.env.STAGING_FIXTURE_CONFIRM);
  if (!process.env.OS_DATABASE_URL?.trim()) {
    const secretPath = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging.external-database-url');
    if (!existsSync(secretPath)) throw new Error('OS_DATABASE_URL missing and secret file absent');
    process.env.OS_DATABASE_URL = readFileSync(secretPath, 'utf8').trim();
  }
  requireEnvFrom(process.env, 'OS_DATABASE_URL');

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assertStagingDatabaseName(dbRows[0]?.name ?? '');
  const url = process.env.OS_DATABASE_URL ?? '';
  if (!url.includes(STAGING_DATABASE_HOST_MARKER) && process.env.OWNER_DEMO_ALLOW_NON_STAGING_HOST !== '1') {
    throw new Error(`OWNER_DEMO_REFUSING_NON_STAGING_HOST`);
  }
  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migRows[0]?.count ?? -1));

  assertOwnerDemoSynthOrg(OWNER_DEMO_SYNTH_ORG);
  // Session/target org is SYNTH only — never pass REAL_ORG into write paths.

  const org = await prisma.osOrganization.findUnique({ where: { id: OWNER_DEMO_SYNTH_ORG } });
  if (!org) throw new Error('OWNER_DEMO_SYNTH_ORG_MISSING');

  // Pre-flight: refuse if any REAL seven name already matches a create target (should never).
  for (const client of OWNER_DEMO_CLIENTS) {
    assertNotProtectedRealSevenName(client.displayName);
  }

  const realSevenInSynth = await prisma.osParty.findMany({
    where: {
      organizationId: OWNER_DEMO_REAL_ORG,
      displayName: { in: [...OWNER_DEMO_CLIENTS.map((c) => c.displayName)] },
    },
    select: { id: true },
  });
  if (realSevenInSynth.length > 0) {
    throw new Error('OWNER_DEMO_UNEXPECTED_DEMO_NAME_ON_REAL_ORG');
  }

  const { partyActor, commercialActor } = await resolveSeedActors(prisma, OWNER_DEMO_SYNTH_ORG);
  log(`OWNER_DEMO_PARTY_ACTOR email=${partyActor.email} memberId=${partyActor.memberId}`);
  log(
    `OWNER_DEMO_COMMERCIAL_ACTOR email=${commercialActor.email} memberId=${commercialActor.memberId}`,
  );
  const partySession = ctx(
    OWNER_DEMO_SYNTH_ORG,
    partyActor.memberId,
    partyActor.personId,
    partyActor.authIdentityId,
  );
  const session = ctx(
    OWNER_DEMO_SYNTH_ORG,
    commercialActor.memberId,
    commercialActor.personId,
    commercialActor.authIdentityId,
  );

  const partyStore = new PrismaOsPartyStore(prisma);
  const commercialStore = new PrismaOsCommercialStore(prisma);
  const workStore = new PrismaOsWorkStore(prisma);
  const partySvc = new PartyCommandService(partyStore);
  const locationSvc = new LocationCommandService(partyStore);
  const commercialSvc = new CommercialCommandService(commercialStore);
  const workSvc = new WorkCommandService(workStore);

  const clients: ClientIds[] = [];

  for (const spec of OWNER_DEMO_CLIENTS) {
    const party = await ensureParty(partySvc, locationSvc, partySession, prisma, spec);
    log(`PARTY ${party.created ? 'CREATED' : 'REUSED'} key=${spec.key} partyId=${party.partyId}`);

    const conversation = OWNER_DEMO_CONVERSATIONS.find((c) => c.clientKey === spec.key) ?? null;
    const ids: ClientIds = {
      key: spec.key,
      partyId: party.partyId,
      contactId: party.contactId,
      locationId: party.locationId,
      opportunityId: null,
      quoteId: null,
      quoteNumber: null,
      orderId: null,
      orderNumber: null,
      deliveryNoteId: null,
      warehouseExitId: null,
      deliveryId: null,
      finishedGoodsReceiptId: null,
      followUpWorkId: null,
      orderPrepWorkId: null,
      commitmentId: null,
      conversation,
    };

    if (spec.key === 'maderas_oriente') {
      const loop = await ensureQuoteLoop(commercialSvc, session, prisma, {
        partyId: party.partyId,
        title: 'DEMO MADERAS — loop sano',
        notes: 'Cotización loop completo',
        lineDescription: 'Inodoro estándar DEMO',
        quantity: 10,
        unitPriceCentavos: 45000,
        convertToOrder: true,
        recordManualSend: true,
      });
      ids.opportunityId = loop.opportunityId;
      ids.quoteId = loop.quoteId;
      ids.quoteNumber = loop.quoteNumber;
      ids.orderId = loop.orderId;
      ids.orderNumber = loop.orderNumber;
      if (loop.orderId && loop.orderNumber) {
        const work = await ensureFollowUpAndPrep(
          workSvc,
          session,
          prisma,
          party.partyId,
          loop.orderId,
          loop.orderNumber,
        );
        ids.followUpWorkId = work.followUpWorkId;
        ids.orderPrepWorkId = work.orderPrepWorkId;
        ids.commitmentId = await ensureCommitment(session, prisma, party.partyId);
        const ops = await ensureOpsLoop(prisma, session, {
          partyId: party.partyId,
          orderId: loop.orderId,
          includeSalidaEntrega: true,
          productId: 'demo-product-inodoro',
        });
        ids.deliveryNoteId = ops.deliveryNoteId;
        ids.warehouseExitId = ops.warehouseExitId;
        ids.deliveryId = ops.deliveryId;
        ids.finishedGoodsReceiptId = ops.finishedGoodsReceiptId;
      }
    } else if (spec.key === 'proyectos_del_sur') {
      const loop = await ensureQuoteLoop(commercialSvc, session, prisma, {
        partyId: party.partyId,
        title: 'DEMO PROYECTOS — aceptación',
        notes: 'Cotización para aceptación Q-DEMO-001',
        lineDescription: 'Lavamanos DEMO',
        quantity: 6,
        unitPriceCentavos: 28000,
        quoteNumber: OWNER_DEMO_QUOTE_NUMBER_PROYECTOS,
        convertToOrder: false,
        recordManualSend: true,
      });
      ids.opportunityId = loop.opportunityId;
      ids.quoteId = loop.quoteId;
      ids.quoteNumber = OWNER_DEMO_QUOTE_NUMBER_PROYECTOS;
    } else if (spec.key === 'hotel_central') {
      const loop = await ensureQuoteLoop(commercialSvc, session, prisma, {
        partyId: party.partyId,
        title: 'DEMO HOTEL — pedido sin salida',
        notes: 'Pedido con FG, sin Salida/Entrega',
        lineDescription: 'Bidé DEMO',
        quantity: 4,
        unitPriceCentavos: 52000,
        convertToOrder: true,
        recordManualSend: true,
      });
      ids.opportunityId = loop.opportunityId;
      ids.quoteId = loop.quoteId;
      ids.quoteNumber = loop.quoteNumber;
      ids.orderId = loop.orderId;
      ids.orderNumber = loop.orderNumber;
      if (loop.orderId) {
        const ops = await ensureOpsLoop(prisma, session, {
          partyId: party.partyId,
          orderId: loop.orderId,
          includeSalidaEntrega: false,
          productId: 'demo-product-bide',
        });
        ids.deliveryNoteId = ops.deliveryNoteId;
        ids.finishedGoodsReceiptId = ops.finishedGoodsReceiptId;
        // Explicit: no salida / no entrega for delivery-question story.
        ids.warehouseExitId = null;
        ids.deliveryId = null;
      }
    } else if (spec.key === 'constructora_andina') {
      // Conversation-only commercial state — no quote yet (Story Mode / CT3-D suggestions).
    } else if (spec.key === 'ferreteria_norte') {
      const loop = await ensureQuoteLoop(commercialSvc, session, prisma, {
        partyId: party.partyId,
        title: 'DEMO FERRETERÍA — pedido con incidencia',
        notes: 'Pedido relacionado a piezas quebradas',
        lineDescription: 'Pieza cerámica DEMO',
        quantity: 12,
        unitPriceCentavos: 15000,
        convertToOrder: true,
        recordManualSend: false,
      });
      ids.opportunityId = loop.opportunityId;
      ids.quoteId = loop.quoteId;
      ids.quoteNumber = loop.quoteNumber;
      ids.orderId = loop.orderId;
      ids.orderNumber = loop.orderNumber;
    }

    clients.push(ids);
  }

  const maderas = clients.find((c) => c.key === 'maderas_oriente');
  const proof = realSevenMutationProof();
  const receipt = {
    purpose: 'ct3-e-owner-demo-fixtures',
    createdAt: new Date().toISOString(),
    organizationId: OWNER_DEMO_SYNTH_ORG,
    database: STAGING_DATABASE_NAME,
    catalog: ownerDemoCatalogMeta(),
    actorEmail: commercialActor.email,
    partyActorEmail: partyActor.email,
    REAL_SEVEN_MUTATED: 'NO' as const,
    realSevenProof: proof,
    confirm: STAGING_FIXTURE_CONFIRM_VALUE,
    clients,
    storyModePrimaryPartyId: maderas?.partyId ?? null,
    hrefHints: maderas
      ? {
          cliente360: `/clientes/${maderas.partyId}`,
          quote: maderas.quoteId
            ? `/clientes/${maderas.partyId}/cotizaciones/${maderas.quoteId}`
            : null,
          quotePdf: maderas.quoteId ? `/api/quotes/${maderas.quoteId}/pdf` : null,
          order: maderas.orderId
            ? `/clientes/${maderas.partyId}/pedidos/${maderas.orderId}`
            : null,
          deliveryNotePdf: maderas.deliveryNoteId
            ? `/api/delivery-notes/${maderas.deliveryNoteId}/pdf`
            : null,
          documents: `/clientes/${maderas.partyId}?tab=documentos`,
          management: '/inicio?lente=gerencia',
          audit: '/inicio',
        }
      : null,
  };

  const secretsDir = join(homedir(), '.isalwa-secrets');
  mkdirSync(secretsDir, { recursive: true });
  const receiptPath = join(secretsDir, 'isalwa-os-owner-demo-seed.json');
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  chmodSync(receiptPath, 0o600);
  log(`OWNER_DEMO_RECEIPT path=${receiptPath}`);

  const fixtureDir = join(HERE, '../../fixtures/owner-demo');
  try {
    mkdirSync(fixtureDir, { recursive: true });
    const publicIds = {
      organizationId: OWNER_DEMO_SYNTH_ORG,
      REAL_SEVEN_MUTATED: 'NO',
      seededAt: receipt.createdAt,
      clients: clients.map((c) => ({
        key: c.key,
        partyId: c.partyId,
        opportunityId: c.opportunityId,
        quoteId: c.quoteId,
        quoteNumber: c.quoteNumber,
        orderId: c.orderId,
        deliveryNoteId: c.deliveryNoteId,
        finishedGoodsReceiptId: c.finishedGoodsReceiptId,
        followUpWorkId: c.followUpWorkId,
        orderPrepWorkId: c.orderPrepWorkId,
        commitmentId: c.commitmentId,
      })),
      storyModePrimaryPartyId: maderas?.partyId ?? null,
      hrefHints: receipt.hrefHints,
    };
    writeFileSync(join(fixtureDir, 'last-seed-ids.json'), JSON.stringify(publicIds, null, 2));
    log(`OWNER_DEMO_IDS_WRITTEN ${join(fixtureDir, 'last-seed-ids.json')}`);
    const webIdsPath = join(HERE, '../../../../apps/os-web/lib/demo/seeded-ids.json');
    writeFileSync(webIdsPath, JSON.stringify(publicIds, null, 2));
    log(`OWNER_DEMO_WEB_IDS_WRITTEN ${webIdsPath}`);
  } catch (err) {
    log(`OWNER_DEMO_IDS_SKIP ${err instanceof Error ? err.message : String(err)}`);
  }

  log(JSON.stringify({ ok: true, REAL_SEVEN_MUTATED: 'NO', clientCount: clients.length }));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
