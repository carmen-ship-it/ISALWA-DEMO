/**
 * Server-only evaluator email allowlist.
 * Source: ISALWA_EVALUATOR_EMAILS (comma-separated). Never import this module from
 * Client Components — it must not appear in browser bundles.
 */

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Parse server env without throwing; empty → no evaluators allowed. */
export function parseEvaluatorAllowlist(raw: string | undefined | null): readonly string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map(normalizeEmail)
    .filter((email) => email.length > 3 && email.includes('@'));
}

export function readEvaluatorAllowlistFromEnv(): readonly string[] {
  return parseEvaluatorAllowlist(process.env.ISALWA_EVALUATOR_EMAILS);
}

export function isEmailOnEvaluatorAllowlist(
  email: string | null | undefined,
  allowlist: readonly string[] = readEvaluatorAllowlistFromEnv(),
): boolean {
  if (!email) return false;
  const needle = normalizeEmail(email);
  return allowlist.includes(needle);
}
