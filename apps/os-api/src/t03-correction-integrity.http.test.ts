import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * T03 L4 completion: atomic request/resolution with durable history, retry without duplicates,
 * paged change selection, exact lookup, value evidence and current-authority enforcement.
 * Real Nest app, disposable Postgres, synthetic data. Failures are injected with a trigger on
 * the idempotency insert, the last write of the command transaction.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

describeHttp('T03 correction integrity over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const ids: Record<string, string> = {};

  function headers(who: Seeded, key = `t03-l4c-${createId()}`): Record<string, string> {
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
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(m[who]!, key),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function get(who: string, path: string): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1${path}`, { headers: headers(m[who]!) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@t03l4c.bo`, name, 'T03');
    await prisma().osRoleAssignment.deleteMany({ where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' } });
    for (const roleKey of roleKeys) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const issueVersion = async (issueId: string) => (await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } })).version;
  const contactVersion = async () => (await prisma().osContact.findUniqueOrThrow({ where: { id: ids.contact! } })).version;

  /** Every durable row a correction command may write, counted for this org. */
  async function footprint() {
    const where = { organizationId: org.id };
    const [issues, corrections, references, events, outbox, audit, idempotency] = await Promise.all([
      prisma().osIssue.count({ where }),
      prisma().osIssueCorrectionRequest.count({ where }),
      prisma().osIssueReference.count({ where: { issue: { organizationId: org.id } } }),
      prisma().osBusinessEvent.count({ where }),
      prisma().osOutboxMessage.count({ where }),
      prisma().osAuditLog.count({ where }),
      prisma().osIdempotencyKey.count({ where }),
    ]);
    return { issues, corrections, references, events, outbox, audit, idempotency };
  }

  async function failIdempotencyInsert(key: string) {
    await prisma().$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION t03_l4c_fail_injection() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        IF NEW.organization_id = '${org.id}' AND NEW.key = '${key}' THEN
          RAISE EXCEPTION 'T03_L4C_INJECTED_FAILURE';
        END IF;
        RETURN NEW;
      END $fn$`);
    await prisma().$executeRawUnsafe(
      'CREATE TRIGGER t03_l4c_fail_injection BEFORE INSERT ON os_idempotency_keys FOR EACH ROW EXECUTE FUNCTION t03_l4c_fail_injection()',
    );
  }

  async function clearInjection() {
    await prisma().$executeRawUnsafe('DROP TRIGGER IF EXISTS t03_l4c_fail_injection ON os_idempotency_keys');
    await prisma().$executeRawUnsafe('DROP FUNCTION IF EXISTS t03_l4c_fail_injection()');
  }

  async function rename(givenName: string) {
    const reply = await command('owner', 'UpdateContact', {
      organizationPartyId: ids.party,
      contactId: ids.contact,
      givenName,
      familyName: 'Quispe',
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    return prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'contact.updated', primaryEntityId: ids.contact! },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
  }

  async function reportAssigned(proposedValue: string, field = 'contact_name', ownerKey = 'owner'): Promise<string> {
    const reply = await command('owner', 'ReportIssue', {
      description: 'La clienta pide corregir sus datos',
      correction: { partyId: ids.party, contactId: field.startsWith('contact_') ? ids.contact : undefined, field, proposedValue, source: 'customer' },
    });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    const issueId = String((reply.body.data as Record<string, unknown>).issueId);
    const assigned = await command('manager', 'AssignIssueOwner', {
      issueId,
      ownerMemberId: m[ownerKey]!.member.id,
      expectedVersion: await issueVersion(issueId),
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    return issueId;
  }

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    await clearInjection();
    org = await store.seedOrganization('T03 L4C Org', `t03-l4c-${createId()}`);
    m.owner = await seedMember('owner', ['commercial.customer.create', 'commercial.customer.edit']);
    m.manager = await seedMember('manager', ['issue.manage']);
    m.cover = await seedMember('cover', ['commercial.customer.edit']);
    m.steward = await seedMember('steward', ['master_data.admin', 'commercial.customer.edit']);

    const created = await command('owner', 'CreateParty', {
      partyKind: 'organization',
      displayName: 'Cliente Integridad L4',
      contact: { givenName: 'Ana', familyName: 'Quispe' },
      phone: { country: 'BO', number: '70020012' },
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const data = created.body.data as Record<string, unknown>;
    ids.party = String(data.partyId);
    ids.contact = String(data.contactId);
  });

  after(async () => {
    await clearInjection();
    await app?.close();
  });

  it('a failed request leaves no partial record or history; retry creates it once and replays', async () => {
    const key = `t03-l4c-report-${createId()}`;
    const body = {
      description: 'Solicitud con fallo inyectado',
      correction: { partyId: ids.party, contactId: ids.contact, field: 'contact_name', proposedValue: 'Ana Lucía Quispe', source: 'customer' },
    };
    const before = await footprint();
    await failIdempotencyInsert(key);
    try {
      const failed = await command('owner', 'ReportIssue', body, key);
      assert.ok(failed.status >= 500, JSON.stringify(failed.body));
      assert.deepEqual(await footprint(), before);
    } finally {
      await clearInjection();
    }

    const retried = await command('owner', 'ReportIssue', body, key);
    assert.equal(retried.status, 201, JSON.stringify(retried.body));
    const issueId = String((retried.body.data as Record<string, unknown>).issueId);
    const afterRetry = await footprint();
    assert.deepEqual(afterRetry, {
      issues: before.issues + 1,
      corrections: before.corrections + 1,
      references: before.references + 1,
      events: before.events + 1,
      outbox: before.outbox + 1,
      audit: before.audit + 1,
      idempotency: before.idempotency + 1,
    });
    const reported = await prisma().osBusinessEvent.findFirstOrThrow({ where: { organizationId: org.id, idempotencyKey: key } });
    assert.equal(reported.eventType, 'issue.reported');
    assert.equal(reported.primaryEntityId, issueId);

    const replay = await command('owner', 'ReportIssue', body, key);
    assert.equal(replay.status, 201, JSON.stringify(replay.body));
    assert.equal((replay.body.data as Record<string, unknown>).issueId, issueId);
    assert.deepEqual(await footprint(), afterRetry);
    ids.unassigned = issueId;
  });

  it('a failed resolution leaves no false outcome; retry resolves once and replays', async () => {
    const issueId = await reportAssigned('Ana Paula Quispe');
    const change = await rename('Ana Paula');
    const key = `t03-l4c-resolve-${createId()}`;
    const body = {
      issueId,
      resolution: 'Corregido',
      expectedVersion: await issueVersion(issueId),
      correction: { decision: 'applied', appliedEventId: change.id, reason: 'Nombre corregido en la ficha' },
    };
    const before = await footprint();
    await failIdempotencyInsert(key);
    try {
      const failed = await command('owner', 'ResolveIssue', body, key);
      assert.ok(failed.status >= 500, JSON.stringify(failed.body));
      assert.deepEqual(await footprint(), before);
      const issue = await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } });
      assert.equal(issue.status, 'reported');
      assert.equal(issue.outcome, null);
      const record = await prisma().osIssueCorrectionRequest.findUniqueOrThrow({ where: { issueId } });
      assert.equal(record.decision, null);
      assert.equal(record.appliedEventId, null);
    } finally {
      await clearInjection();
    }

    const retried = await command('owner', 'ResolveIssue', body, key);
    assert.equal(retried.status, 201, JSON.stringify(retried.body));
    const replay = await command('owner', 'ResolveIssue', body, key);
    assert.equal(replay.status, 201, JSON.stringify(replay.body));
    const resolvedEvents = await prisma().osBusinessEvent.findMany({
      where: { organizationId: org.id, eventType: 'issue.resolved', primaryEntityId: issueId },
    });
    assert.equal(resolvedEvents.length, 1);
    const issue = await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } });
    assert.equal(issue.status, 'resolved');
    assert.equal(issue.outcome, 'applied');
    const record = await prisma().osIssueCorrectionRequest.findUniqueOrThrow({ where: { issueId } });
    assert.equal(record.decision, 'applied');
    assert.equal(record.valueMatched, true);
  });

  it('pages candidate changes on the server and resolves citing one beyond the first page', async () => {
    const issueId = await reportAssigned('Ana Sofía Quispe');
    const versionAtRequest = await contactVersion();
    const oldest = await rename('Ana Sofía');
    const middle = await rename('Ana S.');
    const newest = await rename('Ana');

    const path = `/issues/${issueId}/correction/candidate-events`;
    assert.equal((await get('owner', `${path}?limit=0`)).status, 400);
    assert.equal((await get('owner', `${path}?limit=51`)).status, 400);
    assert.equal((await get('owner', `${path}?cursor=not-a-cursor`)).status, 400);

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page += 1) {
      const reply: Reply = await get('owner', `${path}?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      assert.equal(reply.status, 200, JSON.stringify(reply.body));
      const events = reply.body.events as Array<Record<string, unknown>>;
      for (const event of events) {
        assert.deepEqual(Object.keys(event).sort(), ['actorMemberId', 'eventId', 'eventType', 'fields', 'occurredAt']);
        assert.deepEqual(event.fields, ['contact_name']);
        seen.push(String(event.eventId));
      }
      cursor = (reply.body.nextCursor as string | null) ?? null;
      if (!cursor) break;
    }
    assert.deepEqual(seen, [newest.id, middle.id, oldest.id]);
    assert.ok(versionAtRequest < (await contactVersion()));

    const exact = await get('owner', `${path}/${oldest.id}`);
    assert.equal(exact.status, 200, JSON.stringify(exact.body));
    assert.equal((exact.body.event as Record<string, unknown>).eventId, oldest.id);
    const partyEvent = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'party.created', primaryEntityId: ids.party! },
    });
    assert.equal((await get('owner', `${path}/${partyEvent.id}`)).status, 404);
    assert.equal((await get('owner', `${path}/${createId()}`)).status, 404);

    const resolved = await command('owner', 'ResolveIssue', {
      issueId,
      resolution: 'Corregido',
      expectedVersion: await issueVersion(issueId),
      correction: { decision: 'applied', appliedEventId: oldest.id, reason: 'Nombre corregido en la ficha' },
    });
    assert.equal(resolved.status, 201, JSON.stringify(resolved.body));
    const record = await prisma().osIssueCorrectionRequest.findUniqueOrThrow({ where: { issueId } });
    assert.equal(record.appliedEventId, oldest.id);
    assert.equal(record.valueMatched, true);
  });

  it('a change to another value needs an explicit explanation; the event never carries it as a value', async () => {
    const issueId = await reportAssigned('Ana Carolina Quispe');
    const change = await rename('Ana Carol');
    const resolve = (extra: Record<string, unknown>) =>
      issueVersion(issueId).then((expectedVersion) =>
        command('owner', 'ResolveIssue', {
          issueId,
          resolution: 'Corregido',
          expectedVersion,
          correction: { decision: 'applied', appliedEventId: change.id, reason: 'Nombre corregido en la ficha', ...extra },
        }),
      );
    const refused = await resolve({});
    assert.equal(refused.status, 409, JSON.stringify(refused.body));
    assert.equal((await prisma().osIssue.findUniqueOrThrow({ where: { id: issueId } })).status, 'reported');
    const explained = await resolve({ differenceExplanation: 'La clienta confirmó por teléfono que usa Carol' });
    assert.equal(explained.status, 201, JSON.stringify(explained.body));
    const record = await prisma().osIssueCorrectionRequest.findUniqueOrThrow({ where: { issueId } });
    assert.equal(record.valueMatched, false);
    assert.equal(record.differenceExplanation, 'La clienta confirmó por teléfono que usa Carol');
    const resolvedEvent = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'issue.resolved', primaryEntityId: issueId },
    });
    assert.equal(JSON.stringify(resolvedEvent.payloadJson).includes('Ana Carolina Quispe'), false);
  });

  it('display name and legal name changes are not interchangeable evidence', async () => {
    const issueId = await reportAssigned('Integridad Andina', 'display_name', 'steward');
    const partyVersion = async () => (await prisma().osParty.findUniqueOrThrow({ where: { id: ids.party! } })).version;
    const legal = await command('steward', 'UpdateParty', {
      partyId: ids.party,
      legalName: 'Integridad Andina',
      changeReason: 'Razón social según documento',
      expectedVersion: await partyVersion(),
    });
    assert.equal(legal.status, 201, JSON.stringify(legal.body));
    const legalEvent = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'party.updated', primaryEntityId: ids.party! },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    const resolve = (appliedEventId: string) =>
      issueVersion(issueId).then((expectedVersion) =>
        command('steward', 'ResolveIssue', {
          issueId,
          resolution: 'Corregido',
          expectedVersion,
          correction: { decision: 'applied', appliedEventId, reason: 'Nombre comercial corregido' },
        }),
      );
    const wrong = await resolve(legalEvent.id);
    assert.equal(wrong.status, 409, JSON.stringify(wrong.body));
    assert.equal((await get('steward', `/issues/${issueId}/correction/candidate-events/${legalEvent.id}`)).status, 404);

    const display = await command('steward', 'UpdateParty', {
      partyId: ids.party,
      displayName: 'Integridad Andina',
      changeReason: 'Nombre comercial según la clienta',
      expectedVersion: await partyVersion(),
    });
    assert.equal(display.status, 201, JSON.stringify(display.body));
    const displayEvent = await prisma().osBusinessEvent.findFirstOrThrow({
      where: { organizationId: org.id, eventType: 'party.updated', primaryEntityId: ids.party! },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    assert.equal((await resolve(displayEvent.id)).status, 201);
  });

  it('a responsible person who loses authority loses the value and every action; the queue surfaces it', async () => {
    const grant = await prisma().osCustomerCoverageGrant.create({
      data: {
        id: createId(),
        organizationId: org.id,
        customerPartyId: ids.party!,
        primaryOwnerMemberId: m.owner!.member.id,
        actingAdvisorMemberId: m.cover!.member.id,
        coveredActions: ['commercial.work', 'customer.edit'],
        startsAt: new Date('2026-01-01T00:00:00Z'),
        recordedAt: new Date(),
      },
    });
    const PROPOSED = 'Ana Beatriz Quispe';
    const issueId = await reportAssigned(PROPOSED, 'contact_name', 'cover');
    const path = `/issues/${issueId}/correction`;
    const view = async () => (await get('cover', path)).body.correction as Record<string, unknown>;
    assert.equal((await view()).proposedValue, PROPOSED);
    assert.equal((await view()).canDecide, true);
    assert.equal((await get('cover', `${path}/candidate-events`)).status, 200);
    const journal = async () =>
      command('cover', 'AddIssueJournalEntry', {
        issueId,
        entryType: 'observation',
        content: 'Revisando la solicitud',
        expectedVersion: await issueVersion(issueId),
      });
    assert.equal((await journal()).status, 201);
    const attention = async () => {
      const reply = await get('manager', '/issues?view=correction_attention');
      assert.equal(reply.status, 200, JSON.stringify(reply.body));
      return new Map(
        (reply.body.items as Array<Record<string, unknown>>).map((item) => [item.issueId, item.correctionAttention]),
      );
    };
    assert.equal((await attention()).has(issueId), false);
    assert.equal((await attention()).get(ids.unassigned), 'unassigned');
    assert.equal((await get('owner', '/issues?view=correction_attention')).status, 403);

    // Coverage narrowed to work only: still knows the customer, can no longer apply the change.
    await prisma().osCustomerCoverageGrant.update({ where: { id: grant.id }, data: { coveredActions: ['commercial.work'] } });
    const narrowed = await get('cover', path);
    assert.equal(narrowed.status, 200, JSON.stringify(narrowed.body));
    assert.equal((narrowed.body.correction as Record<string, unknown>).proposedValue, null);
    assert.equal((narrowed.body.correction as Record<string, unknown>).canDecide, false);
    assert.equal((await get('cover', `${path}/candidate-events`)).status, 403);
    assert.equal((await journal()).status, 403);
    const resolve = await command('cover', 'ResolveIssue', {
      issueId,
      resolution: 'No procede',
      expectedVersion: await issueVersion(issueId),
      correction: { decision: 'rejected', reason: 'El nombre ya es correcto' },
    });
    assert.equal(resolve.status, 403, JSON.stringify(resolve.body));
    assert.equal((await attention()).get(issueId), 'owner_lacks_authority');

    // Coverage revoked: the customer is no longer known at all.
    await prisma().osCustomerCoverageGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    assert.equal((await get('cover', path)).status, 404);
    assert.equal((await get('cover', `${path}/candidate-events`)).status, 404);
    assert.equal((await journal()).status, 403);
    assert.equal((await attention()).get(issueId), 'owner_lacks_authority');

    const reassigned = await command('manager', 'AssignIssueOwner', {
      issueId,
      ownerMemberId: m.owner!.member.id,
      expectedVersion: await issueVersion(issueId),
    });
    assert.equal(reassigned.status, 201, JSON.stringify(reassigned.body));
    assert.equal((await attention()).has(issueId), false);
    assert.equal(((await get('owner', path)).body.correction as Record<string, unknown>).proposedValue, PROPOSED);
  });
});
