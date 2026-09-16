import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { collectMemberAccessHistory } from './member-access-history';
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

describe('member access history', () => {
  it('projects recent workforce access events in Spanish without capability strings', async () => {
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
      },
    );
    const memberId = invited.data.memberId as string;
    const adminCtx = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);

    await svc.execute('ActivateMember', ctx(org.id, memberId, '', ''), {
      memberId,
      providerSubject: 'subject:ana',
    });
    await svc.execute('SuspendMember', adminCtx, { memberId });
    await svc.execute('ActivateMember', adminCtx, {
      memberId,
      providerSubject: 'subject:ana',
    });

    const history = await collectMemberAccessHistory(store, org.id, memberId, 20);
    const labels = history.map((entry) => entry.label);
    assert.ok(labels.includes('Acceso suspendido'));
    assert.ok(labels.includes('Acceso reactivado'));
    assert.ok(history.every((entry) => !entry.label.includes('people.admin')));
    assert.ok(history.every((entry) => !entry.detail?.includes('people.admin')));
    assert.ok(history.length <= 20);
  });
});
