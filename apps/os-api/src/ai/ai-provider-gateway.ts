/**
 * Read-only AI provider gateway — env only, never reads browser input.
 * When AI is enabled for a live provider but credentials are missing, classify PROVIDER_BLOCKED.
 */

export type AiProviderGatewayState =
  | { status: 'disabled' }
  | { status: 'ready'; mode: 'mock' | 'live'; citationsLive: boolean }
  | { status: 'blocked'; code: 'PROVIDER_BLOCKED'; reason: 'missing_credential' | 'invalid_provider' };

function wantsLiveProvider(providerMode: string): boolean {
  return providerMode === 'openai' || providerMode === 'openai-compatible';
}

export function resolveAiProviderGatewayState(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderGatewayState {
  if (env.AI_ENABLED !== 'true') {
    return { status: 'disabled' };
  }

  const provider = (env.AI_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
  if (wantsLiveProvider(provider)) {
    const keyPresent = Boolean(env.OPENAI_ISALWA_API_KEY?.trim());
    if (!keyPresent) {
      return { status: 'blocked', code: 'PROVIDER_BLOCKED', reason: 'missing_credential' };
    }
    return { status: 'ready', mode: 'live', citationsLive: true };
  }

  if (provider === 'mock') {
    return { status: 'ready', mode: 'mock', citationsLive: false };
  }

  return { status: 'blocked', code: 'PROVIDER_BLOCKED', reason: 'invalid_provider' };
}

export function assertAiProviderGatewayReady(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderGatewayState & { status: 'ready' } {
  const state = resolveAiProviderGatewayState(env);
  if (state.status === 'disabled') {
    throw new Error('AI_UNAVAILABLE');
  }
  if (state.status === 'blocked') {
    throw new Error('AI_UNAVAILABLE');
  }
  return state;
}
