import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { formatDueDate, isWorkOverdue } from '@/lib/work/labels';

/**
 * Presentation order for already-loaded open work.
 * Overdue uses the existing open-work rule only.
 */
export function sortOpenWorkByDue(
  items: readonly WorkSummaryReadModel[],
  asOf = new Date(),
): WorkSummaryReadModel[] {
  return [...items].sort((left, right) => compareOpenWorkByDue(left, right, asOf));
}

/**
 * Within an attention group, stored dueAt orders items when it is present.
 * Does not classify overdue or change attention type.
 */
export function sortAttentionByDue(
  items: readonly AttentionItemReadModel[],
): AttentionItemReadModel[] {
  return [...items].sort(compareAttentionByDue);
}

export function formatWorkDueLine(
  work: WorkSummaryReadModel,
  options?: { caption?: 'Vence' | 'Fecha'; asOf?: Date },
): { text: string; overdue: boolean } {
  const caption = options?.caption ?? 'Vence';
  if (isWorkOverdue(work, options?.asOf)) {
    return { text: `Vencido · ${formatDueDate(work.dueAt)}`, overdue: true };
  }
  if (storedDueMillis(work.dueAt) === null) {
    return { text: 'Sin fecha', overdue: false };
  }
  return { text: `${caption}: ${formatDueDate(work.dueAt)}`, overdue: false };
}

function compareOpenWorkByDue(
  left: WorkSummaryReadModel,
  right: WorkSummaryReadModel,
  asOf: Date,
): number {
  const rank = openWorkDueRank(left, asOf) - openWorkDueRank(right, asOf);
  if (rank !== 0) return rank;

  const leftDue = storedDueMillis(left.dueAt);
  const rightDue = storedDueMillis(right.dueAt);
  if (leftDue !== null && rightDue !== null && leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  return compareStableId(left.workItemId, right.workItemId);
}

/** 0 overdue open, 1 dated open, 2 undated open, 3 not open — completed is never promoted. */
function openWorkDueRank(work: WorkSummaryReadModel, asOf: Date): 0 | 1 | 2 | 3 {
  if (work.status !== 'open') return 3;
  if (isWorkOverdue(work, asOf)) return 0;
  if (storedDueMillis(work.dueAt) === null) return 2;
  return 1;
}

function compareAttentionByDue(left: AttentionItemReadModel, right: AttentionItemReadModel): number {
  const leftDue = storedDueMillis(readStoredDueAt(left));
  const rightDue = storedDueMillis(readStoredDueAt(right));
  if (leftDue !== null && rightDue !== null && leftDue !== rightDue) return leftDue - rightDue;
  if (leftDue !== null && rightDue === null) return -1;
  if (leftDue === null && rightDue !== null) return 1;
  return compareStableId(left.attentionKey, right.attentionKey);
}

function readStoredDueAt(item: AttentionItemReadModel): string | null {
  const dueAt = item.reasonDetail.dueAt;
  return typeof dueAt === 'string' ? dueAt : null;
}

function storedDueMillis(dueAt: string | null | undefined): number | null {
  if (!dueAt) return null;
  const millis = new Date(dueAt).getTime();
  return Number.isNaN(millis) ? null : millis;
}

function compareStableId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
