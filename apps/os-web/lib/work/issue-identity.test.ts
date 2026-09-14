import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  approvalAttention,
  overdueAttention,
  reassignedAttention,
  sampleAttention,
} from './fixtures';
import { issueIdentityFromAttentionKey, sameAttentionIssue } from './issue-identity';

describe('issue identity from an existing attention key', () => {
  it('treats owner, overdue, and reassigned views of one work item as one issue', () => {
    const owner = issueIdentityFromAttentionKey(sampleAttention.attentionKey);
    const overdue = issueIdentityFromAttentionKey('work:overdue:work-1');
    const reassigned = issueIdentityFromAttentionKey(reassignedAttention.attentionKey);

    assert.deepEqual(owner, { issueId: 'work:work-1', kind: 'work', resourceId: 'work-1' });
    assert.equal(overdue?.issueId, owner?.issueId);
    assert.equal(reassigned?.issueId, owner?.issueId);
    assert.equal(sameAttentionIssue(sampleAttention.attentionKey, 'work:overdue:work-1'), true);
    assert.equal(
      sameAttentionIssue(sampleAttention.attentionKey, reassignedAttention.attentionKey),
      true,
    );
    assert.notEqual(owner?.issueId, sampleAttention.attentionKey);
    assert.notEqual(owner?.issueId, 'work:overdue:work-1');
  });

  it('keeps a different work item as a different issue', () => {
    const first = issueIdentityFromAttentionKey(sampleAttention.attentionKey);
    const second = issueIdentityFromAttentionKey(overdueAttention.attentionKey);
    assert.equal(second?.issueId, 'work:work-2');
    assert.notEqual(first?.issueId, second?.issueId);
    assert.equal(sameAttentionIssue(sampleAttention.attentionKey, overdueAttention.attentionKey), false);
  });

  it('treats the same approval as one issue wherever that attention key appears', () => {
    const fromInicio = issueIdentityFromAttentionKey(approvalAttention.attentionKey);
    const fromOtherPlace = issueIdentityFromAttentionKey('approval:approver:appr-1');

    assert.deepEqual(fromInicio, {
      issueId: 'approval:appr-1',
      kind: 'approval',
      resourceId: 'appr-1',
    });
    assert.equal(fromOtherPlace?.issueId, fromInicio?.issueId);
    assert.equal(sameAttentionIssue(approvalAttention.attentionKey, 'approval:approver:appr-1'), true);
    assert.equal(sameAttentionIssue(approvalAttention.attentionKey, 'work:overdue:work-1'), false);
  });

  it('does not classify open work as overdue from a past date', () => {
    const open = issueIdentityFromAttentionKey('work:owner:work-1');
    assert.equal(open?.kind, 'work');
    assert.equal(open?.issueId, 'work:work-1');
    assert.equal(issueIdentityFromAttentionKey('2020-01-01T00:00:00.000Z'), null);
    assert.equal(sameAttentionIssue('work:owner:work-1', '2020-01-01T00:00:00.000Z'), false);
  });

  it('treats due-today and elapsed keys as the same work issue, not a new type', () => {
    const owner = issueIdentityFromAttentionKey('work:owner:work-1');
    const dueToday = issueIdentityFromAttentionKey('work:due-today:work-1');
    const elapsed = issueIdentityFromAttentionKey('work:elapsed:work-1');
    assert.equal(dueToday?.issueId, owner?.issueId);
    assert.equal(elapsed?.issueId, owner?.issueId);
    assert.equal(dueToday?.kind, 'work');
    assert.equal(sameAttentionIssue('work:due-today:work-1', 'work:elapsed:work-1'), true);
    assert.equal(sameAttentionIssue('work:elapsed:work-1', 'work:overdue:work-1'), true);
    assert.notEqual(elapsed?.issueId, 'work:overdue:work-1');
  });

  it('treats a submitted quote and a commitment as their own issues', () => {
    assert.deepEqual(issueIdentityFromAttentionKey('quote:submitted:quote-1'), {
      issueId: 'quote:quote-1',
      kind: 'quote',
      resourceId: 'quote-1',
    });
    assert.deepEqual(issueIdentityFromAttentionKey('commitment:due-today:c-1'), {
      issueId: 'commitment:c-1',
      kind: 'commitment',
      resourceId: 'c-1',
    });
    assert.equal(
      issueIdentityFromAttentionKey('commitment:elapsed:c-1')?.issueId,
      'commitment:c-1',
    );
    assert.equal(sameAttentionIssue('commitment:due-today:c-1', 'commitment:elapsed:c-1'), true);
    assert.equal(sameAttentionIssue('quote:submitted:quote-1', 'work:owner:work-1'), false);
    assert.equal(issueIdentityFromAttentionKey('quote:draft:quote-1'), null);
  });

  it('does not invent an issue for an unknown key', () => {
    assert.equal(issueIdentityFromAttentionKey(''), null);
    assert.equal(issueIdentityFromAttentionKey('work:owner:'), null);
    assert.equal(issueIdentityFromAttentionKey('work:escalated:work-1'), null);
    assert.equal(issueIdentityFromAttentionKey('approval:watcher:appr-1'), null);
    assert.equal(sameAttentionIssue('work:escalated:work-1', 'work:owner:work-1'), false);
  });

  it('does not create work, a notice, or a deadline rule', () => {
    const source = readFileSync(join(process.cwd(), 'lib/work/issue-identity.ts'), 'utf8');
    assert.doesNotMatch(source, /\bSLA\b|notification|createWork|WorkItem|dueAt\s*</i);
    assert.doesNotMatch(source, /new Date|elapsedAge|isWorkOverdue|escalat/);
  });
});
