/** Server-only module — import from Server Components / actions / middleware helpers only. */

import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { createServerSupabaseClient } from '@/lib/auth/supabase/server';
import { isEmailOnEvaluatorAllowlist } from '@/lib/evaluation/evaluator-allowlist';
import { isWalkthroughOnlyEvaluation } from '@/lib/evaluation/walkthrough-config';

export type WalkthroughAccess =
  | { status: 'allowed'; email: string }
  | { status: 'unauthenticated' }
  | { status: 'denied' }
  | { status: 'misconfigured' };

/**
 * Server gate for /evaluacion. Requires evaluation walkthrough runtime,
 * Supabase session, and allowlisted email. Never returns allowlist contents.
 */
export async function resolveWalkthroughAccess(): Promise<WalkthroughAccess> {
  if (!isWalkthroughOnlyEvaluation()) {
    return { status: 'misconfigured' };
  }
  if (getOsAuthMode() !== 'supabase' || !isSupabaseConfigured()) {
    return { status: 'misconfigured' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { status: 'unauthenticated' };
    if (!isEmailOnEvaluatorAllowlist(user.email)) return { status: 'denied' };
    return { status: 'allowed', email: user.email };
  } catch {
    return { status: 'unauthenticated' };
  }
}
