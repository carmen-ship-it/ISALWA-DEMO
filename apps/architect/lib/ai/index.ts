import { routeChat, routeEmbed } from "./provider";
import type {
  AIChatMessage,
  AIChatOptions,
  AIChatResult,
  AIEmbedOptions,
  AIEmbedResult,
  AISummarizeOptions,
} from "./types";

export { AI_CONFIG, inferProviderFromBaseUrl } from "./config";
export type { AIProviderName } from "./config";
export type {
  AIChatContentPart,
  AIChatMessage,
  AIChatOptions,
  AIChatResult,
  AIEmbedOptions,
  AIEmbedResult,
  AISummarizeOptions,
} from "./types";

const DEFAULT_SUMMARY_INSTRUCTION =
  "Summarize the following text in clear, concise prose. Preserve key facts, numbers and names. Do not add information that is not present.";

/**
 * Public AI surface for the rest of Architect.
 *
 * Nothing outside `lib/ai` should know which vendor answers a request, or
 * which model id is configured — call `ai.chat` / `ai.embed` / `ai.summarize`
 * and let `lib/ai/provider.ts` route based on `AI_CONFIG`.
 */
export const ai = {
  chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<AIChatResult> {
    return routeChat(messages, options);
  },

  embed(inputs: string[], options?: AIEmbedOptions): Promise<AIEmbedResult> {
    return routeEmbed(inputs, options);
  },

  summarize(text: string, options: AISummarizeOptions = {}): Promise<AIChatResult> {
    const { instruction, ...chatOptions } = options;
    return routeChat(
      [
        { role: "system", content: instruction ?? DEFAULT_SUMMARY_INSTRUCTION },
        { role: "user", content: text },
      ],
      chatOptions,
    );
  },
};

export default ai;
