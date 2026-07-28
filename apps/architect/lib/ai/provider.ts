import type { ChatCompletionRequest, ChatMessage, LLMProvider } from "@/types";
import {
  AI_CONFIG,
  defaultBaseUrlFor,
  defaultEmbeddingModelFor,
  defaultModelFor,
  inferProviderFromBaseUrl,
  type AIProviderName,
} from "./config";
import { chatViaOpenAICompatible, embedViaOpenAICompatible } from "./openai";
import { geminiChat, geminiEmbed } from "./gemini";
import { anthropicChat, anthropicEmbed } from "./anthropic";
import type {
  AIChatMessage,
  AIChatOptions,
  AIChatResult,
  AIEmbedOptions,
  AIEmbedResult,
} from "./types";

/**
 * Provider routing — the one place that decides which vendor answers a
 * request. Everything else in Architect calls `ai.chat()` / `ai.embed()`
 * (see `lib/ai/index.ts`) and never imports `gemini.ts` / `openai.ts` /
 * `anthropic.ts` directly.
 */

interface ResolvedRuntime {
  provider: AIProviderName;
  apiKey?: string;
  baseUrl?: string;
}

function resolveRuntime(overrides: {
  provider?: AIProviderName;
  apiKey?: string;
  baseUrl?: string;
}): ResolvedRuntime {
  const apiKey = overrides.apiKey ?? AI_CONFIG.apiKey;
  if (!apiKey) {
    return { provider: "local" };
  }

  const usingGlobalKey = !overrides.apiKey || overrides.apiKey === AI_CONFIG.apiKey;
  const provider: AIProviderName =
    overrides.provider ??
    inferProviderFromBaseUrl(overrides.baseUrl) ??
    (usingGlobalKey && AI_CONFIG.provider !== "local" ? AI_CONFIG.provider : "openai");

  const baseUrl = overrides.baseUrl ?? (usingGlobalKey ? AI_CONFIG.baseUrl : undefined);

  return { provider, apiKey, baseUrl };
}

function extractText(content: AIChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/** Deterministic, no-network response used whenever no API key is configured. */
function localHeuristicComplete(messages: AIChatMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUser ? extractText(lastUser.content).trim() : "";
  return (
    text || "Understood. Tell me more about how work actually moves through the company."
  );
}

async function dispatchChat(
  provider: AIProviderName,
  messages: AIChatMessage[],
  options: { apiKey: string; baseUrl?: string; model: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  switch (provider) {
    case "gemini":
      return geminiChat(messages, options);
    case "anthropic":
      return anthropicChat(messages, options);
    case "openai":
    default:
      return chatViaOpenAICompatible(messages, {
        ...options,
        baseUrl: options.baseUrl ?? defaultBaseUrlFor("openai")!,
      });
  }
}

async function dispatchEmbed(
  provider: AIProviderName,
  inputs: string[],
  options: { apiKey: string; baseUrl?: string; model: string },
): Promise<number[][]> {
  switch (provider) {
    case "gemini":
      return geminiEmbed(inputs, options);
    case "anthropic":
      return anthropicEmbed();
    case "openai":
    default:
      return embedViaOpenAICompatible(inputs, {
        ...options,
        baseUrl: options.baseUrl ?? defaultBaseUrlFor("openai")!,
      });
  }
}

export async function routeChat(
  messages: AIChatMessage[],
  options: AIChatOptions = {},
): Promise<AIChatResult> {
  const runtime = resolveRuntime({
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  if (runtime.provider === "local") {
    return { text: localHeuristicComplete(messages), model: defaultModelFor("local"), provider: "local" };
  }

  const model =
    options.model ?? (runtime.provider === AI_CONFIG.provider ? AI_CONFIG.model : defaultModelFor(runtime.provider));

  const text = await dispatchChat(runtime.provider, messages, {
    apiKey: runtime.apiKey!,
    baseUrl: runtime.baseUrl ?? defaultBaseUrlFor(runtime.provider),
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });

  return { text, model, provider: runtime.provider };
}

/**
 * Throws when no embeddings provider is configured (i.e. would resolve to
 * `local`) — there is no meaningful deterministic vector, so callers that
 * need an honest "not available" response (OCR / embeddings routes) should
 * check for a key before calling, exactly as they do today.
 */
export async function routeEmbed(
  inputs: string[],
  options: AIEmbedOptions = {},
): Promise<AIEmbedResult> {
  const runtime = resolveRuntime({
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  if (runtime.provider === "local") {
    throw new Error(
      "No embeddings provider is configured. Set ARCHITECT_LLM_API_KEY (or a route-specific *_API_KEY override).",
    );
  }

  const model =
    options.model ??
    (runtime.provider === AI_CONFIG.provider ? AI_CONFIG.embeddingModel : defaultEmbeddingModelFor(runtime.provider));

  const vectors = await dispatchEmbed(runtime.provider, inputs, {
    apiKey: runtime.apiKey!,
    baseUrl: runtime.baseUrl ?? defaultBaseUrlFor(runtime.provider),
    model,
  });

  return { vectors, model, dimensions: vectors[0]?.length ?? 0, provider: runtime.provider };
}

// ---------------------------------------------------------------------------
// Backward-compatible surface for `lib/llm/provider.ts`.
//
// Same public names as the pre-existing module (`OpenAICompatibleProvider`,
// `LocalHeuristicProvider`, `createLLMProvider`, `toChatMessages`), now
// implemented on top of the routed provider above instead of a parallel HTTP
// stack. Nothing outside `lib/llm` needs to change.
// ---------------------------------------------------------------------------

/** OpenAI-compatible chat provider. Works with OpenAI, Azure OpenAI, Groq, Together, Ollama, etc. */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly options: {
      apiKey: string;
      baseUrl?: string;
      defaultModel?: string;
    },
  ) {}

  async complete(request: ChatCompletionRequest): Promise<string> {
    return chatViaOpenAICompatible(request.messages, {
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl ?? defaultBaseUrlFor("openai")!,
      model: request.model || this.options.defaultModel || defaultModelFor("openai"),
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }
}

/** Deterministic local provider used when no API key is configured. */
export class LocalHeuristicProvider implements LLMProvider {
  readonly name = "local-heuristic";

  async complete(request: ChatCompletionRequest): Promise<string> {
    return localHeuristicComplete(request.messages);
  }
}

/**
 * @deprecated Prefer `ai.chat()` from `lib/ai` for new call sites. Kept for
 * the pre-existing `lib/llm` surface — routes through the same central
 * `AI_CONFIG` / provider abstraction underneath, so it now honors
 * `ARCHITECT_LLM_PROVIDER` and Gemini/Anthropic, not just OpenAI-compatible.
 */
export function createLLMProvider(): LLMProvider {
  if (AI_CONFIG.provider === "local") {
    return new LocalHeuristicProvider();
  }

  return {
    name: `ai-routed:${AI_CONFIG.provider}`,
    complete: async (request: ChatCompletionRequest) =>
      (
        await routeChat(request.messages, {
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        })
      ).text,
  };
}

export function toChatMessages(system: string, history: ChatMessage[]): ChatMessage[] {
  return [{ role: "system", content: system }, ...history];
}
