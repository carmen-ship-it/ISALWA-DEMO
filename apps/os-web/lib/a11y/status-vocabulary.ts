/**
 * Shared StatusPill vocabulary for cross-cutting surface states.
 * Maps product semantics onto existing @isalwa/ui StatusPill tones.
 * Do not invent a new StatusPill tone here — reuse the frozen set.
 */

export const STATUS_PILL_TONES = [
  'neutral',
  'success',
  'warning',
  'danger',
  'info',
  'manual',
  'demo',
] as const;

export type StatusPillTone = (typeof STATUS_PILL_TONES)[number];

/** Semantic alert / status variants used by shared empty-error-loading-toast chrome. */
export const STATUS_SEMANTICS = [
  'info',
  'warn',
  'blocked',
  'manual',
  'pending',
  'success',
  'neutral',
  'demo',
] as const;

export type StatusSemantic = (typeof STATUS_SEMANTICS)[number];

export type StatusVocabularyEntry = {
  semantic: StatusSemantic;
  tone: StatusPillTone;
  /** Short Spanish label for pills — no engineering jargon. */
  label: string;
};

/**
 * Canonical Spanish labels + StatusPill tones.
 * Other lanes should prefer these helpers over inventing parallel vocabularies.
 */
export const STATUS_VOCABULARY: Record<StatusSemantic, StatusVocabularyEntry> = {
  info: { semantic: 'info', tone: 'info', label: 'Información' },
  warn: { semantic: 'warn', tone: 'warning', label: 'Atención' },
  blocked: { semantic: 'blocked', tone: 'danger', label: 'Bloqueado' },
  manual: { semantic: 'manual', tone: 'manual', label: 'Dato manual' },
  pending: { semantic: 'pending', tone: 'warning', label: 'Pendiente' },
  success: { semantic: 'success', tone: 'success', label: 'Listo' },
  neutral: { semantic: 'neutral', tone: 'neutral', label: 'Sin cambios' },
  demo: { semantic: 'demo', tone: 'demo', label: 'Vista demo' },
};

export function isStatusPillTone(value: string): value is StatusPillTone {
  return (STATUS_PILL_TONES as readonly string[]).includes(value);
}

export function isStatusSemantic(value: string): value is StatusSemantic {
  return (STATUS_SEMANTICS as readonly string[]).includes(value);
}

export function statusToneForSemantic(semantic: StatusSemantic): StatusPillTone {
  return STATUS_VOCABULARY[semantic].tone;
}

export function statusLabelForSemantic(semantic: StatusSemantic): string {
  return STATUS_VOCABULARY[semantic].label;
}

export function statusVocabulary(semantic: StatusSemantic): StatusVocabularyEntry {
  return STATUS_VOCABULARY[semantic];
}
