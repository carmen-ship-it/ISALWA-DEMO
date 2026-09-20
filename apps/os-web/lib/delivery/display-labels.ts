import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Display-only pilot label. Does not rewrite stored audit fields.
 * Engineering fixtures / raw ids become human-safe placeholders.
 */
export function presentPilotFacingLabel(
  value: string | null | undefined,
  fallback = 'Registro interno',
): string {
  const raw = value?.trim() ?? '';
  if (!raw) return fallback;
  if (/^employee[_-]?recorded$/i.test(raw)) return 'Registrado por colaborador';
  if (UUID_RE.test(raw)) return 'Colaborador';
  if (isEngineeringFixtureCopy(raw)) return fallback;
  const human = presentHumanCopy(raw);
  if (!human || isEngineeringFixtureCopy(human)) return fallback;
  return human;
}

/** Entrega / salida / chronology audit fields. */
export function presentEntregaAuditLabel(value: string | null | undefined): string {
  return presentPilotFacingLabel(value, 'Registro interno');
}

/** Product / line description for pilot UI. */
export function presentLineDescription(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) return 'Artículo';
  if (isEngineeringFixtureCopy(raw)) return 'Artículo';
  const human = presentHumanCopy(raw);
  if (!human || isEngineeringFixtureCopy(human)) return 'Artículo';
  return human;
}

/** Hide engineering fixture customers/orders from normal pilot lists. */
export function isPilotFacingHidden(value: string | null | undefined): boolean {
  return isEngineeringFixtureCopy(value);
}
