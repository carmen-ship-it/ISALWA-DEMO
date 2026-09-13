import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  OsOutboxWorker,
  OutboxWorkerHost,
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
} from '@isalwa/os-events';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

async function seedPendingOutbox(
  workforceStore: PrismaOsWorkforceStore,
  orgId: string,
  suffix: string,
) {
  const event = buildBusinessEvent({
    organizationId: orgId,
    eventType: 'member.invited',
    occurredAt: new Date(),
    actorMemberId: null,
    primaryEntityType: 'organization_member',
    primaryEntityId: `mem-${suffix}`,
    correlationId: `corr-${suffix}`,
  });
  const outbox = buildOutboxForEvent(event);
  const audit = buildAuditEntry(
    orgId,
    null,
    'member.invited',
    'organization_member',
    `mem-${suffix}`,
    event.correlationId,
  );
  await workforceStore.appendEventAndAudit(event, outbox, audit);
  return { event, outbox };
}

describePrisma('outbox runtime operability', () => {
  let workforceStore: PrismaOsWorkforceStore;
  let outboxStore: PrismaOsOutboxStore;

  before(async () => {
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('OS_DATABASE_URL required');
    workforceStore = new PrismaOsWorkforceStore(prisma);
    outboxStore = new PrismaOsOutboxStore(prisma);
    await workforceStore.truncateAll();
  });

  after(async () => {
    await workforceStore.truncateAll();
  });

  it('host starts, dispatches pending, and exposes health', async () => {
    const org = await workforceStore.seedOrganization('Host Org', `host-${Date.now()}`);
    await seedPendingOutbox(workforceStore, org.id, 'host-1');

    let delivered = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'runtime.test',
      async deliver() {
        delivered += 1;
      },
    };

    const host = new OutboxWorkerHost(outboxStore, [consumer], {
      pollIntervalMs: 50,
      batchSize: 10,
    });
    host.start();
    await new Promise((r) => setTimeout(r, 200));
    await host.stop();

    assert.equal(delivered, 1);
    const health = await host.getHealth(org.id);
    assert.equal(health.worker.running, false);
    assert.equal(health.backlog.pending, 0);
    assert.ok(health.backlog.lastPublishedAt);
  });

  it('host restart resumes pending backlog', async () => {
    const org = await workforceStore.seedOrganization('Restart Org', `restart-${Date.now()}`);
    await seedPendingOutbox(workforceStore, org.id, 'r1');
    await seedPendingOutbox(workforceStore, org.id, 'r2');

    let delivered = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: 'runtime.restart',
      async deliver() {
        delivered += 1;
      },
    };

    const host = new OutboxWorkerHost(outboxStore, [consumer], { batchSize: 1 });
    await host.runOnce();
    assert.equal(delivered, 1);

    await host.stop();
    assert.equal((await outboxStore.getStats(org.id)).pending, 1);

    host.start();
    await new Promise((r) => setTimeout(r, 150));
    await host.stop();

    assert.equal(delivered, 2);
    assert.equal((await outboxStore.getStats(org.id)).pending, 0);
  });

  it('concurrent workers do not duplicate consumer side effects', async () => {
    const org = await workforceStore.seedOrganization('Multi Org', `multi-${Date.now()}`);
    for (let i = 0; i < 6; i += 1) {
      await seedPendingOutbox(workforceStore, org.id, `m${i}-${Date.now()}`);
    }

    let delivered = 0;
    const consumer: OsOutboxConsumerPort = {
      consumerKey: `runtime.multi.${Date.now()}`,
      async deliver() {
        delivered += 1;
      },
    };

    const workerA = new OsOutboxWorker(outboxStore, [consumer], { batchSize: 3 });
    const workerB = new OsOutboxWorker(outboxStore, [consumer], { batchSize: 3 });
    await Promise.all([workerA.runOnce(), workerB.runOnce()]);
    // Drain any stragglers from race (dedup prevents duplicate side effects)
    await workerA.runOnce();

    assert.equal(delivered, 6);
    assert.equal((await outboxStore.getStats(org.id)).pending, 0);
    assert.equal((await outboxStore.getStats(org.id)).published, 6);
  });

  it('operational health reports backlog without payloads', async () => {
    const org = await workforceStore.seedOrganization('Ops Org', `ops-${Date.now()}`);
    await seedPendingOutbox(workforceStore, org.id, 'ops-pending');

    const pendingHealth = await outboxStore.getOperationalHealth(org.id);
    assert.ok(pendingHealth.pending >= 1);
    assert.ok(pendingHealth.oldestPendingAgeMs != null);

    const event = buildBusinessEvent({
      organizationId: org.id,
      eventType: 'member.terminated',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'organization_member',
      primaryEntityId: 'mem-dl',
      correlationId: `corr-dl-${Date.now()}`,
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      org.id,
      null,
      'member.terminated',
      'organization_member',
      'mem-dl',
      event.correlationId,
    );
    await workforceStore.appendEventAndAudit(event, outbox, audit);

    const failing: OsOutboxConsumerPort = {
      consumerKey: `runtime.fail.${Date.now()}`,
      async deliver() {
        throw new Error('CONSUMER_DOWN');
      },
    };
    const worker = new OsOutboxWorker(outboxStore, [failing], {
      maxAttempts: 1,
      batchSize: 10,
    });
    await worker.runOnce();

    const health = await outboxStore.getOperationalHealth(org.id);
    assert.ok(health.deadLetter >= 1);
    assert.ok(health.recentDeadLetters.length >= 1);
    assert.equal('payloadJson' in (health.recentDeadLetters[0] ?? {}), false);
    assert.ok(health.recentDeadLetters[0]?.lastError?.includes('CONSUMER_DOWN'));
  });
});
