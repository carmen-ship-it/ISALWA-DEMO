/**
 * Global certainty model — three user-facing states only.
 * No AI probability labels. No invented fourth state.
 */

import type { StatusPillProps } from '@isalwa/ui';

export const CERTAINTY_STATES = ['confirmed', 'pending', 'not_recorded'] as const;

export type CertaintyState = (typeof CERTAINTY_STATES)[number];

type StatusPillTone = NonNullable<StatusPillProps['tone']>;

export const CERTAINTY_LABEL: Record<CertaintyState, string> = {
  confirmed: 'CONFIRMADO',
  pending: 'PENDIENTE DE CONFIRMAR',
  not_recorded: 'NO REGISTRADO',
};

/** Compact badge labels used above recommended replies. */
export const CERTAINTY_BADGE_LABEL: Record<'confirmed' | 'pending', string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente de confirmar',
};

export const CERTAINTY_TONE: Record<CertaintyState, StatusPillTone> = {
  confirmed: 'success',
  pending: 'warning',
  not_recorded: 'neutral',
};

export const CERTAINTY_DEFINITION: Record<CertaintyState, string> = {
  confirmed: 'Existe un hecho canónico persistido.',
  pending: 'Hay un reporte o evidencia, pero todavía no es confirmación autoritativa.',
  not_recorded: 'El sistema no tiene un hecho confiable.',
};

export function isCertaintyState(value: string): value is CertaintyState {
  return (CERTAINTY_STATES as readonly string[]).includes(value);
}

export function certaintyLabel(state: CertaintyState): string {
  return CERTAINTY_LABEL[state];
}

export function certaintyTone(state: CertaintyState): StatusPillTone {
  return CERTAINTY_TONE[state];
}

export function certaintyBadgeLabel(state: 'confirmed' | 'pending'): string {
  return CERTAINTY_BADGE_LABEL[state];
}

/** Reject numeric AI probability / confidence surface wording. */
export function looksLikeProbabilityLabel(text: string): boolean {
  const trimmed = text.trim();
  if (/\b\d{1,3}\s*%/.test(trimmed)) return true;
  if (/\b(probabilidad|confidence|score|likelihood)\b/i.test(trimmed)) return true;
  if (/\b(alta|media|baja)\s+confianza\b/i.test(trimmed)) return true;
  return false;
}
