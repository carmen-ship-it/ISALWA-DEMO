/**
 * Adversarial authority tests — Wave B fixture SYNTH issue memory validation.
 *
 * Tests:
 * - issue.manage ≠ people.admin (scope boundary)
 * - reporter cannot triage (reinforced)
 * - cross-tenant denied (reinforced)
 * - possible cause ≠ confirmed (invariant)
 * - work complete ≠ issue resolved (invariant)
 * - reopen preserves resolution cycle
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import { IssueCommandService } from './issue-command-service';
import { MemoryIssueStore } from './memory-store';

const SYNTH_ORG = 'org-synth';
const OTHER_ORG = 'org-other';

// Wave B actors
const REPORTER = 'issue-reporter'; // member_active only
const MANAGER = 'issue-manager'; // issue.manage scope
const WORK_ACTOR = 'issue-work'; // member_active (can CreateWorkItem)
const PEOPLE_ADMIN = 'people-admin'; // people.admin only (NO issue.manage)

function ctx(memberId: string, orgId: string = SYNTH_ORG): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: new Date('2026-09-16T12:00:00.000Z'),
  };
}

describe('adversarial: issue.manage ≠ people.admin', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);

    // Add members
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: WORK_ACTOR, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: PEOPLE_ADMIN, organizationId: SYNTH_ORG, accessStatus: 'active' });

    // Manager has issue.manage ONLY
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });

    // People admin has people.admin but NOT issue.manage
    store.addRoleAssignment(PEOPLE_ADMIN, SYNTH_ORG, {
      roleKey: 'people.admin',
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  it('people.admin cannot triage (requires issue.manage)', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test issue',
    });

    // people.admin does NOT have issue.manage
    await assert.rejects(
      service.execute('TriageIssue', ctx(PEOPLE_ADMIN), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );

    // issue.manage CAN triage
    await assert.doesNotReject(
      service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      }),
    );
  });

  it('people.admin cannot assign issue owner (requires issue.manage)', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test issue',
    });

    await assert.rejects(
      service.execute('AssignIssueOwner', ctx(PEOPLE_ADMIN), {
        issueId: reported.data.issueId,
        ownerMemberId: WORK_ACTOR,
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('people.admin cannot confirm issue cause (requires issue.manage)', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test issue',
    });

    await assert.rejects(
      service.execute('ConfirmIssueCause', ctx(PEOPLE_ADMIN), {
        issueId: reported.data.issueId,
        confirmedCause: 'Some cause',
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('people.admin cannot close issue (requires issue.manage)', async () => {
    // Setup: create and resolve issue
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'Fixed',
      expectedVersion: 3,
    });

    // people.admin cannot close
    await assert.rejects(
      service.execute('CloseIssue', ctx(PEOPLE_ADMIN), {
        issueId: reported.data.issueId,
        expectedVersion: 4,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('people.admin cannot reopen issue (requires issue.manage)', async () => {
    // Setup: create, resolve, close issue
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'Fixed',
      expectedVersion: 3,
    });
    await service.execute('CloseIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 4,
    });

    // people.admin cannot reopen
    await assert.rejects(
      service.execute('ReopenIssue', ctx(PEOPLE_ADMIN), {
        issueId: reported.data.issueId,
        expectedVersion: 5,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('issue.manage does not grant people.admin capabilities', async () => {
    // Verify MANAGER has issue.manage but not people.admin
    const managerRoles = await store.listRoleAssignmentsForMember(MANAGER, SYNTH_ORG);
    const hasIssueManage = managerRoles.some(
      (r) => r.roleKey === ISSUE_MANAGE_SCOPE && !r.endedAt,
    );
    const hasPeopleAdmin = managerRoles.some(
      (r) => r.roleKey === 'people.admin' && !r.endedAt,
    );

    assert.equal(hasIssueManage, true);
    assert.equal(hasPeopleAdmin, false);
  });
});

describe('adversarial: reporter cannot triage (reinforced)', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  it('reporter can report but not triage own issue', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'I reported this',
    });
    assert.ok(reported.data.issueId);

    await assert.rejects(
      service.execute('TriageIssue', ctx(REPORTER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('reporter cannot assign owner', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Test',
    });

    await assert.rejects(
      service.execute('AssignIssueOwner', ctx(REPORTER), {
        issueId: reported.data.issueId,
        ownerMemberId: REPORTER,
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('reporter cannot relate issues', async () => {
    const issue1 = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Issue 1',
    });
    const issue2 = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Issue 2',
    });

    await assert.rejects(
      service.execute('RelateIssues', ctx(REPORTER), {
        issueId: issue1.data.issueId,
        relatedIssueId: issue2.data.issueId,
        relationType: 'related',
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );
  });
});

describe('adversarial: cross-tenant denied', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);

    // Members in SYNTH_ORG
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });

    // Add MANAGER membership in OTHER_ORG too (cross-tenant attempt)
    store.addMember({ id: MANAGER, organizationId: OTHER_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, OTHER_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  it('manager from other org cannot triage issue in synth org', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'SYNTH org issue',
    });

    // Manager acting in OTHER_ORG context trying to access SYNTH_ORG issue
    // Returns NOT_FOUND because issue is scoped to SYNTH_ORG, not accessible from OTHER_ORG
    // This is secure behavior: cross-tenant access is denied (can't even confirm existence)
    await assert.rejects(
      service.execute('TriageIssue', ctx(MANAGER, OTHER_ORG), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      }),
      /NOT_FOUND/,
    );
  });

  it('issue created in one org is not accessible from another', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'SYNTH org issue',
    });

    // Even with issue.manage in OTHER_ORG, cannot access SYNTH_ORG issue
    // Returns NOT_FOUND (secure: denies access without confirming existence)
    await assert.rejects(
      service.execute('AddIssueJournalEntry', ctx(MANAGER, OTHER_ORG), {
        issueId: reported.data.issueId,
        entryType: 'observation',
        content: 'Cross-tenant attack',
        expectedVersion: 0,
      }),
      /NOT_FOUND/,
    );
  });

  it('actor without membership in context org gets TENANT_FORBIDDEN', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'SYNTH org issue',
    });

    // Actor with no membership in OTHER_ORG at all
    const outsider = 'outsider-member';
    store.addMember({ id: outsider, organizationId: SYNTH_ORG, accessStatus: 'active' });

    // Outsider acting from OTHER_ORG context (where they have no membership) => TENANT_FORBIDDEN
    await assert.rejects(
      service.execute('TriageIssue', ctx(outsider, OTHER_ORG), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      }),
      /TENANT_FORBIDDEN/,
    );
  });
});

describe('adversarial: possible cause ≠ confirmed', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  it('adding possible_cause journal entry does not set confirmedCause', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Widget broken',
    });

    // Add a possible_cause journal entry (anyone can do this)
    await service.execute('AddIssueJournalEntry', ctx(REPORTER), {
      issueId: reported.data.issueId,
      entryType: 'possible_cause',
      content: 'Maybe the cache is stale',
      expectedVersion: 0,
    });

    // Verify confirmedCause is still null
    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.confirmedCause, null);
  });

  it('only ConfirmIssueCause sets confirmedCause (requires issue.manage)', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Widget broken',
    });

    // Reporter cannot confirm
    await assert.rejects(
      service.execute('ConfirmIssueCause', ctx(REPORTER), {
        issueId: reported.data.issueId,
        confirmedCause: 'Cache invalidation bug',
        expectedVersion: 0,
      }),
      /PERMISSION_DENIED/,
    );

    // Manager can confirm
    await service.execute('ConfirmIssueCause', ctx(MANAGER), {
      issueId: reported.data.issueId,
      confirmedCause: 'Cache invalidation bug',
      expectedVersion: 0,
    });

    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.confirmedCause, 'Cache invalidation bug');
  });

  it('multiple possible_cause entries do not auto-confirm', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Widget broken',
    });

    // Add multiple possible_cause entries
    for (let i = 0; i < 3; i++) {
      await service.execute('AddIssueJournalEntry', ctx(REPORTER), {
        issueId: reported.data.issueId,
        entryType: 'possible_cause',
        content: `Possible cause ${i + 1}`,
        expectedVersion: i,
      });
    }

    const entries = await store.listJournalEntries(SYNTH_ORG, reported.data.issueId as string);
    assert.equal(entries.length, 3);
    assert.ok(entries.every((e) => e.entryType === 'possible_cause'));

    // confirmedCause still null
    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.confirmedCause, null);
  });
});

describe('adversarial: work complete ≠ issue resolved', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: WORK_ACTOR, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    // Add a work item
    store.addWorkItem(SYNTH_ORG, 'work-123');
  });

  it('linking completed work does not resolve the issue', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug needs fix',
    });

    // Link work to issue
    await service.execute('LinkIssueWork', ctx(REPORTER), {
      issueId: reported.data.issueId,
      workItemId: 'work-123',
      expectedVersion: 0,
    });

    // Issue status is still reported (not resolved)
    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'reported');
    assert.equal(issue?.resolution, null);
  });

  it('issue in_progress with linked work is not automatically resolved', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug needs fix',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });

    // Link work
    await service.execute('LinkIssueWork', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      workItemId: 'work-123',
      expectedVersion: 3,
    });

    // Issue is still in_progress, not resolved
    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'in_progress');
  });

  it('ResolveIssue is a separate explicit action', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug needs fix',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('LinkIssueWork', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      workItemId: 'work-123',
      expectedVersion: 3,
    });

    // Explicitly resolve
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'Fixed the bug in the linked work item',
      expectedVersion: 4,
    });

    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'resolved');
    assert.equal(issue?.resolution, 'Fixed the bug in the linked work item');
  });
});

describe('adversarial: reopen preserves resolution cycle', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);
    store.addMember({ id: REPORTER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addMember({ id: WORK_ACTOR, organizationId: SYNTH_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, SYNTH_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  it('reopened issue preserves original resolution', async () => {
    // Create and fully resolve/close
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'First resolution',
      expectedVersion: 3,
    });
    await service.execute('CloseIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 4,
    });

    // Verify closed with resolution
    let issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'closed');
    assert.equal(issue?.resolution, 'First resolution');
    assert.ok(issue?.closedAt);

    // Reopen
    await service.execute('ReopenIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 5,
    });

    // Resolution is preserved after reopen
    issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'reopened');
    assert.equal(issue?.resolution, 'First resolution'); // preserved
    assert.ok(issue?.reopenedAt);
  });

  it('reopened issue can one-shot resolve again without in_progress (V1)', async () => {
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'First fix',
      expectedVersion: 3,
    });
    await service.execute('CloseIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 4,
    });
    await service.execute('ReopenIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 5,
    });

    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'Second fix',
      expectedVersion: 6,
    });

    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'resolved');
    assert.equal(issue?.resolution, 'Second fix');
  });

  it('reopen from resolved (not closed) preserves cycle', async () => {
    // Can reopen directly from resolved
    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Bug',
    });
    await service.execute('TriageIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 0,
    });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId: reported.data.issueId,
      ownerMemberId: WORK_ACTOR,
      expectedVersion: 1,
    });
    await service.execute('StartIssueProgress', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      expectedVersion: 2,
    });
    await service.execute('ResolveIssue', ctx(WORK_ACTOR), {
      issueId: reported.data.issueId,
      resolution: 'Initial fix',
      expectedVersion: 3,
    });

    // Reopen from resolved (skip close)
    await service.execute('ReopenIssue', ctx(MANAGER), {
      issueId: reported.data.issueId,
      expectedVersion: 4,
    });

    const issue = store.issues.get(reported.data.issueId as string);
    assert.equal(issue?.status, 'reopened');
    assert.equal(issue?.resolution, 'Initial fix'); // preserved
  });
});
