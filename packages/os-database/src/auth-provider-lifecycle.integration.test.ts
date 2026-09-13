import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsWorkforceStore } from './index';
import { LocalAuthProviderPort, WorkforceCommandService } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

class TrackingAuthProvider extends LocalAuthProviderPort {
  sessionRevokeCalls: string[] = [];
  credentialRevokeCalls: string[] = [];
  sessionRevokeFailCount = 0;
  credentialRevokeFailCount = 0;

  override async revokeSessions(providerSubject: string): Promise<void> {
    this.sessionRevokeCalls.push(providerSubject);
    if (this.sessionRevokeFailCount > 0) {
      this.sessionRevokeFailCount -= 1;
      throw new Error('PROVIDER_SESSION_REVOKE_FAILED');
    }
    await super.revokeSessions(providerSubject);
  }

  override async revokeCredentials(providerSubject: string): Promise<void> {
    this.credentialRevokeCalls.push(providerSubject);
    if (this.credentialRevokeFailCount > 0) {
      this.credentialRevokeFailCount -= 1;
      throw new Error('PROVIDER_REVOKE_FAILED');
    }
    await super.revokeCredentials(providerSubject);
  }
}

describePrisma('auth provider lifecycle (Step 14.6)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let store: PrismaOsWorkforceStore;
  let auth: TrackingAuthProvider;
  let svc: WorkforceCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    store = new PrismaOsWorkforceStore(prisma);
    auth = new TrackingAuthProvider();
    svc = new WorkforceCommandService(store, auth);
    await store.truncateAll();
  });

  function ctx(
    orgId: string,
    memberId: string,
    personId: string,
    authId: string,
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: `corr-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date('2026-08-24T12:00:00Z'),
    };
  }

  async function seedWorkerWithSubject() {
    const org = await store.seedOrganization('Auth Life', `auth-${Date.now()}`);
    const admin = await store.seedScopedAdminMember(
      org.id,
      `adm-${Date.now()}@o.bo`,
      'Ad',
      'Min',
      'people.admin',
    );
    const worker = await store.seedScopedAdminMember(
      org.id,
      `wrk-${Date.now()}@o.bo`,
      'Wo',
      'Rker',
      'member_active',
    );
    const subject = `subject:${worker.member.id}`;
    await store.updateAuthIdentity(worker.auth.id, {
      status: 'active',
      providerSubject: subject,
      activatedAt: new Date('2026-08-01T12:00:00Z'),
    });
    return { org, admin, worker, subject };
  }

  it('suspend commits OS state and revokes provider sessions post-commit', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    await svc.execute(
      'SuspendMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId: worker.member.id },
    );
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'suspended');
    assert.deepEqual(auth.sessionRevokeCalls, [subject]);
    assert.ok(auth.isSessionRevoked(subject));
    assert.equal(auth.isRevoked(subject), false);
  });

  it('provider session revoke failure keeps OS suspended and records audit', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    auth.sessionRevokeFailCount = 3;
    await svc.execute(
      'SuspendMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId: worker.member.id },
    );
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'suspended');
    assert.equal(auth.sessionRevokeCalls.filter((s) => s === subject).length, 3);
    const audit = await prisma.osAuditLog.findFirst({
      where: {
        organizationId: org.id,
        action: 'auth.provider.side_effect_failed',
        resourceId: worker.member.id,
      },
    });
    assert.ok(audit);
    const after = audit.afterJson as Record<string, unknown>;
    assert.equal(after.action, 'revoke_sessions');
    assert.equal(after.providerSubject, subject);
  });

  it('RetryAuthProviderSync replays suspend session revoke', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    auth.sessionRevokeFailCount = 3;
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('SuspendMember', session, { memberId: worker.member.id });
    auth.sessionRevokeCalls = [];
    await svc.execute('RetryAuthProviderSync', session, { memberId: worker.member.id });
    assert.deepEqual(auth.sessionRevokeCalls, [subject]);
    assert.ok(auth.isSessionRevoked(subject));
  });

  it('terminate revokes provider credentials post-commit', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId: worker.member.id },
    );
    const member = await store.getMember(worker.member.id);
    assert.equal(member?.accessStatus, 'revoked');
    assert.deepEqual(auth.credentialRevokeCalls, [subject]);
    assert.ok(auth.isRevoked(subject));
    const identity = await store.findAuthIdentityByPersonAndStatus(worker.person.id, 'revoked');
    assert.ok(identity);
  });

  it('provider credential revoke failure keeps OS terminated and allows retry', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    auth.credentialRevokeFailCount = 3;
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('TerminateMember', session, { memberId: worker.member.id });
    assert.equal((await store.getMember(worker.member.id))?.accessStatus, 'revoked');
    auth.credentialRevokeCalls = [];
    await svc.execute('RetryAuthProviderSync', session, { memberId: worker.member.id });
    assert.deepEqual(auth.credentialRevokeCalls, [subject]);
  });

  it('reactivation does not require provider relink when credentials preserved', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    auth.credentialRevokeCalls = [];
    auth.sessionRevokeCalls = [];
    await svc.execute('SuspendMember', session, { memberId: worker.member.id });
    assert.ok(auth.isSessionRevoked(subject));
    await svc.execute('ActivateMember', session, {
      memberId: worker.member.id,
      providerSubject: subject,
    });
    assert.equal((await store.getMember(worker.member.id))?.accessStatus, 'active');
    assert.equal(auth.credentialRevokeCalls.length, 0);
  });

  it('rehire creates new invited AuthIdentity and provider invite', async () => {
    const { org, admin, worker, subject } = await seedWorkerWithSubject();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('TerminateMember', session, { memberId: worker.member.id });
    const result = await svc.execute('RehireMember', session, {
      personId: worker.person.id,
      email: `rehire-${Date.now()}@o.bo`,
      roleKey: 'member_active',
    });
    assert.ok(result.data.memberId);
    const identities = await prisma.osAuthIdentity.count({
      where: { personId: worker.person.id },
    });
    assert.equal(identities, 2);
    assert.ok(auth.isRevoked(subject));
  });

  it('duplicate SuspendMember idempotent without duplicate provider revoke', async () => {
    const { org, admin, worker } = await seedWorkerWithSubject();
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `suspend-auth-${Date.now()}`;
    auth.sessionRevokeCalls = [];
    await svc.execute('SuspendMember', session, { memberId: worker.member.id }, key);
    await svc.execute('SuspendMember', session, { memberId: worker.member.id }, key);
    assert.equal(auth.sessionRevokeCalls.length, 1);
  });
});
