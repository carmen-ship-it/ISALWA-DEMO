/**
 * One issue for an existing attention row, even if that row is shown in more
 * than one place. Derived only from the attention key already stored.
 * Does not create work, send a notice, or define a deadline, and does not
 * decide that open work is late from a date.
 */

const WORK_PLACES = ['work:owner:', 'work:overdue:', 'work:reassigned:'] as const;
const APPROVAL_PLACES = ['approval:approver:'] as const;

export type IssueKind = 'work' | 'approval';

export type IssueIdentity = {
  /** Stable across places. Not a stored work id and not an attention key. */
  issueId: string;
  kind: IssueKind;
  resourceId: string;
};

function resourceAfter(attentionKey: string, prefixes: readonly string[]): string | null {
  const prefix = prefixes.find((candidate) => attentionKey.startsWith(candidate));
  if (!prefix) return null;
  const resourceId = attentionKey.slice(prefix.length);
  if (resourceId.trim() === '') return null;
  return resourceId;
}

/**
 * Place (owner, overdue, reassigned, approver) is dropped so the same work or
 * approval is one issue. Unknown keys stay unmatched. A past date is not an input.
 */
export function issueIdentityFromAttentionKey(attentionKey: string): IssueIdentity | null {
  const workId = resourceAfter(attentionKey, WORK_PLACES);
  if (workId) {
    return { issueId: `work:${workId}`, kind: 'work', resourceId: workId };
  }

  const approvalId = resourceAfter(attentionKey, APPROVAL_PLACES);
  if (approvalId) {
    return { issueId: `approval:${approvalId}`, kind: 'approval', resourceId: approvalId };
  }

  return null;
}

/** True when two existing attention keys name the same issue. Does not create one. */
export function sameAttentionIssue(leftKey: string, rightKey: string): boolean {
  const left = issueIdentityFromAttentionKey(leftKey);
  const right = issueIdentityFromAttentionKey(rightKey);
  if (!left || !right) return false;
  return left.issueId === right.issueId;
}
