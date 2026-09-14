const ZONE = 'America/La_Paz';

/**
 * Calendar day in Bolivia. Matches the zone used for elapsed facts.
 * Does not invent a reminder window or a new work state.
 */
export function calendarDayInLaPaz(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseStoredInstant(iso: string | null | undefined): Date | null {
  if (!iso || iso.trim() === '') return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Stored due instant is still on today's Bolivia calendar day and has not passed.
 * Equality is included. A past instant is not "today" even if the calendar day matches.
 */
export function isDueToday(dueAt: string | null | undefined, asOf: Date): boolean {
  const due = parseStoredInstant(dueAt);
  if (!due) return false;
  if (due.getTime() < asOf.getTime()) return false;
  const dueDay = calendarDayInLaPaz(due);
  const asOfDay = calendarDayInLaPaz(asOf);
  return Boolean(dueDay && asOfDay && dueDay === asOfDay);
}

/**
 * Stored instant is strictly before the clock. Equality is not past.
 * This is a label predicate, not an attention type.
 */
export function isPastStoredInstant(dueAt: string | null | undefined, asOf: Date): boolean {
  const due = parseStoredInstant(dueAt);
  if (!due) return false;
  return due.getTime() < asOf.getTime();
}
