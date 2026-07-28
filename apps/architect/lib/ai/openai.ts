import type { AIChatMessage } from "./types";

/**
 * Generic OpenAI-compatible client — the one HTTP implementation shared by
 * every provider that speaks the `/chat/completions` + `/embeddings`
 * contract: OpenAI itself, Azure OpenAI, Groq, Together, Ollama, and (via
 * `lib/ai/gemini.ts`) Gemini's OpenAI-compatibility layer. No provider keeps
 * a second copy of this fetch logic.
 */

export interface OpenAICompatibleChatOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAICompatibleEmbedOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export async function chatViaOpenAICompatible(
  messages: AIChatMessage[],
  options: OpenAICompatibleChatOptions,
): Promise<string> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI chat request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI chat response contained no content.");
  }

  return content.trim();
}

export async function embedViaOpenAICompatible(
  inputs: string[],
  options: OpenAICompatibleEmbedOptions,
): Promise<number[][]> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({ model: options.model, input: inputs }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI embeddings request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };

  const ordered = [...(payload.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  const vectors = ordered
    .map((item) => item.embedding)
    .filter((vector): vector is number[] => Array.isArray(vector));

  if (vectors.length !== inputs.length) {
    throw new Error(
      `AI embeddings provider returned ${vectors.length} vectors for ${inputs.length} inputs.`,
    );
  }

  return vectors;
}
