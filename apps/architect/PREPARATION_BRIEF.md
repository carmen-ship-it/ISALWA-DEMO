# Consultant Preparation Brief — UI wiring

**Status:** Complete (presentation only)
**App:** `apps/architect`
**Depends on:** Mission 11 `lib/preparation/` (unchanged) · Mission 2 Company Memory · Mission 10 Auth

## Goal

Give Carmen (consultant) a single screen to review before joining any
meeting — everything the Architect already knows, everything it doesn't,
and a one-click way into the interview. **No new intelligence was added.**
Every field below is read directly from the existing `prepareCompany()`
engine or from `CompanyWorkspace` — nothing is computed, scored, or
invented in this mission.

## What was built

| File | Role |
| --- | --- |
| `components/workspace/preparation-brief-panel.tsx` | Presentational panel. Calls `prepareCompany(workspace)` (Mission 11, unchanged) and `buildResumeBriefing(workspace)` (Resume Engine, unchanged) and renders their output. No business logic. |
| `components/preparation/preparation-brief-view.tsx` | Page shell — loads the `CompanyWorkspace` by `workspaceId` query param (same pattern as `components/report/report-view.tsx`), handles loading/not-found states, renders `PreparationBriefPanel`. |
| `app/preparation/page.tsx` | Thin route (`/preparation?workspaceId=...`), `Suspense`-wrapped like `/report`. |
| `lib/auth/constants.ts` | Added `"/preparation"` to `CONSULTANT_ONLY_PATHS` (one line) — reuses the existing middleware role gate, the same mechanism that already protects `/companies`. Clients are redirected before the page ever renders. |
| `components/nav/architect-nav.tsx` | Added an optional `preparationHref` prop. When present **and** `session.role === "consultant"`, a "Brief de preparación" nav link appears. Clients never see it (prop is simply omitted from the client's item list). |
| `components/workspace/workspace-view.tsx` | One-line addition: passes `preparationHref={\`/preparation?workspaceId=${workspace.id}\`}` to the existing `<ArchitectNav>` call. No tabs, panels, or existing behavior were touched. |

Total footprint in `workspace-view.tsx`: **3 added lines**, to minimize
collision with the parallel Client Mode / Spanish workspace effort.

## Carmen's entry path

1. Carmen opens a company workspace (`/workspace/[id]`) — already logged in as consultant.
2. The top nav now shows **"Brief de preparación"** (consultant-only).
3. Clicking it opens `/preparation?workspaceId=<id>` — the brief.
4. She reviews the sections below, then clicks **"Iniciar entrevista"**.
5. That button links to the same `/discovery?workspaceId=<id>` href already used everywhere else in the app (`workspace-view.tsx`, `welcome-banner.tsx`, `next-step-cta.tsx`). Nothing about the discovery/interview route was touched — this mission does not compete with any in-flight Guided Assessment work.

Álvaro (client role) never sees the nav link, and direct navigation to
`/preparation` as a client is redirected by middleware before render
(same mechanism that already protects `/companies`).

## Field mapping (engine output → UI section)

| UI section (Spanish label) | Source | Notes |
| --- | --- | --- |
| Company Summary — "Antes de reunirse con…" / "Lo que ya sabemos" | `prep.interviewOpening`, `prep.confidence.approximatePercent`, `prep.coverage.averagePercent`, `prep.alreadyKnown`, `prep.potentialQuickWins`, `prep.potentialMissingSystems` | `interviewOpening` is the exact Spanish sentence Mission 11 already generates. Quick wins / missing systems are shown as secondary chips inside the same section since they're genuine engine output, not part of the mission's explicit list. |
| People attending — "Personas que participan" | `workspace.people` | Raw `Person[]` from the workspace — no filtering by "attending" flag because `Person` has none. Shows name/role/department. |
| Previous meetings — "Reuniones anteriores" | `workspace.meetings` | Sorted newest-first (display-only sort, not new intelligence). Shows title, date, summary, discovery/question counts. |
| Open questions — "Preguntas abiertas" | `prep.questionsToValidate` | Engine's own "to validate" list. |
| Known risks — "Riesgos conocidos" | `prep.likelyRisks` | Engine's consulting-risk + pain-point-derived risks. |
| Contradictions — "Puntos que requieren aclaración" | `workspace.conversationMemory.contradictions` | Reused as-is from `ConversationMemory` (Mission 5/consulting) — `lib/preparation` does not re-expose contradictions, so this reads the same field the Living Whiteboard already renders. |
| Recommended agenda — "Orden recomendado para la reunión" | `prep.departmentsRequiringAttention` | This is literally the engine's own "coverage below 40%" list (already labeled and ordered inside `company-brief.ts`); relabeled as an agenda, not re-derived. |
| Estimated meeting time — "Duración estimada" | `buildResumeBriefing(workspace).estimatedMinutesRemaining` | Existing Resume Engine function (`lib/resume/engine.ts`), already used by `WelcomeBanner`. Not part of `lib/preparation`, but equally pre-existing/deterministic — not invented for this mission. |
| Priority unknowns — "Incógnitas prioritarias" | `prep.unknownAreas` | Engine's own unknown-areas list. |
| Start Interview — "Iniciar entrevista" | n/a (navigation only) | Links to the existing `/discovery?workspaceId=` route used everywhere else. |

## Honest gaps (engine limitations — not faked)

- **No "attending" flag.** `Person` has no meeting-attendance field, so
  "People attending" shows all known contacts for the company, not a
  per-meeting attendee list. `Meeting.participants` (string names) is shown
  inside each meeting card instead.
- **No structured recommended-agenda concept in the engine.** Mission 11
  never built one. We reused `departmentsRequiringAttention` (already an
  ordered, engine-computed list of low-coverage topics) rather than invent
  a new ranking — this is the closest honest match to "agenda."
- **Contradictions aren't part of `PreparationBrief`.** They come from
  `ConversationMemory.contradictions` directly, since Mission 11 explicitly
  scoped `lib/preparation` to knowledge/memory merge, not contradiction
  detection (that lives in `lib/consulting/contradictions.ts`, untouched).
- **Empty states are honest, not placeholder copy.** Every section checks
  its array length and shows a plain Spanish sentence (e.g. "No se
  detectaron contradicciones en la información disponible.") instead of
  sample/lorem content.
- **`impliedSourceKinds` / `futureSources`** (Mission 11 contracts-only
  fields) are intentionally **not** surfaced — they describe future intake
  sources with no runtime data behind them yet, so showing them would risk
  implying capability that doesn't exist.

## Confirmation: no new intelligence

- `lib/preparation/*` — **zero changes**.
- `lib/consulting/*`, `lib/reasoning/*`, blueprint/solution/process/scoring
  engines — **zero changes**.
- Only reads: `prepareCompany()` (Mission 11 public API) and
  `buildResumeBriefing()` (Resume Engine public API), both already exported
  and already called elsewhere in the app.
- All derived-looking UI values (sorting meetings by date, empty-state
  copy, chip grouping) are pure display formatting — no new scoring,
  weighting, or heuristics were written.

## Typecheck & lint

- `npm run typecheck` — no errors in any file touched by this mission.
  (Pre-existing, unrelated failures remain in `lib/workspace/seed.ts`
  from a concurrent in-progress branch adding `CompanyWorkspace.brandOverrides`
  — not touched or caused by this work.)
- `npm run lint` — no errors/warnings in any file touched by this mission.
  (Pre-existing, unrelated errors/warnings remain in
  `components/workspace/executive-simulator-panel.tsx`,
  `lib/brand/overrides.ts`, `lib/consulting/questions/index.ts`, and
  `components/workspace/deliverables-panel.tsx` — all part of the same
  concurrent in-progress branch, not touched or caused by this work.)

## Not done / out of scope

- Did not touch `app/discovery/*` or the Guided Assessment flow — Start
  Interview reuses the existing href only.
- Did not restructure `workspace-view.tsx` tabs — the brief lives on its
  own route, reached via a consultant-only nav link, to avoid conflicting
  with parallel Client Mode work in that file.
- Did not add `@isalwa/ui` as a dependency — `apps/architect` does not
  currently depend on that package (verified: no `@isalwa/ui` import
  anywhere in the app, no `packages/ui` dependency in `package.json`). The
  panel instead reuses the app's existing local design system
  (`components/ui/*`, `SectionShell`, `architect-serif` type scale, tone
  palette) that already implements the same frozen ISALWA visual language
  for this app, to honor "extend before replacing" / "reuse before
  creating" without introducing a new dependency mid-mission.
