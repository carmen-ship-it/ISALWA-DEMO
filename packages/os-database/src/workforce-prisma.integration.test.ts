import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from '@isalwa/os-workforce';
import { WorkforceCommandService } from '@isalwa/os-workforce';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';

async function checkDb(): Promise<boolean> {
  if (!process.env.OS_DATABASE_URL) return false;
  try {
    const prisma = getOsPrisma();
    if (!prisma) return false;
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

function ctx(
  orgId: string,
  actorMemberId: string,
  personId: string,
  authId: string,
  effectiveAt?: Date,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: effectiveAt ?? new Date('2026-08-01T12:00:00Z'),
  };
}

describePrisma('workforce prisma integration', () => {
  let store: PrismaOsWorkforceStore;
  let svc: WorkforceCommandService;
  const auth = new LocalAuthProviderPort();

  before(async () => {
    if (!await checkDb()) {
      throw new Error('Postgres not reachable — start docker compose postgres and run migrate:deploy');
    }
    const prisma = getOsPrisma();
    if (!prisma) throw new Error('OS_DATABASE_URL required');
    store = new PrismaOsWorkforceStore(prisma);
    svc = new WorkforceCommandService(store, auth);
    await store.truncateAll();
  });

  after(async () => {
    await store.truncateAll();
  });

  it('invite and activate persists lifecycle + events', async () => {
    const org = await store.seedOrganization('ISALWA S.R.L.', `isalwa-${createId().slice(0, 8)}`);
    const admin = await store.seedAdminMember(org.id, `admin-${createId().slice(0, 6)}@isalwa.bo`, 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: `ana-${createId().slice(0, 6)}@isalwa.bo`,
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );

    const memberId = invited.data.memberId as string;
    assert.equal(await store.countBusinessEvents(org.id), 1);
    assert.equal(await store.countAuditLogs(org.id), 1);
    assert.equal(await store.countOutbox(org.id), 1);

    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana-prisma',
    });

    const member = await store.getMember(memberId);
    assert.equal(member?.accessStatus, 'active');
    assert.equal(await store.countBusinessEvents(org.id), 2);
  });

  it('tenant isolation on prisma store', async () => {
    const orgA = await store.seedOrganization('Tenant A', `tenant-a-${createId().slice(0, 6)}`);
    const orgB = await store.seedOrganization('Tenant B', `tenant-b-${createId().slice(0, 6)}`);
    const adminA = await store.seedAdminMember(orgA.id, `a-${createId().slice(0, 6)}@a.bo`, 'A', 'Admin');

    await assert.rejects(
      () =>
        svc.execute(
          'InviteMember',
          ctx(orgB.id, adminA.member.id, adminA.person.id, adminA.auth.id),
          {
            email: `x-${createId().slice(0, 6)}@b.bo`,
            givenName: 'X',
            familyName: 'Y',
            roleKey: 'sales_rep',
          },
        ),
      /TENANT_FORBIDDEN/,
    );
  });

  it('full lifecycle: role, dept, manager, delegation, terminate, rehire', async () => {
    const org = await store.seedOrganization('Lifecycle Co', `life-${createId().slice(0, 6)}`);
    const admin = await store.seedAdminMember(
      org.id,
      `admin-${createId().slice(0, 6)}@life.bo`,
      'Admin',
      'User',
    );
    const depts = await store.listDepartments(org.id);
    const deptId = depts[0]?.id;

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: `emp-${createId().slice(0, 6)}@life.bo`,
        givenName: 'Emp',
        familyName: 'User',
        roleKey: 'sales_rep',
        departmentId: deptId,
      },
    );
    const memberId = invited.data.memberId as string;
    const personId = invited.data.personId as string;

    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: `subject:emp-${memberId}`,
    });

    await svc.execute(
      'ChangeRole',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId, roleKey: 'sales_manager' },
    );
    await svc.execute(
      'ChangeManager',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId, managerMemberId: admin.member.id },
    );
    await svc.execute(
      'GrantDelegation',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        delegateMemberId: memberId,
        scopes: ['people.admin'],
        expiresAt: new Date('2026-08-02T12:00:00Z').toISOString(),
      },
    );

    const roles = await store.listRoleAssignmentsForMember(memberId);
    assert.ok(roles.length >= 2);

    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    const terminated = await store.getMember(memberId);
    assert.equal(terminated?.accessStatus, 'revoked');
    const person = await store.getPerson(personId);
    assert.ok(person);

    const rehired = await svc.execute(
      'RehireMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        personId,
        email: `rehire-${createId().slice(0, 6)}@life.bo`,
        roleKey: 'sales_rep',
      },
    );
    assert.notEqual(rehired.data.memberId, memberId);
    const persons = await store.getPerson(personId);
    assert.ok(persons);
  });

  it('idempotency prevents duplicate invite', async () => {
    const org = await store.seedOrganization('Idem Co', `idem-${createId().slice(0, 6)}`);
    const admin = await store.seedAdminMember(
      org.id,
      `admin-${createId().slice(0, 6)}@idem.bo`,
      'Admin',
      'User',
    );
    const key = `idem-${createId()}`;
    const payload = {
      email: `idem-${createId().slice(0, 6)}@idem.bo`,
      givenName: 'I',
      familyName: 'D',
      roleKey: 'sales_rep',
    };
    const session = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

    const first = await svc.execute('InviteMember', session, payload, key);
    const second = await svc.execute('InviteMember', session, payload, key);
    assert.equal(first.commandId, second.commandId);

    const members = await store.getMember(first.data.memberId as string);
    assert.ok(members);
  });

  it('terminated member cannot operate', async () => {
    const org = await store.seedOrganization('Term Co', `term-${createId().slice(0, 6)}`);
    const admin = await store.seedAdminMember(
      org.id,
      `admin-${createId().slice(0, 6)}@term.bo`,
      'Admin',
      'User',
    );
    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: `t-${createId().slice(0, 6)}@term.bo`,
        givenName: 'T',
        familyName: 'U',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:term',
    });
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    await assert.rejects(
      () =>
        svc.execute('RequestMemberEmailChange', ctx(org.id, memberId, '', ''), {
          newEmail: 'new@term.bo',
        }),
      /ACCESS_REVOKED/,
    );
  });
});
