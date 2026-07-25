import type {
  ChatCompletionRequest,
  ChatMessage,
  LLMProvider,
} from "@/types";

/**
 * OpenAI-compatible chat provider.
 * Works with OpenAI, Azure OpenAI, Groq, Together, Ollama, etc.
 * No vendor lock — swap base URL and API key.
 */
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
    const baseUrl = (this.options.baseUrl ?? "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.options.defaultModel || "gpt-4o-mini",
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 900,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response contained no content.");
    }

    return content.trim();
  }
}

/** Deterministic local provider used when no API key is configured. */
export class LocalHeuristicProvider implements LLMProvider {
  readonly name = "local-heuristic";

  async complete(request: ChatCompletionRequest): Promise<string> {
    const lastUser = [...request.messages]
      .reverse()
      .find((message) => message.role === "user");
    return (
      lastUser?.content ??
      "Understood. Tell me more about how work actually moves through the company."
    );
  }
}

export function createLLMProvider(): LLMProvider {
  const apiKey = process.env.ARCHITECT_LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new LocalHeuristicProvider();
  }

  return new OpenAICompatibleProvider({
    apiKey,
    baseUrl: process.env.ARCHITECT_LLM_BASE_URL,
    defaultModel: process.env.ARCHITECT_LLM_MODEL ?? "gpt-4o-mini",
  });
}

export function toChatMessages(
  system: string,
  history: ChatMessage[],
): ChatMessage[] {
  return [{ role: "system", content: system }, ...history];
}
