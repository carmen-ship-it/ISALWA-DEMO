import type { TodayQueue, TodayQueueItem } from '@/lib/inicio/today-queue';

export const MI_DIA_MAX_ITEMS = 7;

export const MI_DIA_EMPTY = 'Todo al día por ahora.';

export type MiDiaRow = TodayQueueItem & {
  categoryLabel: string;
};

const BUCKET_CATEGORY: Record<TodayQueueItem['bucket'], string> = {
  overdue: 'Seguimiento',
  due_today: 'Seguimiento',
  pending_approvals: 'Aprobación',
  next_actions: 'Seguimiento',
  commitments: 'Compromiso',
  issues: 'Incidencia',
};

export function flattenMiDia(queue: TodayQueue, limit = MI_DIA_MAX_ITEMS): MiDiaRow[] {
  const rows: MiDiaRow[] = [];
  for (const bucket of queue.buckets) {
    for (const item of bucket.items) {
      rows.push({
        ...item,
        categoryLabel: BUCKET_CATEGORY[item.bucket],
      });
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}

export function countParaHoy(queue: TodayQueue): number {
  let n = 0;
  for (const bucket of queue.buckets) {
    if (bucket.id === 'due_today' || bucket.id === 'overdue') {
      n += bucket.items.length;
    }
  }
  return n;
}
