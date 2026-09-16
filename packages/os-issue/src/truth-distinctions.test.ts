/**
 * Truth distinctions tests — verifying the invariants documented in issue contracts.
 *
 * These tests prove:
 * - Issue ≠ WorkItem
 * - Possible cause ≠ Confirmed cause
 * - Work completed ≠ Issue resolved
 * - Issue resolved ≠ Issue closed
 * - Feedback ≠ Issue
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  issueIsNotWorkItem,
  possibleCauseIsNotConfirmed,
  workCompletedDoesNotResolveIssue,
  resolvedIsNotClosed,
  canTransitionIssue,
  type IssueStatus,
} from '@isalwa/os-contracts';
import { feedbackIsNotIssue } from '@isalwa/os-contracts';

describe('truth distinctions', () => {
  describe('Issue ≠ WorkItem', () => {
    it('issueIsNotWorkItem returns true for different IDs', () => {
      assert.equal(issueIsNotWorkItem('issue-123', 'work-456'), true);
    });

    it('issueIsNotWorkItem returns false for same ID (pathological case)', () => {
      assert.equal(issueIsNotWorkItem('same-id', 'same-id'), false);
    });
  });

  describe('Possible cause ≠ Confirmed cause', () => {
    it('possible_cause journal entry is not a confirmed cause', () => {
      assert.equal(possibleCauseIsNotConfirmed('possible_cause'), true);
    });

    it('observation is not a possible cause marker', () => {
      assert.equal(possibleCauseIsNotConfirmed('observation'), false);
    });

    it('attempt is not a possible cause marker', () => {
      assert.equal(possibleCauseIsNotConfirmed('attempt'), false);
    });

    it('evidence_reference is not a possible cause marker', () => {
      assert.equal(possibleCauseIsNotConfirmed('evidence_reference'), false);
    });
  });

  describe('Work completed ≠ Issue resolved', () => {
    it('completed work does not resolve a reported issue', () => {
      assert.equal(workCompletedDoesNotResolveIssue('completed', 'reported'), true);
    });

    it('completed work does not resolve a triaged issue', () => {
      assert.equal(workCompletedDoesNotResolveIssue('completed', 'triaged'), true);
    });

    it('completed work does not resolve an in_progress issue', () => {
      assert.equal(workCompletedDoesNotResolveIssue('completed', 'in_progress'), true);
    });

    it('completed work and resolved issue returns false (both done)', () => {
      assert.equal(workCompletedDoesNotResolveIssue('completed', 'resolved'), false);
    });

    it('open work and unresolved issue maintains independence', () => {
      assert.equal(workCompletedDoesNotResolveIssue('open', 'in_progress'), false);
    });
  });

  describe('Issue resolved ≠ Issue closed', () => {
    it('resolved status is not closed', () => {
      assert.equal(resolvedIsNotClosed('resolved'), true);
    });

    it('closed status is not the same as resolved check', () => {
      assert.equal(resolvedIsNotClosed('closed'), false);
    });

    it('in_progress is neither resolved nor closed', () => {
      assert.equal(resolvedIsNotClosed('in_progress'), false);
    });
  });

  describe('Feedback ≠ Issue', () => {
    it('feedbackIsNotIssue always returns true', () => {
      assert.equal(feedbackIsNotIssue(), true);
    });
  });

  describe('Issue status transitions', () => {
    const validTransitions: Array<[IssueStatus, IssueStatus]> = [
      ['reported', 'triaged'],
      ['triaged', 'in_progress'],
      ['in_progress', 'resolved'],
      ['resolved', 'closed'],
      ['resolved', 'reopened'],
      ['closed', 'reopened'],
      ['reopened', 'in_progress'],
    ];

    for (const [from, to] of validTransitions) {
      it(`allows transition from ${from} to ${to}`, () => {
        assert.equal(canTransitionIssue(from, to), true);
      });
    }

    const invalidTransitions: Array<[IssueStatus, IssueStatus]> = [
      ['reported', 'in_progress'], // must triage first
      ['reported', 'resolved'],
      ['reported', 'closed'],
      ['triaged', 'resolved'], // must be in_progress first
      ['triaged', 'closed'],
      ['in_progress', 'closed'], // must resolve first
      ['in_progress', 'triaged'], // cannot go back
      ['closed', 'in_progress'], // must reopen first
      ['reopened', 'triaged'], // cannot go back to triaged
    ];

    for (const [from, to] of invalidTransitions) {
      it(`disallows transition from ${from} to ${to}`, () => {
        assert.equal(canTransitionIssue(from, to), false);
      });
    }
  });
});
