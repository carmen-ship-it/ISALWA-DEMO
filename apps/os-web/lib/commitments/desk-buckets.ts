/**
 * Compromisos desk buckets — due soon / team / completed from recorded facts.
 */

import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { isDueToday } from '@/lib/work/aging/clock';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 7;

export type CompromisosDeskBuckets = {
  dueSoon: CommitmentSummary[];
  team: CommitmentSummary[];
  completed: CommitmentSummary[];
  openAll: CommitmentSummary[];
};

function isOpen(item: CommitmentSummary): boolean {
  return item.lifecycle === 'open';
}

function isFulfilled(item: CommitmentSummary): boolean {
  return item.lifecycle === 'fulfilled';
}

/** Open commitment due within the next N days, overdue, or due today. */
export function isCommitmentDueSoon(item: CommitmentSummary, asOf = new Date()): boolean {
  if (!isOpen(item)) return false;
  if (item.state === 'overdue' || item.state === 'due_today') return true;
  const dueRaw = item.dueAt?.trim();
  if (!dueRaw) return false;
  if (isDueToday(dueRaw, asOf)) return true;
  const due = new Date(dueRaw);
  if (Number.isNaN(due.getTime())) return false;
  const delta = due.getTime() - asOf.getTime();
  return delta <= DUE_SOON_DAYS * MS_PER_DAY;
}

/** Team / internal commitment — no customer party linked. */
export function isTeamCommitment(item: CommitmentSummary): boolean {
  return isOpen(item) && !item.partyId?.trim();
}

export function bucketCompromisosDesk(
  items: readonly CommitmentSummary[],
  asOf = new Date(),
): CompromisosDeskBuckets {
  const openAll = items.filter(isOpen);
  const completed = items.filter(isFulfilled);
  const dueSoon = openAll.filter((item) => isCommitmentDueSoon(item, asOf));
  const team = openAll.filter(isTeamCommitment);
  return { dueSoon, team, completed, openAll };
}
