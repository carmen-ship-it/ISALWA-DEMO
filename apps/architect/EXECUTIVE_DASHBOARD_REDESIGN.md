# Mission 13 — Executive Dashboard Redesign

**Status:** Complete
**App:** `apps/architect`
**Scope:** Presentation / reorder / restyle only — no functionality, business
logic, consulting engine, or data model changes.
**Extends:** Mission 9 (Premium Executive Design System — section-identity
tints, `SectionShell`), Mission 12 (Guided Executive Navigation —
`NextStepCta`, the Dashboard's "¿Qué debo hacer hoy?" hero pattern), and the
existing `lib/executive/` cockpit (`deriveExecutiveCockpit`,
`ExecutiveDashboardModel`).

## Goal

The Dashboard tab (`executive`) already contained every fact an executive
needs — health score, priorities, risks, discoveries, roadmap, recommended
systems, pending decisions — but it read like a feature list, not a
briefing: sections were interleaved in build order, competing CTAs appeared
twice, and nothing signaled what mattered most. This mission reorders and
restyles the existing dashboard into a fixed **consulting briefing order**,
with one large hero and a strict visual hierarchy after it. **No new data,
no invented priorities/risks, no logic changes** — every value rendered
below already existed in the pre-Mission-13 dashboard.

## Fixed briefing order

| # | Section | Source (unchanged) |
| --- | --- | --- |
| 1 | **Today's Focus** (hero) | `WelcomeBanner` — today's recommendation + Mission 12's primary/secondary CTA |
| 2 | **Business Understanding — progress** | `ConfidenceMeter` + `cockpit.score` + `model.maturity` + `model.consultingConfidence`, with department health / health gauges as secondary detail |
| 3 | **Top 3 Priorities** | `explainedRecommendations` (now/next) or `cockpit.priorities`, with quick wins / strategic opportunities as secondary support |
| 4 | **Critical Risks** | `cockpit.openRisks` |
| 5 | **Recent Discoveries** | `cockpit.recentDiscoveries` |
| 6 | **Roadmap Progress** | `cockpit.roadmap` (score + phases) |
| 7 | **Recommended Systems** | `model.investmentAreas` + `cockpit.automation` + `cockpit.aiReadiness` |
| 8 | **Upcoming Consultant Actions** | `cockpit.pendingDecisions` + the Mission 12 `NextStepCta` (role-aware: consultants also see the quiet "Preparar la próxima reunión" link) |

Everything else — the guided journey stepper, open questions, suggested next
meeting — is real content the app already showed, and it still appears, but
now **after** the eight briefing sections, visually quieter (smaller kicker,
placed below a divider), instead of interleaved with the primary story.

## What changed

### `components/workspace/section-shell.tsx` (extended)

Added an **opt-in** `size?: "default" | "hero"` prop (default `"default"`,
zero behavior change for the ~25 existing call sites). `size="hero"` scales
up the title (`text-4xl`/`text-5xl` vs `text-3xl`), description, icon chip,
and padding — the design-system-level primitive for "this is the one big
thing on the page," reused instead of forking a second hero component.

### `components/workspace/welcome-banner.tsx` (restyled)

- Its internal `SectionShell` now renders `size="hero"` — the Dashboard's
  "Today's Focus" is now visibly the largest surface on the page.
- Kicker changed from generic "Bienvenida" to `"1 · Enfoque de hoy"`,
  literally naming section 1 of the briefing order. No prop/behavior change.

### `components/workspace/executive/executive-dashboard.tsx` (reordered)

Rebuilt to render strictly in briefing order — sections 2 through 7 (section
1 and 8 live in `workspace-view.tsx`, where the page-level "what's next"
state already exists):

- Each section is a `SectionShell` with a numbered kicker (`"2 · Comprensión
  del negocio"` … `"7 · Sistemas recomendados"`) and the Mission 9
  section-identity tone that already matched its meaning (`health` for
  Business Understanding, `executive` for Priorities, `risks` for Critical
  Risks, `problems` for Recent Discoveries, `blueprint` for Roadmap,
  `processes` for Recommended Systems).
- Business Understanding now also renders the `ConfidenceMeter` (moved in
  from `workspace-view.tsx`, via a new optional `evidenceChips` prop — pure
  prop-threading, no new derivation) alongside the health score and
  maturity/evidence-quality tiles that already lived here, with department
  health and health gauges demoted to a secondary, visually distinct
  sub-block beneath a divider.
- Top 3 Priorities slices to exactly 3 (`explainedRecommendations` or
  `cockpit.priorities`, both already ordered by urgency) instead of the
  previous 4/unbounded lists, with quick wins and strategic opportunities
  rendered as smaller secondary support underneath.
- Recommended Systems is a new dedicated slot for `model.investmentAreas`
  (previously buried in a Q&A grid) plus the existing automation/AI-readiness
  progress cards.
- The redundant "Resumen en 30 segundos" Q&A grid was retired — every answer
  it gave is now a full, dedicated section above, so keeping both would have
  meant showing the same facts twice and working against "strong visual
  hierarchy."
- `cockpit.pendingDecisions` moved out of this component entirely — it now
  belongs to section 8, which needs page-level role/route context this
  component doesn't have.
- Overall section spacing increased (`space-y-16`) for the "large spacing"
  requirement.

### `components/workspace/workspace-view.tsx` (`executive` tab reordered)

- `executive` tab now renders, in order: `DiscoveryCelebration` → hero
  (`WelcomeBanner`) → `ExecutiveDashboard` (sections 2–7, now receiving the
  `evidenceChips` it needs) → section 8 (`SectionShell` "8 · Próximas
  acciones", role-aware title, `cockpit.pendingDecisions` via the new local
  `CockpitDecisionsList`, plus the existing Mission 12 `NextStepCta` moved
  down from the old bottom-of-page slot) → a visually demoted secondary block
  (guided journey, open questions, suggested next meeting) behind a divider.
- The old standalone "Resumen ejecutivo / Dónde estamos" `SectionShell` was
  removed — its `ConfidenceMeter` now lives inside section 2 of
  `ExecutiveDashboard` instead of duplicating the understanding story above
  it.
- The outer blue `SectionShell` that used to wrap the whole
  `ExecutiveDashboard` in one undifferentiated tone was removed so each of
  its six inner sections can carry its own Mission 9 tone.
- Client Mode is unchanged: `CLIENT_VISIBLE_TAB_IDS`/`session.role` gating
  was not touched, and section 8's consultant-only tertiary link still
  requires `isConsultant`, exactly as Mission 12 established.

## Honest empty states preserved

No section was given a fallback that invents data. Every list (`priorities`,
`openRisks`, `recentDiscoveries`, roadmap `phases`, `investmentAreas`,
`pendingDecisions`) still renders the same "Aparecerá a medida que crezca la
evidencia…" / role-appropriate empty copy that existed before this mission —
only the copy for the empty Recommended Systems state was written fresh
(section 7 didn't have its own slot before), and it follows the same honest,
non-inventive tone as the rest.

## Deliberately out of scope

- No changes to `lib/executive/` derivation (`cockpit.ts`, `derive.ts`,
  `priorities.ts`, etc.) — every value is read, never recomputed.
- No changes to other workspace tabs beyond removing the now-relocated
  `ConfidenceMeter` import from `workspace-view.tsx`.
- No new routes, props contracts beyond the two additive, optional ones
  (`SectionShell.size`, `ExecutiveDashboard.evidenceChips`).

## Verification

- `npm run typecheck` — clean.
- `npm run lint` — same 6 pre-existing warnings as Missions 11/12, in files
  this mission did not touch.
- `npm run build` — production build succeeds.
- Manually traced the Dashboard top-to-bottom for both roles: hero → 2
  Business Understanding → 3 Top 3 Priorities → 4 Critical Risks → 5 Recent
  Discoveries → 6 Roadmap Progress → 7 Recommended Systems → 8 Upcoming
  Consultant Actions → secondary content, confirming Client Mode hides the
  consultant-only meeting-prep link while everything else renders for both
  roles.
