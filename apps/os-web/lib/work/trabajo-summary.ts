/**
 * Mi trabajo summary buckets from already-loaded open work.
 * Uses stored dueAt only — no invented priority.
 */

import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { isDueToday } from '@/lib/work/aging/clock';
import { isWorkOverdue } from '@/lib/work/labels';

export type TrabajoSummaryBuckets = {
  paraHoy: number;
  vencido: number;
  proximo: number;
  sinFecha: number;
};

export function summarizeTrabajoOpen(
  items: readonly WorkSummaryReadModel[],
  asOf = new Date(),
): TrabajoSummaryBuckets {
  let paraHoy = 0;
  let vencido = 0;
  let proximo = 0;
  let sinFecha = 0;

  for (const work of items) {
    if (work.status !== 'open') continue;
    if (isWorkOverdue(work, asOf)) {
      vencido += 1;
      continue;
    }
    if (!work.dueAt?.trim()) {
      sinFecha += 1;
      continue;
    }
    if (isDueToday(work.dueAt, asOf)) {
      paraHoy += 1;
      continue;
    }
    proximo += 1;
  }

  return { paraHoy, vencido, proximo, sinFecha };
}
