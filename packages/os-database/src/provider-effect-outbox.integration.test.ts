import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OsOutboxWorker } from '@isalwa/os-events';
import {
  AuthProviderEffectConsumer,
  LocalAuthProviderPort,
  WorkforceCommandService,
} from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';

/**
 * T01b against real Postgres and the real outbox worker. The provider is a local
 * recording double: this proves OS durability and retry, not the external provider.
 */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

class RecordingProvider extends LocalAuthProviderPort {
  down = false;
  calls: string[] = [];
  override async revokeSessions(s: string) {
    this.calls.push(`revokeSessions:${s}`);
    if (this.down) throw new Error('PROVIDER_UNAVAILABLE');
    return super.revokeSessions(s);
  }
}

describePrisma('T01b auth provider effects through the outbox (prisma)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let store: PrismaOsWorkforceStore;
  let outbox: PrismaOsOutboxStore;

  before(async () => {
    prisma = getOsPrisma()!;
    store = new PrismaOsWorkforceStore(prisma);
    outbox = new PrismaOsOutboxStore(prisma);
    await store.truncateAll();
  });

  const ctx = (orgId: string, actor: string): RequestContext => ({
    organizationId: orgId,
    actorMemberId: actor,
    personId: '',
    authIdentityId: '',
    correlationId: createId(),
    effectiveAt: new Date(),
  });

  it('suspend during a provider outage: committed, retried by the worker, applied once when the provider returns', async () => {
    const provider = new RecordingProvider();
    const svc = new WorkforceCommandService(store, provider);
    const consumer = new AuthProviderEffectConsumer(svc);
    const worker = new OsOutboxWorker(outbox, [consumer], {
      batchSize: 50,
      maxAttempts: 5,
      baseRetryMs: 1000,
      maxRetryMs: 60_000,
    });

    const org = await store.seedOrganization('T01b', `t01b-${createId()}`);
    const admin = await store.seedScopedAdminMember(org.id, `adm-${createId()}@o.bo`, 'A', 'D', 'people.admin');
    const invited = await svc.execute('InviteMember', ctx(org.id, admin.member.id), {
      email: `ana-${createId()}@isalwa.bo`,
      givenName: 'Ana',
      familyName: 'Pérez',
      roleKey: 'sales_rep',
    });
    const memberId = String(invited.data.memberId);
    const subject = `subject:${createId()}`;
    await svc.execute('ActivateMember', ctx(org.id, memberId), { memberId, providerSubject: subject });
    await worker.runOnce();

    provider.down = true;
    provider.calls = [];
    await svc.execute('SuspendMember', ctx(org.id, admin.member.id), { memberId });
    const member = await prisma.osOrganizationMember.findUnique({ where: { id: memberId } });
    assert.equal(member!.accessStatus, 'suspended');
    assert.equal(provider.calls.length, 3, 'inline bounded retry ran 3 times');
    const failedAudit = await prisma.osAuditLog.count({
      where: { organizationId: org.id, action: 'auth.provider.side_effect_failed' },
    });
    assert.equal(failedAudit, 1);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.suspended' },
    });
    const msg = () => prisma.osOutboxMessage.findFirst({ where: { eventId: event!.id } });
    assert.equal((await msg())!.status, 'pending');

    provider.calls = [];
    const r1 = await worker.runOnce();
    const afterFail = (await msg())!;
    console.log(`[evidence] outage run: ${JSON.stringify(r1)} status=${afterFail.status} attempts=${afterFail.attemptCount} lastError=${afterFail.lastError}`);
    assert.equal(afterFail.status, 'pending');
    assert.equal(afterFail.attemptCount, 1);
    assert.equal(afterFail.lastError, 'PROVIDER_UNAVAILABLE');
    assert.deepEqual(provider.calls, [`revokeSessions:${subject}`]);

    provider.down = false;
    provider.calls = [];
    await prisma.osOutboxMessage.update({ where: { id: afterFail.id }, data: { nextAttemptAt: new Date(Date.now() - 1) } });
    const r2 = await worker.runOnce();
    const done = (await msg())!;
    console.log(`[evidence] recovery run: ${JSON.stringify(r2)} status=${done.status} attempts=${done.attemptCount}`);
    assert.equal(done.status, 'published');
    assert.deepEqual(provider.calls, [`revokeSessions:${subject}`]);
    assert.equal(provider.isSessionRevoked(subject), true);
    const dedup = await prisma.osOutboxConsumerDedup.count({
      where: { organizationId: org.id, consumerKey: consumer.consumerKey, eventId: event!.id },
    });
    assert.equal(dedup, 1);

    provider.calls = [];
    await worker.runOnce();
    assert.deepEqual(provider.calls, [], 'a published message is not delivered again');
  });
});
