import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import {
  ADDITIONAL_ASSIGNABLE_SCOPE_KEYS,
  GrantAdditionalRolePayloadSchema,
  type RequestContext,
} from '@isalwa/os-contracts';
import { memberHasScope } from '@isalwa/os-domain';
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

async function seedScopes(store: MemoryOsStore, orgId: string, memberId: string, roleKeys: readonly string[]) {
  for (const roleKey of roleKeys) {
    await store.insertRoleAssignment({
      id: createId(),
      organizationId: orgId,
      memberId,
      roleKey,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  }
}

/**
 * `admin` is a synthetic grantor that independently holds every grantable
 * scope, as the possession rule requires. `peopleOnly` holds only people.admin.
 */
async function harness() {
  const store = new MemoryOsStore();
  const svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
  const org = await store.seedOrganization('ISALWA S.R.L.', 'isalwa');
  const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
  await seedScopes(store, org.id, admin.member.id, ADDITIONAL_ASSIGNABLE_SCOPE_KEYS);
  const peopleOnly = await store.seedAdminMember(org.id, 'rrhh@isalwa.bo', 'Rrhh', 'User');
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
  const adminCtxAt = new Date('2026-09-14T12:00:00Z');
  return { store, svc, org, admin, peopleOnly, memberId, adminCtxAt };
}

async function activeKeys(store: MemoryOsStore, memberId: string, asOf: Date): Promise<string[]> {
  const roles = await store.listRoleAssignmentsForMember(memberId);
  return roles
    .filter((role) => role.endedAt === null && role.effectiveAt <= asOf)
    .map((role) => role.roleKey);
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
    const { store, svc, org, peopleOnly, memberId } = await harness();
    const adminCtx = ctx(org.id, peopleOnly.member.id, peopleOnly.person.id, peopleOnly.auth.id);
    await assert.rejects(
      () => svc.execute('GrantAdditionalRole', adminCtx, { memberId, roleKey: 'commercial.order.convert' }),
      /PERMISSION_DENIED/,
    );
    const adminKeys = await activeKeys(store, peopleOnly.member.id, adminCtx.effectiveAt);
    assert.ok(adminKeys.includes('people.admin'));
    assert.equal(adminKeys.includes('commercial.order.convert'), false);
    assert.equal(
      memberHasScope(
        {
          memberId: peopleOnly.member.id,
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

describe('Grant provisioning escalation (F03/F04)', () => {
  it('denies a people administrator granting a commercial scope they do not hold, to anyone', async () => {
    const { store, svc, org, peopleOnly, memberId } = await harness();
    const rrhh = ctx(org.id, peopleOnly.member.id, peopleOnly.person.id, peopleOnly.auth.id);
    const eventsBefore = store.businessEvents.length;
    for (const roleKey of ADDITIONAL_ASSIGNABLE_SCOPE_KEYS) {
      for (const target of [memberId, peopleOnly.member.id]) {
        await assert.rejects(
          () => svc.execute('GrantAdditionalRole', rrhh, { memberId: target, roleKey }),
          /PERMISSION_DENIED/,
          `${roleKey} -> ${target === memberId ? 'other' : 'self'}`,
        );
      }
      await assert.rejects(
        () => svc.execute('ChangeRole', rrhh, { memberId, roleKey }),
        /PERMISSION_DENIED/,
        `ChangeRole ${roleKey}`,
      );
    }
    assert.equal(store.businessEvents.length, eventsBefore);
    const rrhhKeys = await activeKeys(store, peopleOnly.member.id, rrhh.effectiveAt);
    assert.deepEqual(rrhhKeys, ['people.admin']);
    const targetKeys = await activeKeys(store, memberId, rrhh.effectiveAt);
    assert.deepEqual(targetKeys, ['sales_rep']);
  });

  it('denies granting to yourself even a scope you already hold', async () => {
    const { store, svc, org, admin } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const before = (await store.listRoleAssignmentsForMember(admin.member.id)).length;
    await assert.rejects(
      () =>
        svc.execute('GrantAdditionalRole', adminCtx, {
          memberId: admin.member.id,
          roleKey: 'commercial.work.manage',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal((await store.listRoleAssignmentsForMember(admin.member.id)).length, before);
  });

  it('lets a grantor who holds them provision a manager with edit, work and range scopes together', async () => {
    const { store, svc, org, admin, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    for (const roleKey of ['commercial.team.read', 'commercial.customer.edit', 'commercial.work.manage'] as const) {
      await svc.execute('GrantAdditionalRole', adminCtx, { memberId, roleKey });
    }
    const keys = await activeKeys(store, memberId, adminCtx.effectiveAt);
    assert.deepEqual(
      [...keys].sort(),
      ['commercial.customer.edit', 'commercial.team.read', 'commercial.work.manage', 'sales_rep'],
    );
  });

  it('denies appointing yourself as manager, a member as their own manager, and backdated changes', async () => {
    const { svc, org, admin, peopleOnly, memberId } = await harness();
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    await assert.rejects(
      () => svc.execute('ChangeManager', adminCtx, { memberId, managerMemberId: admin.member.id }),
      /PERMISSION_DENIED/,
    );
    await assert.rejects(
      () => svc.execute('ChangeManager', adminCtx, { memberId, managerMemberId: memberId }),
      /VALIDATION_FAILED/,
    );
    await assert.rejects(
      () =>
        svc.execute('ChangeManager', adminCtx, {
          memberId,
          managerMemberId: peopleOnly.member.id,
          effectiveAt: '2026-01-01T00:00:00.000Z',
        }),
      /VALIDATION_FAILED/,
    );
    await assert.rejects(
      () =>
        svc.execute('ChangeRole', adminCtx, {
          memberId,
          roleKey: 'commercial.team.read',
          effectiveAt: '2026-01-01T00:00:00.000Z',
        }),
      /VALIDATION_FAILED/,
    );
    const ok = await svc.execute('ChangeManager', adminCtx, { memberId, managerMemberId: peopleOnly.member.id });
    assert.ok(ok.data);
  });
});

describe('Grant and team range stay within the grantor (20:39 §2)', () => {
  async function teamHarness() {
    const h = await harness();
    const { store, svc, org } = h;
    const member = async (name: string, scopes: readonly string[]) => {
      const seeded = await store.seedAdminMember(org.id, `${name}@isalwa.bo`, name, 'T');
      const rows = await store.listRoleAssignmentsForMember(seeded.member.id);
      for (const row of rows) await store.endActiveRoleAssignments(row.memberId, new Date('2020-01-01'));
      await seedScopes(store, org.id, seeded.member.id, scopes);
      return seeded;
    };
    const reportTo = async (memberId: string, managerMemberId: string) =>
      store.insertManagerAssignment({
        id: createId(),
        organizationId: org.id,
        memberId,
        managerMemberId,
        effectiveAt: new Date('2020-01-01'),
        endedAt: null,
      });
    const teamLead = await member('teamlead', ['people.admin', 'commercial.team.read', 'commercial.customer.edit', 'commercial.work.manage']);
    const lead = await member('lead', ['commercial.team.read', 'commercial.customer.edit']);
    const editor = await member('editor', ['commercial.customer.edit']);
    const seller = await member('seller', ['commercial.customer.create']);
    const ownReport = await member('ownreport', ['commercial.customer.create']);
    const clerk = await member('clerk', []);
    await reportTo(ownReport.member.id, teamLead.member.id);
    const as = (who: { member: { id: string }; person: { id: string }; auth: { id: string } }) =>
      ctx(org.id, who.member.id, who.person.id, who.auth.id);
    return { ...h, svc, teamLead, lead, editor, seller, ownReport, clerk, as };
  }

  it('people.admin alone cannot put someone under a manager who holds team range', async () => {
    const t = await teamHarness();
    await assert.rejects(
      () => t.svc.execute('ChangeManager', t.as(t.peopleOnly), { memberId: t.seller.member.id, managerMemberId: t.lead.member.id }),
      /PERMISSION_DENIED/,
    );
    assert.equal((await t.store.listActiveDirectReportAssignments(t.org.id, t.lead.member.id, t.adminCtxAt)).length, 0);
  });

  it('people.admin alone may still assign a manager who holds no commercial range', async () => {
    const t = await teamHarness();
    const ok = await t.svc.execute('ChangeManager', t.as(t.peopleOnly), { memberId: t.seller.member.id, managerMemberId: t.clerk.member.id });
    assert.ok(ok.data);
  });

  it('a team-range grantor cannot extend a lead over someone outside their own team', async () => {
    const t = await teamHarness();
    await assert.rejects(
      () => t.svc.execute('ChangeManager', t.as(t.teamLead), { memberId: t.seller.member.id, managerMemberId: t.lead.member.id }),
      /PERMISSION_DENIED/,
    );
    const inside = await t.svc.execute('ChangeManager', t.as(t.teamLead), {
      memberId: t.ownReport.member.id,
      managerMemberId: t.lead.member.id,
    });
    assert.ok(inside.data, 'within the grantor team (their direct report) the same change is allowed');
  });

  it('an org-range grantor can extend a lead over anyone', async () => {
    const t = await teamHarness();
    const ok = await t.svc.execute('ChangeManager', t.as(t.admin), { memberId: t.seller.member.id, managerMemberId: t.lead.member.id });
    assert.ok(ok.data);
  });

  it('granting org range to an editor needs org-wide edit authority, not just commercial.org.read', async () => {
    const t = await teamHarness();
    const readerOnly = await t.store.seedAdminMember(t.org.id, 'reader@isalwa.bo', 'Reader', 'T');
    await seedScopes(t.store, t.org.id, readerOnly.member.id, ['commercial.org.read']);
    await assert.rejects(
      () =>
        t.svc.execute('GrantAdditionalRole', t.as(readerOnly), {
          memberId: t.editor.member.id,
          roleKey: 'commercial.org.read',
        }),
      /PERMISSION_DENIED/,
    );
    const ok = await t.svc.execute('GrantAdditionalRole', t.as(t.admin), {
      memberId: t.editor.member.id,
      roleKey: 'commercial.org.read',
    });
    assert.ok(ok.data);
  });
});
