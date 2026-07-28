import type { AIChatMessage } from "./types";

/**
 * Anthropic adapter.
 *
 * Chat is real — a minimal client for the Messages API. Embeddings are an
 * honest stub: Anthropic does not publish an embeddings API, so
 * `anthropicEmbed` throws a clear, actionable error instead of silently
 * proxying to another vendor. Configure `gemini` or `openai` (globally via
 * `ARCHITECT_LLM_PROVIDER`, or per-route via `ARCHITECT_EMBEDDINGS_*`) for
 * `ai.embed()`.
 */

const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicChatOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

function toAnthropicContent(content: AIChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export async function anthropicChat(
  messages: AIChatMessage[],
  options: AnthropicChatOptions,
): Promise<string> {
  const baseUrl = (options.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL).replace(/\/$/, "");
  const system = messages.find((message) => message.role === "system");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: toAnthropicContent(message.content),
    }));

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: options.model,
      system: system ? toAnthropicContent(system.content) : undefined,
      messages: turns,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic chat request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = payload.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic response contained no text content.");
  }

  return text;
}

/** Honest stub — see module docstring. Never silently falls back to another vendor. */
export async function anthropicEmbed(): Promise<never> {
  throw new Error(
    "Anthropic has no embeddings API. Configure ARCHITECT_LLM_PROVIDER=gemini or openai " +
      "(or a route-specific ARCHITECT_EMBEDDINGS_* override) for ai.embed().",
  );
}
