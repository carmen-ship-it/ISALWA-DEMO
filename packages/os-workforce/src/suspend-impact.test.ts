import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { SUSPEND_BLOCKED_MESSAGE } from '@isalwa/os-contracts';
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
    effectiveAt: new Date('2026-09-19T12:00:00.000Z'),
  };
}

async function seed(store: MemoryOsStore, orgId: string, email: string, roleKeys: string[]) {
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

describe('suspend impact', () => {
  it('blocks suspension while open work remains and does not reassign it', async () => {
    const store = new MemoryOsStore();
    const svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
    const org = await store.seedOrganization('Demo', 'demo');
    const admin = await seed(store, org.id, 'admin@isalwa.demo', ['people.admin']);
    const worker = await seed(store, org.id, 'worker@isalwa.demo', ['sales_rep']);
    const workId = createId();
    store.workItems.push({
      id: workId,
      organizationId: org.id,
      ownerMemberId: worker,
      title: 'Pedido abierto',
      status: 'open',
      version: 0,
    });

    await assert.rejects(
      () => svc.execute('SuspendMember', ctx(org.id, admin), { memberId: worker }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );

    const member = await store.getMember(worker);
    assert.equal(member?.accessStatus, 'active');
    assert.equal(store.workItems[0]?.ownerMemberId, worker);
    assert.equal(store.workItems[0]?.status, 'open');
    assert.equal(SUSPEND_BLOCKED_MESSAGE.includes('trabajo abierto asignado'), true);
  });

  it('suspends a member with no actionable ownership', async () => {
    const store = new MemoryOsStore();
    const svc = new WorkforceCommandService(store, new LocalAuthProviderPort());
    const org = await store.seedOrganization('Demo', 'demo-clear');
    const admin = await seed(store, org.id, 'admin2@isalwa.demo', ['people.admin']);
    const worker = await seed(store, org.id, 'clear@isalwa.demo', ['sales_rep']);
    await svc.execute('SuspendMember', ctx(org.id, admin), { memberId: worker });
    assert.equal((await store.getMember(worker))?.accessStatus, 'suspended');
  });
});
