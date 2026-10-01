import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';

/**
 * S1 — a person is shared across organizations (OsPerson has no organization
 * column and os_auth_identities is keyed by person). A people.admin in one
 * organization must not mutate or revoke the login identity of a person who
 * also belongs to another organization.
 */

const AT = new Date('2026-08-01T12:00:00Z');

function ctx(organizationId: string, actorMemberId: string): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: createId(),
    effectiveAt: AT,
  };
}

async function seedMember(
  store: MemoryOsStore,
  organizationId: string,
  personId: string,
  roleKeys: string[],
  accessStatus = 'active',
): Promise<string> {
  const memberId = createId();
  await store.insertMember({
    id: memberId,
    organizationId,
    personId,
    employmentStatus: accessStatus === 'revoked' ? 'terminated' : 'active',
    accessStatus,
    employmentStartedAt: new Date('2026-01-01'),
    employmentEndedAt: null,
    version: 0,
  });
  for (const roleKey of roleKeys) {
    await store.insertRoleAssignment({
      id: createId(),
      organizationId,
      memberId,
      roleKey,
      effectiveAt: new Date('2026-01-01'),
      endedAt: null,
    });
  }
  return memberId;
}

async function seedPerson(store: MemoryOsStore): Promise<string> {
  const personId = createId();
  await store.insertPerson({ id: personId, givenName: 'Shared', familyName: 'Person', version: 0 });
  return personId;
}

async function seedActiveIdentity(
  store: MemoryOsStore,
  personId: string,
  email: string,
): Promise<string> {
  const id = createId();
  await store.insertAuthIdentity({
    id,
    personId,
    provider: 'local-dev',
    providerSubject: `sub-${id}`,
    email,
    status: 'active',
    invitedAt: new Date('2026-01-01'),
    activatedAt: new Date('2026-01-02'),
    revokedAt: null,
  });
  return id;
}

type Fixture = {
  store: MemoryOsStore;
  auth: LocalAuthProviderPort;
  svc: WorkforceCommandService;
  orgA: string;
  orgB: string;
};

async function twoOrgFixture(): Promise<Fixture> {
  const store = new MemoryOsStore();
  const auth = new LocalAuthProviderPort();
  const svc = new WorkforceCommandService(store, auth);
  const a = await store.seedOrganization('SYNTH DEMO', 'synth');
  const b = await store.seedOrganization('REAL COMPANY', 'real');
  return { store, auth, svc, orgA: a.id, orgB: b.id };
}

describe('S1 cross-company shared identity', () => {
  it('denies a people.admin changing the login email of a person who also belongs to another org', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const sharedPerson = await seedPerson(f.store);
    const victimInA = await seedMember(f.store, f.orgA, sharedPerson, ['sales_rep']);
    await seedMember(f.store, f.orgB, sharedPerson, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, sharedPerson, 'owner@real.example');

    await assert.rejects(
      f.svc.execute('ChangeMemberEmail', ctx(f.orgA, admin), {
        memberId: victimInA,
        newEmail: 'attacker@evil.example',
      }),
      /PERMISSION_DENIED/,
    );

    const identity = await f.store.findAuthIdentityById(identityId);
    assert.equal(identity?.email, 'owner@real.example');
  });

  it('still allows a people.admin to change the email of a single-organization member', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const person = await seedPerson(f.store);
    const member = await seedMember(f.store, f.orgA, person, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, person, 'worker@synth.example');

    await f.svc.execute('ChangeMemberEmail', ctx(f.orgA, admin), {
      memberId: member,
      newEmail: 'worker.new@synth.example',
    });

    const identity = await f.store.findAuthIdentityById(identityId);
    assert.equal(identity?.email, 'worker.new@synth.example');
  });

  it('still allows the person themselves to change their own email when shared across orgs', async () => {
    const f = await twoOrgFixture();
    const sharedPerson = await seedPerson(f.store);
    const selfInA = await seedMember(f.store, f.orgA, sharedPerson, ['sales_rep']);
    await seedMember(f.store, f.orgB, sharedPerson, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, sharedPerson, 'me@own.example');

    await f.svc.execute('ChangeMemberEmail', ctx(f.orgA, selfInA), {
      memberId: selfInA,
      newEmail: 'me.new@own.example',
    });

    const identity = await f.store.findAuthIdentityById(identityId);
    assert.equal(identity?.email, 'me.new@own.example');
  });

  it('does not revoke the shared login identity when terminating a member of one org only', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const sharedPerson = await seedPerson(f.store);
    const memberInA = await seedMember(f.store, f.orgA, sharedPerson, ['sales_rep']);
    await seedMember(f.store, f.orgB, sharedPerson, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, sharedPerson, 'owner@real.example');
    const identityBefore = await f.store.findAuthIdentityById(identityId);

    await f.svc.execute('TerminateMember', ctx(f.orgA, admin), { memberId: memberInA });

    // Org-scoped effect must still happen.
    const member = await f.store.getMember(memberInA);
    assert.equal(member?.accessStatus, 'revoked');

    // Cross-company login must survive.
    const identity = await f.store.findAuthIdentityById(identityId);
    assert.equal(identity?.status, 'active');
    assert.equal(identity?.revokedAt, null);
    assert.equal(f.auth.isRevoked(identityBefore!.providerSubject!), false);
  });

  it('still revokes the login identity when terminating a single-organization member', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const person = await seedPerson(f.store);
    const member = await seedMember(f.store, f.orgA, person, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, person, 'worker@synth.example');
    const identityBefore = await f.store.findAuthIdentityById(identityId);

    await f.svc.execute('TerminateMember', ctx(f.orgA, admin), { memberId: member });

    const identity = await f.store.findAuthIdentityById(identityId);
    assert.equal(identity?.status, 'revoked');
    assert.equal(f.auth.isRevoked(identityBefore!.providerSubject!), true);
  });

  it('does not sign the person out of another org when suspending them in one org', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const sharedPerson = await seedPerson(f.store);
    const memberInA = await seedMember(f.store, f.orgA, sharedPerson, ['sales_rep']);
    await seedMember(f.store, f.orgB, sharedPerson, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, sharedPerson, 'owner@real.example');
    const identity = await f.store.findAuthIdentityById(identityId);

    await f.svc.execute('SuspendMember', ctx(f.orgA, admin), { memberId: memberInA });

    assert.equal((await f.store.getMember(memberInA))?.accessStatus, 'suspended');
    assert.equal(f.auth.isSessionRevoked(identity!.providerSubject!), false);
  });

  it('still revokes sessions when suspending a single-organization member', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const person = await seedPerson(f.store);
    const member = await seedMember(f.store, f.orgA, person, ['sales_rep']);
    const identityId = await seedActiveIdentity(f.store, person, 'worker@synth.example');
    const identity = await f.store.findAuthIdentityById(identityId);

    await f.svc.execute('SuspendMember', ctx(f.orgA, admin), { memberId: member });

    assert.equal(f.auth.isSessionRevoked(identity!.providerSubject!), true);
  });

  it('denies RehireMember attaching an attacker-chosen identity to a person who belongs to another org', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const sharedPerson = await seedPerson(f.store);
    await seedMember(f.store, f.orgA, sharedPerson, ['sales_rep'], 'revoked');
    await seedMember(f.store, f.orgB, sharedPerson, ['sales_rep']);
    await seedActiveIdentity(f.store, sharedPerson, 'owner@real.example');

    await assert.rejects(
      f.svc.execute('RehireMember', ctx(f.orgA, admin), {
        personId: sharedPerson,
        email: 'attacker@evil.example',
        roleKey: 'sales_rep',
      }),
      /PERMISSION_DENIED/,
    );

    const identities = await f.store.listAuthIdentitiesByProviderEmail(
      'local-dev',
      'attacker@evil.example',
    );
    assert.equal(identities.length, 0);
  });

  it('still allows RehireMember for a person who only ever belonged to this org', async () => {
    const f = await twoOrgFixture();
    const admin = await seedMember(f.store, f.orgA, await seedPerson(f.store), ['people.admin']);

    const person = await seedPerson(f.store);
    await seedMember(f.store, f.orgA, person, ['sales_rep'], 'revoked');

    await f.svc.execute('RehireMember', ctx(f.orgA, admin), {
      personId: person,
      email: 'returning@synth.example',
      roleKey: 'sales_rep',
    });

    const identities = await f.store.listAuthIdentitiesByProviderEmail(
      'local-dev',
      'returning@synth.example',
    );
    assert.equal(identities.length, 1);
  });
});
