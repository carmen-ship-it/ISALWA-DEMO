import type { AttentionItemReadModel } from '@isalwa/os-contracts';

export function workItemHref(workItemId: string): string {
  return `/trabajo/${encodeURIComponent(workItemId)}`;
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
