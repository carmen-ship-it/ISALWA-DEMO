import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { OutboxRecoveryService } from './outbox-recovery-service';

const ORG = 'org-session';
const ACTOR = 'actor-session';

describe('outbox recovery auth queries', () => {
  it('passes the session organization into role and delegation reads and does not recover', async () => {
    const calls: Array<{ method: string; organizationId?: string }> = [];
    let recovered = false;
    const workforce = {
      async getMemberInOrg(organizationId: string, memberId: string) {
        return organizationId === ORG && memberId === ACTOR
          ? { id: ACTOR, organizationId: ORG, accessStatus: 'active' }
          : null;
      },
      async listRoleAssignmentsForMember(_memberId: string, organizationId?: string) {
        calls.push({ method: 'roles', organizationId });
        return [];
      },
      async listDelegationsForDelegate(_memberId: string, organizationId?: string) {
        calls.push({ method: 'delegations', organizationId });
        return [];
      },
    };
    const store = {
      async findIdempotency() {
        return null;
      },
      async recoverDeadLetterDelivery() {
        recovered = true;
        throw new Error('SHOULD_NOT_RECOVER');
      },
    };
    const ctx: RequestContext = {
      organizationId: ORG,
      actorMemberId: ACTOR,
      personId: 'person',
      authIdentityId: 'auth',
      correlationId: 'corr',
      effectiveAt: new Date('2026-08-01T12:00:00.000Z'),
    };
    await assert.rejects(
      new OutboxRecoveryService(store as never, workforce).retryDeadLetterDelivery(
        ctx,
        'outbox-1',
        'operator retry',
      ),
      /PERMISSION_DENIED/,
    );
    assert.equal(recovered, false);
    assert.deepEqual(calls, [
      { method: 'roles', organizationId: ORG },
      { method: 'delegations', organizationId: ORG },
    ]);
  });
});
