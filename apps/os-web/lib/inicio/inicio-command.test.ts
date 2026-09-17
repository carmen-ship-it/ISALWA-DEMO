import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { MANAGEMENT_ORG_READ_SCOPE } from '@/lib/management/scope';
import { COMMERCIAL_TEAM_READ_SCOPE } from '@isalwa/os-contracts';
import { resolveInicioRoleLens } from '@/lib/inicio/role-lens';
import {
  loadInicioCommandQueues,
  safeInicioSectionFetch,
} from '@/lib/inicio/load-command-queues';
import {
  commitmentsQueryForLens,
  filterVisibleWorkItems,
  splitCommitmentQueues,
  workItemsQueryForLens,
} from '@/lib/inicio/queues';

const appRoot = resolve(__dirname, '../..');

function readApp(path: string): string {
  return readFileSync(resolve(appRoot, path), 'utf8');
}

function forbiddenError(): OsApiError {
  return new OsApiError({
    kind: 'forbidden',
    status: 403,
    code: 'PERMISSION_DENIED',
    message: 'PERMISSION_DENIED',
  });
}

function emptyList() {
  return { items: [], meta: { hasMore: false }, freshness: null };
}

function work(partial: Partial<WorkSummaryReadModel> & { workItemId: string }): WorkSummaryReadModel {
  return {
    organizationId: 'org-1',
    ownerMemberId: 'mem-1',
    createdByMemberId: 'mem-1',
    title: 'Seguimiento',
    description: '',
    status: 'open',
    dueAt: null,
    subjectType: null,
    subjectId: null,
    approvalStatus: 'none',
    priority: 'normal',
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    ...partial,
  };
}

function commitment(partial: Partial<CommitmentSummary> & { id: string }): CommitmentSummary {
  return {
    id: partial.id,
    organizationId: 'org-1',
    partyId: partial.partyId ?? 'pty-1',
    ownerMemberId: 'mem-1',
    text: partial.text ?? 'Llamar al cliente',
    dueAt: partial.dueAt ?? '2026-09-10T12:00:00.000Z',
    origin: 'manual',
    relatedSubjectType: null,
    relatedSubjectId: null,
    lifecycle: 'open',
    state: partial.state ?? 'pending',
    createdByMemberId: 'mem-1',
    createdAt: '2026-09-01T12:00:00.000Z',
    fulfilledAt: null,
    fulfilledByMemberId: null,
    cancelledAt: null,
  };
}

describe('inicio role lens', () => {
  it('prefers owner, then manager, then operator', () => {
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [MANAGEMENT_ORG_READ_SCOPE],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'owner',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [COMMERCIAL_TEAM_READ_SCOPE],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'manager',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: true,
        leadershipOrgReady: false,
      }),
      'manager',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: false,
        leadershipOrgReady: true,
      }),
      'owner',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'operator',
    );
  });
});

describe('inicio command queue queries', () => {
  it('maps lens to work visibility without inventing filters', () => {
    assert.deepEqual(workItemsQueryForLens('operator'), { status: 'open', limit: 8 });
    assert.deepEqual(workItemsQueryForLens('manager'), {
      status: 'open',
      limit: 8,
      visibility: 'team',
    });
    assert.deepEqual(workItemsQueryForLens('owner'), {
      status: 'open',
      limit: 8,
      visibility: 'org',
    });
    assert.deepEqual(commitmentsQueryForLens('operator', 'mem-9'), {
      lifecycle: 'open',
      ownerMemberId: 'mem-9',
    });
    assert.deepEqual(commitmentsQueryForLens('manager', 'mem-9'), { lifecycle: 'open' });
  });

  it('orders overdue work before upcoming open items', () => {
    const asOf = new Date('2026-09-16T12:00:00.000Z');
    const rows = filterVisibleWorkItems(
      [
        work({ workItemId: 'w-later', dueAt: '2026-09-20T12:00:00.000Z' }),
        work({ workItemId: 'w-over', dueAt: '2026-09-10T12:00:00.000Z' }),
      ],
      asOf,
    );
    assert.deepEqual(rows.map((row) => row.workItemId), ['w-over', 'w-later']);
  });

  it('splits overdue commitments for the compromisos section', () => {
    const split = splitCommitmentQueues([
      commitment({ id: 'c-open', state: 'pending' }),
      commitment({ id: 'c-late', state: 'overdue' }),
    ]);
    assert.deepEqual(
      split.overdue.map((row) => row.id),
      ['c-late'],
    );
    assert.deepEqual(
      split.open.map((row) => row.id),
      ['c-open'],
    );
  });
});

describe('inicio optional section fetch', () => {
  it('treats forbidden like unavailable and still throws unexpected errors', async () => {
    const omitted = await safeInicioSectionFetch(async () => {
      throw forbiddenError();
    });
    assert.equal(omitted, 'unavailable');

    const down = await safeInicioSectionFetch(async () => {
      throw new OsApiError({
        kind: 'unavailable',
        status: 503,
        code: 'UNAVAILABLE',
        message: 'UNAVAILABLE',
      });
    });
    assert.equal(down, 'unavailable');

    await assert.rejects(
      () =>
        safeInicioSectionFetch(async () => {
          throw new OsApiError({
            kind: 'unknown',
            status: 400,
            code: 'VALIDATION_FAILED',
            message: 'VALIDATION_FAILED',
          });
        }),
      (err: unknown) => err instanceof OsApiError && err.kind === 'unknown',
    );
  });
});

describe('loadInicioCommandQueues', () => {
  it('does not collapse Gerente home when org work visibility is forbidden', async () => {
    const workQueries: unknown[] = [];
    const client = {
      async getTrustedAuthorization() {
        return {
          authIdentityId: 'auth-1',
          personId: 'person-1',
          memberId: 'mem-gerente',
          organizationId: 'org-1',
          accessStatus: 'active',
          employmentStatus: 'active',
          grantedScopes: [MANAGEMENT_ORG_READ_SCOPE],
        };
      },
      async getAuthenticatedSession() {
        return { memberId: 'mem-gerente', organizationId: 'org-1' };
      },
      async listWorkItems(query?: unknown) {
        workQueries.push(query);
        throw forbiddenError();
      },
      async listIssues() {
        return emptyList();
      },
      async listCommitments() {
        return { items: [] };
      },
      async listApprovals() {
        return emptyList();
      },
    };

    const loaded = await loadInicioCommandQueues(client as never, {
      leadershipTeamReady: false,
      leadershipOrgReady: false,
    });

    assert.equal(loaded.lens, 'owner');
    assert.deepEqual(workQueries, [{ status: 'open', limit: 8, visibility: 'org' }]);
    assert.equal(loaded.unavailable.work, true);
    assert.deepEqual(loaded.pendingWork, []);
    assert.equal(loaded.unavailable.issues, false);
    assert.equal(loaded.unavailable.approvals, false);
    assert.equal(loaded.unavailable.commitments, false);
  });
});

describe('Inicio page fail-closed per section', () => {
  it('keeps greeting and Centro de mando when a sub-query is forbidden', () => {
    const page = readApp('app/(app)/inicio/page.tsx');
    const loader = readApp('lib/inicio/load-command-queues.ts');
    const administracion = readApp('app/(app)/administracion/page.tsx');
    const sistema = readApp('app/(app)/sistema/page.tsx');

    assert.match(loader, /isVisibilityDenied/);
    assert.match(loader, /safeInicioSectionFetch/);
    assert.match(page, /safeInicioSectionFetch/);
    assert.match(page, /PageHeader/);
    assert.match(page, /Centro de mando/);
    assert.match(page, /InicioSummaryCards/);
    assert.doesNotMatch(page, /OperatingHomes/);
    assert.match(page, /safeInicioSectionFetch\(\(\) =>\s*client\.listAttention/);
    assert.match(page, /QuerySurfaceState error=\{classifyQueryError\(err\)\}/);
    assert.doesNotMatch(page, /async function safeFetch/);
    assert.match(administracion, /AccessDeniedState/);
    assert.match(sistema, /AccessDeniedState/);
  });
});
