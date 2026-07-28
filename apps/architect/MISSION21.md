# Mission 21 — Living Document Ingestion (Phase 3 · Magical)

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

## Product Principle (restated, governs every change below)

**Architect should never feel like software.** It should feel like a senior consulting team
that happens to live inside software. Every screen must answer:

1. **What do we know?**
2. **What are we trying to learn?**
3. **Why does it matter to the business?**

Tagline: *"Architect becomes more intelligent every time your company shares knowledge."*

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
