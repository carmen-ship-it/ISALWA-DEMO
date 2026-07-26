# Mission 10 — 100% Spanish Client Experience

Goal: the entire client-facing Architect product (everything Álvaro sees in
Client Mode, plus the shared engines that generate it) reads as if it were
originally designed in Spanish. This document records what was translated,
what was fixed alongside the translation sweep, and any intentional English
left behind.

## What changed

### 1. Translation sweep (deep panels + generation engines)

Shell strings were already Spanish going into this mission. This pass hunted
English still leaking from the engines that generate client-visible content:

- **Consulting intelligence** — `lib/consulting/{risk,patterns,health,maturity,
  confidence,opportunities,recommendations,whiteboard,contradictions,evaluate}.ts`:
  risk titles/business impact/mitigations, blind-spot patterns, health &
  maturity dimension labels and evidence prose, opportunity titles/impacts,
  contradiction claims, meta-confidence notes.
- **Explanations** — `lib/explanations/{business-value,confidence,
  recommendation}.ts`: business-value sentences, confidence factor chips,
  recommendation rationale.
- **Deliverables** — `lib/deliverables/{exports,executive-summary,
  cursor-context,backlog,prd,sow}.ts`: export contract copy, executive
  recommendation fallback, the full "Resumen de construcción" (Cursor
  Context) document, sprint backlog epics/stories, PRD goals/requirements/
  acceptance criteria, implementation-plan phases.
- **Brand & Experience Studio** — `lib/brand/{brand-profile,experience-profile,
  theme,derive,design-tokens,terminology,future-intake}.ts`: voice/tone/
  positioning reasoning, employee vision, software expectations, onboarding
  style, theme rationale, design-token reasoning (color/typography/spacing/
  radius/elevation), regional-format and notification-preference reasoning,
  terminology entries.
- **Company Model (digital twin)** — `lib/company-model/{derive,health,
  actors}.ts`: twin summary/reasoning, operating-model health notes.
- **Solution & Process engines** — `lib/solution/{modules,entities,
  configuration}.ts`, `lib/processes/{automation,bottlenecks,handoffs}.ts`:
  module/entity purposes, automation candidates, bottleneck titles/impacts,
  handoff gaps.
- **Reasoning & catalog** — `lib/reasoning/{industry/detect,
  observations/insights,recommendations/opportunities}.ts`, `data/catalog.ts`:
  insight cards, opportunity cards, industry labels/focus areas/starter
  questions, future-capability copy.
- **Knowledge** — `lib/knowledge/{connectors,seed}.ts`: connector
  descriptions, ISALWA pilot seed knowledge summary/themes/titles.
- **Discovery report engine** — `domain/report.ts` (confirmed active and
  client-visible, not legacy): modules, roadmap, department analysis,
  workflows, recommendations, risks, executive summary/conclusion.
- **Real interview pipeline** — `lib/memory/apply-interview.ts`: meeting
  titles, timeline event titles (Blueprint/Solution/Processes/Brand/Company
  Model/Deliverables/Implementation Package), meeting summaries, next-meeting
  suggestions, activity labels. This is the engine that fires on **every
  real interview**, not just the ISALWA seed.
- **Pilot seed** — `lib/workspace/seed.ts`: timeline, meeting, module,
  recommendation, and document copy for the `ws_isalwa` pilot workspace.
- **Presentation layer** — `lib/presentation/executive-language.ts` grew
  several new label maps/functions (`timelineEstimateLabel`, `themeModeLabel`,
  `logoKindLabel`, `logoStatusLabel`, `colorTokenRoleLabel`,
  `typographyRoleLabel`, `navigationPatternLabel`, `motionPreferenceLabel`,
  `fontScaleLabel`, `roleLabel` gained `Operator`) so remaining enum-like
  values render in Spanish without touching engine logic.
- **Report view** — `components/report/report-view.tsx`,
  `components/workspace/{deliverables-panel,implementation-package-panel,
  brand-experience-panel}.tsx`: applied the label functions above at render
  time.

Pattern used throughout: internal identifiers / enum values stay as English
keys (e.g. `"Sales to Order"`, `BlueprintCapabilityName`, `DocumentKind`)
where they're strict literal unions or matched by other engine logic; a
`*Label()` lookup in `lib/presentation/` renders the Spanish word at the UI
boundary. `lib/blueprint/derive.ts` in particular already had this pattern
fully built out (`capabilityPurposeLabel`, `workflowNameLabel`, `triggerLabel`,
`stepNameLabel`, `actorNameLabel`, `entityLabel`, `ruleStatementLabel`,
`systemPurposeLabel`, `replacementStrategyLabel`, `opportunityTitleLabel`,
`opportunityDescriptionLabel`) — verified end-to-end rather than duplicated.

### 2. P0 fixes shipped alongside the sweep

**Roles verified, not inverted.** `lib/auth/constants.ts`,
`supabase/migrations/002_link_pilot_users.sql`, and `workspace-view.tsx`
(`session?.role === "consultant"` gates the full dashboard) all agree: Carmen
= consultant/admin, Álvaro = client. Client Mode restricts tabs to
`CLIENT_VISIBLE_TAB_IDS` (Resumen, Cómo funciona su empresa, Su empresa,
Conocimiento, Perspectivas, Recomendaciones, ¿Qué pasa si…?, Plan de
implementación, Documentos) and hides Diagnóstico / Sistema recomendado /
Cómo opera, which stay consultant-only.

**Button contrast root cause fixed.** `styles/globals.css` had `a { color:
inherit }` (and other base resets) declared **outside** any `@layer` block.
In Tailwind v4, unlayered CSS always beats layered utilities regardless of
source order — so any `asChild`/`Link`-based `Button` (e.g. the primary CTA
next to "Ver resumen ejecutivo") silently lost its `text-white` and inherited
the ambient dark ink color, producing dark-on-dark text on the kiln-colored
button. Fix: wrapped the reset rules in `@layer base { ... }` so utility
classes win again, as Tailwind expects. No colors, spacing, or visual
language changed — this is a cascade-order fix only.

**English leak in "Recomendación de hoy" / SIGUIENTE.** The
`executiveRecommendation` fallback in `lib/deliverables/executive-summary.ts`
was already corrected to Spanish in this mission's WIP; this pass confirmed
the fix is present and will ship with this commit (previous sighting was a
stale deploy, not a code bug).

**Fake-progress / mock-data honesty.**
- `lib/executive/derive.ts` — the daily journey checklist marked "Arquitectura
  generada" and "Software recomendado" as ✅ **complete** purely because a
  blueprint/solution/deliverables object existed, even when
  `businessUnderstanding` was still low (e.g. ~20%). Gated both steps behind
  the same 40% real-evidence threshold already used by "Negocio comprendido",
  and softened their copy to "Borrador inicial…" / "…por confirmar con más
  evidencia" below that bar. Nothing was invented — the underlying
  blueprint/solution/deliverables are real, deterministic derivations from
  the seeded facts; they just now honestly read as drafts until evidence
  supports calling them done.
- **Percent-scale doubling bug** (0–100 already, then `* 100` again):
  - `lib/deliverables/executive-summary.ts` — `currentState` fallback showed
    `Madurez ${maturity.overall * 100}%` where `maturity.overall` is already
    0–100, so a real 65 rendered as 6500%.
  - `lib/explanations/confidence.ts` — `consulting.confidence.overall` and
    `consulting.confidence.evidenceDensity` (both 0–100) were multiplied by
    100 again in the "factors" evidence chips.
  - `lib/simulation/signals.ts` — `understanding` passed `businessUnderstanding`
    (0–100) straight into a `[0,1]` clamp without dividing by 100 first, so
    any real workspace saturated to 100% understanding inside the ¿Qué pasa
    si…? simulator (this was a previously documented, deliberately-deferred
    gap in `EXECUTIVE_SIMULATOR.md`; fixed here per explicit instruction).
  - Verified the sibling 0–1-scale fields (`ConsultingRisk.confidence`,
    `ConsultingOpportunity.confidence`, `SolutionModule.confidence`,
    `SimulationConfidence.score`) were *not* touched — their `* 100` is
    correct.
- **"Su empresa" tab spacing** — verified `WORKSPACE_TABS` in
  `components/workspace/workspace-tabs.tsx` correctly stores `"Su empresa"`
  with a space and renders it as plain text in a `<button>` with no
  whitespace-collapsing styles. No code bug found; the earlier screenshot is
  most likely a font-rendering/zoom artifact, not a string bug.

## What is mock vs. real (ISALWA pilot workspace)

- **Real, computed data:** `businessUnderstanding`, blueprint, solution
  architecture, business processes, brand/experience model, company model,
  deliverables, and the implementation-package gate are all produced by the
  same deterministic engines used for every real client — seeded from a
  small, explicit set of facts/pain points/questions for ISALWA
  (`lib/workspace/seed.ts`), not hardcoded scores or canned screenshots.
  Because that seed evidence is intentionally thin, understanding legitimately
  comes out low (~20%) — that's an honest reflection of a pilot with only one
  discovery session recorded, not a bug.
- **What was dishonest before this pass:** the journey checklist claiming
  "Arquitectura generada" / "Software recomendado" were fully done regardless
  of that low understanding score, and the doubled-percentage bugs above
  that could show nonsensical numbers (e.g. 6500%) or a saturated 100%
  understanding in the simulator. Both are fixed.
- **Still worth a follow-up mission:** the seed derives a *full* blueprint /
  solution / deliverables package on very little seeded evidence. That is
  real engine output (not decorative), but a future mission could consider
  thinning the ISALWA seed further or extending the same evidence-threshold
  gating pattern used in `lib/executive/derive.ts` to other panels, so every
  surface — not just the journey checklist — visibly reflects discovery
  depth.

## Intentional English left behind

- **Internal identifiers / enum values** used as strict literal unions or
  matched by regex/engine logic (e.g. `BlueprintCapabilityName`,
  `DocumentKind`, `MotionPreference` raw values, industry `keywords[]` in
  `data/catalog.ts`, capability/department/entity canonical names in
  `lib/blueprint/derive.ts`). These are translated at the presentation layer
  via `*Label()` functions in `lib/presentation/`; changing the identifiers
  themselves would risk breaking type-level matching for no user-visible
  gain.
- **`lib/documents/placeholders.ts`** (`DOCUMENT_KIND_LABELS`,
  `FUTURE_INTAKE_HOOKS`) — future/designed-only scaffolding, not imported by
  any component today. Left in English; translate when it ships to a panel.
- **`lib/solution/roles.ts`, `lib/blueprint/derive.ts` internal system/
  workflow prose consumed only by `solution-architecture-panel.tsx`** — this
  panel lives on the "Sistema recomendado" tab, which is Consultant Mode only
  (`CLIENT_VISIBLE_TAB_IDS` excludes it). Álvaro never sees it. Lower
  priority than client-visible surfaces; left as-is for this mission.
- **`/preparation` route** (`lib/preparation/*`) — consultant-only
  (`CONSULTANT_ONLY_PATHS`), Álvaro cannot navigate there. A few internal
  evidence-note strings remain English; not part of the client walkthrough.
- **ISALWA, Architect, module/proper nouns, code comments, throw messages
  never rendered to a user** — unchanged, per the mission brief.

## Verification

- `npx tsc --noEmit` — clean.
- `npx eslint .` — only pre-existing warnings in files untouched by this
  mission (`lib/consulting/questions/index.ts`,
  `components/workspace/executive/discovery-journey.tsx`), unrelated to this
  change set.
- Manual trace of a normal Álvaro walkthrough (Resumen → Cómo funciona su
  empresa → Su empresa → Conocimiento → Perspectivas → Recomendaciones →
  ¿Qué pasa si…? → Plan de implementación → Documentos) against the engines
  above — no remaining English strings found beyond the intentional list.
