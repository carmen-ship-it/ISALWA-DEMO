import { chatViaOpenAICompatible, embedViaOpenAICompatible } from "./openai";
import { defaultBaseUrlFor, defaultEmbeddingModelFor } from "./config";
import type { AIChatMessage } from "./types";

/**
 * Gemini adapter.
 *
 * Google's Generative Language API exposes an OpenAI-compatible surface
 * (`/v1beta/openai/chat/completions`, `/v1beta/openai/embeddings`), so this
 * is a thin, named wrapper around the shared OpenAI-compatible client rather
 * than a second HTTP stack. See https://ai.google.dev/gemini-api/docs/openai
 */

export interface GeminiChatOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function geminiChat(
  messages: AIChatMessage[],
  options: GeminiChatOptions,
): Promise<string> {
  return chatViaOpenAICompatible(messages, {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl ?? defaultBaseUrlFor("gemini")!,
    model: options.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
}

export interface GeminiEmbedOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export async function geminiEmbed(
  inputs: string[],
  options: GeminiEmbedOptions,
): Promise<number[][]> {
  return embedViaOpenAICompatible(inputs, {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl ?? defaultBaseUrlFor("gemini")!,
    model: options.model ?? defaultEmbeddingModelFor("gemini"),
  });
}
