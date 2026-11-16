import { COVERAGE_MAX_DURATION_DAYS, isGrantableCoverageAction } from '@isalwa/os-contracts';
import { dueDateInputToIso } from '@/lib/commitments/draft';
import { formatBoliviaDate } from '@/lib/experience/format';
import { NO_RECORDED_DATE } from '@/lib/party/customer-self-service';

export type CoverageActionChoice = { action: string; label: string; hint: string };

const COPY: Record<string, { label: string; hint: string }> = {
  'commercial.work': {
    label: 'Continuar oportunidades y cotizaciones',
    hint: 'Trabaja las oportunidades y cotizaciones del responsable.',
  },
  'customer.edit': {
    label: 'Editar datos del cliente',
    hint: 'Solo si quien apoya también tiene permiso para editar clientes.',
  },
  'quote.convert': {
    label: 'Convertir cotizaciones enviadas a pedido',
    hint: 'Solo si quien apoya también tiene permiso propio de conversión.',
  },
};

/** Choices shown in "Apoyo temporal": only actions the server says this viewer may grant. */
export function coverageActionChoices(grantable: readonly string[] | undefined): CoverageActionChoice[] {
  const allowed = (grantable && grantable.length > 0 ? grantable : ['commercial.work']).filter(isGrantableCoverageAction);
  return allowed.filter((action) => COPY[action]).map((action) => ({ action, ...COPY[action]! }));
}

export function formatCoverageActions(actions: readonly string[] | undefined): string {
  const known = (actions && actions.length > 0 ? actions : ['commercial.work']).filter((action) => COPY[action]);
  return known.map((action) => COPY[action]!.label).join(' · ');
}

/** Shown next to each grant. The server status is the only source. */
export function coverageGrantStatusLabel(status: 'active' | 'scheduled'): string {
  return status === 'scheduled' ? 'Programado' : 'Activo';
}

export const COVERAGE_WINDOW_HELP = `El apoyo dura como máximo ${COVERAGE_MAX_DURATION_DAYS} días. Para más tiempo, registre un nuevo apoyo al terminar este.`;

/** Form values → requested actions; unknown values are dropped, never defaulted upward. */
export function parseCoverageActions(values: readonly unknown[]): string[] {
  return [...new Set(values.map(String).filter(isGrantableCoverageAction))];
}

const DAY_MS = 86_400_000;

/**
 * "Desde" / "Hasta" day fields (America/La_Paz) → the GrantCustomerCoverage window.
 * Coverage ends at the local midnight after the last covered day; a start of today means now.
 */
export function coverageWindowFromForm(
  input: { startsOn?: unknown; endsOn?: unknown },
  now: Date,
): { ok: true; startsAt?: string; endsAt: string } | { ok: false; error: string } {
  const endsOnStart = dueDateInputToIso(String(input.endsOn ?? ''));
  if (!endsOnStart) {
    return { ok: false, error: `Indique hasta qué día dura el apoyo (máximo ${COVERAGE_MAX_DURATION_DAYS} días).` };
  }
  if (endsOnStart === 'invalid') return { ok: false, error: 'La fecha de fin no es válida.' };
  const startsOnStart = dueDateInputToIso(String(input.startsOn ?? ''));
  if (startsOnStart === 'invalid') return { ok: false, error: 'La fecha de inicio no es válida.' };
  const endsAt = new Date(new Date(endsOnStart).getTime() + DAY_MS);
  const startsAt = startsOnStart && new Date(startsOnStart) > now ? new Date(startsOnStart) : null;
  const effectiveStart = startsAt ?? now;
  if (endsAt <= effectiveStart) return { ok: false, error: 'La fecha de fin debe ser posterior al inicio.' };
  if (endsAt.getTime() - effectiveStart.getTime() > COVERAGE_MAX_DURATION_DAYS * DAY_MS) {
    return { ok: false, error: `El apoyo temporal dura como máximo ${COVERAGE_MAX_DURATION_DAYS} días. Para más tiempo, registre un nuevo apoyo al terminar este.` };
  }
  return { ok: true, ...(startsAt ? { startsAt: startsAt.toISOString() } : {}), endsAt: endsAt.toISOString() };
}

/**
 * `endsAt` is the exclusive end: midnight in La Paz after the last covered day. People read the
 * last covered day, never the next day at 00:00.
 */
export function coverageLastDayLabel(endsAt: string | null): string {
  if (!endsAt) return 'Sin fecha de fin';
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return NO_RECORDED_DATE;
  return `Hasta el ${formatBoliviaDate(new Date(end - 1)) ?? NO_RECORDED_DATE}`;
}
