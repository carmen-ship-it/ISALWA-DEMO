/**
 * Server-only evaluator email allowlist.
 * Source: ISALWA_EVALUATOR_EMAILS (comma-separated).
 *
 * Must never enter browser bundles, HTML, props, client logs, error messages,
 * or any public (NEXT_PUBLIC_*) environment variable.
 */

import {
  isEmailOnEvaluatorAllowlist as matchAllowlist,
  parseEvaluatorAllowlist,
} from '@/lib/evaluation/evaluator-allowlist-logic';

export { parseEvaluatorAllowlist } from '@/lib/evaluation/evaluator-allowlist-logic';

// Explicit browser ban — middleware/Node tests can still import this module.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  throw new Error('evaluator allowlist is server-only');
}

export function readEvaluatorAllowlistFromEnv(): readonly string[] {
  return parseEvaluatorAllowlist(process.env.ISALWA_EVALUATOR_EMAILS);
}

export function isEmailOnEvaluatorAllowlist(
  email: string | null | undefined,
  allowlist: readonly string[] = readEvaluatorAllowlistFromEnv(),
): boolean {
  return matchAllowlist(email, allowlist);
}
