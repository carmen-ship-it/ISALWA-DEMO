/**
 * SSR gate for AI assist surfaces — mirrors os-api ai-provider-gateway (env only).
 * Does not read API keys into the client bundle; used from server components only.
 *
 * Hosted live-provider proof (CT3 §101 A–H) is separate from this gate.
 * Until CT3-I marks hosted proof PASS, live Ask ISALWA remains UNPROVEN even when
 * local env would show the control. This gate still hides controls when the
 * provider is disabled or blocked so the UI never pretends a live model is ready.
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
    // Credential present locally ≠ hosted live proof. citationsLive means the
    // code path would call a live model; CT3-I must still browser-verify.
    return { show: true, citationsLive: true };
  }

  if (provider === 'mock') {
    return { show: true, citationsLive: false };
  }

  return { show: false, citationsLive: false, blocker: 'PROVIDER_BLOCKED' };
}
