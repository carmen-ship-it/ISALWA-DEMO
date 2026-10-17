import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';

/**
 * Re-review R3/R2F decision 1 (2026-10-16 22:29): ActivateMember never revives
 * authority from the previous lifecycle, including members suspended before
 * suspension started ending it (rows written directly here, as older code left them).
 */
const NOW = new Date('2026-06-01T12:00:00.000Z');
const DAY = 24 * 3600 * 1000;

function ctx(organizationId: string, actorMemberId: string, effectiveAt = NOW): RequestContext {
  return { organizationId, actorMemberId, personId: '', authIdentityId: '', correlationId: createId(), effectiveAt };
}

async function harness() {
  const store = new MemoryOsStore();
  const svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
  const org = await store.seedOrganization('ISALWA', `isalwa-${createId()}`);
  const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
  const legacy = await store.seedAdminMember(org.id, 'legacy@isalwa.bo', 'Legacy', 'User');
  const holder = await store.seedAdminMember(org.id, 'holder@isalwa.bo', 'Holder', 'User');
  const helper = await store.seedAdminMember(org.id, 'helper@isalwa.bo', 'Helper', 'User');
  const delegation = (delegatorMemberId: string, delegateMemberId: string, startsAt: Date) => {
    const row = {
      id: createId(),
      organizationId: org.id,
      delegatorMemberId,
      delegateMemberId,
      scopes: ['people.admin'],
      startsAt,
      expiresAt: new Date(NOW.getTime() + 30 * DAY),
      revokedAt: null as Date | null,
    };
    store.delegations.push(row);
    return row;
  };
  const coverage = (primaryOwnerMemberId: string, actingAdvisorMemberId: string, startsAt: Date) => {
    const row = {
      id: createId(),
      organizationId: org.id,
      customerPartyId: createId(),
      customerDisplayName: 'Cliente',
      primaryOwnerMemberId,
      actingAdvisorMemberId,
      role: 'acting' as const,
      startsAt,
      endsAt: null,
      revokedAt: null as Date | null,
    };
    store.customerCoverageGrants.push(row);
    return row;
  };
  const setStatus = (memberId: string, accessStatus: 'active' | 'suspended') => {
    store.members.find((m) => m.id === memberId)!.accessStatus = accessStatus;
  };
  return { store, svc, org, admin, legacy, holder, helper, delegation, coverage, setStatus };
}

async function delegatedScopesFor(store: MemoryOsStore, organizationId: string, memberId: string, asOf: Date) {
  return computeEffectiveScopes([], await store.listDelegationsForDelegate(memberId, organizationId), asOf);
}

describe('ActivateMember ends authority from the previous lifecycle', () => {
  it('a member suspended before ce74648 keeps nothing on reactivation: delegations issued/received (current and future) and received coverage end; rows kept', async () => {
    const h = await harness();
    const issued = h.delegation(h.legacy.member.id, h.helper.member.id, new Date(NOW.getTime() - DAY));
    const issuedFuture = h.delegation(h.legacy.member.id, h.helper.member.id, new Date(NOW.getTime() + 5 * DAY));
    const received = h.delegation(h.holder.member.id, h.legacy.member.id, new Date(NOW.getTime() - DAY));
    const receivedCoverage = h.coverage(h.holder.member.id, h.legacy.member.id, new Date(NOW.getTime() + 2 * DAY));
    const issuedCoverage = h.coverage(h.legacy.member.id, h.helper.member.id, new Date(NOW.getTime() - DAY));
    h.setStatus(h.legacy.member.id, 'suspended');

    await h.svc.execute('ActivateMember', ctx(h.org.id, h.admin.member.id), {
      memberId: h.legacy.member.id,
      providerSubject: `subject:${h.legacy.member.id}`,
    });

    assert.equal(h.store.members.find((m) => m.id === h.legacy.member.id)!.accessStatus, 'active');
    for (const row of [issued, issuedFuture, received]) assert.deepEqual(row.revokedAt, NOW);
    assert.deepEqual(receivedCoverage.revokedAt, NOW, 'received coverage is from the previous lifecycle');
    assert.equal(issuedCoverage.revokedAt, null, 'coverage for the owner’s customers confers nothing on the owner');
    assert.equal(h.store.delegations.length, 3, 'rows kept as history');
    const later = new Date(NOW.getTime() + 10 * DAY);
    assert.deepEqual(await delegatedScopesFor(h.store, h.org.id, h.helper.member.id, later), []);
    assert.deepEqual(await delegatedScopesFor(h.store, h.org.id, h.legacy.member.id, later), []);
    const payload = h.store.businessEvents.find((e) => e.eventType === 'member.activated')!.payload as Record<string, unknown>;
    assert.deepEqual(payload.endedDelegationIds, [issued.id, issuedFuture.id, received.id].sort());
    assert.deepEqual(
      (payload.endedCustomerCoverage as Array<Record<string, unknown>>).map((e) => [e.grantId, e.memberRole]),
      [[receivedCoverage.id, 'acting_advisor']],
    );
  });

  it('a fresh authorized grant after reactivation works', async () => {
    const h = await harness();
    h.setStatus(h.legacy.member.id, 'suspended');
    await h.svc.execute('ActivateMember', ctx(h.org.id, h.admin.member.id), {
      memberId: h.legacy.member.id,
      providerSubject: `subject:${h.legacy.member.id}`,
    });
    await h.svc.execute('GrantDelegation', ctx(h.org.id, h.holder.member.id), {
      delegateMemberId: h.legacy.member.id,
      scopes: ['people.admin'],
      expiresAt: new Date(NOW.getTime() + 7 * DAY).toISOString(),
    });
    assert.deepEqual(await delegatedScopesFor(h.store, h.org.id, h.legacy.member.id, NOW), ['people.admin']);
  });

  it('repeated activation of an active member is refused and does not touch legitimate delegations', async () => {
    const h = await harness();
    const current = h.delegation(h.holder.member.id, h.legacy.member.id, new Date(NOW.getTime() - DAY));
    await assert.rejects(
      h.svc.execute('ActivateMember', ctx(h.org.id, h.admin.member.id), {
        memberId: h.legacy.member.id,
        providerSubject: `subject:${h.legacy.member.id}`,
      }),
      /VALIDATION_FAILED/,
    );
    assert.equal(current.revokedAt, null);
    assert.equal(h.store.businessEvents.filter((e) => e.eventType === 'member.activated').length, 0);
  });

  it('first activation of an invited member does not end delegations granted to them while invited', async () => {
    const h = await harness();
    const invited = await h.svc.execute('InviteMember', ctx(h.org.id, h.admin.member.id), {
      email: 'nuevo@isalwa.bo',
      givenName: 'Nuevo',
      familyName: 'User',
      roleKey: 'sales_rep',
    });
    const memberId = String(invited.data.memberId);
    const early = h.delegation(h.holder.member.id, memberId, new Date(NOW.getTime() - DAY));
    await h.svc.execute('ActivateMember', ctx(h.org.id, memberId), { memberId, providerSubject: 'subject:nuevo' });
    assert.equal(early.revokedAt, null);
  });

  it('B4: reinstatement ends every role assignment that confers authority (primary scope and additional grants); job titles stay; rows kept', async () => {
    const h = await harness();
    const role = (roleKey: string) => {
      const row = { id: createId(), organizationId: h.org.id, memberId: h.legacy.member.id, roleKey, effectiveAt: new Date(NOW.getTime() - DAY), endedAt: null as Date | null };
      h.store.roleAssignments.push(row);
      return row;
    };
    const title = role('Asesor');
    const edit = role('commercial.customer.edit');
    const convert = role('commercial.quote.convert.own');
    h.setStatus(h.legacy.member.id, 'suspended');

    await h.svc.execute('ActivateMember', ctx(h.org.id, h.admin.member.id), {
      memberId: h.legacy.member.id,
      providerSubject: `subject:${h.legacy.member.id}`,
    });

    const rows = h.store.roleAssignments.filter((r) => r.memberId === h.legacy.member.id);
    assert.equal(rows.length, 4, 'rows kept as history');
    for (const row of [edit, convert]) assert.deepEqual(row.endedAt, NOW);
    assert.deepEqual(rows.find((r) => r.roleKey === 'people.admin')!.endedAt, NOW, 'primary role that is a scope ends too');
    assert.equal(title.endedAt, null, 'a job title confers nothing and stays');
    const later = new Date(NOW.getTime() + DAY);
    assert.deepEqual(computeEffectiveScopes(await h.store.listRoleAssignmentsForMember(h.legacy.member.id, h.org.id), [], later), []);
    const payload = h.store.businessEvents.find((e) => e.eventType === 'member.activated')!.payload as Record<string, unknown>;
    assert.deepEqual(payload.endedRoleKeys, ['commercial.customer.edit', 'commercial.quote.convert.own', 'people.admin']);
    await assert.rejects(
      h.svc.execute('InviteMember', ctx(h.org.id, h.legacy.member.id), {
        email: 'otro@isalwa.bo',
        givenName: 'Otro',
        familyName: 'User',
        roleKey: 'sales_rep',
      }),
      /PERMISSION_DENIED/,
      'the reinstated member no longer administers people',
    );
  });

  it('B4: authority returns only through the existing grant commands, with their grantor checks', async () => {
    const h = await harness();
    h.store.roleAssignments.push({ id: createId(), organizationId: h.org.id, memberId: h.legacy.member.id, roleKey: 'commercial.customer.edit', effectiveAt: new Date(NOW.getTime() - DAY), endedAt: null });
    h.setStatus(h.legacy.member.id, 'suspended');
    await h.svc.execute('ActivateMember', ctx(h.org.id, h.admin.member.id), {
      memberId: h.legacy.member.id,
      providerSubject: `subject:${h.legacy.member.id}`,
    });
    const scopes = async () =>
      computeEffectiveScopes(await h.store.listRoleAssignmentsForMember(h.legacy.member.id, h.org.id), [], NOW).sort();

    await assert.rejects(
      h.svc.execute('GrantAdditionalRole', ctx(h.org.id, h.admin.member.id), { memberId: h.legacy.member.id, roleKey: 'commercial.customer.edit' }),
      /PERMISSION_DENIED|VALIDATION_FAILED/,
      'an admin who does not hold the scope cannot regrant it',
    );
    h.store.roleAssignments.push({ id: createId(), organizationId: h.org.id, memberId: h.admin.member.id, roleKey: 'commercial.customer.edit', effectiveAt: new Date(NOW.getTime() - DAY), endedAt: null });
    await h.svc.execute('GrantAdditionalRole', ctx(h.org.id, h.admin.member.id), { memberId: h.legacy.member.id, roleKey: 'commercial.customer.edit' });
    await h.svc.execute('ChangeRole', ctx(h.org.id, h.admin.member.id), { memberId: h.legacy.member.id, roleKey: 'people.admin' });
    assert.deepEqual(await scopes(), ['commercial.customer.edit', 'people.admin']);
  });

  it('B4: first activation of an invited member keeps the role given at invitation', async () => {
    const h = await harness();
    const invited = await h.svc.execute('InviteMember', ctx(h.org.id, h.admin.member.id), {
      email: 'nuevo2@isalwa.bo',
      givenName: 'Nuevo',
      familyName: 'User',
      roleKey: 'people.admin',
    });
    const memberId = String(invited.data.memberId);
    await h.svc.execute('ActivateMember', ctx(h.org.id, memberId), { memberId, providerSubject: 'subject:nuevo2' });
    assert.deepEqual(computeEffectiveScopes(await h.store.listRoleAssignmentsForMember(memberId, h.org.id), [], NOW), ['people.admin']);
    const payload = h.store.businessEvents.find((e) => e.eventType === 'member.activated')!.payload as Record<string, unknown>;
    assert.equal(payload.endedRoleKeys, undefined);
  });

  it('GrantDelegation to a suspended member is refused and writes nothing', async () => {
    const h = await harness();
    h.setStatus(h.legacy.member.id, 'suspended');
    const before = [h.store.delegations.length, h.store.businessEvents.length];
    await assert.rejects(
      h.svc.execute('GrantDelegation', ctx(h.org.id, h.holder.member.id), {
        delegateMemberId: h.legacy.member.id,
        scopes: ['people.admin'],
        expiresAt: new Date(NOW.getTime() + 7 * DAY).toISOString(),
      }),
      /VALIDATION_FAILED/,
    );
    assert.deepEqual([h.store.delegations.length, h.store.businessEvents.length], before);
  });
});
