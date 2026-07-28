# Mission 20 — Guided Client Journey & Executive Daily Brief

This mission shipped in two passes. Both are documented in full below — nothing from Part 1 was
removed or rewritten by Part 2.

- **Part 1 — Guided Client Journey** (`7724f85`): the always-on "what should I do next" voice
  (`next-step-voice.ts`), the persistent triad briefing (`triad-briefing.tsx`), and the discovery
  ceremony's click-through into the guided interview.
- **Part 2 — Executive Daily Brief** (this pass): replaces the Executive tab's hero
  (`WelcomeBanner`) with a senior-consultant-style daily briefing that answers, without a single
  click, "where are we", "what changed since my last visit", and "what should I do next" — built
  entirely by composing Part 1's own outputs plus real timeline/meeting/document evidence. See
  "Part 2" below for the full write-up.

## Part 1 — Guided Client Journey (Phase 2 · Effortless)

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

## Part 2 — Executive Daily Brief (presentation only)

**Status:** Complete.
**App:** `apps/architect`
**Scope:** Replace the Executive tab's hero (`WelcomeBanner`) with an Executive Daily Brief so a
CEO (Álvaro) answers, without clicking, "where are we today", "what changed since my last visit",
and "what should I do next" — composed entirely from Part 1's own outputs (`NextStepVoice`, the
Discovery Complete ceremony) plus the Missing Information Engine and real
timeline/meeting/document timestamps. **No** change to Discovery interview logic, the AI, the
Readiness Engine, Capability Twin derivation, Memory, or the Consulting Intelligence
cycle/notebook — every number and sentence in the brief is a read or a straightforward
composition of a field one of those engines already produced.

### What shipped

#### 1. `buildExecutiveDailyBrief()` — `lib/consulting-intelligence/daily-brief.ts` (new)

Composes four already-computed reports (`NextStepVoice`, `MissingInformationReport`,
`DiscoveryCompletionStatus`, and the workspace's own `businessUnderstanding` /
`timeline` / `meetings` / `knowledge.assets`) into an `ExecutiveDailyBrief`:

- `headline` — `"Hoy Architect entiende aproximadamente el {X}% de cómo opera {company}."`, X is
  the workspace's own published `businessUnderstanding`, rounded and clamped — never a second
  number.
- `sinceLastVisit` — real deltas only. Counts new `workspace.timeline` entries since the last
  visit (split into `meeting` / `knowledge` / other categories), plus the `businessUnderstanding`
  delta, against a **browser-local** "last visit" pointer (see `useLastVisit` below — not a
  workspace field, not read by any engine). Two honest fallbacks, never a guess: first-ever visit
  on this browser ("Este es el primer briefing ejecutivo que abrimos aquí…") and no real change
  since the last one ("Sin cambios registrados desde tu última visita.").
- `actions` — up to three, ranked. Slot one is `NextStepVoice`'s own top-ranked pick, unchanged.
  Any remaining slots are the Missing Information Engine's next-highest-impact opportunities
  (`missingInformation.opportunities`, already sorted by estimated lift) that are not the same
  topic as slot one — never a second ranking model, never padded to three when fewer genuinely
  rank. Impact labels (`~N min`, `+N%`) are shown **only** when an engine already computed that
  exact figure (the ceremony's `estimatedRemainingMinutes` for a single open capability, or the
  Missing Information Engine's `estimatedLiftPercent` for an opportunity) — never invented.
- `milestones` — the Discovery Complete ceremony's own `missingCapabilities` /
  `notTrackedCapabilities`, reduced to `{ label, state, detail }` for a glanceable row.
- `groupRecentLearning()` — the same `workspace.timeline` the Assessment tab already renders,
  grouped into Hoy / Ayer / Última semana / Anteriormente by real calendar distance from today —
  no event reclassified or reworded, only grouped.

Every Spanish sentence here is generated inside this file, same rule as `next-step-voice.ts` and
the rest of `lib/consulting-intelligence` / `lib/readiness` — never routed through `lib/i18n`.

#### 2. `useLastVisit()` — `hooks/use-last-visit.ts` (new)

A purely presentational, browser-`localStorage`-only pointer: `{ visitedAt, businessUnderstanding }`
per workspace. Read once per workspace mount (the *previous* snapshot, before this visit), then
immediately overwritten with the current one, so the *next* visit compares against *this* one.
Deliberately **not** a workspace field — Discovery, the Readiness Engine, the Capability Twin,
Memory and the Consulting Intelligence cycle have no concept of "a visit" and never will; this
hook exists solely so the brief can honestly answer "what changed since I last looked," including
the honest "first time" case when storage is empty or unavailable (private browsing, quota).

#### 3. `ExecutiveDailyBriefHero` + 3 supporting sections — `components/workspace/executive/executive-daily-brief.tsx` (new)

Four presentation components, each rendering only fields the caller already resolved — no
computation, no routing knowledge (same rule `next-step-voice.ts` established: the caller owns
every concrete href/tab-switch):

- `ExecutiveDailyBriefHero` — the new hero. Greeting (reuses `welcomeBanner.greeting`), the
  honest headline/brand-message description, the "Desde tu última visita" summary, up to three
  ranked action rows (message + optional impact pill + button), and the same continuous-consulting
  tagline `WelcomeBanner` used. An optional `onExplore` keeps the old "Ver resumen ejecutivo"
  scroll-to-dashboard affordance.
- `DailyBriefUnderstanding` — Business Understanding, calm animated progress. Wraps the existing
  `ConfidenceMeter` (already framer-motion animated) — no new progress primitive, no growth claim
  the number can't back up.
- `DailyBriefRecentLearning` — the Hoy/Ayer/Última semana/Anteriormente groups from
  `groupRecentLearning()`, rendered as the same simple event rows the Assessment tab already uses.
- `DailyBriefMilestones` — open-circle chips for `missingCapabilities` (amber, `CircleDot`) and
  `notTrackedCapabilities` (muted, `Circle`), each linking into the guided interview when a
  discovery dimension backs it (see `capabilityInterviewHref` below). Deliberately lighter-weight
  than `DiscoveryCompletionCard`, which remains mounted just below with the full ceremony detail
  and click-through — this is the glanceable summary, not a replacement for that card.

#### 4. Wiring — `components/workspace/workspace-view.tsx`

- The Executive tab's "1 · Today's Focus" hero is now `ExecutiveDailyBriefHero` +
  `DailyBriefUnderstanding` + `DailyBriefRecentLearning` + `DailyBriefMilestones`, in that order,
  followed by the unchanged `TriadBriefing` and `DiscoveryCompletionCard` — nothing from Part 1
  was removed, the brief sits in front of it.
- `dailyBrief = buildExecutiveDailyBrief({ workspace, nextStepVoice, missingInformation,
  discoveryCompletion, lastVisit })` and `recentLearning = groupRecentLearning(workspace)` are
  computed once per render, right next to the reports they depend on.
- The already-shipped "today's recommendations are ready" heuristic (`showTodaysRecommendations`)
  keeps overriding the primary action slot exactly as it overrode the old `WelcomeBanner` CTA —
  no behavior regression for that path.
- Every other ranked action/milestone resolves its href/onClick with the same helpers
  `nextStepHref`/`nextStepOnClick` already used (`dimensionToStage`, tab switches) — generalized,
  not duplicated.
- `capabilityInterviewHref()` (previously local to `discovery-completion-card.tsx`) is now
  exported and reused by the brief's milestone chips instead of a second copy.
- `WelcomeBanner` (`components/workspace/welcome-banner.tsx`) is deleted — fully superseded, no
  remaining caller.

### Constraints honored

- **No engine touched.** Discovery interview logic, the AI, the Readiness Engine, Capability Twin
  derivation, Memory, and the Consulting Intelligence cycle/notebook are all read-only inputs here
  — this pass added two new composition files (`daily-brief.ts`, `use-last-visit.ts`) and one new
  presentation file, the same pattern `next-step-voice.ts` established in Part 1.
- **No fake events, no invented progress.** Every "since last visit" count is a real timestamp
  comparison against `workspace.timeline` / `workspace.knowledge.assets`; when nothing changed,
  the brief says so honestly instead of manufacturing a delta. The Business Understanding
  animation is the existing `ConfidenceMeter`'s own calm width transition against the real
  percentage — not a growth animation implying progress that didn't happen.
- **No new scoring.** The "up to three" ranked actions are `NextStepVoice`'s existing top pick
  plus the Missing Information Engine's own pre-sorted `opportunities` list — never re-ranked,
  never a new weight.
- **"Continuar descubriendo" language preserved.** `DiscoveryCompletionCard`'s CTA copy
  (`discoveryCompletion.continueCta`) is untouched; the brief's own upload/focus-capability action
  labels reuse the same `common.continueEvaluation` ("Continuar descubriendo") vocabulary via the
  Missing Information Engine's existing topic labels.
- **Spanish, client-facing.** Every sentence Álvaro sees is Spanish, generated in
  `daily-brief.ts`; only chrome (`executiveDailyBrief.*` kickers/titles) went through
  `useTranslations()`, added to both `lib/i18n/messages/{es,en}.ts` in parallel.
- Repo-wide fabrication sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`) on every changed
  file returned only pre-existing, legitimate matches (upload example copy, "entendemos" substring
  matches) — same result Part 1 recorded.
- No `.env.local` or secret touched or committed. Mission 24 work-in-progress on disk was stashed
  before this pass started and restored (still uncommitted) after it shipped.

### Deliberately out of scope (this pass)

- **`welcomeBanner.focusHintQuestion` / `focusHintMeeting` / `focusHintDefault` /
  `todayRecommendationLabel` / `whatToDoToday` / `estimatedTime`** are now unused (the hero they
  served was deleted) but left in `lib/i18n/messages/{es,en}.ts` rather than deleted, same
  "keep this diff focused" call Part 1 made for `todayCtaDescriptionContinue` — safe to remove in
  a future cleanup pass.
- **`DiscoveryCompletionCard` and `TriadBriefing` were not merged into the new brief component.**
  Both remain separate, unchanged surfaces directly below the brief — the brief's own "Next
  Milestones" row is intentionally a lighter summary of the same data, not a replacement for the
  ceremony card's full detail and click-through.
- **No overnight digest, no Mission 21–24 signal** was read or referenced — this pass only reads
  reports already computed synchronously by `WorkspaceView` per render.

### Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are the same two pre-existing, unrelated files
  Part 1 and Mission 19 already noted (`lib/consulting/questions/index.ts`, `lib/knowledge/seed.ts`).
- `npx next build` — succeeds; all routes generate, including `/workspace/[id]`.
- Repo-wide fabrication sweep on every changed file — no new fabrication smell introduced.
- No `.env.local` or secret touched or committed.

### Definition of Done — checklist

- [x] Executive tab hero answers "where are we / what changed / what's next" without a click.
- [x] "Desde tu última visita" shows real deltas or an honest empty state — never invented.
- [x] "Hoy te recomiendo" shows up to three ranked, evidence-backed actions — never padded.
- [x] Business Understanding shows the existing % with calm animated progress — no invented growth.
- [x] Recent Learning groups real timeline entries into Hoy/Ayer/Última semana honestly.
- [x] Next Milestones shows open circles for real missing/not-tracked capabilities.
- [x] "Continuar descubriendo" language preserved throughout.
- [x] No Discovery/AI/Readiness/Twin/Memory/Consulting-cycle logic modified.
- [x] Typecheck/lint/build clean.
- [x] `apps/architect/MISSION20.md` updated (this section) without deleting Part 1.
- [x] Never `.env.local`; Mission 24 WIP stashed before, restored (uncommitted) after.
- [x] No dead component left mounted twice — `WelcomeBanner` deleted, fully superseded.
