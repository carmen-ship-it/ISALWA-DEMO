/**
 * Issue lifecycle tests — full command flow with memory store.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import { IssueCommandService } from './issue-command-service';
import { MemoryIssueStore } from './memory-store';

const ORG = 'org-1';
const REPORTER = 'reporter-1';
const MANAGER = 'manager-1';
const OWNER = 'owner-1';

function ctx(memberId: string = REPORTER): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: memberId,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: 'corr',
    effectiveAt: new Date('2026-09-01T12:00:00.000Z'),
  };
}

describe('IssueCommandService', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;

  beforeEach(() => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);

    // Add members
    store.addMember({ id: REPORTER, organizationId: ORG, accessStatus: 'active' });
    store.addMember({ id: MANAGER, organizationId: ORG, accessStatus: 'active' });
    store.addMember({ id: OWNER, organizationId: ORG, accessStatus: 'active' });

    // Manager has issue.manage scope
    store.addRoleAssignment(MANAGER, ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  });

  describe('ReportIssue', () => {
    it('creates an issue with status reported', async () => {
      const result = await service.execute('ReportIssue', ctx(), {
        description: 'Something is broken',
        title: 'Bug in widget',
      });

      assert.ok(result.data.issueId);
      const issue = store.issues.get(result.data.issueId as string);
      assert.ok(issue);
      assert.equal(issue.status, 'reported');
      assert.equal(issue.description, 'Something is broken');
      assert.equal(issue.title, 'Bug in widget');
      assert.equal(issue.reportedByMemberId, REPORTER);
    });

    it('creates an issue with references', async () => {
      const result = await service.execute('ReportIssue', ctx(), {
        description: 'Order issue',
        references: [{ referenceType: 'order', referenceId: 'order-123' }],
      });

      const refs = await store.listIssueReferences(ORG, result.data.issueId as string);
      assert.equal(refs.length, 1);
      assert.equal(refs[0]!.referenceType, 'order');
      assert.equal(refs[0]!.referenceId, 'order-123');
    });

    it('emits issue.reported event', async () => {
      await service.execute('ReportIssue', ctx(), {
        description: 'Test issue',
      });

      assert.equal(store.events.length, 1);
      assert.equal(store.events[0]!.eventType, 'issue.reported');
    });
  });

  describe('TriageIssue', () => {
    it('requires issue.manage scope', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      // Reporter without scope cannot triage
      await assert.rejects(
        service.execute('TriageIssue', ctx(REPORTER), {
          issueId: reported.data.issueId,
          expectedVersion: 0,
        }),
        /PERMISSION_DENIED/,
      );

      // Manager can triage
      const result = await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });

      assert.ok(result);
      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'triaged');
    });

    it('enforces version check', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await assert.rejects(
        service.execute('TriageIssue', ctx(MANAGER), {
          issueId: reported.data.issueId,
          expectedVersion: 5, // wrong version
        }),
        /CONFLICT/,
      );
    });
  });

  describe('AssignIssueOwner', () => {
    it('assigns an owner', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      const result = await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 0,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.ownerMemberId, OWNER);
      assert.equal(result.data.newOwnerMemberId, OWNER);
    });

    it('rejects inactive member as owner', async () => {
      store.addMember({ id: 'inactive', organizationId: ORG, accessStatus: 'suspended' });
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await assert.rejects(
        service.execute('AssignIssueOwner', ctx(MANAGER), {
          issueId: reported.data.issueId,
          ownerMemberId: 'inactive',
          expectedVersion: 0,
        }),
        /VALIDATION_FAILED/,
      );
    });
  });

  describe('StartIssueProgress', () => {
    it('owner can start progress on triaged issue', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });
      await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 1,
      });

      const result = await service.execute('StartIssueProgress', ctx(OWNER), {
        issueId: reported.data.issueId,
        expectedVersion: 2,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'in_progress');
    });

    it('non-owner without scope cannot start progress', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });
      await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 1,
      });

      // Reporter is not owner and has no scope
      await assert.rejects(
        service.execute('StartIssueProgress', ctx(REPORTER), {
          issueId: reported.data.issueId,
          expectedVersion: 2,
        }),
        /PERMISSION_DENIED/,
      );
    });
  });

  describe('AddIssueJournalEntry', () => {
    it('any member can add journal entry', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await service.execute('AddIssueJournalEntry', ctx(REPORTER), {
        issueId: reported.data.issueId,
        entryType: 'observation',
        content: 'Noticed the widget fails on Tuesdays',
        expectedVersion: 0,
      });

      const entries = await store.listJournalEntries(ORG, reported.data.issueId as string);
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.entryType, 'observation');
      assert.equal(entries[0]!.content, 'Noticed the widget fails on Tuesdays');
    });
  });

  describe('ConfirmIssueCause', () => {
    it('requires issue.manage scope', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await assert.rejects(
        service.execute('ConfirmIssueCause', ctx(REPORTER), {
          issueId: reported.data.issueId,
          confirmedCause: 'Cache invalidation bug',
          expectedVersion: 0,
        }),
        /PERMISSION_DENIED/,
      );

      await service.execute('ConfirmIssueCause', ctx(MANAGER), {
        issueId: reported.data.issueId,
        confirmedCause: 'Cache invalidation bug',
        expectedVersion: 0,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.confirmedCause, 'Cache invalidation bug');
    });
  });

  describe('LinkIssueWork', () => {
    it('links a work item to the issue', async () => {
      store.addWorkItem(ORG, 'work-123');
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await service.execute('LinkIssueWork', ctx(REPORTER), {
        issueId: reported.data.issueId,
        workItemId: 'work-123',
        expectedVersion: 0,
      });

      const links = await store.listWorkLinks(ORG, reported.data.issueId as string);
      assert.equal(links.length, 1);
      assert.equal(links[0]!.workItemId, 'work-123');
    });

    it('rejects non-existent work item', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      await assert.rejects(
        service.execute('LinkIssueWork', ctx(REPORTER), {
          issueId: reported.data.issueId,
          workItemId: 'nonexistent',
          expectedVersion: 0,
        }),
        /NOT_FOUND/,
      );
    });
  });

  describe('ResolveIssue', () => {
    it('owner can resolve issue', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });
      await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 1,
      });
      await service.execute('StartIssueProgress', ctx(OWNER), {
        issueId: reported.data.issueId,
        expectedVersion: 2,
      });

      await service.execute('ResolveIssue', ctx(OWNER), {
        issueId: reported.data.issueId,
        resolution: 'Fixed the cache logic',
        expectedVersion: 3,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'resolved');
      assert.equal(issue?.resolution, 'Fixed the cache logic');
    });

    it('issue.manage can resolve directly from reported without triage or progress', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Open reported issue',
      });

      await service.execute('ResolveIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        resolution: 'Corrected on first visit',
        expectedVersion: 0,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'resolved');
      assert.equal(issue?.resolution, 'Corrected on first visit');
    });

    it('rejects resolve from terminal statuses', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('ResolveIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        resolution: 'Done',
        expectedVersion: 0,
      });

      await assert.rejects(
        service.execute('ResolveIssue', ctx(MANAGER), {
          issueId: reported.data.issueId,
          resolution: 'Again',
          expectedVersion: 1,
        }),
        /VALIDATION_FAILED/,
      );
    });
  });

  describe('CloseIssue', () => {
    it('closes a resolved issue', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });
      await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 1,
      });
      await service.execute('StartIssueProgress', ctx(OWNER), {
        issueId: reported.data.issueId,
        expectedVersion: 2,
      });
      await service.execute('ResolveIssue', ctx(OWNER), {
        issueId: reported.data.issueId,
        resolution: 'Fixed',
        expectedVersion: 3,
      });

      await service.execute('CloseIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 4,
      });

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'closed');
    });
  });

  describe('ReopenIssue', () => {
    it('reopens a closed issue', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });
      await service.execute('TriageIssue', ctx(MANAGER), {
        issueId: reported.data.issueId,
        expectedVersion: 0,
      });
      await service.execute('AssignIssueOwner', ctx(MANAGER), {
        issueId: reported.data.issueId,
        ownerMemberId: OWNER,
        expectedVersion: 1,
      });
      await service.execute('StartIssueProgress', ctx(OWNER), {
        issueId: reported.data.issueId,
        expectedVersion: 2,
      });
      await service.execute('ResolveIssue', ctx(OWNER), {
        issueId: reported.data.issueId,
        resolution: 'Fixed',
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

      const issue = store.issues.get(reported.data.issueId as string);
      assert.equal(issue?.status, 'reopened');
    });
  });

  describe('RelateIssues', () => {
    it('creates a relation between issues', async () => {
      const issue1 = await service.execute('ReportIssue', ctx(), {
        description: 'First issue',
      });
      const issue2 = await service.execute('ReportIssue', ctx(), {
        description: 'Second issue',
      });

      await service.execute('RelateIssues', ctx(MANAGER), {
        issueId: issue1.data.issueId,
        relatedIssueId: issue2.data.issueId,
        relationType: 'related',
        expectedVersion: 0,
      });

      const relations = await store.listIssueRelations(ORG, issue1.data.issueId as string);
      assert.equal(relations.length, 1);
      assert.equal(relations[0]!.relatedIssueId, issue2.data.issueId);
      assert.equal(relations[0]!.relationType, 'related');
    });
  });

  describe('tenant isolation', () => {
    it('rejects cross-tenant access', async () => {
      const reported = await service.execute('ReportIssue', ctx(), {
        description: 'Test',
      });

      const otherOrgCtx: RequestContext = {
        organizationId: 'other-org',
        actorMemberId: MANAGER,
        personId: 'person',
        authIdentityId: 'auth',
        correlationId: 'corr',
        effectiveAt: new Date(),
      };

      await assert.rejects(
        service.execute('TriageIssue', otherOrgCtx, {
          issueId: reported.data.issueId,
          expectedVersion: 0,
        }),
        /TENANT_FORBIDDEN/,
      );
    });
  });
});
