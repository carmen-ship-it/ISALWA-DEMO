import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import type { PersonRecord } from './store-types';
import { WorkforceCommandService } from './workforce-command-service';

function ctx(orgId: string, actorMemberId: string): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: createId(),
    effectiveAt: new Date('2026-08-01T12:00:00Z'),
  };
}

class CountingAuth extends LocalAuthProviderPort {
  invites = 0;
  override async createInvite(email: string) {
    this.invites += 1;
    return super.createInvite(email);
  }
}

class RecordingStore extends MemoryOsStore {
  personCalls = 0;
  memberCalls = 0;
  roleCalls: Array<{ memberId: string; organizationId?: string }> = [];
  delegationCalls: Array<{ memberId: string; organizationId?: string }> = [];

  override async getPerson(personId: string): Promise<PersonRecord | null> {
    this.personCalls += 1;
    return super.getPerson(personId);
  }

  override async getMember(memberId: string) {
    this.memberCalls += 1;
    return super.getMember(memberId);
  }

  override async listRoleAssignmentsForMember(memberId: string, organizationId?: string) {
    this.roleCalls.push({ memberId, organizationId });
    return super.listRoleAssignmentsForMember(memberId, organizationId);
  }

  override async listDelegationsForDelegate(delegateMemberId: string, organizationId?: string) {
    this.delegationCalls.push({ memberId: delegateMemberId, organizationId });
    return super.listDelegationsForDelegate(delegateMemberId, organizationId);
  }
}

async function harness() {
  const store = new RecordingStore();
  const auth = new CountingAuth();
  const svc = new WorkforceCommandService(store, auth);
  const org = await store.seedOrganization('ISALWA', 'isalwa');
  const foreign = await store.seedOrganization('OTHER', 'other');
  const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
  const otherAdmin = await store.seedAdminMember(foreign.id, 'other@isalwa.bo', 'Other', 'Admin');
  const department = (await store.listDepartments(org.id))[0]!;
  const foreignDepartment = (await store.listDepartments(foreign.id))[0]!;
  return { store, auth, svc, org, foreign, admin, otherAdmin, department, foreignDepartment };
}

async function invite(
  svc: WorkforceCommandService,
  orgId: string,
  actorId: string,
  email: string,
  extra: Record<string, unknown> = {},
) {
  return svc.execute('InviteMember', ctx(orgId, actorId), {
    email,
    givenName: 'Ana',
    familyName: 'Pérez',
    roleKey: 'sales_rep',
    ...extra,
  });
}

function eventsOf(store: MemoryOsStore, type: string) {
  return store.businessEvents.filter((event) => event.eventType === type);
}

describe('workforce tenant predicates', () => {
  it('invite loads the department in the session organization before use', async () => {
    const { store, svc, org, admin, department } = await harness();
    const result = await invite(svc, org.id, admin.member.id, 'dept@isalwa.bo', {
      departmentId: department.id,
    });
    const memberId = result.data.memberId as string;
    assert.equal(
      store.departmentAssignments.some(
        (row) => row.memberId === memberId && row.departmentId === department.id && row.organizationId === org.id,
      ),
      true,
    );
    assert.equal(eventsOf(store, 'member.invited').length, 1);
  });

  it('invite treats a missing department and a foreign department the same and emits no success', async () => {
    const { store, auth, svc, org, admin, foreignDepartment } = await harness();
    const beforeEvents = store.businessEvents.length;
    const beforeMembers = store.members.length;
    const beforeInvites = auth.invites;

    const missing = invite(svc, org.id, admin.member.id, 'missing-dept@isalwa.bo', {
      departmentId: 'dept-missing',
    });
    const foreign = invite(svc, org.id, admin.member.id, 'foreign-dept@isalwa.bo', {
      departmentId: foreignDepartment.id,
    });

    await assert.rejects(missing, /VALIDATION_FAILED/);
    await assert.rejects(foreign, /VALIDATION_FAILED/);
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(store.members.length, beforeMembers);
    assert.equal(store.departmentAssignments.length, 0);
    assert.equal(auth.invites, beforeInvites);
    assert.equal(eventsOf(store, 'member.invited').length, 0);
  });

  it('change manager proves the manager member in the session organization before the event', async () => {
    const { store, svc, org, admin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'worker@isalwa.bo');
    const memberId = invited.data.memberId as string;
    const manager = await invite(svc, org.id, admin.member.id, 'lead@isalwa.bo');
    const managerMemberId = manager.data.memberId as string;

    const result = await svc.execute('ChangeManager', ctx(org.id, admin.member.id), {
      memberId,
      managerMemberId,
    });
    assert.equal(result.data.managerMemberId, managerMemberId);
    assert.equal(eventsOf(store, 'member.manager.changed').length, 1);
    assert.equal(
      store.managerAssignments.some(
        (row) => row.memberId === memberId && row.managerMemberId === managerMemberId && row.organizationId === org.id,
      ),
      true,
    );
  });

  it('change manager treats a missing manager and a foreign manager the same and emits no success', async () => {
    const { store, svc, org, foreign, admin, otherAdmin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'worker@isalwa.bo');
    const memberId = invited.data.memberId as string;
    const beforeEvents = store.businessEvents.length;
    const beforeAssignments = store.managerAssignments.length;

    const missing = svc.execute('ChangeManager', ctx(org.id, admin.member.id), {
      memberId,
      managerMemberId: 'manager-missing',
    });
    const foreignManager = svc.execute('ChangeManager', ctx(org.id, admin.member.id), {
      memberId,
      managerMemberId: otherAdmin.member.id,
    });

    await assert.rejects(missing, /NOT_FOUND/);
    await assert.rejects(foreignManager, /NOT_FOUND/);
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(store.managerAssignments.length, beforeAssignments);
    assert.equal(eventsOf(store, 'member.manager.changed').length, 0);
    assert.equal(otherAdmin.member.organizationId, foreign.id);
  });

  it('grant delegation proves the delegate member in the session organization before the event', async () => {
    const { store, svc, org, admin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'delegate@isalwa.bo');
    const delegateMemberId = invited.data.memberId as string;
    const result = await svc.execute('GrantDelegation', ctx(org.id, admin.member.id), {
      delegateMemberId,
      scopes: ['approval.act'],
      expiresAt: '2026-12-01T00:00:00.000Z',
    });
    assert.equal(result.data.delegateMemberId, delegateMemberId);
    assert.equal(eventsOf(store, 'delegation.granted').length, 1);
    assert.equal(
      store.delegations.some(
        (row) => row.delegateMemberId === delegateMemberId && row.organizationId === org.id,
      ),
      true,
    );
  });

  it('grant delegation treats a missing delegate and a foreign delegate the same and emits no success', async () => {
    const { store, svc, org, admin, otherAdmin } = await harness();
    const beforeEvents = store.businessEvents.length;
    const beforeDelegations = store.delegations.length;

    const missing = svc.execute('GrantDelegation', ctx(org.id, admin.member.id), {
      delegateMemberId: 'delegate-missing',
      scopes: ['approval.act'],
      expiresAt: '2026-12-01T00:00:00.000Z',
    });
    const foreignDelegate = svc.execute('GrantDelegation', ctx(org.id, admin.member.id), {
      delegateMemberId: otherAdmin.member.id,
      scopes: ['approval.act'],
      expiresAt: '2026-12-01T00:00:00.000Z',
    });

    await assert.rejects(missing, /NOT_FOUND/);
    await assert.rejects(foreignDelegate, /NOT_FOUND/);
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(store.delegations.length, beforeDelegations);
    assert.equal(eventsOf(store, 'delegation.granted').length, 0);
  });

  it('rehire requires a prior membership in the session organization and does not call getPerson', async () => {
    const { store, auth, svc, org, admin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'ana@isalwa.bo');
    const memberId = invited.data.memberId as string;
    const personId = invited.data.personId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute('TerminateMember', ctx(org.id, admin.member.id), { memberId });
    store.personCalls = 0;
    const invitesBefore = auth.invites;

    const rehired = await svc.execute('RehireMember', ctx(org.id, admin.member.id), {
      personId,
      email: 'ana-again@isalwa.bo',
      roleKey: 'sales_rep',
    });

    assert.equal(store.personCalls, 0);
    assert.notEqual(rehired.data.memberId, memberId);
    assert.equal(eventsOf(store, 'employment.restarted').length, 1);
    assert.equal(auth.invites, invitesBefore + 1);
  });

  it('rehire treats a missing person and a foreign-org person the same and emits no success', async () => {
    const { store, auth, svc, org, foreign, admin } = await harness();
    const foreignInvite = await invite(svc, foreign.id, (await store.seedAdminMember(foreign.id, 'fa@o.bo', 'F', 'A')).member.id, 'foreign-person@o.bo');
    const foreignPersonId = foreignInvite.data.personId as string;
    const beforeEvents = store.businessEvents.length;
    const beforeMembers = store.members.length;
    const beforeInvites = auth.invites;
    store.personCalls = 0;

    const missing = svc.execute('RehireMember', ctx(org.id, admin.member.id), {
      personId: 'person-missing',
      email: 'missing@isalwa.bo',
      roleKey: 'sales_rep',
    });
    const foreignPerson = svc.execute('RehireMember', ctx(org.id, admin.member.id), {
      personId: foreignPersonId,
      email: 'stolen@isalwa.bo',
      roleKey: 'sales_rep',
    });

    await assert.rejects(missing, /NOT_FOUND/);
    await assert.rejects(foreignPerson, /NOT_FOUND/);
    assert.equal(store.personCalls, 0);
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(store.members.length, beforeMembers);
    assert.equal(auth.invites, beforeInvites);
    assert.equal(eventsOf(store, 'employment.restarted').length, 0);
    assert.equal(
      store.members.filter((member) => member.personId === foreignPersonId && member.organizationId === org.id).length,
      0,
    );
  });

  it('actor gate uses a tenant-scoped member lookup and throws before dispatch with no success event', async () => {
    const { store, svc, org, otherAdmin } = await harness();
    const beforeEvents = store.businessEvents.length;
    store.memberCalls = 0;

    const foreignActor = svc.execute('InviteMember', ctx(org.id, otherAdmin.member.id), {
      email: 'nope@isalwa.bo',
      givenName: 'No',
      familyName: 'Pe',
      roleKey: 'sales_rep',
    });
    const missingActor = svc.execute('InviteMember', ctx(org.id, 'actor-missing'), {
      email: 'missing-actor@isalwa.bo',
      givenName: 'No',
      familyName: 'Pe',
      roleKey: 'sales_rep',
    });

    await assert.rejects(foreignActor, /TENANT_FORBIDDEN/);
    await assert.rejects(missingActor, /TENANT_FORBIDDEN/);
    assert.equal(store.memberCalls, 0);
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(eventsOf(store, 'member.invited').length, 0);
  });

  it('same-tenant sales_rep cannot invite, change manager, grant delegation, or rehire', async () => {
    const { store, auth, svc, org, admin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'rep@isalwa.bo');
    const repId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, repId), {
      memberId: repId,
      providerSubject: 'subject:rep',
    });
    const target = await invite(svc, org.id, admin.member.id, 'target@isalwa.bo');
    const targetId = target.data.memberId as string;
    const beforeEvents = store.businessEvents.length;
    const beforeInvites = auth.invites;

    const denied = [
      svc.execute('InviteMember', ctx(org.id, repId), {
        email: 'new@isalwa.bo',
        givenName: 'New',
        familyName: 'Rep',
        roleKey: 'sales_rep',
      }),
      svc.execute('ChangeManager', ctx(org.id, repId), {
        memberId: targetId,
        managerMemberId: admin.member.id,
      }),
      svc.execute('GrantDelegation', ctx(org.id, repId), {
        delegateMemberId: targetId,
        scopes: ['approval.act'],
        expiresAt: '2026-12-01T00:00:00.000Z',
      }),
      svc.execute('RehireMember', ctx(org.id, repId), {
        personId: invited.data.personId,
        email: 'rehired@isalwa.bo',
        roleKey: 'sales_rep',
      }),
    ];
    for (const attempt of denied) {
      await assert.rejects(attempt, /PERMISSION_DENIED/);
    }
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.equal(auth.invites, beforeInvites);
    assert.equal(eventsOf(store, 'member.invited').length, 2);
    assert.equal(eventsOf(store, 'member.manager.changed').length, 0);
    assert.equal(eventsOf(store, 'delegation.granted').length, 0);
    assert.equal(eventsOf(store, 'employment.restarted').length, 0);
  });

  it('session authorization ignores a foreign-org role and delegation on the same member id', async () => {
    const { store, svc, org, foreign, admin, otherAdmin } = await harness();
    const invited = await invite(svc, org.id, admin.member.id, 'scoped@isalwa.bo');
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org.id, memberId), {
      memberId,
      providerSubject: 'subject:scoped',
    });
    await store.insertRoleAssignment({
      id: createId(),
      organizationId: foreign.id,
      memberId,
      roleKey: 'people.admin',
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    await store.insertDelegation({
      id: createId(),
      organizationId: foreign.id,
      delegatorMemberId: otherAdmin.member.id,
      delegateMemberId: memberId,
      scopes: ['people.admin'],
      startsAt: new Date('2020-01-01'),
      expiresAt: new Date('2027-01-01'),
      revokedAt: null,
    });
    const beforeEvents = store.businessEvents.length;

    await assert.rejects(
      svc.execute('ChangeManager', ctx(org.id, memberId), {
        memberId: admin.member.id,
        managerMemberId: admin.member.id,
      }),
      /PERMISSION_DENIED/,
    );
    assert.equal(store.businessEvents.length, beforeEvents);
    assert.ok(store.roleCalls.some((call) => call.memberId === memberId && call.organizationId === org.id));
    assert.ok(
      store.delegationCalls.some((call) => call.memberId === memberId && call.organizationId === org.id),
    );
    assert.equal(
      store.roleCalls.some((call) => call.organizationId === undefined),
      false,
    );
  });
});

describe('findActiveMemberForPerson', () => {
  async function twoActiveMemberships() {
    const store = new MemoryOsStore();
    const home = await store.seedOrganization('Home', 'home');
    const other = await store.seedOrganization('Other', 'other');
    const personId = createId();
    await store.insertPerson({ id: personId, givenName: 'Ana', familyName: 'Pérez', version: 0 });
    const homeMemberId = createId();
    const otherMemberId = createId();
    await store.insertMember({
      id: homeMemberId,
      organizationId: home.id,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date('2026-01-01'),
      employmentEndedAt: null,
      version: 0,
    });
    await store.insertMember({
      id: otherMemberId,
      organizationId: other.id,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date('2026-02-01'),
      employmentEndedAt: null,
      version: 0,
    });
    return { store, personId, home, other, homeMemberId, otherMemberId };
  }

  it('fails closed when several active memberships exist and no organization is passed', async () => {
    const { store, personId } = await twoActiveMemberships();
    assert.equal(await store.findActiveMemberForPerson(personId), null);
  });

  it('returns only the membership in the requested organization', async () => {
    const { store, personId, home, other, homeMemberId, otherMemberId } = await twoActiveMemberships();
    assert.equal((await store.findActiveMemberForPerson(personId, home.id))?.id, homeMemberId);
    assert.equal((await store.findActiveMemberForPerson(personId, other.id))?.id, otherMemberId);
  });

  it('does not return another tenant when the requested organization has no active membership', async () => {
    const { store, personId } = await twoActiveMemberships();
    assert.equal(await store.findActiveMemberForPerson(personId, 'org-absent'), null);
  });

  it('fails closed when the requested organization has more than one active membership', async () => {
    const { store, personId, home } = await twoActiveMemberships();
    await store.insertMember({
      id: createId(),
      organizationId: home.id,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date('2026-03-01'),
      employmentEndedAt: null,
      version: 0,
    });
    assert.equal(await store.findActiveMemberForPerson(personId, home.id), null);
  });

  it('returns the sole active membership when no organization is passed', async () => {
    const store = new MemoryOsStore();
    const org = await store.seedOrganization('Only', 'only');
    const personId = createId();
    const memberId = createId();
    await store.insertPerson({ id: personId, givenName: 'Ana', familyName: 'Pérez', version: 0 });
    await store.insertMember({
      id: memberId,
      organizationId: org.id,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date('2026-01-01'),
      employmentEndedAt: null,
      version: 0,
    });
    assert.equal((await store.findActiveMemberForPerson(personId))?.id, memberId);
  });
});
