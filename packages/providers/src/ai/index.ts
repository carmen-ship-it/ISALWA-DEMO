import { MockAiProvider } from './mock';
import { OpenAiCompatibleAiProvider } from './openai-compatible-provider';
import type { AiProvider } from '../types/index';

export type CreateAiProviderInput = {
  provider?: string;
  openAiApiKey?: string;
  openAiBaseUrl?: string;
  openAiModel?: string;
  modelAllowlist?: readonly string[];
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Factory for read-only assist adapters.
 * `openai` uses fetch against an OpenAI-compatible `/chat/completions` endpoint.
 * Model names are construction-time only — never from browser input.
 */
export function createAiProvider(input: CreateAiProviderInput = {}): AiProvider {
  const mode = (input.provider ?? 'mock').toLowerCase();
  if (mode === 'openai' || mode === 'openai-compatible') {
    const apiKey = input.openAiApiKey?.trim();
    if (apiKey) {
      return new OpenAiCompatibleAiProvider({
        apiKey,
        baseUrl: input.openAiBaseUrl,
        model: input.openAiModel,
        modelAllowlist: input.modelAllowlist,
        timeoutMs: input.timeoutMs,
        maxRetries: input.maxRetries,
      });
    }
  }
  return new MockAiProvider();
}

export type {
  AiAssistInput,
  AiAssistResult,
  AiAssistEvidenceRef,
  AiChatMessage,
} from './types';
export { MockAiProvider } from './mock';
export { OpenAiCompatibleAiProvider } from './openai-compatible-provider';
export { chatViaOpenAICompatible } from './openai-compatible-client';
