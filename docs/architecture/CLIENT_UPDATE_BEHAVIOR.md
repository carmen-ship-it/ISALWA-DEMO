# Client Update Behavior

**Status:** Permanent engineering reference for `apps/architect`.  
**Related:** [`apps/architect/DEPLOYMENT.md`](../../apps/architect/DEPLOYMENT.md) ·
[`docs/OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md) ·
[`docs/SECURITY_POSTURE.md`](../SECURITY_POSTURE.md)

This document distinguishes **code/cache updates** (infrastructure) from **application state
freshness** (application logic). Do not conflate the two when troubleshooting or advising users.

---

## Code updates

A newly deployed version **does not require a hard refresh**.

Reason:

- HTML is always fetched fresh (`no-store`)
- Next.js assets are content-hashed
- Old JS files are immutable
- No service worker exists

Expected behavior:

- Refresh → newest code
- New visit → newest code

See also the caching table in [`apps/architect/DEPLOYMENT.md`](../../apps/architect/DEPLOYMENT.md#caching-no-hard-refresh-required).

---

## If the UI still looks old

Assume **application state**, not browser cache.

Investigate in this order:

1. `localStorage` pilot data
2. In-memory stores
3. Supabase synchronization
4. Migrations / healing
5. Stale derived state
6. Hydration mismatch

Do **not** recommend:

- Hard refresh
- Clear cache
- Incognito

unless a genuine browser caching bug has been proven.

---

## Long-lived tabs

One exception exists.

If the application stays open for hours while a new deployment occurs:

Old JS remains in memory → user continues using old runtime → not a bug / not a cache issue → simply an already-running application.

A normal reload loads the new version.

Future enhancement (optional):

- Detect newer deployment
- Show: "A new version of Architect is available. Reload to update."

This is a UX improvement, not a deployment fix.

---

## Engineering principle

- **Caching** is an infrastructure concern.
- **State freshness** is an application concern.

Do not conflate the two or add cache-busting hacks for stale application state.
