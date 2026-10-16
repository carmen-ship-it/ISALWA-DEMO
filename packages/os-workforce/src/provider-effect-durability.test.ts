import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { BusinessEventEnvelope, RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';
import { AuthProviderEffectConsumer } from './provider-effect-consumer';

/**
 * T01b: provider effects survive a provider outage or a crash after commit. The member
 * event is the durable intent; the consumer converges the provider to current state.
 * Memory store and a recording provider: logic only, not Postgres or a real provider.
 */
class RecordingProvider extends LocalAuthProviderPort {
  down = false;
  calls: string[] = [];
  private gate(call: string) {
    this.calls.push(call);
    if (this.down) throw new Error('PROVIDER_UNAVAILABLE');
  }
  override async revokeSessions(s: string) {
    this.gate(`revokeSessions:${s}`);
    return super.revokeSessions(s);
  }
  override async revokeCredentials(s: string) {
    this.gate(`revokeCredentials:${s}`);
    return super.revokeCredentials(s);
  }
  override async updateEmail(s: string, e: string) {
    this.gate(`updateEmail:${s}:${e}`);
    return super.updateEmail(s, e);
  }
}

function ctx(orgId: string, actor: string): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: actor,
    personId: '',
    authIdentityId: '',
    correlationId: createId(),
    effectiveAt: new Date('2026-08-01T12:00:00Z'),
  };
}

async function setup() {
  const store = new MemoryOsStore();
  const provider = new RecordingProvider();
  const svc = new WorkforceCommandService(store, provider);
  const consumer = new AuthProviderEffectConsumer(svc);
  const org = await store.seedOrganization('ISALWA', 'isalwa');
  const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
  const invited = await svc.execute('InviteMember', ctx(org.id, admin.member.id), {
    email: 'ana@isalwa.bo',
    givenName: 'Ana',
    familyName: 'Pérez',
    roleKey: 'sales_rep',
  });
  const memberId = invited.data.memberId as string;
  await svc.execute('ActivateMember', ctx(org.id, memberId), { memberId, providerSubject: 'subject:ana' });
  provider.calls = [];
  const lastEvent = (type: string): BusinessEventEnvelope => {
    const e = [...store.businessEvents].reverse().find((x) => x.eventType === type)!;
    return {
      organizationId: e.organizationId,
      eventType: e.eventType,
      primaryEntityType: e.primaryEntityType,
      primaryEntityId: e.primaryEntityId,
      payload: e.payload,
    } as BusinessEventEnvelope;
  };
  return { store, provider, svc, consumer, org, admin, memberId, lastEvent };
}

describe('T01b durable auth provider effects', () => {
  it('suspend during a provider outage commits, audits the failure, and the redelivered event revokes sessions', async () => {
    const t = await setup();
    t.provider.down = true;
    await t.svc.execute('SuspendMember', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId });
    assert.equal((await t.store.getMember(t.memberId))?.accessStatus, 'suspended');
    assert.equal(t.provider.isSessionRevoked('subject:ana'), false);
    assert.ok(t.store.auditLogs.some((a) => a.action === 'auth.provider.side_effect_failed'));
    assert.ok(t.store.outbox.some((o) => (o.payloadJson as { eventType?: string }).eventType === 'member.suspended'));

    await assert.rejects(t.consumer.deliver(t.lastEvent('member.suspended')), /PROVIDER_UNAVAILABLE/);
    t.provider.down = false;
    await t.consumer.deliver(t.lastEvent('member.suspended'));
    assert.equal(t.provider.isSessionRevoked('subject:ana'), true);
  });

  it('a crash after commit (no inline effect at all) is recovered by the consumer: terminate revokes credentials', async () => {
    const t = await setup();
    t.provider.down = true;
    await t.svc.execute('TerminateMember', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId });
    t.provider.down = false;
    t.provider.calls = [];
    await t.consumer.deliver(t.lastEvent('member.terminated'));
    assert.deepEqual(t.provider.calls, ['revokeCredentials:subject:ana']);
    assert.equal(t.provider.isRevoked('subject:ana'), true);
  });

  it('a late suspended event does not revoke sessions after access was restored', async () => {
    const t = await setup();
    t.provider.down = true;
    await t.svc.execute('SuspendMember', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId });
    const m = (await t.store.getMember(t.memberId))!;
    await t.store.updateMember(t.memberId, { accessStatus: 'active', version: m.version + 1 });
    t.provider.down = false;
    t.provider.calls = [];
    await t.consumer.deliver(t.lastEvent('member.suspended'));
    assert.deepEqual(t.provider.calls, []);
  });

  it('a late email event pushes the current email, never the older one', async () => {
    const t = await setup();
    t.provider.down = true;
    await t.svc.execute('ChangeMemberEmail', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId, newEmail: 'b@isalwa.bo' });
    const staleEvent = t.lastEvent('member.email.changed');
    t.provider.down = false;
    await t.svc.execute('ChangeMemberEmail', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId, newEmail: 'c@isalwa.bo' });
    t.provider.calls = [];
    await t.consumer.deliver(staleEvent);
    assert.deepEqual(t.provider.calls, ['updateEmail:subject:ana:c@isalwa.bo']);
  });

  it('a person who signs in to another organization keeps the login: no provider revoke', async () => {
    const t = await setup();
    const other = await t.store.seedOrganization('Otra', 'otra');
    const member = (await t.store.getMember(t.memberId))!;
    await t.store.insertMember({ ...member, id: createId(), organizationId: other.id });
    await t.svc.execute('SuspendMember', ctx(t.org.id, t.admin.member.id), { memberId: t.memberId });
    t.provider.calls = [];
    await t.consumer.deliver(t.lastEvent('member.suspended'));
    assert.deepEqual(t.provider.calls, []);
  });

  it('ignores unrelated events and events for members outside the organization', async () => {
    const t = await setup();
    const member = { primaryEntityType: 'organization_member', primaryEntityId: t.memberId, payload: {} };
    await t.consumer.deliver({ ...member, organizationId: t.org.id, eventType: 'party.created' } as never);
    await t.consumer.deliver({ ...member, organizationId: 'org-other', eventType: 'member.suspended' } as never);
    await t.consumer.deliver({ ...member, organizationId: t.org.id, eventType: 'member.suspended', primaryEntityType: 'party' } as never);
    assert.deepEqual(t.provider.calls, []);
  });
});
