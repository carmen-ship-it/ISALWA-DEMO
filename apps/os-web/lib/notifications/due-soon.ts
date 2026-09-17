import { isWorkOverdue } from '@/lib/work/labels';

/** Product reminder default — not a business SLA. */
export const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DUE_SOON_URGENT_WINDOW_MS = 2 * 60 * 60 * 1000;

export type DueSoonVisual = 'none' | 'due_soon' | 'due_soon_urgent' | 'due_now' | 'past_due';

export function dueSoonVisual(dueAt: string | null | undefined, asOf = new Date()): DueSoonVisual {
  const trimmed = dueAt?.trim() ?? '';
  if (!trimmed) return 'none';
  const dueMs = Date.parse(trimmed);
  if (Number.isNaN(dueMs)) return 'none';
  const now = asOf.getTime();
  if (dueMs < now) return 'past_due';
  if (dueMs === now) return 'due_now';
  const until = dueMs - now;
  if (until <= DUE_SOON_URGENT_WINDOW_MS) return 'due_soon_urgent';
  if (until <= DUE_SOON_WINDOW_MS) return 'due_soon';
  return 'none';
}

export function dueSoonLabel(visual: DueSoonVisual): string | null {
  switch (visual) {
    case 'due_soon':
    case 'due_soon_urgent':
      return 'Vence pronto';
    case 'due_now':
      return 'Vence ahora';
    case 'past_due':
      return 'Vencido';
    default:
      return null;
  }
}

export function workDueSoonVisual(
  work: { status: string; dueAt: string | null },
  asOf = new Date(),
): DueSoonVisual {
  if (work.status !== 'open') return 'none';
  if (isWorkOverdue(work, asOf)) return 'past_due';
  return dueSoonVisual(work.dueAt, asOf);
}
