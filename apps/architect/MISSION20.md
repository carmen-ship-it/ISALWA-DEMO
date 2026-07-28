# Mission 20 — Guided Client Journey (Phase 2 · Effortless)

**Status:** Complete (first sequenced pass — see "Deliberately out of scope").
**App:** `apps/architect`
**Scope:** Compose existing engines into one always-on "what should I do next" voice and a
persistent triad briefing; add a real click-through from the discovery ceremony into the guided
interview. No new scoring model, no new engine, no chatbot.
**Plan:** `Product Polish Roadmap (Missions 19–24)`, Phase 2.
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`.
**Follows:** Mission 19 (`35cd964`) — premium empty states, calm progress motion, hierarchy polish.

## Product Principle (restated, governs every change below)

**Architect should never feel like software.** It should feel like a senior consulting team that
happens to live inside software. Every screen must answer:

1. **What do we know?**
2. **What are we trying to learn?**
3. **Why does it matter to the business?**

Tagline: *"Architect becomes more intelligent every time your company shares knowledge."*

Mission 20's own test: does the client ever have to wonder "what do I do now"? If a primary
surface still shows a generic "continuar evaluación" with no connection to what is actually
missing, that surface fails this mission.

## What shipped

### 1. The always-on next-step voice — `lib/consulting-intelligence/next-step-voice.ts` (new)

`buildNextStepVoice()` composes four reports every primary workspace surface already computes
(`ReadinessAssessment`, `MissingInformationReport`, the Blueprint `ReadinessGate`, and the
Discovery Complete/Incomplete ceremony's `DiscoveryCompletionStatus`) into **one** ranked Spanish
sentence plus the single action it implies — never a percentage alone, never a second scoring
model. Ranking, highest priority first:

1. Genuinely nothing left to chase → the honest "ya conocemos bien el negocio" note.
2. The Blueprint itself can be presented → "Ya puedes generar el Blueprint del negocio." (the
   biggest reward available outranks a smaller open gap elsewhere).
3. Exactly one capability stands between here and a complete diagnosis → "Solo faltan ~N
   minutos — a Finanzas le falta una respuesta." (the productized examples from the roadmap
   brief).
4. Several gaps remain → the Missing Information Engine's own highest-impact opportunity,
   phrased as an upload ("Sube el manual de empleados…") when a document could close it, or a
   conversation nudge otherwise.
5. Fallback → readiness itself is not ready yet and nothing more specific ranked above.

`NextStepVoice` returns `{ message, actionLabel, actionKind, focusDimension }` —
`actionKind` is one of `continue_interview | focus_capability | upload_document |
review_blueprint | none`. The caller (`workspace-view.tsx`) already owns every concrete
href/tab-switch (`interviewHref`, `setTab("knowledge")`, `setTab("blueprint")`), so this module
never depends on routing or component state — it only ranks and speaks.

### 2. Ceremony click-through into the guided interview (the receipt gap this mission named)

- **`lib/discovery-agent/capabilities.ts`** — added `capabilityDimensions(id)`, a one-line lookup
  into the existing `CAPABILITY_DEFINITIONS` table (no new taxonomy).
- **`app/discovery` (`components/discovery/guided/guided-assessment.tsx`)** — the guided interview
  now reads an optional `?stage=<GuidedStageId>` query param. Once the interview has resolved past
  identity/company onboarding into its adaptive question phase, it calls the **same**
  `switchToStage()` the stepper's free stage navigation already uses — no second "resume"
  mechanism, no new engine call. Applied once per page load (a ref, not `activeStageId`, tracks
  this) so a client who later picks a different stage from the stepper is never pulled back to the
  link's original target.
- **`components/workspace/executive/discovery-completion-card.tsx`** — every row in "Todavía
  estamos confirmando" (`missingCapabilities`) is now a real click-through
  (`/discovery?workspaceId=…&stage=…`), built from `capabilityDimensions()` +
  `dimensionToStage()` (the same lookup the guided stepper already owns). Keyboard-reachable
  (`<Link>`, visible focus ring), with a chevron affordance and an accessible `title`. Rows with no
  backing discovery dimension (`Legal`, `Cumplimiento` — never shown in this list anyway, since
  they are `notTrackedCapabilities`) simply render without a link, never a dead "#" href.

### 3. The persistent triad briefing — `components/workspace/executive/triad-briefing.tsx` (new)

`docs/PRODUCT_CONSTITUTION.md` names three permanent client questions every screen must answer.
`TriadBriefing` is the one place that states all three at once, every time a client opens the
Executive tab (the primary landing surface for both Client Mode and Consultant Mode) — mounted
directly under Today's Focus, before the discovery ceremony card:

- **Qué sabemos** ← the Capability Digital Twin's own headline (`capabilityTwin.headline`).
- **Qué estamos tratando de entender** ← the Missing Information Engine's own detective headline
  (`missingInformation.headline`).
- **Por qué importa** ← the top-ranked opportunity's `rationale` (`TOPIC_STAKES`,
  `lib/readiness/topics.ts` — a business-consequence sentence that already existed) or, once there
  is nothing left to rank, the ceremony's own continuity note.

Composes only existing primitives (`SECTION_TONE_SURFACE`/`SECTION_TONE_INK` from
`section-shell.tsx`, `.isalwa-icon-chip`) — no new colors, no new component system, no
recomputation of any kind.

### 4. Wiring — `components/workspace/workspace-view.tsx`

- `nextStepVoice` is computed once per render, right next to the `blueprintGate` it depends on,
  and now drives:
  - `WelcomeBanner`'s primary CTA (`continueHref`/`continueLabel`) when the pre-existing "today's
    recommendations are ready" heuristic (`showTodaysRecommendations`) does not already apply —
    replacing what used to be a permanently generic "Continuar evaluación" with the specific,
    ranked next step (including a deep link into the exact missing capability when that is the
    highest-priority signal).
  - The Executive tab's closing "Upcoming Consultant Actions" `NextStepCta` (same href/label,
    plus the voice's own sentence as the description when there is nothing more specific to
    review).
  - The Assessment tab's two `NextStepCta` blocks — only when the voice's action is itself
    "answer more questions" (`continue_interview` / `focus_capability`); an upload or Blueprint
    nudge stays on its own tab rather than mislabeling this one.
  - `ContextBar`'s persistent `nextGoal` strip — visible on every tab, not just the dashboard, so
    the one-line answer to "what's next" now travels with the client around the whole workspace.
- `DiscoveryCompletionCard` now receives `workspaceId` to build its click-throughs.
- `TriadBriefing` is mounted once, right under Today's Focus, fed from the same
  `capabilityTwin` / `missingInformation` / `discoveryCompletion` already computed above it.

## Constraints honored

- **No second scoring model.** `next-step-voice.ts` takes four already-computed reports as input
  and never calls a readiness/confidence formula itself — it ranks and phrases, nothing else.
- **Extend, don't fork.** The interview deep link reuses `switchToStage()` (the exact function the
  stepper's own free navigation already calls) instead of inventing a second "resume at stage X"
  path. The triad briefing reuses `SectionShell`'s tone maps (exported since Mission 19) instead of
  a new color system. `capabilityDimensions()` reads the same `CAPABILITY_DEFINITIONS` table the
  Capability Digital Twin already owns.
- **Spanish client copy generated inside the engine.** Every string `next-step-voice.ts` produces
  is hardcoded Spanish inside that module, same rule as the rest of `lib/readiness` /
  `lib/consulting-intelligence` — never routed through `lib/i18n`. Only chrome (the triad's three
  kickers, a link `title` attribute) went through `useTranslations()`, added to both
  `lib/i18n/messages/{es,en}.ts` in parallel.
- **No mock/fabricated data.** Every sentence in `next-step-voice.ts` and `TriadBriefing` is a
  direct read or a straightforward composition of a field another engine already produced this
  same render — no invented percentage, no guessed capability.
- **Client Mode / Consultant Mode boundary untouched.** No tab visibility, route gating, or role
  check was modified; the triad briefing and the ceremony click-through render on the Executive tab,
  already visible to both roles.
- Repo-wide fabrication sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`) on every changed
  file returned only pre-existing, legitimate matches (upload example copy, "entendemos" substring
  matches).

## Public surface added

- `lib/consulting-intelligence/next-step-voice.ts` — `buildNextStepVoice(input)`, exported from
  `lib/consulting-intelligence`. Reuse this for any future "what should I do next" surface instead
  of writing another ad hoc heuristic.
- `lib/discovery-agent/capabilities.ts` — `capabilityDimensions(id)`.
- `components/workspace/executive/triad-briefing.tsx` — `TriadBriefing({ whatWeKnow,
  tryingToLearn, whyItMatters, className? })`.
- `/discovery` now accepts an optional `?stage=<GuidedStageId>` query param (`welcome | company |
  commercial | operations | finance | technology | people | review | finish`; only stages with
  real discovery dimensions actually redirect the adaptive engine — meta stages are ignored).
- `DiscoveryCompletionCard` now accepts an optional `workspaceId` prop to enable click-through.

## Deliberately out of scope (this pass)

Per the roadmap's own Phase 2 non-goals plus this pass's scoping discipline (one mission, smaller
PRs over a large refactor):

- **Not every tab's `NextStepCta` was rewired to the voice.** Knowledge, Blueprint, Company,
  Recommendations, Roadmap, and the other tabs keep their existing (already reasonable, already
  tab-specific) CTA copy. The voice now drives the two tabs a client actually lands on first
  (Executive, Assessment) plus the persistent context bar — a natural follow-up would extend it to
  the remaining tabs once this pass has been in front of Álvaro.
- **The triad briefing is mounted once** (Executive tab, under Today's Focus) rather than on every
  tab. It is genuinely persistent in the sense that it is the first thing seen on every workspace
  visit, but a future pass could add a compact version to the Assessment tab too.
- **No LLM chat sidebar, no parallel "coach" product, no task-manager UX** (explicit Phase 2
  non-goals) — the next-step voice is a single composed sentence + one button, never a checklist
  UI or a conversational surface.
- **The remaining local `EmptyHint` implementations** (`workspace-view.tsx` recommendations tab,
  `executive-dashboard.tsx`, `company-model-panel.tsx`) were **not** migrated to `EmptyState` in
  this pass — Mission 19 already logged this as a residual note and it does not clearly serve
  Mission 20's own scope, per this mission's brief ("migrate remaining EmptyHint→EmptyState only if
  it clearly serves Mission 20").
- **No new intelligence engines, connectors, overnight jobs** (Phase 3 territory — Missions 21–24
  are explicitly frozen until this mission has been used at least once).
- **`workspaceView.executive.todayCtaDescriptionContinue`** is now unused (superseded by
  `nextStepVoice.message`) but was left in `lib/i18n/messages/{es,en}.ts` rather than deleted, to
  keep this diff focused — safe to remove in a future cleanup pass.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are pre-existing and unrelated to this change
  (`lib/consulting/questions/index.ts`, `lib/knowledge/seed.ts` — same two files Mission 19 also
  noted).
- `npx next build` — succeeds; all 6 static/dynamic routes generate.
- Manual trace of the ranking logic in `buildNextStepVoice()` against each of the roadmap's five
  productized examples ("Solo faltan ~2 minutos", "Ya sabemos suficiente de Ventas", "Sube tu
  manual de empleados", "Ya puedes generar el Blueprint", "A Finanzas le falta una respuesta") —
  each maps to one of the five ranked branches.
- Manual trace of the `?stage=` deep link against `GUIDED_STAGE_ORDER` / `GUIDED_STAGES` — a
  meta stage (`welcome`, `company`, `review`, `finish`) or an unrecognized value is a no-op, never
  a broken state.
- Repo-wide fabrication sweep on changed files — no new fabrication smell introduced.
- No `.env.local` or secret touched or committed.

## Definition of Done — checklist

- [x] Every primary client surface (Executive tab hero, Executive tab closing CTA, Assessment tab,
  persistent context bar) shows one clear next action derived from readiness/missing-info/ceremony.
- [x] The ceremony card jumps into discovery, filtered/focused on the missing capability, reusing
  free stage navigation (no second resume mechanism).
- [x] A persistent client-facing triad briefing (Know / Trying to learn / Why it matters to the
  business), composed from the twin + missing-information + consequence/why — no new scoring.
- [x] `apps/architect/MISSION20.md` (this file).
- [x] Typecheck/lint/build clean.
- [x] Never `.env.local`; no Mission 21–24 work started.
- [x] Consistent UI — every new surface reuses an existing token/tone/class; no duplicated
  component.
- [x] Mobile works — `TriadBriefing`'s grid collapses to one column below `sm`; the ceremony's new
  link rows keep the same touch target size as before.
- [x] Accessibility preserved — the ceremony's new click-through rows are real `<Link>`s with a
  visible focus ring and an accessible `title`; nothing lost `aria-*` from a composed primitive.
- [x] Existing behavior unchanged outside the explicitly listed voice/click-through/briefing
  additions.
