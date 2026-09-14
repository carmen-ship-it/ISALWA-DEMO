/**
 * One issue for an existing attention row or derived fact key, even if that
 * row is shown in more than one place. Derived only from the key already stored.
 * Does not create work, send a notice, or define a deadline, and does not
 * decide that open work is late from a date.
 */

const WORK_PLACES = [
  'work:owner:',
  'work:overdue:',
  'work:reassigned:',
  'work:due-today:',
  'work:elapsed:',
] as const;
const APPROVAL_PLACES = ['approval:approver:'] as const;
const QUOTE_PLACES = ['quote:submitted:'] as const;
const COMMITMENT_PLACES = ['commitment:due-today:', 'commitment:elapsed:'] as const;

export type IssueKind = 'work' | 'approval' | 'quote' | 'commitment';

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
 * Place is dropped so the same work, approval, quote, or commitment is one issue.
 * Unknown keys stay unmatched. A past date is not an input and does not create a type.
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

  const quoteId = resourceAfter(attentionKey, QUOTE_PLACES);
  if (quoteId) {
    return { issueId: `quote:${quoteId}`, kind: 'quote', resourceId: quoteId };
  }

  const commitmentId = resourceAfter(attentionKey, COMMITMENT_PLACES);
  if (commitmentId) {
    return { issueId: `commitment:${commitmentId}`, kind: 'commitment', resourceId: commitmentId };
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
