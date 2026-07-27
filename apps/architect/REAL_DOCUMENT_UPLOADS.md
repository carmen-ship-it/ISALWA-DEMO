# Real Document Uploads

**Status:** Real byte storage + real progress + a durable per-document status lifecycle shipped. OCR, embeddings, and LLM content processing are architecture-only (contracts + honest stubs) — that is the **next** mission.

## Product idea

Uploads have worked since Mission 2/3, but only ever classified a file by its *name* — the bytes themselves were never kept anywhere. This mission makes uploads real: the file actually lands in cloud storage, its metadata (size, MIME type, upload date, uploader, status) is tracked durably on the same `KnowledgeAsset` record the Knowledge Engine already uses, the UI shows real upload progress and a `Queued → Analyzing → Completed/Failed` lifecycle per document, and the seam for the next mission's OCR/embeddings pipeline is fixed in code (so that mission has something concrete to implement against instead of inventing an architecture mid-build).

## What shipped

### `lib/documents/storage.ts` — real byte storage

- **`SupabaseDocumentStorage`** — uploads to a **private** Supabase Storage bucket, `architect-documents`, at `{workspaceId}/{assetId}/{fileName}`. Uses a raw `XMLHttpRequest` PUT against the Storage REST endpoint (the installed `@supabase/storage-js@2.110.8` has no upload-progress hook) with the signed-in user's real access token — same auth as every other Supabase call in this app, just with `xhr.upload.onprogress` wired up for real byte-level progress. Downloads use short-lived signed URLs (`createSignedUrl`, 10 min) — the bucket is never public and no URL is persisted.
- **`LocalDocumentStorage`** — the honest dev/offline fallback when Supabase isn't configured. Files live in an in-memory `Map` for the current browser tab only (`URL.createObjectURL`). This is documented, not disguised: it is **not** persisted across reloads and **not** shared between Carmen and Álvaro. `getDocumentStorageProvider()` picks the right one via the same `isSupabaseConfigured()` switch every other persistence path in this app already uses.
- `formatFileSize()` — shared human-readable size formatter.

### `supabase/migrations/003_document_storage.sql` — bucket + RLS

Creates the `architect-documents` bucket (25MB limit, matching the existing client-side guardrail; allow-list covers PDF/Word/Excel/CSV/PowerPoint/images/plain text/Markdown) and four RLS policies on `storage.objects` that reuse the **existing** `public.architect_is_member()` function from `001_pilot_persistence.sql` — a user may only read/write objects whose first path segment (`storage.foldername(name)[1]`) is a workspace they belong to. No new membership model.

**Applied and verified against the live linked project** (`supabase db push`), including:
- Bucket exists with the correct size/MIME allow-list.
- An anonymous request to upload is **denied** (`403 row-level security policy`).
- An authenticated request using a real Carmen session token **succeeds**, a signed URL can read the bytes back, and delete works.

### `lib/documents/upload.ts` — orchestration, not a fork

`uploadAndQueueDocument()` composes the new storage layer on top of the **unchanged** existing pipelines instead of forking them:

1. Upload bytes for real (with progress) to `lib/documents/storage.ts`.
2. Run the file through the **existing, untouched** `ingestFileThroughIntake` / `ingestKnowledgeUpload` (`lib/intake`, `lib/knowledge`) — same deterministic filename/type classification and Knowledge Engine merge every upload has always used.
3. Patch the exact `KnowledgeAsset` that step produced with `sizeBytes`, `mimeType`, `uploadedByUserId`, `uploadedByName`, `storageProvider`, `storageBucket`, `storagePath`, and save once more.

No parallel document store, no duplicated asset, no change to `lib/intake` or `lib/knowledge`'s merge logic.

### `types/knowledge.ts` — additive only

`KnowledgeAsset` gained eight **optional** fields (storage + uploader + size/MIME metadata). Every existing literal across the codebase (seed data, legacy intake paths) keeps compiling untouched — nothing was made required.

### `lib/documents/processing.ts` — the next mission's seam

Per the mission's explicit instruction *("prepare architecture contracts for OCR and embeddings — do NOT implement")*:

- `DocumentProcessingStage` (`"queued" | "analyzing" | "completed" | "failed"`) and `DocumentProcessingJob` — a worker-ready shape. This mission runs the queue in-process (the browser awaits each stage and persists the resulting status); a future background worker can adopt this record as-is.
- `OcrExtractionContract` / `OCR_EXTRACTION_CONTRACT` — mirrors the existing `KnowledgeExtractionProvider.extract()` pattern (`lib/knowledge/extraction.ts`); throws a clearly labeled "not implemented" error. Never called.
- `EmbeddingProviderContract` / `EMBEDDING_PROVIDERS` — new contract (nothing like it existed before) for the future semantic-search/RAG step. Never called.
- `DOCUMENT_PROCESSING_PIPELINE` — a per-document view (Upload → Storage → Queue → Analyze → OCR → Embeddings → Knowledge merge) that sits alongside, and doesn't replace, the existing workspace-level `KNOWLEDGE_PIPELINE`.

### Eight supported formats, for real

The mission asked for PDF, Word, Excel, CSV, PowerPoint, Images, Text, and Markdown. Text/Markdown were missing from the existing classifier, so they were added the same way every other format already works — **extended, not forked**:
- `KnowledgeExtractionProviderId` gained `"text_reader"` (`types/knowledge.ts`); a `"designed"` entry was added to `KNOWLEDGE_EXTRACTION_PROVIDERS` (`lib/knowledge/extraction.ts`) — filename classification is real, content reading is `throw`-stubbed, identical honesty convention to the PDF/Word/Excel readers that already existed.
- `lib/knowledge/intake.ts` — new `text` extension group (`txt`, `md`, `markdown`), added to `KNOWLEDGE_UPLOAD_ACCEPT`.
- `lib/intake/contracts.ts` / `sources.ts` / `extractors.ts` / `pipeline.ts` — new `"text_file"` `IntakeSourceType`, source definition, file extractor, and `isFileLike` entry, following the exact pattern of `pdf`/`word`/`excel`.

### UI — `components/workspace/knowledge-upload.tsx` (shared by both Client Mode and Consultant Mode)

Extended in place (this widget is already reused by both `BusinessKnowledge` — client-facing — and `KnowledgeCenter` — consultant-only — so both surfaces get everything below without a parallel widget):

- **Real drag-and-drop + multiple uploads** (unchanged UX, now backed by real storage).
- **Real upload progress bar** (`components/ui/progress.tsx`, already existed) driven by actual `xhr.upload.onprogress` events (or an honest short ramp for the local fallback, since there's no network transfer to measure there).
- **Per-document status lifecycle**, exactly as specified: `Uploading → Queued → Analyzing → Completed/Failed`. "Analyzing" is the real (fast, deterministic) classification call in flight — not a fake spinner; a document that lands in a `"planned"` format bucket (e.g. an image, pending real OCR) honestly stays `Queued`, it doesn't lie and say "Completed."
- Per-item metadata line: file size, status word, uploader name (from the existing `useAuth()` session), and relative upload time (`formatRelativeActivity`, already existed).
- A visible, translated notice when running on the local/dev fallback (`knowledgeUpload.localStorageNotice`) — the "document it, don't fake cloud" requirement.

### UI — `components/workspace/knowledge-center.tsx` (consultant-only "Evidence Library")

The durable, persisted document list now also shows size / relative upload date / uploader, plus a **Download** action that fetches a fresh signed URL on demand and opens it — real files, not placeholders.

### i18n

All new strings added to both `lib/i18n/messages/es.ts` (default locale, client-facing) and `en.ts`: upload/queued/analyzing status words, the local-storage fallback notice, "uploaded by", "download", and the too-large message. No hardcoded user-facing strings — the one place an error could have leaked raw diagnostic text (`knowledge-upload.tsx`'s catch block) was tightened to always show the translated `processError` copy; raw errors go to `console.error` for developers only.

## Roles

No new role gating was added or needed — both Carmen (consultant) and Álvaro (client) already had upload access via this same shared widget (`KnowledgeCenter` / `BusinessKnowledge`), and RLS on the new bucket enforces access at the same workspace-membership granularity as every other table (`architect_is_member`). The consultant-only Evidence Library gets the richer durable metadata/download view; Client Mode gets the same real upload + status experience it already had, just backed by real storage now.

## What's explicitly NOT done (by design — next mission)

- No OCR — images stay `queued`, honestly, until that pipeline exists.
- No embeddings, no vector store, no semantic search.
- No LLM calls anywhere in this mission.
- The processing "queue" runs in-process (the browser awaits each stage); there is no background worker/cron yet. `DocumentProcessingJob` is shaped so a real worker can adopt it without a redesign.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean (only pre-existing, unrelated warnings in `lib/consulting/questions/index.ts` and `lib/knowledge/seed.ts`).
- `npx next build` — succeeds.
- **Live verification against the linked Supabase project** (not just local): pushed `003_document_storage.sql` via `supabase db push`; confirmed the bucket exists with the right config; confirmed an anonymous upload is denied by RLS; confirmed an authenticated upload (real Carmen session token, obtained via the Admin API for testing) succeeds, a signed URL can read the bytes, and delete works.

## Setup (when Supabase is configured)

Run `supabase/migrations/003_document_storage.sql` in the Supabase SQL Editor (or `supabase db push`) after `001_pilot_persistence.sql`. No new env vars — reuses `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. When those are unset, uploads still work end-to-end via the local/dev fallback (clearly labeled in the UI).

## Files changed

**New:**
- `lib/documents/storage.ts`
- `lib/documents/upload.ts`
- `lib/documents/processing.ts`
- `supabase/migrations/003_document_storage.sql`
- `REAL_DOCUMENT_UPLOADS.md`

**Modified:**
- `types/knowledge.ts` — additive `KnowledgeAsset` fields, `DocumentStorageProviderId`, `text_reader` provider id.
- `types/index.ts` — re-export `DocumentStorageProviderId`.
- `lib/documents/index.ts` — export the new modules.
- `lib/knowledge/intake.ts` — `text` extension group, updated accept list.
- `lib/knowledge/extraction.ts` — `text_reader` provider entry.
- `lib/intake/contracts.ts`, `lib/intake/sources.ts`, `lib/intake/extractors.ts`, `lib/intake/pipeline.ts` — `text_file` source type, all following the existing `pdf`/`word`/`excel` pattern.
- `components/workspace/knowledge-upload.tsx` — real storage, real progress, Queued/Analyzing/Completed/Failed lifecycle, metadata display, local-fallback notice.
- `components/workspace/knowledge-center.tsx` — durable metadata + download link in the Evidence Library.
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — new strings.
