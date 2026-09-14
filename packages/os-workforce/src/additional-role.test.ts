import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import { GrantAdditionalRolePayloadSchema, type RequestContext } from '@isalwa/os-contracts';
import { computeEffectiveScopes, memberHasScope } from '@isalwa/os-domain';
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
    effectiveAt: new Date('2026-09-14T12:00:00Z'),
  };
}

async function harness() {
  const store = new MemoryOsStore();
  const svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
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
    },
  );
  const memberId = invited.data.memberId as string;
  await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
    memberId,
    providerSubject: 'subject:ana@isalwa.bo',
  });
  return { store, svc, org, admin, memberId };
}

async function activeKeys(store: MemoryOsStore, memberId: string, asOf: Date): Promise<string[]> {
  const roles = await store.listRoleAssignmentsForMember(memberId);
  return computeEffectiveScopes(
    roles.map((role) => ({
      roleKey: role.roleKey,
      effectiveAt: role.effectiveAt,
      endedAt: role.endedAt,
    })),
    [],
    asOf,
  );
}

describe('GrantAdditionalRole / EndAdditionalRole', () => {
  it('keeps the operational role when an explicit permission is added and revoked', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const asOf = adminCtx.effectiveAt;

    for (const roleKey of [
      'commercial.order.convert',
      'commercial.account.reassign',
      'commercial.team.read',
      'commercial.org.read',
    ] as const) {
      const granted = await svc.execute('GrantAdditionalRole', adminCtx, { memberId, roleKey });
      assert.equal(granted.data.roleKey, roleKey);
      assert.equal(typeof granted.data.assignmentId, 'string');
      const keys = await activeKeys(store, memberId, asOf);
      assert.ok(keys.includes('sales_rep'));
      assert.ok(keys.includes(roleKey));
    }

    await svc.execute('EndAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.order.convert',
    });
    const afterRevoke = await activeKeys(store, memberId, asOf);
    assert.ok(afterRevoke.includes('sales_rep'));
    assert.equal(afterRevoke.includes('commercial.order.convert'), false);
    assert.ok(afterRevoke.includes('commercial.account.reassign'));

    const sales = await store.listRoleAssignmentsForMember(memberId);
    assert.ok(sales.some((row) => row.roleKey === 'sales_rep' && row.endedAt === null));
    const ended = sales.filter((row) => row.roleKey === 'commercial.order.convert');
    assert.ok(ended.every((row) => row.endedAt !== null));
    assert.ok(ended.length >= 1);
  });

  it('treats a duplicate active grant as the same assignment', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const first = await svc.execute('GrantAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.order.convert',
    });
    const eventsBefore = store.businessEvents.length;
    const second = await svc.execute('GrantAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.order.convert',
    });
    assert.equal(second.data.alreadyAssigned, true);
    assert.equal(second.data.assignmentId, first.data.assignmentId);
    assert.equal(store.businessEvents.length, eventsBefore);
    const active = (await store.listRoleAssignmentsForMember(memberId)).filter(
      (row) => row.roleKey === 'commercial.order.convert' && row.endedAt === null,
    );
    assert.equal(active.length, 1);
  });

  it('denies an unknown key, an unauthorized actor, and a cross-tenant target', async () => {
    const { svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

    await assert.rejects(
      () =>
        svc.execute('GrantAdditionalRole', adminCtx, {
          memberId,
          roleKey: 'not.a.scope',
        }),
      /VALIDATION_FAILED/,
    );

    await assert.rejects(
      () =>
        svc.execute('GrantAdditionalRole', ctx(org.id, memberId, '', ''), {
          memberId,
          roleKey: 'commercial.order.convert',
        }),
      /PERMISSION_DENIED/,
    );

    const other = new MemoryOsStore();
    const otherSvc = new WorkforceCommandService(other, new LocalAuthProviderPort());
    const orgB = await other.seedOrganization('Other', 'other');
    const adminB = await other.seedAdminMember(orgB.id, 'b@b.bo', 'B', 'Admin');
    await assert.rejects(
      () =>
        svc.execute('GrantAdditionalRole', adminCtx, {
          memberId: adminB.member.id,
          roleKey: 'commercial.team.read',
        }),
      /NOT_FOUND/,
    );
    void otherSvc;

    await assert.rejects(
      () =>
        svc.execute(
          'GrantAdditionalRole',
          { ...adminCtx, organizationId: orgB.id },
          { memberId, roleKey: 'commercial.org.read' },
        ),
      /TENANT_FORBIDDEN/,
    );
  });

  it('follows ChangeRole for a suspended target and does not infer Cargo', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const member = await store.getMember(memberId);
    assert.ok(member);
    await store.updateMember(memberId, { accessStatus: 'suspended', version: member.version + 1 });
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

    const parsed = GrantAdditionalRolePayloadSchema.parse({
      memberId,
      roleKey: 'commercial.account.reassign',
      cargo: 'JEFE COMERCIAL',
    });
    assert.equal('cargo' in parsed, false);
    assert.deepEqual(Object.keys(GrantAdditionalRolePayloadSchema.shape).sort(), [
      'memberId',
      'roleKey',
    ]);

    await svc.execute('GrantAdditionalRole', adminCtx, parsed);
    const keys = await activeKeys(store, memberId, adminCtx.effectiveAt);
    assert.ok(keys.includes('sales_rep'));
    assert.ok(keys.includes('commercial.account.reassign'));
    assert.equal(keys.includes('people.admin'), false);
  });

  it('does not give people.admin the commercial capability being assigned', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('GrantAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.order.convert',
    });
    const adminKeys = await activeKeys(store, admin.member.id, adminCtx.effectiveAt);
    assert.ok(adminKeys.includes('people.admin'));
    assert.equal(adminKeys.includes('commercial.order.convert'), false);
    assert.equal(
      memberHasScope(
        {
          memberId: admin.member.id,
          organizationId: org.id,
          accessStatus: 'active',
          roleKeys: adminKeys,
          delegatedScopes: [],
        },
        'people.admin',
      ),
      true,
    );
  });

  it('records grant and revoke on the event, audit, and outbox without rewriting history', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const granted = await svc.execute('GrantAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.team.read',
    });
    const assignmentId = granted.data.assignmentId as string;
    const grantEvent = store.businessEvents.find(
      (event) => event.eventType === 'member.additional_role.granted',
    );
    assert.ok(grantEvent);
    assert.equal(grantEvent.actorMemberId, admin.member.id);
    assert.equal(grantEvent.primaryEntityId, assignmentId);
    assert.equal(grantEvent.payload?.roleKey, 'commercial.team.read');
    assert.equal(grantEvent.payload?.grantedByMemberId, admin.member.id);
    assert.ok(store.outbox.some((row) => row.eventId === grantEvent.id));
    assert.ok(
      store.auditLogs.some(
        (row) => row.action === 'member.additional_role.granted' && row.resourceId === assignmentId,
      ),
    );

    await svc.execute('EndAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.team.read',
    });
    const endEvent = store.businessEvents.find(
      (event) => event.eventType === 'member.additional_role.ended',
    );
    assert.ok(endEvent);
    assert.equal(endEvent.actorMemberId, admin.member.id);
    assert.equal(endEvent.payload?.assignmentId, assignmentId);
    assert.equal(endEvent.payload?.revokedByMemberId, admin.member.id);
    assert.ok(store.outbox.some((row) => row.eventId === endEvent.id));
    const history = (await store.listRoleAssignmentsForMember(memberId)).filter(
      (row) => row.id === assignmentId,
    );
    assert.equal(history.length, 1);
    assert.ok(history[0]?.endedAt);
  });

  it('ChangeRole still replaces every active assignment, including additional permissions', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await svc.execute('GrantAdditionalRole', adminCtx, {
      memberId,
      roleKey: 'commercial.org.read',
    });
    await svc.execute('ChangeRole', adminCtx, { memberId, roleKey: 'sales_manager' });
    const keys = await activeKeys(store, memberId, adminCtx.effectiveAt);
    assert.deepEqual(keys, ['sales_manager']);
  });
});
