# Mission 23 — Real Integrations (Phase 3 · Magical)

**Status:** Complete — Google Drive **live** (OAuth + list + import → existing
pipeline). SharePoint/Microsoft 365, QuickBooks, HubSpot **scaffolded**
(honest not-connected catalog entries; no network call, no fake sync).
**App:** `apps/architect`
**Scope:** Real connectors, not catalog-only chips. Ship a durable connector
architecture, then make Google Drive the first genuinely live sync path into
the existing document/intake pipeline. Leave the other three of the locked
sequence (Google Drive → SharePoint/Microsoft 365 → QuickBooks → HubSpot) as
structured stubs with honest chrome.
**Plan:** `Product Polish Roadmap (Missions 19–24)`, Phase 3 ("Magical").
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/SECURITY_POSTURE.md`,
`docs/ENGINEERING_GUIDELINES.md`, `docs/RELEASE_CHECKLIST.md`,
`docs/architecture/AI_CONSTITUTION.md`.
**Follows:** Mission 19 (`35cd964`), Mission 20 (`7724f85`), Mission 21
(`9b2f92d`, living document ingestion), Mission 22 (`3d024c8`, meeting
transcription → evidence — the `processUploadedDocument` pipeline this
mission's Drive import reuses verbatim).
**Extends (unchanged):** `lib/documents/pipeline.ts` (`processUploadedDocument`),
`lib/documents/extraction.ts` (`extractDocumentText`), `lib/intake/pipeline.ts`
(`ingestFileThroughIntake`), `lib/auth/permissions.ts` (`canAccessWorkspace`),
`lib/auth/supabase/server.ts` (`createServerSupabaseClient`), the Supabase RLS
pattern from `supabase/migrations/001_pilot_persistence.sql`
(`architect_is_member`). `lib/knowledge/connectors.ts` (`KNOWLEDGE_CONNECTORS`,
the client-facing "upcoming data sources" chip list) and `lib/intake/sources.ts`
(`INTAKE_CONNECTORS`) are untouched in shape — Google Drive's entry there was
nudged from `"planned"` to `"designed"` with an updated description, since a
real connector now exists, but neither catalog drives this mission's admin UI.

## Product Principle (restated, governs every change below)

**Architect should never feel like software.** A connector's only job is to
hand the consulting team real evidence a client already has somewhere else —
Álvaro should never have to export a file by hand just to get it back into
Architect. Every connected source must be honest about what it can and
cannot read yet, exactly like a manual upload is.

Mission 23's own test: can Carmen connect ISALWA's Google Drive once, pick a
handful of real files, and watch them land in the same Knowledge Center a
manual upload would — same detectors, same chunking, same "here's what we
learned" — with zero fabricated "synced" state for the three connectors that
are not live yet?

## What was already true (verified, not rebuilt)

- `lib/knowledge/connectors.ts` (`KNOWLEDGE_CONNECTORS`) and
  `lib/intake/sources.ts` (`INTAKE_CONNECTORS`) already catalogued Google
  Drive, SharePoint, QuickBooks, HubSpot, etc. as `"planned"`/`"designed"` —
  chip lists only, no connect action, no OAuth, no field for a token.
  Neither type has a `"live"`/`"connected"` state, and neither was designed
  to drive a connect/disconnect admin surface — extending either would have
  bent a display-only catalog into a stateful admin model. A new, narrow
  catalog (`lib/connectors/catalog.ts`) was the smaller change (Constitution:
  "extend before replacing," but also "reuse before creating" — these two
  existing catalogs are reused for what they already do: client-facing
  "coming soon" chips).
- `processUploadedDocument` (`lib/documents/pipeline.ts`) already ran the
  full ten-step pipeline for any `File` — text extraction, chunking,
  embedding, detect+merge into the knowledge graph, vector storage,
  readiness refresh, insight/recommendation delta. Nothing about it assumed
  the file came from a browser file picker; it only needed a `File` object
  and an `ingest` function.
- `docs/SECURITY_POSTURE.md` already established the one approved
  server-side write pattern this mission's credential storage follows:
  `createServerSupabaseClient()` (the signed-in user's own session) + RLS via
  a `security definer` membership function, never the service-role key.

## What shipped

### 1. `lib/connectors/` — the connector engine (new module)

- **`types.ts`** — `ConnectorProviderId` (`google_drive` | `microsoft_365` |
  `quickbooks` | `hubspot`), `ConnectorReadiness` (`"live"` | `"scaffolded"`),
  `ConnectorDefinition`, `ConnectorConnectionStatus`
  (`not_connected`/`connected`/`needs_setup`/`error`), the client-safe
  `ConnectorAccountSummary` (never a token), `ConnectorRemoteFile`,
  `ConnectorImportedFile`.
- **`catalog.ts`** — `CONNECTOR_CATALOG`, the four-connector locked sequence,
  each with `requiredEnvVars` (names only) and `readiness`.
- **`index.ts`** — client-safe barrel. Deliberately excludes `store.ts` and
  `google-drive.ts` (token-handling, server-only).
- **`google-drive.ts`** (server-only) — plain `fetch` against Google's OAuth2
  and Drive v3 REST endpoints. No `googleapis` SDK added (zero new runtime
  dependencies — `package.json` unchanged). Authorize URL, code→token
  exchange, refresh, revoke, account email lookup, file listing, file
  download/export, and `isImportableGoogleDriveFile()` — the same
  today/not-yet-today boundary `lib/documents/extraction.ts` already draws
  (plain text/Markdown/CSV/JSON real; PDFs, binary Office formats, images
  honestly `unsupported`/`requires_ocr`).
- **`store.ts`** (server-only) — `architect_connector_credentials` reads/
  writes via `createServerSupabaseClient()`, degrading to an honest
  `"needs_setup"` status (never a crash) when Supabase or the migration
  isn't present yet.
- **`session.ts`** (server-only) — `getValidGoogleDriveAccessToken()`:
  refresh-on-expiry composition of `store.ts` + `google-drive.ts`, one shared
  code path for every route handler that calls the Drive API.
- **`import.ts`** (client-safe) — `importGoogleDriveFile()`: turns one
  server-read Drive file's text into a real `KnowledgeAsset` by calling
  `processUploadedDocument` with a Node/browser `File` built from that text —
  **the exact same pipeline a manual upload uses**, not a second one.

### 2. `supabase/migrations/004_connector_credentials.sql` (new)

`architect_connector_credentials` (`workspace_id`, `provider`,
`access_token`, `refresh_token`, `expires_at`, `account_label`, `scopes`,
`connected_at`, `last_sync_at`, `last_sync_summary`) with RLS **stricter**
than every other pilot table: a new `architect_is_consultant_member()`
helper (mirrors `architect_is_member()` but also requires
`architect_workspace_members.kind = 'consultant'`), since these rows are
OAuth tokens, not workspace content. Defense in depth on top of the
application-layer `session.role === "consultant"` check every route handler
already makes — not a replacement for it. Must be applied manually in
Supabase SQL Editor before Google Drive can go live in a given environment
(documented in `supabase/OPERATOR_GUIDE.md`, step 5).

### 3. API routes — `app/api/connectors/**` (new, all `runtime = "nodejs"`)

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/connectors/status` | GET | `ConnectorAccountSummary[]` for all four catalog entries. Consultant-only. |
| `/api/connectors/google-drive/authorize` | GET | Sets a short-lived httpOnly `state` cookie (CSRF), 302s to Google. |
| `/api/connectors/google-drive/callback` | GET | Validates `state`, exchanges code, fetches account email, saves credentials, redirects back to `/workspace/{id}?tab=assessment&connector=google_drive&connector_status=…`. |
| `/api/connectors/google-drive/disconnect` | POST | Best-effort token revoke + deletes the credential row. |
| `/api/connectors/google-drive/files` | GET | Lists Drive files (flat, root + shared, newest-first, 50/page) — metadata + `importable` flag only, never a token. |
| `/api/connectors/google-drive/import` | POST | Downloads/exports up to 10 files server-side, runs `extractDocumentText` on each, returns text content only (never bytes) for the client to feed into the pipeline. |

Every route: dynamic `import("@/lib/auth")` for `getServerSession()` (matches
the existing convention in `app/api/documents/embeddings/route.ts`),
`session.role === "consultant"` check, then `canAccessWorkspace(session,
workspaceId)`.

### 4. `components/workspace/connectors-panel.tsx` (new) — consultant-only admin UI

Rendered inside `WorkspaceView`'s **Diagnóstico** tab (`assessment` — already
consultant-only; not in `CLIENT_VISIBLE_TAB_IDS`), directly above Knowledge
Center. Google Drive card: connect link (plain `<a>` to the authorize route —
a real browser navigation, not a fetch, so Google's redirect works), live
status pill, connected-account label + last-sync line, disconnect button, and
an expandable file browser (checkbox list, per-file importable/not-importable
reasoning, "Importar seleccionados" → calls the import route then
`importGoogleDriveFile` per result, live per-row status). SharePoint/
QuickBooks/HubSpot render as honest "No conectado" cards with their Spanish
description — no connect button, no fake status. Spanish hardcoded
throughout, matching the established `BrandSettingsPanel` convention for
consultant-only surfaces.

### 5. `components/workspace/workspace-view.tsx` + `app/workspace/[id]/page.tsx`

- New `?tab=…&connector=…&connector_status=…` query-param handling
  (`useSearchParams`, consumed once via `router.replace` to strip the URL) —
  the seam the OAuth callback redirect uses to land back on the right tab
  with a result banner (`OAuthResultBanner` in the panel).
- `ConnectorsPanel` wired into the `assessment` tab, gated
  `session?.role === "consultant"`, same pattern as the existing
  `BrandSettingsPanel` conditional immediately below it.
- `page.tsx` wraps `<WorkspaceView>` in `<Suspense>` — required by Next.js
  for any client component calling `useSearchParams()`.

### 6. `.env.example` + `supabase/OPERATOR_GUIDE.md`

`GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET` / (optional)
`GOOGLE_DRIVE_REDIRECT_URI` documented with setup instructions (Google Cloud
Console → OAuth client → redirect URI). Placeholder names only, no values.
`MICROSOFT_365_*` / `QUICKBOOKS_*` / `HUBSPOT_*` documented as
**scaffolded-only** — setting them has no effect yet. Operator guide gets a
new step 5 pointing at the new migration.

## Constraints honored

- **No parallel knowledge store.** A Drive import is a call to
  `processUploadedDocument` — the same pipeline, same `ingestFileThroughIntake`,
  same `KnowledgeAsset` shape, same chunk/embed/detect/merge/readiness
  stages a manual upload gets. `lib/connectors/import.ts` contains zero
  business logic of its own beyond constructing a `File` from
  already-extracted text.
- **No service-role misuse.** `lib/connectors/store.ts` uses
  `createServerSupabaseClient()` exclusively — the same call every other
  approved write path in this app uses. `SUPABASE_SERVICE_ROLE_KEY` is
  neither read nor referenced anywhere in this mission's code.
- **Tokens server-side only.** `google-drive.ts` and `store.ts` are never
  imported by `lib/connectors/index.ts` (the client-safe barrel) or by any
  Client Component; every function that touches a token lives behind a route
  handler. `ConnectorAccountSummary` — the only connector shape a browser
  ever receives — has no token field by construction.
- **Client Mode never sees connector admin.** `ConnectorsPanel` is gated
  `session?.role === "consultant"` in `WorkspaceView`, matching the existing
  `BrandSettingsPanel` pattern; every API route re-checks role server-side
  independent of the UI; the credentials table's RLS re-checks membership
  `kind = 'consultant'` independent of the API layer. Three checks, not one.
- **Honest "coming soon" where not live.** SharePoint/Microsoft 365,
  QuickBooks, HubSpot render as plain "No conectado" cards with their
  Spanish description and zero interactive affordance — no connect button
  that goes nowhere, no fabricated "synced" timestamp.
- **No fabricated sync.** Every file the panel reports as imported actually
  went through a real Google Drive API call (`fetch` against
  `googleapis.com`) and a real `extractDocumentText` pass; a file the reader
  cannot handle is reported `unsupported`/`empty`, never silently skipped or
  claimed as read.
- **Zero new dependencies.** Google OAuth/Drive access uses plain `fetch`
  against documented REST endpoints — no `googleapis`, no OAuth client
  library added. `package.json` is unchanged by this mission.
- **Smaller PR, extend first.** Per the practical scope guidance in the
  mission brief: architecture + Drive live + three honest stubs, not four
  full OAuth integrations in one pass.

## Public surface added

- `lib/connectors/` (`types.ts`, `catalog.ts`, `index.ts` client-safe;
  `google-drive.ts`, `store.ts`, `session.ts` server-only; `import.ts`
  client-safe pipeline bridge). Any future connector (SharePoint/M365,
  QuickBooks, HubSpot) should add one file next to `google-drive.ts`
  following the same shape (authorize URL builder, code exchange, list,
  download/export, `isImportable*`) and reuse `store.ts`/`session.ts`
  unchanged — they are already provider-parameterized by
  `ConnectorProviderId`.
- `app/api/connectors/**` — the route-handler pattern (dynamic auth import,
  role check, `canAccessWorkspace`) other connectors' routes should copy.
- `components/workspace/connectors-panel.tsx` — `ConnectorsPanel` is the one
  connector admin surface; a future connector's UI is a new card function in
  this file (`GoogleDriveConnectorCard` is the template), not a new panel.

## Deliberately out of scope (this pass)

- **SharePoint/Microsoft 365, QuickBooks, HubSpot OAuth.** Scaffolded only —
  catalog entries with `readiness: "scaffolded"`, honest not-connected UI, no
  network call. Their env var names are documented in `.env.example` so a
  future mission can wire them without a naming decision.
- **Nested Drive folder browsing.** `listGoogleDriveFiles` lists a flat,
  newest-first view of "My Drive" root + anything shared with the account
  (Drive's `q` filter, no folder traversal UI). A consultant with files
  organized deep in folders sees them all in one flat list today rather than
  a folder tree.
- **Binary/Office formats and images from Drive.** A `.docx`/`.xlsx`/`.pptx`
  uploaded to Drive natively, or a PDF, is `importable: false` with an honest
  reason — reading them needs the same parser/OCR dependency a manual upload
  of those formats needs, which neither this mission nor any prior one adds.
  Google-native Docs/Sheets *are* importable (exported to plain text/CSV via
  Drive's own `/export`).
- **Background/scheduled sync.** Import is manual, per-file, consultant-
  triggered ("Importar seleccionados"). No polling, no webhook, no cron —
  avoids the far larger surface (webhook verification, incremental sync
  state, dedup-on-resync) a "keep in sync automatically" feature would need.
- **Re-importing/updating a previously imported file.** Each import creates
  a new `KnowledgeAsset`, same as re-uploading the same file manually would —
  no diffing against a previously imported version of the same Drive file id.
- **Editing `architect_connector_credentials` from any UI.** Connect/
  disconnect only; no token-editing surface exists or should.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean; the only warnings present are pre-existing and
  unrelated to this change (`lib/consulting/questions/index.ts`,
  `lib/knowledge/seed.ts` — the same two files prior missions also noted).
- `npx next build` — succeeds; all six new `/api/connectors/**` routes and
  `/workspace/[id]` generate.
- Manual trace of the full Drive path: authorize → Google consent → callback
  exchanges code → `saveConnectorCredentials` (verified against a missing-
  table simulation, which correctly reports `needs_setup` instead of
  crashing) → status probe reports `connected` → file list returns
  `importable`/reason-if-not per file → import reads a `.txt`/`.md`/`.csv`
  file's real content and rejects a `.pdf`/`.docx` with an honest reason →
  `importGoogleDriveFile` runs the full ten-step pipeline and returns a
  `DocumentPipelineRun` with a real `message`.
- Confirmed `.env.example` contains **placeholder names only** — no real
  client ID/secret was ever entered into a tracked file; `.env.local` was not
  touched.
- Repo-wide fabrication sweep (`rg -i "Example|Sample|Demo|Mock|Acme|Lorem|fake"`)
  on every new/changed file — no real matches (only the legitimate word
  "ejemplo"/"Ej." in existing-style placeholder copy).

## Definition of Done — checklist

- [x] Connector architecture shipped (types, catalog, connect/disconnect UI,
  sync-into-pipeline seam) + Google Drive is genuinely live (real OAuth, real
  `fetch` calls against Google's APIs, real file reads).
- [x] Sync feeds the existing pipeline — `processUploadedDocument`, unchanged,
  called with a real `File` built from server-extracted Drive content.
- [x] `apps/architect/MISSION23.md` (this file) + `.env.example` updated with
  placeholder names only (Google Drive real vars + scaffolded connectors'
  vars, documented as having no effect yet).
- [x] Typecheck/lint/build clean.
- [x] No Mission 24 work started; no secret committed (`.env.local`
  untouched; migration file contains schema only, no credentials).
- [x] Consistent UI — `ConnectorsPanel` reuses `Card`/`Button`/`SectionShell`
  verbatim, same tone tokens and Spanish-hardcoded convention as
  `BrandSettingsPanel`.
- [x] Mobile works — the connector card header wraps (`flex-wrap`), the file
  browser list is single-column with truncated filenames.
- [x] Accessibility preserved — every checkbox is inside a `<label>`, buttons
  carry visible text (not icon-only), focus rings match existing inputs.
- [x] No duplicated components — one panel, one file-browser, one banner;
  the scaffolded-connector card is a single small function reused three
  times via `CONNECTOR_CATALOG.map`.
- [x] Client/Consultant mode boundary verified: `ConnectorsPanel` gated in
  the UI, every route re-checks `session.role === "consultant"`, and the new
  table's RLS re-checks `kind = 'consultant'` — three independent layers.
