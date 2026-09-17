/**
 * SSR gate for AI assist surfaces — mirrors os-api ai-provider-gateway (env only).
 * Does not read API keys into the client bundle; used from server components only.
 */

export type AiHostedBlocker = 'DISABLED' | 'PROVIDER_BLOCKED';

export type AiHostedVisibility = {
  show: boolean;
  citationsLive: boolean;
  blocker?: AiHostedBlocker;
};

function wantsLiveProvider(providerMode: string): boolean {
  return providerMode === 'openai' || providerMode === 'openai-compatible';
}

export function resolveAiHostedVisibility(
  env: NodeJS.ProcessEnv = process.env,
): AiHostedVisibility {
  if (env.AI_ENABLED !== 'true') {
    return { show: false, citationsLive: false, blocker: 'DISABLED' };
  }

  const provider = (env.AI_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
  if (wantsLiveProvider(provider)) {
    if (!env.OPENAI_ISALWA_API_KEY?.trim()) {
      return { show: false, citationsLive: false, blocker: 'PROVIDER_BLOCKED' };
    }
    return { show: true, citationsLive: true };
  }

  if (provider === 'mock') {
    return { show: true, citationsLive: false };
  }

  return { show: false, citationsLive: false, blocker: 'PROVIDER_BLOCKED' };
}
