import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { completeInvitedAccess } from './invite-completion';
import { MemoryOsStore } from './memory-store';
import { resolveInviteRedirectUrl } from './supabase-auth-provider';
import { WorkforceCommandService } from './workforce-command-service';

function ctx(orgId: string, actorMemberId: string, personId: string, authId: string): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date('2026-09-14T12:00:00Z'),
  };
}

async function invitedFixture(email = 'ana@isalwa.bo') {
  const store = new MemoryOsStore();
  const auth = new LocalAuthProviderPort();
  const commands = new WorkforceCommandService(store, auth);
  const org = await store.seedOrganization('ISALWA S.R.L.', 'isalwa');
  const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
  const invited = await commands.execute(
    'InviteMember',
    ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
    { email, givenName: 'Ana', familyName: 'Pérez', roleKey: 'sales_rep' },
  );
  const memberId = invited.data.memberId as string;
  const member = await store.getMember(memberId);
  return { store, commands, org, admin, memberId, personId: member!.personId };
}

function secretBlob(store: MemoryOsStore): string {
  return JSON.stringify({ events: store.businessEvents, audit: store.auditLogs });
}

describe('invite completion', () => {
  it('activates through ActivateMember and does not store a password', async () => {
    const { store, commands, memberId } = await invitedFixture('Ana@ISALWA.bo');
    const beforeMembers = store.members.length;
    const beforeIdentities = store.authIdentities.length;

    const result = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'prov-ana', verifiedEmail: 'ana@isalwa.bo' },
      new Date('2026-09-14T12:05:00Z'),
    );

    assert.equal(result.code, 'activated');
    const member = await store.getMember(memberId);
    assert.equal(member?.accessStatus, 'active');
    const identity = store.authIdentities.find((row) => row.personId === member?.personId);
    assert.equal(identity?.status, 'active');
    assert.equal(identity?.providerSubject, 'prov-ana');
    assert.equal(store.members.length, beforeMembers);
    assert.equal(store.authIdentities.length, beforeIdentities);
    assert.equal(store.businessEvents.filter((event) => event.eventType === 'member.activated').length, 1);
    const roles = await store.listRoleAssignmentsForMember(memberId);
    assert.deepEqual(roles.map((role) => role.roleKey), ['sales_rep']);
    assert.equal(/password|access_token|refresh_token|token_hash|recovery/i.test(secretBlob(store)), false);
  });

  it('denies an uninvited provider user and a missing session', async () => {
    const { store, commands, memberId } = await invitedFixture();
    const missing = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: '', verifiedEmail: 'ana@isalwa.bo' },
      new Date(),
    );
    assert.equal(missing.code, 'unauthenticated');

    const other = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'prov-other', verifiedEmail: 'other@isalwa.bo' },
      new Date(),
    );
    assert.equal(other.code, 'not_invited');
    assert.equal((await store.getMember(memberId))?.accessStatus, 'invited');
  });

  it('does not let email B activate email A', async () => {
    const { store, commands, memberId } = await invitedFixture('a@isalwa.bo');
    const identity = store.authIdentities.find((row) => row.email === 'a@isalwa.bo');
    identity!.providerSubject = 'subject-a';

    const wrong = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'subject-a', verifiedEmail: 'b@isalwa.bo' },
      new Date(),
    );
    assert.equal(wrong.code, 'wrong_account');
    assert.equal((await store.getMember(memberId))?.accessStatus, 'invited');
    assert.equal(identity?.status, 'invited');
  });

  it('does not activate a foreign tenant member', async () => {
    const { store, commands, org, admin } = await invitedFixture('b@isalwa.bo');
    const orgA = await store.seedOrganization('Tenant A', 'tenant-a');
    const memberA = await store.seedAdminMember(orgA.id, 'a-admin@isalwa.bo', 'A', 'Admin');

    const result = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'prov-b', verifiedEmail: 'b@isalwa.bo' },
      new Date(),
    );
    assert.equal(result.code, 'activated');
    const activated = store.members.find((member) => member.organizationId === org.id && member.accessStatus === 'active' && member.id !== admin.member.id);
    assert.ok(activated);
    assert.equal((await store.getMember(memberA.member.id))?.organizationId, orgA.id);
    assert.equal((await store.getMember(memberA.member.id))?.accessStatus, 'active');
  });

  it('is safe to repeat and does not create a second identity', async () => {
    const { store, commands, memberId } = await invitedFixture();
    const trusted = { provider: 'local-dev', providerSubject: 'prov-ana', verifiedEmail: 'ana@isalwa.bo' };
    const first = await completeInvitedAccess(store, commands, trusted, new Date());
    const second = await completeInvitedAccess(store, commands, trusted, new Date());
    assert.equal(first.code, 'activated');
    assert.equal(second.code, 'already_completed');
    assert.equal(store.members.filter((member) => member.id === memberId).length, 1);
    assert.equal(store.authIdentities.filter((identity) => identity.email === 'ana@isalwa.bo').length, 1);
    assert.equal(store.businessEvents.filter((event) => event.eventType === 'member.activated').length, 1);
  });

  it('does not reactivate a suspended or terminated member through the invite path', async () => {
    const suspended = await invitedFixture('suspend@isalwa.bo');
    await completeInvitedAccess(
      suspended.store,
      suspended.commands,
      { provider: 'local-dev', providerSubject: 'prov-s', verifiedEmail: 'suspend@isalwa.bo' },
      new Date(),
    );
    await suspended.commands.execute(
      'SuspendMember',
      ctx(suspended.org.id, suspended.admin.member.id, suspended.admin.person.id, suspended.admin.auth.id),
      { memberId: suspended.memberId },
    );
    const deniedSuspend = await completeInvitedAccess(
      suspended.store,
      suspended.commands,
      { provider: 'local-dev', providerSubject: 'prov-s', verifiedEmail: 'suspend@isalwa.bo' },
      new Date(),
    );
    assert.equal(deniedSuspend.code, 'suspended');
    assert.equal((await suspended.store.getMember(suspended.memberId))?.accessStatus, 'suspended');

    const ended = await invitedFixture('ended@isalwa.bo');
    await completeInvitedAccess(
      ended.store,
      ended.commands,
      { provider: 'local-dev', providerSubject: 'prov-e', verifiedEmail: 'ended@isalwa.bo' },
      new Date(),
    );
    await ended.commands.execute(
      'TerminateMember',
      ctx(ended.org.id, ended.admin.member.id, ended.admin.person.id, ended.admin.auth.id),
      { memberId: ended.memberId },
    );
    const deniedEnd = await completeInvitedAccess(
      ended.store,
      ended.commands,
      { provider: 'local-dev', providerSubject: 'prov-e', verifiedEmail: 'ended@isalwa.bo' },
      new Date(),
    );
    assert.equal(deniedEnd.code, 'terminated');
    assert.equal((await ended.store.getMember(ended.memberId))?.accessStatus, 'revoked');
  });

  it('fails closed when more than one invited identity matches', async () => {
    const { store, commands, memberId, personId } = await invitedFixture('dup@isalwa.bo');
    store.authIdentities.push({
      id: 'second-identity',
      personId,
      provider: 'local-dev',
      providerSubject: null,
      email: 'dup@isalwa.bo',
      status: 'invited',
      invitedAt: new Date(),
      activatedAt: null,
      revokedAt: null,
    });
    const result = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'prov-dup', verifiedEmail: 'dup@isalwa.bo' },
      new Date(),
    );
    assert.equal(result.code, 'ambiguous');
    assert.equal((await store.getMember(memberId))?.accessStatus, 'invited');
  });

  it('refuses to bind a provider subject that already belongs to someone else', async () => {
    const { store, commands, org, admin } = await invitedFixture('first@isalwa.bo');
    await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'shared-subject', verifiedEmail: 'first@isalwa.bo' },
      new Date(),
    );
    await commands.execute(
      'InviteMember',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      { email: 'second@isalwa.bo', givenName: 'Second', familyName: 'User', roleKey: 'sales_rep' },
    );
    const second = store.members.find((member) => member.accessStatus === 'invited');
    const denied = await completeInvitedAccess(
      store,
      commands,
      { provider: 'local-dev', providerSubject: 'shared-subject', verifiedEmail: 'second@isalwa.bo' },
      new Date(),
    );
    assert.equal(denied.code, 'wrong_account');
    assert.equal((await store.getMember(second!.id))?.accessStatus, 'invited');
    await assert.rejects(
      () =>
        commands.execute('ActivateMember', ctx(org.id, admin.member.id, admin.person.id, admin.auth.id), {
          memberId: second!.id,
          providerSubject: 'shared-subject',
        }),
      /VALIDATION_FAILED/,
    );
  });
});

describe('invite redirect', () => {
  it('derives the completion URL from configuration, not a browser value', () => {
    assert.equal(
      resolveInviteRedirectUrl({ OS_CORS_ORIGINS: 'https://os-web-staging.onrender.com' }),
      'https://os-web-staging.onrender.com/auth/complete-invite',
    );
    assert.throws(
      () => resolveInviteRedirectUrl({ OS_AUTH_INVITE_REDIRECT_URL: 'javascript:alert(1)' }),
      /PROVIDER_NOT_CONFIGURED/,
    );
  });
});
