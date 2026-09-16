/**
 * Server-side AI governance configuration.
 * Values come from process env only — never from browser/user input.
 */

export type AiGovernanceConfig = {
  enabled: boolean;
  provider: string;
  defaultModel: string;
  fallbackModel: string | null;
  modelAllowlist: readonly string[];
  memberRatePerMinute: number;
  memberRatePerHour: number;
  orgRatePerDay: number;
  memberMaxConcurrency: number;
  orgMaxConcurrency: number;
  requestTimeoutMs: number;
  maxAutomaticRetries: number;
  maxEvidenceItems: number;
  maxOutputTokens: number;
  monthlyBudgetUsd: number;
  /** Conservative estimate for soft circuit breaker when provider billing is delayed. */
  estimatedCostPerRequestUsd: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Pilot defaults from AI governance contract. */
export const AI_GOVERNANCE_DEFAULTS = {
  defaultModel: 'gpt-4o-mini',
  memberRatePerMinute: 6,
  memberRatePerHour: 30,
  orgRatePerDay: 250,
  memberMaxConcurrency: 1,
  orgMaxConcurrency: 5,
  requestTimeoutMs: 20_000,
  maxAutomaticRetries: 1,
  maxEvidenceItems: 50,
  maxOutputTokens: 800,
  monthlyBudgetUsd: 20,
  estimatedCostPerRequestUsd: 0.05,
} as const;

export function resolveAiGovernanceConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiGovernanceConfig {
  const defaultModel =
    env.AI_MODEL?.trim() ||
    env.OPENAI_ISALWA_MODEL?.trim() ||
    AI_GOVERNANCE_DEFAULTS.defaultModel;
  const fallbackRaw = env.AI_FALLBACK_MODEL?.trim() || '';
  const fallbackModel = fallbackRaw && fallbackRaw !== defaultModel ? fallbackRaw : null;

  const allowlistRaw = env.AI_MODEL_ALLOWLIST?.trim();
  const fromList = allowlistRaw
    ? allowlistRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const modelAllowlist = [
    ...new Set([defaultModel, ...(fallbackModel ? [fallbackModel] : []), ...fromList]),
  ];

  return {
    enabled: env.AI_ENABLED === 'true',
    provider: (env.AI_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock',
    defaultModel,
    fallbackModel,
    modelAllowlist,
    memberRatePerMinute: envInt(
      'AI_MEMBER_RATE_LIMIT_PER_MINUTE',
      AI_GOVERNANCE_DEFAULTS.memberRatePerMinute,
    ),
    memberRatePerHour: envInt(
      'AI_MEMBER_RATE_LIMIT_PER_HOUR',
      AI_GOVERNANCE_DEFAULTS.memberRatePerHour,
    ),
    orgRatePerDay: envInt('AI_ORG_RATE_LIMIT_PER_DAY', AI_GOVERNANCE_DEFAULTS.orgRatePerDay),
    memberMaxConcurrency: envInt(
      'AI_MEMBER_MAX_CONCURRENCY',
      AI_GOVERNANCE_DEFAULTS.memberMaxConcurrency,
    ),
    orgMaxConcurrency: envInt(
      'AI_ORG_MAX_CONCURRENCY',
      AI_GOVERNANCE_DEFAULTS.orgMaxConcurrency,
    ),
    requestTimeoutMs: envInt('AI_REQUEST_TIMEOUT_MS', AI_GOVERNANCE_DEFAULTS.requestTimeoutMs),
    maxAutomaticRetries: Math.min(
      1,
      envInt('AI_MAX_PROVIDER_RETRIES', AI_GOVERNANCE_DEFAULTS.maxAutomaticRetries),
    ),
    maxEvidenceItems: envInt('AI_MAX_EVIDENCE_ITEMS', AI_GOVERNANCE_DEFAULTS.maxEvidenceItems),
    maxOutputTokens: envInt('AI_MAX_OUTPUT_TOKENS', AI_GOVERNANCE_DEFAULTS.maxOutputTokens),
    monthlyBudgetUsd: envFloat('AI_MONTHLY_BUDGET_USD', AI_GOVERNANCE_DEFAULTS.monthlyBudgetUsd),
    estimatedCostPerRequestUsd: envFloat(
      'AI_ESTIMATED_COST_PER_REQUEST_USD',
      AI_GOVERNANCE_DEFAULTS.estimatedCostPerRequestUsd,
    ),
  };
}

export function assertModelAllowed(model: string, config: AiGovernanceConfig): string {
  const trimmed = model.trim();
  if (!trimmed || !config.modelAllowlist.includes(trimmed)) {
    throw new Error('AI_MODEL_NOT_ALLOWED');
  }
  return trimmed;
}
