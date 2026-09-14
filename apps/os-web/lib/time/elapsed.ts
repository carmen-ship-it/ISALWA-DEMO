const ZONE = 'America/La_Paz';

function calendarDay(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export type ElapsedAge = {
  /** Compact fact for an already-overdue row. Not a policy breach. */
  compact: string;
  /** Spoken age. Not an SLA. */
  phrase: string;
};

/**
 * Age of a stored instant. Does not classify overdue and does not invent a deadline.
 */
export function elapsedAge(iso: string, asOf = new Date()): ElapsedAge | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const elapsedMs = asOf.getTime() - at.getTime();
  if (elapsedMs < 60_000) return null;

  const atDay = calendarDay(at);
  const asOfDay = calendarDay(asOf);
  const yesterday = new Date(asOf.getTime() - 86_400_000);
  if (atDay && asOfDay && atDay === calendarDay(yesterday)) {
    return { compact: 'ayer', phrase: 'desde ayer' };
  }

  const hours = Math.floor(elapsedMs / 3_600_000);
  if (hours < 1) {
    const minutes = Math.floor(elapsedMs / 60_000);
    return { compact: `${minutes} min`, phrase: `hace ${minutes} min` };
  }
  if (hours < 24) {
    return { compact: `${hours} h`, phrase: `hace ${hours} h` };
  }
  const days = Math.floor(hours / 24);
  return { compact: `${days} d`, phrase: `hace ${days} días` };
}
