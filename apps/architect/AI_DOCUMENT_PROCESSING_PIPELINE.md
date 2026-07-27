# AI Document Processing Pipeline

**Status:** All ten stages orchestrated end-to-end and running automatically on every upload. Eight of the ten are fully real with no API key and no new dependency. The two that genuinely require a model — OCR and embeddings — are implemented against real provider routes and degrade to an explicitly reported "pending / skipped" state when no key is configured, rather than pretending to have run.

## Product idea

`ef2f2c6` made uploads real: bytes land in Supabase Storage and each document carries a durable `Queued → Analyzing → Completed/Failed` lifecycle. But the bytes were never *read*. A document was classified by its filename and that was the whole of its contribution to the business knowledge graph.

This mission reads them. Every uploaded document now flows automatically from bytes to refreshed advice: text comes out, it is chunked and embedded, twelve categories of business signal are detected from it, the knowledge graph absorbs them, published understanding is recomputed, and the insight and recommendation surfaces reflect the new evidence — with no manual refresh anywhere. Upload a process manual and the workspace is measurably smarter by the time the progress bar finishes.

## The ten stages

Each stage is one module, and each composes an engine that already existed rather than growing a second brain beside it. `lib/documents/pipeline.ts` is the only orchestrator.

| # | Stage | Module | Real without an API key? |
|---|---|---|---|
| 1 | OCR | `lib/documents/ocr.ts` + `app/api/documents/ocr/route.ts` | No — reported `skipped` with the reason |
| 2 | Extract text | `lib/documents/extraction.ts` | Yes, for text/Markdown/CSV |
| 3 | Chunk | `lib/documents/chunking.ts` | Yes, always |
| 4 | Generate embeddings | `lib/documents/embeddings.ts` + `app/api/documents/embeddings/route.ts` | No — chunks stored `pending` |
| 5 | Store vectors | `lib/documents/vectors.ts` | Yes — records always stored, vectors when available |
| 6 | Detect 12 categories | `lib/intake/detectors.ts` | Yes, always |
| 7 | Update knowledge graph | `lib/intake/pipeline.ts` (unchanged merge) | Yes, always |
| 8 | Update confidence / readiness | `lib/readiness/memory.ts` | Yes, always |
| 9 | Generate new insights | `lib/insights` | Yes, always |
| 10 | Refresh recommendations | `lib/explanations` | Yes, always |

Stages 6 and 7 are a single `ingest` call — the intake pipeline detects and merges in one pass, and splitting it would mean duplicating that merge logic. They are *reported* as two steps because those are two outcomes a reader cares about separately: "what did you find" versus "what did you add."

Stages 9 and 10 are derivations, not stored artifacts. Every workspace surface already recomputes insights and recommendations with `useMemo` from the workspace object. The pipeline runs them only to measure the delta, so a run can honestly say "3 new insights" instead of implying it wrote something to a table.

### 1. OCR — `lib/documents/ocr.ts`

Images route to `POST /api/documents/ocr`, which calls an OpenAI-compatible vision model (`gpt-4o-mini` by default) with a transcription-only prompt. The route is the *only* place the key is read; it never reaches the browser.

Without a key the route returns `{ status: "unavailable", reason }` with HTTP 200 — a configuration fact, not a server error. The pipeline records the OCR step as `skipped` with that reason, and the document keeps the filename classification it always had. It is never described as "read." Non-image documents mark this step `skipped` / "not applicable" rather than silently disappearing from the step list.

Cap: 6MB of image bytes (`MAX_OCR_BYTES`).

### 2. Extract text — `lib/documents/extraction.ts`

Runs client-side against the bytes the browser already holds, so no file is uploaded twice.

Real today, no dependency, no key:
- `.txt` `.text` `.log` and any `text/*` MIME type — read verbatim
- `.md` `.markdown` `.mdx` — Markdown syntax stripped to prose, because `##` and `|---|` produce "sentences" that are punctuation rather than statements
- `.csv` `.tsv` — flattened to one readable `header: value` sentence per row, with quoted-cell handling, so tabular data becomes something the detectors can actually scan

Honestly not readable here: `.pdf` `.doc` `.docx` `.xls` `.xlsx` `.ppt` `.pptx`. These are binary/zip container formats needing a parser dependency (pdfjs, mammoth, sheetjs) this app deliberately does not carry yet. The pipeline reports `unsupported_format` and says so in the step list. **See the upgrade path below.**

Cap: 400,000 characters per document (`MAX_EXTRACTED_CHARS`).

### 3. Chunk — `lib/documents/chunking.ts`

Deterministic, paragraph-aware, ~1,200 characters per chunk with 150 characters of overlap so a sentence spanning a boundary is not lost to both sides. Paragraphs larger than the target fall back to sentence splitting, and a single sentence longer than a chunk is hard-split rather than dropped. Every chunk keeps `startOffset` / `endOffset` into the original text, so a future citation can point at the exact span. Capped at 200 chunks per document.

This stage has no external dependency and always runs when there is text — including text that came from OCR.

### 4. Generate embeddings — `lib/documents/embeddings.ts`

Batches of 32 chunks to `POST /api/documents/embeddings`, which calls an OpenAI-compatible `/v1/embeddings` endpoint (`text-embedding-3-small`, 1536 dimensions, by default). Vectors are rounded to four decimals before storage — the precision loss is far below what cosine similarity can distinguish and it roughly halves the JSON size.

Without a key: `{ status: "pending", reason }`, and the step is recorded `skipped`, **not** failed. The distinction matters — nothing is broken, a capability is simply not configured. Chunk metadata is still persisted in full so that turning the key on later is a reprocess, not a re-ingest.

### 5. Store vectors — `lib/documents/vectors.ts`

The store is the workspace record itself (`knowledge.chunks`), persisted through the same `CompanyMemoryStore` every other engine uses — Supabase JSONB when configured, `localStorage` otherwise. No second database and no second persistence path.

That choice has a real limit, stated rather than hidden: **a workspace row is not a vector database.** Only the first 64 chunks of a document keep their vectors (~0.8MB of JSON at 1536 dimensions). Chunks past that budget are still stored — text, offsets, provenance — with `embeddingStatus: "skipped"` and a note explaining why. The workspace keeps at most 600 chunk records, evicting oldest first, the same bounded-growth convention as the intake evidence log.

Chunk ids are derived from the asset id and chunk index, so reprocessing a document *replaces* its slices instead of duplicating them.

`searchChunks()` does cosine similarity over ready chunks only. Chunks in any other state are excluded rather than low-ranked, so a caller can never present an unembedded chunk as a semantic match.

### 6. Detect twelve categories — `lib/intake/detectors.ts`

This is an **extraction and extension of what already existed**, not a new extractor. `extractors.ts` already had `scanTextSignals` covering departments, systems, roles, pain and rules. That logic moved here and gained the missing categories. There is exactly one caller (`extractors.ts`), which means meeting transcripts, manual notes and document text now all run through the identical twelve detectors.

Everything is deterministic keyword/pattern matching over plain text — no model call, no inference. Every detection carries an `Evidence` record holding the literal sentence it came from, so nothing downstream can present a finding without showing the sentence behind it.

Detections file into the *existing* `IntakeSlots`; there is no new store and no new taxonomy:

| Category | Where it lands |
|---|---|
| people | entity `Person` |
| departments | entity `Department` |
| systems | entity `System` |
| software | entity `System` |
| vendors | entity `Supplier` |
| processes | entity `Workflow` |
| pain points | `painSignals` |
| risks | `painSignals` with `kind: "risk"` → `critical` severity |
| KPIs | `facts` under key `kpi` |
| approvals | `businessRules` + relationship `Approves` |
| handoffs | relationship `CommunicatesWith` |
| policies | `businessRules` |

Two details worth knowing:

**Canonical names.** "sales", "ventas" and "Ventas" all resolve to a single `Department: Ventas` node, so the graph does not grow three nodes for one department.

**Directed relationships are positional.** Every entity mention in a sentence is located with its character offset, overlapping matches are resolved by detector priority, and an approval or handoff becomes an edge only when the sentence names an entity on *both* sides of the verb. Spanish reads subject-first, so the first entity before the verb is the actor and the first after it is the target: *"Ventas registra los pedidos en Excel y luego se los pasa a Almacén"* yields `Ventas → Almacén`, not `Excel → Almacén`. A one-sided mention stays a business rule — inventing the missing endpoint would be exactly the fabrication this codebase refuses.

A KPI additionally requires a measurable quantity next to the metric name; a bare mention of "conversión" is not a KPI.

Cap: 120 sentences scanned per document, so a 400-page upload cannot turn into an unbounded write. The document is still fully chunked and embedded — only the keyword scan is capped.

### 7. Update the business knowledge graph — `lib/intake/pipeline.ts`

Unchanged merge logic. `ingestFileThroughIntake` now accepts `textContent` and `extractionMethod`, and passes them to the extractors — that is the entire change to the merge path. Entity deduplication, relationship merging, contradiction detection, evidence logging and gap derivation all behave exactly as they did for manual notes and interviews.

`IntakeIngestReport` gained `detections` (per-category counts) and `readContent` (was the document's content actually read, or only its filename), so the UI can distinguish "we found 14 signals" from "we filed this by name."

### 8. Update confidence / readiness — `lib/readiness/memory.ts`

`refreshUnderstandingFromEvidence()` adds **no second scoring system**. It runs the existing bridge that turns imported evidence into `evidence_<topic>` known facts, then the existing Discovery Score — the same composition `lib/resume/engine.ts` already performs when an interview resumes. The pipeline simply runs it when a document arrives instead of waiting for the next conversation.

Two deliberate constraints:
- **The number never goes down.** Documents add evidence; they do not invalidate what an interview established.
- **`conversationMemory` is only written back when it already existed.** Uploading a document must not fabricate an interview memory on a workspace that has never had one. In that case the score is computed from an ephemeral memory and only the published number is updated.

### 9–10. Insights and recommendations

Recomputed via `deriveExecutiveInsights` and `explainWorkspaceRecommendations` before and after the merge. The pipeline reports the delta. Because both are pure derivations of the workspace object, every panel already reflects the new evidence the moment the workspace state updates — which is what makes "no manual refresh" true rather than a polling trick.

## No manual refresh

`processUploadedDocument` takes two callbacks:

- `onJob` fires on **every** step transition. `knowledge-upload.tsx` renders the live ten-step list from it — each step showing pending, running, completed, skipped or failed with a translated detail line ("1,204 characters", "18 chunks", "9 signals detected", "understanding 34% → 41%").
- `onWorkspace` fires after **every** persisted workspace change. The caller feeds it straight into React state, so insights, recommendations, the knowledge graph and the confidence number all update in place.

There is no polling loop and no "refresh to see results" affordance, because there is nothing to wait for.

The final job stage is honest about a third outcome. `queued` is not a failure: it is the correct state for a document whose content reader is not active yet (an image with no OCR key). The file is stored, classified and findable by metadata; only its content is unread. Only a genuine ingest failure produces `failed`.

## Evidence and honesty

Consistent with `NO_FABRICATED_CONTENT.md`:

- Every detection carries the literal source sentence as `Evidence`. Nothing is presented that cannot show its origin.
- A missing API key is reported as a missing capability with its reason, never as a failure and never silently swallowed.
- A document whose format cannot be read keeps its filename classification and says so. It is never counted as "processed content."
- The vector budget is a stated limit with a named upgrade path, not a hidden truncation.
- Confidence moves only through the one existing Discovery Score.

## i18n

All new user-facing strings live in `lib/i18n/messages/es.ts` (default, client-facing) and `en.ts`: the ten step titles, the four rendered step statuses, ~25 step detail messages with interpolated counts, the twelve detection category labels, and the search-index summary. No hardcoded UI strings. Provider reasons returned by the API routes are developer-facing diagnostics — they go to `console` and to the job record, never rendered raw to a client.

## What requires an API key for full AI

| Capability | Env var (first match wins) | Without it |
|---|---|---|
| OCR | `ARCHITECT_OCR_API_KEY` → `ARCHITECT_LLM_API_KEY` → `OPENAI_API_KEY` | Images stored + classified; content unread; step `skipped` with reason; document stays `queued` |
| Embeddings | `ARCHITECT_EMBEDDINGS_API_KEY` → `ARCHITECT_LLM_API_KEY` → `OPENAI_API_KEY` | Chunks stored with full text/offsets, `embeddingStatus: "pending"`; no semantic search |

Optional overrides: `ARCHITECT_OCR_MODEL` (default `gpt-4o-mini`), `ARCHITECT_EMBEDDINGS_MODEL` (default `text-embedding-3-small`), `ARCHITECT_OCR_BASE_URL` / `ARCHITECT_EMBEDDINGS_BASE_URL` / `ARCHITECT_LLM_BASE_URL` (default `https://api.openai.com`).

Everything else — extraction, chunking, all twelve detectors, the graph merge, confidence, insights, recommendations, and the live step UI — works with no key at all.

## Documented upgrade paths

- **PDF / Word / Excel / PowerPoint text.** Add the parser dependency (pdfjs-dist, mammoth, sheetjs) and one branch in `extractDocumentText`. Everything downstream already works — those formats currently stop at stage 2 and nowhere else.
- **A real vector database.** Move `buildChunkRecords` / `upsertChunkRecords` / `searchChunks` behind a pgvector table. `searchChunks` is already the interface that would sit in front of it, and the 64-vector budget disappears with it.
- **A background worker.** `DocumentProcessingJob` (from `ef2f2c6`, now carrying its per-step array) is already worker-shaped. The pipeline runs in-process in the browser today; a queue consumer can adopt the record without a redesign.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean (only the pre-existing, unrelated warnings in `lib/consulting/questions/index.ts` and `lib/knowledge/seed.ts`).
- `npx next build` — succeeds; both API routes register.
- Detectors and chunker exercised at runtime against a Spanish operations-manual fixture: all twelve categories fire, canonical names collapse correctly, `Gerente → Compras` (`Approves`) and `Ventas → Almacén` (`CommunicatesWith`) resolve to the right endpoints, chunk offsets round-trip into the source text, and the degenerate inputs (empty string, one 5,000-character sentence) chunk without error.

## Files changed

**New:**
- `lib/intake/detectors.ts` — the twelve deterministic detectors.
- `lib/documents/extraction.ts` — text/Markdown/CSV extraction.
- `lib/documents/chunking.ts` — deterministic overlapping chunker.
- `lib/documents/ocr.ts` — OCR client.
- `lib/documents/embeddings.ts` — embeddings client.
- `lib/documents/vectors.ts` — chunk records, budget, upsert, cosine search.
- `lib/documents/pipeline.ts` — the ten-stage orchestrator.
- `app/api/documents/ocr/route.ts` — key-gated vision OCR.
- `app/api/documents/embeddings/route.ts` — key-gated embeddings.
- `AI_DOCUMENT_PROCESSING_PIPELINE.md`

**Modified:**
- `lib/intake/contracts.ts` — `DetectionCategory` / `DetectionCounts`, `IntakePainSignal.kind`, `detections` on the extraction result.
- `lib/intake/extractors.ts` — inline scanning replaced by `detectBusinessSignals`; extractors now consume `textContent`.
- `lib/intake/pipeline.ts` — accepts document text + extraction method; reports `detections` and `readContent`.
- `lib/intake/deduplication.ts` — risks merge as `critical` severity, separately counted.
- `lib/intake/summary.ts` — frictions and risks reported distinctly.
- `lib/intake/index.ts` — export the detectors.
- `lib/documents/processing.ts` — ten-step model, per-job `steps` array, contracts marked `requires_key`.
- `lib/documents/upload.ts` — delegates to the pipeline; forwards `onJob` / `onWorkspace`.
- `lib/documents/index.ts` — export the new modules.
- `lib/knowledge/coverage.ts`, `lib/knowledge/intake.ts` — `chunks` in the workspace knowledge normalizer.
- `lib/readiness/memory.ts`, `lib/readiness/index.ts` — `refreshUnderstandingFromEvidence`.
- `types/knowledge.ts`, `types/index.ts` — `KnowledgeChunkRecord`, `ChunkEmbeddingStatus`, `WorkspaceKnowledge.chunks`.
- `components/workspace/knowledge-upload.tsx` — live ten-step pipeline UI per document.
- `components/workspace/business-knowledge.tsx` — detection chips + search-index summary.
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — all new strings.

## Explicitly not in this mission

The Missing Information Engine. The detectors deliberately record only what a document *states*; deriving what it fails to state is the next mission's job.
