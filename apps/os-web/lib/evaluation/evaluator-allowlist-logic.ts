/**
 * Pure allowlist parsing/matching — no env access.
 * Env reads stay in evaluator-allowlist.ts behind `server-only`.
 */

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Parse allowlist text without throwing; empty → no evaluators allowed. */
export function parseEvaluatorAllowlist(raw: string | undefined | null): readonly string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map(normalizeEmail)
    .filter((email) => email.length > 3 && email.includes('@'));
}

export function isEmailOnEvaluatorAllowlist(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (!email) return false;
  const needle = normalizeEmail(email);
  return allowlist.includes(needle);
}
