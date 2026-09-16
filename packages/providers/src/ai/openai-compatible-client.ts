import type { AiChatMessage } from './types';

export type OpenAICompatibleChatOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** Hard request timeout (ms). */
  timeoutMs?: number;
  /** Max automatic retries for transient failures only (0 or 1). */
  maxRetries?: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Newer OpenAI chat models (gpt-5* incl. gpt-5.6-luna, o-series) reject
 * `max_tokens` with unsupported_parameter and require `max_completion_tokens`.
 * Legacy chat models (gpt-4o*, gpt-3.5*, etc.) still expect `max_tokens`.
 */
export function usesMaxCompletionTokens(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  );
}

/** Build chat/completions JSON body — exported for request-shape tests. */
export function buildOpenAICompatibleChatBody(
  messages: AiChatMessage[],
  options: Pick<OpenAICompatibleChatOptions, 'model' | 'temperature' | 'maxTokens'>,
): Record<string, unknown> {
  const maxTokens = options.maxTokens ?? 800;
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
    temperature: options.temperature ?? 0.3,
  };
  if (usesMaxCompletionTokens(options.model)) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }
  return body;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatViaOpenAICompatible(
  messages: AiChatMessage[],
  options: OpenAICompatibleChatOptions,
): Promise<{ content: string; usage?: { promptTokens?: number; completionTokens?: number } }> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 20_000;
  const maxRetries = Math.min(1, Math.max(0, options.maxRetries ?? 1));

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(buildOpenAICompatibleChatBody(messages, options)),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Do not include response body in thrown message (may leak provider details to callers).
        const transient = isTransientStatus(response.status);
        const err = new Error(transient ? 'AI_PROVIDER_TRANSIENT' : 'AI_PROVIDER_ERROR');
        if (!transient || attempt >= maxRetries) throw err;
        lastError = err;
        attempt += 1;
        await sleep(250 * attempt);
        continue;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI_PROVIDER_EMPTY');
      }

      return {
        content: content.trim(),
        usage: {
          promptTokens: payload.usage?.prompt_tokens,
          completionTokens: payload.usage?.completion_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI_PROVIDER_TIMEOUT');
      }
      if (err instanceof Error && err.message.startsWith('AI_')) {
        lastError = err;
        if (err.message === 'AI_PROVIDER_TRANSIENT' && attempt < maxRetries) {
          attempt += 1;
          await sleep(250 * attempt);
          continue;
        }
        throw err;
      }
      throw new Error('AI_PROVIDER_ERROR');
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error('AI_PROVIDER_ERROR');
}
