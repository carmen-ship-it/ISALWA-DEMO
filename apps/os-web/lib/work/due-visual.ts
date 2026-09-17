/**
 * Visual due tones for Work rows — amber soon, soft red overdue, green completed.
 * No arbitrary priority score.
 */

import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { dueTimingBand, dueTimingEmphasis } from '@/lib/anticipation/due-timing';
import { isWorkOverdue } from '@/lib/work/labels';

export type WorkDueVisualTone = 'overdue' | 'soon' | 'done' | 'neutral';

export function workDueVisualTone(
  work: Pick<WorkSummaryReadModel, 'status' | 'dueAt'>,
  asOf = new Date(),
): WorkDueVisualTone {
  if (work.status === 'completed' || work.status === 'cancelled') return 'done';
  if (work.status === 'open' && isWorkOverdue(work as WorkSummaryReadModel, asOf)) {
    return 'overdue';
  }
  const band = dueTimingBand(work.dueAt, asOf.getTime());
  const emphasis = dueTimingEmphasis(band);
  if (emphasis === 'amber' || emphasis === 'urgent') {
    // urgent open-but-not-overdue (due now / imminent) still reads amber-soon, not invent severity
    if (band === 'past_due') return 'overdue';
    return 'soon';
  }
  return 'neutral';
}

/** Left-rail / accent color tokens for list density. */
export function workDueRailClass(tone: WorkDueVisualTone): string | undefined {
  switch (tone) {
    case 'overdue':
      return 'border-l-4 border-l-[color-mix(in_srgb,var(--isalwa-danger)_55%,transparent)]';
    case 'soon':
      return 'border-l-4 border-l-[var(--isalwa-warning)]';
    case 'done':
      return 'border-l-4 border-l-[color-mix(in_srgb,var(--isalwa-success)_70%,transparent)]';
    default:
      return undefined;
  }
}
