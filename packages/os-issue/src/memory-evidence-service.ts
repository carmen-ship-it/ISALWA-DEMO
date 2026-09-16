/**
 * Memory evidence service — authorized retrieval of issue/commitment/approval evidence.
 *
 * This service provides filtered access to evidence data. Results are filtered
 * BEFORE return, never after. Callers receive only what they are authorized to see.
 *
 * No AI. Human-reviewed data only.
 */

import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import type { IssueRecord, IssueJournalEntryRecord } from './store-types';
import { canReadIssue, type IssueReadActor } from './issue-read-policy';

export type EvidenceActor = {
  memberId: string;
  organizationId: string;
  grantedScopes: readonly string[];
};

export type IssueEvidence = {
  issue: IssueRecord;
  journalEntries: readonly IssueJournalEntryRecord[];
};

export type CommitmentEvidence = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  text: string;
  lifecycle: string;
};

export type ApprovalEvidence = {
  id: string;
  organizationId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  status: string;
};

/**
 * Memory evidence retrieval service.
 *
 * Filters all results BEFORE returning. The caller only sees authorized data.
 */
export class MemoryEvidenceService {
  /**
   * Retrieve issue evidence for a member.
   * Filters issues before returning based on read policy.
   */
  retrieveIssueEvidence(
    actor: EvidenceActor,
    issues: readonly IssueRecord[],
    journalEntriesByIssue: ReadonlyMap<string, readonly IssueJournalEntryRecord[]>,
  ): IssueEvidence[] {
    const readActor: IssueReadActor = {
      memberId: actor.memberId,
      organizationId: actor.organizationId,
      grantedScopes: actor.grantedScopes,
    };

    const result: IssueEvidence[] = [];

    for (const issue of issues) {
      // Filter BEFORE adding to result
      if (!canReadIssue(readActor, issue)) {
        continue;
      }

      const entries = journalEntriesByIssue.get(issue.id) ?? [];
      result.push({
        issue,
        journalEntries: entries,
      });
    }

    return result;
  }

  /**
   * Retrieve commitment evidence for a member.
   * Only returns commitments where the actor is the owner or has manage scope.
   */
  retrieveCommitmentEvidence(
    actor: EvidenceActor,
    commitments: readonly CommitmentEvidence[],
  ): CommitmentEvidence[] {
    return commitments.filter((c) => {
      // Tenant check
      if (c.organizationId !== actor.organizationId) {
        return false;
      }
      // Owner can see their commitments
      if (c.ownerMemberId === actor.memberId) {
        return true;
      }
      // issue.manage scope holders can see all
      if (actor.grantedScopes.includes(ISSUE_MANAGE_SCOPE)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Retrieve approval evidence for a member.
   * Returns approvals where actor is the requester, approver, or has manage scope.
   */
  retrieveApprovalEvidence(
    actor: EvidenceActor,
    approvals: readonly ApprovalEvidence[],
  ): ApprovalEvidence[] {
    return approvals.filter((a) => {
      // Tenant check
      if (a.organizationId !== actor.organizationId) {
        return false;
      }
      // Requester can see their requests
      if (a.requestedByMemberId === actor.memberId) {
        return true;
      }
      // Approver can see their assigned approvals
      if (a.approverMemberId === actor.memberId) {
        return true;
      }
      // issue.manage scope holders can see all
      if (actor.grantedScopes.includes(ISSUE_MANAGE_SCOPE)) {
        return true;
      }
      return false;
    });
  }
}
