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
 * T03 L3: archive (status inactive) is refused while the customer has an open order, commitment,
 * issue or work item; reactivation restores the customer only. Payments are reported as
 * unchecked. Real Nest app, disposable Postgres, synthetic members and records.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const bo = (number: string) => ({ country: 'BO', number });

describeHttp('T03 customer archive and reactivation over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  let runner: ProjectionRunner;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded, key = `t03-l3-${createId()}`): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      'idempotency-key': key,
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>, key?: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, { method: 'POST', headers: headers(m[who]!, key), body: JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function preview(who: string, partyId = ids.party!) {
    const res = await fetch(`${baseUrl}/v1/parties/${partyId}/archive-preview`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03l3.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const party = () => prisma().osParty.findUniqueOrThrow({ where: { id: ids.party! } });
  const archiveEvents = () => prisma().osBusinessEvent.count({ where: { organizationId: org.id, eventType: 'party.deactivated' } });

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    runner = moduleRef.get(OS_PROJECTION_RUNNER);
    org = await store.seedOrganization('T03 L3 Org', `t03-l3-${createId()}`);
    const lifecycle = ['commercial.customer.archive', 'commercial.customer.reactivate'];
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit', ...lifecycle]);
    m.editor = await seedMember('editor', ['commercial.customer.edit']);
    m.covered = await seedMember('covered', ['commercial.customer.edit', ...lifecycle]);
    m.stranger = await seedMember('stranger', lifecycle);
    m.reader = await seedMember('reader', ['commercial.org.read']);

    const created = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente Archivo L3',
      contact: { givenName: 'Contacto', familyName: 'Archivo' },
      phone: bo('70010001'),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const data = created.body.data as Record<string, unknown>;
    ids.party = String(data.partyId);
    ids.contact = String(data.contactId);
    for (const [member, actions, endsAt] of [
      [m.covered!, ['commercial.work', 'customer.edit'], null],
      [m.editor!, ['commercial.work'], new Date('2021-01-01')],
    ] as const) {
      await prisma().osCustomerCoverageGrant.create({
        data: {
          id: createId(),
          organizationId: org.id,
          customerPartyId: ids.party,
          primaryOwnerMemberId: m.owner!.member.id,
          actingAdvisorMemberId: member.member.id,
          coveredActions: [...actions],
          startsAt: new Date('2020-01-01'),
          endsAt,
          recordedAt: new Date('2020-01-01'),
        },
      });
    }
    const preference = await command('owner', 'SetContactFollowupPreference', {
      partyId: ids.party,
      contactId: ids.contact,
      channel: 'whatsapp',
      preference: 'no_promotions',
      source: 'staff_recorded',
      identityConfirmed: true,
      expectedVersion: 0,
    });
    assert.equal(preference.status, 201, JSON.stringify(preference.body));

    const owner = m.owner!.member.id;
    ids.openOpportunity = createId();
    ids.lostOpportunity = createId();
    await prisma().osOpportunity.createMany({
      data: [
        { id: ids.openOpportunity, organizationId: org.id, partyId: ids.party, ownerMemberId: owner, title: 'Ampliación de vitrinas', status: 'open' },
        { id: ids.lostOpportunity, organizationId: org.id, partyId: ids.party, ownerMemberId: owner, title: 'Temporada pasada', status: 'lost' },
      ],
    });
    ids.quote = createId();
    await prisma().osQuote.create({
      data: { id: ids.quote, organizationId: org.id, partyId: ids.party, ownerMemberId: owner, quoteNumber: `Q-L3-${createId()}`, status: 'accepted' },
    });
    ids.order = createId();
    await prisma().osOrder.create({
      data: {
        id: ids.order,
        organizationId: org.id,
        partyId: ids.party,
        quoteId: ids.quote,
        ownerMemberId: owner,
        orderNumber: `P-L3-${createId()}`,
        subtotalCentavos: 100000n,
        totalCentavos: 100000n,
        status: 'open',
      },
    });
    ids.commitment = createId();
    await prisma().osCommitment.create({
      data: { id: ids.commitment, organizationId: org.id, partyId: ids.party, ownerMemberId: owner, text: 'Llamar por entrega', origin: 'employee_entered', createdByMemberId: owner },
    });
    ids.issue = createId();
    await prisma().osIssue.create({
      data: { id: ids.issue, organizationId: org.id, status: 'triaged', description: 'Reclamo por color', reportedByMemberId: owner, reportedAt: new Date() },
    });
    await prisma().osIssueReference.create({
      data: { id: createId(), organizationId: org.id, issueId: ids.issue, referenceType: 'party', referenceId: ids.party, createdByMemberId: owner },
    });
    ids.workItem = createId();
    await prisma().osWorkItem.create({
      data: { id: ids.workItem, organizationId: org.id, ownerMemberId: owner, createdByMemberId: owner, title: 'Revisar saldo', subjectType: 'party', subjectId: ids.party, status: 'open' },
    });
  });

  after(async () => {
    await app.close();
  });

  const archive = (overrides: Record<string, unknown> = {}) => ({
    partyId: ids.party,
    expectedVersion: 0,
    reason: 'no_current_commercial_relationship',
    ...overrides,
  });

  it('previews open obligations as blocking, payments as unchecked, and effects separately', async () => {
    const reply = await preview('owner');
    assert.equal(reply.status, 200, JSON.stringify(reply.body));
    assert.deepEqual(reply.body, {
      partyId: ids.party,
      version: 0,
      status: 'active',
      obligations: { openOrders: 1, openCommitments: 1, openIssues: 1, openWorkItems: 1 },
      payments: { checked: false, reason: 'payments_not_available' },
      blocked: true,
      effects: { openOpportunities: 1, openQuotes: 0, currentContacts: 1 },
    });
    const expired = await preview('editor');
    assert.deepEqual([expired.status, expired.body], [404, { code: 'NOT_FOUND' }], 'expired coverage gives no access');
    const covered = await preview('covered');
    assert.deepEqual([covered.status, covered.body], [403, { code: 'PERMISSION_DENIED' }], 'coverage never confers archive');
    const stranger = await preview('stranger');
    const missing = await preview('stranger', createId());
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    assert.deepEqual([missing.status, missing.body], [stranger.status, stranger.body]);
  });

  it('refuses incomplete or unauthorized archive requests and changes nothing', async () => {
    const other = await command('owner', 'DeactivateParty', archive({ reason: 'other' }));
    assert.equal(other.status, 400);
    const unknown = await command('owner', 'DeactivateParty', archive({ reason: 'cleanup' }));
    assert.equal(unknown.status, 400);
    const noVersion = await command('owner', 'DeactivateParty', { partyId: ids.party, reason: 'no_longer_operating' });
    assert.equal(noVersion.status, 400);
    const covered = await command('covered', 'DeactivateParty', archive());
    assert.deepEqual([covered.status, covered.body], [403, { code: 'PERMISSION_DENIED' }]);
    const stranger = await command('stranger', 'DeactivateParty', archive());
    assert.deepEqual([stranger.status, stranger.body], [404, { code: 'NOT_FOUND' }]);
    const row = await party();
    assert.deepEqual([row.status, row.version], ['active', 0]);
    assert.equal(await archiveEvents(), 0);
  });

  it('each open obligation alone blocks archiving until it is closed', async () => {
    const closers: Array<[string, () => Promise<unknown>]> = [
      ['order', () => prisma().osOrder.update({ where: { id: ids.order! }, data: { status: 'cancelled' } })],
      ['commitment', () => prisma().osCommitment.update({ where: { id: ids.commitment! }, data: { lifecycle: 'fulfilled', fulfilledAt: new Date() } })],
      ['issue', () => prisma().osIssue.update({ where: { id: ids.issue! }, data: { status: 'resolved' } })],
    ];
    for (const [label, close] of closers) {
      const blocked = await command('owner', 'DeactivateParty', archive());
      assert.deepEqual([blocked.status, blocked.body], [409, { code: 'ARCHIVE_BLOCKED_BY_OBLIGATIONS' }], `before closing ${label}`);
      await close();
    }
    const lastOne = await command('owner', 'DeactivateParty', archive());
    assert.deepEqual([lastOne.status, lastOne.body], [409, { code: 'ARCHIVE_BLOCKED_BY_OBLIGATIONS' }], 'work item still open');
    assert.deepEqual((await preview('owner')).body.obligations, { openOrders: 0, openCommitments: 0, openIssues: 0, openWorkItems: 1 });
    await prisma().osWorkItem.update({ where: { id: ids.workItem! }, data: { status: 'completed' } });
    assert.equal((await preview('owner')).body.blocked, false);
    const row = await party();
    assert.deepEqual([row.status, row.version], ['active', 0]);
    assert.equal(await archiveEvents(), 0);
  });

  it('archives with reason and version; owner, coverage, opportunities and quotes are untouched', async () => {
    const before = {
      account: await prisma().osCommercialAccount.findFirst({ where: { organizationId: org.id, partyId: ids.party! } }),
      grants: await prisma().osCustomerCoverageGrant.findMany({ where: { customerPartyId: ids.party! }, orderBy: { id: 'asc' } }),
    };
    const key = `t03-l3-archive-${createId()}`;
    const reply = await command('owner', 'DeactivateParty', archive(), key);
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    assert.deepEqual(await command('owner', 'DeactivateParty', archive(), key), reply);
    const row = await party();
    assert.deepEqual([row.status, row.version], ['inactive', 1]);
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id, eventType: 'party.deactivated' } });
    const payload = event.payloadJson as Record<string, unknown>;
    assert.deepEqual([payload.reason, payload.obligationsChecked, payload.paymentsChecked], ['no_current_commercial_relationship', true, false]);
    assert.equal(await archiveEvents(), 1);
    const account = await prisma().osCommercialAccount.findFirst({ where: { organizationId: org.id, partyId: ids.party! } });
    assert.deepEqual([account?.ownerMemberId, account?.version], [before.account?.ownerMemberId, before.account?.version]);
    assert.deepEqual(await prisma().osCustomerCoverageGrant.findMany({ where: { customerPartyId: ids.party! }, orderBy: { id: 'asc' } }), before.grants);
    const opportunities = await prisma().osOpportunity.findMany({ where: { partyId: ids.party! }, orderBy: { title: 'asc' } });
    assert.deepEqual(opportunities.map((o) => o.status), ['open', 'lost']);
    assert.equal((await prisma().osQuote.findUniqueOrThrow({ where: { id: ids.quote! } })).status, 'accepted');

    const again = await command('owner', 'DeactivateParty', archive({ expectedVersion: 1 }));
    assert.deepEqual([again.status, again.body], [400, { code: 'CONFLICT' }]);
    const detail = await fetch(`${baseUrl}/v1/parties/${ids.party}`, { headers: headers(m.owner!) });
    const authority = (await detail.json()).customerAuthority as Record<string, boolean>;
    assert.deepEqual([authority.canArchiveCustomer, authority.canReactivateCustomer], [false, true]);
  });

  it('reactivation needs a reason and the current version, and restores nothing else', async () => {
    const preferencesBefore = await prisma().osContactFollowupPreference.findMany({ where: { contactId: ids.contact! } });
    const grantsBefore = await prisma().osCustomerCoverageGrant.findMany({ where: { customerPartyId: ids.party! }, orderBy: { id: 'asc' } });
    for (const [label, body] of [
      ['no reason', { partyId: ids.party, expectedVersion: 1 }],
      ['short reason', { partyId: ids.party, expectedVersion: 1, reasonNote: 'vuelve' }],
    ] as const) {
      const reply = await command('owner', 'ReactivateParty', body);
      assert.equal(reply.status, 400, label);
    }
    const stale = await command('owner', 'ReactivateParty', { partyId: ids.party, expectedVersion: 0, reasonNote: 'Retomó compras este mes' });
    assert.deepEqual([stale.status, stale.body], [400, { code: 'CONFLICT' }]);
    const covered = await command('covered', 'ReactivateParty', { partyId: ids.party, expectedVersion: 1, reasonNote: 'Retomó compras este mes' });
    assert.equal(covered.status, 403);

    const reply = await command('owner', 'ReactivateParty', { partyId: ids.party, expectedVersion: 1, reasonNote: 'Retomó compras este mes' });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const row = await party();
    assert.deepEqual([row.status, row.version], ['active', 2]);
    assert.deepEqual(await prisma().osContactFollowupPreference.findMany({ where: { contactId: ids.contact! } }), preferencesBefore);
    assert.deepEqual(await prisma().osCustomerCoverageGrant.findMany({ where: { customerPartyId: ids.party! }, orderBy: { id: 'asc' } }), grantsBefore);
    const opportunities = await prisma().osOpportunity.findMany({ where: { partyId: ids.party! }, orderBy: { title: 'asc' } });
    assert.deepEqual(opportunities.map((o) => o.status), ['open', 'lost']);
    assert.equal(await prisma().osParty.count({ where: { organizationId: org.id } }), 1, 'no new customer record');

    const twice = await command('owner', 'ReactivateParty', { partyId: ids.party, expectedVersion: 2, reasonNote: 'Retomó compras este mes' });
    assert.deepEqual([twice.status, twice.body], [400, { code: 'CONFLICT' }]);
  });

  it('the timeline shows archive and reactivation; reason notes only to customer editors', async () => {
    await runner.runOnce();
    await runner.runOnce();
    const read = async (who: string) => {
      const res = await fetch(`${baseUrl}/v1/parties/${ids.party}/timeline`, { headers: headers(m[who]!) });
      assert.equal(res.status, 200);
      const items = (await res.json()).items as Array<{ eventType: string; facts: Record<string, unknown> }>;
      return {
        archived: items.find((i) => i.eventType === 'party.deactivated')?.facts,
        reactivated: items.find((i) => i.eventType === 'party.reactivated')?.facts,
      };
    };
    const owner = await read('owner');
    assert.deepEqual([owner.archived?.reason, owner.archived?.paymentsChecked], ['no_current_commercial_relationship', false]);
    assert.equal(owner.reactivated?.reasonNote, 'Retomó compras este mes');
    const reader = await read('reader');
    assert.equal(reader.archived?.reason, 'no_current_commercial_relationship');
    assert.equal(reader.reactivated?.reasonNote, undefined);
  });
});
