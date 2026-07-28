import type { AIProviderName } from "./config";

/** A multimodal content part — text or an inline image. OpenAI-compatible shape. */
export type AIChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * Chat message. `content` is a plain string for ordinary text turns, or an
 * array of parts for multimodal turns (e.g. OCR, which sends an image
 * alongside the transcription instruction).
 */
export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string | AIChatContentPart[];
}

export interface AIChatOptions {
  /** Overrides `AI_CONFIG.model`. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Per-call overrides — lets a route (OCR, embeddings) use its own key /
   * base URL / provider without touching the shared `AI_CONFIG` or forcing a
   * global default across the whole app.
   */
  apiKey?: string;
  baseUrl?: string;
  provider?: AIProviderName;
}

export interface AIChatResult {
  text: string;
  model: string;
  provider: AIProviderName;
}

export interface AIEmbedOptions {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  provider?: AIProviderName;
}

export interface AIEmbedResult {
  vectors: number[][];
  model: string;
  dimensions: number;
  provider: AIProviderName;
}

export interface AISummarizeOptions extends AIChatOptions {
  /** Overrides the default neutral summarization instruction. */
  instruction?: string;
}
