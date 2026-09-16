/**
 * Pilot AI gate. Does not call a provider and does not read an API key.
 * Missing OPENAI_ISALWA_API_KEY is an expected ops blocker, not a default-on.
 */

export const AI_USER_DAILY_LIMIT = 20;
export const AI_ORG_MONTHLY_LIMIT = 300;
export const AI_MAX_OUTPUT_TOKENS = 800;
export const AI_MAX_PROVIDER_RETRIES = 1;

/** AI may draft or explain. It may not execute business actions. */
export const AI_ALLOWED_INTENTS = ['summarize_customer', 'ask', 'draft_follow_up'] as const;

export const AI_DENIED_INTENTS = ['approve', 'convert', 'reassign', 'send'] as const;

export const AI_UNAVAILABLE_COPY = 'La ayuda con IA no está disponible en este momento.';

export const AI_ASSIST_SUBJECT_TYPES = ['issue', 'party'] as const;

export type AiAssistSubjectType = (typeof AI_ASSIST_SUBJECT_TYPES)[number];

export type AiAllowedIntent = (typeof AI_ALLOWED_INTENTS)[number];
export type AiDeniedIntent = (typeof AI_DENIED_INTENTS)[number];

export type AiAssistRequest = {
  feature: AiAllowedIntent;
  subjectType: AiAssistSubjectType;
  subjectId: string;
};

export type AiAllowanceInput = {
  intent: string;
  userDailyCount: number;
  orgMonthlyCount: number;
};

export type AiAllowance = {
  allowed: true;
  intent: AiAllowedIntent;
  maxOutputTokens: typeof AI_MAX_OUTPUT_TOKENS;
  maxProviderRetries: typeof AI_MAX_PROVIDER_RETRIES;
};

export type AiDenialCode = 'disabled' | 'user_daily' | 'org_monthly' | 'intent_denied' | 'usage_unknown';

const ALLOWED = new Set<string>(AI_ALLOWED_INTENTS);

export class AiNotAllowedError extends Error {
  readonly code: AiDenialCode;

  constructor(code: AiDenialCode, message: string) {
    super(message);
    this.name = 'AiNotAllowedError';
    this.code = code;
  }
}

/** True only for the exact string `true`. A key in the environment does not enable AI. */
export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true';
}

const SUBJECT_TYPES = new Set<string>(AI_ASSIST_SUBJECT_TYPES);

export function assertAiAssistRequest(input: {
  feature: string;
  subjectType: string;
  subjectId: string;
}): AiAssistRequest {
  const subjectId = input.subjectId.trim();
  if (!subjectId) {
    throw new AiNotAllowedError('intent_denied', 'Falta el contexto para la asistencia.');
  }
  if (!SUBJECT_TYPES.has(input.subjectType)) {
    throw new AiNotAllowedError('intent_denied', 'La asistencia no está disponible para ese contexto.');
  }
  const allowance = assertAiAllowed({
    intent: input.feature,
    userDailyCount: 0,
    orgMonthlyCount: 0,
  });
  return {
    feature: allowance.intent,
    subjectType: input.subjectType as AiAssistSubjectType,
    subjectId,
  };
}

function requireUsageCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Throws a Spanish denial when AI is off, the intent is not allowlisted,
 * or the user/org request caps are reached. Does not call a model.
 */
export function assertAiAllowed(input: AiAllowanceInput): AiAllowance {
  if (!isAiEnabled()) {
    throw new AiNotAllowedError(
      'disabled',
      'La asistencia de IA no está activada. El resto del sistema sigue disponible.',
    );
  }

  if (!ALLOWED.has(input.intent)) {
    throw new AiNotAllowedError(
      'intent_denied',
      'La IA no puede ejecutar esa acción. Solo puede resumir un cliente, responder una pregunta o redactar un seguimiento. No aprueba, no convierte, no reasigna y no envía.',
    );
  }

  if (!requireUsageCount(input.userDailyCount) || !requireUsageCount(input.orgMonthlyCount)) {
    throw new AiNotAllowedError(
      'usage_unknown',
      'No se pudo verificar el uso de IA. La asistencia queda en pausa. El resto del sistema sigue disponible.',
    );
  }

  if (input.userDailyCount >= AI_USER_DAILY_LIMIT) {
    throw new AiNotAllowedError(
      'user_daily',
      'Alcanzaste el límite diario de 20 solicitudes de IA. La asistencia queda en pausa hasta mañana. El resto del sistema sigue disponible.',
    );
  }

  if (input.orgMonthlyCount >= AI_ORG_MONTHLY_LIMIT) {
    throw new AiNotAllowedError(
      'org_monthly',
      'La empresa alcanzó el límite mensual de 300 solicitudes de IA. La asistencia queda en pausa. El resto del sistema sigue disponible.',
    );
  }

  return {
    allowed: true,
    intent: input.intent as AiAllowedIntent,
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    maxProviderRetries: AI_MAX_PROVIDER_RETRIES,
  };
}
