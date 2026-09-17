/** Product reminder defaults — not an ISALWA business SLA. */
export const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DUE_IMMINENT_WINDOW_MS = 2 * 60 * 60 * 1000;

export const DUE_TIMING_COPY = {
  pastDue: 'Vencido',
  dueNow: 'Vence ahora',
  dueImminent: 'Vence en breve',
  dueSoon: 'Vence pronto',
} as const;

export type DueTimingBand = 'past_due' | 'due_now' | 'due_imminent' | 'due_soon' | 'scheduled';

export function dueTimingBand(dueAt: string | null | undefined, nowMs: number): DueTimingBand | null {
  const trimmed = dueAt?.trim() ?? '';
  if (!trimmed) return null;
  const dueMs = Date.parse(trimmed);
  if (Number.isNaN(dueMs)) return null;
  const delta = dueMs - nowMs;
  if (delta < 0) return 'past_due';
  if (delta <= 60_000) return 'due_now';
  if (delta <= DUE_IMMINENT_WINDOW_MS) return 'due_imminent';
  if (delta <= DUE_SOON_WINDOW_MS) return 'due_soon';
  return 'scheduled';
}

export function dueTimingLabel(band: DueTimingBand | null): string | null {
  if (!band || band === 'scheduled') return null;
  switch (band) {
    case 'past_due':
      return DUE_TIMING_COPY.pastDue;
    case 'due_now':
      return DUE_TIMING_COPY.dueNow;
    case 'due_imminent':
      return DUE_TIMING_COPY.dueImminent;
    case 'due_soon':
      return DUE_TIMING_COPY.dueSoon;
    default:
      return null;
  }
}

export function dueTimingEmphasis(band: DueTimingBand | null): 'none' | 'amber' | 'urgent' {
  if (band === 'past_due' || band === 'due_now') return 'urgent';
  if (band === 'due_imminent') return 'urgent';
  if (band === 'due_soon') return 'amber';
  return 'none';
}

export function isDueSoonBand(band: DueTimingBand | null): boolean {
  return band === 'due_soon' || band === 'due_imminent' || band === 'due_now';
}
