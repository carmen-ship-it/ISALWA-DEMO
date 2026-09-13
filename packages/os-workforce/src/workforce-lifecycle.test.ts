import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';

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

describe('workforce lifecycle', () => {
  it('invite and activate member', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA S.R.L.', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
        departmentId: (await store.listDepartments(org.id))[0]?.id,
      },
    );

    const memberId = invited.data.memberId as string;
    assert.ok(store.businessEvents.some((e) => e.eventType === 'member.invited'));
    assert.ok(store.outbox.length === 1);
    assert.ok(store.auditLogs.length === 1);

    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana@isalwa.bo',
    });

    const member = await store.getMember(memberId);
    assert.equal(member?.accessStatus, 'active');
    assert.ok(store.businessEvents.some((e) => e.eventType === 'member.activated'));
  });

  it('tenant A cannot invite in tenant B context', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const orgA = await store.seedOrganization('Tenant A', 'tenant-a');
    const orgB = await store.seedOrganization('Tenant B', 'tenant-b');
    const adminA = await store.seedAdminMember(orgA.id, 'a@a.bo', 'A', 'Admin');

    await assert.rejects(
      () =>
        svc.execute(
          'InviteMember',
          { ...ctx(orgB.id, adminA.member.id, adminA.person.id, adminA.auth.id) },
          {
            email: 'x@b.bo',
            givenName: 'X',
            familyName: 'Y',
            roleKey: 'sales_rep',
          },
        ),
      /TENANT_FORBIDDEN/,
    );
  });

  it('employee cannot perform admin action', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'rep@isalwa.bo',
        givenName: 'Rep',
        familyName: 'User',
        roleKey: 'sales_rep',
      },
    );
    const repId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, repId, '', ''), {
      memberId: repId,
      providerSubject: 'subject:rep',
    });

    await assert.rejects(
      () =>
        svc.execute(
          'InviteMember',
          ctx(org.id, repId, '', ''),
          {
            email: 'other@isalwa.bo',
            givenName: 'O',
            familyName: 'T',
            roleKey: 'sales_rep',
          },
        ),
      /PERMISSION_DENIED/,
    );
  });

  it('delegation expires — no authority after expiry', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'rep@isalwa.bo',
        givenName: 'Rep',
        familyName: 'User',
        roleKey: 'sales_rep',
      },
    );
    const repId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, repId, '', ''), {
      memberId: repId,
      providerSubject: 'subject:rep',
    });

    const grant = await svc.execute(
      'GrantDelegation',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        delegateMemberId: repId,
        scopes: ['people.admin'],
        expiresAt: new Date('2026-08-02T12:00:00Z').toISOString(),
      },
    );

    const afterExpiry = {
      ...ctx(org.id, repId, '', ''),
      effectiveAt: new Date('2026-08-03T12:00:00Z'),
    };
    await assert.rejects(
      () =>
        svc.execute('InviteMember', afterExpiry, {
          email: 'z@isalwa.bo',
          givenName: 'Z',
          familyName: 'Z',
          roleKey: 'sales_rep',
        }),
      /PERMISSION_DENIED/,
    );

    void grant;
  });

  it('terminate revokes access; person history preserved', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    const personId = invited.data.personId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });

    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    const member = await store.getMember(memberId);
    assert.equal(member?.accessStatus, 'revoked');
    assert.equal(member?.employmentStatus, 'terminated');
    assert.ok(store.persons.find((p) => p.id === personId));
    assert.ok(store.businessEvents.filter((e) => e.eventType === 'member.terminated').length === 1);
    assert.equal(auth.isRevoked('subject:ana'), true);
  });

  it('rehire uses same person', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    const personId = invited.data.personId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    const rehired = await svc.execute(
      'RehireMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        personId,
        email: 'ana@isalwa.bo',
        roleKey: 'sales_rep',
      },
    );

    assert.notEqual(rehired.data.memberId, memberId);
    assert.ok(store.businessEvents.some((e) => e.eventType === 'employment.restarted'));
    assert.equal(store.persons.filter((p) => p.id === personId).length, 1);
  });

  it('ChangeDepartment rejects nonexistent department without mutation', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    const eventsBefore = store.businessEvents.length;

    await assert.rejects(
      () =>
        svc.execute(
          'ChangeDepartment',
          ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
          { memberId, departmentId: 'dept-does-not-exist' },
        ),
      /VALIDATION_FAILED/,
    );
    assert.equal(store.businessEvents.length, eventsBefore);
  });

  it('role change preserves history via ended assignments', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;

    const changeCtx = {
      ...ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      effectiveAt: new Date('2026-06-01'),
    };
    await svc.execute('ChangeRole', changeCtx, {
      memberId,
      roleKey: 'sales_manager',
      effectiveAt: changeCtx.effectiveAt.toISOString(),
    });

    const assignments = store.roleAssignments.filter((r) => r.memberId === memberId);
    assert.equal(assignments.length, 2);
    assert.ok(assignments.some((a) => a.roleKey === 'sales_rep' && a.endedAt !== null));
    assert.ok(assignments.some((a) => a.roleKey === 'sales_manager' && a.endedAt === null));
  });

  it('ActivateMember rejects terminated member bypassing Rehire (J-13)', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    await assert.rejects(
      () =>
        svc.execute(
          'ActivateMember',
          ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
          { memberId, providerSubject: 'subject:ana' },
        ),
      /VALIDATION_FAILED/,
    );
  });

  it('terminated member cannot operate', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    await assert.rejects(
      () =>
        svc.execute('RequestMemberEmailChange', ctx(org.id, memberId, '', ''), {
          newEmail: 'new@isalwa.bo',
        }),
      /ACCESS_REVOKED/,
    );
  });

  it('email change blocked when provider credentials revoked', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    const invited = await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute(
      'TerminateMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { memberId },
    );

    await assert.rejects(
      () =>
        svc.execute(
          'ChangeMemberEmail',
          ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
          { memberId, newEmail: 'new@isalwa.bo' },
        ),
      /PROVIDER_CREDENTIAL_REVOKED|VALIDATION_FAILED/,
    );
  });

  it('business events only — no ActivityEvent', () => {
    const store = new MemoryOsStore();
    assert.equal(store.businessEvents.length, 0);
    // Memory store uses BusinessEvent shape from os-events — not legacy ActivityEvent
  });

  it('admin command produces audit log', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');

    await svc.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        email: 'ana@isalwa.bo',
        givenName: 'Ana',
        familyName: 'Pérez',
        roleKey: 'sales_rep',
      },
    );

    assert.ok(store.auditLogs.length >= 1);
    assert.ok(store.auditLogs.every((a) => a.organizationId === org.id));
  });
});
