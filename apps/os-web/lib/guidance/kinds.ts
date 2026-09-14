/**
 * Consejo = checklist. Regla = consequence. Sugerencia is neither.
 * Tones are existing StatusPill tones. Do not add a tone from this lane.
 */

export const GUIDANCE_KINDS = ['consejo', 'regla', 'sugerencia'] as const;

export type GuidanceKind = (typeof GUIDANCE_KINDS)[number];

export type GuidanceRole = 'checklist' | 'consequence' | 'suggestion';

export const GUIDANCE_KIND_LABEL: Record<GuidanceKind, string> = {
  consejo: 'Consejo',
  regla: 'Regla',
  sugerencia: 'Sugerencia',
};

/** Existing StatusPill tones. Sugerencia reuses `warning`; a dedicated tone is a cross-lane request. */
export const GUIDANCE_KIND_TONE = {
  consejo: 'neutral',
  regla: 'info',
  sugerencia: 'warning',
} as const;

export type GuidanceTone = (typeof GUIDANCE_KIND_TONE)[GuidanceKind];

export const EXISTING_STATUS_PILL_TONES = [
  'neutral',
  'success',
  'warning',
  'danger',
  'info',
  'manual',
  'demo',
] as const;

export function guidanceRole(kind: GuidanceKind): GuidanceRole {
  if (kind === 'consejo') return 'checklist';
  if (kind === 'regla') return 'consequence';
  return 'suggestion';
}

export function isGuidanceKind(value: string): value is GuidanceKind {
  return (GUIDANCE_KINDS as readonly string[]).includes(value);
}
