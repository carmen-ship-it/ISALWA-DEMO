import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  OsOutboxWorker,
  OutboxRecoveryService,
  OUTBOX_RECOVERY_AUDIT_ACTION,
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
} from '@isalwa/os-events';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';
import { WorkforceCommandService, LocalAuthProviderPort } from '@isalwa/os-workforce';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

async function deadLetterFixture(
  workforceStore: PrismaOsWorkforceStore,
  outboxStore: PrismaOsOutboxStore,
  consumerKey: string,
) {
  const org = await workforceStore.seedOrganization('DL Org', `dl-${Date.now()}`);
  const event = buildBusinessEvent({
    organizationId: org.id,
    eventType: 'member.invited',
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
    'member.invited',
    'organization_member',
    'mem-dl',
    event.correlationId,
  );
  await workforceStore.appendEventAndAudit(event, outbox, audit);

  let fail = true;
  const consumer: OsOutboxConsumerPort = {
    consumerKey,
    async deliver() {
      if (fail) throw new Error('CONSUMER_DOWN');
    },
  };
  const worker = new OsOutboxWorker(outboxStore, [consumer], { maxAttempts: 1, batchSize: 5 });
  await worker.runOnce();

  const row = await outboxStore.getOutboxMessage(outbox.id);
  assert.equal(row?.status, 'dead_letter');

  return { org, event, outbox, consumer, setFail: (value: boolean) => {
    fail = value;
  } };
}

function adminCtx(
  orgId: string,
  admin: Awaited<ReturnType<PrismaOsWorkforceStore['seedAdminMember']>>,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: admin.member.id,
    personId: admin.person.id,
    authIdentityId: admin.auth.id,
    correlationId: `corr-admin-${Date.now()}`,
    effectiveAt: new Date(),
  };
}

describePrisma('outbox dead-letter recovery', () => {
  let workforceStore: PrismaOsWorkforceStore;
  let outboxStore: PrismaOsOutboxStore;
  let recovery: OutboxRecoveryService;

  before(async () => {
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('OS_DATABASE_URL required');
    workforceStore = new PrismaOsWorkforceStore(prisma);
    outboxStore = new PrismaOsOutboxStore(prisma);
    recovery = new OutboxRecoveryService(outboxStore, workforceStore);
    await workforceStore.truncateAll();
  });

  after(async () => {
    await workforceStore.truncateAll();
  });

  it('failure → dead letter → governed recovery → worker success', async () => {
    const key = `dl-consumer-${Date.now()}`;
    const { org, event, outbox, consumer, setFail } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      key,
    );
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `admin-${Date.now()}@dl.bo`,
      'Admin',
      'User',
    );

    const listed = await recovery.listDeadLetters(org.id);
    assert.ok(listed.some((item) => item.outboxId === outbox.id));

    const result = await recovery.retryDeadLetterDelivery(
      adminCtx(org.id, admin),
      outbox.id,
      'Consumer bug fixed in deploy 14.3',
      `idem-recover-${Date.now()}`,
    );
    assert.equal(result.data.recoveryStatus, 'requeued');
    assert.equal(result.data.previousLastError, 'CONSUMER_DOWN');

    const prisma = getOsPrisma()!;
    const audit = await prisma.osAuditLog.findFirst({
      where: {
        organizationId: org.id,
        action: OUTBOX_RECOVERY_AUDIT_ACTION,
        resourceId: outbox.id,
      },
    });
    assert.ok(audit);
    assert.equal((audit.beforeJson as { lastError?: string })?.lastError, 'CONSUMER_DOWN');

    const eventRow = await prisma.osBusinessEvent.findUnique({ where: { id: event.id } });
    assert.ok(eventRow);
    assert.equal(eventRow.id, event.id);

    setFail(false);
    const worker = new OsOutboxWorker(outboxStore, [consumer], { maxAttempts: 1 });
    await worker.runOnce();

    const after = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(after?.status, 'published');

    let deliveries = 0;
    const countingConsumer: OsOutboxConsumerPort = {
      consumerKey: key,
      async deliver() {
        deliveries += 1;
      },
    };
    await new OsOutboxWorker(outboxStore, [countingConsumer]).runOnce();
    assert.equal(deliveries, 0);
  });

  it('recovery idempotency prevents duplicate requeue', async () => {
    const { org, outbox } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      `idem-${Date.now()}`,
    );
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `admin-idem-${Date.now()}@dl.bo`,
      'Admin',
      'User',
    );
    const ctx = adminCtx(org.id, admin);
    const key = `idem-${Date.now()}`;
    const first = await recovery.retryDeadLetterDelivery(ctx, outbox.id, 'Fix verified', key);
    const second = await recovery.retryDeadLetterDelivery(ctx, outbox.id, 'Fix verified', key);
    assert.equal(first.commandId, second.commandId);

    const pending = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(pending?.status, 'pending');
  });

  it('cross-tenant recovery rejected', async () => {
    const { org, outbox } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      `tenant-${Date.now()}`,
    );
    const orgB = await workforceStore.seedOrganization('Other', `other-${Date.now()}`);
    const adminB = await workforceStore.seedAdminMember(
      orgB.id,
      `b-${Date.now()}@b.bo`,
      'B',
      'Admin',
    );

    await assert.rejects(
      () =>
        recovery.retryDeadLetterDelivery(
          adminCtx(orgB.id, adminB),
          outbox.id,
          'Should not work cross tenant',
        ),
      /NOT_FOUND/,
    );

    const row = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(row?.status, 'dead_letter');
    void org;
  });

  it('non-admin cannot recover dead letters', async () => {
    const { org, outbox } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      `perm-${Date.now()}`,
    );
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `admin-${Date.now()}@perm.bo`,
      'Admin',
      'User',
    );
    const svc = new WorkforceCommandService(workforceStore, new LocalAuthProviderPort());
    const invited = await svc.execute(
      'InviteMember',
      adminCtx(org.id, admin),
      {
        email: `emp-${Date.now()}@perm.bo`,
        givenName: 'Emp',
        familyName: 'User',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', adminCtx(org.id, admin), {
      memberId,
      providerSubject: `subject:${memberId}`,
    });

    await assert.rejects(
      () =>
        recovery.retryDeadLetterDelivery(
          {
            ...adminCtx(org.id, admin),
            actorMemberId: memberId,
            personId: invited.data.personId as string,
            authIdentityId: '',
          },
          outbox.id,
          'Unauthorized attempt',
        ),
      /PERMISSION_DENIED/,
    );
  });

  it('published outbox cannot be recovered', async () => {
    const { org, outbox, consumer, setFail } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      `pub-${Date.now()}`,
    );
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `admin-${Date.now()}@pub.bo`,
      'Admin',
      'User',
    );
    setFail(false);
    await recovery.retryDeadLetterDelivery(
      adminCtx(org.id, admin),
      outbox.id,
      'First recovery',
    );
    await new OsOutboxWorker(outboxStore, [consumer]).runOnce();

    await assert.rejects(
      () =>
        recovery.retryDeadLetterDelivery(
          adminCtx(org.id, admin),
          outbox.id,
          'Should not replay published',
        ),
      /NOT_FOUND/,
    );
  });

  it('recovery while consumer still fails returns to dead letter', async () => {
    const { org, outbox, consumer } = await deadLetterFixture(
      workforceStore,
      outboxStore,
      `failagain-${Date.now()}`,
    );
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `admin-${Date.now()}@fail.bo`,
      'Admin',
      'User',
    );

    await recovery.retryDeadLetterDelivery(
      adminCtx(org.id, admin),
      outbox.id,
      'Retry before fix',
    );
    await new OsOutboxWorker(outboxStore, [consumer], { maxAttempts: 1 }).runOnce();

    const row = await outboxStore.getOutboxMessage(outbox.id);
    assert.equal(row?.status, 'dead_letter');
    assert.ok(row?.lastError?.includes('CONSUMER_DOWN'));

    const audits = await getOsPrisma()!.osAuditLog.count({
      where: { organizationId: org.id, action: OUTBOX_RECOVERY_AUDIT_ACTION },
    });
    assert.equal(audits, 1);
  });
});
