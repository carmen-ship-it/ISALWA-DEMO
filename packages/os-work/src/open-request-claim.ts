const ORDER_PREP_MARKER = /\[\[order-prep:(production|warehouse|purchasing):([^\]]+)\]\]/;

/**
 * One open approval per subject. A quote approval is bound to one revision, so its claim
 * is per revision: a material change makes the earlier open request stale and the new
 * revision may open its own request instead of replaying the stale one.
 */
export function approvalOpenClaimKey(
  subjectType: string,
  subjectId: string,
  revision?: number | null,
): string | null {
  const type = subjectType.trim();
  const id = subjectId.trim();
  if (!type || !id) return null;
  const base = `approval-open:${type}:${id}`;
  return typeof revision === 'number' && Number.isInteger(revision) ? `${base}:r${revision}` : base;
}

export function orderPrepOpenClaimKey(text: string | null | undefined): string | null {
  const match = (text ?? '').match(ORDER_PREP_MARKER);
  const orderId = match?.[2]?.trim();
  if (!match || !orderId) return null;
  return `order-prep-open:${match[1]}:${orderId}`;
}

/** Stable claim for one open approval or one open department review. Not a forever lock. */
export function openRequestClaimKey(
  command: string,
  payload: Record<string, unknown>,
  quoteRevision?: number | null,
): string | null {
  if (command === 'RequestApproval') {
    const subjectType = String(payload.subjectType ?? '');
    return approvalOpenClaimKey(
      subjectType,
      String(payload.subjectId ?? ''),
      subjectType === 'quote' ? quoteRevision : null,
    );
  }
  if (command === 'CreateWorkItem') {
    return orderPrepOpenClaimKey(`${payload.title ?? ''}\n${payload.description ?? ''}`);
  }
  return null;
}

import { sealedResult } from '@isalwa/os-events';

export { isIdempotencyConflict } from '@isalwa/os-events';

/** A completed result, sealed (S11 binding) or written before the binding existed. */
export function isStoredCommandResult(value: Record<string, unknown> | null | undefined): boolean {
  const result = sealedResult(value) ?? value;
  return Boolean(result && typeof result.commandId === 'string' && result.data && typeof result.data === 'object');
}
