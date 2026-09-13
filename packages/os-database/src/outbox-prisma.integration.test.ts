import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';
import {
  OsOutboxWorker,
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
  type OsOutboxStorePort,
  type StoredOutboxMessage,
} from '@isalwa/os-events';
import { WorkforceCommandService, LocalAuthProviderPort } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('outbox prisma integration', () => {
  let prisma: ReturnType<typeof getOsPrisma>;
  let workforceStore: PrismaOsWorkforceStore;
  let outboxStore: PrismaOsOutboxStore;

  before(async () => {
    prisma = getOsPrisma();
    if (!prisma) throw new Error('OS_DATABASE_URL required');
    workforceStore = new PrismaOsWorkforceStore(prisma);
    outboxStore = new PrismaOsOutboxStore(prisma);
    await workforceStore.truncateAll();
  });

  it('invite command persists event audit outbox atomically', async () => {
    const org = await workforceStore.seedOrganization('Outbox Org', `outbox-${Date.now()}`);
    const admin = await workforceStore.seedAdminMember(org.id, `admin-${Date.now()}@o.bo`, 'A', 'Admin');
    const svc = new WorkforceCommandService(workforceStore, new LocalAuthProviderPort());
    const ctx: RequestContext = {
      organizationId: org.id,
      actorMemberId: admin.member.id,
      personId: admin.person.id,
      authIdentityId: admin.auth.id,
      correlationId: `corr-${Date.now()}`,
      effectiveAt: new Date(),
    };
    await svc.execute('InviteMember', ctx, {
      email: `inv-${Date.now()}@o.bo`,
      givenName: 'Inv',
      familyName: 'Ited',
      roleKey: 'sales_rep',
    }, `idem-${Date.now()}`);

    const events = await prisma!.osBusinessEvent.count({ where: { organizationId: org.id } });
    const audits = await prisma!.osAuditLog.count({ where: { organizationId: org.id } });
    const pending = await prisma!.osOutboxMessage.count({
      where: { organizationId: org.id, status: 'pending' },
    });
    assert.ok(events >= 1);
    assert.ok(audits >= 1);
    assert.ok(pending >= 1);

    const event = await prisma!.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.invited' },
    });
    assert.ok(event?.idempotencyKey);
  });

  it('worker dispatches pending outbox to published', async () => {
    const org = await workforceStore.seedOrganization('Worker Org', `worker-${Date.now()}`);
    const event = buildBusinessEvent({
      organizationId: org.id,
      eventType: 'member.invited',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'organization_member',
      primaryEntityId: 'mem-test',
      correlationId: `c-${Date.now()}`,
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(org.id, null, 'member.invited', 'organization_member', 'mem-test', event.correlationId);
    await workforceStore.appendEventAndAudit(event, outbox, audit);

    const deliveries: string[] = [];
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'test.projection',
      async deliver(envelope) {
        deliveries.push(envelope.id);
      },
    };
    const worker = new OsOutboxWorker(outboxStore, [consumer], { batchSize: 10, maxAttempts: 3, baseRetryMs: 10, maxRetryMs: 50 });
    await worker.runOnce();
    assert.ok(deliveries.includes(event.id));

    const row = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(row?.status, 'published');
  });

  it('worker retries then dead-letters failing consumer', async () => {
    const org = await workforceStore.seedOrganization('Fail Org', `fail-${Date.now()}`);
    const event = buildBusinessEvent({
      organizationId: org.id,
      eventType: 'member.terminated',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'organization_member',
      primaryEntityId: 'mem-fail',
      correlationId: `c-fail-${Date.now()}`,
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(org.id, null, 'member.terminated', 'organization_member', 'mem-fail', event.correlationId);
    await workforceStore.appendEventAndAudit(event, outbox, audit);

    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'test.fail',
      async deliver() {
        throw new Error('CONSUMER_DOWN');
      },
    };
    const worker = new OsOutboxWorker(outboxStore, [consumer], {
      batchSize: 5,
      maxAttempts: 1,
      baseRetryMs: 1,
      maxRetryMs: 2,
    });
    await worker.runOnce();
    const row = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(row?.status, 'dead_letter');
    assert.ok(row?.lastError?.includes('CONSUMER_DOWN'));
  });

  it('consumer dedup prevents duplicate delivery side effects', async () => {
    const org = await workforceStore.seedOrganization('Dedup Org', `dedup-${Date.now()}`);
    const event = buildBusinessEvent({
      organizationId: org.id,
      eventType: 'delegation.granted',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'delegation',
      primaryEntityId: 'del-1',
      correlationId: `c-dedup-${Date.now()}`,
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(org.id, null, 'delegation.granted', 'delegation', 'del-1', event.correlationId);
    await workforceStore.appendEventAndAudit(event, outbox, audit);

    let calls = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'test.dedup',
      async deliver() {
        calls += 1;
      },
    };
    const worker = new OsOutboxWorker(outboxStore, [consumer]);
    await worker.runOnce();
    await worker.runOnce();
    assert.equal(calls, 1);
  });

  it('tenant stats are scoped', async () => {
    const a = await workforceStore.seedOrganization('Stats A', `stats-a-${Date.now()}`);
    const b = await workforceStore.seedOrganization('Stats B', `stats-b-${Date.now()}`);
    const mk = async (orgId: string) => {
      const event = buildBusinessEvent({
        organizationId: orgId,
        eventType: 'member.invited',
        occurredAt: new Date(),
        actorMemberId: null,
        primaryEntityType: 'organization_member',
        primaryEntityId: 'm',
        correlationId: `c-${orgId}`,
      });
      const outbox = buildOutboxForEvent(event);
      const audit = buildAuditEntry(orgId, null, 'member.invited', 'organization_member', 'm', event.correlationId);
      await workforceStore.appendEventAndAudit(event, outbox, audit);
    };
    await mk(a.id);
    await mk(b.id);
    const statsA = await outboxStore.getStats(a.id);
    const statsB = await outboxStore.getStats(b.id);
    assert.ok(statsA.pending >= 1);
    assert.ok(statsB.pending >= 1);
  });
});
