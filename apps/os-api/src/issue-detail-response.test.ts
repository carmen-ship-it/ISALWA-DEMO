import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IssueJournalEntryRecord, IssueRecord, IssueRelationRecord, IssueWorkLinkRecord } from '@isalwa/os-database';
import { toIssueDetailResponse } from './issue-detail-response';

function record(): IssueRecord {
  return {
    id: 'iss-1',
    organizationId: 'org-1',
    version: 3,
    status: 'open',
    title: 'Fuga',
    description: 'Se reportó una fuga.',
    reportedByMemberId: 'mem-r',
    reportedAt: new Date('2026-09-18T12:00:00.000Z'),
    currentOwnerMemberId: 'mem-o',
    confirmedCause: null,
    confirmedCauseByMemberId: null,
    confirmedCauseAt: null,
    resolution: null,
    resolvedByMemberId: null,
    resolvedAt: null,
    outcome: null,
    outcomeRecordedByMemberId: null,
    outcomeRecordedAt: null,
    createdAt: new Date('2026-09-18T12:00:00.000Z'),
    updatedAt: new Date('2026-09-18T12:05:00.000Z'),
  };
}

describe('toIssueDetailResponse', () => {
  it('wraps IssueDetail so the web page can read issue.journal and issue.version', () => {
    const journal: IssueJournalEntryRecord = {
      id: 'j-1',
      organizationId: 'org-1',
      issueId: 'iss-1',
      entryType: 'note',
      content: 'Nota',
      authorMemberId: 'mem-r',
      recordedAt: new Date('2026-09-18T12:01:00.000Z'),
      provenance: null,
    };
    const relation: IssueRelationRecord = {
      id: 'rel-1',
      organizationId: 'org-1',
      fromIssueId: 'iss-1',
      toIssueId: 'iss-2',
      relationType: 'related',
      createdByMemberId: 'mem-r',
      createdAt: new Date('2026-09-18T12:02:00.000Z'),
    };
    const link: IssueWorkLinkRecord = {
      id: 'wl-1',
      organizationId: 'org-1',
      issueId: 'iss-1',
      workItemId: 'work-1',
      linkedByMemberId: 'mem-o',
      linkedAt: new Date('2026-09-18T12:03:00.000Z'),
    };
    const body = toIssueDetailResponse({
      record: record(),
      references: [{ referenceType: 'order', referenceId: 'ord-1' }],
      journal: [journal],
      relations: [relation],
      workLinks: [link],
    });
    assert.equal(body.issue.issueId, 'iss-1');
    assert.equal(body.issue.version, 3);
    assert.equal(body.issue.ownerMemberId, 'mem-o');
    assert.equal(body.issue.journal[0]?.entryId, 'j-1');
    assert.equal(body.issue.relations[0]?.relatedIssueId, 'iss-2');
    assert.deepEqual(body.issue.linkedWorkItems, ['work-1']);
    assert.equal('title' in body, false);
    assert.equal(body.issue.title, 'Fuga');
  });
});
