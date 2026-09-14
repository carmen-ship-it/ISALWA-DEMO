import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { isDueToday } from '@/lib/work/aging/clock';
import { approvalPendingAgeLabel, DUE_TODAY_LABEL } from '@/lib/work/aging/labels';

function readString(detail: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = detail[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

/**
 * "Vence hoy" when a stored due instant is still today.
 * An item already marked overdue keeps its existing elapsed line instead.
 */
export function dueTodayLabelForAttention(
  item: AttentionItemReadModel,
  asOf: Date,
): string | null {
  if (item.attentionType === 'overdue_work') return null;
  const dueAt = readString(item.reasonDetail, ['dueAt']);
  if (!dueAt || !isDueToday(dueAt, asOf)) return null;
  return DUE_TODAY_LABEL;
}

/**
 * Elapsed fact for a pending approval when a request instant is already stored.
 * Does not invent the instant and does not add a new attention type.
 */
export function approvalAgeLabelForAttention(
  item: AttentionItemReadModel,
  asOf: Date,
): string | null {
  if (item.attentionType !== 'pending_approval') return null;
  const requestedAt = readString(item.reasonDetail, ['requestedAt', 'createdAt']);
  return approvalPendingAgeLabel(requestedAt, asOf);
}
