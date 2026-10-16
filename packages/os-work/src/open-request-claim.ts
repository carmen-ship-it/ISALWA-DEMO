const ORDER_PREP_MARKER = /\[\[order-prep:(production|warehouse|purchasing):([^\]]+)\]\]/;

export function approvalOpenClaimKey(subjectType: string, subjectId: string): string | null {
  const type = subjectType.trim();
  const id = subjectId.trim();
  if (!type || !id) return null;
  return `approval-open:${type}:${id}`;
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
): string | null {
  if (command === 'RequestApproval') {
    return approvalOpenClaimKey(String(payload.subjectType ?? ''), String(payload.subjectId ?? ''));
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
