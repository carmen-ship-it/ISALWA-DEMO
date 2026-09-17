/**
 * Human-facing data freshness labels — never invents staleness thresholds.
 * Prefer absolute clock when relative wording would be ambiguous.
 */

export type FreshnessDisplay = {
  /** Compact relative or absolute phrase, e.g. "Actualizado hace 2 h" */
  label: string;
  /** Longer absolute when available */
  absoluteLabel: string | null;
  /** Optional confirmation hint — only when caller asserts pending confirmation */
  mayNeedConfirmation: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const MONTHS_SHORT = [
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

/** Absolute: "14 Sep · 10:32" (local clock). */
export function formatAbsoluteUpdate(at: Date, asOf: Date = new Date()): string {
  const day = at.getDate();
  const month = MONTHS_SHORT[at.getMonth()] ?? '—';
  const hh = pad2(at.getHours());
  const mm = pad2(at.getMinutes());
  const sameYear = at.getFullYear() === asOf.getFullYear();
  const yearBit = sameYear ? '' : ` ${at.getFullYear()}`;
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}${yearBit} · ${hh}:${mm}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Relative freshness from a known last-update instant.
 * Does not say "desactualizado" and does not invent policy thresholds.
 */
export function formatFreshnessDisplay(
  lastUpdatedIso: string | null | undefined,
  options: {
    asOf?: Date;
    /** Caller-asserted: time-sensitive action or pending confirmation */
    mayNeedConfirmation?: boolean;
  } = {},
): FreshnessDisplay | null {
  if (!lastUpdatedIso) return null;
  const at = new Date(lastUpdatedIso);
  if (Number.isNaN(at.getTime())) return null;
  const asOf = options.asOf ?? new Date();
  const absoluteLabel = `Última actualización: ${formatAbsoluteUpdate(at, asOf)}`;
  const mayNeedConfirmation = options.mayNeedConfirmation === true;

  const diffMs = asOf.getTime() - at.getTime();
  if (diffMs < 0) {
    return { label: absoluteLabel, absoluteLabel, mayNeedConfirmation };
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return { label: 'Actualizado ahora', absoluteLabel, mayNeedConfirmation };
  }
  if (minutes < 60) {
    return {
      label: `Actualizado hace ${minutes} min`,
      absoluteLabel,
      mayNeedConfirmation,
    };
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return {
      label: `Actualizado hace ${hours} h`,
      absoluteLabel,
      mayNeedConfirmation,
    };
  }

  const dayAt = startOfLocalDay(at).getTime();
  const dayAsOf = startOfLocalDay(asOf).getTime();
  const dayDiff = Math.round((dayAsOf - dayAt) / 86_400_000);
  if (dayDiff === 1) {
    return { label: 'Actualizado ayer', absoluteLabel, mayNeedConfirmation };
  }

  return { label: absoluteLabel, absoluteLabel, mayNeedConfirmation };
}

export const MAY_NEED_CONFIRMATION_COPY = 'Puede requerir confirmación';
