/**
 * S12 — company membership alone never authorises a write on an existing issue.
 *
 * Contributor commands (journal, outcome, work link) require the actor to be the
 * reporter, the current owner, or hold issue.manage. Status and assignment commands
 * already required owner / issue.manage; they are pinned here too.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import { IssueCommandService } from './issue-command-service';
import { MemoryIssueStore } from './memory-store';

const ORG = 'org-a';
const OTHER_ORG = 'org-b';
const REPORTER = 'reporter';
const OWNER = 'owner';
const MANAGER = 'manager';
const UNRELATED = 'unrelated-same-company';
const FOREIGN = 'foreign-member';

function ctx(memberId: string, orgId: string = ORG): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr',
    effectiveAt: new Date('2026-10-01T12:00:00.000Z'),
  };
}

describe('S12: restricted issue writes need a relationship, not just company membership', () => {
  let store: MemoryIssueStore;
  let service: IssueCommandService;
  let issueId: string;

  beforeEach(async () => {
    store = new MemoryIssueStore();
    service = new IssueCommandService(store);
    for (const id of [REPORTER, OWNER, MANAGER, UNRELATED]) {
      store.addMember({ id, organizationId: ORG, accessStatus: 'active' });
    }
    store.addMember({ id: FOREIGN, organizationId: OTHER_ORG, accessStatus: 'active' });
    store.addRoleAssignment(MANAGER, ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    store.addRoleAssignment(FOREIGN, OTHER_ORG, {
      roleKey: ISSUE_MANAGE_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    store.addWorkItem(ORG, 'work-1');

    const reported = await service.execute('ReportIssue', ctx(REPORTER), {
      description: 'Restricted issue',
    });
    issueId = reported.data.issueId as string;
    await service.execute('TriageIssue', ctx(MANAGER), { issueId, expectedVersion: 0 });
    await service.execute('AssignIssueOwner', ctx(MANAGER), {
      issueId,
      ownerMemberId: OWNER,
      expectedVersion: 1,
    });
    // issue is now triaged, version 2, owned by OWNER
  });

  const journal = (actor: RequestContext, version = 2) =>
    service.execute('AddIssueJournalEntry', actor, {
      issueId,
      entryType: 'observation',
      content: 'note',
      expectedVersion: version,
    });
  const outcome = (actor: RequestContext, version = 2) =>
    service.execute('RecordIssueOutcome', actor, {
      issueId,
      outcome: 'Customer confirmed',
      expectedVersion: version,
    });
  const link = (actor: RequestContext, version = 2) =>
    service.execute('LinkIssueWork', actor, {
      issueId,
      workItemId: 'work-1',
      expectedVersion: version,
    });

  describe('unrelated same-company member is denied and nothing changes', () => {
    it('cannot add a journal entry', async () => {
      await assert.rejects(journal(ctx(UNRELATED)), /PERMISSION_DENIED/);
      assert.equal((await store.listJournalEntries(ORG, issueId)).length, 0);
      assert.equal(store.issues.get(issueId)?.version, 2);
    });

    it('cannot record an outcome', async () => {
      await assert.rejects(outcome(ctx(UNRELATED)), /PERMISSION_DENIED/);
      assert.equal(store.issues.get(issueId)?.outcome, null);
      assert.equal(store.issues.get(issueId)?.version, 2);
    });

    it('cannot link work', async () => {
      await assert.rejects(link(ctx(UNRELATED)), /PERMISSION_DENIED/);
      assert.equal((await store.listWorkLinks(ORG, issueId)).length, 0);
    });

    it('cannot change status (start progress, resolve, triage, close, reopen)', async () => {
      await assert.rejects(
        service.execute('StartIssueProgress', ctx(UNRELATED), { issueId, expectedVersion: 2 }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        service.execute('ResolveIssue', ctx(UNRELATED), {
          issueId,
          resolution: 'nope',
          expectedVersion: 2,
        }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        service.execute('CloseIssue', ctx(UNRELATED), { issueId, expectedVersion: 2 }),
        /PERMISSION_DENIED/,
      );
      await assert.rejects(
        service.execute('ReopenIssue', ctx(UNRELATED), { issueId, expectedVersion: 2 }),
        /PERMISSION_DENIED/,
      );
      assert.equal(store.issues.get(issueId)?.status, 'triaged');
    });

    it('cannot assign or take over ownership', async () => {
      await assert.rejects(
        service.execute('AssignIssueOwner', ctx(UNRELATED), {
          issueId,
          ownerMemberId: UNRELATED,
          expectedVersion: 2,
        }),
        /PERMISSION_DENIED/,
      );
      assert.equal(store.issues.get(issueId)?.ownerMemberId, OWNER);
    });
  });

  describe('authorized actors still succeed', () => {
    it('owner can journal, record outcome and link work', async () => {
      await journal(ctx(OWNER), 2);
      await outcome(ctx(OWNER), 3);
      await link(ctx(OWNER), 4);
      assert.equal((await store.listJournalEntries(ORG, issueId)).length, 1);
      assert.equal(store.issues.get(issueId)?.outcome, 'Customer confirmed');
      assert.equal((await store.listWorkLinks(ORG, issueId)).length, 1);
    });

    it('reporter can journal on their own issue', async () => {
      await journal(ctx(REPORTER));
      assert.equal((await store.listJournalEntries(ORG, issueId)).length, 1);
    });

    it('issue.manage holder can journal, record outcome and link work', async () => {
      await journal(ctx(MANAGER), 2);
      await outcome(ctx(MANAGER), 3);
      await link(ctx(MANAGER), 4);
      assert.equal(store.issues.get(issueId)?.version, 5);
    });

    it('owner can start progress and resolve', async () => {
      await service.execute('StartIssueProgress', ctx(OWNER), { issueId, expectedVersion: 2 });
      await service.execute('ResolveIssue', ctx(OWNER), {
        issueId,
        resolution: 'Fixed',
        expectedVersion: 3,
      });
      assert.equal(store.issues.get(issueId)?.status, 'resolved');
    });
  });

  describe('foreign-company ids do not reveal the other tenant', () => {
    it('a foreign manager gets NOT_FOUND for every contributor command', async () => {
      for (const run of [journal, outcome, link]) {
        await assert.rejects(run(ctx(FOREIGN, OTHER_ORG)), /NOT_FOUND/);
      }
      assert.equal(store.issues.get(issueId)?.version, 2);
    });

    it('a foreign manager gets NOT_FOUND for status and assignment commands', async () => {
      await assert.rejects(
        service.execute('AssignIssueOwner', ctx(FOREIGN, OTHER_ORG), {
          issueId,
          ownerMemberId: FOREIGN,
          expectedVersion: 2,
        }),
        /NOT_FOUND/,
      );
      await assert.rejects(
        service.execute('CloseIssue', ctx(FOREIGN, OTHER_ORG), { issueId, expectedVersion: 2 }),
        /NOT_FOUND/,
      );
    });

    it('a same-company member cannot use a foreign org context to reach the issue', async () => {
      await assert.rejects(journal(ctx(UNRELATED, OTHER_ORG)), /TENANT_FORBIDDEN/);
    });

    it('a foreign actor cannot be assigned as owner', async () => {
      await assert.rejects(
        service.execute('AssignIssueOwner', ctx(MANAGER), {
          issueId,
          ownerMemberId: FOREIGN,
          expectedVersion: 2,
        }),
        /VALIDATION_FAILED/,
      );
    });
  });
});
