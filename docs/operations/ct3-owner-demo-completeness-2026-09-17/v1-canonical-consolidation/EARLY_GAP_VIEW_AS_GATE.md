# EARLY_GAP_NOTE — View As gate vs Carmen SYNTH scopes

**Found:** 2026-09-17 during V1 consolidation kickoff  
**Severity:** P0 for owner-eval View As

## Evidence

`canUseRolePreview` in `apps/os-web/lib/role-preview/access.ts` requires:

- `people.admin` OR
- (`management.org.read` AND `system.admin`)

Carmen SYNTH owner-eval membership (corrected) has `management.org.read` but **not** `people.admin` / `system.admin`.

Therefore Vista de evaluación is **blocked** for the intended owner-eval actor after MINIMUM_SCOPE correction — contradicts Canonical V1 §16 / §46.

## Intended fix (CR-2)

Allow View As when `management.org.read` is present (business evaluation), without requiring `system.admin`.

Preserve: mutations blocked while preview active; identity unchanged; no capability elevation on API (nav scope substitute only until resource subject narrowing lands).

## Related PARTIAL

`effectiveNavScopes` substitutes preview scopes for **navigation** — resource-level narrowing to a specific synthetic Asesor is still a CR-2 deliverable (not merged all-advisors).
