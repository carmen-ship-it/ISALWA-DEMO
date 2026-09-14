import { elapsedAge } from '@/lib/time/elapsed';
import { formatDueDate } from '@/lib/work/labels';
import { isPastStoredInstant } from '@/lib/work/aging/clock';

export const DUE_TODAY_LABEL = 'Vence hoy';

/**
 * Elapsed fact after a stored due instant. Does not assign a work state.
 * Under one minute, the date is still shown and no age is invented.
 */
export function elapsedDueFactLabel(dueAt: string, asOf: Date): string | null {
  if (!isPastStoredInstant(dueAt, asOf)) return null;
  const stored = `Venció: ${formatDueDate(dueAt)}`;
  const elapsed = elapsedAge(dueAt, asOf)?.compact ?? null;
  return elapsed ? `${stored} · ${elapsed}` : stored;
}

/** Age of a pending request. Missing or future instants produce no line. */
export function approvalPendingAgeLabel(requestedAt: string | null, asOf: Date): string | null {
  if (!requestedAt) return null;
  const phrase = elapsedAge(requestedAt, asOf)?.phrase ?? null;
  if (!phrase) return null;
  return `Pendiente, ${phrase}`;
}

/**
 * Age of a stored submission. Does not treat the wait as a missed deadline.
 */
export function quoteSubmittedAgeLabel(submittedAt: string | null, asOf: Date): string | null {
  if (!submittedAt) return null;
  const phrase = elapsedAge(submittedAt, asOf)?.phrase ?? null;
  if (!phrase) return null;
  return `Enviada, ${phrase}. No es un plazo incumplido.`;
}
