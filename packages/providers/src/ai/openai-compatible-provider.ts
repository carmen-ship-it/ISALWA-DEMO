import type { AiProvider } from '../types/index';
import { chatViaOpenAICompatible } from './openai-compatible-client';
import type { AiAssistInput, AiAssistResult } from './types';

export type OpenAiCompatibleAiProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

const SYSTEM_PROMPT = `You assist ISALWA Company OS staff with read-only analysis.
Rules:
- Use ONLY the facts and evidence references provided in the user message.
- Never invent records, amounts, or commitments.
- Never instruct the user to approve, send, convert, reassign, or mutate data.
- Respond with a single JSON object (no markdown fences) shaped as:
  {"summary":"...","suggestion":"...","facts":["..."]}
- facts must be short strings grounded in the provided packet.
- suggestion is a human next step; it must not execute an action.`;

function parseAssistJson(raw: string, evidenceRefs: AiAssistResult['evidenceRefs']): Omit<AiAssistResult, 'modelCalled'> {
  try {
    const parsed = JSON.parse(raw) as {
      summary?: unknown;
      suggestion?: unknown;
      facts?: unknown;
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
    const facts = Array.isArray(parsed.facts)
      ? parsed.facts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    if (summary && suggestion) {
      return { summary, suggestion, facts, evidenceRefs };
    }
  } catch {
    // fall through
  }
  return {
    summary: raw.slice(0, 600),
    suggestion: 'Revise el resumen con la evidencia autorizada antes de actuar.',
    facts: [],
    evidenceRefs,
  };
}

export class OpenAiCompatibleAiProvider implements AiProvider {
  readonly info = { name: 'openai-compatible-ai', mode: 'live' as const };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: OpenAiCompatibleAiProviderOptions) {
    const key = options.apiKey.trim();
    if (!key) {
      throw new Error('OPENAI_ISALWA_API_KEY is required for the OpenAI-compatible AI provider.');
    }
    this.apiKey = key;
    this.baseUrl = options.baseUrl?.trim() || 'https://api.openai.com/v1';
    this.model = options.model?.trim() || 'gpt-4o-mini';
  }

  async summarizeAccount(input: { accountName: string; facts: string[] }) {
    const result = await this.assist({
      feature: 'summarize_customer',
      subjectType: 'party',
      subjectId: input.accountName,
      facts: input.facts,
      evidenceRefs: [],
    });
    return { summary: result.summary, evidence: result.facts };
  }

  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    const evidenceRefs = [...input.evidenceRefs];
    const userPayload = {
      feature: input.feature,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      facts: input.facts,
      evidenceRefs,
    };

    const content = await chatViaOpenAICompatible(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(userPayload),
        },
      ],
      {
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        model: this.model,
        maxTokens: input.maxOutputTokens ?? 800,
      },
    );

    const parsed = parseAssistJson(content, evidenceRefs);
    return { ...parsed, modelCalled: true };
  }

  async health() {
    return 'up' as const;
  }
}
