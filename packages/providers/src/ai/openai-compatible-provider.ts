import type { AiProvider } from '../types/index';
import { chatViaOpenAICompatible } from './openai-compatible-client';
import { AI_PROVIDER_SYSTEM_PROMPT, wrapCompanyFactsAsData } from './data-guard';
import type { AiAssistInput, AiAssistResult } from './types';

export type OpenAiCompatibleAiProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Server allowlist — model must be in this set. */
  modelAllowlist?: readonly string[];
  timeoutMs?: number;
  maxRetries?: number;
};

function parseAssistJson(
  raw: string,
  evidenceRefs: AiAssistResult['evidenceRefs'],
): Omit<AiAssistResult, 'modelCalled'> {
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
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: OpenAiCompatibleAiProviderOptions) {
    const key = options.apiKey.trim();
    if (!key) {
      throw new Error('OPENAI_ISALWA_API_KEY is required for the OpenAI-compatible AI provider.');
    }
    this.apiKey = key;
    this.baseUrl = options.baseUrl?.trim() || 'https://api.openai.com/v1';
    const model = options.model?.trim() || 'gpt-4o-mini';
    const allowlist = options.modelAllowlist?.length
      ? options.modelAllowlist
      : [model];
    if (!allowlist.includes(model)) {
      throw new Error('AI_MODEL_NOT_ALLOWED');
    }
    this.model = model;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxRetries = Math.min(1, options.maxRetries ?? 1);
  }

  async summarizeAccount(input: { accountName: string; facts: string[] }) {
    const result = await this.assist({
      feature: 'summarizeCustomerAuthorizedContext',
      subjectType: 'party',
      subjectId: input.accountName,
      facts: input.facts,
      evidenceRefs: [],
    });
    return { summary: result.summary, evidence: result.facts };
  }

  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    // Never accept a model name from the assist input — construction-time allowlist only.
    const evidenceRefs = [...input.evidenceRefs];
    const userPayload = {
      feature: input.feature,
      subjectType: input.subjectType,
      // subjectId is an opaque reference for correlation; facts carry human content.
      subjectTypeOnly: input.subjectType,
      evidence: wrapCompanyFactsAsData(input.facts),
      evidenceRefCount: evidenceRefs.length,
    };

    const { content } = await chatViaOpenAICompatible(
      [
        { role: 'system', content: AI_PROVIDER_SYSTEM_PROMPT },
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
        timeoutMs: this.timeoutMs,
        maxRetries: this.maxRetries,
      },
    );

    const parsed = parseAssistJson(content, evidenceRefs);
    return { ...parsed, modelCalled: true };
  }

  async health() {
    return 'up' as const;
  }
}
