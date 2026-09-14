import { formatCentavos } from '../commercial/money';

/** Bolivia civil timezone. Display only. */
export const BOLIVIA_TIME_ZONE = 'America/La_Paz';

export const BOB_CURRENCY = 'BOB';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Display an already-known centavo integer string.
 * Non-BOB amounts keep their currency code. There is no exchange rate and no conversion.
 */
export function formatMoneyDisplay(centavos: string, currency = BOB_CURRENCY): string {
  const code = currency.trim().toUpperCase() || BOB_CURRENCY;
  return formatCentavos(centavos, code);
}

/** Boliviano display of caller-supplied centavos. Does not look up a balance. */
export function formatBobDisplay(centavos: string): string {
  return formatMoneyDisplay(centavos, BOB_CURRENCY);
}

function isCivilDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function formatCivil(year: number, month: number, day: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function civilPartsInLaPaz(date: Date): { year: number; month: number; day: number } | null {
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  if (!isCivilDate(year, month, day)) return null;
  return { year, month, day };
}

/**
 * Format a calendar date in America/La_Paz.
 * A `YYYY-MM-DD` string is a civil date and is not parsed as UTC midnight, so it cannot slip to the previous day.
 * An instant is formatted in America/La_Paz, not in UTC and not in the machine zone.
 * Invalid input returns null. This does not invent "today".
 */
export function formatBoliviaDate(value: string | Date): string | null {
  if (typeof value === 'string') {
    const match = DATE_ONLY.exec(value.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (!isCivilDate(year, month, day)) return null;
      return formatCivil(year, month, day);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  const parts = civilPartsInLaPaz(date);
  if (!parts) return null;
  return formatCivil(parts.year, parts.month, parts.day);
}

/** Empty stays empty. Does not invent a quantity of 0. */
export function quantityDisplayValue(value: number | null | undefined): string {
  if (value == null || !Number.isInteger(value) || value < 0) return '';
  return String(value);
}

/** Parse a quantity draft. Blank and non-integers return null, not 0. */
export function parseQuantityDraft(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(value) ? value : null;
}
