import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { COMMAND_REQUIRED_SCOPES, scopeImplies } from '@isalwa/os-contracts';
import { computeEffectiveScopes, memberHasScope } from '@isalwa/os-domain';
import { LocalAuthProviderPort } from './auth-provider';
import { MemoryOsStore } from './memory-store';
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

async function seedActiveMember(
  store: MemoryOsStore,
  orgId: string,
  email: string,
  roleKeys: string[],
): Promise<string> {
  const personId = createId();
  await store.insertPerson({ id: personId, givenName: 'Test', familyName: 'User', version: 0 });
  const memberId = createId();
  await store.insertMember({
    id: memberId,
    organizationId: orgId,
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
      organizationId: orgId,
      memberId,
      roleKey,
      effectiveAt: new Date('2026-01-01'),
      endedAt: null,
    });
  }
  return memberId;
}

describe('workforce adversarial access (Wave A agent 7)', () => {
  it('denies people.admin commands for Owner and Gerente role keys without people.admin', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const target = await seedActiveMember(store, org.id, 'target@isalwa.bo', ['sales_rep']);

    for (const roleKey of ['Owner', 'Gerente'] as const) {
      const actorId = await seedActiveMember(store, org.id, `${roleKey}@isalwa.bo`, [roleKey]);
      const snap = {
        memberId: actorId,
        organizationId: org.id,
        accessStatus: 'active' as const,
        roleKeys: computeEffectiveScopes(
          [{ roleKey, effectiveAt: new Date('2026-01-01'), endedAt: null }],
          [],
          new Date('2026-08-01'),
        ),
        delegatedScopes: [],
      };
      assert.equal(memberHasScope(snap, 'people.admin'), false);
      await assert.rejects(
        svc.execute('SuspendMember', ctx(org.id, actorId), { memberId: target }),
        /PERMISSION_DENIED/,
      );
    }
  });

  it('allows people.admin workforce commands regardless of display title strings', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const worker = await seedActiveMember(store, org.id, 'worker@isalwa.bo', ['sales_rep']);

    const titledAdmin = await seedActiveMember(store, org.id, 'titled@isalwa.bo', [
      'people.admin',
      'Jefe Comercial',
      'Gerencia',
    ]);
    await svc.execute('SuspendMember', ctx(org.id, titledAdmin), { memberId: worker });
    const suspended = await store.getMember(worker);
    assert.equal(suspended?.accessStatus, 'suspended');
  });

  it('does not treat cargo or title strings as authority', () => {
    const scopes = computeEffectiveScopes(
      [
        { roleKey: 'Gerente', effectiveAt: new Date('2026-01-01'), endedAt: null },
        { roleKey: 'JEFE COMERCIAL', effectiveAt: new Date('2026-01-01'), endedAt: null },
      ],
      [],
      new Date('2026-08-01'),
    );
    const snap = {
      memberId: 'mem',
      organizationId: 'org',
      accessStatus: 'active' as const,
      roleKeys: scopes,
      delegatedScopes: [],
    };
    assert.equal(memberHasScope(snap, 'people.admin'), false);
    assert.equal(scopes.includes('people.admin'), false);
    assert.equal(scopes.includes('commercial.team.read'), false);
  });

  it('states system.admin does not imply people.admin in contracts and workforce gates', () => {
    assert.equal(scopeImplies('system.admin', 'people.admin'), false);
    assert.equal(COMMAND_REQUIRED_SCOPES.InviteMember, 'people.admin');
    const systemAdminSrc = readFileSync(
      resolve(__dirname, '../../os-contracts/src/operations-scopes.ts'),
      'utf8',
    );
    assert.match(systemAdminSrc, /return held\.length > 0 && held === required/);
  });

  it('blocks TerminateMember when open work remains', async () => {
    const store = new MemoryOsStore();
    const auth = new LocalAuthProviderPort();
    const svc = new WorkforceCommandService(store, auth);
    const org = await store.seedOrganization('ISALWA', 'isalwa');
    const admin = await store.seedAdminMember(org.id, 'admin@isalwa.bo', 'Admin', 'User');
    const worker = await seedActiveMember(store, org.id, 'worker@isalwa.bo', ['sales_rep']);
    store.workItems.push({
      id: createId(),
      organizationId: org.id,
      ownerMemberId: worker,
      title: 'Open task',
      status: 'open',
      version: 0,
    });

    await assert.rejects(
      svc.execute('TerminateMember', ctx(org.id, admin.member.id), { memberId: worker }),
      /VALIDATION_FAILED/,
    );
  });
});
