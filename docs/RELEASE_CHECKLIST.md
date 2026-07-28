# ISALWA Architect — Release Checklist

**Status:** Run before every release (every promotion to Production, and every merge to `main` if
`main` auto-deploys). Documentation only — this file does not add or change any CI automation; it
records what a human (or an agent acting on a human's behalf) must verify.
**Related:** [`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md) ·
[`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) ·
[`docs/OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) ·
[`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md)

---

## Before every release

### Code quality

- [ ] `pnpm typecheck` (`tsc -p tsconfig.json --noEmit`) passes clean from `apps/architect`.
- [ ] `pnpm lint` (`eslint .`) passes clean, or any new warning is deliberate and explained in the
      PR/commit.
- [ ] `pnpm build` succeeds locally (or the Vercel Preview build is green) before promoting.
- [ ] No new `any` types introduced without a documented reason (README's stated stack is
      "TypeScript strict, no `any`").

### Tests

- [ ] If an automated test suite exists at release time, it passes. As of this checklist's writing,
      `apps/architect` has no automated suite (`pnpm test` is a placeholder) — until then, perform
      the manual walkthrough below instead, and do not claim "tests pass" when none exist.
- [ ] Any flow touched by this release was manually walked through end-to-end at least once.

### Client Mode

- [ ] Log in as the client role (Álvaro or equivalent). Confirm only `CLIENT_VISIBLE_TAB_IDS` tabs
      are visible — no `assessment`, `architecture`, or `processes` tab, no internal engine ids or
      diagnostic language anywhere on screen.
- [ ] Confirm every screen the client can reach answers at least one of the three permanent
      questions (What do we know? What are we trying to learn? Why does it matter?) — see
      [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md#the-three-permanent-client-questions).
- [ ] Confirm there is always one clear next action (`NextStepCta` or equivalent), never a dead end
      or three competing calls to action.

### Consultant Mode

- [ ] Log in as the consultant role (Carmen or equivalent). Confirm all tabs are visible, including
      the three consultant-only ones, and any new consultant-only surface added in this release is
      correctly gated.
- [ ] Confirm consultant-only reasoning (Consulting Intelligence notebook, self-check evidence,
      internal engine diagnostics) is never visible to the client role, including via a direct URL
      if applicable.

### Spanish audit

- [ ] Every client-visible string introduced or changed in this release is in Spanish, generated
      inside the engine (never routed through `lib/i18n`) if it's consulting language, per
      [`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md#9-spanish-client-copy).
- [ ] Grep for obviously-untranslated English in any new/changed client-visible file
      (`rg` for common English filler words in the changed files is a fast sanity pass).
- [ ] Any new enum, status, or category value that flows to client-visible copy has a
      corresponding Spanish label function entry (`coverageAreaLabel()`, `phaseLabel()`,
      `moduleLabel()`, or a new equivalent) — never left to fall through to a raw enum string.

### No mock data, no fake scores

- [ ] No new seed/demo data was added that could be mistaken for real client evidence — new
      workspaces must still start from `createEmptyWorkspace()`.
- [ ] Repo-wide sweep for fabrication smells in changed files:
      `rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"` (excluding legitimate false positives
      like `confidenceSamples`), per the precedent in `NO_FABRICATED_CONTENT.md`.
- [ ] Every new score, percentage, or confidence value traces to real evidence — if a dimension is
      unmeasured, it renders "not measured"/"aún sin evaluar," never a guessed number.
- [ ] Any new AI-assisted feature keeps the underlying gate/score computation deterministic (see
      [`docs/ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md#adr-a3--deterministic-readiness-no-fake-percentages))
      — the LLM may narrate or retrieve, never decide the number.

### Accessibility (a11y)

- [ ] New interactive elements are keyboard-reachable and have visible focus states.
- [ ] New color-coded status (SLA-style alerts, confidence bands) has a non-color signal too (icon,
      label) — not color alone.
- [ ] Motion respects `prefers-reduced-motion` where animation was added.
- [ ] No accessibility regression in components reused from `components/ui/*` (verify props like
      `aria-*` weren't dropped when composing them into a new surface).

### Mobile

- [ ] Every new/changed screen was checked at a mobile viewport width, not just desktop.
- [ ] Touch targets are reasonably sized; no horizontal scroll introduced unintentionally.
- [ ] Sticky/fixed elements (tab rail, context bar) don't overlap new content at small viewports.

### Performance

- [ ] No new unbounded data fetch or unbounded context assembly — anything feeding an LLM call or
      a large render goes through the existing bounded patterns (e.g. `RetrievalPack`'s size
      bound), not an ad hoc unbounded list.
- [ ] No obvious new render-blocking work on the critical path (login → workspace load).
- [ ] Large new dependencies were justified — the AI Constitution requires justification for any
      new dependency, not just new business logic.

### Security review

- [ ] If this release touches `middleware.ts`, `lib/auth/*`, or `supabase/migrations/*`, it has had
      the elevated review called for in
      [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md#11-required-approvals).
- [ ] No secret value appears in any diff, commit message, or new doc — confirm with
      `git diff --stat` / a manual scan before pushing, especially for `.env*` files.
- [ ] Any new write path was checked against
      [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md#1-approved-production-write-paths) —
      approved list only.
- [ ] Any new consultant-only UI surface that writes data was checked for the known RLS
      `kind`-awareness gap (§6/§13 of Security Posture) — if the new write is sensitive, it should
      not ship without at least a documented follow-up, and ideally a proper `kind`-aware policy.

### Deployment verification

- [ ] Preview deployment is green on Vercel before promoting.
- [ ] Both pilot roles (or their current equivalents) can log in on the Preview and land on the
      correct workspace with the correct tab set.
- [ ] Environment variables for the target environment are confirmed set (not just "set on another
      environment") — redeploy after any env var change, per
      [`docs/OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md#3-vercel).
- [ ] After promotion, load the production URL with a normal reload (not a hard refresh) and
      confirm the new build is live — if it looks stale, the HTML caching is already `no-store`,
      so investigate data/logic, not the cache.
- [ ] The shipped mission/feature has a corresponding `MISSION*.md` (or feature doc) committed in
      the same change — documentation is part of Definition of Done, not a follow-up task.

---

## Definition of Done (restated from the AI Constitution, applies to every release)

A release is complete only when:

- UI is consistent with existing patterns — no duplicated components, no dead code.
- Mobile still works.
- Accessibility is preserved.
- Types pass (`pnpm typecheck`).
- Build passes (`pnpm build`).
- Existing behavior is unchanged unless the release explicitly intends to change it.
- Documentation is updated (this release's mission doc, and any of the six governance docs this
  release affects).
