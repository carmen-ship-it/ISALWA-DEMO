/**
 * Issue read policy — determines who can read issue data.
 *
 * An issue can be read by:
 * - The issue owner
 * - The reporter
 * - Anyone with issue.manage scope
 * - Members associated with referenced entities (future extension)
 */

import { ISSUE_MANAGE_SCOPE } from '@isalwa/os-contracts';
import type { IssueRecord } from './store-types';

export type IssueReadActor = {
  memberId: string;
  organizationId: string;
  grantedScopes: readonly string[];
};

/**
 * Determine if the actor can read the issue.
 *
 * @param actor - The member attempting to read
 * @param issue - The issue to be read
 * @param hasManageScope - Override to explicitly check manage scope (optional)
 * @returns true if the actor can read the issue
 */
export function canReadIssue(
  actor: IssueReadActor,
  issue: IssueRecord,
  hasManageScope?: boolean,
): boolean {
  // Tenant check
  if (actor.organizationId !== issue.organizationId) {
    return false;
  }

  // Reporter can always read their own reported issues
  if (issue.reportedByMemberId === actor.memberId) {
    return true;
  }

  // Owner can read the issue
  if (issue.ownerMemberId === actor.memberId) {
    return true;
  }

  // Check for issue.manage scope
  const manageGranted =
    hasManageScope ?? actor.grantedScopes.includes(ISSUE_MANAGE_SCOPE);
  if (manageGranted) {
    return true;
  }

  return false;
}

/**
 * Filter a list of issues to only those the actor can read.
 */
export function filterReadableIssues(
  actor: IssueReadActor,
  issues: readonly IssueRecord[],
): IssueRecord[] {
  return issues.filter((issue) => canReadIssue(actor, issue));
}
