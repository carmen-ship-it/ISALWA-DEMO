import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import { isDueToday } from '@/lib/work/aging/clock';
import { DUE_TODAY_LABEL } from '@/lib/work/aging/labels';
import { elapsedSinceStoredDue, formatDueDate, isWorkOverdue } from '@/lib/work/labels';

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
  const asOf = options?.asOf ?? new Date();
  if (isWorkOverdue(work, asOf)) {
    const dated = formatDueDate(work.dueAt);
    const elapsed = work.dueAt ? elapsedSinceStoredDue(work.dueAt, asOf) : null;
    return {
      text: elapsed ? `Vencido · ${dated} · ${elapsed}` : `Vencido · ${dated}`,
      overdue: true,
    };
  }
  if (storedDueMillis(work.dueAt) === null) {
    return { text: 'Sin fecha', overdue: false };
  }
  if (work.status === 'open' && caption === 'Vence' && isDueToday(work.dueAt, asOf)) {
    return { text: DUE_TODAY_LABEL, overdue: false };
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
