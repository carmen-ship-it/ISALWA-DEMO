import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort, WorkforceCommandService } from '@isalwa/os-workforce';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

function ctx(
  orgId: string,
  actorMemberId: string,
  personId: string,
  authId: string,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date('2026-08-01T12:00:00Z'),
  };
}

describePrisma('workforce transactional completion', () => {
  let store: PrismaOsWorkforceStore;
  let svc: WorkforceCommandService;

  before(async () => {
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('OS_DATABASE_URL required');
    store = new PrismaOsWorkforceStore(prisma);
    svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
    await store.truncateAll();
  });

  after(async () => {
    await store.truncateAll();
  });

  async function seedAdminOrg() {
    const org = await store.seedOrganization('Tx Org', `tx-${createId()}`);
    const admin = await store.seedAdminMember(
      org.id,
      `admin-${createId()}@tx.bo`,
      'Admin',
      'User',
    );
    return { org, admin };
  }

  async function inviteAndActivate(
    orgId: string,
    admin: Awaited<ReturnType<typeof store.seedAdminMember>>,
  ) {
    const invited = await svc.execute(
      'InviteMember',
      ctx(orgId, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: `emp-${createId()}@tx.bo`,
        givenName: 'Emp',
        familyName: 'User',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(orgId, memberId, '', ''), {
      memberId,
      providerSubject: `subject:${memberId}`,
    });
    return memberId;
  }

  it('ChangeRole persists domain + event + audit + outbox + idempotency atomically', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `role-idem-${createId()}`;

    const eventsBefore = await store.countBusinessEvents(org.id);
    const rolesBefore = (await store.listRoleAssignmentsForMember(memberId)).length;

    await svc.execute('ChangeRole', session, { memberId, roleKey: 'sales_manager' }, key);

    assert.equal(await store.countBusinessEvents(org.id), eventsBefore + 1);
    assert.equal(await store.countAuditLogs(org.id), eventsBefore + 1);
    assert.equal(await store.countOutbox(org.id), eventsBefore + 1);
    assert.ok((await store.listRoleAssignmentsForMember(memberId)).length > rolesBefore);

    const event = await getOsPrisma()!.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.role.changed' },
      orderBy: { recordedAt: 'desc' },
    });
    assert.equal(event?.idempotencyKey, key);

    const idem = await store.findIdempotency(org.id, key);
    assert.ok(idem);

    const replay = await svc.execute('ChangeRole', session, { memberId, roleKey: 'sales_manager' }, key);
    assert.equal(replay.commandId, event?.id);
  });

  it('GrantDelegation atomic write includes outbox row', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const before = await store.countOutbox(org.id);

    await svc.execute(
      'GrantDelegation',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        delegateMemberId: memberId,
        scopes: ['people.admin'],
        expiresAt: new Date('2027-01-01T12:00:00Z').toISOString(),
      },
    );

    assert.equal(await store.countOutbox(org.id), before + 1);
  });

  it('transaction rolls back when outbox append fails', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const rolesBefore = (await store.listRoleAssignmentsForMember(memberId)).length;
    const eventsBefore = await store.countBusinessEvents(org.id);

    store.testFailNextAppend = true;
    await assert.rejects(
      () => svc.execute('ChangeRole', session, { memberId, roleKey: 'ops_manager' }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );

    assert.equal((await store.listRoleAssignmentsForMember(memberId)).length, rolesBefore);
    assert.equal(await store.countBusinessEvents(org.id), eventsBefore);
    assert.equal(await store.countOutbox(org.id), eventsBefore);
  });

  it('RevokeDelegation is atomic with event and audit', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const granted = await svc.execute('GrantDelegation', session, {
      delegateMemberId: memberId,
      scopes: ['approval.act'],
      expiresAt: new Date('2027-01-01T12:00:00Z').toISOString(),
    });
    const delegationId = granted.data.delegationId as string;
    const eventsBefore = await store.countBusinessEvents(org.id);

    await svc.execute('RevokeDelegation', session, { delegationId });

    assert.equal(await store.countBusinessEvents(org.id), eventsBefore + 1);
    const d = await store.findDelegation(org.id, delegationId);
    assert.ok(d?.revokedAt);
  });

  it('cross-tenant workforce command rejected', async () => {
    const { org, admin } = await seedAdminOrg();
    const orgB = await store.seedOrganization('Other', `other-${createId()}`);
    await assert.rejects(
      () =>
        svc.execute(
          'InviteMember',
          ctx(orgB.id, admin.member.id, admin.person.id, admin.auth.id),
          {
            email: `x-${createId()}@b.bo`,
            givenName: 'X',
            familyName: 'Y',
            roleKey: 'sales_rep',
          },
        ),
      /TENANT_FORBIDDEN/,
    );
  });
});

describePrisma('workforce interactive transaction hardening', () => {
  let store: PrismaOsWorkforceStore;
  let svc: WorkforceCommandService;
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;

  before(async () => {
    prisma = getOsPrisma()!;
    store = new PrismaOsWorkforceStore(prisma);
    svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
  });

  async function seedAdminOrg() {
    const org = await store.seedOrganization('Tx Hard Org', `txh-${createId()}`);
    const admin = await store.seedAdminMember(
      org.id,
      `admin-${createId()}@txh.bo`,
      'Admin',
      'User',
    );
    return { org, admin };
  }

  async function inviteAndActivate(
    orgId: string,
    admin: Awaited<ReturnType<typeof store.seedAdminMember>>,
  ) {
    const invited = await svc.execute(
      'InviteMember',
      ctx(orgId, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: `emp-${createId()}@txh.bo`,
        givenName: 'Emp',
        familyName: 'User',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(orgId, memberId, '', ''), {
      memberId,
      providerSubject: `subject:${memberId}`,
    });
    return memberId;
  }

  async function counts(organizationId: string) {
    const [roles, events, audits, outbox, idem] = await Promise.all([
      prisma.osRoleAssignment.count({ where: { organizationId } }),
      prisma.osBusinessEvent.count({ where: { organizationId } }),
      prisma.osAuditLog.count({ where: { organizationId } }),
      prisma.osOutboxMessage.count({ where: { organizationId } }),
      prisma.osIdempotencyKey.count({ where: { organizationId } }),
    ]);
    return { roles, events, audits, outbox, idem };
  }

  it('ChangeRole commits role event audit outbox atomically', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const before = await counts(org.id);

    await svc.execute('ChangeRole', session, { memberId, roleKey: 'sales_manager' });

    const after = await counts(org.id);
    assert.ok(after.roles >= before.roles);
    assert.equal(after.events, before.events + 1);
    assert.equal(after.audits, before.audits + 1);
    assert.equal(after.outbox, before.outbox + 1);
    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'member.role.changed' },
      orderBy: { recordedAt: 'desc' },
    });
    assert.ok(event);
    const audit = await prisma.osAuditLog.findFirst({
      where: { organizationId: org.id, resourceId: memberId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(audit);
    const outbox = await prisma.osOutboxMessage.findFirst({
      where: { organizationId: org.id, eventId: event!.id },
    });
    assert.ok(outbox);
  });

  it('rolls back role/event/audit/outbox when append fails', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const before = await counts(org.id);
    const rolesBefore = (await store.listRoleAssignmentsForMember(memberId)).map((r) => ({
      roleKey: r.roleKey,
      endedAt: r.endedAt?.toISOString() ?? null,
    }));

    store.testFailNextAppend = true;
    await assert.rejects(
      () => svc.execute('ChangeRole', session, { memberId, roleKey: 'ops_manager' }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    assert.equal(store.testFailNextAppend, false);

    const after = await counts(org.id);
    assert.deepEqual(after, before);
    const rolesAfter = (await store.listRoleAssignmentsForMember(memberId)).map((r) => ({
      roleKey: r.roleKey,
      endedAt: r.endedAt?.toISOString() ?? null,
    }));
    assert.deepEqual(rolesAfter, rolesBefore);
  });

  it('latency regression: delay above old 5s default still succeeds with new timeout', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    // Controlled Prisma lifetime: delay exceeds historical 5s default; config keeps 8s budget.
    store.interactiveTxOptions = { maxWait: 2_000, timeout: 8_000 };
    store.testAppendDelayMs = 5_500;
    const before = await counts(org.id);

    await svc.execute('ChangeRole', session, { memberId, roleKey: 'sales_manager' });

    const after = await counts(org.id);
    assert.equal(after.events, before.events + 1);
    assert.equal(after.audits, before.audits + 1);
    assert.equal(after.outbox, before.outbox + 1);
    store.interactiveTxOptions = undefined;
    store.testAppendDelayMs = 0;
  });

  it('latency regression: delay beyond configured timeout leaves no partial rows', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    store.interactiveTxOptions = { maxWait: 2_000, timeout: 1_200 };
    store.testAppendDelayMs = 2_000;
    const before = await counts(org.id);
    const rolesBefore = (await store.listRoleAssignmentsForMember(memberId)).map((r) => ({
      roleKey: r.roleKey,
      endedAt: r.endedAt?.toISOString() ?? null,
    }));

    await assert.rejects(() =>
      svc.execute('ChangeRole', session, { memberId, roleKey: 'ops_manager' }),
    );

    const after = await counts(org.id);
    assert.deepEqual(after, before);
    const rolesAfter = (await store.listRoleAssignmentsForMember(memberId)).map((r) => ({
      roleKey: r.roleKey,
      endedAt: r.endedAt?.toISOString() ?? null,
    }));
    assert.deepEqual(rolesAfter, rolesBefore);
    store.interactiveTxOptions = undefined;
    store.testAppendDelayMs = 0;
  });

  it('after failed ChangeRole, same store instance succeeds without stale tx client', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

    store.testFailNextAppend = true;
    await assert.rejects(
      () => svc.execute('ChangeRole', session, { memberId, roleKey: 'ops_manager' }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );

    await svc.execute('ChangeRole', session, { memberId, roleKey: 'sales_manager' });
    const roles = await store.listRoleAssignmentsForMember(memberId);
    assert.ok(roles.some((r) => r.roleKey === 'sales_manager' && r.endedAt == null));
  });

  it('ChangeRole still requires people.admin; sales_rep is denied', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const member = await store.getMemberInOrg(org.id, memberId);
    assert.ok(member);
    const auth = await store.findAuthIdentityByPersonAndStatus(member!.personId, 'active');
    assert.ok(auth);

    await assert.rejects(
      () =>
        svc.execute(
          'ChangeRole',
          ctx(org.id, memberId, member!.personId, auth!.id),
          { memberId, roleKey: 'sales_manager' },
        ),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('cross-tenant ChangeRole rejected (tenant isolation)', async () => {
    const { org, admin } = await seedAdminOrg();
    const memberId = await inviteAndActivate(org.id, admin);
    const orgB = await store.seedOrganization('Other Hard', `txh-b-${createId()}`);

    await assert.rejects(
      () =>
        svc.execute(
          'ChangeRole',
          ctx(orgB.id, admin.member.id, admin.person.id, admin.auth.id),
          { memberId, roleKey: 'sales_manager' },
        ),
      /TENANT_FORBIDDEN/,
    );
  });
});
