import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  OsOutboxWorker,
  OutboxRecoveryService,
  OUTBOX_RECOVERY_AUDIT_ACTION,
  REPLAY_REVIEW_REQUIRED,
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';

/** S11 v2 on RetryDeadLetterDelivery against real Postgres. */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('outbox recovery replay binding (prisma)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforce: PrismaOsWorkforceStore;
  let outbox: PrismaOsOutboxStore;
  let recovery: OutboxRecoveryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforce = new PrismaOsWorkforceStore(prisma);
    outbox = new PrismaOsOutboxStore(prisma);
    recovery = new OutboxRecoveryService(outbox, workforce);
    await workforce.truncateAll();
  });

  type Seeded = Awaited<ReturnType<PrismaOsWorkforceStore['seedScopedAdminMember']>>;
  const ctx = (orgId: string, m: Seeded): RequestContext => ({
    organizationId: orgId,
    actorMemberId: m.member.id,
    personId: m.person.id,
    authIdentityId: m.auth.id,
    correlationId: `corr-${createId()}`,
    effectiveAt: new Date(),
  });

  async function fixture() {
    const org = await workforce.seedOrganization('DL Replay', `dlr-${createId()}`);
    const seed = () => workforce.seedScopedAdminMember(org.id, `dlr-${createId()}@o.bo`, 'D', 'L', 'people.admin');
    const a = await seed();
    const b = await seed();
    const event = buildBusinessEvent({
      organizationId: org.id,
      eventType: 'member.invited',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'organization_member',
      primaryEntityId: `mem-${createId()}`,
      correlationId: `corr-${createId()}`,
    });
    const msg = buildOutboxForEvent(event);
    await workforce.appendEventAndAudit(
      event,
      msg,
      buildAuditEntry(org.id, null, 'member.invited', 'organization_member', event.primaryEntityId, event.correlationId),
    );
    const worker = new OsOutboxWorker(outbox, [{ consumerKey: `down-${createId()}`, async deliver() { throw new Error('DOWN'); } }], {
      maxAttempts: 1,
      batchSize: 50,
      baseRetryMs: 1000,
      maxRetryMs: 60_000,
    });
    await worker.runOnce();
    assert.equal((await outbox.getOutboxMessage(msg.id))?.status, 'dead_letter');
    const recoveries = () =>
      prisma.osAuditLog.count({ where: { organizationId: org.id, action: OUTBOX_RECOVERY_AUDIT_ACTION } });
    return { org, a, b, msg, recoveries };
  }

  it('same actor and request replays after current authorization; one requeue', async () => {
    const f = await fixture();
    const first = await recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r1');
    const again = await recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r1');
    assert.deepEqual(again, JSON.parse(JSON.stringify(first)));
    assert.equal(await f.recoveries(), 1);
  });

  it('another actor, a different reason, or a different dead letter on the same key is CONFLICT', async () => {
    const f = await fixture();
    await recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r2');
    for (const attempt of [
      () => recovery.retryDeadLetterDelivery(ctx(f.org.id, f.b), f.msg.id, 'consumer fixed', 'r2'),
      () => recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'otro motivo', 'r2'),
      () => recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), 'other-outbox', 'consumer fixed', 'r2'),
    ]) {
      await assert.rejects(attempt(), (err: Error) => err.message === 'CONFLICT');
    }
    assert.equal(await f.recoveries(), 1);
  });

  it('the original actor without people.admin gets PERMISSION_DENIED, not the stored result', async () => {
    const f = await fixture();
    await recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r3');
    await prisma.osRoleAssignment.updateMany({
      where: { memberId: f.a.member.id, roleKey: 'people.admin' },
      data: { endedAt: new Date(Date.now() - 1000) },
    });
    await assert.rejects(
      recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r3'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('a pre-binding row is REPLAY_REVIEW_REQUIRED and does not requeue', async () => {
    const f = await fixture();
    await prisma.osIdempotencyKey.create({
      data: {
        id: createId(),
        organizationId: f.org.id,
        key: 'r4',
        commandName: 'RetryDeadLetterDelivery',
        resultJson: { commandId: 'legacy', data: { outboxId: 'legacy-secret' } } as never,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    await assert.rejects(
      recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r4'),
      (err: Error) => err.message === REPLAY_REVIEW_REQUIRED,
    );
    assert.equal((await outbox.getOutboxMessage(f.msg.id))?.status, 'dead_letter');
    assert.equal(await f.recoveries(), 0);
  });

  it('5 overlapping retries by one actor on one key requeue once', async () => {
    const f = await fixture();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        recovery.retryDeadLetterDelivery(ctx(f.org.id, f.a), f.msg.id, 'consumer fixed', 'r5'),
      ),
    );
    const summary = results.map((r) => (r.status === 'fulfilled' ? 'ok' : (r.reason as Error).message));
    console.log(`[evidence] recovery race: ${summary.join(',')}`);
    for (const r of results) {
      if (r.status === 'rejected') assert.equal((r.reason as Error).message, 'CONFLICT');
    }
    assert.ok(results.some((r) => r.status === 'fulfilled'));
    assert.equal(await f.recoveries(), 1);
  });
});
