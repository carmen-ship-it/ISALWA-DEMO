/**
 * Compatibility shim.
 *
 * The real implementation now lives in `lib/ai/provider.ts`, routed through
 * `AI_CONFIG` (see `lib/ai/config.ts`) instead of hardcoding an OpenAI base
 * URL / model. This file re-exports the same names so nothing importing
 * `@/lib/llm` has to change. New call sites should prefer `ai.chat()` from
 * `@/lib/ai` directly.
 */
export {
  OpenAICompatibleProvider,
  LocalHeuristicProvider,
  createLLMProvider,
  toChatMessages,
} from "@/lib/ai/provider";
