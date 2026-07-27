# Guided Assessment + Consultant Workshop Interview — Implementation Notes

Mission scope: orchestration/UI only. No interview engine rewrite — `domain/interview-engine.ts`,
`lib/reasoning/*` (adaptive question selection, scoring, memory absorption) and
`lib/consulting/*` (Mission 5/10 consulting intelligence) are untouched. This mission wraps that
existing engine in a TurboTax-style guided flow and a premium "workshop" layout, reusing the
local design system (`components/ui/*`, `SectionShell`, tokens, `architect-serif` type) already
used across the app.

Route: `/discovery?workspaceId=…` → `app/discovery/page.tsx` → `GuidedAssessment`
(`components/discovery/guided/guided-assessment.tsx`). This is the same URL every
"Continuar evaluación" CTA in the workspace already links to
(`components/workspace/workspace-view.tsx`'s `interviewHref`), in both Consultant and Client
Mode — no new entry point was needed, the existing wiring already lands here.

Most of this mission's scaffolding (stages, review/finish panels, skip/edit actions) already
existed as WIP from an earlier session under `components/discovery/guided/` and
`lib/discovery/`. This pass **finished and integrated** that work rather than rebuilding it:
removed the now-dead pre-guided chat experience (`components/discovery/discovery-experience.tsx`,
superseded — `app/discovery/page.tsx` already rendered `GuidedAssessment`, not that component),
and filled the remaining gaps against the mission's workshop layout spec (question
progress, "why we ask" per question, and a human-language confidence readout).

## A. Guided stages (TurboTax-style)

`lib/discovery/stages.ts` groups the engine's existing discovery dimensions into a fixed
presentation sequence — it does not add questions or change scoring:

Bienvenida → Empresa → Comercial → Operaciones → Finanzas → Tecnología → Equipo → Revisión → Cierre

- `resolveCurrentStage(interview)` maps the engine's live `phase` / current question's
  `dimension` to a stage — the engine still decides what's asked next, this only labels it.
- `computeStageCompletion(interview)` derives per-stage coverage/confidence straight from
  `memory.score.dimensions` (existing scoring) — no parallel scoring model.
- Every stage shows: progress bar (`StageBrief`), estimated time remaining (existing
  `interview.estimatedMinutesRemaining`), an explicit "why we ask" rationale, a pause action
  (`BackLink` back to the workspace — every state change autosaves via the existing
  `InterviewPersistence`, so pausing never loses an answer), and skip actions (see gaps below).
- Every answer still flows through the unmodified engine path
  (`architectAgent.handleTurn` → `submitAnswer`/`think` → `absorbAnswerIntoMemory` →
  `applyInterviewToWorkspace` on completion), so Business Understanding updates exactly as it
  did before this mission.

## B. Workshop layout (not a chat)

`GuidedAssessment` renders a three-zone layout instead of a chat transcript:

- **Top** (`StageBrief`) — current topic (stage title + rationale), a "Pregunta N de hasta M"
  chip, and "~N min restantes". No message history is shown as bubbles; only the latest
  Architect line is shown as a short lead-in above the question (`AnsweringPanel`).
- **Center** (`AnsweringPanel`) — the question, a "Por qué preguntamos esto" callout (renders
  the engine's own `question.helpText` — built from the candidate's `reason` /
  `expectedLearning` / `businessValue`, previously computed by Mission 10 but never displayed),
  the answer input, and a contextual example via `question.placeholder`.
- **Right** (`DiscoveryScoreCard` + `LivingWhiteboard` + findings/opportunities) — Business
  Understanding score, a human-language confidence sentence (`understandingSentence`, reused
  from the Mission 1/3 executive-language layer — never raw model jargon), a "Temas cubiertos
  X de Y" progress bar, the existing per-dimension checklist, and "Aún falta".
- A horizontal `StageStepper` across the top doubles as the "topics completed/remaining" map
  (checkmarks vs. open circles per stage) and lets the client jump to Review at any time.

Copy stays encouraging, executive Spanish throughout (existing tone from Missions 1–3 — this
mission didn't change voice, only where it's shown).

## Question N of M

The adaptive engine (Mission 10 — senior consultant question selection) has no fixed question
order or fixed total; it stops as soon as `memory.score.readyToConclude` is true. The only real
number that exists is `MAX_ADAPTIVE_QUESTIONS` (18), the engine's own hard cap that forces
conclusion (`lib/reasoning/think.ts`, now exported read-only). `lib/discovery/question-progress.ts`
uses it to show **"Pregunta N de hasta 18"** — "up to", never a promise of exactly 18 — during
the adaptive interview phase only. Identity/company onboarding (4 fixed steps) doesn't show this
counter; the stage stepper already shows that progress.

## Pause / Edit / Skip — what the engine allows, and the gaps

- **Pause** — fully supported. Every interview mutation autosaves
  (`createClientInterviewPersistence`); returning to `/workspace/:id` and clicking
  "Continuar evaluación" later resumes exactly where the client left off.
- **Edit previous answers** — supported for any answer that produced a `KnownFact` (i.e.
  everything asked from the adaptive engine onward, plus `business_overview`). The Review stage
  (`ReviewPanel`) reopens the topic via `prepareAnswerEdit`, which reinstalls the reconstructed
  question as `currentQuestion` and resubmits it through the **same** unmodified answer path —
  so the edit re-runs real scoring/absorption rather than special-casing it. *Gap:* the four
  fixed identity questions (role, name, company name) are edited as plain fields directly in
  Review (no re-absorption needed, they never produced a `KnownFact`) — this is intentional, not
  a bug, but it means identity edits and topic edits use visibly different UI in Review.
- **Skip question** — supported (`skipCurrentQuestion`): marks the question's key "asked" via
  the existing `markQuestionAsked` so the planner never re-offers it, without writing a
  `KnownFact` — confidence can never be inflated by skipping.
- **Skip stage** — supported with a bound: `skipCurrentStage` skips consecutive
  planner-offered questions for that stage's dimensions, capped at 8 steps, and stops the moment
  the planner moves to a different dimension on its own. *Gap:* because the engine chooses the
  next question by evidence value (Mission 10), not by dimension order, "skip this stage" is a
  best-effort filter, not a guarantee the planner won't return to that dimension later if it's
  still the highest-value gap.
- **Jump to a specific stage's live question** — **now supported** (HOTFIX, see below). Any
  stage with real discovery dimensions (Comercial, Operaciones, Finanzas, Tecnología, Equipo)
  can be opened directly and stays in that topic across answers, until the client switches
  stage again or that stage runs out of questions.

## HOTFIX — free stage navigation (any order)

Álvaro/Carmen reported feeling locked into whatever dimension the adaptive engine ranked
highest: clicking a stage tab other than the current one always opened the read-only Review
instead of letting them answer questions for that stage. Fixed with an **additive filter**,
not an engine rewrite — `domain/interview-engine.ts` and `lib/reasoning/think.ts` are still
untouched:

- `planNextQuestion(memory, dimensionFilter?)` (`lib/reasoning/planner/next-question.ts`) and
  the chain it delegates to — `selectNextConsultantQuestion` → `pickHighestValueQuestion` →
  `prioritizeQuestions` (`lib/consulting/questions/*`) — all gained one new **optional**
  trailing parameter: a set of `DiscoveryDimension`s. When provided, the exact same
  ranked candidate pool (consequence questions, contradictions, hypotheses, department
  balance, follow-ups, catalog) is filtered down to that stage's dimensions **before**
  scoring, so the winner is still the highest-value question — just within the chosen topic.
  Every existing call site that omits the parameter (the normal adaptive interview) is
  byte-for-byte unaffected.
- `switchToStage(interview, stage)` (new, `lib/discovery/guided-actions.ts`) is the
  orchestration glue: it re-plans a question filtered to the clicked stage, rebuilds the
  same architect message shape `think()` already uses (`formatThinkingPreamble` + prompt),
  and replaces the still-unanswered question at the top of the conversation — never a
  question the client already answered. If the stage's dimensions are already fully covered
  by evidence, it says so in Spanish and clears the active question instead of inventing one.
- `GuidedAssessment` (`components/discovery/guided/guided-assessment.tsx`) tracks which stage
  the client is actively working (`activeStageId`). Clicking a dimension-bearing stage tab
  calls `switchToStage` immediately; after every subsequent answer, the same filter is
  re-applied on top of the engine's own scoring output (`think()` still runs unmodified —
  facts, observations, opportunities, score are untouched) so the *next* question stays in
  that stage too, until the stage is exhausted (filter auto-releases back to the global
  adaptive pick) or the client picks a different stage. Skip-question keeps the active
  stage's filter; skip-stage and Review both release it, matching "switches stage" intent.
- Meta stages (Bienvenida, Empresa) and Review still route to the read-only Review panel —
  those aren't engine dimensions, and identity onboarding is a short fixed sequence before
  the adaptive engine has a memory to rank against.

Net effect: the client can now visit Comercial → Tecnología → Finanzas → back to Comercial
in any order, and each stage keeps handing back questions from its own topic instead of
whatever globally ranks highest.

## Files touched this mission

- Removed: `components/discovery/discovery-experience.tsx` (dead code, superseded by the
  `guided/` flow already wired into `app/discovery/page.tsx`).
- Added: `lib/discovery/question-progress.ts`.
- Extended: `components/discovery/guided/stage-brief.tsx` (question progress chip),
  `components/discovery/guided/answering-panel.tsx` (why-we-ask callout),
  `components/discovery/discovery-score-card.tsx` (human-language confidence sentence + topics
  progress bar), `lib/reasoning/think.ts` / `lib/reasoning/index.ts` (exported the existing
  `MAX_ADAPTIVE_QUESTIONS` constant, read-only, no behavior change).
- Everything else under `components/discovery/guided/` and `lib/discovery/` (stages, review/finish
  panels, stage stepper, guided actions, answer-topics, question-lookup) was pre-existing WIP,
  reviewed and left as-is.

## Files touched — free stage navigation HOTFIX

- `lib/reasoning/planner/next-question.ts` — optional `dimensionFilter` param on `planNextQuestion`.
- `lib/consulting/questions/index.ts` — optional `dimensionFilter` threaded through `selectNextConsultantQuestion`.
- `lib/consulting/questions/question-priority.ts` — optional `dimensionFilter` on `prioritizeQuestions`/`pickHighestValueQuestion`, applied as a pool filter before scoring.
- `lib/discovery/guided-actions.ts` — new `switchToStage()` orchestration function.
- `components/discovery/guided/guided-assessment.tsx` — `activeStageId` state, rewritten `handleSelectStage`, `applyActiveStageFilter` wrapper around `respond()`/`handleSkipQuestion`.
