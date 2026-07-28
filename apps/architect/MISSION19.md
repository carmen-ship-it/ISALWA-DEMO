# Mission 19 — Premium UX & Visual Design (Phase 1 · Beautiful)

**Status:** Complete (first sequenced pass — see "Deliberately out of scope").
**App:** `apps/architect`
**Scope:** Presentation / composition only — no functionality, routing, business logic, or
consulting-engine changes.
**Plan:** `Product Polish Roadmap (Missions 19–24)`, Phase 1.
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md` (frozen design language).

## Product Principle (restated, governs every change below)

**Architect should never feel like software.** It should feel like a senior consulting team that
happens to live inside software. Every screen this mission touched must answer:

1. **What do we know?**
2. **What are we trying to understand?**
3. **Why does it matter to the business?**

Tagline: *"Architect becomes more intelligent every time your company shares knowledge."*

## Context — this is not a first pass

Architect already had two prior visual-quality missions on `main`: **Mission 9 — Premium
Executive Design System** (section-identity tints, Newsreader/Plus Jakarta Sans, card depth
vocabulary) and **Premium Visual Quality Pass** (richer multi-layer shadows, glass chrome for
sticky surfaces, `isalwa-section-gap` rhythm, the Living Report rebuild), plus an **Executive UX
Polish** audit. Hierarchy, typography, atmosphere tokens, sticky chrome, and most spacing rhythm
were therefore already largely in place. Mission 19 is the next increment on that same law, not a
redesign — it targets the concrete gaps those passes left behind rather than re-doing what already
shipped.

## What shipped

### 1. Premium empty states that answer the triad (`components/ui/empty-state.tsx`, new)

The single biggest gap found: every panel that could be empty had invented its **own** local
`EmptyHint` function (`workspace-view.tsx`, `executive-dashboard.tsx`, `company-model-panel.tsx`)
or a bare `<Card>` with one gray sentence (`opportunity-list.tsx`, the guided assessment aside) —
plain text, no icon, no section identity, and critically **no "why does this matter"**. That fails
the triad by construction: a screen with a data gap and no consequence attached is decoration, not
consulting.

`EmptyState` is the new shared primitive (named explicitly in the AI Constitution's component
vocabulary) that:

- Reuses `SectionShell`'s tone vocabulary (`SECTION_TONE_SURFACE` / `SECTION_TONE_INK`, now
  exported from `section-shell.tsx` instead of forked) so an empty state carries the same section
  identity as the panel it sits in.
- Always has a slot for **why it matters** (`whyItMatters` prop, labeled with the existing
  `storyBeats.whyItMatters` — "Por qué importa" — i18n key, reused rather than duplicated).
- Composes only existing primitives: `.isalwa-icon-chip`, `Button`, the tone surface/ink classes.
  No new color, no new shadow, no new component system.

Wired into the three anchor surfaces named in the mission brief:

- **Knowledge empty** — `knowledge-center.tsx`: when a workspace has zero knowledge assets, shows
  why an empty knowledge base weakens every recommendation, instead of one gray sentence under the
  upload dropzone.
- **Twin empty** — `capability-digital-twin-panel.tsx`: when no capability has any evidence yet
  (discovery just started), one aggregate `EmptyState` above the ten-capability grid explains why
  we can't prioritize investment without it, instead of ten silent "not measured" badges with no
  framing.
- **Discovery empty** — `guided-assessment.tsx` (observations/"Hallazgos del consultor") and
  `opportunity-list.tsx`: replaced two stacked flat-white boxes (a static label card + a separate
  empty-message card) with one `EmptyState` each, and removed the redundant always-visible header
  boxes in favor of a plain kicker label that only shows once there is real content to label.

### 2. Calm progress motion — `stage-stepper.tsx`

The guided assessment's stage stepper only ever showed *which* stage chips had turned green —
there was no continuous sense of "how far along am I" the way `WorkspaceTabs`' section-progress
bar or `WelcomeBanner`'s understanding bar already give elsewhere in the app. Added the same
glaze→kiln gradient `.isalwa-risk-bar` + `motion.span` width animation pattern (verbatim reuse of
the pattern already shipped in `executive-dashboard.tsx`'s Business Health score) underneath the
stepper, with a plain-language "X de Y etapas cubiertas" caption. No new motion language — same
easing, same gradient, same bar component.

### 3. Mobile touch targets — `stage-stepper.tsx`

Stage chips grew from `py-2` to `py-2.5` so every tap target on the horizontally-scrolling mobile
stepper clears a comfortable ~44px height, without changing the compact desktop footprint.

### 4. Hierarchy — `welcome-banner.tsx`

The "¿Qué debo hacer hoy?" eyebrow above the primary CTA used the same muted slate as every other
label on the hero, so the one clear next action didn't visually outrank the metrics above it. It
now uses the law's glaze-deep ink at a bolder weight — a small, additive change (no new token, no
shared chrome.css edit) that makes the primary action read as primary.

### 5. Spacing rhythm — `workspace-view.tsx`

The `Separator` between the tab rail and the footer actions used `my-14` (56px) — off the law's
named rhythm-step vocabulary. Switched to `my-16` (64px, the same step already aliased in
`packages/ui/src/tokens/tokens.css` as `--isalwa-space-16`), matching the section-gap rhythm used
everywhere else on this page instead of an ad hoc Tailwind value.

### 6. Confirmed already-solid (no change needed)

Audited and found already consistent with the law, so left untouched to keep this a smaller PR:
`ContextBar` / `WorkspaceTabs` sticky offsets and horizontal gutters (both `-mx-6 px-6 sm:-mx-10
sm:px-10`, stacking cleanly at `top-0`/`top-11`), `SectionShell`'s header hierarchy
(kicker → Newsreader title → description), and the guided assessment's responsive grid (single
column below `xl`, generous full-width form fields).

## Constraints honored

- No functionality, data, routing, or consulting-engine changes — every edit is presentation
  (className/JSX composition) or new UI-chrome copy.
- No parallel design system — `EmptyState` composes `SectionShell`'s existing tone maps (now
  exported, not duplicated) and existing primitives (`Button`, `.isalwa-icon-chip`,
  `.isalwa-risk-bar`). No edits to `packages/ui/src/tokens/{tokens,chrome}.css` — every new visual
  detail reuses a token or class that already existed, so `apps/web` is unaffected.
- Frozen language preserved: porcelain, kiln, glaze, Newsreader italic titles, uppercase kickers,
  8px rhythm, soft elevation, calm motion — none replaced, none forked.
- Spanish client copy: new i18n keys added to both `lib/i18n/messages/{es,en}.ts` in parallel
  (`capabilityTwin.emptyState*`, `knowledgeCenter.emptyState*`). New copy inside
  `guided-assessment.tsx` / `opportunity-list.tsx` is hardcoded Spanish, matching that file's
  existing convention (it does not route any of its copy through `useTranslations()` today —
  preserved rather than partially converted, per "if unsure, preserve existing behavior").
- No mock/fabricated data — every `EmptyState` call site renders only when the underlying data is
  genuinely empty; no score, percentage, or evidence count was invented. Repo-wide fabrication
  sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`) on every changed file returned only
  pre-existing, legitimate matches (upload hint copy, "Qué entendemos…" labels).
- Client Mode / Consultant Mode boundary untouched — no tab visibility, route gating, or role check
  was modified.

## Public surface added

- `components/ui/empty-state.tsx` — `EmptyState({ icon?, tone?, title, whyItMatters?, actionLabel?,
  actionHref?, onAction?, className? })`. Reuse this for any future empty panel instead of writing
  another local `EmptyHint`.
- `components/workspace/section-shell.tsx` — `SECTION_TONE_SURFACE` / `SECTION_TONE_INK` now
  exported (previously module-private `TONE_SURFACE` / `TONE_INK`) so other primitives can share
  the same section-identity mapping instead of forking it.

## Deliberately out of scope (this pass)

Per the roadmap's own Phase 1 non-goals plus this pass's own scoping discipline (one mission,
smaller PRs over a large refactor):

- The remaining local `EmptyHint` implementations in `workspace-view.tsx` (recommendations tab),
  `executive-dashboard.tsx` (department health / systems), and `company-model-panel.tsx` (six
  sub-sections) were **not** migrated to `EmptyState` in this pass — they render correctly today
  and were not named as anchor surfaces in the mission brief (Knowledge / twin / discovery only).
  Migrating them is a natural, low-risk follow-up now that the primitive exists.
- No new intelligence engines, connectors, overnight jobs, chatbot chrome, or settings-first
  layouts (roadmap's explicit Mission 19 non-goals).
- No `packages/ui` token/chrome.css changes — this pass stayed inside Architect's own component
  tree; any future token additions (e.g. a bolder kicker variant) should go through a dedicated,
  cross-app-aware pass since `chrome.css`/`tokens.css` are shared with `apps/web`.
- Guided onboarding (`GuidedAssessment` identity phase) already renders through the same
  `AnsweringPanel` every other question uses (full-width fields, wrapping choice buttons) — no
  separate bespoke identity form exists to polish; confirmed already mobile-usable rather than
  rebuilt.

## Verification

- `pnpm typecheck` (`tsc -p tsconfig.json --noEmit`) — clean.
- `pnpm lint` (`eslint .`) — clean; the only warnings present are pre-existing and unrelated to
  this change (`lib/consulting/questions/index.ts`, `lib/knowledge/seed.ts`).
- `pnpm build` (`next build`) — succeeds; all 6 static/dynamic routes generate.
- Manual review of every changed file's rendered JSX for the new `EmptyState` call sites (tone,
  icon, copy) and the `StageStepper` progress bar math (`coveredCount` / `PROGRESS_STAGES.length`,
  excluding the `finish` meta stage).
- Repo-wide fabrication sweep on changed files — no new fabrication smell introduced.
- No `.env.local` or secret touched or committed.

## Definition of Done — checklist

- [x] Consistent UI — every new surface reuses an existing token/class; no duplicated component
  (this is a *consolidation*: three duplicated `EmptyHint` implementations now have one canonical
  successor for the surfaces that used it).
- [x] Mobile works — stage stepper touch targets widened; no new horizontal scroll introduced.
- [x] Accessibility preserved — `EmptyState` action buttons keep `Button`'s existing focus ring and
  keyboard reachability; no `aria-*` dropped from any composed primitive.
- [x] Types pass (`pnpm typecheck`).
- [x] Build passes (`pnpm build`).
- [x] Existing behavior unchanged outside the explicitly listed visual/copy edits.
- [x] Documentation updated — this file.

## Residual polish notes (for a future pass, not blocking this mission)

1. Migrate the three remaining `EmptyHint` call sites (`workspace-view.tsx`,
   `executive-dashboard.tsx`, `company-model-panel.tsx`) onto `EmptyState` for full consolidation.
2. Consider a dedicated cross-app token pass (touching `packages/ui`) if a bolder kicker weight or
   an additional section-identity hue is ever needed — do not add it ad hoc inside Architect alone.
3. Phase 2 (Mission 20 — Guided client journey) is the next item on the roadmap; do not begin it
   until this mission's changes have been in front of Álvaro at least once.
