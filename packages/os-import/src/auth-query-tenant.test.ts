import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { ImportCommandService } from './import-command-service';

const ORG = 'org-session';
const ACTOR = 'actor-session';

describe('import auth queries', () => {
  it('passes the session organization into role and delegation reads', async () => {
    const calls: Array<{ method: string; organizationId?: string }> = [];
    const access = {
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
      async findIdempotency() {
        return null;
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
      new ImportCommandService({} as never, access, {} as never, {} as never).execute(
        'DryRunClientImport',
        ctx,
        { sourceFingerprint: 'fp', rows: [] },
      ),
      /PERMISSION_DENIED/,
    );
    assert.deepEqual(calls, [
      { method: 'roles', organizationId: ORG },
      { method: 'delegations', organizationId: ORG },
    ]);
  });
});
