import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';

/**
 * S2 — delegated scopes become real grants (computeEffectiveScopes merges them
 * with role keys). GrantDelegation must therefore not accept arbitrary scope
 * strings, must not let an actor delegate to themselves, and must never hand
 * out the technical/QA scopes that are provisioned out of band.
 */

const AT = new Date('2026-08-01T12:00:00Z');
const EXPIRES = '2026-08-02T12:00:00Z';

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
  roleKeys: string[],
): Promise<string> {
  const personId = createId();
  await store.insertPerson({ id: personId, givenName: 'Test', familyName: 'User', version: 0 });
  const memberId = createId();
  await store.insertMember({
    id: memberId,
    organizationId,
    personId,
    employmentStatus: 'active',
    accessStatus: 'active',
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

async function fixture() {
  const store = new MemoryOsStore();
  const auth = new LocalAuthProviderPort();
  const svc = new WorkforceCommandService(store, auth);
  const org = await store.seedOrganization('SYNTH DEMO', 'synth');
  const admin = await seedMember(store, org.id, ['people.admin']);
  const worker = await seedMember(store, org.id, ['sales_rep']);
  return { store, auth, svc, org: org.id, admin, worker };
}

async function effectiveScopesOf(
  store: MemoryOsStore,
  organizationId: string,
  memberId: string,
): Promise<string[]> {
  const roles = await store.listRoleAssignmentsForMember(memberId, organizationId);
  const delegations = await store.listDelegationsForDelegate(memberId, organizationId);
  return computeEffectiveScopes(roles, delegations, AT);
}

describe('S2 delegation and role escalation', () => {
  it('denies a people.admin self-delegating system.admin', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
        delegateMemberId: f.admin,
        scopes: ['system.admin'],
        expiresAt: EXPIRES,
      }),
      /PERMISSION_DENIED|VALIDATION_FAILED/,
    );

    const scopes = await effectiveScopesOf(f.store, f.org, f.admin);
    assert.equal(scopes.includes('system.admin'), false);
  });

  it('denies delegating qa.access to another member', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
        delegateMemberId: f.worker,
        scopes: ['qa.access'],
        expiresAt: EXPIRES,
      }),
      /PERMISSION_DENIED|VALIDATION_FAILED/,
    );

    const scopes = await effectiveScopesOf(f.store, f.org, f.worker);
    assert.equal(scopes.includes('qa.access'), false);
  });

  it('denies an arbitrary unrecognized scope string', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
        delegateMemberId: f.worker,
        scopes: ['zz.review.probe'],
        expiresAt: EXPIRES,
      }),
      /VALIDATION_FAILED/,
    );
  });

  it('denies delegating an admin scope the actor holds, to themselves', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
        delegateMemberId: f.admin,
        scopes: ['approval.act'],
        expiresAt: EXPIRES,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('denies delegating an admin scope the delegator does not hold', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
        delegateMemberId: f.worker,
        scopes: ['org.admin'],
        expiresAt: EXPIRES,
      }),
      /PERMISSION_DENIED/,
    );

    const scopes = await effectiveScopesOf(f.store, f.org, f.worker);
    assert.equal(scopes.includes('org.admin'), false);
  });

  it('still allows delegating an admin scope the delegator does hold, for coverage', async () => {
    const f = await fixture();

    await f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
      delegateMemberId: f.worker,
      scopes: ['people.admin'],
      expiresAt: EXPIRES,
    });

    const scopes = await effectiveScopesOf(f.store, f.org, f.worker);
    assert.equal(scopes.includes('people.admin'), true);
  });

  it('still allows delegating approval.act to another active member', async () => {
    const f = await fixture();

    await f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
      delegateMemberId: f.worker,
      scopes: ['approval.act'],
      expiresAt: EXPIRES,
    });

    const scopes = await effectiveScopesOf(f.store, f.org, f.worker);
    assert.equal(scopes.includes('approval.act'), true);
  });

  it('denies assigning reserved technical scopes as a primary role key', async () => {
    for (const roleKey of ['system.admin', 'integration.admin', 'qa.access']) {
      const f = await fixture();
      await assert.rejects(
        f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey }),
        /PERMISSION_DENIED/,
        `ChangeRole should reject ${roleKey}`,
      );
      const scopes = await effectiveScopesOf(f.store, f.org, f.worker);
      assert.equal(scopes.includes(roleKey), false);
    }
  });

  it('denies inviting a member directly into a reserved technical scope', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('InviteMember', ctx(f.org, f.admin), {
        email: 'newadmin@synth.example',
        givenName: 'New',
        familyName: 'Admin',
        roleKey: 'qa.access',
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('denies a people.admin elevating their own role to an admin scope they do not hold', async () => {
    const f = await fixture();

    await assert.rejects(
      f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
        memberId: f.admin,
        roleKey: 'org.admin',
      }),
      /PERMISSION_DENIED/,
    );

    const scopes = await effectiveScopesOf(f.store, f.org, f.admin);
    assert.equal(scopes.includes('org.admin'), false);
  });

  it('still allows a people.admin to assign ordinary and admin roles to other members', async () => {
    const f = await fixture();

    await f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
      memberId: f.worker,
      roleKey: 'sales_manager',
    });
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.worker), ['sales_manager']);

    await f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
      memberId: f.worker,
      roleKey: 'master_data.admin',
    });
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.worker), ['master_data.admin']);
  });

  it('still allows a member to keep their own role unchanged', async () => {
    const f = await fixture();

    await f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
      memberId: f.admin,
      roleKey: 'people.admin',
    });

    const scopes = await effectiveScopesOf(f.store, f.org, f.admin);
    assert.deepEqual(scopes, ['people.admin']);
  });
});
