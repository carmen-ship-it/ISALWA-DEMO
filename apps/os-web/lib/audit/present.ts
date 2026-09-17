import {
  humanizeAuditAction,
  humanizeBusinessEventType,
  humanizeResourceType,
} from '@/lib/audit/humanize';
import type { AuditLogItem } from '@/lib/audit/types';

/** Prefer web humanize so conversation-origin labels stay Spanish even if API labels lag. */
export function presentAuditActionLabel(item: Pick<AuditLogItem, 'action' | 'actionLabel' | 'resourceType'>): string {
  const fromKey = humanizeAuditAction(item.action, item.resourceType);
  if (fromKey && fromKey !== titleCaseGuess(item.action)) return fromKey;
  return item.actionLabel?.trim() || fromKey;
}

export function presentAuditResourceLabel(
  item: Pick<AuditLogItem, 'resourceType' | 'resourceLabel'>,
): string {
  const fromKey = humanizeResourceType(item.resourceType);
  if (fromKey && fromKey !== titleCaseGuess(item.resourceType)) return fromKey;
  return item.resourceLabel?.trim() || fromKey;
}

export function presentBusinessEventLabel(eventType: string): string {
  return humanizeBusinessEventType(eventType);
}

function titleCaseGuess(key: string): string {
  return key
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
