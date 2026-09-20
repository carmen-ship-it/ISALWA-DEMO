import type { AttentionItemReadModel } from '@isalwa/os-contracts';

const WORK_RETURN_BY_FROM = {
  compras: { href: '/compras', label: 'Volver a Compras' },
  trabajo: { href: '/trabajo', label: 'Volver a trabajo' },
} as const;

export type WorkReturnFrom = keyof typeof WORK_RETURN_BY_FROM;

/** Detail href. Optional `from` sets a deterministic Volver parent (never Inicio). */
export function workItemHref(workItemId: string, from?: WorkReturnFrom): string {
  const base = `/trabajo/${encodeURIComponent(workItemId)}`;
  if (!from || from === 'trabajo') return base;
  return `${base}?from=${encodeURIComponent(from)}`;
}

/** Explicit Volver target for work detail. Unknown/missing `from` → Trabajo list. */
export function workDetailReturn(from: string | null | undefined): {
  href: string;
  label: string;
} {
  if (from === 'compras') return WORK_RETURN_BY_FROM.compras;
  return WORK_RETURN_BY_FROM.trabajo;
}

export function approvalHref(approvalRequestId: string): string {
  return `/aprobaciones/${encodeURIComponent(approvalRequestId)}`;
}

export function attentionTargetHref(item: AttentionItemReadModel): string | null {
  if (item.resourceType === 'work_item' && item.workItemId) {
    return workItemHref(item.workItemId);
  }
  if (item.resourceType === 'approval_request' && item.approvalRequestId) {
    return approvalHref(item.approvalRequestId);
  }
  if (item.workItemId) return workItemHref(item.workItemId);
  if (item.approvalRequestId) return approvalHref(item.approvalRequestId);
  return null;
}

export function attentionInspectLabel(item: AttentionItemReadModel): string {
  if (item.resourceType === 'approval_request' || item.approvalRequestId) {
    return 'Ver aprobación';
  }
  if (item.resourceType === 'work_item' || item.workItemId) {
    return 'Ver trabajo';
  }
  return 'Ver detalle';
}
