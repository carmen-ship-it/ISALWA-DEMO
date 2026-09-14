export const LA_PAZ_TIME_ZONE = 'America/La_Paz';

const MORNING = 'Buenos días';
const AFTERNOON = 'Buenas tardes';
const NIGHT = 'Buenas noches';

/**
 * Local daypart in America/La_Paz. No external service.
 * 05:00–11:59 mañana, 12:00–18:59 tarde, otherwise noche.
 */
export function daypartGreeting(at: Date): string {
  const hour = hourInLaPaz(at);
  if (hour >= 5 && hour < 12) return MORNING;
  if (hour >= 12 && hour < 19) return AFTERNOON;
  return NIGHT;
}

/**
 * Human given name only. Email, blank, and mail-like values are not a name.
 */
export function usableGivenName(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.includes('@')) return null;
  return trimmed;
}

export function greetingLine(givenName: string | null | undefined, at = new Date()): string {
  const salutation = daypartGreeting(at);
  const name = usableGivenName(givenName);
  return name ? `${salutation}, ${name}` : salutation;
}

function hourInLaPaz(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LA_PAZ_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const raw = parts.find((part) => part.type === 'hour')?.value ?? '0';
  const hour = Number(raw);
  if (!Number.isFinite(hour)) return 0;
  return hour === 24 ? 0 : hour;
}
