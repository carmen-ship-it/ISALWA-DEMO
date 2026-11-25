/**
 * Canonical business spine over the real command path (disposable Postgres).
 * One synthetic customer through Cliente → Oportunidad → Cotización → PDF →
 * simulated send/conversation/follow-up → CreateOrder → plant Work → Almacén
 * (os_orders) → Nota → linked Salida → Entrega → reported payment → Cliente 360.
 * Does not seed or copy an order as a substitute for CreateOrder.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { ProjectionRunner } from '@isalwa/os-query';
import {
  DELIVERY_RECORD_SCOPE,
  PAYMENTS_CONFIRM_SCOPE,
  PAYMENTS_REPORT_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_UPDATE_TITLE_PREFIX,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
  productionAnnotationMarker,
} from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';
import { approveQuoteOverHttp, seedSyntheticPriceApprover } from './quote-lifecycle.http-support';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');
/** Writable on Mac worktree or remote overnight host — never hardcode a Mac absolute path. */
const FIXTURES_DIR =
  process.env.SPINE_FIXTURES_DIR?.trim() ||
  join(process.cwd(), '.tmp', 'spine-canonical');
const FIXTURES = join(FIXTURES_DIR, 'ids.json');
const LINE_QTY = 4;
const UNIT_PRICE = 15000;
const todayLaPaz = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; text: string; body: Record<string, unknown> };

describe('canonical commercial-to-delivery spine (disposable Postgres)', { skip: !RUN }, () => {
  let app: INestApplication;
  let baseUrl = '';
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  let approver: Seeded;
  let partyId = '';
  let opportunityId = '';
  let quoteId = '';
  let quoteNumber = '';
  let quoteRevision = 0;
  let pdfSha = '';
  let conversationId = '';
  let commitmentId = '';
  let orderId = '';
  let orderNumber = '';
  let orderLineId = '';
  let productRef = '';
  let workItemId = '';
  let deliveryNoteId = '';
  let warehouseExitId = '';
  let deliveryId = '';
  let paymentReportId = '';
  let allocationId = '';

  function headers(who: Seeded, extra: Record<string, string> = {}): Record<string, string> {
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

  function encodeCookie(who: Seeded, label: string): string {
    return Buffer.from(
      JSON.stringify({
        organizationId: org.id,
        memberId: who.member.id,
        personId: who.person.id,
        authIdentityId: who.auth.id,
        displayLabel: label,
      }),
      'utf8',
    ).toString('base64url');
  }

  function writeFixtures(extra: Record<string, unknown> = {}) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
    writeFileSync(
      FIXTURES,
      JSON.stringify(
        {
          revision: 'local-uncommitted',
          environment: 'disposable-postgres',
          database: 'isalwa_v1_repairs_verify_20261124_disposable',
          organizationId: org.id,
          ownerMemberId: m.owner!.member.id,
          partyId,
          opportunityId,
          quoteId,
          quoteNumber,
          quoteRevision,
          pdfSha,
          conversationId,
          commitmentId,
          orderId,
          orderNumber,
          orderLineId,
          productRef,
          workItemId,
          deliveryNoteId,
          warehouseExitId,
          deliveryId,
          paymentReportId,
          allocationId,
          cookieName: 'os_dev_session',
          seats: {
            owner: { ...m.owner, cookie: encodeCookie(m.owner!, 'Asesor spine') },
            warehouse: { ...m.warehouse, cookie: encodeCookie(m.warehouse!, 'Almacén spine') },
            delivery: { ...m.delivery, cookie: encodeCookie(m.delivery!, 'Entrega spine') },
            production: { ...m.production, cookie: encodeCookie(m.production!, 'Producción spine') },
            accounting: { ...m.accounting, cookie: encodeCookie(m.accounting!, 'Finanzas spine') },
            manager: { ...m.manager, cookie: encodeCookie(m.manager!, 'Jefe spine') },
          },
          ...extra,
        },
        null,
        2,
      ),
    );
  }

  async function command(who: string, name: string, body: Record<string, unknown>, orgId = org.id): Promise<Reply> {
    const seat = m[who]!;
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: {
        ...headers(seat),
        'x-os-organization-id': orgId,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string, orgId = org.id): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      headers: { ...headers(m[who]!), 'x-os-organization-id': orgId },
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    return { status: res.status, text, body: parsed };
  }

  async function post(who: string, path: string, body: Record<string, unknown>, orgId = org.id): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method: 'POST',
      headers: { ...headers(m[who]!), 'x-os-organization-id': orgId },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : {} };
  }

  const dataOf = (reply: Reply) => reply.body.data as Record<string, unknown>;

  async function seedMember(name: string, roleKeys: readonly string[], organizationId = org.id): Promise<Seeded> {
    const seeded = await store.seedAdminMember(organizationId, `${name}-${createId()}@spine.invalid`, name, 'SPINE');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId,
          memberId: seeded.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }
    return seeded;
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
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('Spine Synth S.R.L.', `spine-${createId()}`);
    orgB = await store.seedOrganization('Spine Foreign S.R.L.', `spine-b-${createId()}`);
    m.owner = await seedMember('owner', [
      'sales_rep',
      'commercial.customer.create',
      'commercial.quote.convert.own',
      PAYMENTS_REPORT_SCOPE,
    ]);
    m.teammate = await seedMember('teammate', ['sales_rep']);
    m.manager = await seedMember('manager', ['sales_rep', 'commercial.team.read']);
    m.warehouse = await seedMember('warehouse', [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
      WAREHOUSE_OUTBOUND_RECORD_SCOPE,
    ]);
    m.delivery = await seedMember('delivery', [DELIVERY_RECORD_SCOPE]);
    m.production = await seedMember('production', [PRODUCTION_OPERATIONAL_RECORD_SCOPE]);
    m.accounting = await seedMember('accounting', [PAYMENTS_CONFIRM_SCOPE]);
    m.stranger = await seedMember('stranger', ['sales_rep', 'commercial.customer.create'], orgB.id);
    await prisma().osManagerAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId: m.owner!.member.id,
        managerMemberId: m.manager!.member.id,
        effectiveAt: new Date('2020-01-01'),
      },
    });
    approver = await seedSyntheticPriceApprover(org.id, `approver-${createId()}@spine.invalid`);
    m.approver = approver;
    productRef = createId();

    const party = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente Spine Canonical',
      contact: { givenName: 'Lucía', familyName: 'Méndez' },
      phone: { country: 'BO', number: `7${String(Date.now()).slice(-7)}` },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(party.status, 201, party.text);
    partyId = String(dataOf(party).partyId);

    const opp = await command('owner', 'CreateOpportunity', {
      partyId,
      title: 'Oportunidad spine — lavamanos',
      stage: 'qualification',
      expectedValueCentavos: String(UNIT_PRICE * LINE_QTY),
    });
    assert.equal(opp.status, 201, opp.text);
    opportunityId = String(dataOf(opp).opportunityId);

    const quote = await command('owner', 'CreateQuote', { partyId, opportunityId });
    assert.equal(quote.status, 201, quote.text);
    quoteId = String(dataOf(quote).quoteId);
    assert.equal(
      (
        await command('owner', 'AddQuoteLine', {
          quoteId,
          description: 'Lavamanos oval',
          quantity: LINE_QTY,
          unitPriceCentavos: UNIT_PRICE,
          productRef,
        })
      ).status,
      201,
    );

    const firstAsk = await command('owner', 'RequestApproval', {
      approverMemberId: approver.member.id,
      subjectType: 'quote',
      subjectId: quoteId,
    });
    assert.equal(firstAsk.status, 201, firstAsk.text);
    const rejected = await command('approver', 'Reject', {
      approvalRequestId: String(dataOf(firstAsk).approvalRequestId),
      reason: 'Revisar descuento antes de emitir',
    });
    assert.equal(rejected.status, 201, rejected.text);
    await approveQuoteOverHttp({
      baseUrl,
      ownerHeaders: headers(m.owner!),
      approverHeaders: headers(approver),
      quoteId,
    });
    const issued = await command('owner', 'SubmitQuote', { quoteId });
    assert.equal(issued.status, 201, issued.text);
    await runner.runOnce();
    await runner.runOnce();

    const pdf = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`, { headers: headers(m.owner!) });
    assert.equal(pdf.status, 200, await pdf.clone().text());
    assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/);
    const pdfBytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(pdfBytes.subarray(0, 4).toString('utf8'), '%PDF');
    pdfSha = createHash('sha256').update(pdfBytes).digest('hex');
    const pdfAgain = await fetch(`${baseUrl}/v1/quotes/${quoteId}/pdf`, { headers: headers(m.owner!) });
    assert.equal(pdfAgain.status, 200, await pdfAgain.clone().text());
    const pdfBytes2 = Buffer.from(await pdfAgain.arrayBuffer());
    assert.equal(pdfBytes2.subarray(0, 4).toString('utf8'), '%PDF');
    // Issued pin is the commercial issuedDocumentHash (terms), not raw PDF bytes —
    // pdf-lib may embed non-deterministic metadata across renders on some hosts.
    const quoteAfterPdf = await fetch(`${baseUrl}/v1/quotes/${quoteId}`, {
      headers: headers(m.owner!),
    });
    assert.equal(quoteAfterPdf.status, 200, await quoteAfterPdf.clone().text());
    const quoteBody = (await quoteAfterPdf.json()) as {
      quote?: { issuedDocumentHash?: string | null };
    };
    const issuedHash = quoteBody.quote?.issuedDocumentHash?.trim() ?? '';
    assert.ok(issuedHash.length >= 32, 'issued quote must carry issuedDocumentHash');
    const quoteAgain = await fetch(`${baseUrl}/v1/quotes/${quoteId}`, {
      headers: headers(m.owner!),
    });
    const quoteBody2 = (await quoteAgain.json()) as {
      quote?: { issuedDocumentHash?: string | null };
    };
    assert.equal(quoteBody2.quote?.issuedDocumentHash?.trim() ?? '', issuedHash);

    const sent = await command('owner', 'RecordQuoteManualSend', {
      quoteId,
      channel: 'whatsapp',
      note: 'Simulado: no se envió por WhatsApp. Registro interno de envío.',
    });
    assert.equal(sent.status, 201, sent.text);

    const conversation = await post('owner', '/customer-conversations', {
      customerId: partyId,
      channel: 'whatsapp',
      occurredAt: new Date().toISOString(),
      reason: 'Seguimiento de cotización',
      summary: 'Conversación simulada. No hay entrega WhatsApp.',
      quoteId,
      opportunityId,
      nextStep: {
        description: 'Volver a contactar sobre la cotización emitida',
        ownerMemberId: m.owner!.member.id,
        dueDate: todayLaPaz,
      },
    });
    assert.equal(conversation.status, 201, conversation.text);
    const convItem = conversation.body.item as Record<string, unknown> | undefined;
    conversationId = String(convItem?.id ?? '');
    const nextStep = conversation.body.nextStep as { status?: string; commitmentId?: string } | undefined;
    if (nextStep?.status === 'created' && nextStep.commitmentId) {
      commitmentId = nextStep.commitmentId;
    } else {
      const follow = await command('owner', 'CreateEmployeeCommitment', {
        text: 'Seguimiento de cotización emitida',
        ownerMemberId: m.owner!.member.id,
        partyId,
        dueAt: new Date(`${todayLaPaz}T12:00:00-04:00`).toISOString(),
        relatedSubjectType: 'quote',
        relatedSubjectId: quoteId,
      });
      assert.equal(follow.status, 201, follow.text);
      commitmentId = String(dataOf(follow).commitmentId);
    }

    const quoteRow = await prisma().osQuote.findUniqueOrThrow({ where: { id: quoteId } });
    quoteNumber = quoteRow.quoteNumber;
    quoteRevision = quoteRow.revisionNumber;
    assert.match(quoteRow.issuedDocumentHash ?? '', /^[0-9a-f]{64}$/);
    const accepted = await command('owner', 'RecordQuoteCustomerAcceptance', {
      quoteId,
      channel: 'llamada',
      acceptedOn: todayLaPaz,
      evidence: 'Confirmó por llamada con el asesor titular',
      expectedRevision: quoteRevision,
    });
    assert.equal(accepted.status, 201, accepted.text);

    const order = await command('owner', 'CreateOrder', { quoteId });
    assert.equal(order.status, 201, order.text);
    orderId = String(dataOf(order).orderId);
    const written = await prisma().osOrder.findFirst({ where: { id: orderId, organizationId: org.id } });
    assert.ok(written);
    assert.equal(written.partyId, partyId);
    assert.equal(written.quoteId, quoteId);
    assert.equal(written.ownerMemberId, m.owner!.member.id);
    orderNumber = written.orderNumber;
    const line = await prisma().osOrderLine.findFirst({ where: { orderId, organizationId: org.id } });
    assert.ok(line);
    orderLineId = line.id;
    assert.equal(line.quantity, LINE_QTY);
    assert.equal(Number(line.unitPriceCentavosSnapshot), UNIT_PRICE);
    assert.equal(line.productRefSnapshot, productRef);
    await runner.runOnce();
    await runner.runOnce();
    writeFixtures({ issuedDocumentHash: quoteRow.issuedDocumentHash });
  });

  after(async () => {
    if (app) await app.close();
  });

  it('keeps one customer, opportunity, quote and CreateOrder write with an outbox event', async () => {
    if (!RUN) return;
    const parties = await prisma().osParty.count({ where: { id: partyId } });
    const opps = await prisma().osOpportunity.count({ where: { id: opportunityId } });
    const quotes = await prisma().osQuote.count({ where: { id: quoteId } });
    const orders = await prisma().osOrder.count({ where: { id: orderId } });
    assert.equal(parties, 1);
    assert.equal(opps, 1);
    assert.equal(quotes, 1);
    assert.equal(orders, 1);
    const opp = await prisma().osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    assert.equal(opp.partyId, partyId);
    assert.equal(opp.organizationId, org.id);
    assert.equal(opp.ownerMemberId, m.owner!.member.id);
    const quote = await prisma().osQuote.findUniqueOrThrow({ where: { id: quoteId } });
    assert.equal(quote.partyId, partyId);
    assert.equal(quote.opportunityId, opportunityId);
    assert.equal(quote.ownerMemberId, m.owner!.member.id);
    const event = await prisma().osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'order.created', primaryEntityId: orderId },
    });
    assert.ok(event, 'CreateOrder must emit order.created');
    assert.equal(event.organizationId, org.id);
    const outbox = await prisma().osOutboxMessage.findFirst({
      where: { organizationId: org.id, eventId: event.id },
    });
    assert.ok(outbox, 'CreateOrder must write the outbox');
  });

  it('rejects a second CreateOrder on the same quote and does not duplicate the write row', async () => {
    if (!RUN) return;
    const again = await command('owner', 'CreateOrder', { quoteId });
    assert.ok([400, 404, 409].includes(again.status), again.text);
    assert.equal(await prisma().osOrder.count({ where: { quoteId, organizationId: org.id } }), 1);
    const warehouseConvert = await command('warehouse', 'CreateOrder', { quoteId });
    assert.ok([403, 404, 409, 400].includes(warehouseConvert.status), warehouseConvert.text);
  });

  it('persists opportunity stage and amount without duplicating the opportunity', async () => {
    if (!RUN) return;
    const updated = await command('owner', 'UpdateOpportunity', {
      opportunityId,
      expectedValueCentavos: String(UNIT_PRICE * LINE_QTY),
      title: 'Oportunidad spine — lavamanos (revisada)',
    });
    assert.equal(updated.status, 201, updated.text);
    const staged = await command('owner', 'ChangeOpportunityStage', {
      opportunityId,
      stage: 'proposal',
    });
    assert.equal(staged.status, 201, staged.text);
    await runner.runOnce();
    await runner.runOnce();
    assert.equal(await prisma().osOpportunity.count({ where: { id: opportunityId } }), 1);
    const row = await prisma().osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    assert.equal(row.stage, 'proposal');
    assert.equal(row.partyId, partyId);
    const ownerList = await get('owner', '/opportunities');
    assert.equal(ownerList.status, 200, ownerList.text);
    const ownerItems = (ownerList.body.items as Array<{ opportunityId?: string; id?: string }>) ?? [];
    assert.equal(
      ownerItems.some((row) => (row.opportunityId ?? row.id) === opportunityId),
      true,
    );
    const managerList = await get('manager', '/opportunities?visibility=team');
    assert.equal(managerList.status, 200, managerList.text);
    const managerItems = (managerList.body.items as Array<{ opportunityId?: string; id?: string }>) ?? [];
    assert.equal(
      managerItems.some((row) => (row.opportunityId ?? row.id) === opportunityId),
      true,
    );
    const stranger = await get('stranger', `/opportunities`, orgB.id);
    assert.equal(stranger.status, 200, stranger.text);
    const strangerItems = (stranger.body.items as Array<{ opportunityId?: string; id?: string }>) ?? [];
    assert.equal(
      strangerItems.some((row) => (row.opportunityId ?? row.id) === opportunityId),
      false,
    );
  });

  it('projects the commercial order and lists it for the owner, not the warehouse commercial list', async () => {
    if (!RUN) return;
    await runner.runOnce();
    await runner.runOnce();
    const projected = await prisma().osOrderReadModel.findFirst({
      where: { orderId, organizationId: org.id },
    });
    assert.ok(projected);
    assert.equal(projected.ownerMemberId, m.owner!.member.id);
    assert.equal(projected.orderNumber, orderNumber);
    assert.equal(await prisma().osOrder.count({ where: { id: orderId } }), 1);
    assert.equal(await prisma().osOrderReadModel.count({ where: { orderId } }), 1);
    const ownerList = await get('owner', '/orders');
    assert.equal(ownerList.status, 200, ownerList.text);
    const ownerItems = (ownerList.body.items as Array<{ orderId: string }>) ?? [];
    assert.equal(ownerItems.some((row) => row.orderId === orderId), true);
    const warehouseCommercial = await get('warehouse', '/orders');
    assert.equal(warehouseCommercial.status, 200, warehouseCommercial.text);
    const warehouseItems = (warehouseCommercial.body.items as Array<{ orderId: string }>) ?? [];
    assert.equal(warehouseItems.some((row) => row.orderId === orderId), false);
  });

  it('shows the CreateOrder write row on warehouse delivery-ops and persists receive/allocate', async () => {
    if (!RUN) return;
    const ops = await get('warehouse', '/delivery-ops/orders');
    assert.equal(ops.status, 200, ops.text);
    const items = (ops.body.items as Array<{ orderId: string; orderNumber: string }>) ?? [];
    assert.equal(items.some((row) => row.orderId === orderId && row.orderNumber === orderNumber), true);
    const advisorOps = await get('owner', '/delivery-ops/orders');
    assert.equal(advisorOps.status, 403, advisorOps.text);

    const receive = await command('warehouse', 'ReceiveFinishedGoods', {
      productId: productRef,
      quantity: String(LINE_QTY),
      contextOrderId: orderId,
      contextOrderLineId: orderLineId,
    });
    assert.ok(receive.status === 200 || receive.status === 201, receive.text);
    const allocate = await command('warehouse', 'AllocateFinishedGoods', {
      productId: productRef,
      quantity: String(LINE_QTY),
      orderLineId,
    });
    assert.ok(allocate.status === 200 || allocate.status === 201, allocate.text);
    allocationId = String(dataOf(allocate).allocationId ?? allocate.body.allocationId ?? '');
    assert.ok(allocationId);
    const dup = await command('warehouse', 'AllocateFinishedGoods', {
      productId: productRef,
      quantity: '1',
      orderLineId,
    });
    assert.ok(dup.status >= 400, dup.text);
    const unauthorized = await command('owner', 'AllocateFinishedGoods', {
      productId: productRef,
      quantity: '1',
      orderLineId,
    });
    assert.equal(unauthorized.status, 403);
    writeFixtures();
  });

  it('records a plant update as Work linked to the same customer and order marker', async () => {
    if (!RUN) return;
    const created = await command('production', 'CreateWorkItem', {
      title: `${PRODUCTION_UPDATE_TITLE_PREFIX}: ${orderNumber} · Lavamanos oval`,
      description: `Quema mixta en curso.\n${productionAnnotationMarker(orderId)}`,
      ownerMemberId: m.production!.member.id,
      subjectType: 'party',
      subjectId: partyId,
    });
    assert.equal(created.status, 201, created.text);
    workItemId = String(dataOf(created).workItemId);
    const work = await prisma().osWorkItem.findUniqueOrThrow({ where: { id: workItemId } });
    assert.equal(work.organizationId, org.id);
    assert.equal(work.subjectId, partyId);
    assert.match(work.description ?? '', new RegExp(orderId));
    writeFixtures({ workItemId });
  });

  it('issues a nota, links salida, rejects unlinked double-dispatch, and records entrega + signature', async () => {
    if (!RUN) return;
    const nota = await command('delivery', 'CreateNotaDeEntrega', {
      orderId,
      recipient: 'Recepción cliente spine',
      deliveredBy: 'Chofer spine',
      recordedBy: m.delivery!.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: LINE_QTY }],
    });
    assert.equal(nota.status, 201, nota.text);
    deliveryNoteId = String(dataOf(nota).deliveryNoteId);
    const noteRow = await prisma().osDeliveryNote.findFirst({
      where: { id: deliveryNoteId, organizationId: org.id },
    });
    assert.ok(noteRow);
    assert.equal(noteRow.orderId, orderId);

    const pdf = await fetch(`${baseUrl}/v1/delivery-notes/${deliveryNoteId}/pdf`, {
      headers: headers(m.delivery!),
    });
    assert.equal(pdf.status, 200, await pdf.clone().text());
    assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/);

    const linked = await command('warehouse', 'RecordSalida', {
      orderId,
      exitedAt: new Date().toISOString(),
      recordedBy: m.warehouse!.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: LINE_QTY }],
      deliveryNoteId,
    });
    assert.equal(linked.status, 201, linked.text);
    warehouseExitId = String(dataOf(linked).warehouseExitId ?? dataOf(linked).exitId ?? '');
    const unlinked = await command('warehouse', 'RecordSalida', {
      orderId,
      exitedAt: new Date().toISOString(),
      recordedBy: m.warehouse!.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: LINE_QTY }],
    });
    assert.ok(unlinked.status >= 400, unlinked.text);
    const secondLinked = await command('warehouse', 'RecordSalida', {
      orderId,
      exitedAt: new Date().toISOString(),
      recordedBy: m.warehouse!.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: 1 }],
      deliveryNoteId,
    });
    assert.ok(secondLinked.status >= 400, secondLinked.text);

    const entrega = await command('delivery', 'RecordEntrega', {
      orderId,
      deliveredAt: new Date().toISOString(),
      receivedBy: 'Lucía Méndez',
      recordedBy: m.delivery!.member.id,
      source: 'employee_recorded',
      quantities: [{ orderLineId, quantity: LINE_QTY }],
      deliveryNoteId,
    });
    assert.equal(entrega.status, 201, entrega.text);
    deliveryId = String(dataOf(entrega).deliveryId ?? '');
    const evidence = await command('delivery', 'RecordDeliveryEvidence', {
      role: 'delivery_confirmation',
      subjectType: 'delivery_note',
      subjectId: deliveryNoteId,
      recordedBy: m.delivery!.member.id,
      recipient: 'Lucía Méndez',
      signatureReference: 'firma-spine-canonical-ref',
    });
    assert.equal(evidence.status, 201, evidence.text);
    writeFixtures();
  });

  it('records a payment report without treating it as accounting confirmation or revenue', async () => {
    if (!RUN) return;
    const accountingWrite = await post('accounting', '/payment-reports', {
      customerId: partyId,
      orderId,
      totalCentavos: String(UNIT_PRICE * LINE_QTY),
      paidOn: todayLaPaz,
      tenders: [{ method: 'qr', amountCentavos: String(UNIT_PRICE * LINE_QTY), reference: `QR-SPINE-${createId()}` }],
    });
    assert.equal(accountingWrite.status, 403, accountingWrite.text);
    const reported = await post('owner', '/payment-reports', {
      customerId: partyId,
      orderId,
      totalCentavos: String(UNIT_PRICE * LINE_QTY),
      paidOn: todayLaPaz,
      note: 'Reporte de pago. No es confirmación contable.',
      tenders: [{ method: 'qr', amountCentavos: String(UNIT_PRICE * LINE_QTY), reference: `QR-SPINE-${createId()}` }],
    });
    assert.equal(reported.status, 201, reported.text);
    const report = reported.body.report as {
      id: string;
      customerId?: string;
      orderId?: string;
      tenders: Array<{ id: string; verification: string }>;
      totals: { state?: string };
    };
    paymentReportId = report.id;
    assert.equal(report.customerId ?? partyId, partyId);
    const pending = report.tenders[0];
    assert.ok(pending);
    assert.notEqual(pending.verification, 'confirmed');
    const confirmed = await post(
      'accounting',
      `/payment-reports/${paymentReportId}/tenders/${pending.id}/confirm`,
      { reason: 'Abono visto en el extracto del banco' },
    );
    assert.equal(confirmed.status, 201, confirmed.text);
    const confirmedReport = confirmed.body.report as { totals?: { state?: string } };
    assert.notEqual(confirmedReport.totals?.state, 'revenue_recognized');
    writeFixtures();
  });

  it('shows the same customer and order on the party timeline and conversation', async () => {
    if (!RUN) return;
    await runner.runOnce();
    await runner.runOnce();
    const timeline = await get('owner', `/parties/${partyId}/timeline?limit=100`);
    assert.equal(timeline.status, 200, timeline.text);
    const blob = JSON.stringify(timeline.body);
    assert.match(blob, new RegExp(orderId));
    assert.match(blob, new RegExp(quoteId));
    const conversations = await get('owner', `/customer-conversations?partyId=${partyId}`);
    assert.equal(conversations.status, 200, conversations.text);
    const items = (conversations.body.items as Array<Record<string, unknown>>) ?? [];
    const item = items.find((row) => row.id === conversationId);
    assert.ok(item);
    assert.equal(item.customerId, partyId);
    assert.equal(item.quoteId, quoteId);
    const strangerParty = await get('stranger', `/parties/${partyId}/timeline`, orgB.id);
    assert.ok([401, 403, 404].includes(strangerParty.status), strangerParty.text);
    writeFixtures({ timelineVerified: true });
  });
});
