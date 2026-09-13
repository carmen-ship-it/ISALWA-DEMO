export type ProviderSideEffectResult =
  | { ok: true }
  | { ok: false; error: string; attempts: number };

const DEFAULT_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bounded post-commit retry — OS transaction already committed. */
export async function runProviderSideEffectWithRetry(
  fn: () => Promise<void>,
  attempts = DEFAULT_ATTEMPTS,
): Promise<ProviderSideEffectResult> {
  let lastError = 'UNKNOWN';
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      return { ok: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (i < attempts - 1) {
        await sleep(50 * (i + 1));
      }
    }
  }
  return { ok: false, error: lastError, attempts };
}
