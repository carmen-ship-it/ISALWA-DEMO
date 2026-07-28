# MISSION 19 — P0 Pilot UX: Make Continuous Discovery Obvious

## Problem

Álvaro finished his first discovery session and, on returning to
`/discovery`, expected a "second questionnaire." Continuous discovery
already lived on the same `/discovery` route — `createWorkspaceInterview(
workspace, "continue")` in `lib/resume/engine.ts` already restored
`ConversationMemory`, remembered facts, and picked up where the last
session left off — but the confirmation question that opens that mode
("¿Listo para continuar?") rendered exactly like every other interview
question: same card, same plain text, no visual signal that this was the
*same* conversation resuming, not a new one starting.

This mission is **UX only**. It touches presentation and copy — nothing in
persistence, Discovery scoring, the Capability Digital Twin, the AI, or the
interview/adaptive-questioning engine changed.

## What changed

### 1. Continuation Hero (`components/discovery/guided/continuation-hero.tsx`)

New presentational component, wired into
`components/discovery/guided/guided-assessment.tsx`. When a returning
client reopens `/discovery` and the engine's own "continue" gate question
is showing (`interview.phase === "welcome"` with
`questionKey === "ready"`), **and** the same signal the boot logic already
uses to choose `mode: "continue"` is true
(`workspace.meetings.length > 0 || conversationMemory.knownFacts.length > 0`),
the plain confirmation card is replaced by a hero that:

- Greets the client by name of the company: *"Continuemos aprendiendo sobre
  {company}…"*
- Shows the live Business Understanding % (`interview.memory.score.overall`)
  and the engine's own ETA (`interview.estimatedMinutesRemaining`) — nothing
  recomputed.
- States plainly this is the same conversation, not a new form, and
  reinforces the product tagline.
- Offers **Continuar descubriendo** (primary) / **Ahora no** (secondary) —
  both just call the existing `respond("yes" | "later")` path already used
  by the confirmation question; no new state machine.
- Reuses the existing `TriadBriefing` component (same one the Dashboard
  already renders) for **Qué sabemos** / **Qué seguimos aprendiendo** / **Por
  qué importa**, composed from the Capability Digital Twin
  (`assessCapabilityDigitalTwin`) and Missing Information Engine
  (`assessMissingInformation`) reports the Dashboard already computes from
  this same workspace — no rescoring, just composition of existing reports
  into the client-facing triad.

First-time clients (no prior meetings/facts) are unaffected — they still
see the normal onboarding flow.

### 2. Discovery Complete/Incomplete ceremony (`discovery-completion-card.tsx`)

Extended, never replaced, the existing Mission E ceremony card:

- **Incomplete**: a personalized "Todavía podemos aprender más sobre
  {company}" block with the engine's own ETA (or a graceful fallback) and a
  **Continuar descubriendo** button straight into `/discovery`.
- **Complete**: Discovery is never hidden. A reinforcement line ("Architect
  seguirá aprendiendo con cada documento, respuesta o reunión nueva…") plus
  three buttons routing to existing surfaces only — **Actualizar
  conocimiento** (`/discovery`), **Subir documentos** and **Registrar
  reunión** (both open the existing Knowledge tab, which already hosts
  document upload and meeting-transcript logging).

Wired from `workspace-view.tsx`'s Dashboard panel with `companyName`,
`onUploadDocuments`, `onLogMeeting`.

### 3. Tagline reinforcement (`welcome-banner.tsx`)

Added one quiet line under the Dashboard's "Today's Focus" hero: *"Architect
se vuelve más inteligente cada vez que su empresa comparte conocimiento."*
— the same line (in Spanish) that anchors the Continuation Hero and the
Discovery Complete ceremony, so the idea repeats consistently everywhere a
client looks.

### 4. Microcopy — no more "assessment" vibe

- `guided-assessment.tsx`: page kicker "Evaluación guiada · {company}" →
  "Descubrimiento continuo · {company}"; boot-error copy "No se pudo abrir
  la evaluación" → "…el descubrimiento".
- `stage-stepper.tsx`: aria-label "Etapas de la evaluación guiada" →
  "Etapas del descubrimiento guiado".
- `lib/i18n/messages/es.ts` / `en.ts`: renamed CTA and label **values**
  (never keys, so no call sites changed) away from
  survey/form/assessment-flavored wording — e.g. `common.continueEvaluation`
  "Continuar evaluación" → "Continuar descubriendo",
  `reportView.consultingAssessment` "Evaluación consultiva" → "Comprensión
  consultiva", and a broader sweep of the English chrome dictionary
  (`workspaceTabs.assessment`, `workspaceView.assessment.*`, etc.) from
  "assessment" to "discovery". Added new keys for the continuation hero's
  Dashboard card, the Discovery Complete actions, and the tagline.

## What did NOT change

- `lib/resume/engine.ts` (`createWorkspaceInterview`, `buildResumeBriefing`)
  — the resume/continuation logic itself.
- `apply-interview`, Discovery scoring, Readiness compute, the Capability
  Digital Twin, Missing Information Engine, or any AI/interview logic.
- No persistence changes. No data healing or migration. Álvaro's existing
  data was not touched.

## Verification

- `npm run typecheck` — clean.
- `npm run lint` — clean (pre-existing unrelated warnings in
  `lib/consulting/questions/index.ts` and `lib/knowledge/seed.ts` only).

## Files touched

- `components/discovery/guided/continuation-hero.tsx` (new)
- `components/discovery/guided/guided-assessment.tsx`
- `components/discovery/guided/stage-stepper.tsx`
- `components/workspace/executive/discovery-completion-card.tsx`
- `components/workspace/welcome-banner.tsx`
- `components/workspace/workspace-view.tsx`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/en.ts`
