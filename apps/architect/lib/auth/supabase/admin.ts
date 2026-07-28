import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — server-only, one narrow use case.
 *
 * Mission 24 (Autonomous Consulting Cycle) is the first code path in this
 * app that legitimately runs with no signed-in user at all: a Vercel Cron
 * invocation, not Carmen or Álvaro's browser session. Every other write path
 * in Architect authenticates as the signed-in user and lets Supabase Row
 * Level Security (`architect_is_member`) decide what they may touch — see
 * `docs/SECURITY_POSTURE.md` §1. A cron job has no session and no cookie, so
 * that RLS path cannot apply; the alternative in
 * `docs/SECURITY_POSTURE.md` §5 ("a specific, reviewed, server-only use case
 * ... deliberately wired up") is what this file is.
 *
 * Hard rules, enforced by construction:
 *   - This file is never imported by a Client Component, and exports
 *     nothing from `lib/consulting-intelligence` or any client-safe barrel.
 *   - The only caller is `app/api/cron/consulting-review/route.ts`, itself
 *     gated by `CRON_SECRET` before this client is ever constructed.
 *   - `SUPABASE_SERVICE_ROLE_KEY` is read here and nowhere else in the app —
 *     grep the repo for this file name if that ever needs to change.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the cron route has everything it needs to run for real. */
export function isAdminSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
