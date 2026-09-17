/**
 * Freshness wording for operational surfaces.
 * Does not invent stale thresholds. Never says "desactualizado".
 */

import { BOLIVIA_TIME_ZONE } from '@/lib/experience/format';
import { elapsedAge } from '@/lib/time/elapsed';

export const FRESHNESS_COPY = {
  mayRequireConfirmation: 'Puede requerir confirmación',
  lastUpdatePrefix: 'Última actualización:',
} as const;

export type FreshnessMayRequireReason =
  | 'time_sensitive_action'
  | 'lacks_newer_confirmation'
  | 'pending_manual_update';

export type FreshnessWordingInput = {
  updatedAt: string | Date | null | undefined;
  asOf?: Date;
  /** Absolute stamp when relative age is not useful (older / unknown age). */
  preferAbsolute?: boolean;
};

const MONTH_SHORT_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function wallParts(date: Date): { day: number; month: number; hour: number; minute: number } | null {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);
  if (![day, month, hour, minute].every((n) => Number.isFinite(n))) return null;
  return { day, month, hour, minute };
}

/** "14 Sep · 10:32" in America/La_Paz. */
export function formatLastUpdateStamp(value: string | Date, asOf = new Date()): string | null {
  const date = toDate(value);
  if (!date) return null;
  const parts = wallParts(date);
  if (!parts) return null;
  const month = MONTH_SHORT_ES[parts.month - 1];
  if (!month) return null;
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  // asOf reserved for callers that want day-relative absolute later; stamp is absolute.
  void asOf;
  return `${parts.day} ${month.charAt(0).toUpperCase()}${month.slice(1)} · ${hh}:${mm}`;
}

/**
 * Relative freshness wording:
 * - "Actualizado hace 2 h"
 * - "Actualizado ayer"
 * - "Última actualización: 14 Sep · 10:32"
 */
export function formatFreshnessWording(input: FreshnessWordingInput): string | null {
  const date = toDate(input.updatedAt);
  if (!date) return null;
  const asOf = input.asOf ?? new Date();
  const iso = date.toISOString();

  if (input.preferAbsolute) {
    const stamp = formatLastUpdateStamp(date, asOf);
    return stamp ? `${FRESHNESS_COPY.lastUpdatePrefix} ${stamp}` : null;
  }

  const age = elapsedAge(iso, asOf);
  if (!age) {
    const stamp = formatLastUpdateStamp(date, asOf);
    return stamp ? `${FRESHNESS_COPY.lastUpdatePrefix} ${stamp}` : null;
  }

  if (age.compact === 'ayer') {
    return 'Actualizado ayer';
  }

  // Prefer hours / minutes relative copy when within a day.
  if (age.compact.endsWith(' h') || age.compact.endsWith(' min')) {
    return `Actualizado ${age.phrase}`;
  }

  // Older than a day: absolute stamp, no invented "stale" threshold.
  const stamp = formatLastUpdateStamp(date, asOf);
  return stamp ? `${FRESHNESS_COPY.lastUpdatePrefix} ${stamp}` : null;
}

/**
 * Show "Puede requerir confirmación" only for the three allowed reasons.
 * Never invent a stale threshold.
 */
export function mayRequireConfirmation(reason: FreshnessMayRequireReason | null | undefined): string | null {
  if (!reason) return null;
  if (
    reason === 'time_sensitive_action' ||
    reason === 'lacks_newer_confirmation' ||
    reason === 'pending_manual_update'
  ) {
    return FRESHNESS_COPY.mayRequireConfirmation;
  }
  return null;
}

export function freshnessForbidsDesactualizado(copy: string): boolean {
  return !/\bdesactualizado\b/i.test(copy);
}
