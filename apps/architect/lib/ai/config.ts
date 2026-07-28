/**
 * Central AI configuration for Architect.
 *
 * Every AI call in this app reads its model and provider from here — nothing
 * else may hardcode a model string like `gemini-flash-latest` or
 * `gpt-4o-mini`. Change providers or models through environment variables,
 * never by editing a call site.
 *
 * Provider is inferred, in order:
 *   1. `ARCHITECT_LLM_PROVIDER` (explicit: "gemini" | "openai" | "anthropic" | "local")
 *   2. The shape of `ARCHITECT_LLM_BASE_URL` (Gemini / Anthropic hostnames)
 *   3. "openai" — the default for any other OpenAI-compatible base URL
 *   4. "local" whenever no API key is configured at all. Architect never
 *      throws for a missing key; it degrades to a deterministic local
 *      provider (`LocalHeuristicProvider` in `lib/ai/provider.ts`).
 */

export type AIProviderName = "gemini" | "openai" | "anthropic" | "local";

const PROVIDER_NAMES: readonly AIProviderName[] = [
  "gemini",
  "openai",
  "anthropic",
  "local",
];

function isAIProviderName(value: string): value is AIProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

/** Default chat model per provider — used only when `ARCHITECT_LLM_MODEL` is unset. */
const DEFAULT_CHAT_MODEL: Record<AIProviderName, string> = {
  gemini: "gemini-flash-latest",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  local: "local-heuristic",
};

/** Default embedding model per provider — used only when `ARCHITECT_EMBEDDINGS_MODEL` is unset. */
const DEFAULT_EMBEDDING_MODEL: Record<AIProviderName, string> = {
  gemini: "gemini-embedding-001",
  openai: "text-embedding-3-small",
  // Anthropic has no embeddings API — `ai.embed()` throws a clear error for
  // this provider (see `lib/ai/anthropic.ts`). This default only matters if
  // a caller explicitly overrides `provider` without a model.
  anthropic: "text-embedding-3-small",
  local: "local-heuristic",
};

/** Default OpenAI-compatible base URL per provider. */
const DEFAULT_BASE_URL: Partial<Record<AIProviderName, string>> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
};

/** Infer a provider from a base URL's hostname, when it identifies one unambiguously. */
export function inferProviderFromBaseUrl(
  baseUrl?: string | null,
): AIProviderName | undefined {
  if (!baseUrl) return undefined;
  if (/generativelanguage\.googleapis\.com/i.test(baseUrl)) return "gemini";
  if (/api\.anthropic\.com/i.test(baseUrl)) return "anthropic";
  return undefined;
}

function resolveApiKey(): string | undefined {
  return process.env.ARCHITECT_LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? undefined;
}

function inferProvider(apiKey: string | undefined): AIProviderName {
  const explicit = process.env.ARCHITECT_LLM_PROVIDER?.trim().toLowerCase();
  if (explicit && isAIProviderName(explicit)) {
    if (explicit === "local") return "local";
    // An explicit provider with no key is not runnable — degrade honestly.
    return apiKey ? explicit : "local";
  }

  if (!apiKey) return "local";

  return inferProviderFromBaseUrl(process.env.ARCHITECT_LLM_BASE_URL) ?? "openai";
}

export interface AIConfigShape {
  readonly provider: AIProviderName;
  readonly model: string;
  readonly embeddingModel: string;
  readonly baseUrl: string | undefined;
  readonly apiKey: string | undefined;
}

function buildConfig(): AIConfigShape {
  const apiKey = resolveApiKey();
  const provider = inferProvider(apiKey);
  const baseUrl = process.env.ARCHITECT_LLM_BASE_URL ?? DEFAULT_BASE_URL[provider];
  const model = process.env.ARCHITECT_LLM_MODEL ?? DEFAULT_CHAT_MODEL[provider];
  const embeddingModel =
    process.env.ARCHITECT_EMBEDDINGS_MODEL ?? DEFAULT_EMBEDDING_MODEL[provider];

  return { provider, model, embeddingModel, baseUrl, apiKey };
}

/**
 * Central AI config, resolved once from the process environment. Every AI
 * call site should read model + provider from here (or from an explicit
 * per-call override — see `lib/ai/provider.ts`) instead of hardcoding either.
 */
export const AI_CONFIG: AIConfigShape = buildConfig();

export function defaultModelFor(provider: AIProviderName): string {
  return DEFAULT_CHAT_MODEL[provider];
}

export function defaultEmbeddingModelFor(provider: AIProviderName): string {
  return DEFAULT_EMBEDDING_MODEL[provider];
}

export function defaultBaseUrlFor(provider: AIProviderName): string | undefined {
  return DEFAULT_BASE_URL[provider];
}
