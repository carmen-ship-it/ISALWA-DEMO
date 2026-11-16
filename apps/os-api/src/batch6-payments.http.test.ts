import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma, PrismaOsPartyStore } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * Batch 6 / T07: reported payments, per-tender human verification, explicit allocations,
 * private evidence and approved payment instructions.
 * Real Nest app over HTTP, real Postgres (disposable).
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());

describeHttp('Batch 6 reported payments over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;

  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  let customerId = '';
  let otherCustomerId = '';
  let foreignCustomerId = '';
  let orderId = '';
  let orderTwoId = '';
  let otherOrderId = '';

  const headers = (orgId: string, who: Seeded, extra: Record<string, string> = {}) => ({
    'x-os-organization-id': orgId,
    'x-os-member-id': who.member.id,
    'x-os-person-id': who.person.id,
    'x-os-auth-identity-id': who.auth.id,
    ...extra,
  });
  const call = async (
    method: 'GET' | 'POST',
    who: string,
    path: string,
    body?: unknown,
    orgId = orgA.id,
    extra: Record<string, string> = {},
  ) => {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: headers(orgId, m[who]!, { 'content-type': 'application/json', ...extra }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };
  const upload = (who: string, path: string, bytes: Buffer, contentType = 'application/octet-stream', orgId = orgA.id) =>
    fetch(`${baseUrl}/v1${path}`, {
      method: 'POST',
      headers: headers(orgId, m[who]!, { 'content-type': contentType }),
      body: bytes,
    });
  const download = (who: string, path: string, orgId = orgA.id) =>
    fetch(`${baseUrl}/v1${path}`, { headers: headers(orgId, m[who]!) });

  async function seedMember(orgId: string, name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@b6.bo`, name, 'B6');
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  async function seedCustomer(orgId: string, name: string, ownerMemberId: string): Promise<string> {
    const partyId = createId();
    await prisma().osParty.create({ data: { id: partyId, organizationId: orgId, partyKind: 'organization', displayName: name } });
    await prisma().osPartyRoleAssignment.create({
      data: { id: createId(), organizationId: orgId, partyId, roleKey: 'customer', effectiveAt: new Date('2020-01-01') },
    });
    await prisma().osCommercialAccount.create({ data: { id: createId(), organizationId: orgId, partyId, ownerMemberId } });
    await prisma().osPartyReadModel.create({
      data: {
        partyId,
        organizationId: orgId,
        partyKind: 'organization',
        displayName: name,
        status: 'active',
        activeRoleKeys: ['customer'],
        hasCommercialAccount: true,
        searchText: name.toLowerCase(),
      },
    });
    return partyId;
  }

  async function seedOrder(orgId: string, partyId: string, ownerMemberId: string): Promise<string> {
    const quoteId = createId();
    const id = createId();
    await prisma().osQuote.create({
      data: { id: quoteId, organizationId: orgId, partyId, ownerMemberId, quoteNumber: `Q-B6-${createId()}`, status: 'accepted' },
    });
    await prisma().osOrder.create({
      data: {
        id,
        organizationId: orgId,
        partyId,
        quoteId,
        ownerMemberId,
        orderNumber: `P-B6-${createId()}`,
        subtotalCentavos: 500000n,
        totalCentavos: 500000n,
        status: 'open',
      },
    });
    return id;
  }

  const qrCash = (overrides: Record<string, unknown> = {}) => ({
    customerId,
    totalCentavos: '127000',
    paidOn: today,
    note: 'Pago sintético mixto',
    tenders: [
      { method: 'qr', amountCentavos: '20000', reference: `QR-${createId()}` },
      { method: 'cash', amountCentavos: '107000', cashRecipientUnresolvedReason: 'No se anotó quién recibió' },
    ],
    ...overrides,
  });
  const cashKnown = (amount: string, extra: Record<string, unknown> = {}) => ({
    customerId,
    totalCentavos: amount,
    paidOn: today,
    tenders: [{ method: 'cash', amountCentavos: amount, cashRecipientMemberId: m.receiver!.member.id }],
    ...extra,
  });
  const report = async (who = 'advisor', body: unknown = qrCash()) => {
    const res = await call('POST', who, '/payment-reports', body);
    assert.equal(res.status, 201, res.text);
    return res.body.report as {
      id: string;
      tenders: Array<{ id: string; method: string; verification: string }>;
      totals: Record<string, unknown>;
    };
  };
  const factCount = () => prisma().osReportedOperationalFact.count({ where: { organizationId: orgA.id, kind: 'payment' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);

    orgA = await store.seedOrganization('B6 A', `b6-a-${createId()}`);
    orgB = await store.seedOrganization('B6 B', `b6-b-${createId()}`);

    m.advisor = await seedMember(orgA.id, 'advisor', ['payments.report']);
    m.otherAdvisor = await seedMember(orgA.id, 'otheradvisor', ['payments.report']);
    m.accounting = await seedMember(orgA.id, 'accounting', ['payments.confirm']);
    m.accountingTwo = await seedMember(orgA.id, 'accountingtwo', ['payments.confirm']);
    m.receiver = await seedMember(orgA.id, 'receiver', []);
    m.publisher = await seedMember(orgA.id, 'publisher', ['commercial.payment_instructions.publish']);
    m.publisherTwo = await seedMember(orgA.id, 'publishertwo', ['commercial.payment_instructions.publish']);
    m.stranger = await seedMember(orgA.id, 'stranger', []);
    m.foreignAccounting = await seedMember(orgB.id, 'foreignaccounting', ['payments.confirm']);

    customerId = await seedCustomer(orgA.id, 'Cliente Pagos B6', m.advisor.member.id);
    otherCustomerId = await seedCustomer(orgA.id, 'Otro Cliente B6', m.otherAdvisor.member.id);
    foreignCustomerId = await seedCustomer(orgB.id, 'Cliente Ajeno B6', m.foreignAccounting.member.id);
    orderId = await seedOrder(orgA.id, customerId, m.advisor.member.id);
    orderTwoId = await seedOrder(orgA.id, customerId, m.advisor.member.id);
    otherOrderId = await seedOrder(orgA.id, otherCustomerId, m.otherAdvisor.member.id);
  });

  after(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------------
  // Record
  // ---------------------------------------------------------------------------------------------

  it('records QR 200 + cash 1070 = 1270 as two pending tenders; nothing is confirmed by reporting', async () => {
    const res = await call('POST', 'advisor', '/payment-reports', qrCash({ orderId }));
    assert.equal(res.status, 201, res.text);
    const { report: created } = res.body;
    assert.equal(created.currency, 'BOB');
    assert.equal(created.orderId, orderId);
    assert.equal(created.tenders.length, 2);
    assert.deepEqual(created.tenders.map((t: { verification: string }) => t.verification), ['pending', 'pending']);
    assert.equal(created.totals.state, 'pending');
    assert.equal(created.totals.confirmedCentavos, '0');
    assert.equal(created.totals.reportedCentavos, '127000');
    assert.equal(created.totals.unassignedCentavos, '0');
    assert.equal(created.tenders[1].cashRecipientMemberId, null);
    assert.match(created.tenders[1].cashRecipientUnresolvedReason, /No se anotó/);
    assert.equal(created.reportedByMemberId, m.advisor.member.id);
    assert.equal(res.body.copy, 'Pago reportado. Pendiente de verificación de Contabilidad.');
    // The fact row is still "pending" and no allocation exists: the order was only an intent.
    const fact = await prisma().osReportedOperationalFact.findFirstOrThrow({ where: { id: created.id } });
    assert.equal(fact.confirmation, 'pending');
    assert.equal(fact.intendedOrderId, orderId);
    assert.equal(await prisma().osPaymentAllocation.count({ where: { factId: created.id } }), 0);

    const reloaded = await call('GET', 'advisor', `/payment-reports/${created.id}`);
    assert.equal(reloaded.status, 200);
    assert.deepEqual(reloaded.body.report, created);
  });

  it('refuses invalid reports and writes nothing', async () => {
    const before = await factCount();
    const mismatch = await call('POST', 'advisor', '/payment-reports', qrCash({ totalCentavos: '127001' }));
    assert.equal(mismatch.status, 400);
    assert.match(mismatch.text, /tenders_must_sum_to_total/);

    for (const amount of ['0', '-5', '12.5', 'abc']) {
      const bad = await call('POST', 'advisor', '/payment-reports', {
        ...qrCash(),
        tenders: [{ method: 'qr', amountCentavos: amount }, { method: 'qr', amountCentavos: '127000' }],
      });
      assert.equal(bad.status, 400, amount);
    }
    const noRecipient = await call('POST', 'advisor', '/payment-reports', {
      customerId,
      totalCentavos: '5000',
      paidOn: today,
      tenders: [{ method: 'cash', amountCentavos: '5000' }],
    });
    assert.equal(noRecipient.status, 400);
    assert.match(noRecipient.text, /cash_recipient_required/);
    const both = await call('POST', 'advisor', '/payment-reports', {
      customerId,
      totalCentavos: '5000',
      paidOn: today,
      tenders: [
        {
          method: 'cash',
          amountCentavos: '5000',
          cashRecipientMemberId: m.receiver.member.id,
          cashRecipientUnresolvedReason: 'ambos',
        },
      ],
    });
    assert.equal(both.status, 400);
    const future = await call('POST', 'advisor', '/payment-reports', qrCash({ paidOn: '2099-01-01' }));
    assert.equal(future.status, 400);
    assert.match(future.text, /paid_on_in_future/);
    // Tenant, confirmation and reporter are never client-supplied.
    for (const extra of [{ organizationId: orgB.id }, { confirmation: 'confirmed' }, { reportedByMemberId: m.accounting.member.id }]) {
      const smuggled = await call('POST', 'advisor', '/payment-reports', qrCash(extra));
      assert.equal(smuggled.status, 400, JSON.stringify(extra));
    }
    const noRoleRecipient = await call('POST', 'advisor', '/payment-reports', cashKnown('5000', {
      tenders: [{ method: 'cash', amountCentavos: '5000', cashRecipientMemberId: createId() }],
    }));
    assert.equal(noRoleRecipient.status, 400);
    assert.match(noRoleRecipient.text, /RECIPIENT_INVALID/);
    assert.equal(await factCount(), before);
  });

  it('a retry with the same Idempotency-Key returns the same report once; another body with that key conflicts', async () => {
    const key = `b6-${createId()}`;
    const body = qrCash();
    const first = await call('POST', 'advisor', '/payment-reports', body, orgA.id, { 'idempotency-key': key });
    assert.equal(first.status, 201, first.text);
    assert.equal(first.body.replayed, false);
    const before = await factCount();
    const retry = await call('POST', 'advisor', '/payment-reports', body, orgA.id, { 'idempotency-key': key });
    assert.equal(retry.status, 201, retry.text);
    assert.equal(retry.body.replayed, true);
    assert.equal(retry.body.report.id, first.body.report.id);
    assert.equal(await factCount(), before);
    const changed = await call('POST', 'advisor', '/payment-reports', qrCash({ note: 'otra cosa' }), orgA.id, { 'idempotency-key': key });
    assert.equal(changed.status, 409);
    assert.match(changed.text, /IDEMPOTENCY_CONFLICT/);

    const parallelKey = `b6-par-${createId()}`;
    const parallelBody = qrCash();
    const [one, two] = await Promise.all([
      call('POST', 'advisor', '/payment-reports', parallelBody, orgA.id, { 'idempotency-key': parallelKey }),
      call('POST', 'advisor', '/payment-reports', parallelBody, orgA.id, { 'idempotency-key': parallelKey }),
    ]);
    assert.deepEqual([one.status, two.status], [201, 201]);
    assert.equal(one.body.report.id, two.body.report.id);
    assert.equal(
      await prisma().osReportedOperationalFact.count({ where: { organizationId: orgA.id, idempotencyKey: `payment-report:${parallelKey}` } }),
      1,
    );
  });

  it('flags a possible duplicate (same reference or same file) without blocking or merging it', async () => {
    const reference = `BCP-${createId()}`;
    const body = {
      customerId,
      totalCentavos: '30000',
      paidOn: today,
      tenders: [{ method: 'transfer', amountCentavos: '30000', reference }],
    };
    const first = await report('advisor', body);
    const second = await report('advisor', body);
    assert.notEqual(first.id, second.id);
    const reread = await call('GET', 'advisor', `/payment-reports/${second.id}`);
    assert.equal(reread.body.report.possibleDuplicate, true);
    const firstReread = await call('GET', 'advisor', `/payment-reports/${first.id}`);
    assert.equal(firstReread.body.report.possibleDuplicate, true);
    const unique = await report('advisor', {
      ...body,
      tenders: [{ method: 'transfer', amountCentavos: '30000', reference: `OTRO-${createId()}` }],
    });
    assert.equal((await call('GET', 'advisor', `/payment-reports/${unique.id}`)).body.report.possibleDuplicate, false);
  });

  // ---------------------------------------------------------------------------------------------
  // Authority
  // ---------------------------------------------------------------------------------------------

  it('advisors report and read their outcomes but cannot confirm, reject, allocate or open the queue', async () => {
    const created = await report();
    const qr = created.tenders.find((t) => t.method === 'qr')!;
    for (const action of ['confirm', 'reject']) {
      const res = await call('POST', 'advisor', `/payment-reports/${created.id}/tenders/${qr.id}/${action}`, { reason: 'Lo vi en el banco' });
      assert.equal(res.status, 403, action);
    }
    assert.equal(
      (await call('POST', 'advisor', `/payment-reports/${created.id}/allocations`, { orderId, amountCentavos: '100' })).status,
      403,
    );
    assert.equal((await call('GET', 'advisor', '/payment-reports?view=queue')).status, 403);
    const still = await call('GET', 'advisor', `/payment-reports/${created.id}`);
    assert.equal(still.body.report.tenders.find((t: { id: string }) => t.id === qr.id).verification, 'pending');
    assert.equal(still.body.report.can.verify, false);

    // Reporting is not verifying: a member with neither scope cannot report at all.
    assert.equal((await call('POST', 'stranger', '/payment-reports', qrCash())).status, 403);
    // A customer that is not theirs reads as missing.
    assert.equal((await call('POST', 'otherAdvisor', '/payment-reports', qrCash())).status, 404);
    // Another customer's advisor and a stranger do not see this report.
    assert.equal((await call('GET', 'otherAdvisor', `/payment-reports/${created.id}`)).status, 404);
    assert.equal((await call('GET', 'stranger', `/payment-reports/${created.id}`)).status, 404);
    const visible = await call('GET', 'otherAdvisor', '/payment-reports');
    assert.equal(visible.status, 200);
    assert.ok(!visible.body.items.some((item: { id: string }) => item.id === created.id));
  });

  it('keeps tenants apart: a foreign verifier sees nothing, and a foreign customer or order cannot be reported', async () => {
    const created = await report();
    const qr = created.tenders.find((t) => t.method === 'qr')!;
    const foreignRead = await call('GET', 'foreignAccounting', `/payment-reports/${created.id}`, undefined, orgB.id);
    assert.equal(foreignRead.status, 404);
    const foreignConfirm = await call(
      'POST',
      'foreignAccounting',
      `/payment-reports/${created.id}/tenders/${qr.id}/confirm`,
      { reason: 'Intento cruzado' },
      orgB.id,
    );
    assert.equal(foreignConfirm.status, 404);
    const foreignQueue = await call('GET', 'foreignAccounting', '/payment-reports?view=queue', undefined, orgB.id);
    assert.equal(foreignQueue.status, 200);
    assert.equal(foreignQueue.body.items.length, 0);
    assert.equal(
      (await call('POST', 'advisor', '/payment-reports', qrCash({ customerId: foreignCustomerId }))).status,
      404,
    );
    // Verifying authority alone does not let Accounting author a report (report ≠ verify).
    assert.equal((await call('POST', 'accounting', '/payment-reports', qrCash())).status, 403);
    assert.equal((await call('POST', 'advisor', '/payment-reports', qrCash({ orderId: otherOrderId }))).status, 404);
    // Headers naming another tenant do not let a member act in it.
    const crossHeader = await call('GET', 'accounting', `/payment-reports/${created.id}`, undefined, orgB.id);
    assert.ok([401, 403, 404].includes(crossHeader.status), String(crossHeader.status));
  });

  it('lists only the open orders of a customer the actor may report on, for both reporters and verifiers', async () => {
    const mine = await call('GET', 'advisor', `/payment-reports/customers/${customerId}/orders`);
    assert.equal(mine.status, 200, mine.text);
    assert.deepEqual(mine.body.items.map((o: { id: string }) => o.id).sort(), [orderId, orderTwoId].sort());
    assert.equal(typeof mine.body.items[0].totalCentavos, 'string');
    const verifier = await call('GET', 'accounting', `/payment-reports/customers/${customerId}/orders`);
    assert.equal(verifier.status, 200);
    assert.equal(verifier.body.items.length, 2);
    assert.equal((await call('GET', 'otherAdvisor', `/payment-reports/customers/${customerId}/orders`)).status, 404);
    assert.equal((await call('GET', 'stranger', `/payment-reports/customers/${customerId}/orders`)).status, 403);
    assert.equal((await call('GET', 'advisor', `/payment-reports/customers/${foreignCustomerId}/orders`)).status, 404);
    assert.equal(
      (await call('GET', 'foreignAccounting', `/payment-reports/customers/${customerId}/orders`, undefined, orgB.id)).status,
      404,
    );
    await prisma().osOrder.update({ where: { id: orderTwoId }, data: { status: 'cancelled' } });
    const afterCancel = await call('GET', 'advisor', `/payment-reports/customers/${customerId}/orders`);
    assert.deepEqual(afterCancel.body.items.map((o: { id: string }) => o.id), [orderId]);
    await prisma().osOrder.update({ where: { id: orderTwoId }, data: { status: 'open' } });
  });

  // ---------------------------------------------------------------------------------------------
  // Per-tender verification
  // ---------------------------------------------------------------------------------------------

  it('verifies QR and cash separately; the aggregate is derived and never one misleading confirmed flag', async () => {
    const created = await report();
    const qr = created.tenders.find((t) => t.method === 'qr')!;
    const cash = created.tenders.find((t) => t.method === 'cash')!;

    // Cash without a known receiver cannot be confirmed.
    const blocked = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${cash.id}/confirm`, { reason: 'Caja' });
    assert.equal(blocked.status, 409);
    assert.match(blocked.text, /RECIPIENT_UNRESOLVED/);

    // A reason is required.
    const noReason = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${qr.id}/confirm`, {});
    assert.equal(noReason.status, 400);

    const confirmQr = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${qr.id}/confirm`, {
      reason: 'Abono visto en el extracto del banco',
    });
    assert.equal(confirmQr.status, 201, confirmQr.text);
    const partial = confirmQr.body.report;
    assert.equal(partial.totals.state, 'partially_verified');
    assert.equal(partial.totals.confirmedCentavos, '20000');
    assert.equal(partial.totals.pendingCentavos, '107000');
    assert.equal(partial.totals.unassignedCentavos, '20000');
    assert.equal(partial.tenders.find((t: { id: string }) => t.id === qr.id).verification, 'confirmed');
    assert.equal(partial.tenders.find((t: { id: string }) => t.id === cash.id).verification, 'pending');
    const outcome = partial.tenders.find((t: { id: string }) => t.id === qr.id).outcomes[0];
    assert.equal(outcome.action, 'confirmed');
    assert.equal(outcome.actorMemberId, m.accounting.member.id);
    // Still not a single confirmed flag on the fact for a mixed payment.
    const fact = await prisma().osReportedOperationalFact.findFirstOrThrow({ where: { id: created.id } });
    assert.equal(fact.confirmation, 'pending');

    // Later, the receiver is identified and a different accountant confirms the cash.
    const resolved = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${cash.id}/resolve-recipient`, {
      recipientMemberId: m.receiver.member.id,
      reason: 'Lo confirmó caja',
    });
    assert.equal(resolved.status, 201, resolved.text);
    assert.equal(resolved.body.report.tenders.find((t: { id: string }) => t.id === cash.id).cashRecipientMemberId, m.receiver.member.id);
    const confirmCash = await call('POST', 'accountingTwo', `/payment-reports/${created.id}/tenders/${cash.id}/confirm`, {
      reason: 'Efectivo contado y recibido en caja',
    });
    assert.equal(confirmCash.status, 201, confirmCash.text);
    assert.equal(confirmCash.body.report.totals.state, 'confirmed');
    assert.equal(confirmCash.body.report.totals.confirmedCentavos, '127000');

    // Reload shows the same derived outcome.
    const reloaded = await call('GET', 'advisor', `/payment-reports/${created.id}`);
    assert.deepEqual(reloaded.body.report.totals, confirmCash.body.report.totals);
    // Deciding again is a conflict, not an overwrite.
    const again = await call('POST', 'accountingTwo', `/payment-reports/${created.id}/tenders/${qr.id}/reject`, { reason: 'Cambié de idea' });
    assert.equal(again.status, 409);
    assert.match(again.text, /TENDER_ALREADY_DECIDED/);
  });

  it('retrying the same confirmation is not a second outcome; two simultaneous verifiers have one winner', async () => {
    const created = await report('advisor', cashKnown('45000'));
    const tender = created.tenders[0]!;
    const path = `/payment-reports/${created.id}/tenders/${tender.id}/confirm`;
    const [one, two] = await Promise.all([
      call('POST', 'accounting', path, { reason: 'Conteo en caja uno' }),
      call('POST', 'accountingTwo', path, { reason: 'Conteo en caja dos' }),
    ]);
    assert.deepEqual([one.status, two.status].sort(), [201, 409]);
    const events = await prisma().osPaymentTenderEvent.findMany({ where: { tenderId: tender.id } });
    assert.equal(events.length, 1);
    const winner = one.status === 201 ? 'accounting' : 'accountingTwo';
    const reason = one.status === 201 ? 'Conteo en caja uno' : 'Conteo en caja dos';
    const retry = await call('POST', winner, path, { reason });
    assert.equal(retry.status, 201);
    assert.equal(retry.body.replayed, true);
    assert.equal(await prisma().osPaymentTenderEvent.count({ where: { tenderId: tender.id } }), 1);
  });

  it('rejection is its own outcome; a rejected tender cannot later be confirmed or allocated', async () => {
    const created = await report('advisor', cashKnown('9000'));
    const tender = created.tenders[0]!;
    const rejected = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${tender.id}/reject`, {
      reason: 'No aparece en caja',
    });
    assert.equal(rejected.status, 201);
    assert.equal(rejected.body.report.totals.state, 'rejected');
    assert.equal(rejected.body.report.totals.confirmedCentavos, '0');
    const late = await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${tender.id}/confirm`, { reason: 'Ahora sí' });
    assert.equal(late.status, 409);
    const allocate = await call('POST', 'accounting', `/payment-reports/${created.id}/allocations`, { orderId, amountCentavos: '100' });
    assert.equal(allocate.status, 409);
    assert.match(allocate.text, /OVER_ALLOCATION/);
  });

  it('a confirmed tender is only corrected by an authorized reversal with a linked replacement; the original stays', async () => {
    const created = await report('advisor', cashKnown('60000'));
    const tender = created.tenders[0]!;
    const base = `/payment-reports/${created.id}/tenders/${tender.id}`;
    // Pending tender cannot be reversed.
    assert.equal((await call('POST', 'accounting', `${base}/reverse`, { reason: 'Error de monto' })).status, 409);
    assert.equal((await call('POST', 'accounting', `${base}/confirm`, { reason: 'Efectivo contado' })).status, 201);
    assert.equal((await call('POST', 'advisor', `${base}/reverse`, { reason: 'Error de monto' })).status, 403);

    // Allocated funds must be released first.
    const allocated = await call('POST', 'accounting', `/payment-reports/${created.id}/allocations`, { orderId, amountCentavos: '40000' });
    assert.equal(allocated.status, 201, allocated.text);
    const blocked = await call('POST', 'accounting', `${base}/reverse`, { reason: 'Error de monto' });
    assert.equal(blocked.status, 409);
    assert.match(blocked.text, /RELEASE_ALLOCATIONS_FIRST/);
    const allocationId = allocated.body.report.allocations[0].id;
    const released = await call('POST', 'accounting', `/payment-reports/${created.id}/allocations/${allocationId}/release`, {
      reason: 'Se asignará al pedido correcto',
    });
    assert.equal(released.status, 201, released.text);
    assert.equal(released.body.report.totals.allocatedCentavos, '0');

    const reversed = await call('POST', 'accounting', `${base}/reverse`, {
      reason: 'El monto correcto era Bs 550',
      replacement: {
        paidOn: today,
        note: 'Reemplazo por error de monto',
        tenders: [{ method: 'cash', amountCentavos: '55000', cashRecipientMemberId: m.receiver.member.id }],
      },
    });
    assert.equal(reversed.status, 201, reversed.text);
    assert.equal(reversed.body.report.totals.state, 'reversed');
    assert.equal(reversed.body.report.totals.confirmedCentavos, '0');
    assert.equal(reversed.body.report.tenders[0].amountCentavos, '60000');
    assert.deepEqual(reversed.body.report.tenders[0].outcomes.map((o: { action: string }) => o.action), ['confirmed', 'reversed']);
    const replacement = reversed.body.replacement;
    assert.equal(replacement.correctsReportId, created.id);
    assert.equal(replacement.totals.state, 'pending');
    assert.equal(replacement.tenders[0].replacesTenderId, tender.id);
    // The original amount can never be rewritten.
    await assert.rejects(
      prisma().osPaymentTender.update({ where: { id: tender.id }, data: { amountCentavos: 1n } }),
    );
    // Reversed is final.
    assert.equal((await call('POST', 'accounting', `${base}/confirm`, { reason: 'Reabrir' })).status, 409);
    assert.equal((await call('POST', 'accounting', `${base}/reverse`, { reason: 'Otra vez' })).status, 409);
  });

  // ---------------------------------------------------------------------------------------------
  // Allocation
  // ---------------------------------------------------------------------------------------------

  it('allocates explicitly, never over-allocates, leaves the rest unassigned and never picks an order for you', async () => {
    const created = await report('advisor', cashKnown('100000'));
    const tender = created.tenders[0]!;
    const at = `/payment-reports/${created.id}/allocations`;
    // Nothing confirmed yet: nothing to allocate.
    const early = await call('POST', 'accounting', at, { orderId, amountCentavos: '1000' });
    assert.equal(early.status, 409);
    assert.match(early.text, /OVER_ALLOCATION/);
    await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${tender.id}/confirm`, { reason: 'Contado en caja' });
    const afterConfirm = await call('GET', 'accounting', `/payment-reports/${created.id}`);
    assert.deepEqual(afterConfirm.body.report.allocations, []);
    assert.equal(afterConfirm.body.report.totals.unassignedCentavos, '100000');

    const first = await call('POST', 'accounting', at, { orderId, amountCentavos: '60000' }, orgA.id, { 'idempotency-key': `al-${createId()}` });
    assert.equal(first.status, 201, first.text);
    assert.equal(first.body.report.totals.allocatedCentavos, '60000');
    assert.equal(first.body.report.totals.unassignedCentavos, '40000');
    const over = await call('POST', 'accounting', at, { orderId: orderTwoId, amountCentavos: '40001' });
    assert.equal(over.status, 409);
    assert.match(over.text, /OVER_ALLOCATION/);
    // Another customer's order and a missing order read as not found.
    assert.equal((await call('POST', 'accounting', at, { orderId: otherOrderId, amountCentavos: '100' })).status, 404);
    assert.equal((await call('POST', 'accounting', at, { orderId: createId(), amountCentavos: '100' })).status, 404);
    for (const amount of ['0', '-1', '1.5']) {
      assert.equal((await call('POST', 'accounting', at, { orderId, amountCentavos: amount })).status, 400, amount);
    }
    const second = await call('POST', 'accounting', at, { orderId: orderTwoId, amountCentavos: '25000' });
    assert.equal(second.status, 201, second.text);
    assert.equal(second.body.report.totals.unassignedCentavos, '15000');
    assert.equal(second.body.report.allocations.length, 2);

    // Retrying the same keyed allocation does not allocate twice.
    const key = `al-retry-${createId()}`;
    const keyed = await call('POST', 'accounting', at, { orderId, amountCentavos: '5000' }, orgA.id, { 'idempotency-key': key });
    assert.equal(keyed.status, 201, keyed.text);
    const keyedRetry = await call('POST', 'accounting', at, { orderId, amountCentavos: '5000' }, orgA.id, { 'idempotency-key': key });
    assert.equal(keyedRetry.status, 201);
    assert.equal(keyedRetry.body.replayed, true);
    assert.equal(keyedRetry.body.report.totals.allocatedCentavos, '90000');

    // Simultaneous allocations of the remaining 10000: the database keeps the limit.
    const racers = await Promise.all(
      [orderId, orderTwoId, orderId, orderTwoId].map((order) => call('POST', 'accounting', at, { orderId: order, amountCentavos: '6000' })),
    );
    assert.equal(racers.filter((r) => r.status === 201).length, 1, JSON.stringify(racers.map((r) => r.status)));
    const final = await call('GET', 'accounting', `/payment-reports/${created.id}`);
    assert.equal(final.body.report.totals.allocatedCentavos, '96000');
    // The database alone also refuses to over-allocate or cross customers.
    await assert.rejects(
      prisma().osPaymentAllocation.create({
        data: {
          id: createId(),
          organizationId: orgA.id,
          factId: created.id,
          orderId,
          amountCentavos: 999999n,
          allocatedByMemberId: m.accounting.member.id,
          allocatedByLabel: 'Directo',
        },
      }),
    );
    await assert.rejects(
      prisma().osPaymentAllocation.create({
        data: {
          id: createId(),
          organizationId: orgA.id,
          factId: created.id,
          orderId: otherOrderId,
          amountCentavos: 1n,
          allocatedByMemberId: m.accounting.member.id,
          allocatedByLabel: 'Directo',
        },
      }),
    );
  });

  // ---------------------------------------------------------------------------------------------
  // Private evidence
  // ---------------------------------------------------------------------------------------------

  it('stores evidence privately: signature decides the type, size is capped, strangers get 404, never a confirmation', async () => {
    const created = await report();
    const qr = created.tenders.find((t) => t.method === 'qr')!;
    const ok = await upload('advisor', `/payment-reports/${created.id}/evidence?fileName=comprobante.png&tenderId=${qr.id}`, PNG, 'image/png');
    assert.equal(ok.status, 201);
    const stored = ((await ok.json()) as { report: { evidence: Array<{ id: string; contentType: string; tenderId: string | null }>; tenders: Array<{ verification: string }> } }).report;
    assert.equal(stored.evidence.length, 1);
    assert.equal(stored.evidence[0]!.contentType, 'image/png');
    assert.equal(stored.evidence[0]!.tenderId, qr.id);
    // An image never confirms anything.
    assert.deepEqual(stored.tenders.map((t) => t.verification), ['pending', 'pending']);
    assert.equal(await prisma().osPaymentTenderEvent.count({ where: { tenderId: qr.id } }), 0);
    // The same file again is one file.
    const dup = await upload('advisor', `/payment-reports/${created.id}/evidence?tenderId=${qr.id}`, PNG, 'image/png');
    assert.equal(((await dup.json()) as { report: { evidence: unknown[] } }).report.evidence.length, 1);

    // A lying header does not make text an image.
    const text = await upload('advisor', `/payment-reports/${created.id}/evidence`, Buffer.from('<script>alert(1)</script>'), 'image/png');
    assert.equal(text.status, 415);
    const empty = await upload('advisor', `/payment-reports/${created.id}/evidence`, Buffer.alloc(0), 'image/png');
    assert.equal(empty.status, 400);
    const big = await upload('advisor', `/payment-reports/${created.id}/evidence`, Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 1)]), 'image/png');
    assert.equal(big.status, 413);

    const evidenceId = stored.evidence[0]!.id;
    const seen = await download('accounting', `/payment-reports/${created.id}/evidence/${evidenceId}`);
    assert.equal(seen.status, 200);
    assert.equal(seen.headers.get('content-type'), 'image/png');
    assert.match(seen.headers.get('cache-control') ?? '', /no-store/);
    assert.equal(seen.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await seen.arrayBuffer()), PNG);
    assert.equal((await download('advisor', `/payment-reports/${created.id}/evidence/${evidenceId}`)).status, 200);
    assert.equal((await download('stranger', `/payment-reports/${created.id}/evidence/${evidenceId}`)).status, 404);
    assert.equal((await download('otherAdvisor', `/payment-reports/${created.id}/evidence/${evidenceId}`)).status, 404);
    assert.equal((await download('foreignAccounting', `/payment-reports/${created.id}/evidence/${evidenceId}`, orgB.id)).status, 404);
    // A stranger cannot attach files either, and the public list carries no bytes.
    assert.equal((await upload('stranger', `/payment-reports/${created.id}/evidence`, PNG)).status, 404);
    const detail = await call('GET', 'advisor', `/payment-reports/${created.id}`);
    assert.doesNotMatch(detail.text, /content"/);
  });

  // ---------------------------------------------------------------------------------------------
  // Queue and notices
  // ---------------------------------------------------------------------------------------------

  it('gives Accounting a scoped "Por verificar" queue without customer-wide read, and tells the reporter and owner the outcome', async () => {
    const created = await report();
    const queue = await call('GET', 'accounting', '/payment-reports?view=queue');
    assert.equal(queue.status, 200);
    assert.ok(queue.body.items.some((item: { id: string }) => item.id === created.id));
    assert.equal(typeof queue.body.queueCount, 'number');
    assert.ok(queue.body.queueCount >= 1);
    // Oldest first, and only reports with something left to verify.
    for (const item of queue.body.items) {
      assert.ok(item.tenders.some((t: { verification: string }) => t.verification === 'pending'));
    }
    const customerRead = await call('GET', 'accounting', `/parties/${customerId}`);
    assert.ok([403, 404].includes(customerRead.status), 'payments.confirm does not open the customer file');

    const notified = await prisma().osInternalNotification.findMany({
      where: { organizationId: orgA.id, kind: 'payment_to_verify', sourceRecordId: created.id },
    });
    const recipients = new Set(notified.map((n) => n.recipientMemberId));
    assert.ok(recipients.has(m.accounting.member.id) && recipients.has(m.accountingTwo.member.id));
    assert.ok(!recipients.has(m.advisor.member.id));

    const qr = created.tenders.find((t) => t.method === 'qr')!;
    await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${qr.id}/confirm`, { reason: 'Abono en el extracto' });
    const outcomes = await prisma().osInternalNotification.findMany({
      where: { organizationId: orgA.id, kind: 'payment_outcome', sourceRecordId: created.id },
    });
    assert.ok(outcomes.some((n) => n.recipientMemberId === m.advisor.member.id), 'reporter and account owner learn the outcome');
    assert.ok(outcomes.every((n) => n.recipientMemberId !== m.accounting.member.id), 'the actor is not told about themself');
    const advisorList = await call('GET', 'advisor', '/payment-reports');
    assert.equal(advisorList.status, 200);
    assert.ok(advisorList.body.items.some((item: { id: string }) => item.id === created.id));
    assert.equal(advisorList.body.queueCount, null);
  });

  it('a fully verified report leaves the queue, and its "to verify" notices are resolved', async () => {
    const created = await report('advisor', cashKnown('7000'));
    await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${created.tenders[0]!.id}/confirm`, { reason: 'Efectivo contado' });
    const queue = await call('GET', 'accounting', '/payment-reports?view=queue&limit=100');
    assert.ok(!queue.body.items.some((item: { id: string }) => item.id === created.id));
    const open = await prisma().osInternalNotification.count({
      where: { organizationId: orgA.id, kind: 'payment_to_verify', sourceRecordId: created.id, resolvedAt: null },
    });
    assert.equal(open, 0);
  });

  it('feeds the customer archive check: a tender to verify or funds not assigned to an order block archiving', async () => {
    const archiveFacts = (partyId: string) => new PrismaOsPartyStore(prisma()).customerArchiveFacts(orgA.id, partyId);
    const lonely = await seedCustomer(orgA.id, 'Cliente Archivo B6', m.advisor.member.id);
    const lonelyOrder = await seedOrder(orgA.id, lonely, m.advisor.member.id);
    const clean = await archiveFacts(lonely);
    assert.deepEqual([clean.pendingPayments, clean.unassignedPayments], [0, 0]);

    const created = await report('advisor', cashKnown('50000', { customerId: lonely }));
    const pending = await archiveFacts(lonely);
    assert.deepEqual([pending.pendingPayments, pending.unassignedPayments], [1, 0]);

    await call('POST', 'accounting', `/payment-reports/${created.id}/tenders/${created.tenders[0]!.id}/confirm`, { reason: 'Contado en caja' });
    const unassigned = await archiveFacts(lonely);
    assert.deepEqual([unassigned.pendingPayments, unassigned.unassignedPayments], [0, 1]);

    const partly = await call('POST', 'accounting', `/payment-reports/${created.id}/allocations`, { orderId: lonelyOrder, amountCentavos: '20000' });
    assert.equal(partly.status, 201, partly.text);
    assert.equal((await archiveFacts(lonely)).unassignedPayments, 1, 'a remainder is still unassigned');
    const rest = await call('POST', 'accounting', `/payment-reports/${created.id}/allocations`, { orderId: lonelyOrder, amountCentavos: '30000' });
    assert.equal(rest.status, 201, rest.text);
    const settled = await archiveFacts(lonely);
    assert.deepEqual([settled.pendingPayments, settled.unassignedPayments], [0, 0]);

    // Another customer's payments never leak into this customer's check.
    assert.deepEqual([(await archiveFacts(otherCustomerId)).pendingPayments], [0]);
  });

  // ---------------------------------------------------------------------------------------------
  // Payment instructions
  // ---------------------------------------------------------------------------------------------

  it('with nothing approved, says so and offers no destination at all', async () => {
    const res = await call('GET', 'advisor', '/payment-instructions/current');
    assert.equal(res.status, 200);
    assert.equal(res.body.absent, true);
    assert.deepEqual(res.body.items, []);
    assert.equal(res.body.absentCopy, 'No hay instrucciones de pago aprobadas para compartir');
    assert.equal(res.body.canPublish, false);
  });

  it('versions instructions: another publisher approves, a QR needs its file, a replacement retires the old one, a retire ends it', async () => {
    assert.equal(
      (await call('POST', 'advisor', '/payment-instructions', { method: 'transfer', holderLabel: 'X', bankName: 'B', accountReference: '1' })).status,
      403,
    );
    assert.equal((await call('GET', 'accounting', '/payment-instructions')).status, 403);

    const draft = await call('POST', 'publisher', '/payment-instructions', {
      method: 'transfer',
      holderLabel: 'Empresa Sintética SRL',
      bankName: 'Banco de Prueba',
      accountReference: '000-0000-SINT',
      publicNote: 'Datos sintéticos de prueba',
    });
    assert.equal(draft.status, 201, draft.text);
    const id = draft.body.instruction.id as string;
    assert.equal(draft.body.instruction.status, 'draft');
    // Still nothing public.
    assert.equal((await call('GET', 'advisor', '/payment-instructions/current')).body.absent, true);
    // The drafter cannot publish their own destination.
    const self = await call('POST', 'publisher', `/payment-instructions/${id}/publish`);
    assert.equal(self.status, 403);
    assert.match(self.text, /SAME_PERSON_CANNOT_PUBLISH/);
    assert.equal((await call('POST', 'advisor', `/payment-instructions/${id}/publish`)).status, 403);
    assert.equal((await call('POST', 'accounting', `/payment-instructions/${id}/publish`)).status, 403);

    const published = await call('POST', 'publisherTwo', `/payment-instructions/${id}/publish`);
    assert.equal(published.status, 201, published.text);
    assert.equal(published.body.instruction.status, 'published');
    const current = await call('GET', 'advisor', '/payment-instructions/current');
    assert.equal(current.body.absent, false);
    assert.equal(current.body.items.length, 1);
    assert.match(current.body.items[0].shareText, /Empresa Sintética SRL/);
    assert.match(current.body.items[0].shareText, /000-0000-SINT/);
    assert.equal((await call('GET', 'advisor', `/payment-instructions/${id}/share-check`)).status, 200);

    // A QR draft cannot be published without the approved file; the file must be a real image.
    const qrDraft = await call('POST', 'publisher', '/payment-instructions', { method: 'qr', holderLabel: 'Empresa Sintética SRL' });
    const qrId = qrDraft.body.instruction.id as string;
    const noFile = await call('POST', 'publisherTwo', `/payment-instructions/${qrId}/publish`);
    assert.equal(noFile.status, 409);
    assert.match(noFile.text, /QR_FILE_REQUIRED/);
    assert.equal((await upload('publisher', `/payment-instructions/${qrId}/qr`, Buffer.from('not an image'))).status, 415);
    assert.equal((await upload('advisor', `/payment-instructions/${qrId}/qr`, PNG)).status, 403);
    assert.equal((await upload('publisher', `/payment-instructions/${qrId}/qr`, PNG, 'image/png')).status, 201);
    assert.equal((await download('advisor', `/payment-instructions/${qrId}/qr`)).status, 404, 'a draft QR is not public');
    assert.equal((await call('POST', 'publisherTwo', `/payment-instructions/${qrId}/publish`)).status, 201);
    const qrFile = await download('advisor', `/payment-instructions/${qrId}/qr`);
    assert.equal(qrFile.status, 200);
    assert.deepEqual(Buffer.from(await qrFile.arrayBuffer()), PNG);

    // Replacing the transfer version retires the old one at once; a share built from it is refused.
    const next = await call('POST', 'publisherTwo', '/payment-instructions', {
      method: 'transfer',
      holderLabel: 'Empresa Sintética SRL',
      bankName: 'Banco de Prueba',
      accountReference: '999-9999-NUEVA',
    });
    assert.equal((await call('POST', 'publisher', `/payment-instructions/${next.body.instruction.id}/publish`)).status, 201);
    const stale = await call('GET', 'advisor', `/payment-instructions/${id}/share-check`);
    assert.equal(stale.status, 409);
    assert.match(stale.text, /INSTRUCTIONS_CHANGED/);
    const afterReplace = await call('GET', 'advisor', '/payment-instructions/current');
    assert.equal(afterReplace.body.items.length, 2);
    assert.ok(afterReplace.body.items.every((item: { shareText: string }) => !item.shareText.includes('000-0000-SINT')));

    // Retiring ends it immediately; with none left the honest empty state returns.
    for (const item of afterReplace.body.items) {
      const retired = await call('POST', 'publisher', `/payment-instructions/${item.instruction.id}/retire`, { reason: 'Cambio de cuenta' });
      assert.equal(retired.status, 201, retired.text);
      assert.equal((await call('GET', 'advisor', `/payment-instructions/${item.instruction.id}/share-check`)).status, 409);
    }
    const none = await call('GET', 'advisor', '/payment-instructions/current');
    assert.equal(none.body.absent, true);
    const history = await call('GET', 'publisher', '/payment-instructions');
    assert.ok(history.body.items.length >= 3);
    assert.ok(history.body.items.every((item: { status: string }) => item.status !== 'published'));
    // Other tenants never see these versions.
    const foreign = await call('GET', 'foreignAccounting', '/payment-instructions/current', undefined, orgB.id);
    assert.equal(foreign.body.absent, true);
  });
});
