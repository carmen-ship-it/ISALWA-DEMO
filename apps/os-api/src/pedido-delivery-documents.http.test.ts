/**
 * Pedido delivery-document read after abf641e3:
 * authorized order viewer may list/timeline/PDF; other customer, other tenant,
 * and unrelated teammates are denied without leaking foreign ids.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';
import { DELIVERY_RECORD_SCOPE } from '@isalwa/os-contracts';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

describe('Pedido delivery-document read boundaries (disposable Postgres)', { skip: !RUN }, () => {
  let app: INestApplication;
  let baseUrl = '';
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  let orderOwner: string;
  let orderOther: string;
  let noteOwner: string;
  let noteForeign: string;
  let orderForeign: string;

  function headers(who: Seeded, orgId: string): Record<string, string> {
    return {
      'x-os-organization-id': orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
    };
  }

  async function get(who: Seeded, orgId: string, path: string) {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(who, orgId) });
    const type = res.headers.get('content-type') ?? '';
    const raw = Buffer.from(await res.arrayBuffer());
    const text = type.includes('json') ? raw.toString('utf8') : raw.toString('latin1');
    return {
      status: res.status,
      type,
      text,
      body: type.includes('json') && text ? JSON.parse(text) : null,
    };
  }

  async function seedMember(orgId: string, name: string, roleKeys: readonly string[]) {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@pedido-doc.bo`, name, 'DOC');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId: orgId,
          memberId: seeded.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }
    return seeded;
  }

  async function seedOrder(orgId: string, ownerMemberId: string, label: string) {
    const partyId = createId();
    const quoteId = createId();
    const orderId = createId();
    const noteId = createId();
    await prisma().osParty.create({
      data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: label },
    });
    await prisma().osPartyRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        partyId,
        roleKey: 'customer',
        effectiveAt: new Date('2020-01-01'),
      },
    });
    await prisma().osCommercialAccount.create({
      data: { id: createId(), organizationId: orgId, partyId, ownerMemberId },
    });
    await prisma().osQuote.create({
      data: {
        id: quoteId,
        organizationId: orgId,
        partyId,
        ownerMemberId,
        quoteNumber: `Q-${orderId.slice(-6)}`,
        status: 'accepted',
      },
    });
    await prisma().osOrder.create({
      data: {
        id: orderId,
        organizationId: orgId,
        partyId,
        quoteId,
        ownerMemberId,
        orderNumber: `O-${orderId.slice(-6)}`,
        subtotalCentavos: 10000n,
        totalCentavos: 10000n,
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
        internalDocumentRef: `NE-PILOT-${noteId}`,
        status: 'issued',
        recipient: 'Recepción',
        deliveredBy: 'Chofer',
        createdByMemberId: ownerMemberId,
        bornAt: new Date('2026-10-10T15:00:00Z'),
      },
    });
    return { orderId, noteId, partyId };
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
    orgA = await store.seedOrganization('Pedido Doc Org A', `pda-${createId()}`);
    orgB = await store.seedOrganization('Pedido Doc Org B', `pdb-${createId()}`);

    m.owner = await seedMember(orgA.id, 'owner', ['sales_rep', 'commercial.quote.convert.own']);
    m.teammate = await seedMember(orgA.id, 'teammate', ['sales_rep']);
    m.leadNoReport = await seedMember(orgA.id, 'leadnoreport', ['sales_rep', 'commercial.team.read']);
    m.leadReport = await seedMember(orgA.id, 'leadreport', ['sales_rep', 'commercial.team.read']);
    m.orgReader = await seedMember(orgA.id, 'orgreader', ['commercial.org.read']);
    m.delivery = await seedMember(orgA.id, 'delivery', [DELIVERY_RECORD_SCOPE]);
    m.strangerB = await seedMember(orgB.id, 'strangerb', ['sales_rep', 'commercial.org.read']);

    const owned = await seedOrder(orgA.id, m.owner!.member.id, 'Cliente Owner');
    orderOwner = owned.orderId;
    noteOwner = owned.noteId;

    const otherOwner = await seedMember(orgA.id, 'otherowner', ['sales_rep']);
    const other = await seedOrder(orgA.id, otherOwner.member.id, 'Cliente Otro');
    orderOther = other.orderId;

    await prisma().osManagerAssignment.create({
      data: {
        id: createId(),
        organizationId: orgA.id,
        memberId: m.owner!.member.id,
        managerMemberId: m.leadReport!.member.id,
        effectiveAt: new Date('2020-01-01'),
      },
    });

    const foreign = await seedOrder(orgB.id, m.strangerB!.member.id, 'Cliente Foreign Secret');
    orderForeign = foreign.orderId;
    noteForeign = foreign.noteId;
  });

  after(async () => {
    if (app) await app.close();
  });

  it('lets the order owner list notes/timeline and download the PDF without delivery.record', async () => {
    const list = await get(m.owner!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(list.status, 200, list.text);
    assert.equal(list.body.notes?.length >= 1, true);
    assert.ok(
      (list.body.timeline as Array<{ eventType: string }>).some(
        (e) => e.eventType === 'delivery_note.created' || e.eventType.startsWith('delivery_note.'),
      ),
    );
    const pdf = await get(m.owner!, orgA.id, `/delivery-notes/${noteOwner}/pdf`);
    assert.equal(pdf.status, 200, pdf.text.slice(0, 200));
    assert.match(pdf.type, /pdf/);
    assert.equal(pdf.text.slice(0, 4), '%PDF');
  });

  it('denies a same-org teammate with no ownership or team-report relationship', async () => {
    const list = await get(m.teammate!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(list.status, 403, list.text);
    assert.deepEqual(list.body, { code: 'PERMISSION_DENIED' });
    const pdf = await get(m.teammate!, orgA.id, `/delivery-notes/${noteOwner}/pdf`);
    assert.equal(pdf.status, 403, pdf.text.slice(0, 200));
  });

  it('denies commercial.team.read without a direct-report link on another customer order', async () => {
    const list = await get(m.leadNoReport!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(list.status, 403, list.text);
    assert.deepEqual(list.body, { code: 'PERMISSION_DENIED' });
  });

  it('allows commercial.team.read when the order owner is a direct report', async () => {
    const list = await get(m.leadReport!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(list.status, 200, list.text);
    assert.equal(list.body.notes?.length >= 1, true);
  });

  it('does not expose another customer order to the owner of a different order', async () => {
    const list = await get(m.owner!, orgA.id, `/delivery-notes?orderId=${orderOther}`);
    assert.equal(list.status, 403, list.text);
    assert.deepEqual(list.body, { code: 'PERMISSION_DENIED' });
  });

  it('treats foreign-tenant order and note ids as NOT_FOUND with no foreign leakage', async () => {
    const list = await get(m.owner!, orgA.id, `/delivery-notes?orderId=${orderForeign}`);
    assert.equal(list.status, 404, list.text);
    assert.deepEqual(list.body, { code: 'NOT_FOUND' });
    assert.equal(list.text.includes('Cliente Foreign Secret'), false);
    const pdf = await get(m.owner!, orgA.id, `/delivery-notes/${noteForeign}/pdf`);
    assert.equal(pdf.status, 404, pdf.text.slice(0, 200));
    assert.equal(pdf.text.includes('Cliente Foreign Secret'), false);
  });

  it('lets delivery.record and commercial.org.read continue to read authorized tenant docs', async () => {
    const ops = await get(m.delivery!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(ops.status, 200, ops.text);
    const org = await get(m.orgReader!, orgA.id, `/delivery-notes?orderId=${orderOwner}`);
    assert.equal(org.status, 200, org.text);
  });
});
