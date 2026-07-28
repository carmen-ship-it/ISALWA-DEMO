# Mission 22 — Meeting Transcription → Evidence (Phase 3 · Magical)

**Status:** Complete (first sequenced pass — see "Deliberately out of scope").
**App:** `apps/architect`
**Scope:** Make a meeting/transcript first-class evidence like a document — same
intake → knowledge → consulting cycle path, evidence that actually surfaces in
retrieval/twin, and an honest client-facing debrief when it lands. Paste/upload
transcript first; live audio capture stays out of scope.
**Plan:** `Product Polish Roadmap (Missions 19–24)`, Phase 3 ("Magical").
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`.
**Follows:** Mission 19 (`35cd964`, premium empty states/motion), Mission 20
(`7724f85`, guided client journey), Mission 21 (`9b2f92d`, living document
ingestion — the "what changed" batch debrief this mission reuses verbatim).
**Extends (unchanged):** `types/workspace.ts` `Meeting`/`MeetingRepository`,
`lib/intake/sources.ts` (`meeting_transcript` was already a "designed" source),
`lib/intake/extractors.ts` (`makeTextExtractor` already ran the twelve
detectors on transcript text), `lib/intake/pipeline.ts` (`ingestSource` already
merged transcripts into the knowledge graph), `components/workspace/
preparation-brief-panel.tsx` (already renders `workspace.meetings`).

## Product Principle (restated, governs every change below)

**Architect should never feel like software.** It should feel like a senior
consulting team that happens to live inside software. Every screen must
answer:

1. **What do we know?**
2. **What are we trying to learn?**
3. **Why does it matter to the business?**

Tagline: *"Architect becomes more intelligent every time your company shares
knowledge."*

Mission 22's own test: can Álvaro paste the notes from this morning's meeting
straight in — no "upload a .txt file" workaround, no separate "meetings"
screen, no wizard — and immediately get the same kind of "here is what changed"
consulting sentence a document upload already gives him? And does that
meeting's knowledge actually become retrievable evidence, not just a count
that moved somewhere?

## What was already true (verified, not rebuilt)

Before writing anything, this mission traced the existing architecture end to
end, per Engineering Guidelines §2 ("read before writing"), to confirm what was
already designed and what was still a gap:

- **`meeting_transcript` was already a real, "designed" intake source.**
  `lib/intake/sources.ts` listed it as `status: "designed"` (not "planned"),
  and `lib/intake/extractors.ts`'s `makeTextExtractor("meeting_transcript")`
  already ran the same twelve deterministic business detectors as manual notes
  and document text — nothing here needed a new extractor.
- **`ingestSource(..., "meeting_transcript")` already merged into the one
  knowledge graph.** Entities, relationships, business rules, pain/risk
  signals, opportunities, and the Consulting Intelligence Agent cycle all ran
  for a transcript exactly as they do for a document — this predates the
  mission.
- **The gap was real, not imagined.** Two things were genuinely missing, both
  confirmed by tracing `processUploadedDocument` (`lib/documents/pipeline.ts`)
  against `ingestSource` (`lib/intake/pipeline.ts`) side by side:
  1. A transcript ingested through `ingestSource` alone never reached
     `lib/documents/chunking.ts` / `embeddings.ts` / `vectors.ts` — so its text
     was merged into the entity graph but never chunked or embedded, meaning
     it could never appear in `RetrievalPack`'s `document_chunk` tier
     (`lib/ai/retrieval/pack.ts`), only (weakly) in the `knowledge_entity`
     tier. "Evidence appears in RetrievalPack" was not yet true for
     transcripts specifically.
  2. There was no UI path to submit a `meeting_transcript` at all — no paste
     box, no upload affordance — and no code path created a `Meeting` record
     for anything other than a completed guided interview
     (`lib/memory/apply-interview.ts`). The Preparation Brief's "previous
     meetings" panel could only ever show interview sessions.

## What shipped

### 1. `lib/documents/pipeline.ts` — `processMeetingTranscript()` (new)

A sibling to `processUploadedDocument`, in the same module, reusing its
private step machinery (`chunkStep`, `embedStep`, `createStepRecorder`,
`countInsights`, `countRecommendations`) instead of forking a second
pipeline. The only stages skipped are OCR and extraction — a pasted/typed
transcript already *is* text, so those two steps report `skipped` for an
honest reason and every other stage runs for real:

chunk → embed → `ingestSource(..., "meeting_transcript")` (detect + merge) →
store vectors (keyed to the transcript's own `KnowledgeAsset.id`, same as a
document) → refresh readiness → measure new insights/recommendations.

On top of that, this stage writes a first-class `Meeting` record — title,
date, optional named participants (never inferred from detected text, to
avoid presenting a guess about attendance as a fact), summary/discoveries/
still-need lines copied straight off the intake report — and prepends it to
`workspace.meetings`, plus one `TimelineEvent` (`category: "meeting"`,
`meetingId` set), the same shape `applyInterviewToWorkspace` already
produces for a completed guided interview. A pasted transcript now shows up
in the Preparation Brief's "previous meetings" panel without that panel
needing a single change.

The return type, `MeetingTranscriptPipelineRun`, is deliberately
`DocumentPipelineRun & { meeting: Meeting }` — not a parallel shape — so it
can be fed straight into Mission 21's `buildDocumentChangeSummary()` with
zero duplication (see §3).

### 2. `lib/intake/pipeline.ts` — honest evidence-kind tagging

`ingestSource` always told the Consulting Intelligence Agent every source was
`kind: "document"`, even for a meeting transcript, manual notes, or (were it
ever called through this path) an interview answer. Added
`evidenceKindForSource()` mapping `meeting_transcript`/`audio_transcript` →
`"meeting"`, `manual_notes` → `"note"`, `interview` → `"interview_answer"`,
everything else → `"document"` — `EvidenceEventKind` already had all four
values (`lib/consulting-intelligence/types.ts`); this just stopped collapsing
them to one. No new engine, no new taxonomy.

### 3. `components/workspace/knowledge-upload.tsx` — export the debrief card

`DocumentChangeSummaryCard` (Mission 21) was local to this file. Exported it,
unchanged, so the new transcript UI (§4) can render the exact same "Después de
revisar…" debrief for a transcript's pipeline run instead of building a
second card with the same tone tokens.

### 4. `components/workspace/business-knowledge.tsx` — the paste-transcript UI

A new section, "Transcripción de reunión," directly below Manual Notes in the
client-visible Business Knowledge screen (the `knowledge` tab — visible to
both Álvaro and Carmen, same as every other source in this screen): an
optional title input, an optional comma-separated participants input, a
transcript textarea, and one save button. On save it calls
`processMeetingTranscript`, updates the workspace, feeds the existing
"Lo que acabamos de aprender" list (`handleReport`, unchanged), and renders
`buildDocumentChangeSummary([run])` through the reused `DocumentChangeSummaryCard`
— the same batch debrief Mission 21 built, given a batch of exactly one.
No wizard: one paste, one button, one consulting sentence back.

### 5. `lib/ai/retrieval/pack.ts` — honest evidence labels

`RetrievalPack`'s document-chunk tier labelled every chunk `documento: X`,
regardless of source. Added `assetChunkLabelFor()`, which looks up the
underlying `KnowledgeAsset.type` and labels a chunk `reunión: X` for a meeting
transcript, `nota: X` for manual notes, and `documento: X` otherwise — no new
retrieval tier, no new ranking, just an honest label on the tier that already
exists, at both call sites (`buildRetrievalPackSync`'s lexical ranker and
`buildRetrievalPack`'s semantic ranker).

### 6. `lib/documents/index.ts` — export surface

`processMeetingTranscript`, `MeetingTranscriptPipelineRun`,
`ProcessMeetingTranscriptParams` exported alongside `processUploadedDocument`
— no new barrel file.

### 7. i18n chrome only

`businessKnowledge.meetingTranscript*` / `saveTranscript` / `savingTranscript`
keys added to both `lib/i18n/messages/{es,en}.ts` — labels, placeholders, and
the section kicker only. Every consulting sentence a transcript ingestion
produces (the debrief message, the meeting summary, the timeline title) is
generated in Spanish inside the engine (`lib/documents/change-summary.ts`,
`lib/intake/summary.ts`, `lib/documents/pipeline.ts`), per
`docs/ENGINEERING_GUIDELINES.md` §9 — never routed through `lib/i18n`.

## Constraints honored

- **No second pipeline.** `processMeetingTranscript` lives inside
  `lib/documents/pipeline.ts` and reuses `processUploadedDocument`'s private
  step helpers verbatim — it does not duplicate chunking, embedding, vector
  storage, readiness refresh, or insight/recommendation measurement.
- **No second scoring model.** Every number in a transcript's debrief comes
  from the same `IntakeIngestReport` / `DocumentPipelineRun` fields a document
  upload already produces; `buildDocumentChangeSummary` (Mission 21) is reused
  unmodified.
- **No second knowledge graph, no second entity taxonomy.** The transcript
  still merges through the unchanged `ingestSource` → `lib/intake` →
  `lib/knowledge` path; `Meeting` is the existing `types/workspace.ts` type,
  populated the same way `lib/memory/apply-interview.ts` already does for
  interviews.
- **Extend, don't fork, the UI.** The paste-transcript form is a new section
  inside the existing `BusinessKnowledge` component (the same widget that
  already hosts document upload and manual notes), and its debrief reuses the
  exported `DocumentChangeSummaryCard` rather than a second card.
- **Spanish client copy generated inside the engine.** Every consulting
  sentence a transcript produces is hardcoded Spanish inside
  `lib/documents/pipeline.ts` / `lib/documents/change-summary.ts` /
  `lib/intake/summary.ts`; only section chrome (labels, placeholders, the
  kicker, the save button) went through `useTranslations()`, added to both
  `lib/i18n/messages/{es,en}.ts` in parallel.
- **No fabricated evidence.** Participants are only ever what a human typed
  in — never inferred from detected "Person" entities in the transcript text,
  which are role/title heuristics (`gerente`, `director`, …), not attendance
  records, and presenting one as the other would be a fabrication.
- **Honest when the transcript is empty/weak.** An empty paste (`transcriptText`
  blank) is disabled at the button level; if `ingestSource` cannot find any
  structured signal in the text, `buildDocumentChangeSummary` already reports
  the same "no encontramos información estructurada nueva" branch it uses for
  a document that read fine but taught nothing new — no separate honesty
  branch needed, the reused function already has one.
- **Client Mode / Consultant Mode boundary untouched.** The new section lives
  inside the `knowledge` tab, which was already client-visible before this
  mission; no tab visibility, route gating, or role check changed. The
  Preparation Brief's "previous meetings" panel remains at the existing
  consultant-only `/preparation` route (`CONSULTANT_ONLY_PATHS`) — unchanged.
- Repo-wide fabrication sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`)
  on every changed file returned only pre-existing false positives (Spanish
  "enten**demos**" containing the substring "demo", and the legitimate English
  words "Examples:"/"For example:" in existing upload-hint copy) — no real
  matches.

## Public surface added

- `lib/documents/pipeline.ts` — `processMeetingTranscript(params)`,
  `MeetingTranscriptPipelineRun`, `ProcessMeetingTranscriptParams`. Exported
  from `lib/documents`. Any future transcript-shaped surface (a future Zoom/
  Teams connector in Mission 23+) should call this instead of writing a third
  pipeline.
- `components/workspace/knowledge-upload.tsx` — `DocumentChangeSummaryCard`
  is now exported (was local-only). Reuse it for any future "what changed"
  debrief instead of building a new card.
- `lib/intake/pipeline.ts` — `evidenceKindForSource()` (module-private) fixes
  the Consulting Intelligence Agent's working-log tagging for every existing
  source type, not just transcripts.
- `lib/ai/retrieval/pack.ts` — `assetChunkLabelFor()` (module-private) is the
  one place a future non-document text source (e.g. a CRM export once it
  reads content) should add its own label noun, rather than a second
  labelling function.

## Deliberately out of scope (this pass)

Per the roadmap's own instruction ("no Mission 23–24," "no live Zoom bot
unless already present") and this pass's scoping discipline:

- **Live audio capture / speech-to-text.** `audio_transcript` stays `planned`
  in `lib/intake/sources.ts`, exactly as before — out of scope per the mission
  brief, and no OCR/vision-style dependency was added to change that.
- **Auto-import connectors (Zoom/Teams/Meet).** `INTAKE_CONNECTORS`'
  `zoom_transcripts` entry stays `status: "planned"` — Mission 23's territory
  (real integrations), not this one's.
- **A dedicated "Meetings" tab/screen.** The client-facing entry point is the
  existing Business Knowledge screen, consistent with "paste/upload transcript
  first, no wizard." A richer meetings list/detail view for Álvaro (beyond the
  consultant-only Preparation Brief panel that already renders
  `workspace.meetings`) was not built — nothing in the current product asked
  for it, and adding one risked a second, competing surface for the same data.
- **Editing or deleting a submitted transcript's `Meeting` record.** Same
  append-only convention every other evidence source in this product follows
  (documents, notes, interviews) — a correction is a new piece of evidence,
  not a mutation of history.
- **Named entity extraction upgrading `participants` automatically.** Detected
  "Person" entities remain role/title heuristics, not an attendee list — see
  "No fabricated evidence" above. A future pass could resolve detected people
  against `workspace.people` by name if a transcript happens to use full
  names, but that needs a precision bar this pass did not attempt to set.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are pre-existing and
  unrelated to this change (`lib/consulting/questions/index.ts`,
  `lib/knowledge/seed.ts` — the same two files Missions 19–21 also noted).
- `npx next build` — succeeds; all routes generate.
- Manual trace of `processMeetingTranscript()` against representative inputs:
  - A multi-paragraph transcript naming a department, a system, and an
    approval rule → chunks created, entities/relationships/business rules
    merged, understanding lifted, a `Meeting` prepended to
    `workspace.meetings` with `discoveries`/`questionsRemaining` populated
    from the intake report, a `document_chunk` retrieval item labelled
    `reunión: <title>` once queried through `buildRetrievalPackSync`.
  - An empty paste → save button stays disabled; no pipeline run attempted.
  - A transcript that reads fine but contains no detectable business signal →
    `buildDocumentChangeSummary` renders its existing "confirma lo que ya
    sabíamos" branch — no fabricated progress claim.
- Confirmed `lib/preparation/knowledge-merge.ts` already maps
  `KnowledgeAssetType: "meeting_transcript"` → `PreparationSourceKind:
  "meeting_transcripts"`, so a transcript's `KnowledgeAsset` was already
  counted correctly by the Preparation Brief's coverage/source logic with no
  change needed there.
- Repo-wide fabrication sweep on changed files — no real matches (see above).
- No `.env.local` or secret touched or committed; no Mission 23–24 work
  started; no live Zoom/Teams/Meet bot added.

## Definition of Done — checklist

- [x] Transcript ingest runs the same intake → knowledge → consulting cycle
  path a document upload uses (`ingestSource`, unchanged, composed by the new
  `processMeetingTranscript`).
- [x] Evidence appears in the twin (Consulting Intelligence cycle, now tagged
  `kind: "meeting"` instead of a generic `"document"`), in RetrievalPack (the
  transcript's text is now chunked/embedded/stored exactly like a document,
  and labelled `reunión: <title>` instead of `documento: <title>`), and in the
  Preparation Brief's "previous meetings" discovery path (a real `Meeting`
  record, not a placeholder).
- [x] Client-facing Spanish debrief when useful — the exact Mission 21
  "Después de revisar…" card, reused (not forked) for a transcript's own
  pipeline run.
- [x] Honest when a transcript is empty or contributes nothing new — reuses
  `buildDocumentChangeSummary`'s existing honesty branches; no new fabrication
  surface introduced (participants are user-entered only, never inferred).
- [x] `apps/architect/MISSION22.md` (this file).
- [x] Typecheck/lint/build clean.
- [x] Never `.env.local`; no Mission 23–24 work; no live Zoom bot.
- [x] Consistent UI — the new section reuses `Card`/`Button`/textarea/input
  patterns already established by Manual Notes in the same component; the
  debrief reuses `DocumentChangeSummaryCard` verbatim.
- [x] Mobile works — the two-column title/participants grid collapses to one
  column below `sm` (`grid gap-3 sm:grid-cols-2`), matching the existing
  pattern used elsewhere in this file; textarea and button are full-width.
- [x] Accessibility preserved — every new input/textarea has a
  programmatically associated label (visually hidden `sr-only` labels, same
  convention as the existing Manual Notes field); focus rings match existing
  inputs.
- [x] Existing behavior unchanged outside the additive transcript state, the
  new section, the newly-exported `DocumentChangeSummaryCard` (same component,
  same rendering, just also exported), and the two small correctness fixes
  (evidence-kind tagging, retrieval chunk labels) that apply to all sources,
  not only transcripts, but change no visible behavior for them.
