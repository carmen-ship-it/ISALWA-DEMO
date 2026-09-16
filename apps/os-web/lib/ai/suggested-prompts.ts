/**
 * Surface-specific suggested prompts for the AI assist panel.
 * Phrasing only — never changes subject, feature selectors, or evidence retrieval.
 */

export const AI_ASSIST_SURFACES = ['issue', 'cliente360', 'commitment'] as const;

export type AiAssistSurface = (typeof AI_ASSIST_SURFACES)[number];

export const AI_SUGGESTED_PROMPTS = {
  issue: [
    'Resumir esta incidencia',
    '¿Qué se intentó?',
    'Mostrar antecedentes relacionados',
    'Sugerir próximos pasos',
  ],
  cliente360: [
    'Resumir este cliente',
    '¿Qué está pendiente?',
    '¿Qué compromisos existen?',
    '¿Qué cambió recientemente?',
  ],
  commitment: [
    'Resumir compromisos',
    '¿Qué está vencido?',
    '¿Quién debe dar seguimiento?',
  ],
} as const satisfies Record<AiAssistSurface, readonly string[]>;

export const AI_FREE_TEXT_MAX_CHARS = 500;

export function suggestedPromptsForSurface(surface: AiAssistSurface): readonly string[] {
  return AI_SUGGESTED_PROMPTS[surface];
}

export function isAiAssistSurface(value: string): value is AiAssistSurface {
  return (AI_ASSIST_SURFACES as readonly string[]).includes(value);
}

export function normalizeAiFreeTextQuestion(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, AI_FREE_TEXT_MAX_CHARS);
}
