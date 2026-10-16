import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_PROJECTION_RUNNER, OS_STORE } from './os-store.module';
import type { ProjectionRunner } from '@isalwa/os-query';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * T03 (2026-10-16 18:44 clarifications): customer registration and command-by-command
 * commercial authority. Real Nest app over HTTP, real disposable Postgres. Every denial
 * is checked on status, exact body, and unchanged rows.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('T03 customer authority over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let orgA: { id: string };
  let orgB: { id: string };
  const m: Record<string, Seeded> = {};
  const phone = `7${String(Date.now()).slice(-7)}`;

  function headers(orgId: string, who: Seeded, key?: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': orgId,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      ...(key ? { 'idempotency-key': key } : {}),
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>, opts: { org?: string; key?: string } = {}): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(opts.org ?? orgA.id, m[who]!, opts.key),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string, opts: { org?: string } = {}): Promise<Reply & { text: string }> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(opts.org ?? orgA.id, m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {}, text };
  }

  async function seedMember(orgId: string, name: string, roleKeys: string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(orgId, `${name}-${createId()}@t03.bo`, name, 'T03');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({
        where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
      });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: orgId, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const customerBody = (name: string, extra: Record<string, unknown> = {}) => ({
    partyKind: 'organization',
    displayName: name,
    contact: { givenName: 'Rosa', familyName: 'Quispe' },
    phone,
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    ...extra,
  });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    orgA = await store.seedOrganization('T03 Org A', `t03-a-${createId()}`);
    orgB = await store.seedOrganization('T03 Org B', `t03-b-${createId()}`);
    m.seller = await seedMember(orgA.id, 'seller', ['commercial.customer.create', 'commercial.quote.convert.own']);
    m.otherSeller = await seedMember(orgA.id, 'otherSeller', ['commercial.customer.create']);
    m.helper = await seedMember(orgA.id, 'helper', ['commercial.quote.convert.own']);
    m.steward = await seedMember(orgA.id, 'steward', ['master_data.admin']);
    // T03 19:30: reassign needs explicit assignment scope; a grantor delegates only what it holds.
    m.manager = await seedMember(orgA.id, 'manager', [
      'commercial.account.reassign',
      'commercial.assignment.org',
      'commercial.customer.edit',
      'commercial.order.convert',
    ]);
    m.assigner = await seedMember(orgA.id, 'assigner', ['commercial.account.reassign', 'commercial.assignment.org']);
    m.reassignOnly = await seedMember(orgA.id, 'reassignOnly', ['commercial.account.reassign']);
    m.orgReassign = await seedMember(orgA.id, 'orgReassign', ['commercial.account.reassign', 'commercial.org.read']);
    m.teamMgr = await seedMember(orgA.id, 'teamMgr', ['commercial.account.reassign', 'commercial.team.read']);
    m.outsideMgr = await seedMember(orgA.id, 'outsideMgr', ['commercial.account.reassign', 'commercial.team.read']);
    m.teamSeller = await seedMember(orgA.id, 'teamSeller', ['commercial.quote.convert.own']);
    m.peopleAdmin = await seedMember(orgA.id, 'peopleAdmin', ['people.admin']);
    m.sellerB = await seedMember(orgB.id, 'sellerB', ['commercial.customer.create']);
    const managerScopes = ['commercial.team.read', 'commercial.customer.edit', 'commercial.work.manage'];
    m.lead = await seedMember(orgA.id, 'lead', managerScopes);
    m.readLead = await seedMember(orgA.id, 'readLead', ['commercial.team.read']);
    m.outsideLead = await seedMember(orgA.id, 'outsideLead', managerScopes);
    m.endedLead = await seedMember(orgA.id, 'endedLead', managerScopes);
    m.leadB = await seedMember(orgB.id, 'leadB', ['commercial.org.read', 'commercial.customer.edit', 'commercial.work.manage']);
    const team = async (managerMemberId: string, memberId: string, endedAt: Date | null = null) =>
      prisma().osManagerAssignment.create({
        data: { id: createId(), organizationId: orgA.id, memberId, managerMemberId, effectiveAt: new Date('2020-01-01'), endedAt },
      });
    await team(m.lead.member.id, m.seller.member.id);
    await team(m.readLead.member.id, m.seller.member.id);
    await team(m.outsideLead.member.id, m.otherSeller.member.id);
    await team(m.endedLead.member.id, m.seller.member.id, new Date('2026-01-01'));
    await team(m.teamMgr.member.id, m.seller.member.id);
    await team(m.teamMgr.member.id, m.teamSeller.member.id);
    await team(m.outsideMgr.member.id, m.otherSeller.member.id);
  });

  after(async () => {
    await app.close();
  });

  const state: { partyId: string; accountId: string; quoteId: string } = { partyId: '', accountId: '', quoteId: '' };

  it('seller registers a customer and immediately quotes it (item 6, actual command path)', async () => {
    const key = `t03-create-${createId()}`;
    const [created, raced] = await Promise.all([
      command('seller', 'CreateParty', customerBody('Constructora Andina T03'), { key }),
      command('seller', 'CreateParty', customerBody('Constructora Andina T03'), { key }),
    ]);
    assert.equal(created.status, 201);
    assert.equal(raced.status, 201);
    const data = created.body.data as Record<string, unknown>;
    assert.equal((raced.body.data as Record<string, unknown>).partyId, data.partyId);
    state.partyId = String(data.partyId);
    assert.equal(data.accountOwnerMemberId, m.seller!.member.id);
    assert.equal(JSON.stringify(created.body).includes(phone), false);
    assert.equal(await prisma().osParty.count({ where: { organizationId: orgA.id } }), 1);
    const account = await prisma().osCommercialAccount.findFirstOrThrow({ where: { organizationId: orgA.id, partyId: state.partyId } });
    assert.equal(account.ownerMemberId, m.seller!.member.id);
    state.accountId = account.id;

    const quote = await command('seller', 'CreateQuote', { partyId: state.partyId });
    assert.equal(quote.status, 201);
    state.quoteId = String((quote.body.data as Record<string, unknown>).quoteId);
    const row = await prisma().osQuote.findFirstOrThrow({ where: { id: state.quoteId } });
    assert.equal(row.ownerMemberId, m.seller!.member.id);
    assert.equal((await command('seller', 'AddQuoteLine', { quoteId: state.quoteId, description: 'Ladrillo 6H', quantity: 10, unitPriceCentavos: 150 })).status, 201);
    assert.equal((await command('seller', 'SubmitQuote', { quoteId: state.quoteId })).status, 201);
  });

  it('shared phone: generic 409 without a reason, second customer with a reason, no merge', async () => {
    const before = await prisma().osParty.count({ where: { organizationId: orgA.id } });
    const noReason = await command('otherSeller', 'CreateParty', customerBody('Otra Empresa T03'));
    assert.equal(noReason.status, 409);
    assert.deepEqual(noReason.body, { code: 'DUPLICATE_REVIEW_REQUIRED' });
    assert.equal(await prisma().osParty.count({ where: { organizationId: orgA.id } }), before);

    const withReason = await command('otherSeller', 'CreateParty', customerBody('Otra Empresa T03', { duplicateReason: 'Oficina compartida' }));
    assert.equal(withReason.status, 201);
    assert.equal(JSON.stringify(withReason.body).includes(state.partyId), false);
    assert.equal(await prisma().osParty.count({ where: { organizationId: orgA.id, status: 'active' } }), before + 1);
    assert.equal(await prisma().osPartyDuplicateCandidate.count({ where: { organizationId: orgA.id, matchReason: 'phone_shared' } }), 1);

    // Same phone in another company is not a match there.
    const foreign = await command('sellerB', 'CreateParty', customerBody('Empresa B T03'), { org: orgB.id });
    assert.equal(foreign.status, 201);
  });

  it('master_data.admin cannot quote, convert, cancel or approve (403, exact body, no writes)', async () => {
    const counts = async () => [
      await prisma().osQuote.count({ where: { organizationId: orgA.id } }),
      await prisma().osOrder.count({ where: { organizationId: orgA.id } }),
      await prisma().osBusinessEvent.count({ where: { organizationId: orgA.id } }),
    ];
    const approvalId = createId();
    await prisma().osApprovalRequest.create({
      data: {
        id: approvalId,
        organizationId: orgA.id,
        subjectType: 'quote',
        subjectId: state.quoteId,
        requestedByMemberId: m.seller!.member.id,
        approverMemberId: m.manager!.member.id,
        contextSnapshotJson: {},
      },
    });
    const before = await counts();
    for (const [name, body] of [
      ['CreateQuote', { partyId: state.partyId }],
      ['CreateOpportunity', { partyId: state.partyId, title: 'x' }],
      ['CreateOrder', { quoteId: state.quoteId }],
      ['CancelQuote', { quoteId: state.quoteId }],
      ['Approve', { approvalRequestId: approvalId }],
    ] as const) {
      const reply = await command('steward', name, body);
      assert.equal(reply.status, 403, name);
      assert.deepEqual(reply.body, { code: 'PERMISSION_DENIED' }, name);
    }
    assert.deepEqual(await counts(), before);
    assert.equal((await prisma().osApprovalRequest.findUniqueOrThrow({ where: { id: approvalId } })).status, 'pending');
  });

  it('nonexistent, foreign-tenant and inaccessible customers get the same 404 body', async () => {
    const foreignParty = await prisma().osParty.findFirstOrThrow({ where: { organizationId: orgB.id } });
    const quotesBefore = await prisma().osQuote.count();
    for (const who of ['otherSeller', 'peopleAdmin', 'helper']) {
      const replies: Reply[] = [];
      for (const partyId of [createId(), foreignParty.id, state.partyId]) {
        replies.push(await command(who, 'CreateQuote', { partyId }));
      }
      for (const reply of replies) {
        assert.equal(reply.status, 404, who);
        assert.deepEqual(reply.body, { code: 'NOT_FOUND' }, who);
      }
    }
    const orderReplies = [
      await command('otherSeller', 'CreateOrder', { quoteId: createId() }),
      await command('otherSeller', 'CreateOrder', { quoteId: state.quoteId }),
    ];
    assert.deepEqual(orderReplies.map((r) => [r.status, r.body]), [[404, { code: 'NOT_FOUND' }], [404, { code: 'NOT_FOUND' }]]);
    assert.equal(await prisma().osQuote.count(), quotesBefore);
  });

  it('coverage must explicitly cover the action and never changes the owner', async () => {
    const grant = (coveredActions?: string[]) =>
      command('manager', 'GrantCustomerCoverage', {
        commercialAccountId: state.accountId,
        actingAdvisorMemberId: m.helper!.member.id,
        ...(coveredActions ? { coveredActions } : {}),
      });
    const revokeAll = async () => {
      for (const row of await prisma().osCustomerCoverageGrant.findMany({ where: { organizationId: orgA.id, revokedAt: null } })) {
        assert.equal((await command('manager', 'RevokeCustomerCoverage', { grantId: row.id })).status, 201);
      }
    };

    const archive = await grant(['customer.archive']);
    assert.equal(archive.status, 400);
    assert.deepEqual(archive.body, { code: 'VALIDATION_FAILED' });
    assert.equal(await prisma().osCustomerCoverageGrant.count({ where: { organizationId: orgA.id } }), 0);

    assert.equal((await grant(['customer.edit'])).status, 201);
    const editOnly = await command('helper', 'CreateQuote', { partyId: state.partyId });
    assert.deepEqual([editOnly.status, editOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    await revokeAll();

    assert.equal((await grant()).status, 201);
    const stored = await prisma().osCustomerCoverageGrant.findFirstOrThrow({ where: { organizationId: orgA.id, revokedAt: null } });
    assert.deepEqual(stored.coveredActions, ['commercial.work']);
    const covered = await command('helper', 'CreateQuote', { partyId: state.partyId });
    assert.equal(covered.status, 201);
    const coveredQuote = await prisma().osQuote.findUniqueOrThrow({ where: { id: String((covered.body.data as Record<string, unknown>).quoteId) } });
    assert.equal(coveredQuote.ownerMemberId, m.seller!.member.id);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: orgA.id, eventType: 'quote.created', primaryEntityId: coveredQuote.id } });
    assert.equal(event.actorMemberId, m.helper!.member.id);
    // commercial.work coverage does not convert, even with convert.own on the helper.
    const convert = await command('helper', 'CreateOrder', { quoteId: state.quoteId });
    assert.deepEqual([convert.status, convert.body], [403, { code: 'PERMISSION_DENIED' }]);
    const account = await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } });
    assert.equal(account.ownerMemberId, m.seller!.member.id);

    await revokeAll();
    const revoked = await command('helper', 'CreateQuote', { partyId: state.partyId });
    assert.deepEqual([revoked.status, revoked.body], [404, { code: 'NOT_FOUND' }]);
  });

  it('team manager with the action permissions edits the customer and quotes without owning or covering', async () => {
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    const edit = await command('lead', 'UpdateParty', {
      partyId: state.partyId,
      displayName: 'Constructora Andina SRL T03',
      expectedVersion: party.version,
    });
    assert.equal(edit.status, 201);
    const after = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    assert.equal(after.displayName, 'Constructora Andina SRL T03');
    assert.equal(after.version, party.version + 1);
    const history = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: orgA.id, eventType: 'party.updated', primaryEntityId: state.partyId },
      orderBy: { occurredAt: 'desc' },
    });
    assert.equal(history.actorMemberId, m.lead!.member.id);
    const audit = await prisma().osAuditLog.findFirstOrThrow({
      where: { organizationId: orgA.id, resourceId: state.partyId, action: 'party.updated' },
      orderBy: { createdAt: 'desc' },
    });
    assert.equal(audit.actorMemberId, m.lead!.member.id);
    assert.deepEqual(audit.beforeJson, { displayName: 'Constructora Andina T03', legalName: null });

    const stale = await command('lead', 'UpdateParty', { partyId: state.partyId, displayName: 'x', expectedVersion: party.version });
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const legal = await command('lead', 'UpdateParty', { partyId: state.partyId, legalName: 'Otra SRL', expectedVersion: after.version });
    assert.deepEqual([legal.status, legal.body], [400, { code: 'VALIDATION_FAILED' }]);

    const quote = await command('lead', 'CreateQuote', { partyId: state.partyId });
    assert.equal(quote.status, 201);
    const quoteRow = await prisma().osQuote.findUniqueOrThrow({ where: { id: String((quote.body.data as Record<string, unknown>).quoteId) } });
    assert.equal(quoteRow.ownerMemberId, m.seller!.member.id);
    const quoteEvent = await prisma().osBusinessEvent.findFirstOrThrow({ where: { eventType: 'quote.created', primaryEntityId: quoteRow.id } });
    assert.equal(quoteEvent.actorMemberId, m.lead!.member.id);
    assert.equal(
      (await command('lead', 'AddQuoteLine', { quoteId: quoteRow.id, description: 'Teja colonial', quantity: 5, unitPriceCentavos: 900 })).status,
      201,
    );

    const account = await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } });
    assert.equal(account.ownerMemberId, m.seller!.member.id);
    assert.equal(
      await prisma().osCustomerCoverageGrant.count({ where: { organizationId: orgA.id, actingAdvisorMemberId: m.lead!.member.id } }),
      0,
    );
    // Approval, conversion and order constraints stay with their own permissions.
    const convert = await command('lead', 'CreateOrder', { quoteId: state.quoteId });
    assert.deepEqual([convert.status, convert.body], [403, { code: 'PERMISSION_DENIED' }]);
  });

  it('read-only, outside-team, ended-team and cross-tenant managers are denied with no writes', async () => {
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    const quotesBefore = await prisma().osQuote.count();
    const editBody = { partyId: state.partyId, displayName: 'Intento', expectedVersion: party.version };

    for (const name of ['UpdateParty', 'CreateQuote'] as const) {
      const body = name === 'UpdateParty' ? editBody : { partyId: state.partyId };
      const readOnly = await command('readLead', name, body);
      assert.deepEqual([readOnly.status, readOnly.body], [403, { code: 'PERMISSION_DENIED' }], `readLead ${name}`);
      for (const who of ['outsideLead', 'endedLead']) {
        const reply = await command(who, name, body);
        assert.deepEqual([reply.status, reply.body], [404, { code: 'NOT_FOUND' }], `${who} ${name}`);
      }
      const foreign = await command('leadB', name, body, { org: orgB.id });
      const missing = await command('leadB', name, { ...body, partyId: createId() }, { org: orgB.id });
      assert.deepEqual([foreign.status, foreign.body], [404, { code: 'NOT_FOUND' }], `leadB ${name}`);
      assert.deepEqual(foreign, missing, `leadB ${name}`);
    }
    const unchanged = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    assert.equal(unchanged.version, party.version);
    assert.equal(unchanged.displayName, party.displayName);
    assert.equal(await prisma().osQuote.count(), quotesBefore);
  });

  async function submittedSellerQuote(): Promise<string> {
    const created = await command('seller', 'CreateQuote', { partyId: state.partyId });
    assert.equal(created.status, 201);
    const quoteId = String((created.body.data as Record<string, unknown>).quoteId);
    assert.equal((await command('seller', 'AddQuoteLine', { quoteId, description: 'Ladrillo 6H', quantity: 4, unitPriceCentavos: 150 })).status, 201);
    assert.equal((await command('seller', 'SubmitQuote', { quoteId })).status, 201);
    return quoteId;
  }

  it('coverage converts only with explicit quote.convert plus the advisor\'s own permission (T03 19:30)', async () => {
    const quoteId = await submittedSellerQuote();
    const ordersBefore = await prisma().osOrder.count({ where: { organizationId: orgA.id } });
    const grant = (who: string, coveredActions: string[], advisor = m.helper!) =>
      command(who, 'GrantCustomerCoverage', { commercialAccountId: state.accountId, actingAdvisorMemberId: advisor.member.id, coveredActions });

    // A grantor without conversion authority cannot delegate it.
    const overreach = await grant('assigner', ['commercial.work', 'quote.convert']);
    assert.deepEqual([overreach.status, overreach.body], [403, { code: 'PERMISSION_DENIED' }]);
    assert.equal(await prisma().osCustomerCoverageGrant.count({ where: { organizationId: orgA.id, revokedAt: null } }), 0);

    // Edit-only coverage does not convert.
    const edit = await grant('manager', ['customer.edit']);
    assert.equal(edit.status, 201);
    const editOnly = await command('helper', 'CreateOrder', { quoteId });
    assert.deepEqual([editOnly.status, editOnly.body], [403, { code: 'PERMISSION_DENIED' }]);
    await command('manager', 'RevokeCustomerCoverage', { grantId: String((edit.body.data as Record<string, unknown>).grantId) });

    // Explicit quote.convert, but the advisor lacks conversion permission.
    const noPerm = await grant('manager', ['commercial.work', 'quote.convert'], m.otherSeller!);
    assert.equal(noPerm.status, 201);
    const denied = await command('otherSeller', 'CreateOrder', { quoteId });
    assert.deepEqual([denied.status, denied.body], [403, { code: 'PERMISSION_DENIED' }]);
    await command('manager', 'RevokeCustomerCoverage', { grantId: String((noPerm.body.data as Record<string, unknown>).grantId) });
    assert.equal(await prisma().osOrder.count({ where: { organizationId: orgA.id } }), ordersBefore);

    // Revoked quote.convert coverage is no access at all.
    const toRevoke = await grant('manager', ['commercial.work', 'quote.convert']);
    await command('manager', 'RevokeCustomerCoverage', { grantId: String((toRevoke.body.data as Record<string, unknown>).grantId) });
    const revoked = await command('helper', 'CreateOrder', { quoteId });
    assert.deepEqual([revoked.status, revoked.body], [404, { code: 'NOT_FOUND' }]);

    // Allowed: explicit quote.convert + helper's convert.own. Owner and actor are both preserved.
    const allowed = await grant('manager', ['commercial.work', 'quote.convert']);
    assert.equal(allowed.status, 201);
    const stored = await prisma().osCustomerCoverageGrant.findUniqueOrThrow({ where: { id: String((allowed.body.data as Record<string, unknown>).grantId) } });
    assert.deepEqual(stored.coveredActions, ['commercial.work', 'quote.convert']);
    const converted = await command('helper', 'CreateOrder', { quoteId });
    assert.equal(converted.status, 201);
    const orderRow = await prisma().osOrder.findFirstOrThrow({ where: { organizationId: orgA.id, quoteId } });
    assert.equal(orderRow.ownerMemberId, m.seller!.member.id);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: orgA.id, eventType: 'order.created', primaryEntityId: orderRow.id } });
    assert.equal(event.actorMemberId, m.helper!.member.id);
    const payload = event.payloadJson as Record<string, unknown>;
    assert.equal(payload.primaryOwnerMemberId, m.seller!.member.id);
    assert.equal(payload.actingAdvisorMemberId, m.helper!.member.id);
    assert.equal(payload.conversionPath, 'coverage');
    assert.equal((await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } })).ownerMemberId, m.seller!.member.id);

    // Cross-tenant: the same quote id from another company is unknown.
    const foreign = await command('sellerB', 'CreateOrder', { quoteId }, { org: orgB.id });
    assert.deepEqual([foreign.status, foreign.body], [404, { code: 'NOT_FOUND' }]);
    await command('manager', 'RevokeCustomerCoverage', { grantId: stored.id });
  });

  it('data steward finds and reads legal fields without commercial data or authority (T03 19:30)', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const byName = await get('steward', `/master-data/parties?q=${encodeURIComponent('Andina SRL')}`);
    assert.equal(byName.status, 200);
    const ids = (byName.body.items as Array<{ partyId: string }>).map((i) => i.partyId);
    assert.ok(ids.includes(state.partyId), byName.text);
    for (const q of [phone, 'Rosa', 'Quispe']) {
      const miss = await get('steward', `/master-data/parties?q=${encodeURIComponent(q)}`);
      assert.equal(miss.status, 200, q);
      assert.deepEqual(miss.body.items, [], q);
    }
    const detail = await get('steward', `/master-data/parties/${state.partyId}`);
    assert.equal(detail.status, 200);
    assert.deepEqual(Object.keys(detail.body).sort(), [
      'activeRoleKeys', 'displayName', 'fiscalIdentities', 'legalName', 'mergedIntoPartyId', 'partyId', 'partyKind', 'status', 'version',
    ]);
    assert.equal(detail.text.includes(phone), false);
    assert.equal(detail.text.includes(m.seller!.member.id), false, 'no account owner');

    const foreignParty = await prisma().osParty.findFirstOrThrow({ where: { organizationId: orgB.id } });
    const foreign = await get('steward', `/master-data/parties/${foreignParty.id}`);
    const missing = await get('steward', `/master-data/parties/${createId()}`);
    assert.deepEqual([foreign.status, foreign.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual(foreign.body, missing.body);
    for (const who of ['lead', 'seller', 'peopleAdmin']) {
      const denied = await get(who, `/master-data/parties?q=Andina`);
      assert.deepEqual([denied.status, denied.body], [403, { code: 'PERMISSION_DENIED' }], who);
    }
    const quote = await command('steward', 'CreateQuote', { partyId: state.partyId });
    assert.deepEqual([quote.status, quote.body], [403, { code: 'PERMISSION_DENIED' }]);
  });

  it('reassignment needs the action permission AND explicit assignment scope (T03 19:30)', async () => {
    const reassign = (who: string, target: Seeded) =>
      command(who, 'ReassignCommercialAccountOwner', { commercialAccountId: state.accountId, ownerMemberId: target.member.id });
    const accountBefore = await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } });

    for (const [who, target, expected] of [
      ['reassignOnly', m.teamSeller!, [404, { code: 'NOT_FOUND' }]],
      ['orgReassign', m.teamSeller!, [403, { code: 'PERMISSION_DENIED' }]],
      ['outsideMgr', m.otherSeller!, [404, { code: 'NOT_FOUND' }]],
      ['teamMgr', m.otherSeller!, [403, { code: 'PERMISSION_DENIED' }]],
      ['lead', m.teamSeller!, [403, { code: 'PERMISSION_DENIED' }]],
    ] as const) {
      const reply = await reassign(who, target);
      assert.deepEqual([reply.status, reply.body], expected, who);
    }
    assert.equal((await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } })).version, accountBefore.version);

    // Same boundary for coverage administration.
    const teamGrantOutside = await command('teamMgr', 'GrantCustomerCoverage', {
      commercialAccountId: state.accountId,
      actingAdvisorMemberId: m.otherSeller!.member.id,
    });
    assert.deepEqual([teamGrantOutside.status, teamGrantOutside.body], [403, { code: 'PERMISSION_DENIED' }]);
    const teamGrant = await command('teamMgr', 'GrantCustomerCoverage', {
      commercialAccountId: state.accountId,
      actingAdvisorMemberId: m.teamSeller!.member.id,
    });
    assert.equal(teamGrant.status, 201);
    const grantId = String((teamGrant.body.data as Record<string, unknown>).grantId);

    // Pending draft by the old owner.
    const draft = await command('seller', 'CreateQuote', { partyId: state.partyId });
    const draftId = String((draft.body.data as Record<string, unknown>).quoteId);
    const quoteOwnersBefore = await prisma().osQuote.findMany({ where: { partyId: state.partyId }, select: { id: true, ownerMemberId: true } });
    const ordersBefore = await prisma().osOrder.findMany({ where: { partyId: state.partyId }, select: { id: true, ownerMemberId: true } });

    const moved = await reassign('teamMgr', m.teamSeller!);
    assert.equal(moved.status, 201);
    assert.equal((moved.body.data as Record<string, unknown>).assignmentAuthority, 'team');
    const account = await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } });
    assert.equal(account.ownerMemberId, m.teamSeller!.member.id);
    const ended = await prisma().osCustomerCoverageGrant.findUniqueOrThrow({ where: { id: grantId } });
    assert.ok(ended.revokedAt, 'coverage ended on reassignment');
    const event = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: orgA.id, eventType: 'commercial_account.owner_reassigned', primaryEntityId: state.accountId },
      orderBy: { occurredAt: 'desc' },
    });
    const payload = event.payloadJson as Record<string, unknown>;
    assert.equal(payload.previousOwnerMemberId, m.seller!.member.id);
    assert.deepEqual(payload.endedCoverageGrantIds, [grantId]);
    assert.equal(event.actorMemberId, m.teamMgr!.member.id);
    // Historical quote and order ownership (sales attribution) is not rewritten.
    assert.deepEqual(await prisma().osQuote.findMany({ where: { partyId: state.partyId }, select: { id: true, ownerMemberId: true } }), quoteOwnersBefore);
    assert.deepEqual(await prisma().osOrder.findMany({ where: { partyId: state.partyId }, select: { id: true, ownerMemberId: true } }), ordersBefore);

    // The new owner continues pending work; the old owner no longer reaches the account.
    const line = await command('teamSeller', 'AddQuoteLine', { quoteId: draftId, description: 'Teja', quantity: 2, unitPriceCentavos: 900 });
    assert.equal(line.status, 201);
    assert.equal((await prisma().osQuote.findUniqueOrThrow({ where: { id: draftId } })).ownerMemberId, m.seller!.member.id);
    const old = await command('seller', 'CreateQuote', { partyId: state.partyId });
    assert.deepEqual([old.status, old.body], [404, { code: 'NOT_FOUND' }]);
    const exHelper = await command('teamSeller', 'CreateQuote', { partyId: state.partyId });
    assert.equal(exHelper.status, 201, 'teamSeller now acts as owner, not via the ended coverage');

    // Cross-team transfer needs organization-wide assignment authority.
    const crossTeam = await reassign('teamMgr', m.otherSeller!);
    assert.deepEqual([crossTeam.status, crossTeam.body], [403, { code: 'PERMISSION_DENIED' }]);
    const orgMove = await reassign('assigner', m.otherSeller!);
    assert.equal(orgMove.status, 201);
    assert.equal((orgMove.body.data as Record<string, unknown>).assignmentAuthority, 'org');
    assert.equal((await prisma().osCommercialAccount.findUniqueOrThrow({ where: { id: state.accountId } })).ownerMemberId, m.otherSeller!.member.id);
  });
});
