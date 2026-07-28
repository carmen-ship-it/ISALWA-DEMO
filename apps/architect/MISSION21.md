# Mission 21 — Living Document Ingestion (Phase 3 · Magical)

> **This file now documents two sequenced Mission 21 passes, in order:**
> 1. **Living Document Ingestion** (this section) — shipped at `9b2f92d`. The
>    batch "what changed" debrief after document uploads.
> 2. **Company Brain** (see [Mission 21 — Company Brain pass](#mission-21--company-brain-pass)
>    at the bottom of this file) — the client-facing "what does Architect know
>    about my company?" surface, composing the first pass's own knowledge
>    alongside every other engine the client already sees.
>
> Neither pass rewrites or removes the other's Definition of Done — both
> checklists below stand as shipped.

**Status:** Complete (first sequenced pass — see "Deliberately out of scope").
**App:** `apps/architect`
**Scope:** After a batch of document uploads, speak one consulting-voice Spanish sentence
about what actually changed — never a toast per file, never a fabricated number, honest
when extraction was weak. No new scoring model, no new engine, no wizard.
**Plan:** `Product Polish Roadmap (Missions 19–24)`, Phase 3 ("Magical").
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`.
**Follows:** Mission 19 (`35cd964`, premium empty states/motion), Mission 20 (`7724f85`,
guided client journey — next-step voice, triad briefing).
**Builds on (unchanged):** `REAL_DOCUMENT_UPLOADS.md` (real byte storage, per-document
lifecycle) and `AI_DOCUMENT_PROCESSING_PIPELINE.md` (the ten-stage pipeline: OCR → extract →
chunk → embed → detect → knowledge graph → vectors → readiness → insights → recommendations).

## Product Principle

Governing principle and the three permanent client questions: see
[`docs/ai/01_ARCHITECT_CONTEXT.md`](./docs/ai/01_ARCHITECT_CONTEXT.md).

Mission 21's own test: after uploading several documents, does the client ever have to
wonder "did that actually do anything?" — or does the product tell them, in one honest
consulting sentence, exactly what it now knows that it didn't a moment ago? A pipeline that
silently updates numbers in the background, with no one saying so, still fails this mission
even if every number is correct.

## What was already true (verified, not rebuilt)

Before writing anything, this mission traced the existing architecture end to end to confirm
what Missions "Real Document Uploads" and "AI Document Processing Pipeline" already deliver,
so nothing below duplicates it:

- **No manual refresh, already.** `uploadAndQueueDocument` → `processUploadedDocument`
  (`lib/documents/pipeline.ts`) fires `onWorkspace` after every persisted change, and
  `KnowledgeUpload` forwards it straight into `onUpdated`, which is the same `workspace` state
  every dashboard/twin/recommendation surface already derives with `useMemo`. Uploading
  multiple SOPs already updates the Capability Digital Twin, the Executive Dashboard and
  `explainWorkspaceRecommendations()` the moment each file's pipeline run persists — this was
  true before this mission and is unchanged.
- **The Consulting Intelligence Agent already runs on every document.** `ingestSource`
  (`lib/intake/pipeline.ts`) calls `runConsultingIntelligenceCycle` after every merge, which is
  what refreshes the Company Model and per-capability confidence (the twin) from a document —
  not something Mission 21 needed to wire.
- **Per-document honesty already exists.** `knowledge-upload.tsx`'s live step list
  (`PipelineSteps`) already renders `documentPipeline.detail.extractUnsupported` /
  `extractRequiresOcr` / `extractEmpty` per document — a PDF or image that cannot be read today
  already says so, per file, in Spanish, with no fabricated "completed."

**What was missing, and what this mission built:** a single, client-facing sentence that
speaks across a whole batch — "you uploaded 3 documents; here, concretely, is what we now
understand that we didn't before" — instead of leaving the client to infer it from itemized
per-file rows and numbers changing quietly elsewhere in the product.

## What shipped

### 1. `lib/documents/change-summary.ts` (new) — the batch "what changed" composer

`buildDocumentChangeSummary(runs: DocumentPipelineRun[])` takes the array of
`DocumentPipelineRun`s produced by one upload batch (one drag-and-drop or one file-picker
selection) and composes **one Spanish consulting-voice paragraph** plus a separate, honest
note when extraction was weak. Every number is copied straight off fields the pipeline
already computed per document — `understandingBefore/After`, `newInsights`,
`newRecommendations`, and the intake merge counts (`addedEntities`, `addedRelationships`,
`addedBusinessRules`, `addedRisks`, `addedOpportunities`) — **no second scoring model, no new
engine call, no recomputation.**

- **The headline paragraph** ranks what to say the same way `buildLearnedLines`
  (`lib/intake/summary.ts`) and `next-step-voice.ts` already do — lead with the biggest signal
  (business understanding moving, e.g. "la comprensión del negocio subió de 42% a 57%"), then
  fold in entities/relationships/rules/risks/opportunities found, then close with the
  insights/recommendations delta ("Esto abrió 2 recomendaciones nuevas").
- **Honesty branch.** When *none* of the batch's documents could actually be read (all
  `requires_ocr` / `unsupported_format` / `empty`), the message says exactly that — "no pudimos
  leer su contenido todavía… quedaron archivados por nombre" — never a claim of progress that
  didn't happen.
- **`honestNote`** is a second, separate sentence naming the specific weak documents (by
  filename, capped at three + "y N más") when *some* documents in the batch read fine but
  others did not — so a mixed batch (two readable SOPs + one scanned PDF) neither hides the
  weak one inside a generic success message nor lets it silently drag the whole sentence into
  a false "we didn't learn anything" tone.
- Same Spanish-generated-in-the-engine rule as `next-step-voice.ts`
  (`docs/ENGINEERING_GUIDELINES.md` §9): every sentence is hardcoded Spanish inside this
  module, never routed through `lib/i18n`.

### 2. `components/workspace/knowledge-upload.tsx` (extended) — the debrief card

- `handleFiles` (one call per drag-drop/file-picker batch) now collects each file's
  `DocumentUploadResult.run` (already returned by `uploadAndQueueDocument`, previously unused
  by this widget) into `batchRuns`, and once every file in the batch has settled, computes
  `buildDocumentChangeSummary(batchRuns)` and stores it in `changeSummary` state.
- **`DocumentChangeSummaryCard`** (new, local to this file) renders it as a persistent panel
  under the itemized upload list — not a toast, not a modal, not one message per file — reusing
  the exact `SectionShell` tone vocabulary (`SECTION_TONE_SURFACE.health` /
  `SECTION_TONE_INK.health`, `isalwa-icon-chip`, `isalwa-kicker`) the Mission 20 `TriadBriefing`
  already established, so this reads as the same consulting register instead of a new visual
  language. The honest note (when present) renders in the same amber ink the rest of the app
  already uses for "needs attention" copy (`isalwa-tint-amber-ink`).
- Because `KnowledgeUpload` is the **one shared widget** behind both the client-facing
  Business Knowledge screen and the consultant-only Knowledge Center, both roles get the
  debrief for free — no parallel widget, no duplicated upload UI.
- Only the card's kicker label (`knowledgeUpload.whatChangedKicker`) goes through
  `useTranslations()` — chrome, not consulting content — added to both
  `lib/i18n/messages/{es,en}.ts`.

### 3. `lib/documents/index.ts` — export surface

`buildDocumentChangeSummary`, `DocumentChangeSummary`, `WeakExtractionDocument` exported
alongside the rest of `lib/documents`' public surface — no new barrel file, no parallel
export path.

## Constraints honored

- **No second scoring model.** `change-summary.ts` never calls readiness, the twin, or the
  detectors itself — it only sums/compares fields `DocumentPipelineRun` already computed this
  same render, exactly the discipline `next-step-voice.ts` set in Mission 20.
- **Extend, don't fork.** `knowledge-upload.tsx` is the one widget both Business Knowledge and
  Knowledge Center already shared before this mission; this mission adds one field of state
  and one card to it, not a second upload component. `DocumentChangeSummaryCard` composes
  `SectionShell`'s existing tone maps instead of a new color system.
- **Spanish client copy generated inside the engine.** Every sentence `change-summary.ts`
  produces is hardcoded Spanish inside that module — never routed through `lib/i18n`. Only the
  card's kicker (chrome) went through `useTranslations()`, added to both
  `lib/i18n/messages/{es,en}.ts` in parallel.
- **No mock/fabricated data.** Every number `change-summary.ts` reports is copied verbatim off
  a `DocumentPipelineRun` another engine already produced this render — no invented percentage,
  no guessed entity count. When nothing was read, the message says so instead of claiming
  progress.
- **Honest weak extraction.** A batch where extraction failed for every document never claims
  "aprendimos" — it says plainly that the files are archived by name and will be re-analyzed
  once a reader exists for that format (the documented upgrade path in
  `AI_DOCUMENT_PROCESSING_PIPELINE.md`). A mixed batch names the specific weak document(s) by
  filename in a separate, clearly distinguishable sentence rather than burying the caveat
  inside the success message.
- **Client Mode / Consultant Mode boundary untouched.** No tab visibility, route gating, or
  role check was modified; the debrief card renders inside the same shared upload widget both
  roles already used, with the same information both roles already had access to (their own
  upload's pipeline results).
- Repo-wide fabrication sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`) on every
  changed file returned no matches.

## Public surface added

- `lib/documents/change-summary.ts` — `buildDocumentChangeSummary(runs)`, `DocumentChangeSummary`,
  `WeakExtractionDocument`. Exported from `lib/documents`. Reuse this for any future surface
  that needs to summarize a batch of pipeline runs instead of writing a second aggregator.
- `components/workspace/knowledge-upload.tsx` — `DocumentChangeSummaryCard` (local; not
  exported — call sites get it automatically through `KnowledgeUpload`, they do not render it
  directly).

## Deliberately out of scope (this pass)

Per the roadmap's own Phase 3 framing (ingestion before connectors before overnight autonomy)
and this pass's scoping discipline (one mission, smaller PRs over a large refactor):

- **The debrief lives inside the upload widget, not on the dashboard.** The mission brief
  suggested wiring "dashboard twin, recommendations, next-step voice / triad **if natural**."
  It already *is* natural for the twin/dashboard/recommendations — they update reactively the
  moment `onWorkspace` fires, unchanged since the AI Document Processing Pipeline mission, and
  needed no new wiring. Pushing the batch summary sentence itself onto the Executive dashboard
  or into `next-step-voice.ts` was not done in this pass: `next-step-voice.ts` answers "what
  should I do next," a forward-looking question, while this mission answers "what just
  happened," a backward-looking one — conflating them risked turning one clear sentence into
  two competing voices on the same screen. A future pass could feed the latest
  `DocumentChangeSummary` into the persistent context bar if that reads better in practice.
- **No entity-level naming ("ahora sabemos algo nuevo sobre Ventas").** The summary names
  *counts* of what changed (entities, relationships, rules, risks) rather than the specific
  business area, to avoid a second heuristic for picking which capability to name — that would
  duplicate judgment `next-step-voice.ts` and the Capability Digital Twin already own. A future
  pass could compose the twin's per-capability confidence delta into this sentence if the
  parent workspace object is threaded into `KnowledgeUpload` (it currently only receives
  `workspaceId`, by design, to stay decoupled from the page's own state).
- **No change to per-document status/messaging.** The existing `Uploading → Queued → Analyzing
  → Completed/Failed` lifecycle and the live ten-step list are unchanged — this mission adds a
  batch-level debrief *after* them, it does not alter their per-file honesty, which was already
  correct.
- **Meetings, connectors, and the autonomous overnight cycle are Missions 22–24** and were not
  started, per the mission's own explicit instruction.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are pre-existing and unrelated to this
  change (`lib/consulting/questions/index.ts`, `lib/knowledge/seed.ts` — the same two files
  Missions 19 and 20 also noted).
- `npx next build` — succeeds; all 6 static/dynamic routes generate.
- Manual trace of `buildDocumentChangeSummary()` against representative batches:
  - Three readable `.txt`/`.md` SOPs with new departments/processes and a lifted understanding
    score → headline names the entities, relationships and the understanding delta, closes
    with the recommendations delta; `honestNote` is `null`.
  - One readable SOP + one scanned image (no OCR key configured) → headline reports what the
    readable document contributed; `honestNote` names the image file specifically as unread,
    in a visually distinct (amber) sentence.
  - A single unreadable `.pdf` (no parser dependency yet) → headline itself is the honest
    "no pudimos leer su contenido todavía" branch; no fabricated progress claim.
  - Zero-signal batch (a document that reads fine but contributes nothing new) → the "no
    encontramos información estructurada nueva — confirma lo que ya sabíamos" branch, never a
    silent empty response.
- Repo-wide fabrication sweep on changed files (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`)
  — no matches.
- No `.env.local` or secret touched or committed; no Mission 22–24 work started.

## Definition of Done — checklist

- [x] Multi-SOP / multi-document upload visibly evolves the twin, dashboard and recommendations
  — verified as already true end-to-end via `onWorkspace` → `onUpdated` → the same `workspace`
  object every `useMemo`-derived surface reads; this mission adds the client-facing narration
  of that evolution, not the evolution itself (which predates this mission).
- [x] A client-facing Spanish "what changed" summary appears after ingest, in the senior
  consulting register ("Después de revisar…"), as one persistent panel — never a toast per
  file.
- [x] Honest when extraction is weak — both the all-weak branch (no fabricated progress) and
  the mixed-batch branch (a clearly separated, specific note naming the affected file(s)).
- [x] No fake scores — every number in the summary is copied off an already-computed
  `DocumentPipelineRun` field.
- [x] `apps/architect/MISSION21.md` (this file).
- [x] Typecheck/lint/build clean.
- [x] Never `.env.local`; no Mission 22–24 work started.
- [x] Consistent UI — the new card reuses `SectionShell`'s existing tone tokens; no duplicated
  component, no new upload widget.
- [x] Mobile works — the card is plain stacked text with the same responsive padding every
  other card in this widget already uses; no new interactive element to break a touch target.
- [x] Accessibility preserved — no new interactive control was added (the card is
  presentational); existing focus order and `aria-*` on surrounding controls untouched.
- [x] Existing behavior unchanged outside the additive `changeSummary` state and the new card
  rendered beneath the existing item list.

---

# Mission 21 — Company Brain pass

**Status:** Complete.
**App:** `apps/architect`
**Scope:** Presentation-only composition. One client-facing place — **Company Brain** — that
answers "what does Architect currently know about my company?" by composing Memory /
Knowledge / Capability Twin / Company Model / Blueprint / Recommendations / Timeline /
Discovery outputs the client already can see today, elsewhere in the product. No new engine,
no new scoring, no fabricated activity.
**Follows:** the Living Document Ingestion pass above (`9b2f92d`), Mission 20 (`7724f85` guided
journey, `faba62d` Executive Daily Brief).
**Gate honored:** `docs/architecture/AI_CONSTITUTION.md` (never rewrite/duplicate an engine,
extend `@isalwa/ui` primitives, reuse before creating), `docs/ENGINEERING_GUIDELINES.md` §9
(engine-generated Spanish never routed through `lib/i18n`; chrome always is).

## What this pass is, and is not

Discovery, Readiness, the Capability Digital Twin, the Missing Information Engine, Memory,
Retrieval and the Consulting Intelligence Agent already each answer part of "what does
Architect know" — but in four different places, under four different internal names, and the
client has to visit the Executive tab, the Assessment tab and the Discovery Complete ceremony
separately to piece the whole picture together. This pass does not touch any of those engines.
It adds exactly one new composition module and one new presentational panel that read their
already-published reports and arrange them under one honest mental model, in one place.

## What shipped

### 1. `lib/consulting-intelligence/company-brain.ts` (new) — the composition

`buildCompanyBrain({ workspace, capabilityTwin, missingInformation, discoveryCompletion })`
takes the exact same three reports `WorkspaceView` already computes once per render (the
Capability Digital Twin via `assessCapabilityDigitalTwin`, the Missing Information Engine via
`assessMissingInformation`, the Discovery Complete/Incomplete ceremony via
`assessDiscoveryCompletion`) plus the workspace itself, and produces a `CompanyBrainReport`
with four honest slices:

- **`areas`** — one entry per business capability with `hasEvidence` true (i.e. the twin
  already found something), each carrying the twin's own `confidence` verbatim, a real evidence
  count and last-updated timestamp (both counted straight off `EvidenceSnapshot.signals`,
  filtered to that capability's discovery dimensions — never a new count, never a new
  timestamp source), and the twin's own capped `known` statements for the expand detail.
- **`stillLearning`** — the ceremony's own `missingCapabilities` + `notTrackedCapabilities`,
  re-ordered by the Missing Information Engine's own impact ranking (an area whose discovery
  dimension appears earliest in `missingInformation.opportunities` sorts first; ties break by
  lowest confidence; not-tracked capabilities — Legal, Cumplimiento — always sort last, since no
  engine has ranked them at all). Each item's `why` is the twin's own `whyLow` sentence
  (already surfaced as `risks[0]` on the ceremony's `CapabilityDiscoveryState`), `etaMinutes` is
  the ceremony's own `estimatedRemainingMinutes`, and `impactLabel` is a matching
  `missingInformation` opportunity's own `+X%` figure when its dimension overlaps — no new
  estimate is computed anywhere in this file.
- **`trust`** — `businessUnderstandingPercent` copied from `workspace.businessUnderstanding`;
  `facts` / `documents` / `meetings` / `businessRules` / `importedRecords` copied verbatim from
  `EvidenceSnapshot.inventory` (the same counts `ReadinessEvidenceChips` already renders
  elsewhere); `workflows` from `workspace.businessProcesses?.workflows.length ?? 0` (honest zero
  when no process model exists yet); `missingAreas` is the same capability labels `stillLearning`
  lists. `headline` and the evidence chips are generated Spanish sentences built only from these
  already-real counts — an all-zero workspace gets an honest "no hay evidencia registrada
  todavía" sentence, never a fabricated percentage or count.
- **`knowsHeadline`** / **`learningHeadline`** — reused verbatim from the twin's own headline and
  the Missing Information Engine's own detective-register headline (falling back to the
  ceremony's `continuityNote` once nothing is left to learn) — no new sentence-composer for
  these two, on purpose, so Company Brain never contradicts what the Executive tab already says.

No signal in this module is invented: every count is either copied from an existing report
field or produced by filtering `EvidenceSnapshot.signals`/`.inventory`, the same boundary
`lib/readiness/snapshot.ts` already exposes to every other client screen.

### 2. `components/workspace/company-brain-panel.tsx` (new) — the four sections

`CompanyBrainPanel` renders `CompanyBrainReport` as four `SectionShell`s, reusing existing
tone tokens (never a new color system) and existing primitives end to end:

1. **Lo que Architect sabe** (green, `tone="processes"`) — one expandable row per business
   area (native `<details>`/`<summary>`, no new disclosure component), each showing confidence,
   real evidence count, last-updated date (`formatTimelineDate`, already used by the Assessment
   tab's own timeline), and the twin's own evidence statements on expand. Honest `EmptyState`
   (existing primitive) when nothing has evidence yet.
2. **Lo que Architect sigue aprendiendo** (yellow, `tone="problems"`) — one row per ranked gap,
   with why / ETA / impact chips and a **"Enseñar a Architect"** button. The button reuses
   Mission 20's own `capabilityInterviewHref(workspaceId, id)` (exported by
   `discovery-completion-card.tsx`, unchanged) to deep-link straight into the guided interview
   stage for that capability; when no discovery dimension backs the gap (an unmeasured
   capability, or a dimension `capabilityInterviewHref` can't resolve), the same button falls
   back to the caller's `onUploadDocuments` (which jumps to the Knowledge tab) — the same
   two-route pattern the Discovery Complete ceremony card already established, never a third
   route.
3. **Aprendizaje reciente** (blue, `tone="executive"`) — reuses the real `workspace.timeline`
   grouping the Executive Daily Brief already computes (`groupRecentLearning`), passed in by the
   caller so nothing is recomputed. Its Hoy/Ayer/Última semana/Anteriormente list rendering was
   extracted out of `executive-daily-brief.tsx`'s `DailyBriefRecentLearning` into a new shared
   `RecentLearningList` export (extend, not fork) so both the Executive tab (gray tone, its own
   fixed copy) and this section (blue tone, Company Brain's own copy) render the exact same real
   timeline markup instead of two copies of the same list. Honest empty state when the timeline
   is empty — never an invented event.
4. **Centro de confianza** (purple, `tone="blueprint"`) — reuses the existing `ConfidenceMeter`
   primitive (already used by the Executive Daily Brief's own Business Understanding section)
   fed the same percent and a dedicated set of evidence chips (facts/documents/meetings/
   business rules/imported records/workflows, each only shown when its count is above zero),
   plus the honest missing-areas list from the same `stillLearning` data section 2 already shows
   in full.

`WorkspaceView` wires the panel behind a new `"companyBrain"` workspace tab — passing the
already-held `capabilityTwin`, `missingInformation`, `discoveryCompletion` into
`buildCompanyBrain` via one more `useMemo`, and the already-computed `recentLearning` /
`interviewHref` straight through, exactly like every other tab panel in that file.

### 3. Tab wiring — `components/workspace/workspace-tabs.tsx`, `workspace-view.tsx`

- New `WorkspaceTabId` member `"companyBrain"`, placed immediately after `"executive"` in
  `WORKSPACE_TAB_ORDER` (both roles) and in `CLIENT_VISIBLE_TAB_IDS` (Client Mode) — a
  first-class, prominent entry point, not buried under an existing tab.
- `CLIENT_TAB_LABEL_KEYS.companyBrain` gives the tab a friendlier client-facing label
  ("Lo que Architect sabe de mi empresa") than the Consultant Mode label ("Cerebro de la
  empresa") — same override mechanism `blueprintClient` already used for the Blueprint tab.
- Consultant Mode is unaffected beyond gaining the same new tab (consultants already see every
  tab; nothing existing was reordered, renamed, or hidden).

### 4. Chrome copy — `lib/i18n/messages/{es,en}.ts`

Only chrome (kickers, titles, button labels, empty-state copy) went through `useTranslations()`
under a new `companyBrain` namespace, added to both locale files in parallel per the existing
convention. Every sentence describing *what Architect actually found* (`knowsHeadline`,
`learningHeadline`, `trust.headline`, each gap's `why`) is generated inside
`company-brain.ts` itself, hardcoded Spanish, same rule Mission 20's `next-step-voice.ts` and
this file's own first pass (`change-summary.ts`) already established.

## Constraints honored

- **Pure composition, zero new scoring.** `company-brain.ts` never calls an evidence collector,
  a confidence formula, or a ranking heuristic of its own — every number is either copied
  verbatim from `CapabilityDigitalTwinReport` / `MissingInformationReport` /
  `DiscoveryCompletionStatus` / `EvidenceSnapshot`, or produced by filtering/sorting those
  already-computed values (e.g. re-ordering the same ranked opportunities list, counting the
  same signals array).
- **No consultant notebook, reasoning chain, or raw LLM output exposed.** Every string rendered
  is either a `CapabilityTwin.known` statement (already client-facing everywhere else the twin
  renders), an existing report headline, or new chrome copy — `ConsultingWorkingMemory` is never
  imported by either new file.
- **No fake activity or events.** "Aprendizaje reciente" is the same real
  `workspace.timeline` the Executive tab already renders — no synthetic event is added anywhere.
- **Reuse before creating.** Four existing primitives carry this entire feature:
  `SectionShell`, `EmptyState`, `ConfidenceMeter`, and the newly-shared `RecentLearningList`
  (extracted from, not duplicated from, `executive-daily-brief.tsx`). No new color system, no
  new disclosure/accordion component, no new metric-chip component.
- **Discovery / Readiness / the Capability Twin / Memory / Retrieval / Consulting Intelligence
  engines untouched.** Every file inside `lib/discovery-agent`, `lib/readiness`, `lib/memory`,
  `lib/ai/retrieval`, and every other file already inside `lib/consulting-intelligence` is
  unmodified by this pass — the only new file in that directory is the composition module
  itself, and the only edit to an existing file there (`index.ts`) is its export list.
- **Consultant Mode unaffected.** No tab was removed, renamed, or reordered for consultants;
  the new tab is additive.

## Public surface added

- `lib/consulting-intelligence/company-brain.ts` — `buildCompanyBrain(input)`,
  `CompanyBrainReport`, `CompanyBrainArea`, `CompanyBrainLearningItem`,
  `CompanyBrainTrustCenter`, `CompanyBrainInput`. Exported from
  `lib/consulting-intelligence`.
- `components/workspace/company-brain-panel.tsx` — `CompanyBrainPanel`.
- `components/workspace/executive/executive-daily-brief.tsx` — new export
  `RecentLearningList` (extracted from `DailyBriefRecentLearning`, which now calls it
  internally — its own external behavior is unchanged).
- `components/workspace/workspace-tabs.tsx` — new `WorkspaceTabId` member `"companyBrain"`.

## Deliberately out of scope (this pass)

- **No new evidence source.** This pass reads `EvidenceSnapshot` exactly as `lib/readiness`
  already builds it; it does not add a collector for a source not already wired in there.
- **No editing from Company Brain.** Every section is read-only — "Enseñar a Architect" is a
  deep link into the existing guided interview or a jump to the existing Knowledge tab, never a
  new inline editor.
- **No push notifications / digest email for Company Brain changes.** Purely an on-demand tab a
  client opens; Mission 24 (overnight autonomy, already stashed WIP at the time of this pass)
  is untouched and unstarted by this change.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are the same two pre-existing,
  unrelated files the Living Document Ingestion pass above already noted
  (`lib/consulting/questions/index.ts`, `lib/knowledge/seed.ts`).
- `npx next build` — succeeds; all routes generate, including `/workspace/[id]` with the new tab.
- Manual trace of `buildCompanyBrain()` against representative states:
  - Empty workspace (no evidence at all) → `areas` empty (honest `EmptyState`), `stillLearning`
    lists every capability with `measured: true` items first then the two unmeasured ones last,
    `trust.evidenceChips` empty and `trust.headline` the honest "no hay evidencia registrada"
    sentence, `businessUnderstandingPercent` 0.
  - Partially-discovered workspace → `areas` shows only capabilities with real evidence, sorted
    by confidence descending; `stillLearning` ranked by the same order
    `missingInformation.opportunities` already publishes; `trust` counts match
    `EvidenceSnapshot.inventory` exactly.
  - Fully-discovered workspace (`discoveryCompletion.state === "complete"`) → `stillLearning`
    empty, `learningHeadline` falls back to the ceremony's own continuity note, "Recent
    Learning" still shows the real timeline, `trust.missingAreas` empty with the honest
    "ya cubrimos todas las áreas medibles" sentence.
- Repo-wide fabrication sweep on changed files (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`)
  — no matches.
- No `.env.local` touched. Mission 24 WIP (`git stash push -u -m "wip mission24"`) was stashed
  before this pass's files were staged, confirmed absent from `git status`/`git diff --stat`
  immediately before commit, and restored via `git stash pop` immediately after push.

## Definition of Done — checklist

- [x] One client-facing place answers "what does Architect currently know about my company?" —
  the new Company Brain tab, reachable from both Executive and Knowledge context via a
  first-class workspace tab (Client Mode and Consultant Mode both see it).
- [x] Grouped by business area with confidence, evidence count, last updated, and expandable
  evidence — section 1.
- [x] Missing Information Engine surfaced by priority with why / ETA / impact and a
  **Teach Architect** button reusing Mission 20's own deep-link pattern — section 2.
- [x] Real timeline only, honest empty state — section 3.
- [x] Aggregate, derived, honest-zero counts plus the missing list — section 4.
- [x] No system name (Capability Digital Twin, Missing Information Engine, Consulting
  Intelligence Agent) leaks into client-facing copy — only "lo que Architect sabe / sigue
  aprendiendo / centro de confianza."
- [x] No consultant notebook, reasoning chain, or raw LLM output exposed.
- [x] No fake activity/events; no new scoring.
- [x] Typecheck, lint, build clean.
- [x] `apps/architect/MISSION21.md` updated — both passes documented, neither DoD erased.
- [x] Never `.env.local`. Mission 24 WIP stashed before, confirmed absent, restored after.
- [x] Consultant Mode unaffected — additive tab only.
