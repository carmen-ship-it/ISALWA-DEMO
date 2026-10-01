import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  DELEGABLE_SCOPE_KEYS,
  COMMAND_RESERVED_SCOPE_KEYS,
  RECOGNIZED_PERMISSION_SCOPE_KEYS,
} from '@isalwa/os-contracts';
import { computeEffectiveScopes, memberHasScope } from '@isalwa/os-domain';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
import { WorkforceCommandService } from './workforce-command-service';

/**
 * S2 — delegated scopes and role keys become real grants (computeEffectiveScopes
 * merges them as plain strings). So:
 *  - a grant must be a recognized permission definition, never an unknown string;
 *  - only scopes on the explicit delegable allowlist may be delegated, so a future
 *    privileged scope is closed by default (no denylist of known-bad keys);
 *  - the delegator must hold the scope in their own right, which excludes scopes
 *    they only received by delegation;
 *  - a job title (sales_rep) is a label that never authorizes a command;
 *  - technical/QA scopes stay out of band.
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

async function grantRole(
  store: MemoryOsStore,
  organizationId: string,
  memberId: string,
  roleKey: string,
): Promise<void> {
  await store.insertRoleAssignment({
    id: createId(),
    organizationId,
    memberId,
    roleKey,
    effectiveAt: new Date('2026-01-01'),
    endedAt: null,
  });
}

/** What the authorization layer sees for a member: the roles and delegations as stored. */
async function accessSnapshotOf(store: MemoryOsStore, organizationId: string, memberId: string) {
  return {
    memberId,
    organizationId,
    accessStatus: 'active',
    roleKeys: await effectiveScopesOf(store, organizationId, memberId),
    delegatedScopes: [] as string[],
  };
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

async function storedRoleKeys(
  store: MemoryOsStore,
  organizationId: string,
  memberId: string,
): Promise<string[]> {
  const roles = await store.listRoleAssignmentsForMember(memberId, organizationId);
  return roles.filter((role) => role.endedAt === null).map((role) => role.roleKey);
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

  it('denies delegating approval.act to oneself even when held', async () => {
    const f = await fixture();
    await grantRole(f.store, f.org, f.admin, 'approval.act');

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

  it('still allows a holder to delegate the approval.act they hold to another active member', async () => {
    const f = await fixture();
    await grantRole(f.store, f.org, f.admin, 'approval.act');

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

  it('lets a people.admin store a job title on another member, and denies an admin scope they do not hold', async () => {
    const f = await fixture();

    await f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
      memberId: f.worker,
      roleKey: 'sales_manager',
    });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_manager']);

    await assert.rejects(
      f.svc.execute('ChangeRole', ctx(f.org, f.admin), {
        memberId: f.worker,
        roleKey: 'master_data.admin',
      }),
      /PERMISSION_DENIED/,
    );
    assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_manager']);
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

  describe('closed grant model', () => {
    it('does not delegate an unknown scope string, including a future privileged scope', async () => {
      // Regression: the old denylist logic only blocked the keys it knew about.
      for (const scope of ['future.privileged.scope', 'ledger.post', 'people.admin ', 'APPROVAL.ACT']) {
        const f = await fixture();
        await grantRole(f.store, f.org, f.admin, 'approval.act');
        await assert.rejects(
          f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
            delegateMemberId: f.worker,
            scopes: [scope],
            expiresAt: EXPIRES,
          }),
          /VALIDATION_FAILED/,
          `${JSON.stringify(scope)} must not be delegable`,
        );
        assert.equal((await f.store.listDelegationsForDelegate(f.worker, f.org)).length, 0);
      }
    });

    it('does not delegate a recognized scope that is not on the delegable allowlist, even when held', async () => {
      const notDelegable = RECOGNIZED_PERMISSION_SCOPE_KEYS.filter(
        (key) => !(DELEGABLE_SCOPE_KEYS as readonly string[]).includes(key),
      );
      assert.ok(notDelegable.length > 10);
      const f = await fixture();
      for (const scope of notDelegable) {
        await grantRole(f.store, f.org, f.admin, scope);
      }
      for (const scope of notDelegable) {
        await assert.rejects(
          f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
            delegateMemberId: f.worker,
            scopes: [scope],
            expiresAt: EXPIRES,
          }),
          /PERMISSION_DENIED/,
          `${scope} is not on the allowlist`,
        );
      }
      assert.equal((await f.store.listDelegationsForDelegate(f.worker, f.org)).length, 0);
    });

    it('denies the whole request when one scope in it is not delegable (no partial grant)', async () => {
      const f = await fixture();
      await grantRole(f.store, f.org, f.admin, 'approval.act');
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
          delegateMemberId: f.worker,
          scopes: ['approval.act', 'future.privileged.scope'],
          expiresAt: EXPIRES,
        }),
        /VALIDATION_FAILED/,
      );
      assert.equal((await f.store.listDelegationsForDelegate(f.worker, f.org)).length, 0);
    });

    it('denies delegating approval.act the delegator does not hold', async () => {
      const f = await fixture();
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
          delegateMemberId: f.worker,
          scopes: ['approval.act'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
      assert.equal((await f.store.listDelegationsForDelegate(f.worker, f.org)).length, 0);
    });

    it('keeps reserved technical and QA scopes non-delegable even when held', async () => {
      for (const scope of COMMAND_RESERVED_SCOPE_KEYS) {
        assert.equal((DELEGABLE_SCOPE_KEYS as readonly string[]).includes(scope), false);
        const f = await fixture();
        await grantRole(f.store, f.org, f.admin, scope);
        await assert.rejects(
          f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
            delegateMemberId: f.worker,
            scopes: [scope],
            expiresAt: EXPIRES,
          }),
          /PERMISSION_DENIED/,
          `${scope} is reserved`,
        );
      }
    });

    it('rejects an empty or malformed scope list', async () => {
      const f = await fixture();
      for (const scopes of [[], undefined, 'approval.act', [1], [null]]) {
        await assert.rejects(
          f.svc.execute('GrantDelegation', ctx(f.org, f.admin), {
            delegateMemberId: f.worker,
            scopes,
            expiresAt: EXPIRES,
          }),
          /VALIDATION_FAILED/,
        );
      }
    });
  });

  describe('delegation chains', () => {
    async function chain() {
      const f = await fixture();
      // A holds approval.act independently, plus people.admin so A may run GrantDelegation.
      const a = await seedMember(f.store, f.org, ['people.admin', 'approval.act']);
      // B only ever receives approval.act and people.admin by delegation.
      const b = await seedMember(f.store, f.org, ['sales_rep']);
      const c = await seedMember(f.store, f.org, ['sales_rep']);
      await f.svc.execute('GrantDelegation', ctx(f.org, a), {
        delegateMemberId: b,
        scopes: ['approval.act', 'people.admin'],
        expiresAt: EXPIRES,
      });
      return { ...f, a, b, c };
    }

    it('B holds the delegated scopes for use, but cannot re-delegate what A granted', async () => {
      const f = await chain();
      const scopesOfB = await effectiveScopesOf(f.store, f.org, f.b);
      assert.equal(scopesOfB.includes('approval.act'), true);
      assert.equal(scopesOfB.includes('people.admin'), true);

      // B may call GrantDelegation (people.admin by delegation), yet holds nothing of their own to give.
      for (const scope of ['approval.act', 'people.admin']) {
        await assert.rejects(
          f.svc.execute('GrantDelegation', ctx(f.org, f.b), {
            delegateMemberId: f.c,
            scopes: [scope],
            expiresAt: EXPIRES,
          }),
          /PERMISSION_DENIED/,
          `B must not re-delegate ${scope}`,
        );
      }
      assert.equal((await f.store.listDelegationsForDelegate(f.c, f.org)).length, 0);
    });

    it('B may delegate approval.act once B holds it independently', async () => {
      const f = await chain();
      await grantRole(f.store, f.org, f.b, 'approval.act');
      await f.svc.execute('GrantDelegation', ctx(f.org, f.b), {
        delegateMemberId: f.c,
        scopes: ['approval.act'],
        expiresAt: EXPIRES,
      });
      assert.equal((await effectiveScopesOf(f.store, f.org, f.c)).includes('approval.act'), true);

      // Holding approval.act independently does not unlock the other delegated scope.
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.b), {
          delegateMemberId: f.c,
          scopes: ['people.admin'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
    });

    it('a revoked or expired delegation leaves no delegation authority behind', async () => {
      const f = await chain();
      const [granted] = await f.store.listDelegationsForDelegate(f.b, f.org);
      await f.svc.execute('RevokeDelegation', ctx(f.org, f.a), { delegationId: granted!.id });
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.b), {
          delegateMemberId: f.c,
          scopes: ['approval.act'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
    });

    it('denies self-delegation of a held, delegable scope', async () => {
      const f = await chain();
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.a), {
          delegateMemberId: f.a,
          scopes: ['approval.act'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
    });

    it('denies a delegation for a member who only holds a job title', async () => {
      const f = await fixture();
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, f.worker), {
          delegateMemberId: f.admin,
          scopes: ['approval.act'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
    });
  });

  describe('job titles never confer authority', () => {
    it('stores sales_rep and sales_manager as labels that authorize no command', async () => {
      const f = await fixture();
      for (const title of ['sales_rep', 'sales_manager', 'Gerente', 'JEFE COMERCIAL', 'Encargado de Producción']) {
        await f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey: title });
        const stored = await storedRoleKeys(f.store, f.org, f.worker);
        assert.deepEqual(stored, [title], 'the title is kept on the member');
        assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.worker), []);

        await assert.rejects(
          f.svc.execute('InviteMember', ctx(f.org, f.worker), {
            email: `x-${createId()}@synth.example`,
            givenName: 'X',
            familyName: 'Y',
            roleKey: 'sales_rep',
          }),
          /PERMISSION_DENIED/,
          `${title} must not authorize InviteMember`,
        );
      }
    });

    it('a stale stored role key that is not a recognized scope cannot authorize a workforce command', async () => {
      // Written before the grant model closed, or by direct store access.
      const f = await fixture();
      const stale = await seedMember(f.store, f.org, ['future.privileged.scope', 'people_admin', 'people.admin.']);
      await assert.rejects(
        f.svc.execute('InviteMember', ctx(f.org, stale), {
          email: 'stale@synth.example',
          givenName: 'S',
          familyName: 'T',
          roleKey: 'sales_rep',
        }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        f.svc.execute('GrantDelegation', ctx(f.org, stale), {
          delegateMemberId: f.worker,
          scopes: ['approval.act'],
          expiresAt: EXPIRES,
        }),
        /PERMISSION_DENIED/,
      );
    });

    it('a recognized scope that is also a role key still authorizes', async () => {
      const f = await fixture();
      const snap = await accessSnapshotOf(f.store, f.org, f.admin);
      assert.equal(memberHasScope(snap, 'people.admin'), true);
      const invited = await f.svc.execute('InviteMember', ctx(f.org, f.admin), {
        email: 'ok@synth.example',
        givenName: 'O',
        familyName: 'K',
        roleKey: 'sales_rep',
      });
      assert.ok(invited.data.memberId);
    });

    it('a title does not stand in for a scope it resembles', async () => {
      const f = await fixture();
      const lookalike = await seedMember(f.store, f.org, ['people_admin', 'People Admin']);
      await assert.rejects(
        f.svc.execute('InviteMember', ctx(f.org, lookalike), {
          email: 'lookalike@synth.example',
          givenName: 'L',
          familyName: 'A',
          roleKey: 'sales_rep',
        }),
        /PERMISSION_DENIED/,
      );
    });
  });

  describe('role key assignment: invite, change-role, rehire', () => {
    const futureScope = 'future.privileged.scope';

    async function terminatedPerson() {
      const f = await fixture();
      const invited = await f.svc.execute('InviteMember', ctx(f.org, f.admin), {
        email: 'leaver@synth.example',
        givenName: 'Lea',
        familyName: 'Ver',
        roleKey: 'sales_rep',
      });
      const memberId = invited.data.memberId as string;
      await f.svc.execute('ActivateMember', ctx(f.org, memberId), {
        memberId,
        providerSubject: 'subject:leaver',
      });
      await f.svc.execute('TerminateMember', ctx(f.org, f.admin), { memberId });
      return { ...f, personId: invited.data.personId as string };
    }

    it('invite: keeps supported job titles, rejects unknown and reserved authority keys', async () => {
      const f = await fixture();
      for (const roleKey of ['sales_rep', 'sales_manager']) {
        const invited = await f.svc.execute('InviteMember', ctx(f.org, f.admin), {
          email: `${roleKey}@synth.example`,
          givenName: 'T',
          familyName: 'T',
          roleKey,
        });
        assert.deepEqual(
          await storedRoleKeys(f.store, f.org, invited.data.memberId as string),
          [roleKey],
        );
      }
      await assert.rejects(
        f.svc.execute('InviteMember', ctx(f.org, f.admin), {
          email: 'future@synth.example',
          givenName: 'F',
          familyName: 'S',
          roleKey: futureScope,
        }),
        /VALIDATION_FAILED/,
      );
      for (const roleKey of COMMAND_RESERVED_SCOPE_KEYS) {
        await assert.rejects(
          f.svc.execute('InviteMember', ctx(f.org, f.admin), {
            email: `${roleKey}@synth.example`,
            givenName: 'R',
            familyName: 'S',
            roleKey,
          }),
          /PERMISSION_DENIED/,
        );
      }
    });

    it('change-role: keeps titles, rejects unknown strings, leaves the previous role intact on failure', async () => {
      const f = await fixture();
      await f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey: 'sales_manager' });
      assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_manager']);

      for (const roleKey of [futureScope, 'people.admin.', '', ' sales_rep', 'sales.rep']) {
        await assert.rejects(
          f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey }),
          /VALIDATION_FAILED/,
          `${JSON.stringify(roleKey)} is neither a title nor a permission`,
        );
      }
      assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_manager']);
    });

    it('change-role: a member cannot self-assign a recognized scope they do not hold', async () => {
      const f = await fixture();
      for (const roleKey of ['org.admin', 'commercial.order.convert', 'approval.act']) {
        await assert.rejects(
          f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.admin, roleKey }),
          /PERMISSION_DENIED/,
          `${roleKey} is not held`,
        );
      }
      assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.admin), ['people.admin']);
    });

    it('change-role: a scope held only through delegation cannot be self-assigned as a permanent role', async () => {
      const f = await fixture();
      const a = await seedMember(f.store, f.org, ['people.admin', 'org.admin']);
      const b = await seedMember(f.store, f.org, ['people.admin']);
      await f.svc.execute('GrantDelegation', ctx(f.org, a), {
        delegateMemberId: b,
        scopes: ['org.admin'],
        expiresAt: EXPIRES,
      });
      await assert.rejects(
        f.svc.execute('ChangeRole', ctx(f.org, b), { memberId: b, roleKey: 'org.admin' }),
        /PERMISSION_DENIED/,
      );
    });

    it('change-role: reserved technical and QA scopes are never assigned', async () => {
      for (const roleKey of COMMAND_RESERVED_SCOPE_KEYS) {
        const f = await fixture();
        await assert.rejects(
          f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey }),
          /PERMISSION_DENIED/,
        );
        assert.equal((await effectiveScopesOf(f.store, f.org, f.worker)).includes(roleKey), false);
      }
    });

    it('rehire: keeps supported job titles, rejects unknown and reserved authority keys', async () => {
      const f = await terminatedPerson();
      await assert.rejects(
        f.svc.execute('RehireMember', ctx(f.org, f.admin), {
          personId: f.personId,
          email: 'leaver2@synth.example',
          roleKey: futureScope,
        }),
        /VALIDATION_FAILED/,
      );
      for (const roleKey of COMMAND_RESERVED_SCOPE_KEYS) {
        await assert.rejects(
          f.svc.execute('RehireMember', ctx(f.org, f.admin), {
            personId: f.personId,
            email: 'leaver3@synth.example',
            roleKey,
          }),
          /PERMISSION_DENIED/,
        );
      }
      const rehired = await f.svc.execute('RehireMember', ctx(f.org, f.admin), {
        personId: f.personId,
        email: 'leaver4@synth.example',
        roleKey: 'sales_manager',
      });
      assert.deepEqual(
        await storedRoleKeys(f.store, f.org, rehired.data.memberId as string),
        ['sales_manager'],
      );
    });
  });
});

class CountingAuth extends LocalAuthProviderPort {
  readonly sent: string[] = [];
  override async createInvite(email: string): Promise<{ inviteRef: string }> {
    this.sent.push(email);
    return super.createInvite(email);
  }
}

function assignmentState(store: MemoryOsStore, auth: CountingAuth): string {
  return JSON.stringify({
    members: store.members.map((member) => [member.id, member.accessStatus, member.employmentStatus]),
    roles: store.roleAssignments.map((role) => [role.memberId, role.roleKey, role.endedAt?.toISOString() ?? null]),
    persons: store.persons.map((person) => person.id),
    identities: store.authIdentities.map((identity) => identity.id),
    events: store.businessEvents.map((event) => event.id),
    invites: auth.sent,
  });
}

describe('cross-member role assignment requires independent possession', () => {
  async function counted() {
    const store = new MemoryOsStore();
    const auth = new CountingAuth();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('SYNTH DEMO', 'synth-cross');
    const admin = await seedMember(store, org.id, ['people.admin']);
    const worker = await seedMember(store, org.id, ['sales_rep']);
    return { store, auth, svc, org: org.id, admin, worker };
  }

  async function terminatedPersonId(
    svc: WorkforceCommandService,
    org: string,
    admin: string,
  ): Promise<string> {
    const invited = await svc.execute('InviteMember', ctx(org, admin), {
      email: `leave-${createId()}@synth.example`,
      givenName: 'Lea',
      familyName: 'Ver',
      roleKey: 'sales_rep',
    });
    const memberId = invited.data.memberId as string;
    await svc.execute('ActivateMember', ctx(org, memberId), {
      memberId,
      providerSubject: `subject:${memberId}`,
    });
    await svc.execute('TerminateMember', ctx(org, admin), { memberId });
    return invited.data.personId as string;
  }

  async function denyLeavesNothing(
    run: () => Promise<unknown>,
    store: MemoryOsStore,
    auth: CountingAuth,
  ): Promise<void> {
    const before = assignmentState(store, auth);
    await assert.rejects(run, /PERMISSION_DENIED/);
    assert.equal(assignmentState(store, auth), before);
  }

  it('a people.admin-only actor cannot assign org.admin or integration.admin through ChangeRole, InviteMember, or RehireMember', async () => {
    const f = await counted();
    const personId = await terminatedPersonId(f.svc, f.org, f.admin);
    for (const roleKey of ['org.admin', 'integration.admin'] as const) {
      await denyLeavesNothing(
        () => f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey }),
        f.store,
        f.auth,
      );
      await denyLeavesNothing(
        () =>
          f.svc.execute('InviteMember', ctx(f.org, f.admin), {
            email: `${roleKey}-${createId()}@synth.example`,
            givenName: 'N',
            familyName: 'N',
            roleKey,
          }),
        f.store,
        f.auth,
      );
      await denyLeavesNothing(
        () =>
          f.svc.execute('RehireMember', ctx(f.org, f.admin), {
            personId,
            email: `re-${roleKey}-${createId()}@synth.example`,
            roleKey,
          }),
        f.store,
        f.auth,
      );
    }
    assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_rep']);
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.admin), ['people.admin']);
  });

  it('a scope held only by delegation cannot be assigned as a permanent role', async () => {
    const f = await counted();
    const holder = await seedMember(f.store, f.org, ['people.admin', 'org.admin']);
    const delegate = await seedMember(f.store, f.org, ['people.admin']);
    await f.svc.execute('GrantDelegation', ctx(f.org, holder), {
      delegateMemberId: delegate,
      scopes: ['org.admin'],
      expiresAt: EXPIRES,
    });
    const personId = await terminatedPersonId(f.svc, f.org, f.admin);
    await denyLeavesNothing(
      () => f.svc.execute('ChangeRole', ctx(f.org, delegate), { memberId: f.worker, roleKey: 'org.admin' }),
      f.store,
      f.auth,
    );
    await denyLeavesNothing(
      () =>
        f.svc.execute('InviteMember', ctx(f.org, delegate), {
          email: `del-${createId()}@synth.example`,
          givenName: 'D',
          familyName: 'D',
          roleKey: 'org.admin',
        }),
      f.store,
      f.auth,
    );
    await denyLeavesNothing(
      () =>
        f.svc.execute('RehireMember', ctx(f.org, delegate), {
          personId,
          email: `del-re-${createId()}@synth.example`,
          roleKey: 'org.admin',
        }),
      f.store,
      f.auth,
    );
    assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_rep']);
  });

  it('an actor who holds the scope independently may assign it', async () => {
    const f = await counted();
    const holder = await seedMember(f.store, f.org, ['people.admin', 'org.admin']);
    const personId = await terminatedPersonId(f.svc, f.org, holder);

    await f.svc.execute('ChangeRole', ctx(f.org, holder), { memberId: f.worker, roleKey: 'org.admin' });
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.worker), ['org.admin']);

    const invited = await f.svc.execute('InviteMember', ctx(f.org, holder), {
      email: `entitled-${createId()}@synth.example`,
      givenName: 'E',
      familyName: 'E',
      roleKey: 'org.admin',
    });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, invited.data.memberId as string), ['org.admin']);

    const rehired = await f.svc.execute('RehireMember', ctx(f.org, holder), {
      personId,
      email: `entitled-re-${createId()}@synth.example`,
      roleKey: 'org.admin',
    });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, rehired.data.memberId as string), ['org.admin']);
  });

  it('a people.admin-only actor may still assign an ordinary job title, which grants no authority', async () => {
    const f = await counted();
    const personId = await terminatedPersonId(f.svc, f.org, f.admin);

    await f.svc.execute('ChangeRole', ctx(f.org, f.admin), { memberId: f.worker, roleKey: 'sales_manager' });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, f.worker), ['sales_manager']);
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, f.worker), []);

    const invited = await f.svc.execute('InviteMember', ctx(f.org, f.admin), {
      email: `title-${createId()}@synth.example`,
      givenName: 'T',
      familyName: 'T',
      roleKey: 'sales_rep',
    });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, invited.data.memberId as string), ['sales_rep']);
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, invited.data.memberId as string), []);

    const rehired = await f.svc.execute('RehireMember', ctx(f.org, f.admin), {
      personId,
      email: `title-re-${createId()}@synth.example`,
      roleKey: 'Ventas Región',
    });
    assert.deepEqual(await storedRoleKeys(f.store, f.org, rehired.data.memberId as string), ['Ventas Región']);
    assert.deepEqual(await effectiveScopesOf(f.store, f.org, rehired.data.memberId as string), []);
  });
});
