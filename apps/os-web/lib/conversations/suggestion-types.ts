/**
 * Conversation suggestion types — suggestions only, never auto-execute.
 */

export const SUGGESTION_TYPES = [
  'possible_opportunity',
  'possible_acceptance',
  'possible_issue',
  'possible_follow_up',
  'possible_commitment',
  'product_question',
  'delivery_question',
  'general_customer_question',
] as const;

export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export const SUGGESTION_TYPE_LABEL: Record<SuggestionType, string> = {
  possible_opportunity: 'POSIBLE OPORTUNIDAD',
  possible_acceptance: 'POSIBLE ACEPTACIÓN',
  possible_issue: 'POSIBLE INCIDENCIA',
  possible_follow_up: 'SEGUIMIENTO SUGERIDO',
  possible_commitment: 'POSIBLE COMPROMISO DEL CLIENTE',
  product_question: 'PREGUNTA DE PRODUCTO',
  delivery_question: 'PREGUNTA DE ENTREGA',
  general_customer_question: 'PREGUNTA DEL CLIENTE',
};

export const SUGGESTION_SIGNAL_COPY = {
  clear: 'ISALWA encontró una señal clara',
  possible: 'ISALWA encontró una posible señal',
} as const;

export type SuggestionSignal = keyof typeof SUGGESTION_SIGNAL_COPY;

export const SUGGESTION_CARD_COPY = {
  kicker: 'SUGERENCIA',
  review: 'Revisar',
  ignore: 'Ignorar',
  demoBadge: 'Demo',
  demoNote: 'Sugerencia de demostración. No es inferencia en vivo.',
} as const;

export type ConversationSuggestion = {
  id: string;
  type: SuggestionType;
  explanation: string;
  snippet: string;
  signal: SuggestionSignal;
  /** Related record label when explicitly identified — never invented. */
  relatedLabel: string | null;
  /** Extracted facts that are explicitly supported by the message. */
  detected: readonly string[];
  /** Unknowns the human must still confirm. */
  unknown: readonly string[];
  /** Primary review action label (type-specific). */
  primaryActionLabel: string;
  /** Mark deterministic demo fixtures — do not pretend live inference. */
  isDemo: boolean;
};

export function suggestionTypeLabel(type: SuggestionType): string {
  return SUGGESTION_TYPE_LABEL[type];
}

export function suggestionSignalCopy(signal: SuggestionSignal): string {
  return SUGGESTION_SIGNAL_COPY[signal];
}

export function isSuggestionType(value: string): value is SuggestionType {
  return (SUGGESTION_TYPES as readonly string[]).includes(value);
}
